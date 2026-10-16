# Jiji category organisation — replication spec for Nationwide Connect
Researched 2026-10-14 ~09:05 WAT via live logged-out read of https://www.jiji.ng/ (desktop).
Status: top-level taxonomy + 6 subcategory lists + all layout/URL patterns VERIFIED.
Gap: subcategory lists for 11 top-level categories still to capture (method documented in §5).

Reference screenshots (live capture, desktop):
- sandbox://workspace/user/media_library/browser_screenshots/0d/0d50df6cfee6fcb4454fd1e191e56f96f8f40c1c7051a9f7faa50c5fe8bcecb0.png
- sandbox://workspace/user/media_library/browser_screenshots/9b/9bc38e04f82db21306513a1b66d4c15f87398018b68633e9518287f8815178d1.png
- sandbox://workspace/user/media_library/browser_screenshots/01/012a139a6902b373c6ccf71d8a64ae225751fb22d08e1b94ffa8a6f43c2d944c.png

## 1. Top-level categories (17, exact display order)
Each row: icon + name + live ad count + chevron.
1. Vehicles
2. Property
3. Phones & Tablets
4. Electronics
5. Home, Furniture & Appliances
6. Fashion
7. Beauty & Personal Care
8. Services
9. Repair & Construction
10. Commercial Equipment & Tools
11. Leisure & Activities
12. Babies & Kids
13. Food, Agriculture & Farming
14. Animals & Pets
15. Jobs
16. Seeking Work - CVs
17. Business & Industry

Note: a "Trending" label appears above the list on some loads — it is a promoted-ads feed, not a category.

## 2. Subcategory lists (VERIFIED, exact names, display order)
All show icon + name + ad count. No grouping headings inside a category.

**Vehicles (9):** Vehicle Parts & Accessories, Cars, Motorcycles & Scooters, Buses & Microbuses,
Trucks & Trailers, Construction & Heavy Machinery, Watercraft & Boats, Personal Mobility, Car Services.

**Phones & Tablets (5):** Mobile Phones, Accessories for Phones & Tablets, Smart Watches, Tablets, Headphones.

**Electronics (15):** Laptops & Computers, TV & Video Equipment, Video Game Consoles, Audio & Music Equipment,
Headphones, Photo & Video Cameras, Security & Surveillance, Networking Products, Printers & Scanners,
Computer Monitors, Computer Hardware, Computer Accessories, Accessories & Supplies for Electronics,
Video Games, Software.
Quirk: "Headphones" exists under BOTH Phones & Tablets and Electronics — replicate as-is.

**Home, Furniture & Appliances (9):** Furniture, Lighting, Storage & Organization, Home Accessories,
Home Appliances, Kitchen Appliances, Kitchenware & Cookware, Household Chemicals, Garden Supplies.

**Fashion (3):** Women's Fashion, Men's Fashion, Baby&Kids' Fashion.

**Services (26)** (from Jiji's post-ad category index, cross-checked naming style):
Building & Trades Services, Car Services, Computer & IT Services, Repair Services, Cleaning Services,
Printing Services, Manufacturing Services, Logistics Services, Legal Services, Tax & Financial Services,
Recruitment Services, Rental Services, Chauffeur & Airport Transfer Services, Travel Agents & Tours,
Classes & Courses, Child Care & Education Services, Health & Beauty Services, Fitness & Personal Training Services,
Party, Catering & Event Services, DJ & Entertainment Services, Wedding Venues & Services,
Photography & Video Services, Landscaping & Gardening Services, Pet Services, Other Services.

## 3. Layout patterns to replicate
- **Homepage category nav (desktop):** left sidebar list; each row = icon, name, ad count, ">" chevron.
  Hovering a row opens a flyout panel to its right with subcategory tiles (icon + name + ad count)
  in one multi-column panel. Clicking the category name goes to its landing page.
- **NM mobile equivalent:** keep the existing drill-down (cat-list → subcat list with counts) —
  the flyout CONTENT is what matters for "one tap away", and NM already renders per-subcategory counts.
- **Category landing page:** breadcrumb Home / {Category}; LEFT filter panel = Categories
  (first ~4 subcats + "Show all N" expander), Location (All Nigeria), Price (min/max inputs + preset
  ranges), Popular Filters (checkboxes with counts), then attribute sections (Make with counts,
  Year, Condition, Transmission, …). Main column: H1 "{Category} in Nigeria", price-range pill
  buttons, brand shortcut icons, Sort, grid/list toggle. Product cards: photo with badges
  (Verified ID, "N+ YEARS ON JIJI", tier badges), bold price, title, snippet, condition, location.
- **Deeper refinement:** formal taxonomy is only 2 levels; deeper pages are attribute facets with
  their own URLs (e.g. /cars/toyota, /cars/toyota-camry). Breadcrumbs expose the chain:
  All ads / Vehicles / Cars / Sedans / Toyota Cars / Toyota Camry / Toyota Camry 2016.

## 4. URL patterns (observed, not guessed)
- Top-level: https://jiji.ng/{site-defined-slug} — slugs NOT always predictable from the display name:
  /vehicles, /mobile-phones-tablets (="Phones & Tablets"), /electronics,
  /home-garden (="Home, Furniture & Appliances"), /fashion-and-beauty (="Fashion").
- Subcategory: same /{slug} shape: /cars, /motorcycles-and-scooters.
- Facets: /cars/toyota (make), /cars/toyota-camry (make+model), /29-sedans (numeric-id + slug).
- Product: /{area-slug}/{subcategory-slug}/{title-slug}-{randomID}.html
- Seller shop: /shop/{seller-slug} (shows seller ad count + listing grid).

## 5. GAP — 11 subcategory lists still to capture
Property, Beauty & Personal Care, Repair & Construction, Commercial Equipment & Tools,
Leisure & Activities, Babies & Kids, Food, Agriculture & Farming, Animals & Pets,
Jobs, Seeking Work - CVs, Business & Industry.
Capture method (10 min in a live browser): open www.jiji.ng homepage, hover each top-level
category row in the left sidebar, read the flyout panel's subcategory tiles (icon + name + count).
Do NOT guess /{slug} URLs — slugs are site-defined (see §4). Mobile layout was not verifiable
(responsive single URL; m.jiji.ng does not exist) — organisation, not mobile chrome, is what we replicate.

## 6. Mapping: current NM taxonomy → Jiji
Current `window.NM_SUBCATS` keys in ~/workspace/naija-market/index.html (line 684):
- vehicles → keep key, REPLACE subcats with Jiji's 9 (§2).
- phones ("Phones and Tablets") → REPLACE subcats with Jiji's 5 (§2).
- electronics → REPLACE subcats with Jiji's 15 (§2).
- furniture ("Home, Furniture & Appliances" display) → REPLACE subcats with Jiji's 9 (§2).
- fashion → REPLACE subcats with Jiji's 3 (§2). (NM's current 10 fashion subcats are finer-grained;
  Jiji's exact list wins per the "replicate exactly" order — the deeper detail can return later as facets.)
- property → keep key, subcats = §5 capture.
- services → REPLACE subcats with Jiji's 26 (§2).
- ADD 10 new top-level keys: beauty ("Beauty & Personal Care"), repair ("Repair & Construction"),
  commercial ("Commercial Equipment & Tools"), leisure ("Leisure & Activities"),
  babies ("Babies & Kids"), food ("Food, Agriculture & Farming"), animals ("Animals & Pets"),
  jobs ("Jobs"), seeking ("Seeking Work - CVs"), business ("Business & Industry") — subcats = §5 capture.
Implementation notes:
- `NM_SUBCATS` drives BOTH the browse drill-down AND the sell form's category/subcategory selects —
  one edit updates both.
- Existing listings store `category` (key) and `subcategory` (name string). Renamed subcategories
  will orphan old listings' subcategory strings → include a one-time mapping of old → new names
  (e.g. "Sofas & Couches" → "Furniture") or they silently fall out of subcat filters.
- Keep NM's per-subcategory live counts UI (Jiji shows counts everywhere; NM already does).

## 7. "More from this seller" on the product page (Ibrahim's order 2026-10-14 08:36 WAT)
What Jiji actually does: NO same-seller section on the product page. The right-hand "Seller's information"
panel shows seller name (link → /shop/{slug}), tenure ("N+ years on Jiji"), Verified ID badge,
"Replies in minutes", Show contact + Start chat buttons, feedback count; the seller's other items live
ONLY on the /shop/{slug} page. The long bottom section is "Similar adverts" (60+ cards, various sellers).
Ibrahim's order goes one better than Jiji: show the business's other products ON the product page.
Implementation (verified against ~/workspace/naija-market/app.js):
- The detail product object already carries `sellerId` and `sellerName`; the seller card already renders
  "tap to see shop".
- Add a "More from this seller" section below the description/seller card: query
  `listProducts` filtered by sellerId, exclude the current product id, cap 8–10, reuse the existing
  card renderer, with a "View all" link to the seller's full list.
- Data check passed: sellerId is present on the product object (25 references in app.js); no existing
  "other products" section exists (grep for "other products|other ads|more from|same seller" = none).
