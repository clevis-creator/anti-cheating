import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { Card, Button } from '../../components/ui';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('loading');

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
            <p className="mt-2 text-sm text-slate-500">The link is invalid or expired.</p>
            <Link to="/login" className="mt-6 inline-block">
              <Button variant="secondary">Back to sign in</Button>
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}
