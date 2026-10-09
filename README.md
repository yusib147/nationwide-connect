# Nationwide Media Connect

A Jiji-style buy and sell marketplace for Nigeria. Mobile-first premium web app:
sign up with email or phone number, browse items, chat sellers, make offers, post your own items.

Live: https://nationwide-connect-demo1-skepterforge1471-8639s-projects.vercel.app/

## Brand

Deep navy + red-orange + cyan glow identity, built around the official logo
(`assets/logo-main.jpg`). Site title: **Nationwide Media Connect**.

## Premium UI

- Branded splash screen with logo and shimmer progress bar
- Auto-rotating hero carousel (3 slides, dot indicators)
- Infinite trust ticker marquee
- Flash promo strip with live countdown timer
- Capsule search bar (Airbnb-style)
- Liquid-glass floating bottom navigation
- Staggered card entrances, shimmer skeleton loaders
- Custom SVG category icons (7) and empty-state illustrations (3)
- Noise/grain texture overlays on brand surfaces
- Full SEO: Open Graph, Twitter cards, JSON-LD, PWA manifest

## Run it

No build step. Serve the folder and open `index.html`:

```bash
cd ~/workspace/naija-market
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Supabase backend

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run `supabase/schema.sql` from this repo.
   It creates `profiles`, `categories`, `products`, `conversations`,
   `messages`, `favorites`, `reports`, `offers`, `saved_searches`
   with row level security, plus the `email_for_phone()` RPC.
3. Copy the project URL and anon key (Project Settings, API).
4. Paste them into `config.js`.
5. Deploy with `python3 deploy.py` (uploads to Vercel).

Auth: email+password AND phone+password. Password reset via email link.
WhatsApp number verification flow for gold seller tier.

## Project layout

- `index.html` — app shell, splash, hero, ticker, all screens, SEO
- `styles.css` — premium design system (navy/orange/cyan)
- `app.js` — screens, router, carousel, ticker, countdown, features
- `config.js` — Supabase keys
- `manifest.json` — PWA manifest
- `assets/` — official logo, app icons, OG cover, SVG icons
- `supabase/client.js` — data layer
- `supabase/schema.sql` — database tables and RLS policies
- `deploy.py` — Vercel deployment script
- `research/ux-ideas.md` — 20 implemented UX ideas
- `tests/` — automated quality gate

## Deploy

```bash
cd ~/workspace/naija-market
python3 deploy.py
```
