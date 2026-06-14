'use client';

import type { Profile } from '@/lib/types';
import Avatar from './Avatar';

export default function Leaderboard({
  entries,
}: {
  entries: Array<{ profile: Profile; score: number }>;
}) {
  return (
    <section className="border-b border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Leaderboard
      </h2>
      {entries.length === 0 ? (
        <p className="text-xs text-neutral-400 dark:text-neutral-500">No contributions yet.</p>
      ) : (
        <ol className="space-y-1.5">
          {entries.map(({ profile, score }, i) => (
            <li
              key={profile.id}
              className="flex items-center justify-between rounded px-1.5 py-1 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="w-4 text-center text-[11px] font-mono text-neutral-400">
                  {i + 1}
                </span>
                <Avatar profile={profile} size={20} />
                <span className="truncate text-sm text-neutral-800 dark:text-neutral-200">
                  @{profile.github_username}
                </span>
              </div>
              <span
                className={
                  'font-mono text-sm tabular-nums ' +
                  (score > 0 ? 'text-green-700' : score < 0 ? 'text-red-700' : 'text-neutral-400')
                }
              >
                {score > 0 ? '+' : ''}
                {score}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
