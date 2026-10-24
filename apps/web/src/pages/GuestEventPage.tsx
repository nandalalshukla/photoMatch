/**
 * What guests see after scanning the QR code: the event name and buttons that
 * open WhatsApp or Telegram with the event code already filled in.
 */
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { ArrowRight, Lock, ScanFace, SearchX, ShieldCheck } from 'lucide-react';
import { TelegramIcon, WhatsAppIcon } from '../components/BrandIcons';
import { Logo } from '../components/Logo';
import { Alert, ButtonLink, EmptyState, Skeleton } from '../components/ui';
import { api } from '../lib/api';
import type { PublicEvent } from '../lib/types';

const steps = ['Tap WhatsApp or Telegram below', 'Send the message, then one clear selfie', 'Open the private gallery link you receive'];

/** An ink "open this chat app" button; the app's own color lives in its icon chip so it's still instantly recognisable. */
function ChatButton({ href, app, icon, color }: { href: string; app: string; icon: ReactNode; color: string }) {
  return (
    <a href={href} className="group flex h-16 w-full items-center gap-3.5 rounded-full bg-ink pr-5 pl-2 text-paper transition duration-300 ease-editorial hover:-translate-y-0.5 hover:bg-ink-soft active:scale-[0.98]">
      <span className="grid size-12 shrink-0 place-items-center rounded-full text-white" style={{ backgroundColor: color }}>{icon}</span>
      <span className="flex-1 text-left leading-tight">
        <span className="block text-xs text-white/60">Get my photos on</span>
        <span className="block text-base font-semibold">{app}</span>
      </span>
      <ArrowRight className="size-4 opacity-70 transition-transform duration-300 group-hover:translate-x-1" />
    </a>
  );
}

/** Shown while the organizer's photos are still being analysed. */
function StillProcessing() {
  return (
    <div className="space-y-5 py-2 text-center">
      <div className="relative mx-auto grid size-20 place-items-center overflow-hidden rounded-3xl bg-ink text-paper">
        <ScanFace className="size-9" />
        <span className="absolute inset-x-2 h-0.5 animate-scan rounded-full bg-brand-500 shadow-[0_0_14px_3px_rgb(223_86_54/0.7)]" />
      </div>
      <div>
        <p className="font-display text-3xl text-ink">Still developing…</p>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">Our AI is finding every face in the photos. Keep this page open — it updates by itself — or come back in a few minutes.</p>
      </div>
      <p className="inline-flex items-center gap-2 rounded-full bg-paper px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-stone-900/10">
        <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-400 opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-brand-500" /></span>
        Checking automatically
      </p>
    </div>
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

  const card = 'overflow-hidden rounded-[28px] bg-white shadow-elevated';

  return (
    <div className="min-h-dvh bg-paper px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>

        {isLoading ? (
          <div className={card}>
            <Skeleton className="h-56 rounded-none" />
            <div className="space-y-4 p-6"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-16 w-full rounded-full" /></div>
          </div>
        ) : error || !event ? (
          <div className={card}>
            <EmptyState icon={<SearchX />} title="This link isn't active" body="It may be wrong, or the organizer has switched photo search off." action={<ButtonLink to="/" variant="secondary">About PhotoMatch AI</ButtonLink>} />
          </div>
        ) : (
          <div className={`${card} animate-scale-in`}>
            {/* Cover: a celebration photo with the event name set over it */}
            <div className="relative h-60 overflow-hidden bg-ink">
              <img src="/editorial/guest-sparkler.webp" alt="" className="absolute inset-0 size-full animate-develop object-cover" />
              <div className="grain absolute inset-0 opacity-30" />
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="eyebrow text-white/60">Find your photos from</p>
                <h1 className="mt-2 font-display text-[40px] leading-[1.02] text-balance text-white">{event.name}</h1>
              </div>
            </div>

            <div className="space-y-6 p-6">
              {event.state === 'READY' ? (
                <>
                  <ol className="space-y-3.5">
                    {steps.map((step, i) => (
                      <li key={step} className="flex items-center gap-3.5 text-[15px] text-stone-700">
                        <span className="w-6 shrink-0 font-display text-2xl leading-none text-stone-400">{i + 1}</span>{step}
                      </li>
                    ))}
                  </ol>
                  <div className="space-y-2.5">
                    {event.whatsappLink && <ChatButton href={event.whatsappLink} app="WhatsApp" icon={<WhatsAppIcon />} color="#25D366" />}
                    {event.telegramLink && <ChatButton href={event.telegramLink} app="Telegram" icon={<TelegramIcon />} color="#229ED9" />}
                    {!event.whatsappLink && !event.telegramLink && (
                      <Alert tone="warning">No messaging app is connected yet. Please ask the organizer.</Alert>
                    )}
                  </div>
                  {event.livenessRequired && (
                    <Alert icon={<ShieldCheck />}>This event is privacy-protected: before your gallery opens, you'll do a quick live face check with your camera.</Alert>
                  )}
                </>
              ) : (
                <StillProcessing />
              )}
              <p className="border-t border-stone-100 pt-5 text-center text-xs text-balance text-stone-500">
                <Lock className="mr-1 inline size-3.5 align-[-2px]" />Your selfie is only compared with this event's photos and is never stored.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
