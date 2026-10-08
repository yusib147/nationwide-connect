# Nationwide Connect

A Jiji style buy and sell marketplace for Nigeria. Mobile first web app:
sign up with phone number, browse items, chat sellers, post your own items.

Live demo: https://naija-market-skepterforge1471-8639s-projects.vercel.app/

## Run it

No build step. Serve the folder and open `index.html`:

```bash
cd ~/workspace/naija-market
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Demo mode (default)

With empty keys in `config.js` the app runs fully on your device:

- Accounts live in `localStorage` (phone + password)
- Your posted items live in `localStorage` and show on Home instantly
- The seller auto replies in chat so the whole flow is testable

Demo mode never touches the network and never blocks on missing keys.

## Go live with Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run `supabase/schema.sql` from this repo.
   It creates `profiles`, `categories`, `products`, `conversations`,
   `messages` with row level security.
3. For real SMS codes: Supabase Dashboard, Authentication, Sign In / Up,
   enable Phone, add your Twilio credentials (Twilio trial works for tests).
4. Copy the project URL and anon key (Project Settings, API).
5. Paste them into `config.js`:

```js
SUPABASE_URL: "https://xyzcompany.supabase.co",
SUPABASE_ANON_KEY: "your anon key"
```

6. Redeploy. The app switches to Supabase automatically.
   Auth becomes phone number + SMS code. Products, chats and profiles
   move to the database. Demo accounts stay on each device only.

## Project layout

- `index.html` — app shell and all screens
- `styles.css` — mobile first styles
- `app.js` — screens, router, seed listings
- `config.js` — Supabase keys (empty = demo mode)
- `supabase/client.js` — data layer, Supabase or demo store
- `supabase/schema.sql` — database tables and RLS policies
- `tests/run.html` — automated quality gate (see below)

## Quality gate

```bash
cd ~/workspace/naija-market
python3 -m http.server 8000 &
google-chrome --headless --disable-gpu --no-sandbox \
  --window-size=390,844 --virtual-time-budget=20000 \
  --dump-dom "file://$HOME/workspace/naija-market/tests/run.html" \
  | grep -o "TESTS:[A-Z]*:[0-9]*/[0-9]*"
```

Every check must pass before a deploy: sign up, log out, log in,
post item, item on Home, open detail, send chat, inbox thread,
every category browses, 390px layout clean, zero console errors.
