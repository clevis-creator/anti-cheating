import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Select, Card } from '../../components/ui';
import { getErrorMessage } from '../../utils/helpers';

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { role: 'student' },
  });

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      await registerUser(values);
      toast.success('Account created! Check your email to verify, then sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-sand px-4 py-10 dark:bg-ink">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#ccfbf1_0%,_transparent_50%)] opacity-60 dark:opacity-20" />
      <Card className="relative w-full max-w-lg">
        <Link to="/" className="font-display text-3xl text-brand-800 dark:text-brand-300">
          ExamAI
        </Link>
        <h1 className="mt-4 text-xl font-semibold">Create your account</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input
            id="firstName"
            label="First name"
            error={errors.firstName?.message}
            {...register('firstName', { required: 'Required' })}
          />
          <Input
            id="lastName"
            label="Last name"
            error={errors.lastName?.message}
            {...register('lastName', { required: 'Required' })}
          />
          <div className="sm:col-span-2">
            <Input
              id="email"
              label="Email"
              type="email"
              error={errors.email?.message}
              {...register('email', { required: 'Required' })}
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              id="password"
              label="Password"
              type="password"
              error={errors.password?.message}
              {...register('password', {
                required: 'Required',
                minLength: { value: 6, message: 'Min 6 characters' },
              })}
            />
          </div>
          <Select id="role" label="I am a..." {...register('role')}>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </Select>
          <Input id="institution" label="Institution" {...register('institution')} />
          <div className="sm:col-span-2">
            <Button type="submit" className="w-full" loading={loading}>
              Create account
            </Button>
          </div>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-700 dark:text-brand-400">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
