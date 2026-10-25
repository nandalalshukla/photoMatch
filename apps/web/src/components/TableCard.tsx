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
    <div className={cn('relative mx-auto flex w-full flex-col items-center rounded-lg border border-line bg-white text-center text-ink', large ? 'max-w-md px-10 py-10' : 'px-6 py-6', className)}>
      <p className={large ? 'text-3xl' : 'text-2xl'} aria-hidden>📸</p>
      <p className="mt-2 text-xs text-muted">Find your photos from</p>
      <h3 className={cn('mt-1 font-bold tracking-tight text-balance', large ? 'text-3xl' : 'text-xl')}>{eventName}</h3>
      <div ref={qrRef} className={cn('mt-5 rounded-md border border-line p-2.5 transition', dimmed && 'opacity-40 grayscale')}>
        <QRCodeCanvas value={guestUrl} size={qrSize} level="H" fgColor="#191919" imageSettings={{ src: '/logo.svg', height: qrSize * 0.2, width: qrSize * 0.2, excavate: true }} />
      </div>
      <p className={cn('mt-5 text-muted', large ? 'text-base' : 'text-[13px]')}>Scan with your phone camera, then send a selfie.<br />We'll send you every photo you're in.</p>
      <div className="mt-5 flex w-full items-center justify-between border-t border-line pt-3 text-[11px] text-faint">
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
