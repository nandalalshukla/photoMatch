/**
 * Who may do what with an event. Pure functions (no database), so they're easy to test.
 *
 *   owner        created the event; can do everything
 *   coorganizer  invited by email; can do everything except delete the event
 *                and manage who else has access
 *
 * An invite is tied to an email address. It gives access to the account with
 * that address only once the address is verified — otherwise anyone could sign
 * up with someone else's email and walk into their event.
 */
import { randomBytes } from 'node:crypto';

export type EventRole = 'owner' | 'coorganizer';
export type Viewer = { id: string; email: string; emailVerified: boolean };
export type EventAction = 'view' | 'edit' | 'upload' | 'review' | 'deleteEvent' | 'manageMembers';

const OWNER_ONLY: EventAction[] = ['deleteEvent', 'manageMembers'];

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Prisma `where` filter for the events this user may open. */
export function accessibleEventsWhere(user: Viewer) {
  return {
    OR: [
      { ownerId: user.id },
      ...(user.emailVerified ? [{ members: { some: { email: normalizeEmail(user.email) } } }] : []),
    ],
  };
}

export const roleFor = (event: { ownerId: string }, user: Viewer): EventRole => (event.ownerId === user.id ? 'owner' : 'coorganizer');

export const can = (role: EventRole, action: EventAction) => role === 'owner' || !OWNER_ONLY.includes(action);

/** Secret for an event's upload link: 144 random bits, URL-safe (24 characters). */
export const generateUploadToken = () => randomBytes(18).toString('base64url');
