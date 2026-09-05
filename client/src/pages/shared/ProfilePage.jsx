import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import { PageHeader, Card, Button, Input } from '../../components/ui';
import { getErrorMessage } from '../../utils/helpers';

export default function ProfilePage() {
  const { user, updateUser, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      institution: user?.institution || '',
      department: user?.department || '',
    },
  });

  const pwdForm = useForm();

  const onSave = async (values) => {
    setLoading(true);
    try {
      const { data } = await authAPI.updateProfile(values);
      updateUser(data.data.user);
      toast.success('Profile updated');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const onPassword = async (values) => {
    try {
      await authAPI.changePassword(values);
      await refreshUser();
      toast.success('Password changed');
      pwdForm.reset();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <div>
      <PageHeader title="Profile Settings" subtitle={user?.email} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="font-semibold">Personal info</h3>
          <form onSubmit={handleSubmit(onSave)} className="mt-4 space-y-3">
            <Input label="First name" {...register('firstName')} />
            <Input label="Last name" {...register('lastName')} />
            <Input label="Phone" {...register('phone')} />
            <Input label="Institution" {...register('institution')} />
            <Input label="Department" {...register('department')} />
            <Button type="submit" loading={loading}>
              Save profile
            </Button>
          </form>
        </Card>
        <Card>
          <h3 className="font-semibold">Change password</h3>
          <form onSubmit={pwdForm.handleSubmit(onPassword)} className="mt-4 space-y-3">
            <Input
              label="Current password"
              type="password"
              {...pwdForm.register('currentPassword', { required: true })}
            />
            <Input
              label="New password"
              type="password"
              {...pwdForm.register('newPassword', { required: true, minLength: 6 })}
            />
            <Button type="submit">Update password</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
