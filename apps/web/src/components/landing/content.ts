/**
 * Copy for the landing page, kept apart from the layout so wording can change
 * without touching JSX. Keep claims true to what the product actually does.
 */
import type { BadgeColor } from '../ui';

export const navLinks = [
  { href: '#how', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#privacy', label: 'Privacy' },
  { href: '#faq', label: 'FAQ' },
];

export const steps = [
  { emoji: '📤', who: 'Organizer', title: 'Upload the event photos', body: 'Drop in the whole album — hundreds or thousands of photos. Our AI finds every face in the background.' },
  { emoji: '📱', who: 'Guest', title: 'Scan the QR code', body: 'Put the QR code on a table card or the big screen. It opens WhatsApp or Telegram with the event already filled in.' },
  { emoji: '🤳', who: 'Guest', title: 'Send a selfie, get your photos', body: 'One selfie is all it takes. Seconds later the guest gets a private gallery of only the photos they appear in.' },
];

export const occasions: { emoji: string; label: string; color: BadgeColor }[] = [
  { emoji: '💍', label: 'Weddings', color: 'pink' },
  { emoji: '🎤', label: 'Conferences', color: 'blue' },
  { emoji: '🏃', label: 'Marathons', color: 'green' },
  { emoji: '🎓', label: 'College fests', color: 'violet' },
  { emoji: '🎉', label: 'Parties', color: 'amber' },
  { emoji: '🏢', label: 'Corporate events', color: 'gray' },
  { emoji: '🎂', label: 'Birthdays', color: 'orange' },
];

export const features = [
  { emoji: '🎯', title: 'Accurate face matching', body: 'Finds guests even in crowded group shots.' },
  { emoji: '💬', title: 'WhatsApp & Telegram', body: 'Guests use apps they already have — no downloads, no accounts.' },
  { emoji: '🛡️', title: 'Liveness check', body: 'Optional live face check, so a forwarded link reveals nothing.' },
  { emoji: '⏱️', title: 'Live progress', body: 'Watch photos being analysed and share the moment they’re ready.' },
  { emoji: '📦', title: 'Download in one tap', body: 'Guests save their favourites as a ZIP or open any original.' },
  { emoji: '🧹', title: 'No duplicates', body: 'Upload the same folder twice — only new photos are added.' },
];

export const privacyPoints = [
  'Selfies are never stored — only a mathematical face signature is used for matching.',
  'A gallery can require a live face check, so only the person in it can open it.',
  'One switch turns guest search off and every link stops working instantly.',
  'Deleting an event removes its photos and all face data.',
];

export const faqs = [
  { q: 'Do guests need to install an app or create an account?', a: 'No. Guests scan the QR code, which opens WhatsApp or Telegram with the event code filled in. They send a selfie and get a link to their private gallery.' },
  { q: 'What happens to the selfies guests send?', a: "A selfie is turned into a face signature (a list of numbers) that is compared with the event's photos. The selfie image itself is never stored." },
  { q: 'How does the liveness check work?', a: 'When it is switched on, the guest opens their gallery, looks into their camera and slowly turns their head. Our AI confirms it is a real, live person and the same face as the selfie. Each gallery allows 5 attempts.' },
  { q: 'How many photos can I upload?', a: 'Thousands per event. Photos upload straight from your browser to secure cloud storage in JPG, PNG or WEBP, up to 20 MB each. Duplicates are skipped automatically.' },
  { q: 'Can I stop people from finding photos after the event?', a: 'Yes. Switching off guest search on the event page immediately disables the QR code, the bots and all existing gallery links. Deleting an event removes its photos and face data.' },
];
