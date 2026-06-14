'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { deriveStatus, countdownLabel } from '@/lib/board-status';
import type { Board } from '@/lib/types';

/**
 * In-app alerts for imminent events (today / tomorrow), plus an optional
 * browser-notification opt-in that fires reminders while a tab is open.
 *
 * Note: true background reminders (email / push when the app is closed) need a
 * server-side scheduler (Supabase Edge Function + cron) — see README. This is
 * the client-only, best-effort version.
 */
export default function EventAlerts({ boards }: { boards: Board[] }) {
  const now = useMemo(() => new Date(), []);
  const [dismissed, setDismissed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    'default',
  );

  const soon = useMemo(
    () =>
      boards
        .filter((b) => {
          if (!b.starts_at || deriveStatus(b, now) !== 'upcoming') return false;
          const label = countdownLabel(b.starts_at, now);
          return label === 'today' || label === 'tomorrow';
        })
        .sort((a, b) => (a.starts_at! < b.starts_at! ? -1 : 1)),
    [boards, now],
  );

  useEffect(() => {
    setPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  }, []);

  // Schedule best-effort browser notifications for soon events (tab must stay open).
  useEffect(() => {
    if (permission !== 'granted') return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const b of soon) {
      const delay = new Date(b.starts_at!).getTime() - Date.now();
      if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
        timers.push(
          setTimeout(() => {
            new Notification('SOevent — happening now', { body: b.title });
          }, delay),
        );
      }
    }
    return () => timers.forEach(clearTimeout);
  }, [permission, soon]);

  const enableReminders = async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted' && soon.length > 0) {
      new Notification('SOevent reminders on', {
        body: `${soon.length} event${soon.length === 1 ? '' : 's'} coming up soon.`,
      });
    }
  };

  if (soon.length === 0 || dismissed) return null;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
      <span className="font-medium text-amber-900">
        🔔 {soon.length} event{soon.length === 1 ? '' : 's'} coming up:
      </span>
      <span className="flex flex-wrap gap-2">
        {soon.slice(0, 4).map((b) => (
          <Link
            key={b.id}
            href={`/board/${b.id}`}
            className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-amber-800 shadow-sm hover:bg-amber-100"
          >
            {b.title} · {countdownLabel(b.starts_at!, now)}
          </Link>
        ))}
      </span>
      <span className="ml-auto flex items-center gap-3">
        {permission === 'default' && (
          <button onClick={enableReminders} className="text-xs text-amber-800 hover:underline">
            Enable reminders
          </button>
        )}
        {permission === 'granted' && (
          <span className="text-xs text-amber-700">Reminders on</span>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="text-xs text-amber-700 hover:underline"
          aria-label="Dismiss"
        >
          Dismiss
        </button>
      </span>
    </div>
  );
}
