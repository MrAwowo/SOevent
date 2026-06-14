'use client';

import type { Board, Profile } from '@/lib/types';
import type { ReducerState } from '@/lib/reducer';
import Leaderboard from './Leaderboard';
import ActivityFeed from './ActivityFeed';
import ReplayControls from './ReplayControls';
import Attachments from './Attachments';
import BoardDescription from './BoardDescription';

export default function Sidebar({
  board,
  me,
  state,
  profiles,
  leaderboard,
  onReplay,
  replaying,
  replayProgress,
  onStopReplay,
}: {
  board: Board;
  me: Profile;
  state: ReducerState;
  profiles: Map<string, Profile>;
  leaderboard: Array<{ profile: Profile; score: number }>;
  onReplay: () => void;
  replaying: boolean;
  replayProgress: { n: number; total: number } | null;
  onStopReplay: () => void;
}) {
  return (
    <aside className="hidden w-80 shrink-0 flex-col overflow-y-auto border-l border-neutral-200 bg-white md:flex">
      <ReplayControls
        onReplay={onReplay}
        replaying={replaying}
        progress={replayProgress}
        onStop={onStopReplay}
      />
      <Leaderboard entries={leaderboard} />
      <BoardDescription board={board} me={me} />
      <Attachments boardId={board.id} me={me} profiles={profiles} />
      <ActivityFeed state={state} profiles={profiles} />
    </aside>
  );
}
