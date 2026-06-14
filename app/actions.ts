'use server';

import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { deriveStatus } from '@/lib/board-status';

/**
 * Create a board / calendar event. Date inputs are all-day (yyyy-mm-dd) and are
 * anchored to local noon so the day reads back stably across time zones. Status
 * is derived from the dates. Redirects to the new board on success.
 */
export async function createBoard(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  const startsRaw = String(formData.get('starts_at') ?? '').trim();
  const endsRaw = String(formData.get('ends_at') ?? '').trim();
  if (!title) return;

  const starts_at = startsRaw ? new Date(`${startsRaw}T12:00:00`).toISOString() : null;
  const ends_at = endsRaw ? new Date(`${endsRaw}T12:00:00`).toISOString() : null;
  const status = deriveStatus({ status: 'current', starts_at, ends_at, all_day: true });

  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return;
  const { data, error } = await supabase
    .from('boards')
    .insert({ title, status, starts_at, ends_at, all_day: true, owner_id: user.id })
    .select('id')
    .single();
  if (error || !data) return;
  redirect(`/board/${data.id}`);
}
