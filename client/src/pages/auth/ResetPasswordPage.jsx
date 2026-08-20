import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authAPI } from '../../services/api';
import { Button, Input, Card } from '../../components/ui';
import { getErrorMessage } from '../../utils/helpers';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm();
  const token = params.get('token') || '';

  const onSubmit = async ({ password }) => {
    setLoading(true);
    try {
      await authAPI.resetPassword({ token, password });
      toast.success('Password updated. Please sign in.');
      navigate('/login');
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
        <h1 className="mt-4 text-xl font-semibold">Choose a new password</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <Input
            id="password"
            label="New password"
            type="password"
            {...register('password', { required: true, minLength: 6 })}
          />
          <Button type="submit" className="w-full" loading={loading} disabled={!token}>
            Update password
          </Button>
        </form>
      </Card>
    </div>
  );
}
