// Conexión con Printify: busca la variante (color + talla) y crea el pedido.
const BASE = "https://api.printify.com/v1";
const cache = new Map();

const headers = () => ({
  Authorization: "Bearer " + process.env.PRINTIFY_TOKEN,
  "Content-Type": "application/json",
  "User-Agent": "BOXED-web",
});

const norm = (s) => {
  s = String(s || "").trim().toUpperCase().replace(/\s+/g, "");
  return { "2XL": "XXL", "3XL": "XXXL" }[s] || s;
};

export async function pfGet(path) {
  const r = await fetch(BASE + path, { headers: headers() });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error("Printify " + r.status); e.details = d; throw e; }
  return d;
}

export async function pfPost(path, body) {
  const r = await fetch(BASE + path, { method: "POST", headers: headers(), body: JSON.stringify(body || {}) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error("Printify " + r.status); e.details = d; throw e; }
  return d;
}

// Devuelve [{ id, size, color, enabled }] de un producto de Printify
export async function loadVariants(printifyId) {
  if (cache.has(printifyId)) return cache.get(printifyId);
  const shop = process.env.PRINTIFY_SHOP_ID;
  const p = await pfGet(`/shops/${shop}/products/${printifyId}.json`);
  const valueTitle = {}, valueType = {};
  for (const o of p.options || []) for (const v of o.values || []) { valueTitle[v.id] = v.title; valueType[v.id] = (o.type || o.name || "").toLowerCase(); }
  const out = (p.variants || []).map((v) => {
    let size = "", color = "";
    for (const id of v.options || []) {
      const t = valueType[id] || "";
      if (t.includes("size") || t.includes("talla")) size = valueTitle[id];
      else if (t.includes("color")) color = valueTitle[id];
    }
    if (!size || !color) { const parts = String(v.title || "").split(" / "); if (!color && parts.length > 1) color = parts[0]; if (!size) size = parts[parts.length - 1]; }
    return { id: v.id, size: norm(size), color: String(color || "").trim(), enabled: v.is_enabled !== false };
  });
  const res = { title: p.title || "", variants: out };
  cache.set(printifyId, res);
  return res;
}

export async function variantFor(printifyId, size, color) {
  const { variants } = await loadVariants(printifyId);
  const s = norm(size), c = String(color || "").toLowerCase();
  const ok = variants.filter((v) => v.enabled && v.size === s);
  return (ok.find((v) => v.color.toLowerCase() === c) || ok.find((v) => v.color.toLowerCase().includes(c)) || ok[0] || {}).id;
}

// Crea el pedido. Si PRINTIFY_AUTO_SEND = "true" lo manda directamente a producción.
export async function createPrintifyOrder({ orderID, lines, address }) {
  const shop = process.env.PRINTIFY_SHOP_ID;
  const order = await pfPost(`/shops/${shop}/orders.json`, {
    external_id: orderID,
    label: "BOXED " + orderID,
    line_items: lines,
    shipping_method: 1,
    send_shipping_notification: true,
    address_to: address,
  });
  if (process.env.PRINTIFY_AUTO_SEND === "true" && order.id) {
    await pfPost(`/shops/${shop}/orders/${order.id}/send_to_production.json`);
  }
  return order;
}
