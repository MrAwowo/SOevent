import Image from 'next/image';
import Link from 'next/link';
import type { Profile } from '@/lib/types';

function initials(name?: string): string {
  if (!name) return '??';
  return name.slice(0, 2).toUpperCase();
}

export default function Avatar({
  profile,
  size = 24,
  link = true,
}: {
  profile?: Profile;
  size?: number;
  link?: boolean;
}) {
  const inner = profile?.avatar_url ? (
    <Image
      src={profile.avatar_url}
      alt={`@${profile.github_username}`}
      width={size}
      height={size}
      className="rounded-full"
      unoptimized
    />
  ) : (
    <div
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.4) }}
      className="flex items-center justify-center rounded-full bg-neutral-300 font-medium text-neutral-700"
      aria-label={profile?.github_username ?? 'unknown'}
    >
      {initials(profile?.github_username)}
    </div>
  );
  if (link && profile?.github_username) {
    return (
      <Link
        href={`/u/${profile.github_username}`}
        className="inline-block hover:opacity-80"
        aria-label={`@${profile.github_username} profile`}
      >
        {inner}
      </Link>
    );
  }
  return inner;
}
