-- Terms of Service + Privacy Policy acceptance tracking
-- Run this in the Supabase SQL editor (project qxcifjxytdixiolvkmtv).
-- The app also falls back to auth user_metadata if these columns are missing,
-- so signup keeps working before/after this runs.

alter table profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists privacy_version text;
