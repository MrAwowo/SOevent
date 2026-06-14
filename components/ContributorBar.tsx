'use client';

import type { Profile } from '@/lib/types';
import type { ReducerState } from '@/lib/reducer';
import Avatar from './Avatar';

/**
 * Compact row of everyone who has acted on this board, with action counts —
 * GitHub-attributed "who does what" at a glance. Derived live from the event log.
 */
export default function ContributorBar({
  state,
  profiles,
}: {
  state: ReducerState;
  profiles: Map<string, Profile>;
}) {
  const counts = new Map<string, number>();
  for (const e of state.events) {
    counts.set(e.user_id, (counts.get(e.user_id) ?? 0) + 1);
  }
  const ranked = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  if (ranked.length === 0) return null;

  return (
    <div className="hidden items-center gap-1 sm:flex">
      {ranked.map(([userId, count]) => {
        const profile = profiles.get(userId);
        return (
          <div
            key={userId}
            title={`@${profile?.github_username ?? 'unknown'} · ${count} action${count === 1 ? '' : 's'}`}
            className="flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 py-0.5 pl-0.5 pr-1.5 dark:border-neutral-700 dark:bg-neutral-800"
          >
            <Avatar profile={profile} size={18} />
            <span className="font-mono text-[11px] tabular-nums text-neutral-600 dark:text-neutral-300">{count}</span>
          </div>
        );
      })}
    </div>
  );
}
