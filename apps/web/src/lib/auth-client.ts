/**
 * better-auth's ready-made browser client.
 * It knows all the auth endpoints (/api/auth/*), so we never write auth
 * requests by hand: authClient.signIn.email(...), authClient.useSession(), etc.
 */
import { createAuthClient } from 'better-auth/react';
import { adminClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  // Same origin as the web app (Vite proxies /api in development).
  plugins: [adminClient()],
});

export const { useSession, signOut } = authClient;
