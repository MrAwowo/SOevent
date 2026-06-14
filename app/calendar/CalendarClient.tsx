'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { deriveStatus, countdownLabel } from '@/lib/board-status';
import type { Board, BoardStatus } from '@/lib/types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CHIP_CLASS: Record<BoardStatus, string> = {
  upcoming: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  current: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
  past: 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300',
};

/** Local yyyy-mm-dd key for a date (used to bucket boards onto calendar days). */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function CalendarClient({
  boards,
  createBoard,
  signedIn,
}: {
  boards: Board[];
  createBoard: (formData: FormData) => void | Promise<void>;
  signedIn: boolean;
}) {
  const now = useMemo(() => new Date(), []);
  const [view, setView] = useState(() => ({ year: now.getFullYear(), month: now.getMonth() }));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Bucket dated boards by their local day.
  const boardsByDay = useMemo(() => {
    const map = new Map<string, Board[]>();
    for (const b of boards) {
      if (!b.starts_at) continue;
      const key = dayKey(new Date(b.starts_at));
      const arr = map.get(key) ?? [];
      arr.push(b);
      map.set(key, arr);
    }
    return map;
  }, [boards]);

  // Upcoming agenda: dated boards that haven't ended, soonest first.
  const agenda = useMemo(() => {
    return boards
      .filter((b) => b.starts_at && deriveStatus(b, now) !== 'past')
      .sort((a, b) => (a.starts_at! < b.starts_at! ? -1 : 1))
      .slice(0, 10);
  }, [boards, now]);

  // 6-week grid starting on the Sunday on/before the 1st of the viewed month.
  const cells = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [view]);

  const todayKey = dayKey(now);

  const goMonth = (delta: number) =>
    setView((v) => {
      const m = v.month + delta;
      return { year: v.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Month grid */}
      <div className="flex-1">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">
            {MONTHS[view.month]} {view.year}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goMonth(-1)}
              className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-sm hover:bg-neutral-50"
              aria-label="Previous month"
            >
              ←
            </button>
            <button
              onClick={() => setView({ year: now.getFullYear(), month: now.getMonth() })}
              className="rounded-md border border-neutral-300 bg-white px-3 py-1 text-sm hover:bg-neutral-50"
            >
              Today
            </button>
            <button
              onClick={() => goMonth(1)}
              className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-sm hover:bg-neutral-50"
              aria-label="Next month"
            >
              →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 overflow-hidden rounded-md border border-neutral-200 bg-white">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="border-b border-neutral-200 bg-neutral-50 px-2 py-1.5 text-center text-xs font-medium text-neutral-500"
            >
              {d}
            </div>
          ))}
          {cells.map((d, i) => {
            const key = dayKey(d);
            const inMonth = d.getMonth() === view.month;
            const dayBoards = boardsByDay.get(key) ?? [];
            const isToday = key === todayKey;
            return (
              <button
                key={i}
                onClick={() => signedIn && setSelectedDay(selectedDay === key ? null : key)}
                className={
                  'min-h-[92px] border-b border-r border-neutral-100 p-1 text-left align-top ' +
                  (inMonth ? 'bg-white' : 'bg-neutral-50/60') +
                  (signedIn ? ' hover:bg-amber-50' : ' cursor-default') +
                  (selectedDay === key ? ' ring-2 ring-inset ring-amber-300' : '')
                }
              >
                <div
                  className={
                    'mb-1 flex h-5 w-5 items-center justify-center rounded-full text-xs ' +
                    (isToday ? 'bg-neutral-900 text-white' : 'text-neutral-500')
                  }
                >
                  {d.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayBoards.slice(0, 3).map((b) => (
                    <Link
                      key={b.id}
                      href={`/board/${b.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className={
                        'block truncate rounded px-1 py-0.5 text-[11px] font-medium ' +
                        CHIP_CLASS[deriveStatus(b, now)]
                      }
                    >
                      {b.title}
                    </Link>
                  ))}
                  {dayBoards.length > 3 && (
                    <div className="px-1 text-[10px] text-neutral-400">
                      +{dayBoards.length - 3} more
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Inline create for the selected day */}
        {signedIn && selectedDay && (
          <form
            action={createBoard}
            className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-amber-200 bg-amber-50 p-3"
          >
            <input type="hidden" name="starts_at" value={selectedDay} />
            <label className="flex-1 min-w-[220px]">
              <span className="mb-1 block text-xs text-neutral-500">
                New event on {selectedDay}
              </span>
              <input
                name="title"
                required
                maxLength={80}
                autoFocus
                placeholder="Event title"
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none"
              />
            </label>
            <button
              type="submit"
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Create
            </button>
          </form>
        )}
      </div>

      {/* Coming up agenda */}
      <aside className="lg:w-72 lg:shrink-0">
        <h2 className="mb-3 text-lg font-medium">Coming up</h2>
        <ul className="space-y-2">
          {agenda.length === 0 && (
            <li className="rounded-md border border-neutral-200 bg-white px-3 py-4 text-sm text-neutral-400">
              Nothing scheduled. Click a day to add an event.
            </li>
          )}
          {agenda.map((b) => {
            const status = deriveStatus(b, now);
            const label = countdownLabel(b.starts_at!, now);
            const soon = status === 'upcoming' && (label === 'today' || label === 'tomorrow');
            return (
              <li key={b.id}>
                <Link
                  href={`/board/${b.id}`}
                  className="block rounded-md border border-neutral-200 bg-white px-3 py-2 hover:bg-neutral-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{b.title}</span>
                    <span
                      className={
                        'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ' +
                        (soon ? 'bg-red-100 text-red-700' : CHIP_CLASS[status])
                      }
                    >
                      {label}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-neutral-500">
                    {new Date(b.starts_at!).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}
