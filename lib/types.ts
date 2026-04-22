export type EventType = 'create_note' | 'move_note' | 'edit_note' | 'delete_note';

export interface NotePayload {
  id: string;
  x?: number;
  y?: number;
  content?: string;
}

export interface BoardEvent {
  id: string;
  board_id: string;
  user_id: string;
  type: EventType;
  payload: NotePayload;
  created_at: string;
  prev_hash: string | null;
  event_hash: string;
}

export interface Vote {
  id: string;
  event_id: string;
  board_id: string;
  user_id: string;
  value: 1 | -1;
  created_at: string;
}

export interface Profile {
  id: string;
  github_username: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Board {
  id: string;
  title: string;
  owner_id: string;
  created_at: string;
}

export interface Note {
  id: string;
  x: number;
  y: number;
  content: string;
  authorId: string;
  createEventId: string;
  createdAt: string;
  lastEventHash: string;
  prevHash: string | null;
}

export interface Score {
  up: number;
  down: number;
  net: number;
}
