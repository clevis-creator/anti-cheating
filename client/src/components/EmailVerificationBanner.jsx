import { useState } from 'react';
import toast from 'react-hot-toast';
import { Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import { Button } from './ui';

export default function EmailVerificationBanner() {
  const { user, mustVerifyEmailBeforeExam } = useAuth();
  const [sending, setSending] = useState(false);

  if (!user || !mustVerifyEmailBeforeExam) return null;

  const resend = async () => {
    setSending(true);
    try {
      await authAPI.resendVerification(user.email);
      toast.success('Verification email sent. Check your inbox.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend verification email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
      <div className="flex items-start gap-2">
        <Mail size={18} className="mt-0.5 shrink-0" />
        <p>
          Please verify your email address before taking exams. Check your inbox for the verification link.
        </p>
      </div>
      <Button size="sm" variant="outline" loading={sending} onClick={resend}>
        Resend email
      </Button>
    </div>
  );
}
