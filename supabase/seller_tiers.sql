-- Seller tiers + manual listing approval (uses existing verification_tier)
-- Run this in the Supabase SQL editor.

-- verification_tier values: 'bronze' (new users), 'silver', 'gold'
-- Bronze sellers' listings go to 'pending' for admin approval.
-- Silver/gold sellers' listings go live immediately.

create or replace function set_pending_for_bronze_sellers()
returns trigger as $$
begin
  if exists (select 1 from profiles where id = NEW.seller_id and (verification_tier = 'bronze' or verification_tier is null)) then
    NEW.status := 'pending';
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_pending_for_bronze_sellers on products;
create trigger trg_pending_for_bronze_sellers
  before insert on products
  for each row execute function set_pending_for_bronze_sellers();
