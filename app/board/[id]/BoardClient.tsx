'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { insertEvent } from '@/lib/events';
import {
  applyEvent,
  applyVote,
  emptyState,
  getUserVote,
  selectLeaderboard,
  type ReducerState,
} from '@/lib/reducer';
import type { Board, BoardEvent, Profile, Vote } from '@/lib/types';
import TopBar from '@/components/TopBar';
import Canvas from '@/components/Canvas';
import Sidebar from '@/components/Sidebar';
import ReplayOverlay from '@/components/ReplayOverlay';

function cloneState(s: ReducerState): ReducerState {
  const cloned: ReducerState = {
    notes: new Map(),
    scores: new Map(s.scores),
    events: [...s.events],
    votes: new Map(s.votes),
    seenEventIds: new Set(s.seenEventIds),
    eventAuthorByNoteId: new Map(s.eventAuthorByNoteId),
    createEventByNoteId: new Map(s.createEventByNoteId),
  };
  for (const [k, v] of s.notes) cloned.notes.set(k, { ...v });
  return cloned;
}

function buildInitialState(
  events: BoardEvent[],
  votes: Vote[],
): ReducerState {
  let s = emptyState();
  for (const e of events) s = applyEvent(s, e);
  for (const v of votes) s = applyVote(s, v);
  return s;
}

function sleep(ms: number, cancelled: { current: boolean }): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (cancelled.current) return resolve();
      if (Date.now() - start >= ms) return resolve();
      setTimeout(tick, 30);
    };
    tick();
  });
}

export default function BoardClient({
  board,
  initialEvents,
  initialVotes,
  profiles,
  me,
}: {
  board: Board;
  initialEvents: BoardEvent[];
  initialVotes: Vote[];
  profiles: Profile[];
  me: Profile;
}) {
  const [state, setState] = useState<ReducerState>(() =>
    buildInitialState(initialEvents, initialVotes),
  );
  const stateRef = useRef(state);
  stateRef.current = state;

  const [profileMap, setProfileMap] = useState<Map<string, Profile>>(() => {
    const m = new Map<string, Profile>();
    for (const p of profiles) m.set(p.id, p);
    return m;
  });

  const [focusNoteId, setFocusNoteId] = useState<string | null>(null);

  const [replayState, setReplayState] = useState<ReducerState | null>(null);
  const [replayProgress, setReplayProgress] = useState<{ n: number; total: number } | null>(null);
  const replayingRef = useRef(false);
  const replayCancelRef = useRef({ current: false });
  const pendingRef = useRef<{ events: BoardEvent[]; votes: Array<{ v: Vote; deleted: boolean }> }>({
    events: [],
    votes: [],
  });

  const supabase = useMemo(() => supabaseBrowser(), []);

  const applyIncomingEvent = useCallback((e: BoardEvent) => {
    if (replayingRef.current) {
      pendingRef.current.events.push(e);
      return;
    }
    setState((prev) => {
      const next = cloneState(prev);
      return applyEvent(next, e);
    });
  }, []);

  const applyIncomingVote = useCallback((v: Vote, deleted: boolean) => {
    if (replayingRef.current) {
      pendingRef.current.votes.push({ v, deleted });
      return;
    }
    setState((prev) => {
      const next = cloneState(prev);
      return applyVote(next, v, deleted);
    });
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`board:${board.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'board_events',
          filter: `board_id=eq.${board.id}`,
        },
        (payload) => applyIncomingEvent(payload.new as BoardEvent),
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes',
          filter: `board_id=eq.${board.id}`,
        },
        (payload) => applyIncomingVote(payload.new as Vote, false),
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'votes',
          filter: `board_id=eq.${board.id}`,
        },
        (payload) => applyIncomingVote(payload.new as Vote, false),
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'votes',
          filter: `board_id=eq.${board.id}`,
        },
        (payload) => applyIncomingVote(payload.old as Vote, true),
      )
      .subscribe();

    // Refetch after subscription to close any gap (de-duped by id in reducer).
    (async () => {
      const [eventsRes, votesRes, profilesRes] = await Promise.all([
        supabase
          .from('board_events')
          .select('*')
          .eq('board_id', board.id)
          .order('created_at', { ascending: true }),
        supabase.from('votes').select('*').eq('board_id', board.id),
        supabase.from('profiles').select('*'),
      ]);
      if (eventsRes.data || votesRes.data) {
        setState((prev) => {
          let next = cloneState(prev);
          for (const e of (eventsRes.data ?? []) as BoardEvent[]) next = applyEvent(next, e);
          for (const v of (votesRes.data ?? []) as Vote[]) next = applyVote(next, v);
          return next;
        });
      }
      if (profilesRes.data) {
        setProfileMap(() => {
          const m = new Map<string, Profile>();
          for (const p of profilesRes.data as Profile[]) m.set(p.id, p);
          return m;
        });
      }
    })();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, board.id, applyIncomingEvent, applyIncomingVote]);

  const emit = useCallback(
    async (
      type: BoardEvent['type'],
      payload: BoardEvent['payload'],
    ): Promise<BoardEvent | null> => {
      try {
        const e = await insertEvent(supabase, {
          boardId: board.id,
          userId: me.id,
          type,
          payload,
        });
        setState((prev) => applyEvent(cloneState(prev), e));
        return e;
      } catch (err) {
        console.error('insertEvent failed', err);
        return null;
      }
    },
    [supabase, board.id, me.id],
  );

  const createNote = useCallback(
    (x: number, y: number) => {
      const id = crypto.randomUUID();
      setFocusNoteId(id);
      emit('create_note', { id, x, y, content: '' });
    },
    [emit],
  );

  const vote = useCallback(
    async (eventId: string, value: 1 | -1) => {
      const current = getUserVote(stateRef.current, eventId, me.id);
      // Toggle off when clicking the same direction twice.
      if (current && current.value === value) {
        await supabase.from('votes').delete().eq('id', current.id);
        setState((prev) => applyVote(cloneState(prev), current, true));
        return;
      }
      const { data, error } = await supabase
        .from('votes')
        .upsert(
          {
            event_id: eventId,
            board_id: board.id,
            user_id: me.id,
            value,
          },
          { onConflict: 'event_id,user_id' },
        )
        .select('*')
        .single();
      if (!error && data) {
        setState((prev) => applyVote(cloneState(prev), data as Vote));
      }
    },
    [supabase, board.id, me.id],
  );

  const startReplay = useCallback(async () => {
    if (replayingRef.current) return;
    const snapshot = stateRef.current;
    replayingRef.current = true;
    replayCancelRef.current = { current: false };
    pendingRef.current = { events: [], votes: [] };
    setReplayState(emptyState());
    setReplayProgress({ n: 0, total: snapshot.events.length });

    const votesByEvent = new Map<string, Vote[]>();
    for (const v of snapshot.votes.values()) {
      const arr = votesByEvent.get(v.event_id) ?? [];
      arr.push(v);
      votesByEvent.set(v.event_id, arr);
    }

    let scratch = emptyState();
    for (let i = 0; i < snapshot.events.length; i++) {
      if (replayCancelRef.current.current) break;
      const e = snapshot.events[i];
      scratch = applyEvent(cloneState(scratch), e);
      const evVotes = votesByEvent.get(e.id);
      if (evVotes) for (const v of evVotes) scratch = applyVote(scratch, v);
      setReplayState(scratch);
      setReplayProgress({ n: i + 1, total: snapshot.events.length });
      await sleep(400, replayCancelRef.current);
    }

    // Drain pending incoming events/votes into main state.
    setState((prev) => {
      let next = cloneState(prev);
      for (const e of pendingRef.current.events) next = applyEvent(next, e);
      for (const { v, deleted } of pendingRef.current.votes) next = applyVote(next, v, deleted);
      return next;
    });
    pendingRef.current = { events: [], votes: [] };
    replayingRef.current = false;
    setReplayState(null);
    setReplayProgress(null);
  }, []);

  const stopReplay = useCallback(() => {
    replayCancelRef.current.current = true;
  }, []);

  const leaderboard = useMemo(
    () => selectLeaderboard(state, profileMap),
    [state, profileMap],
  );

  const displayState = replayState ?? state;

  const topNet = useMemo(() => {
    let top = 0;
    for (const n of displayState.notes.values()) {
      const s = displayState.scores.get(n.createEventId);
      if (s && s.net > top) top = s.net;
    }
    return top;
  }, [displayState]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <TopBar board={board} me={me} state={state} profiles={profileMap} />
      <div className="flex flex-1 overflow-hidden">
        <Canvas
          state={displayState}
          profiles={profileMap}
          me={me}
          topNet={topNet}
          autoFocusId={focusNoteId}
          onCreate={createNote}
          onMove={(id, x, y) => emit('move_note', { id, x, y })}
          onEdit={(id, content) => emit('edit_note', { id, content })}
          onDelete={(id) => emit('delete_note', { id })}
          onAssign={(id, assigneeId) => emit('assign_note', { id, assigneeId })}
          onVote={vote}
          readOnly={replayingRef.current}
        />
        <Sidebar
          board={board}
          me={me}
          state={state}
          profiles={profileMap}
          leaderboard={leaderboard}
          onReplay={startReplay}
          replaying={!!replayState}
          replayProgress={replayProgress}
          onStopReplay={stopReplay}
        />
      </div>
      {replayState && replayProgress && (
        <ReplayOverlay
          n={replayProgress.n}
          total={replayProgress.total}
          onStop={stopReplay}
        />
      )}
    </div>
  );
}
