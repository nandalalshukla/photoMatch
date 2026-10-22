/** Marketing home page: what PhotoMatch AI does and how it works. */
import {
  ArrowRight, Camera, CheckCheck, Images, Lock, QrCode, ScanFace, Send, ShieldCheck, Sparkles, Upload, Zap,
} from 'lucide-react';
import { ButtonLink } from '../components/ui';
import { Logo } from '../components/Logo';
import { useSession } from '../lib/auth-client';

const steps = [
  { icon: Upload, title: 'Upload the album', body: 'Drop in hundreds or thousands of event photos. Our AI finds every face in the background.' },
  { icon: QrCode, title: 'Share one QR code', body: 'Print it on a table card or project it on screen. Guests scan it with their phone camera.' },
  { icon: Send, title: 'Guests send a selfie', body: 'On WhatsApp or Telegram. Seconds later they get a private gallery with every photo they are in.' },
];

const features = [
  { icon: ScanFace, title: 'Accurate face matching', body: 'State-of-the-art face recognition finds guests even in crowded group shots.' },
  { icon: Send, title: 'WhatsApp & Telegram', body: 'Guests use the app they already have. No downloads, no accounts, no passwords.' },
  { icon: ShieldCheck, title: 'Liveness protection', body: 'Optional live face check before a gallery opens, so forwarded links reveal nothing.' },
  { icon: Lock, title: 'Private by design', body: 'Selfies are never stored — only a mathematical face signature used for matching.' },
  { icon: Zap, title: 'Live progress', body: 'Watch photos being analysed in real time and share the moment they are ready.' },
  { icon: Images, title: 'One-tap download', body: 'Guests select their favourites and save them all at once as a ZIP or to their phone.' },
];

/** A little phone mock-up showing the guest chat, built only with HTML + CSS. */
function ChatMockup() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-6 rounded-[2.5rem] brand-gradient opacity-20 blur-2xl" />
      <div className="relative rounded-[2rem] bg-slate-900 p-3 shadow-2xl">
        <div className="rounded-[1.5rem] bg-[#efeae2] p-4">
          <div className="mb-4 flex items-center gap-2 border-b border-black/5 pb-3">
            <img src="/logo.svg" alt="" className="size-8" />
            <div>
              <p className="text-sm font-semibold">PhotoMatch AI</p>
              <p className="text-xs text-slate-500">online</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <p className="ml-auto w-fit max-w-[80%] rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2">Find my photos for event K7P2QM9X</p>
            <p className="w-fit max-w-[85%] rounded-xl rounded-tl-sm bg-white px-3 py-2">✅ Connected to <b>Maya &amp; Aarav's Wedding</b>. Send me a selfie!</p>
            <div className="ml-auto w-28 rounded-xl rounded-tr-sm bg-[#d9fdd3] p-1.5">
              <div className="grid aspect-square place-items-center rounded-lg bg-gradient-to-br from-amber-200 to-rose-300"><Camera className="size-6 text-white" /></div>
            </div>
            <div className="w-fit max-w-[85%] rounded-xl rounded-tl-sm bg-white px-3 py-2">
              🎉 I found <b>23 photos</b> of you!
              <div className="mt-2 grid grid-cols-3 gap-1">
                {['from-violet-300 to-fuchsia-300', 'from-sky-300 to-indigo-300', 'from-amber-200 to-orange-300', 'from-emerald-200 to-teal-300', 'from-rose-200 to-pink-300', 'from-indigo-200 to-violet-300'].map((g) => (
                  <div key={g} className={`aspect-square rounded-md bg-gradient-to-br ${g}`} />
                ))}
              </div>
              <p className="mt-2 font-semibold text-brand-700">Open my photos →</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const { data } = useSession();
  const cta = data ? { to: '/dashboard', label: 'Go to dashboard' } : { to: '/sign-up', label: 'Create your first event' };

  return (
    <div className="bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          {!data && <ButtonLink to="/sign-in" variant="ghost">Sign in</ButtonLink>}
          <ButtonLink to={cta.to}>{data ? 'Dashboard' : 'Get started'}</ButtonLink>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-2 lg:pt-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
            <Sparkles className="size-4" /> AI photo delivery for events
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
            Every photo you're in.<br />
            <span className="brand-gradient-text">One selfie away.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
            Upload your event album once. Guests scan a QR code, send a selfie on WhatsApp or Telegram,
            and instantly receive a private gallery of every photo they appear in.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to={cta.to} size="lg">{cta.label}<ArrowRight className="size-4" /></ButtonLink>
            <a href="#how" className="inline-flex items-center rounded-xl px-6 py-3.5 font-semibold text-slate-700 hover:bg-slate-100">See how it works</a>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
            {['Free for guests', 'No app to install', 'Works with thousands of photos'].map((t) => (
              <li key={t} className="flex items-center gap-1.5"><CheckCheck className="size-4 text-emerald-500" />{t}</li>
            ))}
          </ul>
        </div>
        <ChatMockup />
      </section>

      {/* How it works */}
      <section id="how" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">Three steps. Zero hassle.</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">No more scrolling through 2,000 photos to find the five you're in.</p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="relative rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200/70">
                <span className="absolute top-6 right-6 text-5xl font-black text-slate-100">{i + 1}</span>
                <div className="grid size-12 place-items-center rounded-xl brand-gradient text-white"><step.icon className="size-6" /></div>
                <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">Built for organizers. Loved by guests.</h2>
        <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="flex gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><f.icon className="size-5" /></div>
              <div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final call to action */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl brand-gradient px-8 py-14 text-center text-white">
          <h2 className="text-3xl font-bold sm:text-4xl">Make your next event unforgettable</h2>
          <p className="mx-auto mt-3 max-w-lg text-white/85">Set up an event in two minutes. Your guests will thank you.</p>
          <ButtonLink to={cta.to} variant="secondary" size="lg" className="mt-8">{cta.label}<ArrowRight className="size-4" /></ButtonLink>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} PhotoMatch AI · Find yourself in every moment.
      </footer>
    </div>
  );
}
