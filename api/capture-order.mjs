// Cobra el pago en PayPal y, si sale bien, manda el pedido a Gelato.
import { PRODUCTS, CONFIG, json, paypal } from "./_lib.mjs";
import { productUidFor } from "./_gelato.mjs";
import { variantFor, createPrintifyOrder } from "./_printify.mjs";

const handler = async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  let orderID;
  try {
    ({ orderID } = await req.json());
    if (!orderID || !/^[A-Z0-9]+$/i.test(orderID)) return json({ error: "Pedido no válido" }, 400);

    // 1) Cobrar
    const cap = await paypal(`/v2/checkout/orders/${orderID}/capture`, { method: "POST", body: {} });
    if (cap.status !== "COMPLETED") return json({ error: "El pago no se ha completado." }, 402);

    // 2) Leer el pedido completo (productos + dirección de envío)
    const order = await paypal(`/v2/checkout/orders/${orderID}`);
    const pu = order.purchase_units[0];
    const ship = pu.shipping || {};
    const addr = ship.address || {};
    const payer = order.payer || cap.payer || {};
    const full = (ship.name && ship.name.full_name) || [payer.name?.given_name, payer.name?.surname].filter(Boolean).join(" ");
    const [firstName, ...rest] = (full || "Cliente").trim().split(/\s+/);

    // 3) Mandar al proveedor: Printify si está configurado, si no Gelato
    const addrPf = {
      first_name: firstName, last_name: rest.join(" ") || "-",
      email: payer.email_address || "", phone: payer.phone?.phone_number?.national_number || "",
      country: addr.country_code || "ES", region: addr.admin_area_1 || "",
      address1: addr.address_line_1 || "", address2: addr.address_line_2 || "",
      city: addr.admin_area_2 || "", zip: addr.postal_code || "",
    };
    if (process.env.PRINTIFY_TOKEN && process.env.PRINTIFY_SHOP_ID) {
      const pf = await sendToPrintify({ orderID, items: pu.items || [], address: addrPf });
      return json({ ok: true, orderId: orderID, name: firstName, printify: pf.ok });
    }
    const gelato = await sendToGelato({
      orderID,
      payerId: payer.payer_id || orderID,
      items: pu.items || [],
      address: {
        firstName,
        lastName: rest.join(" ") || "-",
        addressLine1: addr.address_line_1 || "",
        addressLine2: addr.address_line_2 || "",
        city: addr.admin_area_2 || "",
        state: addr.admin_area_1 || "",
        postCode: addr.postal_code || "",
        country: addr.country_code || "ES",
        email: payer.email_address || "",
        phone: payer.phone?.phone_number?.national_number || "",
      },
    });

    return json({ ok: true, orderId: orderID, name: firstName, gelato: gelato.ok });
  } catch (e) {
    console.error("capture-order", orderID, e.message, JSON.stringify(e.details || {}));
    return json({ error: "Hubo un problema al confirmar el pago. Si se te ha cobrado, escríbenos." }, 500);
  }
};

async function sendToGelato({ orderID, payerId, items, address }) {
  const key = process.env.GELATO_API_KEY;
  if (!key) {
    console.error("GELATO: falta GELATO_API_KEY. Pedido PayPal cobrado sin enviar:", orderID);
    return { ok: false };
  }
  const lines = [];
  const missing = [];
  for (const [i, it] of items.entries()) {
    const [id, size] = String(it.sku || "").split("|");
    const p = PRODUCTS[id];
    const uid = p ? await productUidFor(p, size, key) : "";
    const files = p ? Object.entries(p.printFiles).filter(([, url]) => url).map(([type, url]) => ({ type, url })) : [];
    if (!p || !uid || !files.length) { missing.push(`${it.sku} (${!uid ? "sin código de talla" : "sin archivo de impresión"})`); continue; }
    lines.push({ itemReferenceId: `${orderID}-${i + 1}`, productUid: uid, quantity: parseInt(it.quantity, 10) || 1, files });
  }
  if (missing.length) {
    console.error("GELATO: a estos productos les falta el Product UID o el archivo de impresión:", missing.join(", "), "Pedido:", orderID);
    return { ok: false };
  }

  const r = await fetch("https://order.gelatoapis.com/v4/orders", {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      orderType: process.env.GELATO_ORDER_TYPE === "order" ? "order" : "draft",
      orderReferenceId: orderID,
      customerReferenceId: payerId,
      currency: process.env.GELATO_CURRENCY || "EUR",
      items: lines,
      shipmentMethodUid: "normal",
      shippingAddress: address,
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("GELATO: error al crear el pedido", orderID, r.status, JSON.stringify(d));
    return { ok: false };
  }
  console.log("GELATO: pedido creado", d.id, "para PayPal", orderID);
  return { ok: true, id: d.id };
}


async function sendToPrintify({ orderID, items, address }) {
  const lines = [], missing = [];
  for (const it of items) {
    const [id, size, color] = String(it.sku || "").split("|");
    const p = PRODUCTS[id];
    try {
      const vid = p && p.printifyId ? await variantFor(p.printifyId, size, color) : null;
      if (!vid) { missing.push(it.sku); continue; }
      lines.push({ product_id: p.printifyId, variant_id: vid, quantity: parseInt(it.quantity, 10) || 1 });
    } catch (e) { missing.push(it.sku + " (" + e.message + ")"); }
  }
  if (missing.length) { console.error("PRINTIFY: no encuentro estos productos/tallas:", missing.join(", "), "Pedido:", orderID); return { ok: false }; }
  try {
    const o = await createPrintifyOrder({ orderID, lines, address });
    console.log("PRINTIFY: pedido creado", o.id, "para PayPal", orderID);
    return { ok: true, id: o.id };
  } catch (e) {
    console.error("PRINTIFY: error al crear el pedido", orderID, e.message, JSON.stringify(e.details || {}));
    return { ok: false };
  }
}

export const GET = handler;
export const POST = handler;
