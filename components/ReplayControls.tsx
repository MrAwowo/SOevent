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
    <section className="border-b border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Replay
      </h2>
      {replaying && progress ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-neutral-700 dark:text-neutral-300">
            <span>
              {progress.n} / {progress.total}
            </span>
            <button
              onClick={onStop}
              className="rounded-md bg-neutral-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Stop
            </button>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded bg-neutral-200 dark:bg-neutral-700">
            <div
              className="h-full bg-neutral-800 transition-all dark:bg-neutral-300"
              style={{
                width: `${progress.total === 0 ? 0 : (progress.n / progress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      ) : (
        <button
          onClick={onReplay}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
        >
          ▶ Replay board history
        </button>
      )}
    </section>
  );
}
