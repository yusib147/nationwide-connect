// Supabase Edge Function: check-listing
// AI-powered scam detection for new listings using Groq (Llama 3.3).
// Called after a product is created. Analyzes title, description, price.
// Updates product with ai_risk_score (0-100) and ai_flag_reason.
// High risk (>=70): keeps status as 'pending' for admin review.
// Low risk (<70) + silver/gold seller: auto-approves to 'active'.
// Secrets needed: GROQ_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const GROQ_KEY = Deno.env.get("GROQ_API_KEY")!;
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function callAI(prompt: string, retries = 3): Promise<string> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${GROQ_KEY}`,
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            max_tokens: 1500,
          }),
          signal: AbortSignal.timeout(30000),
        }
      );
      if (res.status === 429) {
        const waitMs = Math.pow(2, attempt) * 5000;
        console.log(`Groq 429, retrying in ${waitMs}ms (attempt ${attempt + 1}/${retries})`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
      const data = await res.json();
      return data.choices?.[0]?.message?.content || "";
    } catch (e) {
      if (attempt === retries - 1) throw e;
      const waitMs = Math.pow(2, attempt) * 5000;
      console.log(`Groq error, retrying in ${waitMs}ms: ${e.message}`);
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
  throw new Error("Groq API failed after retries");
}

async function sbFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      "apikey": SB_SERVICE_KEY,
      "Authorization": `Bearer ${SB_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Supabase error: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders });
  }

  const productId = body.product_id;
  if (!productId) {
    return Response.json({ error: "Missing product_id" }, { status: 400, headers: corsHeaders });
  }

  try {
    // Fetch the product with seller info
    const products = await sbFetch(
      `products?id=eq.${productId}&select=id,title,description,price,category_id,seller_id,status,profiles!products_seller_id_fkey(verification_tier)`
    );
    if (!products.length) {
      return Response.json({ error: "Product not found" }, { status: 404, headers: corsHeaders });
    }
    const product = products[0];
    const sellerTier = product.profiles?.verification_tier || "bronze";

    // Build the AI prompt
    const prompt = `You are a fraud detection AI for a Nigerian marketplace (like Jiji). Analyze this listing for scam signals.

Title: ${product.title}
Description: ${product.description}
Price: ₦${product.price}
Category ID: ${product.category_id}

Rough Nigerian market references (2026):
- iPhone 14 Pro Max ~₦750k, iPhone 13 ~₦450k, Samsung S23 ~₦450k
- Toyota Camry 2015 ~₦5-7m, Honda Accord 2018 ~₦6-8m, Toyota Corolla 2016 ~₦4-5m
- MacBook Pro M1 2021 ~₦800k-1m, MacBook Air M1 used ~₦380-550k, PS5 new ~₦500k
- 3-bedroom flat rent in Surulere/Yaba ~₦1.2-2.5m per year, 55 inch Smart TV used ~₦300-450k, 2.5kVA generator used ~₦250-400k
Flag price only if <60% of reference. A fair market price is NOT suspicious.
A price ABOVE the reference range is NEVER a scam signal by itself — overpricing is normal seller behaviour. Only prices far BELOW market count as a price signal.

Nigerian listing phrases (interpret them correctly):
- "never opened", "not opened", "has not been opened" on a phone means the device has never been repaired or tampered with. This is a TRUST signal, even when the phone is used. It is NOT a contradiction.
- "first body" means original factory paint (trust signal for cars). "nothing to fix" means no known faults.

Scam signals:
- Price far below market value (<60% of reference)
- Requests for advance payment/deposit in description
- Urgency pressure ("send now", "only today", "first come")
- Contact info in description (bypassing platform)
- Vague 1-2 line description on premium items
- Refuses inspection or pickup ("delivery only", "no pickups", "no inspection")

IMPORTANT — do NOT be too strict. Many HONEST Nigerian sellers SOUND like scammers. The following are normal marketplace behaviour and are NEVER enough for HIGH on their own:
- Sales talk and urgency: "serious buyers only", "no time wasters", "fast sale", "if you are not ready don't call me". Sellers say this because buyers waste their time daily.
- A small deposit to HOLD an item at a FAIR price, with inspection or pickup allowed before full payment. This is standard practice — it protects the seller from unserious buyers. It is completely different from an advance-fee scam.
- ALL CAPS titles, pidgin English, poor grammar, exclamation marks, short descriptions on cheap everyday items.
- Admitting a flaw honestly ("cracked screen", "no receipt", "small scratch") — honest sellers disclose; scammers hide.

Scoring caps (hard rules):
- Style traits alone (urgency, caps, pidgin, short description, deposit-to-hold at fair price) can NEVER push a listing above 55.
- A single moderate signal caps the score at 45.
- HIGH (70+) requires at least one HARD signal: (a) price under 60% of market used as bait, (b) a third-party fee structure — pay clearance, waybill, inspection fee, or delivery fee to someone else before seeing the item, (c) payment demanded before delivery COMBINED with refusing inspection or pickup, (d) job offers, investments, crypto, or prizes asking for any payment.
- When torn between two bands, choose the LOWER one. A wrongly flagged honest seller costs more than a watched suspicious one — a human reviews everything that scores in the watch band anyway.

A polished, detailed description does NOT clear a listing that demands payment before delivery AND refuses inspection — that combination scores at least 75 (HIGH) even when everything else looks clean. Polish, detail, photos and a fair-looking price do NOT soften it.

Trust signals that LOWER the score:
- Specific verifiable details (exact specs, serial numbers, receipt mentions)
- Exact location and "inspection welcome"
- Detailed honest description, realistic negotiation language
- Complete papers/documents mentioned for vehicles

Examples:
LOW (score 15): "Samsung Galaxy S23 256GB" ₦450,000. "Used 8 months, no scratches, box and charger included. Receipt available." Realistic price, detailed, verifiable.
LOW (score 20): "Toyota Camry 2015 — SERIOUS BUYERS ONLY, NO TIME WASTERS" ₦5,800,000. "First body, nothing to fix, full papers. Come and inspect at Ikeja before you pay anything." Aggressive sales talk, but fair price and inspection welcome — an honest seller.
LOW (score 25): "iPhone 13 128GB" ₦430,000. "I need money urgently for school fees. First serious person takes it. Small deposit can hold it for you, but come and see it first before you balance." Deposit-to-hold at a fair price WITH inspection offered is normal practice, not a scam.
HIGH (score 90): "iPhone 16 Pro Max CHEAPEST" ₦120,000. "Send 30k deposit NOW to reserve! Urgent!" Absurd price + advance payment + urgency.
HIGH (score 85): "iPhone 14 256GB Very Clean" ₦380,000. "Everything perfect, detailed photos available. Delivery only, no pickups. Payment confirms your order, we ship same day nationwide." Polished and detailed, but payment is demanded before delivery AND pickup/inspection is refused — that combination is HIGH even at a fair-looking price.

Respond in this EXACT JSON format:
{"risk_score": <0-100>, "reasons": ["<reason1>", "<reason2>"], "verdict": "<LOW|MEDIUM|HIGH>"}

Score bands: LOW=0-39 (normal), MEDIUM=40-69 (watch), HIGH=70-100 (likely scam).
Be fair: honest detailed listings with fair prices should score under 30. An honestly admitted flaw (e.g. "no receipt") is mild at most — alone it never justifies HIGH.`;

    const aiResponse = await callAI(prompt);
    
    // Parse the JSON from AI response
    let riskScore = 50;
    let reasons: string[] = [];
    let verdict = "MEDIUM";
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        riskScore = Math.min(100, Math.max(0, parseInt(parsed.risk_score) || 50));
        reasons = Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 3) : [];
        verdict = parsed.verdict || "MEDIUM";
      }
    } catch {
      // Use defaults if parsing fails
    }

    const flagReason = reasons.join("; ") || null;

    // Decide status: high risk stays pending, low risk + trusted seller auto-approves
    let newStatus = product.status;
    if (riskScore >= 70) {
      newStatus = "pending"; // Force manual review
    } else if (riskScore < 40 && (sellerTier === "silver" || sellerTier === "gold") && product.status === "pending") {
      newStatus = "active"; // Auto-approve trusted sellers with low risk
    }

    // Update the product
    await sbFetch(`products?id=eq.${productId}`, {
      method: "PATCH",
      body: JSON.stringify({
        ai_risk_score: riskScore,
        ai_flag_reason: flagReason,
        status: newStatus,
      }),
    });

    return Response.json({
      product_id: productId,
      risk_score: riskScore,
      verdict,
      reasons,
      status: newStatus,
    }, { headers: corsHeaders });
  } catch (e) {
    console.error("check-listing failed:", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
});
