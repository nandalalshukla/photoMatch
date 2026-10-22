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
  progress: EventProgress;
};

export type EventDetail = Omit<EventSummary, 'coverUrl'> & { guestUrl: string };

export type Photo = {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  status: 'PROCESSING' | 'READY' | 'FAILED';
  faceCount: number;
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
