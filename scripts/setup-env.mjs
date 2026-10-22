// Creates your local .env file from .env.example (only if .env does not exist yet)
// and fills in random values for the secrets that we can safely generate for you.
//
// Why a script instead of committing .env?  .env will hold real passwords and
// API keys. It is listed in .gitignore so it can never be pushed to GitHub by
// accident. This script gives every developer the same starting file in one step.
import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const examplePath = new URL('../.env.example', import.meta.url);
const envPath = new URL('../.env', import.meta.url);

if (existsSync(envPath)) {
  console.log('.env already exists — nothing to do.');
  process.exit(0);
}

copyFileSync(examplePath, envPath);

// These secrets are only shared between our own services, so any long random
// string works. Third-party keys (Google, Cloudinary, Telegram...) must still be
// filled in by hand.
const generated = ['BETTER_AUTH_SECRET', 'AI_SERVICE_SECRET', 'TELEGRAM_WEBHOOK_SECRET', 'WHATSAPP_VERIFY_TOKEN'];
let content = readFileSync(envPath, 'utf8');
for (const key of generated) {
  content = content.replace(new RegExp(`^${key}=$`, 'm'), `${key}=${randomBytes(32).toString('hex')}`);
}
writeFileSync(envPath, content);

console.log('Created .env — open it and fill in the remaining empty values.');
