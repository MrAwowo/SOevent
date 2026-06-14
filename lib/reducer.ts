import type { BoardEvent, Note, Profile, Score, Vote } from './types';

export interface ReducerState {
  notes: Map<string, Note>;
  scores: Map<string, Score>;
  events: BoardEvent[];
  votes: Map<string, Vote>;
  seenEventIds: Set<string>;
  eventAuthorByNoteId: Map<string, string>;
  createEventByNoteId: Map<string, string>;
}

export function emptyState(): ReducerState {
  return {
    notes: new Map(),
    scores: new Map(),
    events: [],
    votes: new Map(),
    seenEventIds: new Set(),
    eventAuthorByNoteId: new Map(),
    createEventByNoteId: new Map(),
  };
}

function insertEventSorted(events: BoardEvent[], e: BoardEvent) {
  let i = events.length;
  while (i > 0 && events[i - 1].created_at > e.created_at) i--;
  events.splice(i, 0, e);
}

export function applyEvent(state: ReducerState, e: BoardEvent): ReducerState {
  if (state.seenEventIds.has(e.id)) return state;
  state.seenEventIds.add(e.id);
  insertEventSorted(state.events, e);

  const p = e.payload;
  switch (e.type) {
    case 'create_note': {
      if (p.x == null || p.y == null) break;
      state.notes.set(p.id, {
        id: p.id,
        x: p.x,
        y: p.y,
        content: p.content ?? '',
        authorId: e.user_id,
        assigneeId: p.assigneeId ?? null,
        createEventId: e.id,
        createdAt: e.created_at,
        lastEventHash: e.event_hash,
        prevHash: e.prev_hash,
      });
      state.eventAuthorByNoteId.set(p.id, e.user_id);
      state.createEventByNoteId.set(p.id, e.id);
      break;
    }
    case 'move_note': {
      const n = state.notes.get(p.id);
      if (n && p.x != null && p.y != null) {
        n.x = p.x;
        n.y = p.y;
        n.lastEventHash = e.event_hash;
      }
      break;
    }
    case 'edit_note': {
      const n = state.notes.get(p.id);
      if (n && p.content != null) {
        n.content = p.content;
        n.lastEventHash = e.event_hash;
      }
      break;
    }
    case 'assign_note': {
      const n = state.notes.get(p.id);
      if (n) {
        n.assigneeId = p.assigneeId ?? null;
        n.lastEventHash = e.event_hash;
      }
      break;
    }
    case 'delete_note': {
      state.notes.delete(p.id);
      break;
    }
  }
  return state;
}

export function applyVote(
  state: ReducerState,
  v: Vote,
  deleted = false,
): ReducerState {
  const prev = state.votes.get(v.id);
  if (deleted) {
    if (prev) {
      const s = state.scores.get(prev.event_id);
      if (s) {
        if (prev.value === 1) s.up = Math.max(0, s.up - 1);
        else s.down = Math.max(0, s.down - 1);
        s.net = s.up - s.down;
      }
      state.votes.delete(v.id);
    }
    return state;
  }
  if (prev && prev.value === v.value) {
    state.votes.set(v.id, v);
    return state;
  }
  const s = state.scores.get(v.event_id) ?? { up: 0, down: 0, net: 0 };
  if (prev) {
    if (prev.value === 1) s.up = Math.max(0, s.up - 1);
    else s.down = Math.max(0, s.down - 1);
  }
  if (v.value === 1) s.up += 1;
  else s.down += 1;
  s.net = s.up - s.down;
  state.scores.set(v.event_id, s);
  state.votes.set(v.id, v);
  return state;
}

export function selectLeaderboard(
  state: ReducerState,
  profiles: Map<string, Profile>,
): Array<{ profile: Profile; score: number }> {
  const netByUser = new Map<string, number>();
  for (const e of state.events) {
    const s = state.scores.get(e.id);
    if (!s) continue;
    netByUser.set(e.user_id, (netByUser.get(e.user_id) ?? 0) + s.net);
  }
  // Ensure every profile (any author) shows up, even with 0.
  for (const userId of state.eventAuthorByNoteId.values()) {
    if (!netByUser.has(userId)) netByUser.set(userId, 0);
  }
  const out: Array<{ profile: Profile; score: number }> = [];
  for (const [userId, score] of netByUser) {
    const profile = profiles.get(userId);
    if (profile) out.push({ profile, score });
  }
  out.sort((a, b) => b.score - a.score || a.profile.github_username.localeCompare(b.profile.github_username));
  return out;
}

export function getUserVote(
  state: ReducerState,
  eventId: string,
  userId: string,
): Vote | undefined {
  for (const v of state.votes.values()) {
    if (v.event_id === eventId && v.user_id === userId) return v;
  }
  return undefined;
}
