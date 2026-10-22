/** Two-column layout for sign-in / sign-up pages: form on the left, brand panel on the right. */
import type { ReactNode } from 'react';
import { ScanFace } from 'lucide-react';
import { Logo } from './Logo';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1.5 mb-8 text-sm text-slate-500">{subtitle}</p>
          {children}
        </div>
      </div>
      <div className="relative hidden overflow-hidden brand-gradient lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-end p-14 text-white">
          <ScanFace className="mb-6 size-12 opacity-90" />
          <p className="max-w-md text-3xl leading-snug font-semibold">"Our guests found their photos before the after-party even started."</p>
          <p className="mt-4 text-white/80">— Every organizer using PhotoMatch AI</p>
        </div>
      </div>
    </div>
  );
}
