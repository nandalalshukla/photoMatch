/**
 * What guests see after scanning the QR code: the event name and buttons that
 * open WhatsApp or Telegram with the event code already filled in.
 */
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { Clock3, Lock, SearchX, ShieldCheck } from 'lucide-react';
import { Logo } from '../components/Logo';
import { ButtonLink, EmptyState, Spinner } from '../components/ui';
import { api } from '../lib/api';
import type { PublicEvent } from '../lib/types';

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
      <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zm8.4-18.2A11.8 11.8 0 0 0 1.7 17.9L0 24l6.3-1.7a11.8 11.8 0 0 0 5.7 1.4A11.8 11.8 0 0 0 20.4 3.6z" />
    </svg>
  );
}
function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
      <path d="M21.9 4.3 18.7 19.4c-.2 1.1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.2 13 1.4 11.5c-1-.3-1.1-1 .2-1.5L20.5 2.7c.9-.3 1.6.2 1.4 1.6z" />
    </svg>
  );
}

export function GuestEventPage() {
  const { code } = useParams();
  const { data: event, isLoading, error } = useQuery({
    queryKey: ['public-event', code],
    queryFn: async () => (await api<{ event: PublicEvent }>(`/public/events/${code}`)).event,
    retry: false,
    // While the organizer's photos are still processing, check again every 10 s.
    refetchInterval: (query) => (query.state.data && query.state.data.state !== 'READY' ? 10_000 : false),
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>
        {isLoading ? (
          <Spinner label="Opening event" />
        ) : error || !event ? (
          <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            <EmptyState icon={<SearchX />} title="This link isn't active" body="It may be wrong, or the organizer has switched photo search off." action={<ButtonLink to="/" variant="secondary">About PhotoMatch AI</ButtonLink>} />
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-brand-900/5 ring-1 ring-slate-200">
            <div className="brand-gradient px-6 py-10 text-center text-white">
              <p className="text-sm font-medium text-white/80">You're invited to find your photos from</p>
              <h1 className="mt-2 text-3xl font-bold">{event.name}</h1>
            </div>
            <div className="space-y-6 p-6">
              {event.state === 'READY' ? (
                <>
                  <ol className="space-y-3 text-sm text-slate-700">
                    {['Tap WhatsApp or Telegram below', 'Send the message, then send one clear selfie', 'Open the private gallery link you receive'].map((step, i) => (
                      <li key={step} className="flex items-center gap-3">
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{i + 1}</span>{step}
                      </li>
                    ))}
                  </ol>
                  <div className="space-y-3">
                    {event.whatsappLink && (
                      <a href={event.whatsappLink} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-3.5 font-semibold text-white shadow-sm transition hover:brightness-105"><WhatsAppIcon />Get my photos on WhatsApp</a>
                    )}
                    {event.telegramLink && (
                      <a href={event.telegramLink} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#229ED9] px-6 py-3.5 font-semibold text-white shadow-sm transition hover:brightness-105"><TelegramIcon />Get my photos on Telegram</a>
                    )}
                    {!event.whatsappLink && !event.telegramLink && (
                      <p className="rounded-xl bg-amber-50 p-3 text-center text-sm text-amber-800">No messaging app is connected yet. Please ask the organizer.</p>
                    )}
                  </div>
                  {event.livenessRequired && (
                    <p className="flex gap-2 rounded-xl bg-brand-50 p-3 text-xs leading-relaxed text-brand-900"><ShieldCheck className="size-4 shrink-0 text-brand-600" />This event is privacy-protected: before your gallery opens, you'll do a quick live face check with your camera.</p>
                  )}
                </>
              ) : (
                <div className="flex gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                  <Clock3 className="size-5 shrink-0" />
                  <p><b>The photos are still being prepared.</b><br />This page updates automatically — keep it open or come back in a few minutes.</p>
                </div>
              )}
              <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500"><Lock className="size-3.5" />Your selfie is only compared with this event's photos and is never stored.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
