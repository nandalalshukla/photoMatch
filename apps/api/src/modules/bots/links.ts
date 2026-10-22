/**
 * Deep links that open a chat with our bot, already "connected" to an event.
 *
 *   Telegram: t.me/<bot>?start=<code>   → the bot receives "/start <code>"
 *   WhatsApp: wa.me/<number>?text=...   → the guest's message box is pre-filled
 *                                          with a sentence containing the code
 */
import { env, features } from '../../config/env.js';

export const telegramLink = (publicCode: string) =>
  features.telegram ? `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=${publicCode}` : null;

export const whatsappLink = (publicCode: string) =>
  features.whatsapp
    ? `https://wa.me/${env.WHATSAPP_BUSINESS_NUMBER}?text=${encodeURIComponent(`Hi PhotoMatch AI! Find my photos for event ${publicCode}`)}`
    : null;

/** Private gallery page for one guest search. */
export const galleryUrl = (searchId: string) => `${env.APP_URL}/g/${searchId}`;
