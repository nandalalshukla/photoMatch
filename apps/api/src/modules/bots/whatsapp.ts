/**
 * WhatsApp Cloud API (Meta) — the few calls we need, using plain fetch.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * How it works:
 *   • Meta calls our webhook (POST /api/webhooks/whatsapp) for every message a guest sends.
 *   • We reply with POST /<phone-number-id>/messages.
 *   • Images arrive as a media id: we ask Meta for a temporary URL, then download it.
 *
 * Note: WhatsApp allows free-form replies within 24 hours of the guest's last
 * message — which is always the case here, because the guest starts the chat.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';
import { downloadBuffer } from '../../lib/ai-client.js';
import type { IncomingMessage, LinkButton } from './bot.types.js';

const GRAPH_URL = 'https://graph.facebook.com/v23.0';
const authHeader = () => ({ Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` });

export async function sendWhatsAppMessage(to: string, text: string, button?: LinkButton) {
  const body = button ? `${text}\n\n${button.label}: ${button.url}` : text;
  const response = await fetch(`${GRAPH_URL}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body, preview_url: true },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`WhatsApp send failed: ${response.status} ${await response.text()}`);
}

/** Download an image the guest sent. Step 1: media id → temporary URL. Step 2: download (needs the token too). */
export async function downloadWhatsAppMedia(mediaId: string) {
  const response = await fetch(`${GRAPH_URL}/${mediaId}`, { headers: authHeader() });
  if (!response.ok) throw new Error(`WhatsApp media lookup failed: ${response.status}`);
  const media = (await response.json()) as { url: string };
  return downloadBuffer(media.url, authHeader());
}

/**
 * Meta signs every webhook call: header "X-Hub-Signature-256: sha256=<hmac>",
 * where hmac = HMAC-SHA256(app secret, exact request body). If it doesn't
 * match, the request did not come from Meta and we ignore it.
 */
export function isValidWhatsAppSignature(rawBody: Buffer | undefined, signatureHeader: string | undefined) {
  if (!rawBody || !signatureHeader || !env.WHATSAPP_APP_SECRET) return false;
  const expected = `sha256=${createHmac('sha256', env.WHATSAPP_APP_SECRET).update(rawBody).digest('hex')}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && timingSafeEqual(a, b); // constant-time comparison
}

// The parts of the webhook payload we read.
type WhatsAppPayload = {
  entry?: {
    changes?: {
      value?: {
        messages?: {
          from: string; // guest's phone number
          type: string; // "text", "image", "document", ...
          text?: { body: string };
          image?: { id: string; caption?: string };
          document?: { id: string; mime_type?: string; caption?: string };
        }[];
      };
    }[];
  }[];
};

/** One webhook call can contain several messages; convert each into an IncomingMessage. */
export function parseWhatsAppPayload(payload: WhatsAppPayload): IncomingMessage[] {
  const messages = payload.entry?.flatMap((e) => e.changes ?? []).flatMap((c) => c.value?.messages ?? []) ?? [];

  return messages.map((message) => {
    const imageDocument = message.document?.mime_type?.startsWith('image/') ? message.document : undefined;
    return {
      channel: 'WHATSAPP',
      chatId: message.from,
      text: message.text?.body ?? message.image?.caption ?? imageDocument?.caption,
      mediaId: message.image?.id ?? imageDocument?.id,
    };
  });
}
