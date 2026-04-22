'use client';

import Link from 'next/link';
import type { Board, Profile } from '@/lib/types';
import ShareButton from './ShareButton';
import Avatar from './Avatar';
import SignOutButton from './SignOutButton';

export default function TopBar({ board, me }: { board: Board; me: Profile }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4">
      <div className="flex items-center gap-3 overflow-hidden">
        <Link href="/" className="text-sm font-semibold tracking-tight hover:underline">
          SOevent
        </Link>
        <span className="text-neutral-300">/</span>
        <h1 className="truncate text-sm font-medium">{board.title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <ShareButton />
        <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-1">
          <Avatar profile={me} size={22} />
          <span className="pr-1 text-xs text-neutral-700">@{me.github_username}</span>
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
