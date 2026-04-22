import type { SupabaseClient } from '@supabase/supabase-js';
import type { BoardEvent, EventType, NotePayload } from './types';

function canonicalize(e: {
  board_id: string;
  user_id: string;
  type: EventType;
  payload: NotePayload;
  created_at: string;
  prev_hash: string | null;
}): string {
  const p = e.payload;
  return [
    e.board_id,
    e.user_id,
    e.type,
    p.id,
    p.x ?? '',
    p.y ?? '',
    p.content ?? '',
    e.created_at,
    e.prev_hash ?? '',
  ].join('|');
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function shortHash(h: string | null | undefined): string {
  if (!h) return '';
  return h.slice(0, 7);
}

/**
 * Insert an event with a tamper-evident hash chain.
 *
 * Why the retry loop: a unique index on (board_id, prev_hash) means two
 * concurrent writers chaining off the same tail get 23505. The loser retries
 * against the new tail. Keeps the chain a single line, not a fork.
 */
export async function insertEvent(
  supabase: SupabaseClient,
  args: {
    boardId: string;
    userId: string;
    type: EventType;
    payload: NotePayload;
  },
): Promise<BoardEvent> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data: tail, error: tailErr } = await supabase
      .from('board_events')
      .select('event_hash')
      .eq('board_id', args.boardId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (tailErr) throw tailErr;

    const prev_hash = tail?.event_hash ?? null;
    const created_at = new Date().toISOString();
    const event_hash = await sha256Hex(
      canonicalize({
        board_id: args.boardId,
        user_id: args.userId,
        type: args.type,
        payload: args.payload,
        created_at,
        prev_hash,
      }),
    );

    const { data, error } = await supabase
      .from('board_events')
      .insert({
        board_id: args.boardId,
        user_id: args.userId,
        type: args.type,
        payload: args.payload,
        created_at,
        prev_hash,
        event_hash,
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') continue;
      throw error;
    }
    return data as BoardEvent;
  }
  throw new Error('hash chain retry exhausted');
}

export async function verifyEventHash(e: BoardEvent): Promise<boolean> {
  if (!e.event_hash || e.event_hash === 'pending') return false;
  const h = await sha256Hex(
    canonicalize({
      board_id: e.board_id,
      user_id: e.user_id,
      type: e.type,
      payload: e.payload,
      created_at: e.created_at,
      prev_hash: e.prev_hash,
    }),
  );
  return h === e.event_hash;
}
