-- Naija Market Supabase schema
-- Run this in the Supabase SQL editor after creating your project.

-- Categories (seeded once)
create table if not exists categories (
  id serial primary key,
  name text unique not null,
  icon text not null
);

insert into categories (name, icon) values
  ('Vehicles', 'car'),
  ('Phones and Tablets', 'phone'),
  ('Electronics', 'tv'),
  ('Furniture', 'sofa'),
  ('Fashion', 'dress'),
  ('Property', 'home'),
  ('Services', 'wrench')
on conflict (name) do nothing;

-- Profiles (one row per auth user)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique,
  display_name text,
  created_at timestamptz default now()
);

-- Products
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references profiles(id) on delete cascade,
  title text not null,
  price numeric not null check (price > 0),
  price_suffix text default '',
  category_id integer references categories(id),
  description text not null,
  location text not null,
  condition text not null default 'Used',
  status text not null default 'active',
  views integer not null default 0,
  created_at timestamptz default now()
);

-- Conversations (one per buyer, seller and product)
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  buyer_id uuid references profiles(id) on delete cascade,
  seller_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (product_id, buyer_id)
);

-- Messages
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

-- Row level security
alter table profiles enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;

-- Everyone can read categories, products and seller profiles
create policy "public read categories" on categories
  for select using (true);

create policy "public read products" on products
  for select using (status = 'active' or auth.uid() = seller_id);

create policy "public read profiles" on profiles
  for select using (true);

-- Signed in users manage their own profile
create policy "users manage own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Signed in users can post products as themselves
create policy "sellers insert own products" on products
  for insert with check (auth.uid() = seller_id);

create policy "sellers update own products" on products
  for update using (auth.uid() = seller_id);

create policy "sellers delete own products" on products
  for delete using (auth.uid() = seller_id);

-- Conversation participants can read and create conversations
create policy "participants read conversations" on conversations
  for select using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "buyers start conversations" on conversations
  for insert with check (auth.uid() = buyer_id);

-- Conversation participants can read and send messages
create policy "participants read messages" on messages
  for select using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

create policy "participants send messages" on messages
  for insert with check (
    auth.uid() = sender_id and
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- ============ Phase 2 additions (applied live 2026-10-08) ============

-- Verification tier on profiles: bronze (email), silver (phone), gold (manual ID check)
alter table profiles add column if not exists verification_tier text not null default 'bronze';

-- Saved searches
create table if not exists saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  query text not null default '',
  category text not null default '',
  created_at timestamptz default now()
);
alter table saved_searches enable row level security;
drop policy if exists "users manage own saved searches" on saved_searches;
create policy "users manage own saved searches" on saved_searches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Promote: sellers bump listings to the top
alter table products add column if not exists bump_at timestamptz;

-- Reports: any logged in user can file a report, and read their own reports
drop policy if exists "users file reports" on reports;
create policy "users file reports" on reports
  for insert with check (auth.uid() = reporter_id and reporter_id is not null);
drop policy if exists "reporters read own reports" on reports;
create policy "reporters read own reports" on reports
  for select using (auth.uid() = reporter_id);

-- Sellers can mark their own listings sold (and bump them)
drop policy if exists "sellers update own products" on products;
create policy "sellers update own products" on products
  for update using (auth.uid() = seller_id) with check (auth.uid() = seller_id);
