-- Photo-gate data-layer guard (Ibrahim's order 2026-10-25, gate hardening)
-- *** APPLY VIA THE SUPABASE DASHBOARD SQL EDITOR — this file being in the
-- repo does NOT apply it. The client hardening in photogate.js v2 is live
-- without it; this closes the remaining REST-API tamper paths. ***
--
-- Why: the signup photo gate reads profiles.avatar_url + the account's
-- creation time. Both were provable attack surfaces with a normal user
-- token (live-tested 2026-10-25 on a test account):
--   (1) PATCH profiles.avatar_url -> 'https://example.com/fake.jpg'
--       succeeded — the gate saw "a photo" and lifted forever, no upload,
--       no face check, no AI check ever ran.
--   (2) PATCH profiles.created_at -> any date succeeded — the same trick
--       in reverse backdates a new account into the grandfathered era.
-- This trigger makes created_at immutable for end-user callers, forces
-- it to now() on insert, restricts avatar_url to the two shapes the
-- app's own uploadAvatar can produce (the owner's file in the avatars
-- bucket, or the small JPEG data URL used as the storage fallback), and
-- stops gate-era accounts from removing their photo via the API.
-- System paths (service role Edge Functions / admin API, and the
-- dashboard itself as postgres) are exempt, same as guard_account_status.

create or replace function guard_profile_photo_fields() returns trigger as $$
declare
  is_cohort boolean;
  av text;
begin
  if coalesce(auth.role(), '') = 'service_role' or session_user = 'postgres' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- A profile is born when the account is born. A caller-supplied
    -- created_at would be a backdating attempt; the real time wins.
    new.created_at := now();
  end if;

  if tg_op = 'UPDATE' and new.created_at is distinct from old.created_at then
    raise exception 'created_at cannot be changed';
  end if;

  av := new.avatar_url;
  if av is not null then
    if av like ('%/storage/v1/object/public/avatars/avatars/' || new.id::text || '.jpg%') then
      null; -- owner's own avatars-bucket file (uploadAvatar): allowed
    elsif av like 'data:image/jpeg;base64,%' and length(av) <= 90000 then
      null; -- uploadAvatar storage-fallback data URL: allowed
    else
      raise exception 'avatar_url must come from the in-app photo upload';
    end if;
  end if;

  if tg_op = 'UPDATE' and av is null and old.avatar_url is not null then
    -- Removing a photo: accounts created on/after the gate era
    -- (2026-10-25 13:45 UTC) may not end up photoless. Older accounts
    -- were never photo-gated and may remove theirs.
    select (au.created_at >= timestamptz '2026-10-25 13:45:00+00')
      into is_cohort from auth.users au where au.id = old.id;
    if coalesce(is_cohort, true) then
      raise exception 'A profile photo is required for this account';
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_guard_profile_photo_ins on profiles;
create trigger trg_guard_profile_photo_ins
  before insert on profiles
  for each row execute function guard_profile_photo_fields();

drop trigger if exists trg_guard_profile_photo_upd on profiles;
create trigger trg_guard_profile_photo_upd
  before update on profiles
  for each row execute function guard_profile_photo_fields();
