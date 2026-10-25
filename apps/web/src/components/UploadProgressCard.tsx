import { LoaderCircle } from 'lucide-react';
import type { UploadProgress } from '../lib/upload';
import { ProgressBar } from './ui';

/** Shows the upload in two phases: checking for duplicates, then uploading. */
export function UploadProgressCard({ progress }: { progress: UploadProgress }) {
  const checking = progress.phase === 'checking';
  const toUpload = progress.total - progress.duplicates;
  const percent = checking
    ? Math.round((progress.checked / progress.total) * 100)
    : toUpload === 0
      ? 100
      : Math.round(((progress.done + progress.failed) / toUpload) * 100);

  return (
    <div className="animate-enter space-y-3 rounded-md bg-paper p-3.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 font-medium text-ink">
          <LoaderCircle className="size-4 animate-spin text-muted" />
          {checking
            ? `Checking for duplicates… ${progress.checked.toLocaleString()} of ${progress.total.toLocaleString()}`
            : `Uploading ${progress.done.toLocaleString()} of ${toUpload.toLocaleString()} photos`}
        </span>
        <span className="text-sm font-medium text-ink tabular-nums">{percent}%</span>
      </div>
      <ProgressBar value={percent} active />
      <UploadSummaryText progress={progress} />
    </div>
  );
}

/** One-line notes about skipped duplicates and failed files (also used after the upload). */
export function UploadSummaryText({ progress }: { progress: Pick<UploadProgress, 'duplicates' | 'failed'> }) {
  return (
    <>
      {progress.duplicates > 0 && (
        <p className="text-xs text-muted">
          {progress.duplicates} duplicate photo{progress.duplicates === 1 ? '' : 's'} skipped — already in this event or chosen twice.
        </p>
      )}
      {progress.failed > 0 && (
        <p className="text-xs text-[#eb5757]">{progress.failed} photo(s) failed to upload — add them again and only the missing ones will be sent.</p>
      )}
    </>
  );
}
