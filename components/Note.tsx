'use client';

import { useEffect, useRef, useState } from 'react';
import type { Note, Profile } from '@/lib/types';
import { shortHash } from '@/lib/events';
import Avatar from './Avatar';

export default function NoteCard({
  note,
  x,
  y,
  author,
  isMine,
  score,
  userVote,
  isTop,
  width,
  height,
  readOnly,
  onDragStart,
  onEdit,
  onDelete,
  onVote,
}: {
  note: Note;
  x: number;
  y: number;
  author?: Profile;
  isMine: boolean;
  score: number;
  userVote: 1 | -1 | null;
  isTop: boolean;
  width: number;
  height: number;
  readOnly: boolean;
  onDragStart: (e: React.PointerEvent) => void;
  onEdit: (content: string) => void;
  onDelete: () => void;
  onVote: (v: 1 | -1) => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const lastContentRef = useRef(note.content);

  useEffect(() => {
    if (!editing && contentRef.current && contentRef.current.innerText !== note.content) {
      contentRef.current.innerText = note.content;
      lastContentRef.current = note.content;
    }
  }, [note.content, editing]);

  const commit = () => {
    setEditing(false);
    const next = contentRef.current?.innerText ?? '';
    if (next !== lastContentRef.current) {
      lastContentRef.current = next;
      onEdit(next);
    }
  };

  return (
    <div
      data-note
      className={
        'absolute rounded-md bg-yellow-100 ' +
        (isTop ? 'note-shadow-top' : 'note-shadow') +
        ' transition-shadow'
      }
      style={{
        left: x,
        top: y,
        width,
        height,
        transform: 'rotate(-0.4deg)',
      }}
    >
      <div
        onPointerDown={onDragStart}
        className={
          'flex items-center justify-between gap-2 rounded-t-md px-2 py-1.5 ' +
          (readOnly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing') +
          ' bg-yellow-200/60'
        }
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          <Avatar profile={author} size={18} />
          <span className="truncate text-[11px] font-medium text-neutral-800">
            @{author?.github_username ?? 'unknown'}
          </span>
        </div>
        <span
          title={`event_hash: ${note.lastEventHash}\nprev_hash: ${note.prevHash ?? '(genesis)'}`}
          className="rounded bg-yellow-50 px-1.5 py-0.5 font-mono text-[10px] tracking-tight text-neutral-600"
        >
          #{shortHash(note.lastEventHash) || '…'}
        </span>
      </div>
      <div
        ref={contentRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onFocus={() => setEditing(true)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            (e.target as HTMLElement).blur();
          }
        }}
        className="h-[calc(100%-60px)] overflow-auto whitespace-pre-wrap break-words px-3 py-2 text-[13px] leading-snug text-neutral-900"
      >
        {note.content}
      </div>
      <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between gap-1 px-1">
        <div className="flex items-center gap-0.5">
          <button
            disabled={readOnly}
            onClick={() => onVote(1)}
            className={
              'rounded px-1.5 py-0.5 text-xs ' +
              (userVote === 1
                ? 'bg-green-200 text-green-900'
                : 'text-neutral-600 hover:bg-yellow-200')
            }
            aria-label="Upvote"
          >
            ▲
          </button>
          <span
            className={
              'min-w-[1.5rem] text-center font-mono text-xs tabular-nums ' +
              (score > 0 ? 'text-green-700' : score < 0 ? 'text-red-700' : 'text-neutral-600')
            }
          >
            {score}
          </span>
          <button
            disabled={readOnly}
            onClick={() => onVote(-1)}
            className={
              'rounded px-1.5 py-0.5 text-xs ' +
              (userVote === -1
                ? 'bg-red-200 text-red-900'
                : 'text-neutral-600 hover:bg-yellow-200')
            }
            aria-label="Downvote"
          >
            ▼
          </button>
        </div>
        {isMine && !readOnly && (
          <button
            onClick={onDelete}
            className="rounded px-1.5 py-0.5 text-[10px] text-neutral-500 hover:bg-yellow-200 hover:text-red-700"
            aria-label="Delete note"
          >
            delete
          </button>
        )}
      </div>
    </div>
  );
}
