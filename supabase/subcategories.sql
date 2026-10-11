-- Subcategory support for products (Jiji-style taxonomy)
-- Run this in the Supabase SQL editor for project qxcifjxytdixiolvkmtv.
-- Safe to run multiple times (IF NOT EXISTS).

alter table products
  add column if not exists subcategory text;
