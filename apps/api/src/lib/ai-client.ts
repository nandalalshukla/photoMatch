/**
 * Talks to the Python AI service (apps/ai) over HTTP.
 *
 * The AI service is stateless: we send images, it sends back face embeddings
 * or a liveness verdict. Every request carries the shared secret header.
 */
import { env } from '../config/env.js';

/** The AI service rejected the image for a known reason (e.g. NO_FACE). */
export class AiImageError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

type DetectedFace = { embedding: number[]; score: number; box: number[] };
type LivenessResult = {
  passed: boolean;
  reason: 'NOT_FACING_CAMERA' | 'HEAD_NOT_TURNED' | 'DIFFERENT_PEOPLE' | 'SPOOF_DETECTED' | null;
  realScore: number;
  embedding: number[] | null;
};

/** POST one or more images as multipart/form-data and return the JSON answer. */
async function postImages<T>(path: string, images: Record<string, Buffer>): Promise<T> {
  const form = new FormData();
  for (const [field, data] of Object.entries(images)) {
    form.append(field, new Blob([new Uint8Array(data)], { type: 'image/jpeg' }), `${field}.jpg`);
  }

  const response = await fetch(`${env.AI_SERVICE_URL}${path}`, {
    method: 'POST',
    headers: { 'X-AI-Secret': env.AI_SERVICE_SECRET },
    body: form,
    signal: AbortSignal.timeout(60_000), // never wait forever
  });

  if (response.status === 422) {
    // Known image problem: { detail: { code: "NO_FACE", message } }
    const body = (await response.json()) as { detail?: { code?: string } };
    throw new AiImageError(body.detail?.code ?? 'INVALID_IMAGE');
  }
  if (!response.ok) throw new Error(`AI service ${path} failed with HTTP ${response.status}`);
  return (await response.json()) as T;
}

export const aiClient = {
  /** All faces in an event photo (may be an empty list). */
  detectFaces: async (image: Buffer) => (await postImages<{ faces: DetectedFace[] }>('/faces/detect', { image })).faces,

  /** The single face in a selfie. Throws AiImageError NO_FACE / MULTIPLE_FACES. */
  selfieEmbedding: async (image: Buffer) =>
    (await postImages<{ embedding: number[] }>('/faces/selfie', { image })).embedding,

  /** Liveness verdict for two webcam frames (looking straight + head turned). */
  liveness: (front: Buffer, turned: Buffer) => postImages<LivenessResult>('/liveness', { front, turned }),
};

/** Download any URL into memory (used for Cloudinary images and bot media). */
export async function downloadBuffer(url: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Download failed with HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
