import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">That board doesn&apos;t exist.</p>
      <Link href="/" className="mt-6 inline-block text-sm text-neutral-800 underline dark:text-neutral-200">
        ← Back home
      </Link>
    </main>
  );
}
