'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { BoardAttachment, Profile } from '@/lib/types';
import Avatar from './Avatar';

const BUCKET = 'attachments';

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Attachments({
  boardId,
  me,
  profiles,
}: {
  boardId: string;
  me: Profile;
  profiles: Map<string, Profile>;
}) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [items, setItems] = useState<BoardAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from('board_attachments')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: false });
    if (data) setItems(data as BoardAttachment[]);
  }, [supabase, boardId]);

  useEffect(() => {
    refetch();
    const channel = supabase
      .channel(`attachments:${boardId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'board_attachments', filter: `board_id=eq.${boardId}` },
        () => refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, boardId, refetch]);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, '_');
      const path = `${boardId}/${crypto.randomUUID()}-${safeName}`;
      const up = await supabase.storage.from(BUCKET).upload(path, file);
      if (up.error) throw up.error;
      const ins = await supabase.from('board_attachments').insert({
        board_id: boardId,
        user_id: me.id,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
      });
      if (ins.error) throw ins.error;
      await refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(
        /bucket|not found/i.test(msg)
          ? 'Upload failed — create a public "attachments" bucket in Supabase Storage.'
          : msg,
      );
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onDelete = async (a: BoardAttachment) => {
    await supabase.storage.from(BUCKET).remove([a.file_path]);
    await supabase.from('board_attachments').delete().eq('id', a.id);
    await refetch();
  };

  const publicUrl = (path: string) =>
    supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  return (
    <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Files
        </h2>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
        >
          {busy ? 'Uploading…' : '+ Upload'}
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={onPick} />
      </div>

      {error && <p className="mb-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

      {items.length === 0 ? (
        <p className="text-xs text-neutral-400 dark:text-neutral-500">No files yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((a) => {
            const uploader = profiles.get(a.user_id);
            return (
              <li key={a.id} className="flex items-center gap-2">
                <Avatar profile={uploader} size={18} />
                <a
                  href={publicUrl(a.file_path)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 truncate text-xs text-neutral-800 hover:underline dark:text-neutral-200"
                  title={a.file_name}
                >
                  {a.file_name}
                </a>
                <span className="shrink-0 text-[10px] text-neutral-400">
                  {formatSize(a.file_size)}
                </span>
                {a.user_id === me.id && (
                  <button
                    onClick={() => onDelete(a)}
                    className="shrink-0 text-[10px] text-neutral-400 hover:text-red-600"
                    aria-label="Delete file"
                  >
                    ✕
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
