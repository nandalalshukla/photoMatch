/**
 * A printable table card for an event: name, QR code and a one-line
 * instruction. Shown as the share preview on the event page, and printed from
 * the "Print table card" dialog via <PrintOnly>.
 */
import type { ReactNode, Ref } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { cn } from '../lib/cn';

type Props = {
  eventName: string;
  guestUrl: string;
  code: string;
  /** Wraps the QR canvas, so the page can download it as a PNG. */
  qrRef?: Ref<HTMLDivElement>;
  dimmed?: boolean;
  large?: boolean;
  className?: string;
};

export function TableCard({ eventName, guestUrl, code, qrRef, dimmed, large, className }: Props) {
  const qrSize = large ? 260 : 168;
  return (
    <div className={cn('relative mx-auto flex w-full flex-col items-center bg-white text-center text-ink shadow-print ring-1 ring-stone-900/10', large ? 'max-w-md rounded-2xl px-10 py-12' : 'rounded-2xl px-6 py-7', className)}>
      <p className="eyebrow text-stone-500">Find your photos</p>
      <h3 className={cn('mt-3 font-display leading-[1.05] text-balance', large ? 'text-5xl' : 'text-[28px]')}>{eventName}</h3>
      <div ref={qrRef} className={cn('mt-6 rounded-xl p-3 ring-1 ring-stone-200 transition', dimmed && 'opacity-40 grayscale')}>
        <QRCodeCanvas value={guestUrl} size={qrSize} level="H" fgColor="#141312" imageSettings={{ src: '/logo.svg', height: qrSize * 0.2, width: qrSize * 0.2, excavate: true }} />
      </div>
      <p className={cn('mt-6 text-stone-600', large ? 'text-base' : 'text-[13px]')}>Scan with your phone camera, then send a selfie.<br />We'll send you every photo you're in.</p>
      <div className="mt-6 flex w-full items-center justify-between border-t border-dashed border-stone-300 pt-4 text-[11px] text-stone-400">
        <span className="font-mono tracking-wider">{code}</span>
        <span>PhotoMatch AI</span>
      </div>
    </div>
  );
}

/**
 * Renders its children straight into <body>, hidden on screen and centered on
 * the printed page. While it's mounted, printing shows nothing else (index.css).
 */
export function PrintOnly({ children }: { children: ReactNode }) {
  return createPortal(<div className="print-root hidden min-h-dvh place-items-center bg-white print:grid">{children}</div>, document.body);
}
