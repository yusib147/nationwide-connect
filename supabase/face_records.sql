-- Nationwide Connect: face ban-list table
-- Run this ONCE in Supabase Dashboard > SQL Editor.

create table if not exists face_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  embedding float8[] not null,
  photo text,
  is_banned boolean not null default false,
  created_at timestamptz not null default now()
);

alter table face_records enable row level security;

-- App server (anon key) needs: read banned embeddings, insert new faces, link faces to users, flag bans.
drop policy if exists "anon manage face_records" on face_records;
create policy "anon manage face_records" on face_records
  for all using (true) with check (true);

-- How to ban a scammer's face (run in SQL editor, replace the id):
-- update face_records set is_banned = true where id = '<face-id>';

-- How to see recent face records:
-- select id, user_id, is_banned, created_at from face_records order by created_at desc limit 50;
