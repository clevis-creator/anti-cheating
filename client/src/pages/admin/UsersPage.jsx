import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Search } from 'lucide-react';
import { usersAPI } from '../../services/api';
import { PageHeader, Button, Input, Select, Card, Badge, Modal, Skeleton } from '../../components/ui';
import { formatDate, getErrorMessage } from '../../utils/helpers';

export default function UsersPage() {
  const qc = useQueryClient();
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: 'ChangeMe123!',
    role: 'student',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['users', role, search],
    queryFn: async () =>
      (await usersAPI.list({ role: role || undefined, search: search || undefined })).data.data,
  });

  const createMut = useMutation({
    mutationFn: (payload) => usersAPI.create(payload),
    onSuccess: () => {
      toast.success('User created');
      qc.invalidateQueries({ queryKey: ['users'] });
      setOpen(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }) => usersAPI.update(id, { isActive }),
    onSuccess: () => {
      toast.success('User updated');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Manage admins, teachers, and students"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> Add user
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-xl border border-slate-200 bg-transparent py-2.5 pl-10 pr-3 text-sm dark:border-slate-700"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={role} onChange={(e) => setRole(e.target.value)} className="sm:w-40">
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </Select>
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        {isLoading ? (
          <div className="p-6">
            <Skeleton className="h-40" />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-mist/50 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data?.users || []).map((u) => (
                <tr key={u._id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3 font-medium">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="info">{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.isActive ? 'success' : 'danger'}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleActive.mutate({ id: u._id, isActive: !u.isActive })}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Create user">
        <div className="space-y-3">
          <Input
            label="First name"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          />
          <Input
            label="Last name"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <Select
            label="Role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </Select>
          <Button
            className="w-full"
            loading={createMut.isPending}
            onClick={() => createMut.mutate(form)}
          >
            Create
          </Button>
        </div>
      </Modal>
    </div>
  );
}
