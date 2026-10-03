// Reseñas de la tienda y de cada producto.
// Se guardan en una base de datos Upstash Redis conectada desde Vercel
// (Vercel → Storage → Upstash for Redis). Vercel añade solas las variables
// KV_REST_API_URL y KV_REST_API_TOKEN (o UPSTASH_REDIS_REST_URL / _TOKEN).
//
// GET  /api/reviews?p=site            → reseñas de la tienda
// GET  /api/reviews?p=<id-producto>   → reseñas de un producto
// GET  /api/reviews?summary=1         → nota media y número de reseñas de cada producto
// POST /api/reviews  {p, name, rating, text}
// Borrar una reseña: /api/reviews?del=<id>&p=<p>&k=<8 primeros caracteres de PRINTIFY_TOKEN>
import { PRODUCTS, json } from "./_lib.mjs";

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(...cmd) {
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error("redis: " + (d.error || r.status));
  return d.result;
}

const validKey = (p) => p === "site" || Object.prototype.hasOwnProperty.call(PRODUCTS, p);
const clean = (s, n) => String(s || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

const handler = async (req) => {
  if (!URL_ || !TOKEN) return json({ error: "no-db", items: [], count: 0, avg: 0 }, 503);
  const u = new URL(req.url);
  try {
    if (req.method === "GET") {
      // Borrar (solo el dueño)
      const del = u.searchParams.get("del");
      if (del) {
        const k = u.searchParams.get("k") || "";
        const t = process.env.PRINTIFY_TOKEN || "";
        if (!t || k !== t.slice(0, 8)) return json({ error: "Clave incorrecta" }, 401);
        const p = u.searchParams.get("p");
        if (!validKey(p)) return json({ error: "p no válido" }, 400);
        const list = (await redis("LRANGE", "reviews:" + p, 0, 499)) || [];
        for (const raw of list) {
          const r = JSON.parse(raw);
          if (r.id === del) {
            await redis("LREM", "reviews:" + p, 1, raw);
            await redis("HINCRBY", "reviews:stats", p + ":count", -1);
            await redis("HINCRBY", "reviews:stats", p + ":sum", -r.rating);
            return json({ ok: true });
          }
        }
        return json({ error: "No encontrada" }, 404);
      }
      if (u.searchParams.get("summary")) {
        const arr = (await redis("HGETALL", "reviews:stats")) || [];
        const out = {};
        for (let i = 0; i < arr.length; i += 2) {
          const [p, f] = arr[i].split(":");
          out[p] = out[p] || { count: 0, sum: 0 };
          out[p][f] = Number(arr[i + 1]) || 0;
        }
        for (const p in out) out[p].avg = out[p].count ? +(out[p].sum / out[p].count).toFixed(1) : 0;
        return json(out);
      }
      const p = u.searchParams.get("p") || "site";
      if (!validKey(p)) return json({ error: "p no válido" }, 400);
      const [list, count, sum] = await Promise.all([
        redis("LRANGE", "reviews:" + p, 0, 49),
        redis("HGET", "reviews:stats", p + ":count"),
        redis("HGET", "reviews:stats", p + ":sum"),
      ]);
      const c = Number(count) || 0;
      return json({ items: (list || []).map((x) => JSON.parse(x)), count: c, avg: c ? +(Number(sum) / c).toFixed(1) : 0 });
    }

    if (req.method === "POST") {
      const b = await req.json().catch(() => ({}));
      const p = String(b.p || "site");
      const rating = parseInt(b.rating, 10);
      const name = clean(b.name, 40);
      const text = clean(b.text, 600);
      if (!validKey(p)) return json({ error: "Producto no válido" }, 400);
      if (!(rating >= 1 && rating <= 5)) return json({ error: "Elige de 1 a 5 estrellas" }, 400);
      if (name.length < 2) return json({ error: "Escribe tu nombre" }, 400);
      if (text.length < 10) return json({ error: "La reseña tiene que tener al menos 10 caracteres" }, 400);
      if (/https?:\/\/|www\./i.test(text)) return json({ error: "No se permiten enlaces en las reseñas" }, 400);
      // Anti-spam: una reseña cada 60 s por IP
      const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "x";
      const ok = await redis("SET", "reviews:rl:" + ip, "1", "NX", "EX", 60);
      if (ok !== "OK") return json({ error: "Espera un minuto antes de enviar otra reseña" }, 429);
      const r = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, rating, text, date: new Date().toISOString() };
      await redis("LPUSH", "reviews:" + p, JSON.stringify(r));
      await redis("LTRIM", "reviews:" + p, 0, 499);
      await redis("HINCRBY", "reviews:stats", p + ":count", 1);
      await redis("HINCRBY", "reviews:stats", p + ":sum", rating);
      return json({ ok: true, review: r });
    }
    return json({ error: "Método no permitido" }, 405);
  } catch (e) {
    console.error("reviews", e.message);
    return json({ error: "No se ha podido guardar ahora mismo. Inténtalo más tarde." }, 500);
  }
};

export const GET = handler;
export const POST = handler;
