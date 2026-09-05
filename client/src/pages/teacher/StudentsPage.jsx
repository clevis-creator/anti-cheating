import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { usersAPI, coursesAPI } from '../../services/api';
import { PageHeader, Card, Skeleton, Badge, Button, Input, Modal } from '../../components/ui';
import { getErrorMessage } from '../../utils/helpers';

const emptyForm = { firstName: '', lastName: '', email: '', password: '', studentId: '' };

export default function StudentsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: students, isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: async () => (await usersAPI.list({ role: 'student' })).data.data.users,
  });

  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => (await coursesAPI.list()).data.data.courses,
  });

  const createMut = useMutation({
    mutationFn: (data) => usersAPI.create(data),
    onSuccess: () => {
      toast.success('Student created. A verification email has been sent.');
      setShowForm(false);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email) {
      toast.error('First name, last name, and email are required');
      return;
    }
    createMut.mutate({ ...form, role: 'student' });
  };

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle="Students in your courses and institution"
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} /> Add Student
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {(courses || []).map((c) => (
          <Badge key={c._id}>
            {c.code}: {c.students?.length || 0} enrolled
          </Badge>
        ))}
      </div>
      {isLoading ? (
        <Skeleton className="h-48" />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-mist/50 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Student ID</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(students || []).map((s) => (
                <tr key={s._id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3 font-medium">
                    {s.firstName} {s.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{s.email}</td>
                  <td className="px-4 py-3">{s.studentId || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <Badge variant={s.isActive ? 'success' : 'danger'}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {s.role === 'student' && (
                        <Badge variant={s.isEmailVerified ? 'success' : 'warning'}>
                          {s.isEmailVerified ? 'Verified' : 'Unverified'}
                        </Badge>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!students?.length && (
            <p className="py-10 text-center text-slate-500">No students found. Add a student to get started.</p>
          )}
        </Card>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Student">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
            <Input
              label="Last name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            label="Password (optional — default: ChangeMe123!)"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <Input
            label="Student ID (optional)"
            value={form.studentId}
            onChange={(e) => setForm({ ...form, studentId: e.target.value })}
          />
          <p className="text-xs text-slate-500">
            A verification email will be sent to this student. They must verify their email and set a
            new password before taking exams.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createMut.isPending}>
              Create Student
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
