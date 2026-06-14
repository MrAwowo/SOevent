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
  status text not null default 'current' check (status in ('past','current','upcoming')),
  created_at timestamptz not null default now()
);
alter table boards add column if not exists status text not null default 'current' check (status in ('past','current','upcoming'));
-- Calendar scheduling: a board is a calendar event. Status is derived from these when set.
alter table boards add column if not exists starts_at   timestamptz;
alter table boards add column if not exists ends_at     timestamptz;
alter table boards add column if not exists all_day     boolean not null default true;
alter table boards add column if not exists description text;
create index if not exists boards_created_at on boards(created_at desc);
create index if not exists boards_status_created on boards(status, created_at desc);
create index if not exists boards_starts_at on boards(starts_at);

-- Access whitelist: only GitHub usernames listed here may sign in (enforced in
-- the OAuth callback). Stored lowercased. Manage rows via the Supabase dashboard.
create table if not exists allowed_users (
  github_username text primary key,
  added_at timestamptz not null default now()
);
-- Seed anyone who already has a profile (so existing users aren't locked out) + the owner.
insert into allowed_users (github_username)
  select lower(github_username) from profiles on conflict do nothing;
insert into allowed_users (github_username) values ('mrawowo') on conflict do nothing;

create table if not exists board_events (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  user_id uuid not null references profiles(id),
  type text not null check (type in ('create_note','move_note','edit_note','delete_note','assign_note')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  prev_hash text,
  event_hash text not null
);
-- Allow assign_note on tables created before assignment existed (re-runnable).
alter table board_events drop constraint if exists board_events_type_check;
alter table board_events add constraint board_events_type_check
  check (type in ('create_note','move_note','edit_note','delete_note','assign_note'));
-- One event per (board, prev_hash). Concurrent forks fail with 23505; client retries.
create unique index if not exists board_events_chain_unique on board_events(board_id, prev_hash);
create index if not exists board_events_board_created on board_events(board_id, created_at);

-- Files attached to an event/board. GitHub-attributed via user_id.
create table if not exists board_attachments (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  user_id  uuid not null references profiles(id),
  file_name text not null,
  file_path text not null,
  file_size bigint,
  created_at timestamptz not null default now()
);
create index if not exists board_attachments_board on board_attachments(board_id, created_at);

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
alter table profiles          enable row level security;
alter table boards            enable row level security;
alter table board_events      enable row level security;
alter table board_attachments enable row level security;
alter table allowed_users     enable row level security;
alter table votes             enable row level security;

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

drop policy if exists allowed_users_read on allowed_users;
-- Authenticated users (incl. the OAuth callback) can read the list; writes are
-- intentionally restricted to the dashboard / service role (no insert/update/delete policy).
create policy allowed_users_read on allowed_users for select using (auth.role() = 'authenticated');

drop policy if exists attachments_read on board_attachments;
drop policy if exists attachments_insert_self on board_attachments;
drop policy if exists attachments_delete_self on board_attachments;
create policy attachments_read on board_attachments for select using (true);
create policy attachments_insert_self on board_attachments for insert with check (auth.uid() = user_id);
create policy attachments_delete_self on board_attachments for delete using (auth.uid() = user_id);

drop policy if exists votes_read on votes;
drop policy if exists votes_insert_self on votes;
drop policy if exists votes_update_self on votes;
drop policy if exists votes_delete_self on votes;
create policy votes_read on votes for select using (true);
create policy votes_insert_self on votes for insert with check (auth.uid() = user_id);
create policy votes_update_self on votes for update using (auth.uid() = user_id);
create policy votes_delete_self on votes for delete using (auth.uid() = user_id);

-- Realtime publication: expose board_events, votes, and attachments.
-- (Wrapped because "add table" errors if the table is already in the publication.)
do $$ begin
  alter publication supabase_realtime add table board_events;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table votes;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table board_attachments;
exception when duplicate_object then null; end $$;

-- REPLICA IDENTITY FULL so DELETE payloads carry board_id for filter matching.
alter table votes replica identity full;
alter table board_attachments replica identity full;

-- ---------------------------------------------------------------------------
-- Storage: create a public bucket named "attachments" in the Supabase dashboard
-- (Storage → New bucket → name "attachments", Public). Then run these policies
-- so any signed-in user can upload and uploaders can delete their own files.
-- ---------------------------------------------------------------------------
drop policy if exists attachments_obj_read on storage.objects;
drop policy if exists attachments_obj_insert on storage.objects;
drop policy if exists attachments_obj_delete on storage.objects;
create policy attachments_obj_read on storage.objects
  for select using (bucket_id = 'attachments');
create policy attachments_obj_insert on storage.objects
  for insert with check (bucket_id = 'attachments' and auth.role() = 'authenticated');
create policy attachments_obj_delete on storage.objects
  for delete using (bucket_id = 'attachments' and auth.uid() = owner);
