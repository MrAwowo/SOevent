import Link from 'next/link';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import SignInButton from '@/components/SignInButton';
import SignOutButton from '@/components/SignOutButton';
import type { Board } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function createBoard(formData: FormData) {
  'use server';
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return;
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return;
  const { data, error } = await supabase
    .from('boards')
    .insert({ title, owner_id: user.id })
    .select('id')
    .single();
  if (error || !data) return;
  redirect(`/board/${data.id}`);
}

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
    .limit(50);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">SOevent</h1>
          <p className="text-sm text-neutral-600">
            Event-sourced collaborative whiteboard.
          </p>
        </div>
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-700">
              @{user.user_metadata?.user_name ?? user.user_metadata?.preferred_username ?? 'you'}
            </span>
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

      {user && (
        <section className="mt-10">
          <h2 className="text-lg font-medium">New board</h2>
          <form action={createBoard} className="mt-3 flex gap-2">
            <input
              name="title"
              required
              maxLength={80}
              placeholder="Board title"
              className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Create
            </button>
          </form>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-medium">
          {user ? 'Recent boards' : 'Public boards'}
        </h2>
        <ul className="mt-3 divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-white">
          {(boards ?? []).length === 0 && (
            <li className="px-4 py-6 text-sm text-neutral-500">
              No boards yet{user ? ' — create your first one above.' : '.'}
            </li>
          )}
          {(boards as Board[] | null)?.map((b) => (
            <li key={b.id}>
              <Link
                href={`/board/${b.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50"
              >
                <span className="font-medium">{b.title}</span>
                <span className="text-xs text-neutral-500">
                  {new Date(b.created_at).toLocaleString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {!user && (
        <p className="mt-10 text-sm text-neutral-600">
          Sign in with GitHub to create a board. Every contribution is attributed to
          your GitHub account and locked to a tamper-evident hash chain.
        </p>
      )}
    </main>
  );
}
