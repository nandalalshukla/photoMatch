/**
 * Authentication — powered entirely by better-auth.
 *
 * better-auth gives us, without writing it ourselves:
 *   • email + password sign-up / sign-in (passwords hashed securely)
 *   • email verification links and password reset links
 *   • "Sign in with Google"
 *   • cookie-based sessions (httpOnly, so JavaScript can't steal them)
 *   • listing / revoking sessions on other devices
 *   • admin role + user management (admin plugin)
 *   • built-in rate limiting on auth endpoints
 *
 * All of it is served under /api/auth/* (mounted in app.ts).
 */
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins';
import { env, features } from '../config/env.js';
import { prisma } from './db.js';
import { sendEmail } from './email.js';

export const auth = betterAuth({
  appName: 'PhotoMatch AI',
  baseURL: env.APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  // Store users/sessions in our Postgres database through Prisma.
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  // Only our own web app may call the auth endpoints (CSRF protection).
  trustedOrigins: [env.APP_URL],

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Users can't sign in until they click the link in their verification email.
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: 'Reset your PhotoMatch AI password',
        heading: 'Reset your password',
        body: `Hi ${user.name}, click the button below to choose a new password. The link expires in 1 hour.`,
        buttonText: 'Choose a new password',
        buttonUrl: url,
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    // Signing in with an unverified email re-sends the link automatically.
    sendOnSignIn: true,
    // Clicking the link both verifies the email and signs the user in.
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: 'Verify your PhotoMatch AI email',
        heading: 'Confirm your email address',
        body: `Welcome to PhotoMatch AI, ${user.name}! Please confirm your email to start creating events.`,
        buttonText: 'Verify my email',
        buttonUrl: url,
      });
    },
  },

  // Google login is only switched on when its keys are present in .env.
  socialProviders: features.google
    ? { google: { clientId: env.GOOGLE_CLIENT_ID!, clientSecret: env.GOOGLE_CLIENT_SECRET! } }
    : {},

  // Adds a `role` column ("user" / "admin") and admin-only user management endpoints.
  plugins: [admin()],
});

export type Session = typeof auth.$Infer.Session;
