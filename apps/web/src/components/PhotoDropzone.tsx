/** Drag-and-drop (or click) area for choosing event photos. Filters out unsupported files. */
import { useRef, useState, type DragEvent } from 'react';
import { ImageUp } from 'lucide-react';
import { cn } from '../lib/cn';
import { ACCEPTED_TYPES, MAX_FILE_MB } from '../lib/upload';

type Props = { onFiles: (files: File[], skipped: number) => void; disabled?: boolean; compact?: boolean };

export function PhotoDropzone({ onFiles, disabled, compact }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);
  const spread = dragging ? 1.8 : hovering ? 1 : 0.5; // how far the little prints fan out

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
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
      onDrop={onDrop}
      className={cn(
        'group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed text-center transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
        compact ? 'px-4 py-9' : 'px-6 py-16',
        dragging ? 'scale-[1.01] border-ink bg-white' : 'border-stone-400/70 bg-paper hover:border-ink hover:bg-white',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <input ref={inputRef} type="file" multiple hidden accept={ACCEPTED_TYPES.join(',')} onChange={(e) => { accept(e.target.files); e.target.value = ''; }} />
      {/* A little fan of prints that spreads out when you hover or drag over it */}
      <div className="relative h-14 w-20">
        {[-12, 0, 12].map((angle, i) => (
          <span
            key={angle}
            className={cn(
              'absolute inset-x-3 top-1 h-12 rounded-md bg-white shadow-print ring-1 ring-stone-900/10 transition-transform duration-500 ease-editorial',
              i === 1 && 'grid place-items-center bg-ink text-paper',
            )}
            style={{ transform: `rotate(${angle * spread}deg) translateX(${angle * Math.max(0, spread - 0.5)}px)` }}
          >
            {i === 1 && <ImageUp className="size-5" />}
          </span>
        ))}
      </div>
      <p className="mt-5 font-display text-2xl text-ink">
        {dragging ? 'Let go to add them' : <>Drag photos here, or <span className="underline decoration-stone-300 underline-offset-4">browse</span></>}
      </p>
      <p className="mt-1 text-xs text-stone-500">JPG, PNG or WEBP · up to {MAX_FILE_MB} MB each · select hundreds at once</p>
    </div>
  );
}
