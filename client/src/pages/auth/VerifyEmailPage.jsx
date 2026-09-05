import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { Card, Button, Input } from '../../components/ui';
import { getErrorMessage } from '../../utils/helpers';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [resendStatus, setResendStatus] = useState(null);

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      return;
    }
    authAPI
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [params]);

  const resend = async (e) => {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    setResendStatus(null);
    try {
      const res = await authAPI.resendVerification(email);
      setResendStatus({ ok: true, text: res.data?.message || 'Verification email sent.' });
    } catch (err) {
      setResendStatus({ ok: false, text: getErrorMessage(err) });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand px-4 dark:bg-ink">
      <Card className="w-full max-w-md text-center">
        <p className="font-display text-3xl text-brand-800 dark:text-brand-300">ExamAI</p>
        {status === 'loading' && <p className="mt-6">Verifying your email…</p>}
        {status === 'success' && (
          <>
            <h1 className="mt-6 text-xl font-semibold">Email verified</h1>
            <p className="mt-2 text-sm text-slate-500">Your account is ready.</p>
            <Link to="/login" className="mt-6 inline-block">
              <Button>Sign in</Button>
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="mt-6 text-xl font-semibold">Verification failed</h1>
            <p className="mt-2 text-sm text-slate-500">
              The link may be invalid or expired, or your account may already be verified.
            </p>
            <form onSubmit={resend} className="mt-6 grid gap-3 text-left">
              <Input
                id="resendEmail"
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" variant="secondary" loading={sending} disabled={!email}>
                Resend verification link
              </Button>
            </form>
            {resendStatus && (
              <p
                className={`mt-3 text-sm ${resendStatus.ok ? 'text-emerald-600' : 'text-rose-600'}`}
              >
                {resendStatus.text}
              </p>
            )}
            <Link to="/login" className="mt-6 inline-block">
              <Button variant="secondary">Back to sign in</Button>
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}
