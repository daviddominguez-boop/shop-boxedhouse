// Utilidades compartidas: catálogo, PayPal y respuestas.
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const catalog = require("../catalogo-boxed.js");

export const PRODUCTS = Object.fromEntries(catalog.products.map((p) => [p.id, p]));
export const CONFIG = catalog.config;

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

const PAYPAL_BASE = () =>
  (process.env.PAYPAL_ENV || "sandbox") === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

export async function paypalToken() {
  const id = process.env.PAYPAL_CLIENT_ID, secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Faltan PAYPAL_CLIENT_ID o PAYPAL_CLIENT_SECRET en Netlify");
  const r = await fetch(PAYPAL_BASE() + "/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(id + ":" + secret).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const d = await r.json();
  if (!r.ok) throw new Error("PayPal no acepta las claves: " + (d.error_description || r.status));
  return d.access_token;
}

export async function paypal(path, { method = "GET", body } = {}) {
  const token = await paypalToken();
  const r = await fetch(PAYPAL_BASE() + path, {
    method,
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error("PayPal: " + (d.message || r.status));
    e.details = d;
    throw e;
  }
  return d;
}

export const money = (n) => (Math.round(n * 100) / 100).toFixed(2);
