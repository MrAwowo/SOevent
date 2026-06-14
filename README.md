# SOevent — Event calendar + collaborative whiteboards

A hackathon-ready event hub. Each **calendar event is a collaborative board**: sticky notes with
GitHub-attributed authorship, live-synced via Supabase Realtime, voting + leaderboard, a live
activity feed, and a replay mode that reconstructs the board from its event history. State is a fold
over an append-only event log with a tamper-evident hash chain.

**Features**

- **Calendar** (`/calendar`) — Notion/Google-style month grid + a "Coming up" agenda with
  countdowns. Boards get a date and auto-move between Coming up / On the works / Past.
- **Fast notes** — press **N** (or the floating **+**) to drop a note and start typing instantly;
  double-click the canvas still works.
- **Who does what** — every action is attributed to a GitHub user. A contributor bar on each board
  shows everyone active with action counts; notes can be **assigned** to a person (assignee ≠ author);
  per-user pages live at `/u/[username]`.
- **Files + text** — attach files (Supabase Storage) and an editable description to each event.
- **Alerts** — in-app "coming up soon" banner + optional browser notifications (see limits below).

## Stack

- Next.js 15 App Router + TypeScript
- Tailwind CSS v4
- Supabase (Auth + Postgres + Realtime)
- Vercel

## One-time setup

### 1. Supabase project

1. Create a new project at https://supabase.com.
2. Open the **SQL editor** and run the entire contents of `supabase/schema.sql`.
3. Go to **Authentication → Providers → GitHub** and enable GitHub.
   - Create a GitHub OAuth app at https://github.com/settings/developers.
   - Homepage URL: your Vercel URL (or `http://localhost:3000` for dev).
   - Authorization callback URL: `https://<project-ref>.supabase.co/auth/v1/callback` (from Supabase, not your app).
   - Paste Client ID + Client Secret into Supabase.
4. Go to **Authentication → URL Configuration** and add every URL you sign in from (`http://localhost:3000`, `https://your-app.vercel.app`, and any Vercel preview URLs you want to allow) under **Redirect URLs**.
5. Confirm Realtime is on: **Database → Replication → `supabase_realtime`** should list `board_events`, `votes`, and `board_attachments`. `schema.sql` adds them; if they're missing, re-run the `alter publication` block.
6. **Storage bucket for file attachments:** go to **Storage → New bucket**, name it exactly `attachments`, and mark it **Public**. The storage access policies are created by `schema.sql` (the `storage.objects` policies at the bottom). Without this bucket, file upload shows a friendly error and the rest of the app still works.

> **Upgrading an existing project?** Re-run the whole `supabase/schema.sql` — every change is
> additive (`add column if not exists`, `create table if not exists`, idempotent policy/publication
> blocks), so it's safe to run again. Then create the `attachments` bucket (step 6).

### 2. Env vars

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from Supabase → API>
```

### 3. Local dev

```bash
npm install
npm run dev
```

Open http://localhost:3000, sign in with GitHub, create a board, and share the URL with a collaborator.

### 4. Deploy

```bash
vercel
```

Set the same two env vars in the Vercel project. The preview URL also needs to be in the Supabase **Redirect URLs** allowlist for OAuth to succeed.

## How it works

- **Events** (`board_events`) are append-only and record every `create_note`, `move_note`, `edit_note`, and `delete_note`. Board state is always a fold over these events — no direct mutation.
- **Hash chain**: every event stores `prev_hash` (the `event_hash` of the previous event in this board) and its own `event_hash = sha256(board_id|user_id|type|payload|created_at|prev_hash)`. A `UNIQUE(board_id, prev_hash)` index prevents forks: if two clients try to chain off the same tail concurrently, one loses with a `23505` error and retries against the new tail. The short hash is displayed on every note as a verification badge.
- **Realtime**: each board opens a single Supabase channel (`board:<id>`) with `postgres_changes` bindings on `board_events` and `votes`, both filtered by `board_id`. Local reducer applies incoming events and de-dupes by id.
- **Voting**: one vote per user per note (`UNIQUE(event_id, user_id)`). A Postgres trigger enforces that votes target `create_note` events only.
- **Leaderboard**: aggregated client-side from the reducer state.
- **Replay**: UI freezes the current render, steps through events into a scratch state at 400ms cadence, and buffers any realtime events that arrive during replay. On finish, buffered events are merged into the live state.

## Project layout

```
app/
  auth/callback/route.ts    # OAuth exchange + profile upsert
  board/[id]/               # board page + realtime client
  calendar/                 # month grid + "Coming up" agenda
  actions.ts                # shared createBoard server action (date-based)
  page.tsx                  # landing / board list (grouped by derived status)
components/                 # Canvas, Note, Sidebar, ContributorBar,
                            # Attachments, BoardDescription, EventAlerts, etc.
lib/
  events.ts                 # hash chain + retry insert
  reducer.ts                # fold events → state, aggregate votes
  board-status.ts           # derive upcoming/current/past from dates + countdowns
  supabase/                 # client + server adapters (Next 15 async cookies)
  types.ts
supabase/schema.sql         # tables, RLS, triggers, realtime, storage policies
middleware.ts               # session refresh
```

## Known limits

- Hash chain is client-computed. The `UNIQUE(board_id, prev_hash)` index prevents visible forks under concurrency, but a determined attacker with direct database access could still forge history. Good enough for a demo; not production audit evidence.
- **Alerts are client-only.** The "coming up soon" banner and browser notifications only fire while a
  tab is open. True background reminders (email/push when the app is closed) need a server-side
  scheduler — e.g. a Supabase Edge Function on a cron that queries upcoming `boards.starts_at` and
  sends via an email API (Resend/Postmark). Not implemented here; the data model (`starts_at`) already
  supports it.
- No presence/cursors, no sketch tool, no board deletion/permissions.
- Mobile viewport: the sidebar is hidden below `md` (the contributor bar, press-N, and floating + still work).
