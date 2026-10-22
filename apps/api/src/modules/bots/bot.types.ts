import type { Channel } from '@prisma/client';

/**
 * A message from a guest, in the same shape no matter which app it came from.
 * Telegram and WhatsApp adapters convert their own formats into this one, so
 * the conversation logic (bot.service.ts) is written only once.
 */
export type IncomingMessage = {
  channel: Channel;
  chatId: string; // Telegram chat id, or the guest's WhatsApp number
  text?: string;
  mediaId?: string; // id of an image the guest sent
};

export type LinkButton = { label: string; url: string };
