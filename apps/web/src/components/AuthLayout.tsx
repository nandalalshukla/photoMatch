/** Layout for sign-in / sign-up pages: one narrow, centered column. */
import type { ReactNode } from 'react';
import { Logo } from './Logo';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-white px-6 py-6">
      <Logo />
      <div className="mx-auto flex w-full max-w-[340px] flex-1 animate-enter flex-col justify-center py-12">
        <h1 className="text-[26px] font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 mb-8 text-[15px] text-muted">{subtitle}</p>
        {children}
      </div>
      <p className="text-center text-xs text-faint">© {new Date().getFullYear()} PhotoMatch AI</p>
    </div>
  );
}
