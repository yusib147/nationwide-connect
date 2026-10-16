-- Account suspension + appeals (Ibrahim's order 2026-10-13)
-- profiles gains an account status; appeals holds suspended users' appeals
-- for admin review (reinstate or ban forever).

alter table profiles add column if not exists account_status text not null default 'active';
alter table profiles add column if not exists status_reason text;
alter table profiles add column if not exists status_at timestamptz;

create table if not exists appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  message text not null,
  status text not null default 'open',
  created_at timestamptz default now(),
  handled_by text,
  handled_at timestamptz
);

alter table appeals enable row level security;

drop policy if exists appeals_insert_own on appeals;
create policy appeals_insert_own on appeals
  for insert with check (auth.uid() = user_id);

drop policy if exists appeals_select_own on appeals;
create policy appeals_select_own on appeals
  for select using (auth.uid() = user_id);

-- Guard: account_status may only change via the service role (Edge Functions
-- and the admin API). A signed-in user must not be able to un-suspend
-- themselves by updating their own profile row.
create or replace function guard_account_status() returns trigger as $$
begin
  if new.account_status is distinct from old.account_status
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'account_status can only be changed by the system';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_guard_account_status on profiles;
create trigger trg_guard_account_status
  before update on profiles
  for each row execute function guard_account_status();
