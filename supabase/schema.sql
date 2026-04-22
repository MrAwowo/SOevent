-- Run this in the Supabase SQL editor once per project.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  github_username text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists boards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  owner_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists boards_created_at on boards(created_at desc);

create table if not exists board_events (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  user_id uuid not null references profiles(id),
  type text not null check (type in ('create_note','move_note','edit_note','delete_note')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  prev_hash text,
  event_hash text not null
);
-- One event per (board, prev_hash). Concurrent forks fail with 23505; client retries.
create unique index if not exists board_events_chain_unique on board_events(board_id, prev_hash);
create index if not exists board_events_board_created on board_events(board_id, created_at);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references board_events(id) on delete cascade,
  board_id uuid not null references boards(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  value int not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  unique(event_id, user_id)
);
create index if not exists votes_board_id on votes(board_id);

-- Votes only on create_note events.
create or replace function enforce_vote_target() returns trigger as $$
begin
  if not exists (select 1 from board_events where id = new.event_id and type = 'create_note') then
    raise exception 'votes only allowed on create_note events';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists enforce_vote_target_trg on votes;
create trigger enforce_vote_target_trg before insert or update on votes
  for each row execute function enforce_vote_target();

-- RLS
alter table profiles      enable row level security;
alter table boards        enable row level security;
alter table board_events  enable row level security;
alter table votes         enable row level security;

drop policy if exists profiles_read on profiles;
drop policy if exists profiles_upsert_self on profiles;
drop policy if exists profiles_update_self on profiles;
create policy profiles_read on profiles for select using (true);
create policy profiles_upsert_self on profiles for insert with check (auth.uid() = id);
create policy profiles_update_self on profiles for update using (auth.uid() = id);

drop policy if exists boards_read on boards;
drop policy if exists boards_insert on boards;
drop policy if exists boards_update_owner on boards;
create policy boards_read on boards for select using (true);
create policy boards_insert on boards for insert with check (auth.uid() = owner_id);
create policy boards_update_owner on boards for update using (auth.uid() = owner_id);

drop policy if exists events_read on board_events;
drop policy if exists events_insert_self on board_events;
drop policy if exists events_update_self_hash on board_events;
create policy events_read on board_events for select using (true);
create policy events_insert_self on board_events for insert with check (auth.uid() = user_id);
-- No UPDATE policy: events are append-only and fully immutable post-insert.

drop policy if exists votes_read on votes;
drop policy if exists votes_insert_self on votes;
drop policy if exists votes_update_self on votes;
drop policy if exists votes_delete_self on votes;
create policy votes_read on votes for select using (true);
create policy votes_insert_self on votes for insert with check (auth.uid() = user_id);
create policy votes_update_self on votes for update using (auth.uid() = user_id);
create policy votes_delete_self on votes for delete using (auth.uid() = user_id);

-- Realtime publication: expose board_events and votes
alter publication supabase_realtime add table board_events;
alter publication supabase_realtime add table votes;

-- REPLICA IDENTITY FULL on votes so DELETE payloads carry board_id for filter matching.
alter table votes replica identity full;
