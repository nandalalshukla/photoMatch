/**
 * Photos added through the upload link, waiting for an organizer's decision.
 * Approve → guests can find them. Reject → they're deleted for good.
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { send } from '../../lib/api';
import { thumbnail } from '../../lib/images';
import type { Photo } from '../../lib/types';
import { Alert, Button, CardHeader, ErrorText } from '../ui';

type Props = { eventId: string; photos: Photo[]; onChanged: () => void };

export function ReviewQueue({ eventId, photos, onChanged }: Props) {
  const [confirmRejectAll, setConfirmRejectAll] = useState(false);
  const decide = useMutation({
    mutationFn: ({ action, photoIds }: { action: 'approve' | 'reject'; photoIds: string[] }) =>
      send('POST', `/events/${eventId}/photos/${action}`, { photoIds }),
    onSuccess: () => {
      setConfirmRejectAll(false);
      onChanged();
    },
  });
  const all = photos.map((p) => p.id);
  const contributors = new Set(photos.map((p) => p.uploaderName ?? 'Someone')).size;

  return (
    <section className="mb-10 animate-enter">
      <CardHeader
        title={`To review · ${photos.length.toLocaleString()}`}
        description={`From ${contributors} contributor${contributors === 1 ? '' : 's'} via your upload link.`}
        action={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={decide.isPending}
              onClick={() => (confirmRejectAll ? decide.mutate({ action: 'reject', photoIds: all }) : setConfirmRejectAll(true))}
              className={confirmRejectAll ? 'text-[#eb5757] hover:text-[#eb5757]' : undefined}
            >
              {confirmRejectAll ? 'Click again to delete all' : 'Reject all'}
            </Button>
            <Button size="sm" loading={decide.isPending} onClick={() => decide.mutate({ action: 'approve', photoIds: all })}>
              <Check className="size-4" />Approve all
            </Button>
          </div>
        }
      />
      <Alert className="mb-4">Guests can't find these photos until you approve them. Rejected photos are deleted.</Alert>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {photos.map((photo) => (
          <figure key={photo.id} className="group">
            <div className="relative aspect-square overflow-hidden rounded-md bg-paper">
              <img src={thumbnail(photo.url, 300)} alt="" loading="lazy" className="size-full object-cover" />
              <div className="absolute inset-x-1.5 bottom-1.5 flex justify-end gap-1">
                <button
                  onClick={() => decide.mutate({ action: 'reject', photoIds: [photo.id] })}
                  disabled={decide.isPending}
                  className="grid size-7 place-items-center rounded-md bg-white/95 text-ink shadow-xs transition hover:bg-tag-red disabled:opacity-50"
                  aria-label="Reject photo"
                  title="Reject (delete)"
                >
                  <X className="size-4" />
                </button>
                <button
                  onClick={() => decide.mutate({ action: 'approve', photoIds: [photo.id] })}
                  disabled={decide.isPending}
                  className="grid size-7 place-items-center rounded-md bg-brand-500 text-white shadow-xs transition hover:bg-brand-600 disabled:opacity-50"
                  aria-label="Approve photo"
                  title="Approve"
                >
                  <Check className="size-4" />
                </button>
              </div>
            </div>
            <figcaption className="mt-1 truncate text-xs text-muted">by {photo.uploaderName ?? 'someone'}</figcaption>
          </figure>
        ))}
      </div>
      <div className="mt-3"><ErrorText>{decide.error?.message}</ErrorText></div>
    </section>
  );
}
