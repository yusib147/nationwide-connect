// Supabase Edge Function: check-chat
// AI-powered spam detection for chat conversations using Groq (Llama 3.3).
// Called on-demand (when a conversation is reported, or via admin).
// Analyzes recent messages for spam/scam patterns.
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
            model: "openai/gpt-oss-20b",
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

  const conversationId = body.conversation_id;
  if (!conversationId) {
    return Response.json({ error: "Missing conversation_id" }, { status: 400, headers: corsHeaders });
  }

  try {
    // Fetch the conversation (participants + product) for pattern detection
    const convos = await sbFetch(
      `conversations?id=eq.${conversationId}&select=buyer_id,seller_id,product_id`
    );
    const convo = convos && convos.length ? convos[0] : null;

    // Fetch recent messages (last 20)
    const messages = await sbFetch(
      `messages?conversation_id=eq.${conversationId}&order=created_at.desc&limit=20&select=body,sender_id,created_at`
    );
    
    if (!messages.length) {
      return Response.json({ spam_score: 0, verdict: "CLEAN", reasons: [] }, { headers: corsHeaders });
    }

    // Format messages for AI
    const chatText = messages.reverse().map((m: any, i: number) => 
      `[${i+1}] ${m.body.slice(0, 200)}`
    ).join("\n");

    const prompt = `You are a spam detection AI for a Nigerian marketplace chat. Analyze this conversation for spam/scam patterns.

Conversation (last ${messages.length} messages):
${chatText}

Spam/scam signals (need at least TWO for SPAM verdict):
- Sending the same message repeatedly (flooding). Only claim flooding when the same or nearly the same message text actually repeats in the conversation above; a normal back-and-forth of different messages is never flooding.
- Advance payment requests ("send money first", "pay before delivery", "deposit now")
- WHO pushes the payment matters: if the buyer offers to pay in advance and the seller declines it and insists on inspection first ("come and see it first", "pay only when you are satisfied", "I no dey collect money before inspection"), that is an HONEST pattern — never a spam signal. Judge the party pushing for advance payment, not the one who refused it.
- Phishing (asking for passwords, OTP codes, bank details)
- Fake urgency + secrecy ("don't tell anyone", "secret deal")
- Not discussing the actual product at all

Note: Sharing a phone number alone is common in Nigeria for logistics/delivery coordination. It is NOT automatically spam. Only flag it when combined with payment demands or other scam signals.

Nigerian context — these are NORMAL and must score CLEAN:
- Nigerian Pidgin English is everyday market language: "Oga", "e still dey?", "wetin be your last price?", "no wahala", "bring money come carry am", "I go come check am tomorrow". Pidgin is NEVER a scam signal by itself.
- Pay on delivery is safe and normal: a dispatch rider delivering an item and the buyer paying the rider or seller WHEN the item arrives ("pay on delivery", "you pay him when the item reaches you", delivery fee "paid on delivery") is the STANDARD safe pattern. Only flag payment demanded BEFORE the buyer receives the item (advance payment or deposit into an account).
- Price haggling, even sharp or urgent-sounding haggling ("bring 400k come carry am today"), is normal negotiation, not pressure tactics.

Examples:
CLEAN (score 10): Buyer: "Is this still available?" Seller: "Yes" Buyer: "Can we meet at Ikeja tomorrow?" Seller: "OK, call me on 0803..." Normal negotiation with logistics.
CLEAN (score 10): Buyer: "Oga, e still dey?" Seller: "Yes e still dey" Buyer: "Wetin be last price?" Seller: "Bring 400k come carry am" Buyer: "I go come check am tomorrow" Normal pidgin negotiation.
CLEAN (score 15): Buyer: "Can you send through dispatch rider?" Seller: "Yes, you pay the rider when the item reaches you" Buyer: "How much delivery?" Seller: "3,500, paid on delivery" Normal pay-on-delivery logistics.
CLEAN (score 10): Buyer: "I trust you, I fit transfer the money now now and come carry am tomorrow?" Seller: "No need. Come and see the fridge first, test am well well. You pay only when you are satisfied. I no dey collect money before inspection." The buyer offered advance payment and the SELLER refused it, insisting on inspection first: honest seller, CLEAN. Judge who pushes the payment.
SPAM (score 85): "Send 50k deposit NOW to 0123456789 GTBank!" "Urgent! Don't tell anyone!" Advance payment + urgency + secrecy.

SECOND TASK — abusive language. Marketplace policy forbids insults, curses, threats and harassment between users. ALSO score the conversation for abuse: "abuse_score" 0-100.
- Abuse = insults, curses, threats or harassment AIMED at the other person. Nigerian insults count fully, in English, pidgin, Yoruba, Igbo or Hausa: e.g. "mumu", "ode", "olodo", "idiot", "stupid", "useless fellow", "bastard", "ashawo", "thunder fire you", "your papa", threats of violence or spiritual harm, repeated name-calling, sexual harassment. Veiled/indirect threats count fully too: in a quarrel, "you go see", "no worry", "I sabi your shop", "I know where you stay" aimed at the other person are threats of harm, not banter — score them HIGH.
- NOT abuse: friendly banter and teasing during negotiation ("you too like money o", "oga you wan rob me?" as a price joke, laughing emojis), football banter, frustration aimed at a situation and not the person ("this Lagos traffic is mad"), or one mild swear word not aimed at the other party. Banter is mutual and light; abuse is one-sided, targeted, repeated or threatening.
- Score abuse HIGH (70+) only for clear targeted insults, curses or threats. When unsure whether it is banter or abuse, score abuse LOW — do not flag friendly conversation.
- When abuse_score is 70+, include "Abusive language" in reasons.

Respond in this EXACT JSON format:
{"spam_score": <0-100>, "abuse_score": <0-100>, "reasons": ["<reason1>", "<reason2>"], "verdict": "<CLEAN|SUSPICIOUS|SPAM>"}

Score bands: CLEAN=0-39, SUSPICIOUS=40-69, SPAM=70-100.
A normal buyer-seller negotiation should score under 20. Weight recent messages more heavily.`;

    let spamScore = 0;
    let abuseScore = 0;
    let reasons: string[] = [];
    let verdict = "CLEAN";
    // If the model's answer cannot be parsed (truncated JSON happens with
    // reasoning models), ask once more before falling back to defaults —
    // a silent 0/CLEAN fallback would wave a scam chat through.
    for (let scanAttempt = 0; scanAttempt < 2; scanAttempt++) {
      const aiResponse = await callAI(prompt);
      let parsedOk = false;
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          spamScore = Math.min(100, Math.max(0, parseInt(parsed.spam_score) || 0));
          abuseScore = Math.min(100, Math.max(0, parseInt(parsed.abuse_score) || 0));
          reasons = Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 3) : [];
          verdict = parsed.verdict || "CLEAN";
          parsedOk = true;
        }
      } catch { /* fall through to the retry */ }
      if (parsedOk) break;
    }

    // ---- Pattern detection: one person mass-messaging many people ----
    // A suspected scammer rarely works one chat at a time. Watch each
    // participant's footprint across the whole marketplace in the last 24h:
    // how many DIFFERENT people they contacted, and whether they pasted the
    // same message into many chats. Volume alone never flags (popular honest
    // sellers are busy too) — it must combine with a SPAM scan here, or with
    // heavy message repetition. Files at most one PATTERN ALERT per user per
    // 24h into the admin reports queue. A DEFINITE pattern (blast + SPAM
    // scan, or blast + advance-payment bait inside the repeated message)
    // also AUTO-SUSPENDS the account; the user can appeal in the app and
    // the admin decides reinstate vs permanent ban.
    const patternAlerts: any[] = [];
    if (convo && convo.product_id) {
      try {
        const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const parties: [string, string][] = [
          [convo.buyer_id, convo.seller_id],
          [convo.seller_id, convo.buyer_id],
        ];
        for (const [userId, counterpartyId] of parties) {
          if (!userId || !counterpartyId) continue;
          const userConvos = await sbFetch(
            `conversations?or=(buyer_id.eq.${userId},seller_id.eq.${userId})&created_at=gte.${since}&select=buyer_id,seller_id`
          );
          const contacts = new Set<string>();
          for (const c of userConvos || []) {
            contacts.add(c.buyer_id === userId ? c.seller_id : c.buyer_id);
          }
          if (contacts.size < 5) continue;
          // Fresh-start rule: if this account's status last changed inside
          // the window (e.g. an admin reinstated it after an appeal), only
          // count messages sent AFTER that moment. An admin-reviewed blast
          // must not re-suspend a reinstated user on the next scan, but a
          // NEW blast after reinstatement still counts and still suspends.
          let userSince = since;
          try {
            const prof0 = await sbFetch(`profiles?id=eq.${userId}&select=status_at`);
            const sat = prof0 && prof0.length ? prof0[0].status_at : null;
            if (sat && sat > since) userSince = sat;
          } catch (e) {}
          const userMsgs = await sbFetch(
            `messages?sender_id=eq.${userId}&created_at=gte.${userSince}&select=body,conversation_id&limit=500`
          );
          const byBody = new Map<string, Set<string>>();
          for (const m of userMsgs || []) {
            const key = (m.body || "").trim().toLowerCase();
            if (key.length < 8) continue;
            if (!byBody.has(key)) byBody.set(key, new Set<string>());
            byBody.get(key)!.add(m.conversation_id);
          }
          let repeatChats = 0;
          let repeatBody = "";
          for (const [bodyText, s] of byBody.entries()) {
            if (s.size > repeatChats) { repeatChats = s.size; repeatBody = bodyText; }
          }
          const spamHere = verdict === "SPAM";
          const repeater = repeatChats >= 4;
          if (!spamHere && !repeater) continue;
          // Definite-scam test for AUTO-SUSPENSION (Ibrahim's order
          // 2026-10-13): mass-blasting (5+ different people, same message
          // in 4+ chats) PLUS either this chat independently scanned
          // SPAM, or the blasted message itself demands advance payment
          // or asks for OTP / account details. Anything weaker stays
          // alert-only and never touches the account.
          const PAYMENT_BAIT = ["deposit", "send money", "send the money", "pay before", "payment before", "before delivery", "pay first", "account number", "otp", "registration fee", "clearance fee", "waybill fee", "escrow", "gift card", "bitcoin", "crypto"];
          const baitHit = repeater && PAYMENT_BAIT.some(k => repeatBody.includes(k));
          const definite = contacts.size >= 5 && repeater && ((spamHere && spamScore >= 70) || baitHit);
          let suspended = false;
          if (definite) {
            try {
              const prof = await sbFetch(`profiles?id=eq.${userId}&select=account_status`);
              if (prof && prof.length && prof[0].account_status === "active") {
                const upd = await sbFetch(`profiles?id=eq.${userId}&account_status=eq.active`, {
                  method: "PATCH",
                  headers: { "Prefer": "return=representation" },
                  body: JSON.stringify({
                    account_status: "suspended",
                    status_reason: `Auto-suspended by AI pattern detection: contacted ${contacts.size} people in 24h, same message across ${repeatChats} chats${spamHere ? `, chat scanned SPAM (${spamScore})` : ""}${baitHit ? ", blasted message demands advance payment" : ""}`,
                    status_at: new Date().toISOString(),
                  }),
                });
                suspended = Array.isArray(upd) && upd.length > 0;
              }
            } catch (e) {
              console.error("auto-suspend failed:", e);
            }
          }
          const existing = await sbFetch(
            `reports?reason=ilike.*${userId}*&status=eq.open&created_at=gte.${since}&select=id`
          );
          if (existing && existing.length) continue;
          const why = `PATTERN ALERT (AI): user ${userId} contacted ${contacts.size} different people in 24h` +
            (repeater ? `; repeated the same message across ${repeatChats} chats` : ``) +
            (spamHere ? `; latest chat scanned SPAM (score ${spamScore})` : ``) +
            (suspended ? ` [AUTO-SUSPENDED: definite scam pattern, awaiting appeal/admin review]` : ``) +
            `: ${reasons.join("; ") || "pattern threshold reached"}`;
          await sbFetch(`reports`, {
            method: "POST",
            body: JSON.stringify({
              reporter_id: counterpartyId,
              product_id: convo.product_id,
              reason: why.slice(0, 500),
            }),
          });
          patternAlerts.push({ user: userId, contacts: contacts.size, repeat_chats: repeatChats, suspended });
        }
      } catch (e) {
        console.error("pattern detection failed:", e);
      }
    }

    return Response.json({
      conversation_id: conversationId,
      message_count: messages.length,
      spam_score: spamScore,
      abuse_score: abuseScore,
      verdict,
      reasons,
      pattern_alerts: patternAlerts,
    }, { headers: corsHeaders });
  } catch (e) {
    console.error("check-chat failed:", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
});
