import type { Board, BoardStatus } from './types';

/**
 * Derive a board's status from its schedule when it has one, otherwise fall
 * back to the manually-set `status` column (for boards created before dates
 * existed, or boards with no date).
 *
 * - upcoming: starts in the future
 * - current:  started, and either has no end or the end is still in the future
 * - past:     ended
 *
 * For all-day boards `ends_at` is treated as the end of its day so a board
 * dated "today" reads as current, not past.
 */
export function deriveStatus(
  board: Pick<Board, 'status' | 'starts_at' | 'ends_at' | 'all_day'>,
  now: Date = new Date(),
): BoardStatus {
  if (!board.starts_at) return board.status;

  const start = new Date(board.starts_at);
  const end = endBoundary(board, start);
  const t = now.getTime();

  if (t < start.getTime()) return 'upcoming';
  if (t > end.getTime()) return 'past';
  return 'current';
}

function endBoundary(
  board: Pick<Board, 'ends_at' | 'all_day'>,
  start: Date,
): Date {
  if (board.ends_at) {
    const end = new Date(board.ends_at);
    return board.all_day ? endOfDay(end) : end;
  }
  // No explicit end: an all-day board spans its whole day; a timed board is a point in time.
  return board.all_day ? endOfDay(start) : start;
}

function endOfDay(d: Date): Date {
  const e = new Date(d);
  e.setHours(23, 59, 59, 999);
  return e;
}

/** Relative countdown for the agenda, e.g. "today", "tomorrow", "in 3 days", "5 days ago". */
export function countdownLabel(startsAt: string, now: Date = new Date()): string {
  const start = new Date(startsAt);
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((startDay.getTime() - today.getTime()) / 86_400_000);

  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  if (days > 1) return `in ${days} days`;
  return `${-days} days ago`;
}
