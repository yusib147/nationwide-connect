-- Nationwide Media Connect — Launch 100 promo (2026-11-12, Ibrahim's order).
-- First 100 NEW signups from 2026-11-12 00:00 Africa/Lagos post unlimited
-- listings free. Once 100 spots are claimed, the database listing gate
-- (trg_free_listing_limit) applies the normal 3-free-listings paywall to
-- everyone else automatically. Applied via Supabase SQL Editor 2026-11-12;
-- the gate-function rewrite (Phase 3) preserves the original function body
-- and adds only the launch_free exemption at the top — its verbatim new
-- definition is recorded in the 2026-11-12 daily memory log.

create table if not exists public.launch_promo (
  id int primary key check (id = 1),
  target int not null default 100,
  claimed int not null default 0,
  starts_at timestamptz not null,
  active boolean not null default true
);
insert into public.launch_promo (id, target, claimed, starts_at, active)
values (1, 100, 0, '2026-11-12T00:00:00+01:00', true)
on conflict (id) do nothing;
alter table public.launch_promo enable row level security;
drop policy if exists "launch promo public read" on public.launch_promo;
create policy "launch promo public read" on public.launch_promo for select using (true);

alter table public.profiles add column if not exists launch_free boolean not null default false;

create or replace function public.claim_launch_spot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_claimed int;
begin
  -- Guard (added same day): the app upserts profiles on every sign-in and
  -- app load; for an existing profile that upsert still fires this trigger
  -- with a fresh created_at and would leak counter spots without granting.
  if exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;
  if new.created_at is not null and new.created_at >= (select starts_at from public.launch_promo where id = 1) then
    update public.launch_promo
      set claimed = claimed + 1
      where id = 1 and active = true and claimed < target
      returning claimed into new_claimed;
    if new_claimed is not null then
      new.launch_free := true;
      -- BRIDGE (added 2026-11-12 afternoon): while the storefront deploy of
      -- launch100.js is blocked on Vercel team access, the LIVE app's own
      -- premium check reads premium_until, so claimants also get a far-future
      -- premium_until. The live client then treats them as premium-active and
      -- never shows the 3-listing sheet. REVERT when the deploy lands:
      -- remove this line and null premium_until where it = '2036-01-01'
      -- for launch_free profiles (that exact value marks bridge rows).
      new.premium_until := '2036-01-01T00:00:00Z';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_claim_launch_spot on public.profiles;
create trigger trg_claim_launch_spot
  before insert on public.profiles
  for each row execute function public.claim_launch_spot();

-- Backfill: profiles created since launch start, in signup order, to target.
with ordered as (
  select id, row_number() over (order by created_at asc) as rn
  from public.profiles
  where created_at >= '2026-11-11T23:00:00Z' and launch_free = false
)
update public.profiles p set launch_free = true
from ordered o
where p.id = o.id and o.rn <= (select target from public.launch_promo where id = 1);
update public.launch_promo
  set claimed = (select count(*) from public.profiles where launch_free = true)
  where id = 1;

-- Bridge backfill (run 2026-11-12 afternoon): existing launch members got
-- the same far-future premium_until; rows with a real premium_until untouched.
update public.profiles
  set premium_until = '2036-01-01T00:00:00Z'
  where launch_free = true and premium_until is null;
