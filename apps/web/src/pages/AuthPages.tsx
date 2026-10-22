/**
 * Sign in, sign up, forgot password and reset password.
 * All the real work (password hashing, emails, sessions, Google OAuth) is done
 * by better-auth — these pages only collect input and call authClient.
 */
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { MailCheck } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { Button, ErrorText, Input } from '../components/ui';
import { authClient } from '../lib/auth-client';
import { useConfig } from '../lib/use-config';

/** Official multi-color Google "G". */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}

/** "Continue with Google" — only shown when Google keys are configured on the server. */
function GoogleButton({ next }: { next: string }) {
  const config = useConfig();
  if (!config?.google) return null;
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => authClient.signIn.social({ provider: 'google', callbackURL: next })}
      >
        <GoogleIcon />Continue with Google
      </Button>
      <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" />
      </div>
    </>
  );
}

/** Where to go after signing in — only allow paths inside our app. */
function useNextPath() {
  const next = useSearchParams()[0].get('next') ?? '/dashboard';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
}

export function SignInPage() {
  const next = useNextPath();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError('');
    const { error } = await authClient.signIn.email({
      email: String(form.get('email')),
      password: String(form.get('password')),
    });
    setLoading(false);
    if (!error) return navigate(next);
    setError(
      error.code === 'EMAIL_NOT_VERIFIED'
        ? "Please verify your email first — we've just sent you a new link."
        : (error.message ?? 'Could not sign in'),
    );
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to manage your events.">
      <GoogleButton next={next} />
      <form onSubmit={submit} className="space-y-4">
        <Input label="Email" name="email" type="email" autoComplete="email" required />
        <Input label="Password" name="password" type="password" autoComplete="current-password" required />
        <div className="text-right text-sm">
          <Link to="/forgot-password" className="font-medium text-brand-700 hover:underline">Forgot password?</Link>
        </div>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" loading={loading} className="w-full">Sign in</Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        New to PhotoMatch AI? <Link to="/sign-up" className="font-semibold text-brand-700 hover:underline">Create an account</Link>
      </p>
    </AuthLayout>
  );
}

/** Shown after sign-up and forgot-password: "check your inbox". */
function CheckEmail({ email, text }: { email: string; text: string }) {
  return (
    <div className="rounded-2xl bg-brand-50 p-6 text-center">
      <MailCheck className="mx-auto size-10 text-brand-600" />
      <p className="mt-3 font-semibold">Check your inbox</p>
      <p className="mt-1 text-sm text-slate-600">{text} <b>{email}</b>.</p>
      <Link to="/sign-in" className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:underline">Back to sign in</Link>
    </div>
  );
}

export function SignUpPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email'));
    setLoading(true);
    setError('');
    const { error } = await authClient.signUp.email({
      name: String(form.get('name')),
      email,
      password: String(form.get('password')),
      callbackURL: '/dashboard', // where the verification link lands
    });
    setLoading(false);
    if (error) return setError(error.message ?? 'Could not create your account');
    setSentTo(email);
  };

  return (
    <AuthLayout title="Create your account" subtitle="Start delivering event photos with AI in minutes.">
      {sentTo ? (
        <CheckEmail email={sentTo} text="We sent a verification link to" />
      ) : (
        <>
          <GoogleButton next="/dashboard" />
          <form onSubmit={submit} className="space-y-4">
            <Input label="Your name" name="name" autoComplete="name" required minLength={2} />
            <Input label="Email" name="email" type="email" autoComplete="email" required />
            <Input label="Password" name="password" type="password" autoComplete="new-password" required minLength={8} hint="At least 8 characters." />
            <ErrorText>{error}</ErrorText>
            <Button type="submit" loading={loading} className="w-full">Create account</Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account? <Link to="/sign-in" className="font-semibold text-brand-700 hover:underline">Sign in</Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get('email'));
    setLoading(true);
    // The email link opens /reset-password?token=...
    await authClient.requestPasswordReset({ email, redirectTo: '/reset-password' });
    setLoading(false);
    setSentTo(email); // same message whether or not the account exists (no account probing)
  };

  return (
    <AuthLayout title="Forgot your password?" subtitle="We'll email you a link to choose a new one.">
      {sentTo ? (
        <CheckEmail email={sentTo} text="If an account exists, a reset link is on its way to" />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Input label="Email" name="email" type="email" autoComplete="email" required />
          <Button type="submit" loading={loading} className="w-full">Send reset link</Button>
          <p className="text-center text-sm"><Link to="/sign-in" className="font-medium text-brand-700 hover:underline">Back to sign in</Link></p>
        </form>
      )}
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const [error, setError] = useState(params.get('error') ? 'This reset link is invalid or has expired.' : '');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newPassword = String(new FormData(event.currentTarget).get('password'));
    setLoading(true);
    const { error } = await authClient.resetPassword({ newPassword, token: token ?? '' });
    setLoading(false);
    if (error) return setError(error.message ?? 'Could not reset your password');
    navigate('/sign-in');
  };

  return (
    <AuthLayout title="Choose a new password" subtitle="You'll be signed out on all other devices.">
      <form onSubmit={submit} className="space-y-4">
        <Input label="New password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        <ErrorText>{error}</ErrorText>
        <Button type="submit" loading={loading} disabled={!token} className="w-full">Save new password</Button>
      </form>
    </AuthLayout>
  );
}
