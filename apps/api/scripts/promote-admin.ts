/**
 * `npm run admin:promote -- you@example.com` — gives a user the admin role.
 * The user must have signed up first. Admins see the /admin page.
 */
import { prisma } from '../src/lib/db.js';

const email = process.argv[2]?.toLowerCase();
if (!email) {
  console.error('Usage: npm run admin:promote -- you@example.com');
  process.exit(1);
}

const user = await prisma.user.updateMany({ where: { email }, data: { role: 'admin' } });
console.log(user.count ? `✅ ${email} is now an admin` : `❌ No user with email ${email}`);
await prisma.$disconnect();
