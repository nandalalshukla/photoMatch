import type { UploadProgress } from '../lib/upload';
import { ProgressBar } from './ui';

/** Shows how many photos have been uploaded so far. */
export function UploadProgressCard({ progress }: { progress: UploadProgress }) {
  const percent = Math.round(((progress.done + progress.failed) / progress.total) * 100);
  return (
    <div className="space-y-2 rounded-xl bg-brand-50/60 p-4 ring-1 ring-brand-100">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-slate-700">Uploading {progress.done} of {progress.total} photos</span>
        <span className="font-semibold text-brand-700">{percent}%</span>
      </div>
      <ProgressBar value={percent} />
      {progress.failed > 0 && <p className="text-xs text-red-600">{progress.failed} photo(s) failed to upload — you can add them again later.</p>}
    </div>
  );
}
