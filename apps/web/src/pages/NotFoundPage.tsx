import { Logo } from '../components/Logo';
import { ButtonLink } from '../components/ui';

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-white px-6 py-6">
      <Logo />
      <div className="mx-auto flex max-w-md flex-1 animate-enter flex-col items-center justify-center text-center">
        <p className="text-6xl" aria-hidden>🧭</p>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink">Page not found</h1>
        <p className="mt-2 text-muted">The page you're looking for doesn't exist or was moved.</p>
        <ButtonLink to="/" className="mt-8">Back to home</ButtonLink>
      </div>
    </div>
  );
}
