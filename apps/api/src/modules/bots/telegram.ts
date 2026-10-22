/**
 * Telegram Bot API — the few calls we need, using plain fetch.
 * Docs: https://core.telegram.org/bots/api
 */
import { env } from '../../config/env.js';
import { downloadBuffer } from '../../lib/ai-client.js';
import type { IncomingMessage, LinkButton } from './bot.types.js';

const apiUrl = (method: string) => `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`;

async function callTelegram<T>(method: string, body: object): Promise<T> {
  const response = await fetch(apiUrl(method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await response.json()) as { ok: boolean; result: T; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method} failed: ${json.description}`);
  return json.result;
}

export async function sendTelegramMessage(chatId: string, text: string, button?: LinkButton) {
  await callTelegram('sendMessage', {
    chat_id: chatId,
    text,
    // Telegram only allows https:// links in buttons, so local http links stay in the text only.
    ...(button?.url.startsWith('https://')
      ? { reply_markup: { inline_keyboard: [[{ text: button.label, url: button.url }]] } }
      : {}),
  });
}

/** Download a photo the guest sent (Telegram gives us a file id, not the image). */
export async function downloadTelegramFile(fileId: string) {
  const file = await callTelegram<{ file_path: string }>('getFile', { file_id: fileId });
  return downloadBuffer(`https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`);
}

/** Point Telegram at our webhook URL (run once via `npm run bots:setup`). */
export async function registerTelegramWebhook(url: string) {
  await callTelegram('setWebhook', {
    url,
    secret_token: env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ['message'],
  });
}

// The parts of a Telegram "update" we read. Full type: https://core.telegram.org/bots/api#update
type TelegramUpdate = {
  message?: {
    chat: { id: number };
    text?: string;
    caption?: string;
    photo?: { file_id: string }[]; // several sizes, smallest first
    document?: { file_id: string; mime_type?: string }; // image sent "as a file"
  };
};

/** Convert a Telegram update into our channel-neutral IncomingMessage. */
export function parseTelegramUpdate(update: TelegramUpdate): IncomingMessage | null {
  const message = update.message;
  if (!message) return null;

  const largestPhoto = message.photo?.at(-1)?.file_id;
  const imageDocument = message.document?.mime_type?.startsWith('image/') ? message.document.file_id : undefined;

  return {
    channel: 'TELEGRAM',
    chatId: String(message.chat.id),
    text: message.text ?? message.caption,
    mediaId: largestPhoto ?? imageDocument,
  };
}
