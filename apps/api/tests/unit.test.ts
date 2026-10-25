/**
 * Fast unit tests for pure logic (no database, no network).
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { describe, it } from 'node:test';

// Fake values so env.ts validation passes even without a .env file.
process.env.APP_URL ??= 'http://localhost:5173';
process.env.DATABASE_URL ??= 'postgresql://localhost/test';
Object.assign(process.env, {
  BETTER_AUTH_SECRET: 'test-secret-test-secret',
  AI_SERVICE_SECRET: 'test',
  WHATSAPP_APP_SECRET: 'whatsapp-app-secret',
});

const { calculateProgress, findPublicCode, generatePublicCode } = await import('../src/modules/events/event-progress.js');
const { parseTelegramUpdate } = await import('../src/modules/bots/telegram.js');
const { parseWhatsAppPayload, isValidWhatsAppSignature } = await import('../src/modules/bots/whatsapp.js');

describe('calculateProgress', () => {
  it('is EMPTY without photos', () => {
    assert.equal(calculateProgress({}).state, 'EMPTY');
  });
  it('is PROCESSING while any photo is processing', () => {
    assert.deepEqual(calculateProgress({ PROCESSING: 2, READY: 5 }), {
      total: 7, processing: 2, ready: 5, failed: 0, state: 'PROCESSING',
    });
  });
  it('is READY when done and at least one photo worked', () => {
    assert.equal(calculateProgress({ READY: 3, FAILED: 1 }).state, 'READY');
  });
  it('is FAILED when every photo failed', () => {
    assert.equal(calculateProgress({ FAILED: 4 }).state, 'FAILED');
  });
});

describe('event codes', () => {
  it('generates 8 easy-to-read characters', () => {
    const code = generatePublicCode();
    assert.match(code, /^[A-HJKMNP-Z2-9]{8}$/);
  });
  it('finds a code in Telegram and WhatsApp messages', () => {
    assert.equal(findPublicCode('/start K7P2QM9X'), 'K7P2QM9X');
    assert.equal(findPublicCode('Hi PhotoMatch AI! Find my photos for event K7P2QM9X'), 'K7P2QM9X');
  });
  it('ignores normal words', () => {
    assert.equal(findPublicCode('hello there, stranger'), undefined);
  });
});

describe('Telegram parsing', () => {
  it('reads text messages', () => {
    assert.deepEqual(parseTelegramUpdate({ message: { chat: { id: 42 }, text: '/start ABCDEFGH' } }), {
      channel: 'TELEGRAM', chatId: '42', text: '/start ABCDEFGH', mediaId: undefined,
    });
  });
  it('picks the largest photo size', () => {
    const update = { message: { chat: { id: 1 }, photo: [{ file_id: 'small' }, { file_id: 'large' }] } };
    assert.equal(parseTelegramUpdate(update)?.mediaId, 'large');
  });
  it('accepts images sent as files, but not other documents', () => {
    const image = { message: { chat: { id: 1 }, document: { file_id: 'img', mime_type: 'image/jpeg' } } };
    const pdf = { message: { chat: { id: 1 }, document: { file_id: 'pdf', mime_type: 'application/pdf' } } };
    assert.equal(parseTelegramUpdate(image)?.mediaId, 'img');
    assert.equal(parseTelegramUpdate(pdf)?.mediaId, undefined);
  });
});

describe('WhatsApp parsing', () => {
  it('reads text and image messages', () => {
    const payload = {
      entry: [{ changes: [{ value: { messages: [
        { from: '911234567890', type: 'text', text: { body: 'hello' } },
        { from: '911234567890', type: 'image', image: { id: 'media-1' } },
      ] } }] }],
    };
    assert.deepEqual(parseWhatsAppPayload(payload), [
      { channel: 'WHATSAPP', chatId: '911234567890', text: 'hello', mediaId: undefined },
      { channel: 'WHATSAPP', chatId: '911234567890', text: undefined, mediaId: 'media-1' },
    ]);
  });
  it('ignores delivery status updates', () => {
    assert.deepEqual(parseWhatsAppPayload({ entry: [{ changes: [{ value: {} }] }] }), []);
  });
  it('accepts only correctly signed webhooks', () => {
    const body = Buffer.from('{"hello":"world"}');
    const good = `sha256=${createHmac('sha256', 'whatsapp-app-secret').update(body).digest('hex')}`;
    assert.equal(isValidWhatsAppSignature(body, good), true);
    assert.equal(isValidWhatsAppSignature(body, 'sha256=forged'), false);
    assert.equal(isValidWhatsAppSignature(body, undefined), false);
  });
});

const { accessibleEventsWhere, can, generateUploadToken, normalizeEmail, roleFor } = await import('../src/modules/events/access.js');
const { escapeHtml } = await import('../src/lib/email.js');

describe('event access', () => {
  const owner = { id: 'u1', email: 'Owner@Example.com', emailVerified: true };
  const helper = { id: 'u2', email: 'Helper@Example.com', emailVerified: true };

  it('knows the owner from a co-organizer', () => {
    assert.equal(roleFor({ ownerId: 'u1' }, owner), 'owner');
    assert.equal(roleFor({ ownerId: 'u1' }, helper), 'coorganizer');
  });
  it('lets co-organizers do everything except delete the event or manage access', () => {
    for (const action of ['view', 'edit', 'upload', 'review'] as const) assert.equal(can('coorganizer', action), true);
    assert.equal(can('coorganizer', 'deleteEvent'), false);
    assert.equal(can('coorganizer', 'manageMembers'), false);
    assert.equal(can('owner', 'deleteEvent'), true);
  });
  it('matches invites by lower-case email, and only for verified addresses', () => {
    assert.equal(normalizeEmail('  Helper@Example.COM '), 'helper@example.com');
    assert.deepEqual(accessibleEventsWhere(helper).OR[1], { members: { some: { email: 'helper@example.com' } } });
    assert.equal(accessibleEventsWhere({ ...helper, emailVerified: false }).OR.length, 1); // own events only
  });
  it('makes long, URL-safe, unique upload tokens', () => {
    const a = generateUploadToken();
    assert.match(a, /^[A-Za-z0-9_-]{24}$/);
    assert.notEqual(a, generateUploadToken());
  });
});

describe('emails', () => {
  it('escapes user-typed text so it cannot inject HTML', () => {
    assert.equal(escapeHtml(`<a href="x">Tom & Jerry's</a>`), '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;');
  });
});
