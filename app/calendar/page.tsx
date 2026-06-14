import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase/server';
import SignInButton from '@/components/SignInButton';
import SignOutButton from '@/components/SignOutButton';
import { createBoard } from '@/app/actions';
import CalendarClient from './CalendarClient';
import EventAlerts from '@/components/EventAlerts';
import ThemeToggle from '@/components/ThemeToggle';
import type { Board } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  const { data: boards } = await supabase
    .from('boards')
    .select('*')
    .order('starts_at', { ascending: true })
    .limit(500);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Every event is a collaborative board.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-neutral-700 hover:underline dark:text-neutral-300">
            Boards
          </Link>
          <ThemeToggle />
          {user ? <SignOutButton /> : <SignInButton />}
        </div>
      </header>

      <EventAlerts boards={(boards ?? []) as Board[]} />

      <div className="mt-8">
        <CalendarClient
          boards={(boards ?? []) as Board[]}
          createBoard={createBoard}
          signedIn={!!user}
        />
      </div>
    </main>
  );
}
