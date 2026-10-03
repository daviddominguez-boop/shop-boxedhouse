// Saca el "Product UID" de Gelato de cada talla a partir del ID del producto.
// Prueba primero como plantilla (template) y, si no, como producto de tienda
// (para eso hace falta la variable GELATO_STORE_ID).
const cache = new Map();

const norm = (s) => {
  s = String(s || "").trim().toUpperCase().replace(/\s+/g, "");
  const map = { "2XL": "XXL", "3XL": "XXXL", XXXXL: "4XL" };
  return map[s] || s;
};

async function getJson(url, key) {
  const r = await fetch(url, { headers: { "X-API-KEY": key } });
  if (!r.ok) return null;
  return r.json().catch(() => null);
}

export async function loadVariants(gelatoId, key) {
  if (cache.has(gelatoId)) return cache.get(gelatoId);
  let source = "template";
  let data = await getJson(`https://ecommerce.gelatoapis.com/v1/templates/${gelatoId}`, key);
  if (!data && process.env.GELATO_STORE_ID) {
    source = "store";
    data = await getJson(`https://ecommerce.gelatoapis.com/v1/stores/${process.env.GELATO_STORE_ID}/products/${gelatoId}`, key);
  }
  if (!data || !Array.isArray(data.variants)) return { source: null, sizes: {} };
  const sizes = {};
  for (const v of data.variants) {
    const opt = (v.variantOptions || []).find((o) => /size|talla/i.test(o.name || ""));
    const size = norm(opt ? opt.value : String(v.title || "").split(" - ").pop());
    if (size && v.productUid && !sizes[size]) sizes[size] = v.productUid;
  }
  const out = { source, sizes, title: data.title || "" };
  cache.set(gelatoId, out);
  return out;
}

export async function productUidFor(p, size, key) {
  if (p.gelato && p.gelato[size]) return p.gelato[size];
  if (!p.gelatoId) return "";
  const v = await loadVariants(p.gelatoId, key);
  return v.sizes[norm(size)] || "";
}
