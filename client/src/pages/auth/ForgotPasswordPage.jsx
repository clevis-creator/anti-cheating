import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authAPI } from '../../services/api';
import { Button, Input, Card } from '../../components/ui';
import { getErrorMessage } from '../../utils/helpers';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit } = useForm();

  const onSubmit = async ({ email }) => {
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
      toast.success('If that email exists, a reset link was sent.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand px-4 dark:bg-ink">
      <Card className="w-full max-w-md">
        <Link to="/" className="font-display text-3xl text-brand-800 dark:text-brand-300">
          ExamAI
        </Link>
        <h1 className="mt-4 text-xl font-semibold">Reset password</h1>
        {sent ? (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            Check your inbox for a reset link. It expires in one hour.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <Input id="email" label="Email" type="email" required {...register('email', { required: true })} />
            <Button type="submit" className="w-full" loading={loading}>
              Send reset link
            </Button>
          </form>
        )}
        <Link to="/login" className="mt-6 inline-block text-sm text-brand-700 dark:text-brand-400">
          Back to sign in
        </Link>
      </Card>
    </div>
  );
}
