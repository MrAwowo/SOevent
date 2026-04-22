import { notFound, redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import BoardClient from './BoardClient';
import type { Board, BoardEvent, Profile, Vote } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  const { data: board } = await supabase
    .from('boards')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!board) notFound();

  const [{ data: events }, { data: votes }, { data: profiles }] = await Promise.all([
    supabase
      .from('board_events')
      .select('*')
      .eq('board_id', id)
      .order('created_at', { ascending: true }),
    supabase.from('votes').select('*').eq('board_id', id),
    supabase.from('profiles').select('*'),
  ]);

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold">{board.title}</h1>
        <p className="mt-2 text-neutral-600">
          Sign in with GitHub on the{' '}
          <a className="underline" href="/">
            home page
          </a>{' '}
          to join this board.
        </p>
      </main>
    );
  }

  const me: Profile | undefined = profiles?.find((p: Profile) => p.id === user.id);
  if (!me) {
    // Profile may not yet exist if the callback hasn't run — redirect through home.
    redirect('/');
  }

  return (
    <BoardClient
      board={board as Board}
      initialEvents={(events ?? []) as BoardEvent[]}
      initialVotes={(votes ?? []) as Vote[]}
      profiles={(profiles ?? []) as Profile[]}
      me={me}
    />
  );
}
