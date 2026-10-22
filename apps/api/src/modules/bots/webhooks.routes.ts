/**
 * Webhooks: Telegram and WhatsApp call these URLs whenever a guest messages the bot.
 *
 *   POST /api/webhooks/telegram    (secured by a secret header we chose)
 *   GET  /api/webhooks/whatsapp    (one-time verification handshake from Meta)
 *   POST /api/webhooks/whatsapp    (secured by Meta's HMAC signature)
 *
 * We always answer 200 quickly — even if handling fails — because both
 * platforms re-send messages that are not acknowledged, which would make the
 * bot reply several times. Errors are logged instead.
 */
import { Router, type Request } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { env, features } from '../../config/env.js';
import { handleIncomingMessage } from './bot.service.js';
import { parseTelegramUpdate } from './telegram.js';
import { isValidWhatsAppSignature, parseWhatsAppPayload } from './whatsapp.js';

export const webhooksRouter = Router();

const safeEqual = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

const handleSafely = (messages: Parameters<typeof handleIncomingMessage>[0][]) =>
  Promise.all(messages.map((m) => handleIncomingMessage(m).catch((error) => console.error('[bot] failed', error))));

// ---------- Telegram ----------

webhooksRouter.post('/telegram', async (req, res) => {
  const secret = req.get('X-Telegram-Bot-Api-Secret-Token') ?? '';
  if (!features.telegram || !safeEqual(secret, env.TELEGRAM_WEBHOOK_SECRET!)) {
    return res.sendStatus(401);
  }
  const message = parseTelegramUpdate(req.body);
  if (message) await handleSafely([message]);
  res.sendStatus(200);
});

// ---------- WhatsApp ----------

// When you save the webhook URL in Meta's dashboard, Meta calls this once with
// your verify token and expects the "challenge" value echoed back.
webhooksRouter.get('/whatsapp', (req, res) => {
  const ok = req.query['hub.mode'] === 'subscribe' && features.whatsapp &&
    safeEqual(String(req.query['hub.verify_token'] ?? ''), env.WHATSAPP_VERIFY_TOKEN!);
  if (!ok) return res.sendStatus(403);
  res.status(200).send(String(req.query['hub.challenge']));
});

webhooksRouter.post('/whatsapp', async (req: Request & { rawBody?: Buffer }, res) => {
  if (!features.whatsapp || !isValidWhatsAppSignature(req.rawBody, req.get('X-Hub-Signature-256'))) {
    return res.sendStatus(401);
  }
  await handleSafely(parseWhatsAppPayload(req.body));
  res.sendStatus(200);
});
