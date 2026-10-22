/**
 * Every text the bots send, in one place — easy to reword or translate.
 * Plain text only, so the same message works on Telegram and WhatsApp.
 */
export const botMessages = {
  welcome: () =>
    `👋 Welcome to PhotoMatch AI!\n\nI find the photos you appear in at an event.\n\n` +
    `1. Scan the event's QR code (or open its link)\n2. Send me one clear selfie\n3. Get your private gallery link\n\n` +
    `Type "help" any time, or "galleries" to see your earlier galleries.`,

  help: () =>
    `How it works:\n\n1. Open the event link or QR code from the organizer\n2. Send one clear, front-facing selfie\n` +
    `3. Open the private gallery link I send back\n\nTips: good light, no sunglasses, only you in the picture.`,

  eventNotFound: () => `I couldn't find that event 🤔\n\nPlease scan the QR code again or ask the organizer for a new link.`,

  eventClosed: (name: string) => `Photo search for "${name}" is switched off right now. Please ask the organizer.`,

  eventNotReady: (name: string) =>
    `The photos for "${name}" are still being prepared ⏳\n\nPlease try again in a few minutes.`,

  connected: (name: string, livenessRequired: boolean) =>
    `✅ You're connected to "${name}".\n\nNow send me one clear, front-facing selfie and I'll find every photo you're in.` +
    (livenessRequired ? `\n\n🔒 This event is protected: you'll do a quick live face check before your photos open.` : ''),

  noEventYet: () => `Please open the event's link or scan its QR code first, then send your selfie here.`,

  selfieReceived: () => `📸 Got your selfie! Searching the event photos now — this usually takes a few seconds.`,

  tooManySearches: () => `You've sent a lot of selfies in a short time. Please wait a bit and try again.`,

  noFace: () => `I couldn't see a face in that photo. Please send a clear selfie looking at the camera, in good light.`,

  multipleFaces: () => `I see more than one face. Please send a selfie with only you in it.`,

  searchFailed: () => `Sorry, something went wrong while searching 😕 Please send your selfie again in a minute.`,

  noMatches: () =>
    `I couldn't find you in this event's photos yet.\n\nTry another selfie with good light and your whole face visible. ` +
    `If the organizer is still uploading photos, try again later.`,

  matchesFound: (count: number, livenessRequired: boolean) =>
    `🎉 I found ${count} photo${count === 1 ? '' : 's'} of you!` +
    (livenessRequired
      ? `\n\n🔒 For your privacy, the gallery asks for a quick live face check (look at the camera, then turn your head). ` +
        `Only you can open it, so sharing the link won't expose your photos.`
      : `\n\nThis link is private — only share it with people you trust.`),

  galleries: (links: string[]) =>
    links.length ? `Your galleries:\n\n${links.map((l, i) => `${i + 1}. ${l}`).join('\n')}` : `You don't have any galleries yet.`,
};
