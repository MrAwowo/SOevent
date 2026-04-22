import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';

  if (!code) {
    return NextResponse.redirect(new URL('/?error=missing_code', url.origin));
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (user) {
    const meta = user.user_metadata ?? {};
    const username =
      meta.user_name ?? meta.preferred_username ?? meta.login ?? meta.name ?? 'anonymous';
    const avatar_url = meta.avatar_url ?? null;
    await supabase.from('profiles').upsert(
      { id: user.id, github_username: username, avatar_url },
      { onConflict: 'id' },
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
