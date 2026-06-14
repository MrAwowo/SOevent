export type EventType =
  | 'create_note'
  | 'move_note'
  | 'edit_note'
  | 'delete_note'
  | 'assign_note';

export interface NotePayload {
  id: string;
  x?: number;
  y?: number;
  content?: string;
  assigneeId?: string | null;
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

export type BoardStatus = 'past' | 'current' | 'upcoming';

export interface Board {
  id: string;
  title: string;
  owner_id: string;
  status: BoardStatus;
  starts_at: string | null;
  ends_at: string | null;
  all_day: boolean;
  description: string | null;
  created_at: string;
}

export interface Note {
  id: string;
  x: number;
  y: number;
  content: string;
  authorId: string;
  assigneeId: string | null;
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

export interface BoardAttachment {
  id: string;
  board_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  created_at: string;
}
