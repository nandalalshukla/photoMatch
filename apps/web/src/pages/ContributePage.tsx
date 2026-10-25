/**
 * The page behind an event's upload link (/u/:token). Anyone with the link —
 * a photographer, a friend, a family member — can add their photos without an
 * account. The photos wait for the organizer's approval before guests can find them.
 */
import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, X } from 'lucide-react';
import { Logo } from '../components/Logo';
import { PhotoDropzone } from '../components/PhotoDropzone';
import { UploadProgressCard, UploadSummaryText } from '../components/UploadProgressCard';
import { Alert, Button, ButtonLink, EmptyState, ErrorText, Input, Skeleton } from '../components/ui';
import { api } from '../lib/api';
import { mergeFiles, uploadContributedPhotos, type UploadProgress } from '../lib/upload';

const NAME_KEY = 'photomatch.contributorName';

/** Remember the contributor's name for their next visit (storage may be blocked — that's fine). */
const savedName = () => {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
};
const saveName = (name: string) => {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // private mode etc. — not important
  }
};

export function ContributePage() {
  const { token = '' } = useParams();
  const query = useQuery({
    queryKey: ['contribute', token],
    queryFn: async () => (await api<{ event: { name: string } }>(`/contribute/${token}`)).event,
    retry: false,
  });

  const [name, setName] = useState(savedName);
  const [files, setFiles] = useState<File[]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [result, setResult] = useState<UploadProgress | null>(null);
  const busy = progress !== null && result === null;

  const addFiles = (incoming: File[], unsupported: number) => {
    const merged = mergeFiles(files, incoming);
    setFiles(merged.files);
    setNotice(unsupported ? `${unsupported} file(s) skipped — only JPG, PNG or WEBP images up to 20 MB are supported.` : '');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!files.length) return setError('Choose some photos first.');
    setError('');
    saveName(name.trim());
    try {
      setResult(await uploadContributedPhotos(token, name.trim(), files, setProgress));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Upload failed. Please try again.');
      setProgress(null);
    }
  };

  const startOver = () => {
    setFiles([]);
    setProgress(null);
    setResult(null);
  };

  return (
    <div className="min-h-dvh bg-white px-5 py-6">
      <div className="mx-auto max-w-lg">
        <Logo />

        {query.isLoading ? (
          <div className="mt-12 space-y-4"><Skeleton className="size-12" /><Skeleton className="h-9 w-3/4" /><Skeleton className="h-40 w-full" /></div>
        ) : query.error || !query.data ? (
          <EmptyState icon="🔗" title="This upload link isn't active" body="It may be wrong, or the organizer has switched it off. Ask them for a new link." action={<ButtonLink to="/" variant="secondary">About PhotoMatch</ButtonLink>} className="mt-10" />
        ) : (
          <div className="mt-12 animate-enter">
            <p className="text-5xl" aria-hidden>📤</p>
            <p className="mt-4 text-sm text-muted">Add your photos to</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-balance text-ink">{query.data.name}</h1>
            <p className="mt-2 text-[15px] text-muted">Took photos at this event? Share them here, and every guest can find the ones they're in.</p>

            {result ? (
              <div className="mt-8 space-y-4">
                <Alert tone="success" title={`Thank you${name.trim() ? `, ${name.trim()}` : ''}! ${(result.done).toLocaleString()} photo${result.done === 1 ? '' : 's'} sent.`}>
                  The organizer will review them before guests can find them.
                </Alert>
                <UploadSummaryText progress={result} />
                <Button variant="secondary" onClick={startOver}>Add more photos</Button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-8 space-y-5">
                <Input
                  label="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya (bride's cousin)"
                  required
                  maxLength={60}
                  disabled={busy}
                  hint="Shown to the organizer next to your photos."
                />
                <div className="space-y-2">
                  <PhotoDropzone onFiles={addFiles} disabled={busy} />
                  {notice && <Alert tone="warning">{notice}</Alert>}
                  {files.length > 0 && !busy && (
                    <p className="flex items-center justify-between text-sm text-muted">
                      {files.length.toLocaleString()} photo{files.length === 1 ? '' : 's'} selected
                      <button type="button" onClick={() => setFiles([])} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 transition hover:bg-hover hover:text-ink"><X className="size-3.5" />Clear</button>
                    </p>
                  )}
                </div>
                {progress && <UploadProgressCard progress={progress} />}
                <ErrorText>{error}</ErrorText>
                <Button type="submit" size="lg" loading={busy} disabled={!files.length}>
                  {busy ? 'Uploading…' : `Upload ${files.length ? files.length.toLocaleString() + ' ' : ''}photo${files.length === 1 ? '' : 's'}`}
                  {!busy && <ArrowRight className="size-4" />}
                </Button>
                {busy && <p className="text-xs text-muted">Keep this page open until the upload finishes.</p>}
              </form>
            )}

            <p className="mt-10 border-t border-line pt-5 text-xs text-muted">
              Your photos go to the organizer of this event. Guests only see a photo after the organizer approves it, and only if they're in it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
