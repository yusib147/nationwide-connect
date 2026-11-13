// Supabase Edge Function: check-photo — signup profile-photo classification.
// Ibrahim's order 2026-10-25: a signup photo must be a real photograph of
// a human. Logos, product shots, illustrations/cartoons, screenshots, text
// images, animals and objects are rejected by the client based on this
// verdict. This is CONTENT classification only — no face recognition, no
// identity matching, no templates, nothing stored.
//
// Interface: POST { image: "data:image/jpeg;base64,..." } (the client's
// cropped 256px avatar JPEG, well under 200KB)
//   -> 200 { human_photo: boolean, kind, confidence, provider }
//   kind: "human_photo" | "logo" | "product" | "illustration" |
//         "screenshot" | "text" | "animal" | "object" | "other"
// Provider pattern mirrors check-chat: Groq first (vision model), Gemini
// fallback on failure, 60s circuit breaker. Providers judge ONLY the
// category — enforcement (reject / allow / flag) lives in the client and
// in api/ai-scan.js, never here.
//
// DEPLOY: supabase functions deploy check-photo (secrets GROQ_API_KEY and
// GEMINI_API_KEY are already set for check-chat and are shared per project).

const GROQ_KEY = Deno.env.get("GROQ_API_KEY")!;
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";

let lastProvider = "none";
let groqCircuitOpenUntil = 0;

const PROMPT =
  "You are a strict photo classifier for a marketplace signup. Look at the image and decide ONE thing: is it a real photograph of a human person (a face or a person, taken with a camera)? " +
  "It is NOT a human photograph if it is: a logo or brand mark, a product/object photo, an illustration, cartoon, avatar render or AI-style drawing, a screenshot or photo of a screen, mostly text, an animal, a vehicle, a building, food, or scenery with no person. " +
  "A photograph OF a printed photo or poster of a person still counts as kind \"human_photo\" only if a real person's face is clearly the subject; when in doubt between human_photo and another kind, choose the other kind. " +
  "Reply with ONLY this JSON: {\"human_photo\": true|false, \"kind\": \"human_photo|logo|product|illustration|screenshot|text|animal|object|other\", \"confidence\": 0-100}. No other text.";

function parseVerdict(text: string) {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const j = JSON.parse(m[0]);
    if (typeof j.human_photo !== "boolean") return null;
    const kinds = ["human_photo", "logo", "product", "illustration", "screenshot", "text", "animal", "object", "other"];
    return {
      human_photo: j.human_photo,
      kind: kinds.includes(j.kind) ? j.kind : (j.human_photo ? "human_photo" : "other"),
      confidence: typeof j.confidence === "number" ? Math.max(0, Math.min(100, j.confidence)) : 50,
    };
  } catch (_e) {
    return null;
  }
}

async function callGroqVision(dataUrl: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: PROMPT },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      }],
      temperature: 0.0,
      max_tokens: 200,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callGeminiVision(dataUrl: string): Promise<string> {
  if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY secret is not set");
  const b64 = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: PROMPT },
            { inlineData: { mimeType: "image/jpeg", data: b64 } },
          ],
        }],
        generationConfig: { temperature: 0.0, maxOutputTokens: 200, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(30000),
    }
  );
  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts.map((p: { text?: string }) => p.text || "").join("");
}

async function classify(dataUrl: string) {
  if (Date.now() > groqCircuitOpenUntil) {
    try {
      const out = await callGroqVision(dataUrl);
      const v = parseVerdict(out);
      if (v) { lastProvider = "groq"; return v; }
      throw new Error("unparseable Groq verdict");
    } catch (e) {
      console.log("Groq vision failed, falling back to Gemini:", (e as Error).message);
      groqCircuitOpenUntil = Date.now() + 60000;
    }
  }
  const out = await callGeminiVision(dataUrl);
  const v = parseVerdict(out);
  if (!v) throw new Error("unparseable Gemini verdict");
  lastProvider = "gemini";
  return v;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: { "Content-Type": "application/json" } });
  }
  let image = "";
  try {
    const body = await req.json();
    image = String(body?.image || "");
  } catch (_e) { /* fall through to validation */ }
  if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image) || image.length > 200000) {
    return new Response(JSON.stringify({ error: "image must be a jpeg data URL under 200KB" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  try {
    lastProvider = "none";
    const v = await classify(image);
    return new Response(JSON.stringify({ ...v, provider: lastProvider }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.log("check-photo failed:", (e as Error).message);
    return new Response(JSON.stringify({ error: "classification unavailable" }), { status: 502, headers: { "Content-Type": "application/json" } });
  }
});
