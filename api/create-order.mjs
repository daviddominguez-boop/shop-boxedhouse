// Crea el pago en PayPal. Los precios se calculan AQUÍ con products.js,
// nunca se fían de lo que mande el navegador.
import { PRODUCTS, CONFIG, json, paypal, money } from "./_lib.mjs";

const handler = async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  try {
    const body = await req.json();
    const items = body.items;
    const cur = CONFIG.currencies && CONFIG.currencies[body.currency] ? body.currency : (CONFIG.defaultCurrency || CONFIG.currency);
    const curCfg = (CONFIG.currencies && CONFIG.currencies[cur]) || CONFIG;
    if (!Array.isArray(items) || !items.length) return json({ error: "El carrito está vacío" }, 400);

    const lines = [];
    for (const it of items.slice(0, 30)) {
      const p = PRODUCTS[it.id];
      const qty = Math.max(1, Math.min(10, parseInt(it.qty, 10) || 1));
      if (!p || !p.sizes.includes(it.size)) return json({ error: "Producto o talla no válidos" }, 400);
      const color = (p.colors && (p.colors.find((c) => c.name === it.color) || p.colors[0]).name) || "";
      const unit = p.prices ? p.prices[cur] : p.price;
      lines.push({
        name: (p.name + " - " + color + " - " + it.size).slice(0, 127),
        sku: p.id + "|" + it.size + "|" + color,
        quantity: String(qty),
        unit_amount: { currency_code: cur, value: money(unit) },
        category: "PHYSICAL_GOODS",
        _total: unit * qty,
      });
    }
    const sub = lines.reduce((a, l) => a + l._total, 0);
    const ship = curCfg.freeShippingFrom && sub >= curCfg.freeShippingFrom ? 0 : curCfg.shipping;
    lines.forEach((l) => delete l._total);

    const order = await paypal("/v2/checkout/orders", {
      method: "POST",
      body: {
        intent: "CAPTURE",
        purchase_units: [{
          description: "Pedido BOXED",
          amount: {
            currency_code: cur,
            value: money(sub + ship),
            breakdown: {
              item_total: { currency_code: cur, value: money(sub) },
              shipping: { currency_code: cur, value: money(ship) },
            },
          },
          items: lines,
        }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: "BOXED",
              locale: "es-ES",
              shipping_preference: "GET_FROM_FILE",
              user_action: "PAY_NOW",
            },
          },
        },
      },
    });
    return json({ id: order.id });
  } catch (e) {
    console.error("create-order", e.message, JSON.stringify(e.details || {}));
    return json({ error: "No se pudo iniciar el pago. Inténtalo de nuevo." }, 500);
  }
};

export const GET = handler;
export const POST = handler;
