/**
 * Create an event in one screen: name + liveness option + photos.
 * On submit: create the event → upload photos to Cloudinary → open the event page.
 */
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, QrCode, ScanFace, ShieldCheck, X } from 'lucide-react';
import { PhotoDropzone } from '../components/PhotoDropzone';
import { UploadProgressCard } from '../components/UploadProgressCard';
import { Alert, Button, Card, ErrorText, Input, PageHeader, Toggle } from '../components/ui';
import { send } from '../lib/api';
import { mergeFiles, uploadEventPhotos, type UploadProgress } from '../lib/upload';
import { useConfig } from '../lib/use-config';

/** Numbered heading for each part of the form. */
function Section({ step, title, description, aside, children }: { step: number; title: string; description: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <div className="mb-6 flex items-start gap-4">
        <span className="font-display text-5xl leading-none text-stone-300">{String(step).padStart(2, '0')}</span>
        <div className="min-w-0 flex-1 pt-1">
          <h2 className="font-display text-3xl leading-tight text-ink">{title}</h2>
          <p className="mt-1 text-sm text-stone-500">{description}</p>
        </div>
        {aside}
      </div>
      {children}
    </Card>
  );
}

export function CreateEventPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const config = useConfig();
  const [name, setName] = useState('');
  const [livenessRequired, setLivenessRequired] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  // Small previews of the first photos. Object URLs must be released when no longer shown.
  const previews = useMemo(() => files.slice(0, 11).map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  const addFiles = (incoming: File[], unsupported: number) => {
    // Ignore files that are already in the list (picked twice).
    const merged = mergeFiles(files, incoming);
    setFiles(merged.files);
    const notes = [
      unsupported && `${unsupported} file(s) skipped — only JPG, PNG or WEBP images are supported.`,
      merged.duplicates && `${merged.duplicates} file(s) were already selected.`,
    ].filter(Boolean);
    setNotice(notes.join(' '));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { event: created } = await send<{ event: { id: string } }>('POST', '/events', { name, livenessRequired });
      const result = files.length ? await uploadEventPhotos(created.id, files, setProgress) : null;
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      // Pass the duplicate/failed counts on, so the event page can show them.
      navigate(`/dashboard/events/${created.id}`, { state: { uploadSummary: result } });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the event');
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        back={{ to: '/dashboard', label: 'All events' }}
        title="New event"
        description="Name it, choose the privacy level and add your photos. We'll handle the rest."
      />

      <form onSubmit={submit} className="grid animate-enter items-start gap-6 [animation-delay:60ms] lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Section step={1} title="Event details" description="Guests see the name when they scan the QR code.">
            <div className="space-y-5">
              <Input label="Event name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maya & Aarav's Wedding" required minLength={2} maxLength={120} disabled={busy} />
              <Toggle
                checked={livenessRequired}
                onChange={setLivenessRequired}
                disabled={busy}
                icon={<ShieldCheck className="size-4" />}
                title="Require a live face check before guests see their photos"
                description="Recommended for private events. Before a gallery opens, the guest looks into their camera and turns their head. Our AI confirms it's a real person and the same face as the selfie — so a forwarded gallery link is useless to anyone else."
              />
            </div>
          </Section>

          <Section
            step={2}
            title="Photos"
            description="You can also add photos later from the event page."
            aside={files.length > 0 && <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700 tabular-nums">{files.length.toLocaleString()} selected</span>}
          >
            <div className="space-y-4">
              {config && !config.uploads && (
                <Alert tone="warning">Photo uploads aren't configured yet (Cloudinary keys missing in .env). You can still create the event.</Alert>
              )}
              <PhotoDropzone onFiles={addFiles} disabled={busy || config?.uploads === false} />
              {notice && <Alert tone="warning">{notice}</Alert>}
              {files.length > 0 && (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {previews.map((url, index) => (
                    <div key={url} className="group relative aspect-square animate-scale-in overflow-hidden rounded-lg bg-stone-100 ring-1 ring-stone-900/6">
                      <img src={url} alt="" className="size-full object-cover" />
                      {!busy && (
                        <button type="button" onClick={() => setFiles((f) => f.filter((_, i) => i !== index))} className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100" aria-label="Remove photo">
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {files.length > previews.length && (
                    <div className="grid aspect-square place-items-center rounded-lg bg-stone-100 text-sm font-semibold text-stone-600">+{(files.length - previews.length).toLocaleString()}</div>
                  )}
                </div>
              )}
              {progress && <UploadProgressCard progress={progress} />}
            </div>
          </Section>
        </div>

        {/* Summary + submit. Sticks to the top on large screens. */}
        <Card className="space-y-5 lg:sticky lg:top-24">
          <div>
            <h2 className="font-display text-2xl leading-tight text-ink">What happens next</h2>
            <ul className="mt-4 space-y-3 text-sm text-stone-600">
              <li className="flex gap-3"><ScanFace className="mt-0.5 size-4 shrink-0 text-brand-600" />We find every face in your photos, in the background.</li>
              <li className="flex gap-3"><QrCode className="mt-0.5 size-4 shrink-0 text-brand-600" />You get a QR code and link to share with guests.</li>
              <li className="flex gap-3"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-600" />Guests get only the photos they appear in.</li>
            </ul>
          </div>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" size="lg" loading={busy} className="w-full">
            {busy ? (progress ? 'Uploading…' : 'Creating…') : files.length ? `Create & upload ${files.length.toLocaleString()} photos` : 'Create event'}
            {!busy && <ArrowRight className="size-4" />}
          </Button>
          {busy && <p className="text-center text-xs text-stone-500">Keep this tab open until the upload finishes.</p>}
        </Card>
      </form>
    </div>
  );
}
