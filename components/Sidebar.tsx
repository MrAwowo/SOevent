'use client';

import type { Profile } from '@/lib/types';
import type { ReducerState } from '@/lib/reducer';
import Leaderboard from './Leaderboard';
import ActivityFeed from './ActivityFeed';
import ReplayControls from './ReplayControls';

export default function Sidebar({
  state,
  profiles,
  leaderboard,
  onReplay,
  replaying,
  replayProgress,
  onStopReplay,
}: {
  state: ReducerState;
  profiles: Map<string, Profile>;
  leaderboard: Array<{ profile: Profile; score: number }>;
  onReplay: () => void;
  replaying: boolean;
  replayProgress: { n: number; total: number } | null;
  onStopReplay: () => void;
}) {
  return (
    <aside className="hidden w-80 shrink-0 flex-col border-l border-neutral-200 bg-white md:flex">
      <ReplayControls
        onReplay={onReplay}
        replaying={replaying}
        progress={replayProgress}
        onStop={onStopReplay}
      />
      <Leaderboard entries={leaderboard} />
      <ActivityFeed state={state} profiles={profiles} />
    </aside>
  );
}
