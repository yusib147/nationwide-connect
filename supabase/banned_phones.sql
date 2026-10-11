-- Nationwide Connect: banned phone numbers (Jiji-style)
-- Run this ONCE in Supabase Dashboard > SQL Editor.
-- Banning a user now burns their phone number too: a scammer can switch
-- browsers for free, but a new SIM needs NIN registration + money.

create table if not exists banned_phones (
  phone text primary key,
  user_id uuid,
  banned_at timestamptz not null default now(),
  reason text
);

alter table banned_phones enable row level security;

-- anon: can check if a phone is banned (signup), cannot modify
drop policy if exists "anon read banned_phones" on banned_phones;
create policy "anon read banned_phones" on banned_phones
  for select using (true);

-- No insert/update/delete for anon: only the admin API (service role) manages this table.
