import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Card } from '../../components/ui';
import { getErrorMessage, roleHome } from '../../utils/helpers';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const user = await login(values.email, values.password);
      if (user.mustChangePassword) {
        toast('Please set a new password before continuing.');
        navigate(`/${user.role}/profile`, { replace: true });
        return;
      }
      toast.success(`Welcome back, ${user.firstName}!`);
      const dest = location.state?.from?.pathname || roleHome(user.role);
      navigate(dest, { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-sand px-4 dark:bg-ink">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#ccfbf1_0%,_transparent_50%)] opacity-60 dark:opacity-20" />
      <Card className="relative w-full max-w-md">
        <Link to="/" className="font-display text-3xl text-brand-800 dark:text-brand-300">
          ExamAI
        </Link>
        <h1 className="mt-4 text-xl font-semibold">Sign in to your account</h1>
        <p className="mt-1 text-sm text-slate-500">Students, teachers, and admins use the same portal.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <Input
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email', { required: 'Email is required' })}
          />
          <Input
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password', { required: 'Password is required' })}
          />
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-brand-700 hover:underline dark:text-brand-400">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" className="w-full" loading={loading}>
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          No account?{' '}
          <Link to="/register" className="font-medium text-brand-700 dark:text-brand-400">
            Create one
          </Link>
        </p>

        <div className="mt-6 rounded-xl bg-mist/80 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          <p className="font-medium">Demo accounts</p>
          <p className="mt-1">admin@examai.com / Admin123!</p>
          <p>teacher@examai.com / Teacher123!</p>
          <p>student@examai.com / Student123!</p>
        </div>
      </Card>
    </div>
  );
}
