// Comprobación: https://TU-WEB.netlify.app/.netlify/functions/check-printify?k=XXXXXXXX
// (XXXXXXXX = los 8 primeros caracteres de tu PRINTIFY_TOKEN)
import { PRODUCTS, json } from "./_lib.mjs";
import { loadVariants } from "./_printify.mjs";

const handler = async (req) => {
  const t = process.env.PRINTIFY_TOKEN;
  if (!t || !process.env.PRINTIFY_SHOP_ID) return json({ error: "Faltan PRINTIFY_TOKEN o PRINTIFY_SHOP_ID en Netlify" }, 500);
  if (new URL(req.url).searchParams.get("k") !== t.slice(0, 8)) return json({ error: "Clave incorrecta" }, 401);
  const out = [];
  for (const p of Object.values(PRODUCTS)) {
    if (!p.printifyId) { out.push({ producto: p.name, estado: "FALTA el ID de Printify" }); continue; }
    try {
      const v = await loadVariants(p.printifyId);
      const ok = v.variants.filter((x) => x.enabled);
      const faltan = p.sizes.filter((s) => !ok.some((x) => x.size === s));
      out.push({ producto: p.name, nombreEnPrintify: v.title, colores: [...new Set(ok.map((x) => x.color))], tallas: [...new Set(ok.map((x) => x.size))], tallasQueFaltan: faltan, listo: !faltan.length });
    } catch (e) { out.push({ producto: p.name, printifyId: p.printifyId, estado: "NO ENCONTRADO en tu tienda (" + e.message + ")" }); }
  }
  return json(out);
};

export const GET = handler;
export const POST = handler;
