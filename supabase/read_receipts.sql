-- Nationwide Connect: read receipts for blue "seen" ticks
-- RUN THIS in the Supabase SQL editor (project qxcifjxytdixiolvkmtv), then the
-- chat's double-check ticks turn BLUE once the other person opens the thread.
-- Until this is run, ticks stop at "delivered" (double gray) — nothing breaks.

create table if not exists read_receipts (
  conversation_id uuid references conversations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  last_read_at timestamptz default now(),
  primary key (conversation_id, user_id)
);

alter table read_receipts enable row level security;

-- Participants can read receipts for their own conversations
drop policy if exists "participants read receipts" on read_receipts;
create policy "participants read receipts"
  on read_receipts for select
  to authenticated
  using (
    exists (
      select 1 from conversations c
      where c.id = read_receipts.conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- Users can upsert their own read receipt
drop policy if exists "users upsert own receipt" on read_receipts;
create policy "users upsert own receipt"
  on read_receipts for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "users update own receipt" on read_receipts;
create policy "users update own receipt"
  on read_receipts for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
