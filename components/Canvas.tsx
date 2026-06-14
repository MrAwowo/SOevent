'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Profile } from '@/lib/types';
import type { ReducerState } from '@/lib/reducer';
import { getUserVote } from '@/lib/reducer';
import Note from './Note';

const NOTE_W = 200;
const NOTE_H = 160;

export default function Canvas({
  state,
  profiles,
  me,
  topNet,
  autoFocusId,
  onCreate,
  onMove,
  onEdit,
  onDelete,
  onVote,
  onAssign,
  readOnly,
}: {
  state: ReducerState;
  profiles: Map<string, Profile>;
  me: Profile;
  topNet: number;
  autoFocusId: string | null;
  onCreate: (x: number, y: number) => void;
  onMove: (id: string, x: number, y: number) => void;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onVote: (eventId: string, value: 1 | -1) => void;
  onAssign: (id: string, assigneeId: string | null) => void;
  readOnly: boolean;
}) {
  const assignableProfiles = [...profiles.values()].sort((a, b) =>
    a.github_username.localeCompare(b.github_username),
  );
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [previewPos, setPreviewPos] = useState<{ id: string; x: number; y: number } | null>(null);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (readOnly) return;
      if ((e.target as HTMLElement).closest('[data-note]')) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.max(0, e.clientX - rect.left - NOTE_W / 2);
      const y = Math.max(0, e.clientY - rect.top - 20);
      onCreate(Math.round(x), Math.round(y));
    },
    [onCreate, readOnly],
  );

  // Create a note in the middle of the currently-visible canvas area.
  const createAtCenter = useCallback(() => {
    if (readOnly) return;
    const el = canvasRef.current;
    if (!el) return;
    const x = Math.max(0, Math.round(el.scrollLeft + el.clientWidth / 2 - NOTE_W / 2));
    const y = Math.max(0, Math.round(el.scrollTop + el.clientHeight / 2 - NOTE_H / 2));
    onCreate(x, y);
  }, [onCreate, readOnly]);

  // Press "N" anywhere on the board to drop a new note (unless typing).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'n' && e.key !== 'N') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.isContentEditable ||
          t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.tagName === 'SELECT')
      ) {
        return;
      }
      e.preventDefault();
      createAtCenter();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [createAtCenter]);

  const handleDragStart = useCallback(
    (id: string, e: React.PointerEvent) => {
      if (readOnly) return;
      const note = state.notes.get(id);
      if (!note) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      dragOffsetRef.current = {
        dx: e.clientX - rect.left - note.x,
        dy: e.clientY - rect.top - note.y,
      };
      setDragId(id);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [state.notes, readOnly],
  );

  const handleDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragId) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.max(0, Math.round(e.clientX - rect.left - dragOffsetRef.current.dx));
      const y = Math.max(0, Math.round(e.clientY - rect.top - dragOffsetRef.current.dy));
      setPreviewPos({ id: dragId, x, y });
    },
    [dragId],
  );

  const handleDragEnd = useCallback(() => {
    if (!dragId) return;
    if (previewPos && previewPos.id === dragId) {
      const note = state.notes.get(dragId);
      if (note && (note.x !== previewPos.x || note.y !== previewPos.y)) {
        onMove(dragId, previewPos.x, previewPos.y);
      }
    }
    setDragId(null);
    setPreviewPos(null);
  }, [dragId, previewPos, state.notes, onMove]);

  return (
    <div
      ref={canvasRef}
      className="relative flex-1 overflow-auto bg-[var(--color-canvas)]"
      onDoubleClick={handleDoubleClick}
      onPointerMove={handleDragMove}
      onPointerUp={handleDragEnd}
      onPointerCancel={handleDragEnd}
      style={{
        backgroundImage:
          'radial-gradient(circle, #d6d3d0 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {state.notes.size === 0 && !readOnly && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-neutral-400">
            Press <kbd className="rounded border border-neutral-300 bg-white px-1 font-mono">N</kbd>{' '}
            or double-click anywhere to add a sticky note
          </p>
        </div>
      )}
      {[...state.notes.values()].map((note) => {
        const pos =
          dragId === note.id && previewPos ? previewPos : { x: note.x, y: note.y };
        const author = profiles.get(note.authorId);
        const assignee = note.assigneeId ? profiles.get(note.assigneeId) : undefined;
        const score = state.scores.get(note.createEventId) ?? { up: 0, down: 0, net: 0 };
        const userVote = getUserVote(state, note.createEventId, me.id);
        const isTop = topNet >= 2 && score.net === topNet;
        return (
          <Note
            key={note.id}
            note={note}
            x={pos.x}
            y={pos.y}
            author={author}
            isMine={note.authorId === me.id}
            score={score.net}
            userVote={userVote?.value ?? null}
            isTop={isTop}
            width={NOTE_W}
            height={NOTE_H}
            readOnly={readOnly}
            autoFocus={note.id === autoFocusId}
            assignee={assignee}
            assignableProfiles={assignableProfiles}
            onDragStart={(e) => handleDragStart(note.id, e)}
            onEdit={(content) => onEdit(note.id, content)}
            onDelete={() => onDelete(note.id)}
            onVote={(v) => onVote(note.createEventId, v)}
            onAssign={(assigneeId) => onAssign(note.id, assigneeId)}
          />
        );
      })}
      {!readOnly && (
        <button
          onClick={createAtCenter}
          title="Add note (N)"
          aria-label="Add note"
          className="fixed bottom-5 right-5 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-2xl leading-none text-white shadow-lg hover:bg-neutral-800 md:right-[88px]"
        >
          +
        </button>
      )}
    </div>
  );
}
