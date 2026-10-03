// Le da a la web el Client ID público de PayPal (no es secreto).
import { json } from "./_lib.mjs";

const handler = async () =>
  json({ clientId: process.env.PAYPAL_CLIENT_ID || "", env: process.env.PAYPAL_ENV || "sandbox" });

export const GET = handler;
export const POST = handler;
