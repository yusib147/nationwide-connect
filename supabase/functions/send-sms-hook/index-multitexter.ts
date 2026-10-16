// Supabase Auth Send SMS Hook -> Multitexter
// Receives OTP from Supabase Auth, delivers via Multitexter SMS API.
// Deploy: supabase functions deploy send-sms-hook --no-verify-jwt
// Secrets needed: MULTITEXTER_EMAIL, MULTITEXTER_PASSWORD, SEND_SMS_HOOK_SECRET
// Optional: MULTITEXTER_SENDER (default "Nationwide"), MULTITEXTER_FORCEDND (default "1")

import { createHmac } from "node:crypto";

const MT_EMAIL = Deno.env.get("MULTITEXTER_EMAIL")!;
const MT_PASSWORD = Deno.env.get("MULTITEXTER_PASSWORD")!;
const HOOK_SECRET = Deno.env.get("SEND_SMS_HOOK_SECRET")!;
const SENDER_NAME = Deno.env.get("MULTITEXTER_SENDER") || "Nationwide";
const FORCE_DND = Deno.env.get("MULTITEXTER_FORCEDND") || "1";

function verifySignature(rawBody: string, headers: Headers): boolean {
  const id = headers.get("webhook-id");
  const ts = headers.get("webhook-timestamp");
  const sigHeader = headers.get("webhook-signature");
  if (!id || !ts || !sigHeader || !HOOK_SECRET) return false;
  let b64 = HOOK_SECRET.trim();
  if (b64.startsWith("v1,")) b64 = b64.slice(3);
  if (b64.startsWith("whsec_")) b64 = b64.slice(6);
  const payload = `${id}.${ts}.${rawBody}`;
  let keyBytes: Uint8Array;
  try {
    const bin = atob(b64);
    keyBytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return false;
  }
  {
    const expected = createHmac("sha256", keyBytes).update(payload).digest("base64");
    for (const part of sigHeader.split(" ")) {
      const sig = part.startsWith("v1,") ? part.slice(3) : part;
      if (sig === expected) return true;
    }
  }
  return false;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  // Debug: check Multitexter balance / account status
  if (url.searchParams.get("debug") === "balance") {
    try {
      const res = await fetch("https://app.multitexter.com/v2/app/balance?email=" + encodeURIComponent(MT_EMAIL) + "&password=" + encodeURIComponent(MT_PASSWORD), {
        signal: AbortSignal.timeout(8000),
      });
      const text = await res.text();
      return Response.json({ mt_status: res.status, mt_body: text.slice(0, 500) }, { status: 200 });
    } catch (e) {
      return Response.json({ error: "debug fetch failed: " + (e instanceof Error ? e.message : String(e)) }, { status: 200 });
    }
  }
  // Debug: test SMS send via Multitexter
  if (url.searchParams.get("debug") === "sendtest") {
    try {
      const res = await fetch("https://app.multitexter.com/v2/app/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: MT_EMAIL,
          password: MT_PASSWORD,
          message: "Debug test from Nationwide Connect. Ignore.",
          sender_name: SENDER_NAME,
          recipients: "2349016618810",
          forcednd: FORCE_DND,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const text = await res.text();
      return Response.json({ mt_status: res.status, mt_body: text.slice(0, 1000) }, { status: 200 });
    } catch (e) {
      return Response.json({ error: "debug send failed: " + (e instanceof Error ? e.message : String(e)) }, { status: 200 });
    }
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();

  if (!verifySignature(rawBody, req.headers)) {
    return Response.json(
      { error: { http_code: 401, message: "Invalid webhook signature" } },
      { status: 401 }
    );
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json(
      { error: { http_code: 400, message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const phone: string | undefined = body?.user?.phone || body?.sms?.phone;
  const otp: string | undefined = body?.sms?.otp || body?.otp;

  if (!phone || !otp) {
    return Response.json(
      { error: { http_code: 400, message: "Missing phone or otp in payload" } },
      { status: 400 }
    );
  }

  // Multitexter expects digits, strip leading +
  const recipient = phone.replace(/^\+/, "");
  const message = `Your Nationwide Connect verification code is ${otp}. It expires in 10 minutes.`;

  try {
    const res = await fetch("https://app.multitexter.com/v2/app/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: MT_EMAIL,
        password: MT_PASSWORD,
        message: message,
        sender_name: SENDER_NAME,
        recipients: recipient,
        forcednd: FORCE_DND,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const respText = await res.text().catch(() => "");

    if (!res.ok) {
      console.error("Multitexter API error:", res.status, respText);
      return Response.json(
        { error: { http_code: 502, message: "SMS provider failed: " + respText.slice(0, 200) } },
        { status: 502 }
      );
    }

    return Response.json({}, { status: 200 });
  } catch (e) {
    console.error("Multitexter request failed:", e);
    return Response.json(
      { error: { http_code: 502, message: "SMS provider unreachable" } },
      { status: 502 }
    );
  }
});
