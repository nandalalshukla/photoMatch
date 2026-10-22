/** Drag-and-drop (or click) area for choosing event photos. Filters out unsupported files. */
import { useRef, useState, type DragEvent } from 'react';
import { UploadCloud } from 'lucide-react';
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
      tabIndex={0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => e.key === 'Enter' && !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition
        ${compact ? 'px-4 py-6' : 'px-6 py-12'}
        ${dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50/50 hover:border-brand-400 hover:bg-brand-50/40'}
        ${disabled ? 'pointer-events-none opacity-50' : ''}`}
    >
      <input ref={inputRef} type="file" multiple hidden accept={ACCEPTED_TYPES.join(',')} onChange={(e) => { accept(e.target.files); e.target.value = ''; }} />
      <div className="grid size-12 place-items-center rounded-xl bg-white text-brand-600 shadow-sm ring-1 ring-slate-200"><UploadCloud className="size-6" /></div>
      <p className="mt-3 font-semibold text-slate-800">Drop photos here or click to browse</p>
      <p className="mt-1 text-xs text-slate-500">JPG, PNG or WEBP · up to {MAX_FILE_MB} MB each · select hundreds at once</p>
    </div>
  );
}
