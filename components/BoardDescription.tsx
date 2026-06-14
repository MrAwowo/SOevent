'use client';

import { useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { Board, Profile } from '@/lib/types';

/**
 * Free-text notes/agenda for the event. Editable by the board owner only
 * (RLS allows board UPDATE only for the owner); everyone else sees it read-only.
 */
export default function BoardDescription({
  board,
  me,
}: {
  board: Board;
  me: Profile;
}) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const isOwner = board.owner_id === me.id;
  const [value, setValue] = useState(board.description ?? '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await supabase.from('boards').update({ description: value }).eq('id', board.id);
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="border-t border-neutral-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          About this event
        </h2>
        {isOwner && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-neutral-500 hover:underline"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
            placeholder="Agenda, links, context…"
            className="w-full rounded-md border border-neutral-300 bg-white p-2 text-xs focus:border-neutral-500 focus:outline-none"
          />
          <div className="mt-1 flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => {
                setValue(board.description ?? '');
                setEditing(false);
              }}
              className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : value ? (
        <p className="whitespace-pre-wrap text-xs text-neutral-700">{value}</p>
      ) : (
        <p className="text-xs text-neutral-400">
          {isOwner ? 'Add an agenda or context for this event.' : 'No description.'}
        </p>
      )}
    </div>
  );
}
