/**
 * The guest conversation — written ONCE and shared by Telegram and WhatsApp.
 *
 * Flow:
 *   1. Guest opens the event link → the bot receives a message containing the
 *      event code → we remember "this chat is about event X" (ChatSession).
 *   2. Guest sends a selfie → we create a GuestSearch and queue a background job.
 *   3. The worker (jobs/search-selfie.ts) finds the photos and messages the
 *      guest their private gallery link.
 */
import type { Channel } from '@prisma/client';
import { features } from '../../config/env.js';
import { prisma } from '../../lib/db.js';
import { enqueueSelfieSearch } from '../../lib/queue.js';
import { findPublicCode } from '../events/event-progress.js';
import { getEventProgress } from '../events/events.service.js';
import { botMessages } from './bot.messages.js';
import type { IncomingMessage, LinkButton } from './bot.types.js';
import { galleryUrl } from './links.js';
import { downloadTelegramFile, sendTelegramMessage } from './telegram.js';
import { downloadWhatsAppMedia, sendWhatsAppMessage } from './whatsapp.js';

const MAX_SEARCHES_PER_HOUR = 10; // simple protection against selfie spam

// ---------- channel helpers: the only place that knows which app is which ----------

export async function sendText(channel: Channel, chatId: string, text: string, button?: LinkButton) {
  if (channel === 'TELEGRAM' && features.telegram) return sendTelegramMessage(chatId, text, button);
  if (channel === 'WHATSAPP' && features.whatsapp) return sendWhatsAppMessage(chatId, text, button);
  console.log(`[bot:${channel}] → ${chatId}: ${text}${button ? ` [${button.url}]` : ''}`);
}

export function downloadMedia(channel: Channel, mediaId: string) {
  return channel === 'TELEGRAM' ? downloadTelegramFile(mediaId) : downloadWhatsAppMedia(mediaId);
}

// ---------- conversation ----------

export async function handleIncomingMessage(message: IncomingMessage) {
  const { channel, chatId } = message;
  const text = message.text?.trim() ?? '';
  const code = findPublicCode(text);

  if (code) return connectToEvent(message, code);
  if (message.mediaId) return handleSelfie(message, message.mediaId);
  if (/^\/?(galleries|archive)$/i.test(text)) return listGalleries(message);
  if (/^\/?help$/i.test(text)) return sendText(channel, chatId, botMessages.help());
  return sendText(channel, chatId, botMessages.welcome());
}

/** Load an event and check that guests may search it right now. Sends the reason if not. */
async function getSearchableEvent(message: IncomingMessage, where: { id: string } | { publicCode: string }) {
  const event = await prisma.event.findUnique({ where });
  if (!event) {
    await sendText(message.channel, message.chatId, botMessages.eventNotFound());
    return null;
  }
  if (!event.guestAccess) {
    await sendText(message.channel, message.chatId, botMessages.eventClosed(event.name));
    return null;
  }
  const { state } = await getEventProgress(event.id);
  if (state !== 'READY') {
    await sendText(message.channel, message.chatId, botMessages.eventNotReady(event.name));
    return null;
  }
  return event;
}

async function connectToEvent(message: IncomingMessage, publicCode: string) {
  const event = await getSearchableEvent(message, { publicCode });
  if (!event) return;

  // One session per chat; opening another event's link simply switches it.
  await prisma.chatSession.upsert({
    where: { channel_chatId: { channel: message.channel, chatId: message.chatId } },
    create: { channel: message.channel, chatId: message.chatId, eventId: event.id },
    update: { eventId: event.id },
  });
  await sendText(message.channel, message.chatId, botMessages.connected(event.name, event.livenessRequired));

  // A selfie sent together with the code (as a caption) is handled right away.
  if (message.mediaId) await handleSelfie(message, message.mediaId);
}

async function handleSelfie(message: IncomingMessage, mediaId: string) {
  const { channel, chatId } = message;
  const session = await prisma.chatSession.findUnique({ where: { channel_chatId: { channel, chatId } } });
  if (!session) return sendText(channel, chatId, botMessages.noEventYet());

  const event = await getSearchableEvent(message, { id: session.eventId });
  if (!event) return;

  const recentSearches = await prisma.guestSearch.count({
    where: { channel, chatId, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recentSearches >= MAX_SEARCHES_PER_HOUR) return sendText(channel, chatId, botMessages.tooManySearches());

  const search = await prisma.guestSearch.create({ data: { eventId: event.id, channel, chatId } });
  await enqueueSelfieSearch({ searchId: search.id, channel, mediaId });
  await sendText(channel, chatId, botMessages.selfieReceived());
}

async function listGalleries(message: IncomingMessage) {
  const searches = await prisma.guestSearch.findMany({
    where: { channel: message.channel, chatId: message.chatId, status: 'COMPLETED', matches: { some: {} } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { event: { select: { name: true } } },
  });
  const links = searches.map((s) => `${s.event.name}: ${galleryUrl(s.id)}`);
  await sendText(message.channel, message.chatId, botMessages.galleries(links));
}
