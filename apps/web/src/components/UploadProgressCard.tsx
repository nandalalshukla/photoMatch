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
    <div className="space-y-2 rounded-xl bg-brand-50/60 p-4 ring-1 ring-brand-100">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-slate-700">
          {checking
            ? `Checking for duplicates… ${progress.checked} of ${progress.total}`
            : `Uploading ${progress.done} of ${toUpload} photos`}
        </span>
        <span className="font-semibold text-brand-700">{percent}%</span>
      </div>
      <ProgressBar value={percent} />
      <UploadSummaryText progress={progress} />
    </div>
  );
}

/** One-line notes about skipped duplicates and failed files (also used after the upload). */
export function UploadSummaryText({ progress }: { progress: Pick<UploadProgress, 'duplicates' | 'failed'> }) {
  return (
    <>
      {progress.duplicates > 0 && (
        <p className="text-xs text-slate-600">
          {progress.duplicates} duplicate photo{progress.duplicates === 1 ? '' : 's'} skipped — already in this event or chosen twice.
        </p>
      )}
      {progress.failed > 0 && (
        <p className="text-xs text-red-600">{progress.failed} photo(s) failed to upload — add them again and only the missing ones will be sent.</p>
      )}
    </>
  );
}
