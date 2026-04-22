'use client';

export default function ReplayControls({
  onReplay,
  replaying,
  progress,
  onStop,
}: {
  onReplay: () => void;
  replaying: boolean;
  progress: { n: number; total: number } | null;
  onStop: () => void;
}) {
  return (
    <section className="border-b border-neutral-200 p-4">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Replay
      </h2>
      {replaying && progress ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-neutral-700">
            <span>
              {progress.n} / {progress.total}
            </span>
            <button
              onClick={onStop}
              className="rounded-md bg-neutral-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-neutral-800"
            >
              Stop
            </button>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded bg-neutral-200">
            <div
              className="h-full bg-neutral-800 transition-all"
              style={{
                width: `${progress.total === 0 ? 0 : (progress.n / progress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      ) : (
        <button
          onClick={onReplay}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
        >
          ▶ Replay board history
        </button>
      )}
    </section>
  );
}
