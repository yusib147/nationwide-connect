-- Nationwide Connect: device ban-list table
-- Run this ONCE in Supabase Dashboard > SQL Editor.

create table if not exists device_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  fingerprint text not null,
  is_banned boolean not null default false,
  created_at timestamptz not null default now()
);

alter table device_records enable row level security;

drop policy if exists "anon manage device_records" on device_records;
create policy "anon manage device_records" on device_records
  for all using (true) with check (true);

create index if not exists device_records_fp_idx on device_records (fingerprint);

-- How it works:
-- 1. Every signup computes a device fingerprint (browser characteristics hash)
--    and stores it linked to the user.
-- 2. At signup, the fingerprint is checked against banned devices FIRST
--    (before the face check). Banned device = instant block.
-- 3. Banning a user (banUser API) bans their faces AND their devices.
-- 4. To manually ban a device: update device_records set is_banned = true
--    where fingerprint = '<hash>';
