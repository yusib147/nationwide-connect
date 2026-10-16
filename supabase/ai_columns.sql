-- AI scam detection columns for products
alter table products add column if not exists ai_risk_score integer;
alter table products add column if not exists ai_flag_reason text;
