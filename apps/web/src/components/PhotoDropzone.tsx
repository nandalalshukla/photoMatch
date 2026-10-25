/** Drag-and-drop (or click) area for choosing event photos. Filters out unsupported files. */
import { useRef, useState, type DragEvent } from 'react';
import { ImageUp } from 'lucide-react';
import { cn } from '../lib/cn';
import { ACCEPTED_TYPES, MAX_FILE_MB } from '../lib/upload';

type Props = { onFiles: (files: File[], skipped: number) => void; disabled?: boolean; compact?: boolean };

export function PhotoDropzone({ onFiles, disabled, compact }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const accept = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    const valid = files.filter((f) => ACCEPTED_TYPES.includes(f.type) && f.size <= MAX_FILE_MB * 1024 * 1024);
    if (files.length) onFiles(valid, files.length - valid.length);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) accept(event.dataTransfer.files);
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !disabled && (e.preventDefault(), inputRef.current?.click())}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        compact ? 'px-4 py-8' : 'px-6 py-12',
        dragging ? 'border-brand-500 bg-brand-50' : 'border-line bg-paper/50 hover:bg-paper',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <input ref={inputRef} type="file" multiple hidden accept={ACCEPTED_TYPES.join(',')} onChange={(e) => { accept(e.target.files); e.target.value = ''; }} />
      <ImageUp className={cn('size-7', dragging ? 'text-brand-500' : 'text-faint')} />
      <p className="mt-3 text-sm font-medium text-ink">
        {dragging ? 'Drop to add your photos' : <>Drag photos here or <span className="text-brand-500">browse</span></>}
      </p>
      <p className="mt-1 text-xs text-muted">JPG, PNG or WEBP · up to {MAX_FILE_MB} MB each · hundreds at once</p>
    </div>
  );
}
