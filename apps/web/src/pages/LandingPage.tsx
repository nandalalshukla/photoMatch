/**
 * Marketing home page, laid out like a photo magazine. The interactive pieces
 * live in components/landing/ (FaceLens, StoryPhone, CompareSlider, MomentsReel);
 * all copy is in components/landing/content.ts.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowRight, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { Logo } from '../components/Logo';
import { CompareSlider } from '../components/landing/CompareSlider';
import { FaceLens } from '../components/landing/FaceLens';
import { MomentsReel } from '../components/landing/MomentsReel';
import { StoryPhone } from '../components/landing/StoryPhone';
import { faqs, features, navLinks, occasions, privacyPoints } from '../components/landing/content';
import { ButtonLink, Reveal, useScrollProgress } from '../components/ui';
import { cn } from '../lib/cn';
import { useSession } from '../lib/auth-client';

/** Kicker + serif headline used to open each section. */
function SectionTitle({ eyebrow, title, body, dark, className }: { eyebrow: string; title: ReactNode; body?: string; dark?: boolean; className?: string }) {
  return (
    <Reveal className={className}>
      <p className={cn('eyebrow', dark ? 'text-brand-400' : 'text-brand-600')}>{eyebrow}</p>
      <h2 className={cn('mt-4 font-display text-5xl leading-[1.02] tracking-tight text-balance sm:text-7xl', dark ? 'text-paper' : 'text-ink')}>{title}</h2>
      {body && <p className={cn('mt-5 max-w-xl text-lg leading-relaxed', dark ? 'text-white/60' : 'text-stone-600')}>{body}</p>}
    </Reveal>
  );
}

function Header({ signedIn }: { signedIn: boolean }) {
  // Add a background once the page is scrolled, so the header reads over content.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={cn('sticky top-0 z-40 transition-all duration-500', scrolled ? 'bg-paper/80 shadow-[0_1px_0_rgb(20_19_18/0.08)] backdrop-blur-xl' : 'bg-transparent')}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="group relative text-sm text-stone-600 transition hover:text-ink">
              {link.label}
              <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-ink transition-transform duration-300 group-hover:scale-x-100" />
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {!signedIn && <ButtonLink to="/sign-in" variant="ghost" size="sm" className="hidden sm:inline-flex">Sign in</ButtonLink>}
          <ButtonLink to={signedIn ? '/dashboard' : '/sign-up'} size="sm">{signedIn ? 'Dashboard' : 'Get started'}</ButtonLink>
        </div>
      </div>
    </header>
  );
}

/** The big photo under the headline: grows slightly and drifts as you scroll. */
function HeroPhoto() {
  const { ref, progress } = useScrollProgress<HTMLDivElement>();
  const grow = Math.min(1, Math.max(0, (progress - 0.2) / 0.3));
  return (
    <div ref={ref} className="mx-auto max-w-[1400px] px-3 sm:px-6">
      <div
        className="relative h-[62vh] min-h-[420px] overflow-hidden rounded-[28px] bg-ink sm:rounded-[36px]"
        style={{ transform: `scale(${0.94 + grow * 0.06})` }}
      >
        <img
          src="/editorial/hero-sparkler.webp"
          alt="A guest holding a sparkler at night"
          className="absolute inset-0 size-full animate-develop object-cover [animation-delay:250ms]"
          style={{ transform: `translateY(${(progress - 0.5) * -60}px) scale(1.12)` }}
        />
        <div className="grain absolute inset-0 opacity-40" />
        <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />

        {/* What a guest gets */}
        <div className="absolute bottom-4 left-4 flex max-w-[calc(100%-2rem)] animate-slide-up items-center gap-3 rounded-2xl bg-white/15 p-2.5 pr-4 text-white ring-1 ring-white/25 backdrop-blur-xl [animation-delay:1.2s] sm:bottom-6 sm:left-6">
          <img src="/editorial/selfie.webp" alt="" className="size-12 rounded-xl object-cover" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">23 photos found</p>
            <p className="truncate text-xs text-white/70">from one selfie · Maya &amp; Aarav's Wedding</p>
          </div>
          <div className="ml-2 hidden -space-x-3 sm:flex">
            {['match-field', 'match-lake', 'match-meadow'].map((name) => <img key={name} src={`/editorial/${name}.webp`} alt="" className="size-9 rounded-lg object-cover ring-2 ring-white/40" />)}
          </div>
        </div>
        <p className="absolute right-6 bottom-6 hidden text-right text-xs text-white/70 sm:block">
          <span className="eyebrow block text-white/50">Fig. 01</span>The best photo of her night — found in seconds.
        </p>
      </div>
    </div>
  );
}

/** An endless ribbon of the kinds of events PhotoMatch is for. */
function OccasionMarquee() {
  const row = occasions.flatMap((word) => [word, '•']);
  return (
    <div className="group overflow-hidden border-y border-stone-300/70 py-6" aria-label={`For ${occasions.join(', ')}`}>
      <div className="flex w-max animate-marquee gap-8 group-hover:[animation-play-state:paused]" aria-hidden>
        {[...row, ...row].map((word, i) => (
          <span key={i} className={cn('font-display text-4xl whitespace-nowrap sm:text-5xl', word === '•' ? 'text-brand-500' : 'text-ink italic')}>{word}</span>
        ))}
      </div>
    </div>
  );
}

export function LandingPage() {
  const { data } = useSession();
  const cta = data ? { to: '/dashboard', label: 'Go to dashboard' } : { to: '/sign-up', label: 'Create your first event' };

  return (
    <div className="overflow-x-clip">
      <Header signedIn={!!data} />

      {/* Hero */}
      <section className="pt-10 pb-16 sm:pt-16 sm:pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="eyebrow flex animate-enter items-center gap-2 text-stone-500">
            <span className="size-2 rounded-full bg-brand-500" />AI photo delivery for events
          </p>
          <h1 className="mt-6 animate-enter font-display text-[clamp(2.4rem,9.6vw,8.5rem)] leading-[0.92] tracking-[-0.03em] text-ink [animation-delay:80ms]">
            Every photo you're in.<br />
            <em className="text-stone-500">One selfie away.</em>
          </h1>
          <div className="mt-10 grid animate-enter gap-8 [animation-delay:200ms] md:grid-cols-[1fr_auto] md:items-end">
            <p className="max-w-lg text-lg leading-relaxed text-stone-600">
              Upload the album once. Guests scan a QR code, send a selfie on WhatsApp or Telegram,
              and get a private gallery of every photo they appear in.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <ButtonLink to={cta.to} size="lg" className="group">{cta.label}<ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" /></ButtonLink>
              <a href="#demo" className="group inline-flex h-12 items-center gap-2 rounded-full px-5 text-[15px] font-medium text-ink transition hover:bg-stone-900/5">
                Try the demo<ArrowDown className="size-4 transition-transform duration-300 group-hover:translate-y-0.5" />
              </a>
            </div>
          </div>
        </div>
        <div className="mt-14 sm:mt-20"><HeroPhoto /></div>
      </section>

      <OccasionMarquee />

      {/* Interactive face detection */}
      <section id="demo" className="scroll-mt-16 py-24 sm:py-36">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 md:grid-cols-[1fr_320px] md:items-end">
            <SectionTitle eyebrow="Try it" title={<>Our AI sees <em>every</em> face.</>} />
            <Reveal delay={150}><p className="text-lg leading-relaxed text-stone-600">Move the lens over the café. Each face it finds is what PhotoMatch does to every photo you upload — automatically.</p></Reveal>
          </div>
          <Reveal delay={100} className="mt-12"><FaceLens /></Reveal>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-16 bg-paper-deep/60 py-24 sm:py-36">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle eyebrow="How it works" title={<>Three steps. <em>Zero hassle.</em></>} body="From the last dance to every guest's phone — without anyone scrolling through 2,000 photos." />
          <div className="mt-16"><StoryPhone /></div>
        </div>
      </section>

      {/* Before / after */}
      <section className="py-24 sm:py-36">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 md:grid-cols-[1fr_320px] md:items-end">
            <SectionTitle eyebrow="The difference" title={<>From 2,148 photos to <em>your</em> 23.</>} />
            <Reveal delay={150}><p className="text-lg leading-relaxed text-stone-600">Drag the handle. On the left, the whole night. On the right, only the photos a guest is actually in.</p></Reveal>
          </div>
          <Reveal delay={100} className="mt-12"><CompareSlider /></Reveal>
        </div>
      </section>

      <MomentsReel />

      {/* Privacy */}
      <section id="privacy" className="relative scroll-mt-16 overflow-hidden bg-ink py-24 text-paper sm:py-36">
        <div className="grain absolute inset-0 opacity-20" />
        <div className="relative mx-auto grid max-w-6xl gap-14 px-4 sm:px-6 lg:grid-cols-[0.85fr_1fr] lg:gap-20">
          <Reveal develop className="relative">
            <div className="overflow-hidden rounded-[28px]">
              <img src="/editorial/privacy-glass.webp" alt="A woman seen through a rain-streaked window" loading="lazy" className="aspect-[4/5] w-full object-cover" />
            </div>
            <p className="mt-3 text-xs text-white/40"><span className="eyebrow mr-2 text-white/30">Fig. 04</span>Seen only by the person in the photo.</p>
          </Reveal>
          <div className="flex flex-col justify-center">
            <SectionTitle dark eyebrow="Privacy & security" title={<>A gallery opens for <em>one</em> person only.</>} body="Faces are personal. PhotoMatch is built so the only person who can open a gallery is the one in it." />
            <ul className="mt-12 divide-y divide-white/10 border-y border-white/10">
              {privacyPoints.map((p, i) => (
                <Reveal as="li" key={p.title} delay={i * 90} className="flex gap-5 py-6">
                  <p.icon className="mt-1 size-5 shrink-0 text-brand-400" />
                  <div>
                    <h3 className="text-lg font-medium text-paper">{p.title}</h3>
                    <p className="mt-1 leading-relaxed text-white/55">{p.body}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* For organizers */}
      <section className="py-24 sm:py-36">
        <div className="mx-auto grid max-w-6xl gap-14 px-4 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:gap-20">
          <div>
            <SectionTitle eyebrow="For organizers & photographers" title={<>Everything you need. <em>Nothing</em> guests have to learn.</>} />
            <ol className="mt-12 border-t border-stone-300/70">
              {features.map((f, i) => (
                <Reveal as="li" key={f.title} delay={i * 60} className="group grid grid-cols-[3rem_1fr] gap-4 border-b border-stone-300/70 py-6">
                  <span className="font-display text-2xl text-stone-400 transition-colors duration-300 group-hover:text-brand-600">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h3 className="text-lg font-medium text-ink">{f.title}</h3>
                    <p className="mt-1 leading-relaxed text-stone-600">{f.body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
          <Reveal develop delay={150} className="lg:sticky lg:top-24 lg:self-start">
            <div className="overflow-hidden rounded-[28px]">
              <img src="/editorial/photographer.webp" alt="A photographer holding a film camera" loading="lazy" className="aspect-[4/5] w-full object-cover" />
            </div>
            <p className="mt-3 text-xs text-stone-500"><span className="eyebrow mr-2 text-stone-400">Fig. 05</span>You take the photos. We hand them out.</p>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-16 border-t border-stone-300/70 py-24 sm:py-36">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1fr]">
          <SectionTitle eyebrow="FAQ" title={<>Questions, <em>answered.</em></>} />
          <div className="border-t border-stone-300/70">
            {faqs.map((item, i) => (
              <Reveal key={item.q} delay={i * 60}>
                <details className="group border-b border-stone-300/70 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-left text-lg font-medium text-ink">
                    {item.q}
                    <span className="grid size-8 shrink-0 place-items-center rounded-full ring-1 ring-stone-300 transition duration-300 group-open:rotate-45 group-open:bg-ink group-open:text-paper group-open:ring-ink">
                      <Plus className="size-4" />
                    </span>
                  </summary>
                  <p className="-mt-2 pr-12 pb-6 leading-relaxed text-stone-600">{item.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final call to action */}
      <section className="px-3 pb-3 sm:px-6 sm:pb-6">
        <Reveal develop className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[28px] bg-ink sm:rounded-[36px]">
          <img src="/editorial/cta-fireworks.webp" alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-70" />
          <div className="grain absolute inset-0 opacity-30" />
          <div className="relative px-6 py-24 text-center sm:py-36">
            <h2 className="mx-auto max-w-3xl font-display text-5xl leading-none tracking-tight text-white sm:text-8xl">Make the night <em>unforgettable.</em></h2>
            <p className="mx-auto mt-6 max-w-md text-lg text-white/75">Set up an event in two minutes. Your guests will thank you for every photo.</p>
            <ButtonLink to={cta.to} variant="white" size="lg" className="group mt-10">{cta.label}<ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" /></ButtonLink>
          </div>
        </Reveal>
      </section>

      <footer className="mx-auto max-w-6xl px-4 pt-20 pb-10 sm:px-6">
        <div className="flex flex-col justify-between gap-10 sm:flex-row">
          <p className="max-w-xs text-sm leading-relaxed text-stone-500">Find yourself in every moment. AI photo delivery for weddings, concerts and every event in between.</p>
          <div className="grid grid-cols-2 gap-12 text-sm sm:gap-20">
            <div>
              <p className="eyebrow text-stone-400">Product</p>
              <ul className="mt-4 space-y-2.5">{navLinks.map((link) => <li key={link.href}><a href={link.href} className="text-stone-700 transition hover:text-ink">{link.label}</a></li>)}</ul>
            </div>
            <div>
              <p className="eyebrow text-stone-400">Account</p>
              <ul className="mt-4 space-y-2.5">
                <li><Link to="/sign-in" className="text-stone-700 transition hover:text-ink">Sign in</Link></li>
                <li><Link to="/sign-up" className="text-stone-700 transition hover:text-ink">Create account</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <p aria-hidden className="mt-16 font-display text-[clamp(4rem,19vw,17rem)] leading-[0.8] tracking-[-0.04em] text-ink select-none">PhotoMatch</p>
        <div className="mt-8 flex flex-wrap justify-between gap-2 border-t border-stone-300/70 pt-6 text-xs text-stone-500">
          <span>© {new Date().getFullYear()} PhotoMatch AI</span>
          <span>Photography from Unsplash</span>
        </div>
      </footer>
    </div>
  );
}
