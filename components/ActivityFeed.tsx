'use client';

import { useEffect, useState } from 'react';
import type { BoardEvent, Profile } from '@/lib/types';
import type { ReducerState } from '@/lib/reducer';

const VERB: Record<BoardEvent['type'], string> = {
  create_note: 'added a note',
  move_note: 'moved a note',
  edit_note: 'edited a note',
  delete_note: 'deleted a note',
};

function relative(ts: string, now: number): string {
  const seconds = Math.max(1, Math.round((now - new Date(ts).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function ActivityFeed({
  state,
  profiles,
}: {
  state: ReducerState;
  profiles: Map<string, Profile>;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(id);
  }, []);

  const recent = state.events.slice(-40).reverse();

  return (
    <section className="flex-1 overflow-y-auto p-4">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Activity
      </h2>
      {recent.length === 0 ? (
        <p className="text-xs text-neutral-400">No activity yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {recent.map((e) => {
            const author = profiles.get(e.user_id);
            return (
              <li key={e.id} className="text-xs leading-snug text-neutral-700">
                <span className="font-medium text-neutral-900">
                  @{author?.github_username ?? 'unknown'}
                </span>{' '}
                {VERB[e.type]}{' '}
                <span className="text-neutral-400">· {relative(e.created_at, now)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
