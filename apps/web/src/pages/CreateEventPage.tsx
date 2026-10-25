/**
 * Create an event in one screen: name + liveness option + photos.
 * On submit: create the event → upload photos to Cloudinary → open the event page.
 */
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ShieldCheck, X } from 'lucide-react';
import { PhotoDropzone } from '../components/PhotoDropzone';
import { UploadProgressCard } from '../components/UploadProgressCard';
import { Alert, Button, ErrorText, Input, PageHeader, Toggle } from '../components/ui';
import { send } from '../lib/api';
import { mergeFiles, uploadEventPhotos, type UploadProgress } from '../lib/upload';
import { useConfig } from '../lib/use-config';

/** A titled part of the form, separated by a hairline. */
function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-semibold text-ink">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
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
    <div className="max-w-2xl">
      <PageHeader
        back={{ to: '/dashboard', label: 'Events' }}
        icon="➕"
        title="New event"
        description="Name it, choose the privacy level and add your photos."
      />

      <form onSubmit={submit} className="animate-enter space-y-8">
        <Section title="Details">
          <div className="space-y-4">
            <Input
              label="Event name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maya & Aarav's Wedding"
              required
              minLength={2}
              maxLength={120}
              disabled={busy}
              hint="Guests see this name when they scan the QR code."
            />
            <Toggle
              checked={livenessRequired}
              onChange={setLivenessRequired}
              disabled={busy}
              icon={<ShieldCheck />}
              title="Require a live face check"
              description="Recommended for private events. Before a gallery opens, the guest turns their head in front of the camera — so a forwarded gallery link is useless to anyone else."
            />
          </div>
        </Section>

        <Section title="Photos" aside={files.length > 0 && <span className="text-sm text-muted tabular-nums">{files.length.toLocaleString()} selected</span>}>
          <div className="space-y-3">
            {config && !config.uploads && (
              <Alert tone="warning">Photo uploads aren't configured yet (Cloudinary keys missing in .env). You can still create the event.</Alert>
            )}
            <PhotoDropzone onFiles={addFiles} disabled={busy || config?.uploads === false} />
            {notice && <Alert tone="warning">{notice}</Alert>}
            {files.length > 0 && (
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                {previews.map((url, index) => (
                  <div key={url} className="group relative aspect-square overflow-hidden rounded-md bg-paper">
                    <img src={url} alt="" className="size-full object-cover" />
                    {!busy && (
                      <button type="button" onClick={() => setFiles((f) => f.filter((_, i) => i !== index))} className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100" aria-label="Remove photo">
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {files.length > previews.length && (
                  <div className="grid aspect-square place-items-center rounded-md bg-paper text-sm font-medium text-muted">+{(files.length - previews.length).toLocaleString()}</div>
                )}
              </div>
            )}
            {progress && <UploadProgressCard progress={progress} />}
            <p className="text-xs text-muted">You can also add photos later from the event page.</p>
          </div>
        </Section>

        <section className="space-y-4 border-t border-line pt-6">
          <Alert icon="✨" title="What happens next">
            We find every face in your photos in the background, then give you a QR code to share. Guests get only the photos they appear in.
          </Alert>
          <ErrorText>{error}</ErrorText>
          <div className="flex items-center gap-3">
            <Button type="submit" size="lg" loading={busy}>
              {busy ? (progress ? 'Uploading…' : 'Creating…') : files.length ? `Create & upload ${files.length.toLocaleString()} photos` : 'Create event'}
              {!busy && <ArrowRight className="size-4" />}
            </Button>
            {busy && <p className="text-xs text-muted">Keep this tab open until the upload finishes.</p>}
          </div>
        </section>
      </form>
    </div>
  );
}
