import { ArrowLeft } from 'lucide-react';
import { Logo } from '../components/Logo';
import { ButtonLink } from '../components/ui';

export function NotFoundPage() {
  return (
    <div className="grid min-h-dvh bg-paper lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="flex flex-1 animate-enter flex-col justify-center py-16">
          <p className="eyebrow flex items-center gap-2 text-stone-500"><span className="size-2 rounded-full bg-brand-500" />Error 404</p>
          <h1 className="mt-5 font-display text-7xl leading-[0.95] tracking-tight text-ink sm:text-8xl">Lost in<br /><em>the moment.</em></h1>
          <p className="mt-6 max-w-sm text-lg text-stone-500">This page isn't in the picture — it doesn't exist or was moved.</p>
          <ButtonLink to="/" size="lg" className="group mt-10 w-fit"><ArrowLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-1" />Back to home</ButtonLink>
        </div>
      </div>
      <div className="relative hidden p-3 lg:block">
        <div className="relative h-full overflow-hidden rounded-[28px] bg-ink">
          <img src="/editorial/lost-lights.webp" alt="An empty street strung with lights at night" className="absolute inset-0 size-full animate-develop object-cover" />
          <div className="grain absolute inset-0 opacity-30" />
          <p className="absolute bottom-8 left-8 font-display text-[180px] leading-none text-white/90">404</p>
        </div>
      </div>
    </div>
  );
}
