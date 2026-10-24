/**
 * Create an event in one screen: name + liveness option + photos.
 * On submit: create the event → upload photos to Cloudinary → open the event page.
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShieldCheck, TriangleAlert, X } from 'lucide-react';
import { PhotoDropzone } from '../components/PhotoDropzone';
import { UploadProgressCard } from '../components/UploadProgressCard';
import { Button, Card, ErrorText, Input, Toggle } from '../components/ui';
import { send } from '../lib/api';
import { mergeFiles, uploadEventPhotos, type UploadProgress } from '../lib/upload';
import { useConfig } from '../lib/use-config';

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
    <div className="mx-auto max-w-3xl">
      <Link to="/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"><ArrowLeft className="size-4" />All events</Link>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">New event</h1>
      <p className="mt-1 mb-8 text-slate-500">Name it, choose the privacy level and add your photos. We'll handle the rest.</p>

      <form onSubmit={submit} className="space-y-6">
        <Card className="space-y-5">
          <Input label="Event name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maya & Aarav's Wedding" required minLength={2} maxLength={120} hint="Guests see this name when they scan the QR code." disabled={busy} />
          <Toggle
            checked={livenessRequired}
            onChange={setLivenessRequired}
            disabled={busy}
            icon={<ShieldCheck className="size-5" />}
            title="Require a live face check before guests see their photos"
            description="Recommended for private events. Before a gallery opens, the guest looks into their camera and turns their head. Our AI confirms it's a real person and the same face as the selfie — so a forwarded gallery link is useless to anyone else."
          />
        </Card>

        <Card className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Photos</h2>
            {files.length > 0 && <span className="text-sm text-slate-500">{files.length.toLocaleString()} selected</span>}
          </div>
          {config && !config.uploads && (
            <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><TriangleAlert className="size-4 shrink-0" />Photo uploads aren't configured yet (Cloudinary keys missing in .env). You can still create the event.</p>
          )}
          <PhotoDropzone onFiles={addFiles} disabled={busy || config?.uploads === false} />
          {notice && <p className="text-sm text-amber-700">{notice}</p>}
          {files.length > 0 && (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {previews.map((url, index) => (
                <div key={url} className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100">
                  <img src={url} alt="" className="size-full object-cover" />
                  {!busy && (
                    <button type="button" onClick={() => setFiles((f) => f.filter((_, i) => i !== index))} className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 group-hover:opacity-100" aria-label="Remove photo">
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {files.length > previews.length && (
                <div className="grid aspect-square place-items-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-600">+{(files.length - previews.length).toLocaleString()}</div>
              )}
            </div>
          )}
          {progress && <UploadProgressCard progress={progress} />}
        </Card>

        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-3">
          <Button type="submit" size="lg" loading={busy}>
            {files.length ? `Create event & upload ${files.length.toLocaleString()} photos` : 'Create event'}
          </Button>
        </div>
      </form>
    </div>
  );
}
