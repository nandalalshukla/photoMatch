/**
 * `npm run bots:setup` — connects the bots to this server.
 *
 * Telegram: registers <APP_URL>/api/webhooks/telegram as the bot's webhook.
 * WhatsApp: can't be set by API — prints the values to paste in Meta's dashboard.
 *
 * APP_URL must be a public HTTPS address. Locally, start a tunnel first, e.g.
 *   npx cloudflared tunnel --url http://localhost:5173
 * and put the https://... URL it prints into APP_URL.
 */
import { env, features } from '../src/config/env.js';
import { registerTelegramWebhook } from '../src/modules/bots/telegram.js';

if (!env.APP_URL.startsWith('https://')) {
  console.warn(`⚠️  APP_URL is ${env.APP_URL} — Telegram and WhatsApp need a public https:// URL.\n`);
}

if (features.telegram) {
  const url = `${env.APP_URL}/api/webhooks/telegram`;
  await registerTelegramWebhook(url);
  console.log(`✅ Telegram webhook set to ${url}`);
} else {
  console.log('⚪ Telegram skipped (fill in TELEGRAM_* in .env)');
}

if (features.whatsapp) {
  console.log(`\nWhatsApp → Meta dashboard → WhatsApp → Configuration → Webhook:`);
  console.log(`   Callback URL:  ${env.APP_URL}/api/webhooks/whatsapp`);
  console.log(`   Verify token:  ${env.WHATSAPP_VERIFY_TOKEN}`);
  console.log(`   Then subscribe to the "messages" field.`);
} else {
  console.log('⚪ WhatsApp skipped (fill in WHATSAPP_* in .env)');
}
