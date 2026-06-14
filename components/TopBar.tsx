'use client';

import Link from 'next/link';
import type { Board, Profile } from '@/lib/types';
import type { ReducerState } from '@/lib/reducer';
import ShareButton from './ShareButton';
import Avatar from './Avatar';
import ContributorBar from './ContributorBar';
import ThemeToggle from './ThemeToggle';
import SignOutButton from './SignOutButton';

export default function TopBar({
  board,
  me,
  state,
  profiles,
}: {
  board: Board;
  me: Profile;
  state: ReducerState;
  profiles: Map<string, Profile>;
}) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-3 overflow-hidden">
        <Link
          href="/"
          className="shrink-0 text-sm font-semibold tracking-tight hover:underline"
          title="Smooth Operators — Inner Circle Dashboard"
        >
          Smooth Operators
        </Link>
        <span className="text-neutral-300 dark:text-neutral-600">/</span>
        <h1 className="truncate text-sm font-medium">{board.title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <ContributorBar state={state} profiles={profiles} />
        <ShareButton />
        <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800">
          <Avatar profile={me} size={22} />
          <span className="pr-1 text-xs text-neutral-700 dark:text-neutral-300">@{me.github_username}</span>
        </div>
        <ThemeToggle />
        <SignOutButton />
      </div>
    </header>
  );
}
