import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase/server';
import SignInButton from '@/components/SignInButton';
import SignOutButton from '@/components/SignOutButton';
import { createBoard } from '@/app/actions';
import EventAlerts from '@/components/EventAlerts';
import { deriveStatus } from '@/lib/board-status';
import type { Board, BoardStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const SECTIONS: Array<{ key: BoardStatus; title: string; pillClass: string }> = [
  { key: 'upcoming', title: 'Coming up', pillClass: 'bg-blue-100 text-blue-800' },
  { key: 'current', title: 'On the works', pillClass: 'bg-amber-100 text-amber-800' },
  { key: 'past', title: 'Past events', pillClass: 'bg-neutral-200 text-neutral-700' },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  const { data: boards } = await supabase
    .from('boards')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const now = new Date();
  const grouped: Record<BoardStatus, Board[]> = {
    upcoming: [],
    current: [],
    past: [],
  };
  for (const b of (boards ?? []) as Board[]) {
    grouped[deriveStatus(b, now)].push(b);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">SOevent</h1>
          <p className="text-sm text-neutral-600">
            Event-sourced collaborative whiteboards.
          </p>
        </div>
        {user ? (
          <div className="flex items-center gap-3">
            <Link href="/calendar" className="text-sm text-neutral-700 hover:underline">
              Calendar
            </Link>
            <Link
              href={`/u/${user.user_metadata?.user_name ?? user.user_metadata?.preferred_username ?? ''}`}
              className="text-sm text-neutral-700 hover:underline"
            >
              @{user.user_metadata?.user_name ?? user.user_metadata?.preferred_username ?? 'you'}
            </Link>
            <SignOutButton />
          </div>
        ) : (
          <SignInButton />
        )}
      </header>

      {sp.error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {sp.error}
        </div>
      )}

      {user && <EventAlerts boards={(boards ?? []) as Board[]} />}

      {user && (
        <section className="mt-10">
          <h2 className="text-lg font-medium">New event</h2>
          <form action={createBoard} className="mt-3 flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-[240px]">
              <span className="mb-1 block text-xs text-neutral-500">Title</span>
              <input
                name="title"
                required
                maxLength={80}
                placeholder="Event / board title"
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
              />
            </label>
            <label>
              <span className="mb-1 block text-xs text-neutral-500">Date</span>
              <input
                name="starts_at"
                type="date"
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
              />
            </label>
            <label>
              <span className="mb-1 block text-xs text-neutral-500">End (optional)</span>
              <input
                name="ends_at"
                type="date"
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
              />
            </label>
            <button
              type="submit"
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Create
            </button>
          </form>
          <p className="mt-2 text-xs text-neutral-500">
            Leave the date empty for an undated board. Dated events appear on the{' '}
            <Link href="/calendar" className="underline">calendar</Link> and move between
            sections automatically.
          </p>
        </section>
      )}

      <div className="mt-10 space-y-10">
        {SECTIONS.map(({ key, title, pillClass }) => (
          <section key={key}>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-lg font-medium">{title}</h2>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${pillClass}`}
              >
                {grouped[key].length}
              </span>
            </div>
            <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-white">
              {grouped[key].length === 0 && (
                <li className="px-4 py-6 text-sm text-neutral-400">
                  Nothing {title.toLowerCase()} yet.
                </li>
              )}
              {grouped[key].map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/board/${b.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50"
                  >
                    <span className="font-medium">{b.title}</span>
                    <span className="text-xs text-neutral-500">
                      {b.starts_at
                        ? new Date(b.starts_at).toLocaleDateString()
                        : new Date(b.created_at).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {!user && (
        <p className="mt-10 text-sm text-neutral-600">
          Sign in with GitHub to create a board. Every contribution is attributed to
          your GitHub account and locked to a tamper-evident hash chain.
        </p>
      )}
    </main>
  );
}
