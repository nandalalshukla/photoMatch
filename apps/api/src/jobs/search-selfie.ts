/**
 * Job: find a guest's photos from the selfie they sent to a bot.
 *
 *   bot media → AI service /faces/selfie → pgvector search → GuestMatch rows
 *   → message the guest their private gallery link
 *
 * The selfie image is only held in memory; we store just its face embedding.
 */
import { env } from '../config/env.js';
import { AiImageError, aiClient } from '../lib/ai-client.js';
import { prisma } from '../lib/db.js';
import { findMatchingPhotos, saveSelfieEmbedding } from '../lib/face-store.js';
import type { SearchSelfieJob } from '../lib/queue.js';
import { botMessages } from '../modules/bots/bot.messages.js';
import { downloadMedia, sendText } from '../modules/bots/bot.service.js';
import { galleryUrl } from '../modules/bots/links.js';

export async function searchSelfie({ searchId, channel, mediaId }: SearchSelfieJob) {
  const search = await prisma.guestSearch.findUnique({ where: { id: searchId }, include: { event: true } });
  if (!search || search.status !== 'PENDING') return; // deleted, or already handled by an earlier attempt

  const selfie = await downloadMedia(channel, mediaId);

  let embedding: number[];
  try {
    embedding = await aiClient.selfieEmbedding(selfie);
  } catch (error) {
    // A bad selfie is the guest's to fix, not a temporary error → tell them, don't retry.
    if (error instanceof AiImageError) {
      const text = error.code === 'MULTIPLE_FACES' ? botMessages.multipleFaces() : botMessages.noFace();
      await prisma.guestSearch.update({ where: { id: searchId }, data: { status: 'FAILED', error: error.code } });
      await sendText(channel, search.chatId, text);
      return;
    }
    throw error; // network / AI service problem → pg-boss retries the job
  }

  const matches = await findMatchingPhotos(search.eventId, embedding, env.FACE_MATCH_THRESHOLD);

  await prisma.guestMatch.createMany({
    data: matches.map((m) => ({ searchId, photoId: m.photoId, similarity: m.similarity })),
    skipDuplicates: true,
  });
  await saveSelfieEmbedding(searchId, embedding);
  await prisma.guestSearch.update({ where: { id: searchId }, data: { status: 'COMPLETED' } });

  if (matches.length === 0) {
    await sendText(channel, search.chatId, botMessages.noMatches());
    return;
  }
  await sendText(channel, search.chatId, botMessages.matchesFound(matches.length, search.event.livenessRequired), {
    label: 'Open my photos',
    url: galleryUrl(searchId),
  });
}

/** Called after the last retry failed. */
export async function markSearchFailed({ searchId, channel }: SearchSelfieJob) {
  const search = await prisma.guestSearch.update({ where: { id: searchId }, data: { status: 'FAILED', error: 'ERROR' } });
  await sendText(channel, search.chatId, botMessages.searchFailed());
}
