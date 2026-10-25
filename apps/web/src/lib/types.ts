/** Shapes of the data our API returns (mirrors apps/api). */

export type EventState = 'EMPTY' | 'PROCESSING' | 'READY' | 'FAILED';

export type EventProgress = {
  total: number;
  processing: number;
  ready: number;
  failed: number;
  state: EventState;
};

export type EventSummary = {
  id: string;
  name: string;
  publicCode: string;
  guestAccess: boolean;
  livenessRequired: boolean;
  createdAt: string;
  coverUrl: string | null;
  searchCount: number;
  /** Contributed photos waiting for an organizer's approval. */
  pendingCount: number;
  /** Your role: you created the event, or you were invited as a co-organizer. */
  role: EventRole;
  progress: EventProgress;
};

export type EventRole = 'owner' | 'coorganizer';

export type EventMember = { id: string; email: string; createdAt: string };

export type EventDetail = Omit<EventSummary, 'coverUrl'> & {
  guestUrl: string;
  /** The contributor upload link, or null when it's switched off. */
  uploadUrl: string | null;
  owner: { name: string; email: string } | null;
  members: EventMember[];
};

export type Photo = {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  status: 'PROCESSING' | 'READY' | 'FAILED';
  faceCount: number;
  /** False while a contributed photo waits for review — guests can't find it yet. */
  approved: boolean;
  /** Who added it (account name, or the name typed on the upload link). */
  uploaderName: string | null;
};

export type PublicEvent = {
  name: string;
  state: EventState;
  livenessRequired: boolean;
  telegramLink: string | null;
  whatsappLink: string | null;
};

export type Gallery = {
  eventName: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  livenessRequired: boolean;
  locked: boolean;
  attemptsLeft: number;
  photos: { id: string; url: string; width: number | null; height: number | null; similarity: number }[];
};

export type AppConfig = { google: boolean; uploads: boolean; telegram: boolean; whatsapp: boolean };
