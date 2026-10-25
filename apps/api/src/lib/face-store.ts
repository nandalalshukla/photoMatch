/**
 * All face-vector SQL lives in this file.
 *
 * Prisma doesn't understand pgvector's `vector` type, so these few queries use
 * raw SQL. `<=>` is pgvector's cosine-distance operator:
 *     similarity = 1 - distance     (1 = identical face, ~0 = unrelated)
 * Tagged template literals ($queryRaw`...${value}`) send values as SQL
 * parameters, so they are safe from SQL injection.
 */
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma, toVector } from './db.js';

/** Replace the faces of a photo and mark it READY — all-or-nothing in one transaction. */
export async function savePhotoFaces(photo: { id: string; eventId: string }, embeddings: number[][]) {
  await prisma.$transaction(async (tx) => {
    await tx.face.deleteMany({ where: { photoId: photo.id } }); // in case this job is a retry
    if (embeddings.length > 0) {
      const rows = embeddings.map(
        (embedding) => Prisma.sql`(${randomUUID()}, ${photo.id}, ${photo.eventId}, ${toVector(embedding)}::vector)`,
      );
      await tx.$executeRaw`INSERT INTO "Face" ("id", "photoId", "eventId", "embedding") VALUES ${Prisma.join(rows)}`;
    }
    await tx.photo.update({ where: { id: photo.id }, data: { status: 'READY', faceCount: embeddings.length } });
  });
}

/**
 * Photos of one event that contain a face similar enough to `embedding`.
 * A photo can contain the same guest only once, so we keep the best face per photo.
 * Without a vector index Postgres compares against every face of the event —
 * for events up to a few thousand photos that takes only milliseconds.
 */
export async function findMatchingPhotos(eventId: string, embedding: number[], minSimilarity: number) {
  const vector = toVector(embedding);
  return prisma.$queryRaw<{ photoId: string; similarity: number }[]>`
    SELECT "Face"."photoId", MAX(1 - ("Face"."embedding" <=> ${vector}::vector))::float AS "similarity"
    FROM "Face"
    JOIN "Photo" ON "Photo"."id" = "Face"."photoId"
    WHERE "Face"."eventId" = ${eventId}
      AND "Photo"."approved" = true -- contributed photos awaiting review are never shown to guests
      AND 1 - ("Face"."embedding" <=> ${vector}::vector) >= ${minSimilarity}
    GROUP BY "Face"."photoId"
    ORDER BY "similarity" DESC
    LIMIT 1000`;
}

/** Remember the selfie's face (not the image) on the search, for the later liveness check. */
export async function saveSelfieEmbedding(searchId: string, embedding: number[]) {
  await prisma.$executeRaw`UPDATE "GuestSearch" SET "selfieEmbedding" = ${toVector(embedding)}::vector WHERE "id" = ${searchId}`;
}

/** How similar a live face is to the selfie stored on a search (null if none stored). */
export async function similarityToSelfie(searchId: string, embedding: number[]) {
  const rows = await prisma.$queryRaw<{ similarity: number | null }[]>`
    SELECT (1 - ("selfieEmbedding" <=> ${toVector(embedding)}::vector))::float AS "similarity"
    FROM "GuestSearch" WHERE "id" = ${searchId}`;
  return rows[0]?.similarity ?? null;
}
