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
  autoFocus,
  assignee,
  assignableProfiles,
  onDragStart,
  onEdit,
  onDelete,
  onVote,
  onAssign,
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
  autoFocus?: boolean;
  assignee?: Profile;
  assignableProfiles: Profile[];
  onDragStart: (e: React.PointerEvent) => void;
  onEdit: (content: string) => void;
  onDelete: () => void;
  onVote: (v: 1 | -1) => void;
  onAssign: (assigneeId: string | null) => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const lastContentRef = useRef(note.content);

  useEffect(() => {
    if (!editing && contentRef.current && contentRef.current.innerText !== note.content) {
      contentRef.current.innerText = note.content;
      lastContentRef.current = note.content;
    }
  }, [note.content, editing]);

  // Focus a freshly-created note (via "N" or +) so the user can type immediately.
  const didAutoFocus = useRef(false);
  useEffect(() => {
    if (autoFocus && !readOnly && !didAutoFocus.current && contentRef.current) {
      didAutoFocus.current = true;
      contentRef.current.focus();
    }
  }, [autoFocus, readOnly]);

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
        <div className="flex items-center gap-1">
          {/* Assignee picker — who is responsible for this note (separate from author). */}
          <div
            className="relative"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              disabled={readOnly}
              onClick={() => setPickerOpen((o) => !o)}
              title={assignee ? `Assigned to @${assignee.github_username}` : 'Assign to someone'}
              aria-label="Assign note"
              className="flex items-center gap-0.5 rounded px-0.5 py-0.5 hover:bg-yellow-200 disabled:cursor-default disabled:hover:bg-transparent"
            >
              {assignee ? (
                <Avatar profile={assignee} size={18} link={false} />
              ) : (
                <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-dashed border-neutral-400 text-[10px] text-neutral-400">
                  +
                </span>
              )}
            </button>
            {pickerOpen && !readOnly && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setPickerOpen(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-1 max-h-48 w-44 overflow-auto rounded-md border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
                  <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                    Assign to
                  </div>
                  {note.assigneeId && (
                    <button
                      onClick={() => {
                        onAssign(null);
                        setPickerOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-2 py-1 text-left text-xs text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
                    >
                      Unassign
                    </button>
                  )}
                  {assignableProfiles.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onAssign(p.id);
                        setPickerOpen(false);
                      }}
                      className={
                        'flex w-full items-center gap-2 px-2 py-1 text-left text-xs hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700 ' +
                        (p.id === note.assigneeId ? 'font-medium' : '')
                      }
                    >
                      <Avatar profile={p} size={16} link={false} />
                      <span className="truncate">@{p.github_username}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <span
            title={`event_hash: ${note.lastEventHash}\nprev_hash: ${note.prevHash ?? '(genesis)'}`}
            className="rounded bg-yellow-50 px-1.5 py-0.5 font-mono text-[10px] tracking-tight text-neutral-600"
          >
            #{shortHash(note.lastEventHash) || '…'}
          </span>
        </div>
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
