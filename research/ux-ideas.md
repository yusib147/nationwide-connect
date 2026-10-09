# Nationwide Connect — UX Research: 20 Patterns Worth Stealing

Researched 2026-10-08 from Jiji.ng, Jumia, Konga, eBay, Facebook Marketplace, OLX, Gumtree, Shopify stores, Amazon.
Stack constraint: static site + Supabase only. Ranked by impact per effort for a Nigerian classifieds marketplace.

---

## Ranked list

### 1. Share to WhatsApp button on every listing
- **Who does it best:** Jiji has generic share; nobody in Nigeria does a first-class WhatsApp share. WhatsApp is where Nigerian commerce actually happens.
- **Why:** One tap shares title + price + photo + link into a chat or status with prefilled text. Turns every buyer into a distributor. Viral loop for free.
- **Effort:** small (wa.me deep link, no backend).

### 2. Seller trust card visible on the listing card itself
- **Who does it best:** Gumtree (verification status upfront); eBay (feedback score next to every price). A classifieds design guide puts it bluntly: listing cards should show seller rating without tapping.
- **Why:** Trust is the #1 blocker in Nigerian P2P trade. Showing member-since + rating + verification on the card lets buyers pre-filter scammers before opening anything.
- **Effort:** small (read profiles row; UI only).

### 3. Tiered verified-seller badges + "verified only" filter
- **Who does it best:** Gumtree lets users opt to engage with verified users only (mobile, ID and email verified).
- **Why:** Bronze (email), Silver (phone), Gold (ID selfie). Gives honest sellers a visible edge and gives buyers a scam filter. Direct attack on Jiji's biggest complaint.
- **Effort:** medium (badges table + verification flow; ID check can start manual via WhatsApp photo review).

### 4. One-tap report listing flow
- **Who does it best:** Gumtree's Report feature; OLX/report is called "non-negotiable from day one" for classifieds MVPs.
- **Why:** Community policing scales trust without staff. Reason picker (scam, fake photo, sold already, wrong category) → auto-hide after N reports pending review.
- **Effort:** small (reports table + RLS; review queue can be a simple admin view).

### 5. In-chat trust header + negotiation quick-replies
- **Who does it best:** Facebook Marketplace (suggested questions like "Is this available?"); classifieds UX guides recommend showing both users' ratings in the chat header.
- **Why:** Nigerian buyers open with "is it available / last price" every time. Quick-reply chips ("Is this still available?", "What's your last price?", "Where is pickup?") cut friction; the header reminds both sides they're rated, which disciplines behavior.
- **Effort:** small (UI chips inserting canned text; header reads existing profile data).

### 6. Saved searches with new-listing alerts
- **Who does it best:** eBay ("Save this search" → email on new matches); MarketScout (saved searches + new-match alerts for Facebook Marketplace).
- **Why:** High-intent buyers (e.g. "Toyota Camry under 4M in Lagos") come back on their own when inventory appears. Retention without ad spend. eBay users report finding rare items months later via alerts.
- **Effort:** medium (saved_searches table; matching via pg_cron or edge function; deliver via web push or in-app inbox).

### 7. Watchlist with price-drop badges and alerts
- **Who does it best:** eBay watchlist; MarketScout highlights detected price drops; TagDrop-style trackers prove demand.
- **Why:** Watching is low-commitment intent. A "PRICE DROP ₦50,000" badge + alert converts watchers into buyers and rewards sellers who cut prices.
- **Effort:** medium (watchlist table + price_history table; compare on product update via trigger).

### 8. Recently viewed strip on Home
- **Who does it best:** Amazon and Jumia both resurface browsing history ("inspired by your browsing").
- **Why:** Mobile shoppers get interrupted constantly. A horizontal "Recently viewed" strip recovers abandoned sessions with zero effort from the user.
- **Effort:** small (localStorage, no backend).

### 9. Favorites (wishlist) with a real home in the Me tab
- **Who does it best:** Amazon wishlist; Jumia wishlist; classified app templates ship "smart wishlist for guests too".
- **Why:** Lets guests save without signing up (frictionless), then converts them at signup. Also feeds price-drop alerts later.
- **Effort:** small (localStorage for guests, favorites table for logged-in).

### 10. Seller response-time badge
- **Who does it best:** Facebook Marketplace surfaces responsiveness; Jumia scores sellers on response behavior internally.
- **Why:** "Typically replies within an hour" vs "Replies rarely" is brutally honest and pushes sellers to respond fast. Computed from actual message timestamps, can't be faked.
- **Effort:** small (aggregate messages.created_at per seller; cache on profile).

### 11. Structured "Still available?" availability ping
- **Who does it best:** Facebook Marketplace's one-tap "Is this available?" message.
- **Why:** Jiji drowns sellers in low-effort "is this available" chats (Nairaland sellers complain about window shoppers). A structured ping with a one-tap seller answer ("Yes, available" / "Sold") keeps it out of the chat thread and auto-marks stale listings.
- **Effort:** small (availability_pings table or a message type flag).

### 12. Swipeable photo gallery with pinch zoom
- **Who does it best:** ASOS/Shopify touch galleries (swipe, 44px targets); Letgo's visual-first cards.
- **Why:** For used goods, photos ARE the product page. Fullscreen swipe + zoom lets buyers inspect condition, which is the main trust hurdle for secondhand.
- **Effort:** small/medium (JS gallery; zoom via CSS transform).

### 13. Location radius filter ("within 10 km")
- **Who does it best:** Letgo and Gumtree are location-first; Gumtree partnered with a logistics platform for inter-city delivery quotes.
- **Why:** Lagos traffic makes distance decisive. "Near me" sorting beats city-wide lists for furniture, cars, bulky goods.
- **Effort:** medium (store lat/lng per listing; PostGIS or simple haversine in query; fallback to city filter).

### 14. Seller storefront page
- **Who does it best:** eBay seller pages; Jumia vendor stores.
- **Why:** Repeat sellers (furniture makers, phone dealers) get a mini-shop: all listings, ratings, join date, response stats. Turns sellers into invested store owners and gives buyers a browseable catalog.
- **Effort:** medium (route + query by seller_id; mostly UI).

### 15. Safety checklist card on product pages
- **Who does it best:** Facebook Marketplace safety guidance; Gumtree's safety-first positioning.
- **Why:** Collapsible card: meet in public, inspect before paying, never pay in advance, keep chat on-platform. Reduces scam success rate and positions Nationwide Connect as the safe marketplace.
- **Effort:** small (static UI component).

### 16. Listing completeness meter for sellers
- **Who does it best:** Jumia's seller education programs; Shopify listing-quality prompts.
- **Why:** "Add 3 more photos to sell 2x faster" / description length nudges. Better listings → more buyer confidence → more transactions. Coaches sellers at the moment of posting.
- **Effort:** small (client-side scoring UI).

### 17. Structured make-an-offer (negotiation with an amount)
- **Who does it best:** Dedicated classified apps ship "Make an Offer" systems; FB Marketplace negotiation happens in free text.
- **Why:** Haggling is core Nigerian commerce. A structured offer (₦ amount + expiry) that the seller can accept/counter/decline with one tap beats 20 back-and-forth messages and creates commitment.
- **Effort:** medium (offers table linked to conversation; accept/counter flow).

### 18. Smart search: recent searches, trending, typo tolerance
- **Who does it best:** Amazon's search handles vague queries well; eBay power users rely on saved/precise search.
- **Why:** Recent-search chips (one tap to re-run) and trending searches ("iPhone 13", "Camry") guide buyers; typo-tolerant matching (pg_trgm) catches "Infinix" misspellings common on Nigerian keyboards.
- **Effort:** medium (recent searches in localStorage; trending via query log table; pg_trgm extension for fuzzy match).

### 19. Unread badges + web push for new chat messages
- **Who does it best:** Gumtree sends push on every new message; FB Marketplace badges drive re-engagement.
- **Why:** Chat is worthless if sellers reply 6 hours later. Instant notification of buyer messages is the single biggest lever on successful deals.
- **Effort:** medium (Supabase Realtime for live badges; web push via service worker + edge function).

### 20. Bump / promote listing (monetization)
- **Who does it best:** Classified templates ship premium/featured/bump-up ads; Jiji sells premium placement.
- **Why:** Revenue from day one and sellers get visibility on demand. Our edge over Jiji: fair, cheap, transparent pricing (see Jiji weaknesses below).
- **Effort:** medium (promotions table + Paystack/Flutterwave payment link; no backend payment processing needed initially).

---

## Where Jiji is weakest (our attack surface)

1. **Trust deficit / scams.** Jiji sits at ~2.7 stars on review aggregators with ~40% of reviewers warning others off; fraud and fake listings dominate complaints. Gumtree's verified-only filter and eBay-style visible feedback scores are things Jiji never built. Verified badges + report flow + trust cards hit this directly.

2. **No buyer protection of any kind.** Konga runs a Buyer Protection program with instant refunds for eligible orders; Jumia has structured returns. Jiji is pure classifieds: if you're scammed, you're on your own. Even a lightweight "deal checklist + report + verified sellers" safety system is a differentiator.

3. **Predatory seller monetization.** Nigerian sellers on Nairaland report paying ₦360k+ for Jiji premium plans with zero sales to show for it. Expensive, opaque featured placement that doesn't convert. A cheap, transparent bump system (fixed naira price, visible boost duration) is both a revenue line and a recruiting message for sellers burned by Jiji.

4. **Dead-end chat.** Jiji's chat is basic text with no structure; sellers complain about "is this available" spam from window shoppers. Facebook Marketplace's suggested questions and structured availability pings solve exactly this. Faster seller responses → more closed deals.

5. **Zero price intelligence for buyers.** eBay has saved searches, watchlists and price alerts; third-party tools exist purely to add price-drop detection to Facebook Marketplace. Jiji offers none of it. Saved searches + watchlist + price-drop badges give bargain hunters a reason to return daily.
