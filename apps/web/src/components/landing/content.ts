/**
 * Copy for the landing page, kept apart from the layout so wording can change
 * without touching JSX. Keep claims true to what the product actually does.
 * Photos live in /public/editorial (credits in CREDITS.md there).
 */
import { Camera, Eye, Images, KeyRound, Lock, Power, ScanFace, Send, ShieldCheck, Zap } from 'lucide-react';

export const navLinks = [
  { href: '#demo', label: 'Demo' },
  { href: '#how', label: 'How it works' },
  { href: '#privacy', label: 'Privacy' },
  { href: '#faq', label: 'FAQ' },
];

export const occasions = ['Weddings', 'Concerts', 'Conferences', 'Marathons', 'College fests', 'Birthdays', 'Corporate offsites', 'Graduations'];

export const steps = [
  { title: 'Upload the album', body: 'Drop in hundreds or thousands of event photos. Our AI finds every face in the background while you get on with your day.' },
  { title: 'Share one QR code', body: 'Print it on a table card or put it on the big screen. Guests scan it with the camera they already have.' },
  { title: 'Guests send a selfie', body: 'On WhatsApp or Telegram. Seconds later they get a private gallery with every photo they appear in.' },
];

export const moments = [
  { title: 'Weddings', note: 'Every guest, every table', image: 'moment-couple', alt: 'A couple on a bench by the sea' },
  { title: 'Concerts', note: 'Front row to the back', image: 'moment-band', alt: 'A band playing on stage' },
  { title: 'Festivals', note: 'Thousands of faces', image: 'moment-festival', alt: 'A festival crowd with hands raised' },
  { title: 'Family days', note: 'For the ones who weren’t posing', image: 'moment-family', alt: 'A mother hugging her child in the street' },
  { title: 'New Year’s Eve', note: 'Midnight, captured', image: 'moment-fireworks', alt: 'Fireworks over a city at night' },
  { title: 'Live shows', note: 'Lights, smoke, faces', image: 'moment-concert', alt: 'Stage lights over a concert crowd' },
];

export const features = [
  { icon: ScanFace, title: 'Accurate face matching', body: 'State-of-the-art face recognition finds guests even in crowded group shots.' },
  { icon: Send, title: 'WhatsApp & Telegram', body: 'Guests use the apps they already have. No downloads, no accounts, no passwords.' },
  { icon: ShieldCheck, title: 'Liveness protection', body: 'An optional live face check before a gallery opens, so a forwarded link reveals nothing.' },
  { icon: Zap, title: 'Live progress', body: 'Watch photos being analysed in real time and share the QR code the moment they are ready.' },
  { icon: Images, title: 'One-tap download', body: 'Guests pick their favourites and save them all at once as a ZIP, or open any original.' },
  { icon: Camera, title: 'Duplicate-proof uploads', body: 'Upload the same folder twice and only new photos are sent. Re-add a failed upload and only the missing ones go up.' },
];

export const privacyPoints = [
  { icon: Lock, title: 'Selfies are never stored', body: 'A selfie becomes a mathematical face signature in memory. The image itself is never saved.' },
  { icon: Eye, title: 'Liveness check', body: 'The guest turns their head on camera. Printed photos and screens fail, and so does a different face.' },
  { icon: Power, title: 'One switch to close it all', body: 'Turn guest search off and the QR code, bots and every gallery link stop working instantly.' },
  { icon: KeyRound, title: 'Locked down by default', body: 'Signed uploads, verified webhooks, strict security headers and rate limits on every entry point.' },
];

export const faqs = [
  { q: 'Do guests need to install an app or create an account?', a: 'No. Guests scan the QR code, which opens WhatsApp or Telegram with the event code filled in. They send a selfie and get a link to their private gallery.' },
  { q: 'What happens to the selfies guests send?', a: "A selfie is turned into a face signature (a list of numbers) that is compared with the event's photos. The selfie image itself is never stored." },
  { q: 'How does the liveness check work?', a: 'When it is switched on, the guest opens their gallery, looks into their camera and slowly turns their head. Our AI confirms it is a real, live person and the same face as the selfie. Each gallery allows 5 attempts.' },
  { q: 'How many photos can I upload?', a: 'Thousands per event. Photos upload straight from your browser to secure cloud storage in JPG, PNG or WEBP, up to 20 MB each. Duplicates are skipped automatically.' },
  { q: 'Can I stop people from finding photos after the event?', a: 'Yes. Switching off guest search on the event page immediately disables the QR code, the bots and all existing gallery links. Deleting an event removes its photos and face data.' },
];
