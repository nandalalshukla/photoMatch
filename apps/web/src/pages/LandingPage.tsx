/**
 * Marketing home page. One job: explain, at a glance, what PhotoMatch does —
 * organizers upload the album, guests send a selfie, guests get only their photos.
 * All copy lives in components/landing/content.ts.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, Check, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { Logo } from '../components/Logo';
import { faqs, features, navLinks, occasions, privacyPoints, steps } from '../components/landing/content';
import { Reveal, revealClass, useInView } from '../components/landing/Reveal';
import { Badge, ButtonLink } from '../components/ui';
import { cn } from '../lib/cn';
import { useSession } from '../lib/auth-client';

/** Section heading: small label + bold title + optional intro. */
function SectionTitle({ label, title, body }: { label: string; title: string; body?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-medium text-brand-500">{label}</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h2>
      {body && <p className="mt-3 text-lg text-muted">{body}</p>}
    </div>
  );
}

/** A rounded box with a caption — one panel of the hero diagram. `active` lights it up. */
function Panel({ title, caption, children, active }: { title: string; caption: string; children: ReactNode; active?: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border bg-white/80 p-4 text-left backdrop-blur transition duration-500',
        active ? 'border-brand-500/40 shadow-[0_0_0_4px_rgb(35_131_226/0.08)]' : 'border-line',
      )}
    >
      <p className="text-xs font-medium text-muted">{title}</p>
      <div className="my-3 flex flex-1 items-center justify-center">{children}</div>
      <p className="text-sm font-semibold text-ink">{caption}</p>
    </div>
  );
}

/**
 * Loops the diagram through its story: 0 = scanning the album, 1 = selfie sent,
 * 2 = matches found. With "reduce motion" it just shows the final step.
 */
function useMatchCycle() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase(2);
      return;
    }
    const durations = [2400, 1400, 4200];
    let current = 0;
    let timer: number;
    const next = () => {
      timer = window.setTimeout(() => {
        current = (current + 1) % durations.length;
        setPhase(current);
        next();
      }, durations[current]);
    };
    next();
    return () => window.clearTimeout(timer);
  }, []);
  return phase;
}

/**
 * The whole product in one picture: a big album → one selfie → only your photos.
 * Plain shapes and emoji, no screenshots, so it reads instantly — and it plays.
 */
function HowItWorksDiagram() {
  const phase = useMatchCycle();
  const yours = [2, 7, 9, 14];
  const arrow = (lit: boolean) => (
    <ChevronRight className={cn('mx-auto size-5 rotate-90 self-center transition-colors duration-500 md:rotate-0', lit ? 'animate-pulse text-brand-500' : 'text-faint')} />
  );
  return (
    <div className="mx-auto grid max-w-4xl animate-enter items-stretch gap-3 [animation-delay:150ms] md:grid-cols-[1fr_auto_0.8fr_auto_1fr]">
      <Panel title="The event album" caption="1,240 photos" active={phase === 0}>
        <div className="relative grid grid-cols-6 gap-1">
          {Array.from({ length: 18 }, (_, i) => (
            <span key={i} className="grid size-7 place-items-center rounded bg-paper text-[13px] sm:size-8">{i % 3 === 0 ? '👥' : i % 3 === 1 ? '🙂' : '👨‍👩‍👧'}</span>
          ))}
          {phase === 0 && <span className="absolute inset-x-0 h-0.5 animate-scan rounded-full bg-brand-500 shadow-[0_0_12px_2px_rgb(35_131_226/0.5)]" />}
        </div>
      </Panel>
      {arrow(phase === 1)}
      <Panel title="A guest sends" caption="One selfie" active={phase === 1}>
        <div className={cn('relative transition duration-500', phase === 0 ? 'scale-90 opacity-40' : 'scale-100 opacity-100')}>
          <div key={phase === 1 ? 'sent' : 'idle'} className={cn('rounded-2xl rounded-br-sm bg-[#d9fdd3] px-4 py-3 text-4xl shadow-xs', phase === 1 && 'animate-pop')}>🤳</div>
          <span className="absolute -right-2 -bottom-2 rounded-full bg-white px-1.5 text-[10px] font-medium text-muted shadow-xs">
            {phase === 0 ? 'WhatsApp' : <span className="text-brand-500">✓✓ Sent</span>}
          </span>
        </div>
      </Panel>
      {arrow(phase === 2)}
      <Panel title="They receive" caption="Only the 23 photos they're in" active={phase === 2}>
        <div className="grid grid-cols-6 gap-1">
          {Array.from({ length: 18 }, (_, i) => {
            const order = yours.indexOf(i);
            const matched = phase === 2 && order >= 0;
            return (
              <span
                key={i}
                className={cn(
                  'relative grid size-7 place-items-center rounded text-[13px] transition duration-500 sm:size-8',
                  matched ? 'animate-pop bg-brand-50 ring-1 ring-brand-500' : 'bg-paper',
                  phase === 2 && !matched && 'opacity-30',
                )}
                style={matched ? { animationDelay: `${order * 180}ms` } : undefined}
              >
                🙂
                {matched && <Check className="absolute -top-1 -right-1 size-3 rounded-full bg-brand-500 p-px text-white" strokeWidth={4} />}
              </span>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

/** Endless, slowly scrolling row of occasion tags; pauses on hover. */
function OccasionMarquee() {
  const row = (hidden?: boolean) => (
    <div className="flex shrink-0 gap-2 pr-2" aria-hidden={hidden}>
      {occasions.map((o) => (
        <Badge key={o.label} color={o.color} className="px-3 py-1.5 text-sm">{o.emoji} {o.label}</Badge>
      ))}
    </div>
  );
  return (
    <div className="group flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
        {row()}
        {row(true)}
      </div>
    </div>
  );
}

/** One "How it works" card: rises in on scroll, lifts on hover. */
function StepCard({ step, index }: { step: (typeof steps)[number]; index: number }) {
  const [ref, inView] = useInView<HTMLLIElement>();
  return (
    <li ref={ref} style={{ transitionDelay: `${index * 120}ms` }} className={revealClass(inView)}>
      <div className="group h-full rounded-lg border border-transparent bg-paper p-6 transition duration-300 hover:-translate-y-1 hover:border-line hover:bg-white hover:shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-3xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" aria-hidden>{step.emoji}</span>
          <span className="text-xs text-muted">Step {index + 1} · {step.who}</span>
        </div>
        <h3 className="mt-5 text-lg font-semibold text-ink">{step.title}</h3>
        <p className="mt-1.5 leading-relaxed text-muted">{step.body}</p>
      </div>
    </li>
  );
}

export function LandingPage() {
  const { data } = useSession();
  const cta = data ? { to: '/dashboard', label: 'Go to your events' } : { to: '/sign-up', label: 'Create an event' };

  return (
    <div className="bg-white">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="rounded-md px-2.5 py-1.5 text-sm text-muted transition hover:bg-hover hover:text-ink">{link.label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            {!data && <ButtonLink to="/sign-in" variant="ghost" size="sm" className="hidden sm:inline-flex">Log in</ButtonLink>}
            <ButtonLink to={data ? '/dashboard' : '/sign-up'} variant="dark" size="sm">{data ? 'Dashboard' : 'Get started'}</ButtonLink>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-24">
        {/* Soft drifting glow + faint dot grid behind the hero. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/2 size-[520px] -translate-x-[90%] animate-drift rounded-full bg-brand-100/70 blur-3xl" />
          <div className="absolute -top-10 left-1/2 size-[440px] translate-x-[10%] animate-drift rounded-full bg-tag-pink/70 blur-3xl [animation-delay:-9s]" />
          <div className="absolute inset-0 bg-[radial-gradient(#e9e9e7_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        </div>
        <div className="mx-auto max-w-3xl animate-enter">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/70 px-3 py-1 text-sm text-muted backdrop-blur">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/60" />
              <span className="relative size-2 rounded-full bg-brand-500" />
            </span>
            AI photo delivery for events
          </span>
          <h1 className="mt-6 text-[40px] leading-[1.08] font-bold tracking-tight text-balance text-ink sm:text-6xl">
            Every photo you're in.<br />
            <span className="animate-gradient-pan bg-linear-to-r from-brand-500 via-[#9065b0] to-brand-500 bg-[length:200%_auto] bg-clip-text text-transparent">One selfie away.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-balance text-muted sm:text-xl">
            Upload your event album once. Guests send a selfie on WhatsApp or Telegram and get a private gallery of only their photos.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <ButtonLink to={cta.to} size="lg" className="group">{cta.label}<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></ButtonLink>
            <a href="#how" className="inline-flex h-11 items-center rounded-md px-5 text-[15px] font-medium text-ink transition hover:bg-hover">How it works</a>
          </div>
          <p className="mt-4 text-sm text-faint">Free for guests · No app to install</p>
        </div>
        <div className="mt-16"><HowItWorksDiagram /></div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-14 border-t border-line px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Reveal><SectionTitle label="How it works" title="Three steps. No scrolling through thousands of photos." /></Reveal>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((step, i) => <StepCard key={step.title} step={step} index={i} />)}
          </ol>
        </div>
      </section>

      {/* Who it's for */}
      <section className="px-4 pb-20 sm:px-6">
        <Reveal className="mx-auto flex max-w-6xl items-center gap-4">
          <span className="shrink-0 text-sm text-muted">Made for</span>
          <OccasionMarquee />
        </Reveal>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-14 border-t border-line px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Reveal><SectionTitle label="Features" title="Everything organizers need. Nothing guests have to learn." /></Reveal>
          <div className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 100} className="group flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-paper text-xl transition duration-300 group-hover:-translate-y-0.5 group-hover:scale-110 group-hover:bg-brand-50" aria-hidden>{f.emoji}</span>
                <div>
                  <h3 className="font-semibold text-ink">{f.title}</h3>
                  <p className="mt-1 text-muted">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section id="privacy" className="scroll-mt-14 border-t border-line px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Reveal><SectionTitle label="Privacy" title="A gallery opens only for the person in it." /></Reveal>
          <Reveal delay={100} className="mt-10 flex gap-4 rounded-lg bg-paper p-6 sm:p-8">
            <span className="text-2xl leading-none" aria-hidden>🔒</span>
            <ul className="space-y-3">
              {privacyPoints.map((point) => (
                <li key={point} className="flex gap-2.5 leading-relaxed text-ink"><Check className="mt-1 size-4 shrink-0 text-brand-500" />{point}</li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* FAQ — Notion-style toggles */}
      <section id="faq" className="scroll-mt-14 border-t border-line px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <Reveal><SectionTitle label="FAQ" title="Questions & answers" /></Reveal>
          <Reveal delay={100} className="mt-8">
            {faqs.map((item) => (
              <details key={item.q} className="group rounded-md [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-start gap-1.5 rounded-md px-1 py-2 font-medium text-ink transition hover:bg-hover">
                  <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-90" />
                  {item.q}
                </summary>
                <p className="pt-1 pr-2 pb-4 pl-7 leading-relaxed text-muted">{item.a}</p>
              </details>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Call to action */}
      <section className="relative isolate overflow-hidden border-t border-line px-4 py-24 text-center sm:px-6">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 mx-auto h-64 max-w-3xl animate-drift rounded-full bg-brand-50 blur-3xl" />
        <Reveal>
          <p className="inline-block text-4xl motion-safe:animate-bounce" aria-hidden>🎉</p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Ready for your next event?</h2>
          <p className="mt-3 text-lg text-muted">Set it up in two minutes. Your guests will thank you.</p>
          <ButtonLink to={cta.to} size="lg" className="group mt-8">{cta.label}<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></ButtonLink>
        </Reveal>
      </section>

      <footer className="border-t border-line px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm text-muted">
          <Logo />
          <div className="flex flex-wrap gap-5">
            {navLinks.map((link) => <a key={link.href} href={link.href} className="transition hover:text-ink">{link.label}</a>)}
            <Link to="/sign-in" className="transition hover:text-ink">Log in</Link>
          </div>
          <span>© {new Date().getFullYear()} PhotoMatch AI</span>
        </div>
      </footer>
    </div>
  );
}
