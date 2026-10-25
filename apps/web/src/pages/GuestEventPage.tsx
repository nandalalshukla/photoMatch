/**
 * What guests see after scanning the QR code: the event name and buttons that
 * open WhatsApp or Telegram with the event code already filled in.
 */
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { ArrowRight, LoaderCircle, Lock } from 'lucide-react';
import { TelegramIcon, WhatsAppIcon } from '../components/BrandIcons';
import { Logo } from '../components/Logo';
import { Alert, ButtonLink, EmptyState, Skeleton } from '../components/ui';
import { api } from '../lib/api';
import type { PublicEvent } from '../lib/types';

const steps = ['Tap WhatsApp or Telegram below', 'Send the message, then one clear selfie', 'Open the private gallery link you receive'];

/** A big "open this chat app" button in the app's own color, so it's instantly recognisable. */
function ChatButton({ href, app, icon, className }: { href: string; app: string; icon: ReactNode; className: string }) {
  return (
    <a href={href} className={`flex h-12 w-full items-center gap-3 rounded-md px-4 font-medium text-white transition hover:brightness-95 ${className}`}>
      {icon}
      <span className="flex-1 text-left">Get my photos on {app}</span>
      <ArrowRight className="size-4 opacity-80" />
    </a>
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
    <div className="min-h-dvh bg-white px-5 py-6">
      <div className="mx-auto max-w-md">
        <Logo />

        {isLoading ? (
          <div className="mt-12 space-y-4"><Skeleton className="size-12" /><Skeleton className="h-9 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-12 w-full" /></div>
        ) : error || !event ? (
          <EmptyState icon="🔗" title="This link isn't active" body="It may be wrong, or the organizer has switched photo search off." action={<ButtonLink to="/" variant="secondary">About PhotoMatch</ButtonLink>} className="mt-10" />
        ) : (
          <div className="mt-12 animate-enter">
            <p className="text-5xl" aria-hidden>📸</p>
            <p className="mt-4 text-sm text-muted">Find your photos from</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-balance text-ink">{event.name}</h1>

            {event.state === 'READY' ? (
              <>
                <ol className="mt-8 space-y-3">
                  {steps.map((step, i) => (
                    <li key={step} className="flex items-start gap-3 text-[15px] text-ink">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-paper text-xs font-medium text-muted">{i + 1}</span>{step}
                    </li>
                  ))}
                </ol>
                <div className="mt-8 space-y-2">
                  {event.whatsappLink && <ChatButton href={event.whatsappLink} app="WhatsApp" icon={<WhatsAppIcon />} className="bg-[#25D366]" />}
                  {event.telegramLink && <ChatButton href={event.telegramLink} app="Telegram" icon={<TelegramIcon />} className="bg-[#229ED9]" />}
                  {!event.whatsappLink && !event.telegramLink && (
                    <Alert tone="warning">No messaging app is connected yet. Please ask the organizer.</Alert>
                  )}
                </div>
                {event.livenessRequired && (
                  <Alert icon="🛡️" className="mt-6">This event is privacy-protected: before your gallery opens, you'll do a quick live face check with your camera.</Alert>
                )}
              </>
            ) : (
              <Alert icon={<LoaderCircle className="animate-spin" />} title="The photos are still being prepared" className="mt-8">
                Our AI is finding every face. This page updates by itself — keep it open or come back in a few minutes.
              </Alert>
            )}

            <p className="mt-10 flex items-start gap-2 border-t border-line pt-5 text-xs text-muted">
              <Lock className="mt-px size-3.5 shrink-0" />Your selfie is only compared with this event's photos and is never stored.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
