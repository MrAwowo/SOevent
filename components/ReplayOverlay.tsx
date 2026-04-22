'use client';

export default function ReplayOverlay({
  n,
  total,
  onStop,
}: {
  n: number;
  total: number;
  onStop: () => void;
}) {
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-neutral-200 bg-white px-4 py-2 shadow-lg">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Replay
        </span>
        <span className="font-mono text-xs tabular-nums text-neutral-700">
          {n} / {total}
        </span>
        <button
          onClick={onStop}
          className="rounded-md bg-neutral-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-neutral-800"
        >
          Stop
        </button>
      </div>
    </div>
  );
}
