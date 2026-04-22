'use client';

import { useCallback, useRef, useState } from 'react';
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
  onCreate,
  onMove,
  onEdit,
  onDelete,
  onVote,
  readOnly,
}: {
  state: ReducerState;
  profiles: Map<string, Profile>;
  me: Profile;
  topNet: number;
  onCreate: (x: number, y: number) => void;
  onMove: (id: string, x: number, y: number) => void;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onVote: (eventId: string, value: 1 | -1) => void;
  readOnly: boolean;
}) {
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
          <p className="text-sm text-neutral-400">Double-click anywhere to add a sticky note</p>
        </div>
      )}
      {[...state.notes.values()].map((note) => {
        const pos =
          dragId === note.id && previewPos ? previewPos : { x: note.x, y: note.y };
        const author = profiles.get(note.authorId);
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
            onDragStart={(e) => handleDragStart(note.id, e)}
            onEdit={(content) => onEdit(note.id, content)}
            onDelete={() => onDelete(note.id)}
            onVote={(v) => onVote(note.createEventId, v)}
          />
        );
      })}
    </div>
  );
}
