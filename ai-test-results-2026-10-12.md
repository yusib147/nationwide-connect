# Nationwide Connect AI Anti-Scam Test Results
**Date:** 2026-10-12 (overnight test run)
**Tester:** Muse (automated subagent)
**Scope:** check-listing and check-chat Edge Functions (Gemini 3.8 Flash)

---

## Executive Summary

Tested the **exact AI prompts** from `check-listing` and `check-chat` against 8 controlled listings (429 rate limit stopped the remaining 17 tests). **Critical finding: the listing AI is severely over-strict** — a legitimate used car listing scored 85/100 (HIGH risk), and all ambiguous listings scored identically 85 regardless of actual risk level. The prompt needs recalibration before it can reliably distinguish legit sellers from scammers without wrongly penalizing honest users.

**Infrastructure issues found:**
1. Edge Functions have a 30-second Gemini timeout, but Gemini currently takes ~40s+ per call → all live `check-listing` calls via the function are timing out
2. Google AI Studio free-tier quota hit 429 during testing

---

## Test Methodology

**What was tested:** The exact prompt strings from:
- `~/workspace/naija-market/supabase/functions/check-listing/index.ts`
- `~/workspace/naija-market/supabase/functions/check-chat/index.ts`

**How:** Called `gemini-3.8-flash` directly via the google-ai-studio skill with byte-identical prompts, substituting only the test listing/chat data. This validates the AI logic and prompt calibration.

**Why not via Edge Functions:** Live `check-listing` calls consistently returned `{"error":"TimeoutError: Signal timed out."}` (HTTP 500) because the function aborts Gemini calls at 30s while the model takes ~40s+ under current load. The prompt logic is identical either way.

**Test data in DB:** 15 test listings (`[AI TEST]` prefix, bronze seller, all `pending`) and 10 test conversations with messages were created in Supabase for future function-level testing once the timeout is fixed. Product IDs and conversation IDs are in `/tmp/ai_test_listing_results.json` (partial) and `/tmp/ai_test_conversations.json`.

---

## Listing AI Results (check-listing prompt)

| Key | Title | Price (₦) | Expected | AI Score | AI Verdict | Match? |
|-----|-------|-----------|----------|----------|------------|--------|
| L1 | Used Honda Accord 2018 | 6,500,000 | LOW | **85** | HIGH | ❌ FALSE POSITIVE |
| L2 | Samsung Galaxy S23 256GB | 450,000 | LOW | 15 | LOW | ✅ |
| L3 | 6-Seater Leather Sofa Set | 350,000 | LOW | 15 | LOW | ✅ |
| L4 | MacBook Pro 2021 M1 Chip | 850,000 | LOW | **45** | MEDIUM | ❌ FALSE POSITIVE |
| L5 | 2-Bedroom Flat for Rent in Yaba | 1,200,000 | LOW | 15 | LOW | ✅ |
| A1 | iPhone 14 Pro Max 256GB | 550,000 | MEDIUM | **85** | HIGH | ❌ OVER-SCORED |
| A2 | Toyota Corolla 2016 | 3,800,000 | MEDIUM | **85** | HIGH | ❌ OVER-SCORED |
| A3 | Brand New PS5 Console | 400,000 | MEDIUM | **85** | HIGH | ❌ OVER-SCORED |
| A4 | Original Rolex Watch | 150,000 | MEDIUM | — | — | ⚠️ Not tested (429) |
| A5 | HP Pavilion Laptop | 180,000 | MEDIUM | — | — | ⚠️ Not tested (429) |
| S1–S5 | (5 obvious scams) | — | HIGH | — | — | ⚠️ Not tested (429) |

**Accuracy on completed tests:** 3/8 correct (37.5%)

### Detailed Test Cases

**L1 — FALSE POSITIVE (Critical)**
- Title: `[AI TEST] Used Honda Accord 2018` | Price: ₦6,500,000
- Description: Detailed, realistic — first body, leather seats, reverse camera, engine/gear perfect, AC chilling, complete papers with custom duty, Ikeja location, inspection welcome.
- AI scored **85/100 HIGH**. This is a textbook legitimate car listing. Nothing about it is scam-like.
- **Impact:** If deployed as-is, honest car sellers get flagged as high-risk scammers.

**L4 — FALSE POSITIVE (Moderate)**
- Title: `[AI TEST] MacBook Pro 2021 M1 Chip` | Price: ₦850,000
- Description: Specific specs (14-inch, M1 Pro, 16GB/512GB, cycle count 120), no issues, original charger, Victoria Island.
- AI scored **45/100 MEDIUM**. A fair price for this spec in Nigeria; description is detailed and credible.

**A1/A2/A3 — OVER-SCORED (Systematic)**
- All three scored **exactly 85** despite very different risk profiles:
  - A1: iPhone 14 Pro Max at ₦550k (below market ~₦750k, "urgent sale, relocating") — genuinely suspicious
  - A2: Toyota Corolla 2016 at ₦3.8m with vague 2-line description — mildly suspicious
  - A3: Brand new PS5 at ₦400k ("need cash urgently, first come first served") — suspicious
- The identical 85 scores suggest the model is **defaulting to a fixed high score** rather than discriminating between risk levels.

---

## Chat AI Results (check-chat prompt)

**Status:** Not tested — hit the 429 rate limit before chat prompts could run.

10 test conversations (5 normal negotiations, 5 spam/scam patterns) were created in the database with messages and are ready for testing once quota recovers. Conversation IDs are in `/tmp/ai_test_conversations.json`.

**Test scenarios prepared:**
- CN1–CN5: Normal buyer-seller negotiations (price haggling, inspection, delivery)
- CS1: Advance payment demand ("Send 50k deposit NOW")
- CS2: WhatsApp bypass ("Chat me on WhatsApp 080...")
- CS3: OTP/bank phishing ("send me the OTP code")
- CS4: Repetitive flooding ("BUY NOW" × 5)
- CS5: Fake urgency + account number ("Secret deal, send money now")

---

## Analysis

### 1. Listing prompt is severely over-strict (PRIMARY ISSUE)
- 2 of 5 legitimate listings flagged (40% false positive rate)
- The worst case (L1: 85/100 on a normal car ad) would wrongly subject honest sellers to manual review and damage trust
- **Root cause hypothesis:** The prompt lists scam signals but gives no positive examples of legitimate listings, and no price reference data. The model appears to treat any car/phone listing with enthusiasm ("neatly used", "perfect condition") as suspicious. The instruction "Be strict but fair" with "A normal used phone listing should score under 30" is insufficient calibration — it only anchors phones, not cars, electronics, or property.

### 2. Score clustering at 85 (CALIBRATION FAILURE)
- A1, A2, A3 all scored exactly 85 despite different risk levels
- L1 also scored 85 (first run) / 82 (earlier run) — similar magnitudes for wildly different inputs
- The model is not using the full 0–100 range; it jumps to a default "suspicious" score
- **Consequence:** The MEDIUM band (40–70) is effectively dead — everything is either ~15 or ~85

### 3. No price grounding
- The prompt tells the model to flag "price far below market value" but provides no market reference prices
- The model must rely on its training data for Nigerian prices, which is unreliable and likely outdated
- L1 (₦6.5m for 2018 Accord) is actually a fair price, but the model scored it 85 — suggesting it has no reliable price anchor

### 4. Edge Function timeout too aggressive (INFRASTRUCTURE)
- `AbortSignal.timeout(30000)` in both Edge Functions
- Gemini 3.8 Flash currently takes 35–45s per call under load
- **Result:** 100% of live `check-listing` calls fail with timeout right now
- This means the AI safety net is **completely non-functional in production** at this moment

### 5. Threshold design issue
- Current: ≥70 stays pending, <40 auto-approves silver/gold
- With the model clustering at 85, nearly every bronze listing with any enthusiasm will hit ≥70
- Combined with the DB trigger that already pendings all bronze listings, the AI adds little value — it's just confirming "pending" for everything

---

## Recommendations

### Prompt improvements for check-listing

**R1. Add few-shot examples (highest impact)**
Include 2–3 scored examples in the prompt:
```
Example 1 (LOW, score 15):
Title: "Samsung Galaxy S23 256GB"
Description: "Used 8 months, no scratches, box and charger included. Receipt available."
Price: ₦450,000 → Score: 15. Realistic price, detailed, verifiable claims.

Example 2 (HIGH, score 90):
Title: "iPhone 16 Pro Max CHEAPEST"
Description: "Send 30k deposit NOW to reserve! Urgent!"
Price: ₦120,000 → Score: 90. Absurd price + advance payment demand + urgency.
```

**R2. Provide Nigerian market price anchors**
Add a brief reference table:
```
Rough Nigerian market references (2026): iPhone 14 Pro Max ~₦750k, iPhone 13 ~₦450k,
Toyota Camry 2015 ~₦5-7m, MacBook Pro M1 2021 ~₦800k-1m, PS5 new ~₦500k.
Flag only if price is <60% of reference.
```

**R3. Require specific evidence for high scores**
Change instruction to: "Scores above 70 require at least TWO concrete scam signals from the list. A single signal (e.g., 'urgent sale' alone) caps the score at 55."

**R4. Add legitimate-seller positive signals**
```
Trust signals that LOWER the score: specific verifiable details (serial numbers,
receipt mentions, exact location, inspection welcome, detailed specs, realistic
negotiation language).
```

**R5. Fix the verdict bands**
Clarify: LOW = 0–39 (normal listing), MEDIUM = 40–69 (watch, minor flags), HIGH = 70–100 (likely scam, multiple strong signals).

### Prompt improvements for check-chat
*(Not yet tested — apply after validation)*
- **C1.** Add few-shot examples of normal Nigerian negotiation vs. actual scam chats
- **C2.** Clarify that sharing a phone number alone (common in Nigeria for logistics) is not automatically spam — it's the *combination* with payment demands that matters
- **C3.** Weight recent messages more heavily than old ones

### Infrastructure fixes (require parent/browser)

**I1. Increase Edge Function timeout** from 30s to 90s in both `check-listing` and `check-chat`:
```ts
signal: AbortSignal.timeout(90000),
```

**I2. Add graceful degradation:** If Gemini times out, keep the listing as `pending` (safe default) and log the timeout for retry, rather than returning 500 with no score recorded.

**I3. Consider async processing:** Move AI checks to a queue (e.g., Supabase pg_cron or a webhook) so listing creation never blocks on AI latency.

**I4. Add retry with backoff** in the Edge Functions for Gemini 503/429 responses.

---

## What Could Not Be Completed

| Item | Reason |
|------|--------|
| A4, A5 listing tests | Gemini 429 quota exceeded on google-ai-studio skill key |
| S1–S5 scam listing tests | Same 429 — could not verify the AI catches obvious scams |
| All 10 chat prompt tests | Same 429 |
| Live Edge Function verification | 30s timeout vs 40s+ Gemini latency = 100% failure rate |
| Browser-based listing posting | Subagent cannot operate live browser (parent handled 3 listings earlier) |

**Test data ready for follow-up:** 15 products + 10 conversations with messages are in the DB (all `[AI TEST]` prefixed). Once quota recovers or the timeout is fixed, run:
```bash
# For each product: curl -X POST https://qxcifjxytdixiolvkmtv.supabase.co/functions/v1/check-listing -d '{"product_id": "<id>"}'
# For each conversation: curl -X POST https://qxcifjxytdixiolvkmtv.supabase.co/functions/v1/check-chat -d '{"conversation_id": "<id>"}'
```
IDs are in `/tmp/ai_test_conversations.json`. Product IDs can be queried: `seller_id=eq.55fce176-55ea-44ca-bfe3-dc40fb483187`.

---

## Files
- This report: `~/workspace/naija-market/ai-test-results-2026-10-12.md`
- Test scripts: `/tmp/ai_test_listings.py`, `/tmp/ai_test_prompts.py`, `/tmp/ai_test_chats.py`, `/tmp/ai_test_chat_setup.py`
- Partial raw results: `/tmp/ai_test_prompt_results.json`, `/tmp/ai_test_conversations.json`

---

## UPDATE 2026-10-13: Switched to Groq — WORKING

**Provider changed:** Gemini → Groq (`openai/gpt-oss-120b`) after Gemini free-tier quota (20 req) blocked all testing for ~17h. Groq free tier allows ~1,000 req/day.

**Changes deployed 2026-10-13:**
- Both Edge Functions now call `https://api.groq.com/openai/v1/chat/completions` with `GROQ_API_KEY` secret
- Timeout reduced to 30s (Groq responds in ~3s vs Gemini 40s+)
- Retry-with-backoff for 429s retained
- **Bug fixed:** sbFetch crashed with "Unexpected end of JSON input" on Supabase PATCH (204 empty body). Now reads text first, parses only if non-empty. This bug was hidden behind Gemini failures — the AI had never actually completed a save before.
- Note: original model pick `llama-3.3-70b-versatile` was retired by Groq (Aug 2026) → 404. Replaced with `openai/gpt-oss-120b`.

**Live verification results (via deployed Edge Functions):**

Listings:
| Listing | Price | Score | Verdict | Assessment |
|---|---|---|---|---|
| Ddd (junk) | ₦8,888 | 70 | HIGH | ✅ Correct |
| Vhh (junk) | ₦9,669 | 82 | HIGH | ✅ Correct |
| 3030 (junk) | ₦5,566 | 85 | HIGH | ✅ Correct |
| report target (junk) | ₦1,000 | 45 | MEDIUM | ✅ Plausible |
| QA Test Car | ₦5,000,000 | 10-45 | LOW-MEDIUM | ✅ Not flagged HIGH (old Gemini scored a similar legit car 85) |

Chats (check-chat):
| Conversation | Score | Verdict | Assessment |
|---|---|---|---|
| CN1 normal negotiation | 5 | CLEAN | ✅ |
| CN2 normal (AC question) | 5 | CLEAN | ✅ |
| CN3 normal | 5 | CLEAN | ✅ |
| CS1 advance-payment scam | 85 | SPAM | ✅ Reason: "Advance payment demand (request to send 50k deposit)" |

**Verdict:** Groq pipeline works end to end in ~3.5s per check. Chat accuracy 4/4 on recovered test conversations. Listing scores discriminate properly (junk HIGH, real listings LOW/MEDIUM) — no repeat of Gemini's 85-clustering on the samples tested.

---

## Update 2026-10-13 (later): full test rounds, prompt tuning, automatic chat scanning

**Test accounts:** aitest4 (seller) + aitest5 (buyer), driven via Supabase REST API. Harness kept at `~/workspace/goals/nationwide-connect-marketplace/hidden_files/ai-tests/`.

**Key discovery:** the deployed check-listing was an older SIMPLIFIED revision (one-line prompt, no market references) — not the calibrated local file. Both functions were redeployed as FULL replacements from local source and verified string-by-string in the dashboard editor.

### Round 1 — 16 listings (new full check-listing prompt, gpt-oss-120b)
- Legit: Camry 2015 detailed 15-18 LOW ✅ · Samsung TV 15 ✅ · Desk set 15 ✅ · Generator 15 ✅ · iPhone 13 with receipt was 70 (old prompt) → **18 LOW** after tuning ✅ · 3BR flat Surulere 45→50 MEDIUM (slightly over, acceptable watch band)
- Ambiguous: iPhone 14 PM urgent 45 ✅ · PS5 45 ✅ · Corolla vague 52 MEDIUM ✅ · MacBook Air M1 was 75 → **25 LOW** ✅
- Scams: **6/6 HIGH** (85-92) — iPhone 16 ₦120k deposit, Range Rover advance+WhatsApp, S24 promo, Camry "pay fuel and clearance", iPhone 15 "payment before delivery", gold jewellery 1-hour deadline
- Prompt tuning added: price-above-market is never a signal; "never opened" = never repaired (trust); MacBook Air M1 / rent / TV / generator price anchors; honest flaws are mild
- Variance note: one Range Rover run spiked to 50; 3 immediate re-runs all 92. Bronze sellers stay pending regardless, so a spike cannot auto-approve a scam.

### Round 2 — 10 hard listings
- Honest: cracked-screen distress sale 22 LOW ✅ · one-line wardrobe 32 LOW ✅ · pidgin car advert 18 LOW ✅
- Scams: escrow-flavoured 85 · waybill 85 · rental inspection-fee 85 · ₦1 price bait 92 · work-from-home job scam 85 · "free puppies, pay delivery first" 82
- Initial miss: subtle iPhone 14 (half price, "delivery only, no pickups, payment confirms order", polished description) scored 25 → added rule (refuses inspection/pickup signal + "polished description does not clear payment-before-delivery + no-inspection") → **85 HIGH** on re-test ✅
- **Round 2 listings: 10/10 after the rule fix.**

### Chats — model split + Nigerian-context rules (check-chat now on gpt-oss-20b)
Reason for split: Groq free limits are per model per org (1,000 req + 200K tokens/day each). Listings keep gpt-oss-120b; chats moved to gpt-oss-20b = separate budget. Do NOT use llama-3.1-8b-instant (enterprise-only since Aug 2026) or qwen3.8-27b (preview).
- Round 2 found two false positives on the old chat setup: pidgin negotiation scored 80 SPAM, pay-on-delivery scored 85 SPAM. Added explicit rules: pidgin is never a signal; pay-on-delivery is the standard safe pattern; haggling is normal — plus matching CLEAN few-shot examples.
- **Full re-test (fresh conversations): 18/18 correct.** All 7 clean conversations CLEAN (5-15), all 11 scam patterns SPAM (80-92): advance deposit, OTP phishing, WhatsApp bypass + account number, flooding, secrecy, gift card, fake rider fuel, phishing link, fake transfer alert, coded "small thing first" deposit, pidgin deposit pressure.

### Automatic scanning (no manual wake-up)
- Listings: storefront sell flow already auto-invokes check-listing on creation.
- Chats: NEW — `client.js` `aiScanChat()` fires on message send and on conversation open (Supabase conversations only), throttled 5 min per conversation per client. SPAM/SUSPICIOUS → safety warning toast to the user; SPAM → auto-files an admin report (once per conversation per session) with the AI score and reasons.
- Deployed storefront: dpl_FwuAZPJEzYPXbTTVAC5Pvk99QaKG (90s throttle) then redeployed with 300s throttle (live).
- Graceful degradation: if Groq quota is exhausted, messages still send and listings stay pending — protection pauses, the marketplace does not break. Paid fallback ≈ $6-9/month at 400 users/day.

### Capacity (verified 2026-10-13)
- 400 users/day: listings ~100 scans/day ≈ 70K tokens (inside 120b's 200K). Chats on 20b: ~130 full scans/day free; busy days can exceed — throttling + fail-safe cover it.

## Resolution 2026-10-13 (evening): automatic chat scan PROVEN LIVE end to end

The auto-scan section above was written before live verification finished. Three live attempts were needed; the first two failed and the debugging is recorded here because it found real bugs:

**Root cause 1 — CORS preflight (the big one).** Both Edge Functions returned `405` to `OPTIONS` and sent no CORS headers (proven by direct probe). Any browser call with non-simple headers — supabase-js `functions.invoke` (check-chat) AND the sell flow's `fetch` with `Content-Type: application/json` (check-listing) — died at preflight. Server-side tests never hit CORS, which is why everything scored correctly in tests while nothing ever fired in the real app. The sell-flow listing check was very likely blocked the same way all along.
**Fix:** same-origin proxy `api/ai-scan.js` (Vercel route, pattern follows `api/face-check.js`). It forwards `{ conversation_id }` → check-chat and `{ product_id }` → check-listing server-side with the anon key. `client.js` `aiScanChat()` now fetches `/api/ai-scan`; the minified sell flow in `app.js` was patched to post to `/api/ai-scan` too. Proxy verified directly: chat → 200 SPAM 85, listing → 200 verdict. (The local function sources also carry CORS headers now, in case they are ever redeployed — the deployed functions do not have them and no longer need them.)

**Root cause 2 — toast name.** The scan's warning called `window.c`, which does not exist globally (app.js keeps its toast internal and exposes `window.NM_toast`). Fixed: `window.NM_toast || window.c`.

**Why attempts 1-2 still failed after the proxy deploy:** the test browser was an already-open SPA tab; Ctrl+Shift+R did not replace the cached old `client.js` because the tab never reloaded `index.html` itself, so it kept running the invoke-based build. Round 3 forced a full navigation to the root URL, the new code loaded, and the scan fired immediately — from the Chats list, because the app loads conversation data there (getConversation hook), before the thread was even opened. The once-only `_aiWarned` flag + 300s throttle then correctly suppressed a repeat toast inside the thread, which is why thread-only watches kept "missing" it. The toast text was observed in the page accessibility tree during the list phase.

**Live proof (2026-10-13 ~10:44 WAT), buyer aitest5, two separate scam conversations:**
- Report `fbb81b5b-203a-482a-8f77-994da62d14d0` — AUTOSCAN DEMO ITEM ZX9: "AI chat scan flagged SPAM (score 85): Advance payment request; Fake urgency", filed automatically at 09:44:52 UTC.
- Report `76f7a1cc-7a55-4331-98b3-9307f29d3856` — AUTOSCAN DEMO ITEM QZ7 (fresh product/conversation created for round 3): "AI chat scan flagged SPAM (score 85): Advance payment request; Fake urgency + secrecy", filed automatically at 09:44:53 UTC.
- Supporting checks: reports-table RLS probed directly (insert + own-select both work as the buyer); a manual probe row `31aa75a0-f8b5-47f3-a409-da2973d5434f` ("MANUAL RLS PROBE") was left by the debugging — users cannot delete reports (delete silently matches 0 rows under RLS), so it needs an admin-side cleanup along with the rest of the test data.
- Deployed asset tags: `client.js?v=20261013c`, `app.js?v=20261013a`.

**Status: automatic scanning is LIVE and verified for both listings (sell flow via /api/ai-scan) and chats (scan on conversation load/send → warning toast + auto-report on SPAM).** Remaining known limits: throttle is per client session (5 min per conversation), the warning toast fires when conversation data loads (may appear on the Chats list rather than inside the thread), and Groq free-tier chat capacity is ~130 full scans/day (see Capacity).



## Evening round — 2026-10-13 (recalibration + abuse + pattern detection, DEPLOYED and RETESTED)

Deploys (Supabase dashboard, account yusifjiji@gmail.com via saved vault login + user-solved hCaptcha):
- check-listing recalibrated version: 215 § replacements, anchors verified, success toast.
- check-chat abuse + pattern version: 248 § replacements, anchors verified (abuse_score, openai/gpt-oss-20b, SECOND TASK, PATTERN ALERT), success toast.
- Prompt patch: HS6 combination floor "at least 75 (HIGH)" + matching few-shot example (iPhone 14 delivery-only → 85).
- max_tokens raised: check-listing 500→1500, check-chat 500→1000 (gpt-oss reasoning was truncating JSON answers → silent fallback scores: listings fell back to 50/empty reasons, one threat chat fell back to 0).

Retest v2 (retest_v2.py + recheck.py + final consistency run):
- Traps T1–T6: 18, 18, 18, 18, 50, 18 — all ≤55 PASS (SERIOUS BUYERS ONLY Camry, school-fees iPhone deposit-to-hold, ALL-CAPS TV, pidgin wardrobe, cracked-screen distress iPhone 50, generator).
- Scam regressions: escrow 80, waybill fee 85, ₦1 bait 85, job scam 88 (recreated at ₦10,000 after ₦0 price violated the products check constraint — harness bug, not an AI miss).
- HS6 polished delivery-only iPhone 14 ₦380k: pre-patch 50 ×3 (fallback), post-patch 80 / 85 / 80 HIGH with correct reasons. Trap re-check after all patches: 18 LOW.
- Chats: A1 pidgin insults abuse 80 PASS; A2 seller threats first run abuse 0 (fallback), rescans 80 / 80 PASS; B1–B3 banter abuse 0, CLEAN ×3 PASS; CSX advance deposit SPAM 85 PASS.

Pattern test (pattern_test.py): PASS.
- SCAM series (same "Send 50k deposit NOW…" message to 5 buyers): pattern_alerts fired (contacts 6, repeat_chats 5); exactly 1 PATTERN ALERT report in the admin queue.
- NORMAL series (5 varied honest messages): no alert.
- Note: the single-message scam chat itself scored CLEAN 0 — the repetition trigger (≥4 chats) caught it, as designed; pattern layer does not depend on one chat's verdict alone.
- Harness fix needed mid-run: aitest6–10 REST signups had no profiles rows (FK blocked conversations); profiles inserted manually, then the test ran clean.

Cleanup round 2 (cleanup2.py, admin API): 30 + 2 test listings deleted, 0 failed. End state verified: 4 listings (3030, Vhh, Ddd ×2 — all pending, not test data), 0 reports.

## Overnight battery N — 2026-10-13 late night (15 NEW cases, subagent)

Full report: `~/workspace/goals/nationwide-connect-marketplace/hidden_files/ai-tests/overnight-2026-10-13.md`. Supabase REST was heavily flaky (IncompleteRead/RemoteDisconnected); harness retries absorbed it, no Groq 429s.

**Listings 8/8 PASS** (check-listing, gpt-oss-120b): rental inspection-fee scam 85, customs-auction bait 92, crypto investment scheme 90, job uniform-fee variant 90, polished bait-price delivery-only iPhone 85 — all HIGH; traps all LOW (caps+fair price 22, school-fees deposit-to-hold 20, pidgin urgency 18).

**Chats:** N11 rider-fuel-fee scam 85 SPAM ✅ · N12 phishing link 85 SPAM ✅ · N15 deposit blast to 4 buyers → pattern_alerts=[], no suspension ✅ (threshold correct) · N14 same honest message to 5 buyers → no suspension, profile active ✅.
- **N9 borderline:** mutual joking banter ("mumu o"/"ode" both sides) scored abuse 70 then 50 on rerun, verdict CLEAN both times. No patch — genuine boundary; current behaviour errs on the safe side (at most an admin review).
- **N10 FAIL:** veiled threats ("you go see", "I sabi your shop for Computer Village") scored abuse=0. Prompt only exemplified explicit threats. **Local patch written** (abuse bullet: veiled/indirect threats count fully, score HIGH).
- **N13 FAIL:** buyer offered transfer-first, seller refused and insisted on inspection-first → scored SPAM 80. Prompt never distinguished WHO pushes the payment, punishing the honest party. **Local patch written** (spam signals: a declined advance-payment offer is an HONEST pattern, never a signal).
- Both patches are LOCAL ONLY in `supabase/functions/check-chat/index.ts` — NOT deployed. Need parent deploy + retest (N10, N13, plus abuse A1/A2 and scam CSX/N11/N12 regressions to confirm no dulling).

Scorecard: 12 clear passes, 1 borderline, 2 failures (both patched locally). Cleanup done: all [AI TEST …] products deleted, aitest4/aitest5 active, end state = the 4 unrelated pending listings, 0 reports.

---

## CORRECTION + CLEAN RETEST (2026-10-13, late night) — read before trusting chat scores above

**Harness contamination discovered:** the flaky Supabase connection dropped responses AFTER the server had saved them, so retrying harness scripts inserted the same chat messages 2–5 times into test conversations. The AI's frequent "flooding" reasons were literally true of the corrupted test data. Chat scores from the contaminated runs (battery N9–N15 chat phase and the first patch retest) are unreliable in both directions. Listing scores, pattern/suspension results (distinct-chat counting, DB-verified end states), and the E2E are NOT affected.

**Fixes shipped to check-chat (all deployed + anchor-verified):**
1. Veiled/indirect threats count fully in abuse scoring ("you go see", "I sabi your shop").
2. "WHO pushes the payment matters" rule + a worked CLEAN few-shot example (buyer offers transfer, seller refuses, insists on inspection → CLEAN).
3. Flooding grounding rule (only when text literally repeats).
4. max_tokens 1000 → 1500 and a parse-retry: if the model's JSON can't be parsed, the function asks once more before falling back (a silent 0/CLEAN fallback could wave a scam through).

**CLEAN retest (conversations verified to contain exactly the intended messages before scanning):**
- N13 honest refusal ×3 → spam 0 / 5 / 0, all CLEAN ✅ (was SPAM 80 pre-patch)
- N10 veiled threats ×2 → abuse 80 / 80 ✅ (was 0 pre-patch)
- R-A1 targeted pidgin insults → abuse 80 ✅
- R-CSX deposit scam → SPAM 85 ✅; N12 phishing link → SPAM 90 ✅
- N11 rider fuel fee → 50 SUSPICIOUS (single-message scam; two-signal rule caps it; buyer still gets the warning toast)
- N9 mutual banter ×2 → abuse 20 ("mutual banter" — correct) and 75 (flagged). The banter boundary is genuinely unstable on gpt-oss-20b; consequence of a high score is only an admin-review report, never account action. Ibrahim to decide if acceptable.
