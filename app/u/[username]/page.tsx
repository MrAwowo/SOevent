import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import Avatar from '@/components/Avatar';
import type { BoardEvent, EventType, NotePayload, Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

const VERB: Record<EventType, string> = {
  create_note: 'added a note',
  move_note: 'moved a note',
  edit_note: 'edited a note',
  delete_note: 'deleted a note',
  assign_note: 'assigned a note',
};

export default async function UserPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await supabaseServer();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('github_username', username)
    .maybeSingle();
  if (!profile) notFound();

  const { data: eventsData } = await supabase
    .from('board_events')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(200);
  const events = (eventsData ?? []) as BoardEvent[];

  const eventIds = events.map((e) => e.id);
  const boardIds = Array.from(new Set(events.map((e) => e.board_id)));

  const [{ data: votesData }, { data: boardsData }] = await Promise.all([
    eventIds.length
      ? supabase
          .from('votes')
          .select('event_id,value')
          .in('event_id', eventIds)
      : Promise.resolve({ data: [] as { event_id: string; value: number }[] }),
    boardIds.length
      ? supabase
          .from('boards')
          .select('id,title,status')
          .in('id', boardIds)
      : Promise.resolve({ data: [] as { id: string; title: string; status: string }[] }),
  ]);

  const scoreByEvent = new Map<string, number>();
  for (const v of votesData ?? []) {
    scoreByEvent.set(v.event_id, (scoreByEvent.get(v.event_id) ?? 0) + v.value);
  }
  const boardMap = new Map<string, { title: string; status: string }>();
  for (const b of boardsData ?? []) {
    boardMap.set(b.id, { title: b.title, status: b.status });
  }

  const totalScore = events.reduce((s, e) => s + (scoreByEvent.get(e.id) ?? 0), 0);
  const noteEvents = events.filter((e) => e.type === 'create_note');

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-xs text-neutral-500 hover:underline dark:text-neutral-400">
        ← Back home
      </Link>

      <header className="mt-4 flex items-start gap-5">
        <Avatar profile={profile as Profile} size={80} link={false} />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">@{profile.github_username}</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {noteEvents.length} note{noteEvents.length === 1 ? '' : 's'} ·{' '}
            {events.length} total contribution{events.length === 1 ? '' : 's'} ·{' '}
            <span
              className={
                totalScore > 0
                  ? 'text-green-700'
                  : totalScore < 0
                    ? 'text-red-700'
                    : 'text-neutral-500'
              }
            >
              {totalScore > 0 ? '+' : ''}
              {totalScore} net score
            </span>
          </p>
          <a
            href={`https://github.com/${profile.github_username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-neutral-700 underline dark:text-neutral-300"
          >
            View on GitHub ↗
          </a>
        </div>
      </header>

      <section className="mt-10">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Recent contributions
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No contributions yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 overflow-hidden rounded-md border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
            {events.slice(0, 80).map((e) => {
              const score = scoreByEvent.get(e.id) ?? 0;
              const board = boardMap.get(e.board_id);
              const payload = e.payload as NotePayload;
              const preview =
                e.type === 'create_note' || e.type === 'edit_note'
                  ? (payload.content ?? '').trim()
                  : '';
              return (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate">
                      <span className="text-neutral-900 dark:text-neutral-100">{VERB[e.type]}</span>
                      {preview && (
                        <span className="text-neutral-600 dark:text-neutral-400">
                          {' '}
                          — “{preview.slice(0, 80)}
                          {preview.length > 80 ? '…' : ''}”
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      <Link
                        href={`/board/${e.board_id}`}
                        className="hover:underline"
                      >
                        {board?.title ?? 'Unknown board'}
                      </Link>
                      {board && (
                        <span className="ml-1.5 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                          {board.status}
                        </span>
                      )}
                      <span> · {new Date(e.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  {e.type === 'create_note' && (
                    <span
                      className={
                        'font-mono text-sm tabular-nums ' +
                        (score > 0
                          ? 'text-green-700'
                          : score < 0
                            ? 'text-red-700'
                            : 'text-neutral-400')
                      }
                    >
                      {score > 0 ? '+' : ''}
                      {score}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
