import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Users } from 'lucide-react';
import { coursesAPI, usersAPI } from '../../services/api';
import { PageHeader, Button, Input, TextArea, Card, Badge, Modal, Skeleton } from '../../components/ui';
import { getErrorMessage } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';

export default function CoursesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [activeCourse, setActiveCourse] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [form, setForm] = useState({ title: '', code: '', description: '', teacher: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => (await coursesAPI.list()).data.data.courses,
  });

  const { data: teachers } = useQuery({
    queryKey: ['teachers-list'],
    queryFn: async () => (await usersAPI.list({ role: 'teacher' })).data.data.users,
    enabled: user?.role === 'admin',
  });

  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: async () => (await usersAPI.list({ role: 'student' })).data.data.users,
    enabled: enrollOpen,
  });

  const createMut = useMutation({
    mutationFn: (payload) => coursesAPI.create(payload),
    onSuccess: () => {
      toast.success('Course created');
      qc.invalidateQueries({ queryKey: ['courses'] });
      setOpen(false);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const enrollMut = useMutation({
    mutationFn: ({ courseId, studentIds }) => coursesAPI.enroll(courseId, studentIds),
    onSuccess: () => {
      toast.success('Students enrolled');
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['students'] });
      setEnrollOpen(false);
      setSelectedStudents([]);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const removeMut = useMutation({
    mutationFn: ({ courseId, studentId }) => coursesAPI.removeStudent(courseId, studentId),
    onSuccess: () => {
      toast.success('Student removed');
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const openEnroll = (course) => {
    setActiveCourse(course);
    setSelectedStudents([]);
    setEnrollOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Courses"
        subtitle="Organize exams by course and cohort"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> New course
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data || []).map((c) => (
            <Card key={c._id}>
              <div className="flex items-start justify-between">
                <Badge>{c.code}</Badge>
                <Badge variant={c.isActive ? 'success' : 'danger'}>
                  {c.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <h3 className="mt-3 text-lg font-semibold">{c.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{c.description || 'No description'}</p>
              <p className="mt-4 text-xs text-slate-400">
                Teacher: {c.teacher?.firstName} {c.teacher?.lastName}
              </p>
              <p className="text-xs text-slate-400">{c.students?.length || 0} students enrolled</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => openEnroll(c)}>
                  <Users size={14} /> Manage students
                </Button>
              </div>
              {!!c.students?.length && (
                <div className="mt-3 space-y-1">
                  {c.students.slice(0, 5).map((s) => (
                    <div key={s._id} className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {s.firstName} {s.lastName}
                      </span>
                      <button
                        type="button"
                        className="text-red-600"
                        onClick={() => removeMut.mutate({ courseId: c._id, studentId: s._id })}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Create course">
        <div className="space-y-3">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <TextArea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          {user?.role === 'admin' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Teacher</label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                value={form.teacher}
                onChange={(e) => setForm({ ...form, teacher: e.target.value })}
              >
                <option value="">Select teacher</option>
                {(teachers || []).map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.firstName} {t.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Button className="w-full" loading={createMut.isPending} onClick={() => createMut.mutate(form)}>
            Create
          </Button>
        </div>
      </Modal>

      <Modal
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        title={`Enroll students — ${activeCourse?.title || ''}`}
      >
        <div className="space-y-3">
          <label className="text-sm font-medium">Select students</label>
          <select
            multiple
            className="min-h-[180px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            value={selectedStudents}
            onChange={(e) =>
              setSelectedStudents(Array.from(e.target.selectedOptions, (option) => option.value))
            }
          >
            {(students || []).map((s) => (
              <option key={s._id} value={s._id}>
                {s.firstName} {s.lastName} — {s.email}
              </option>
            ))}
          </select>
          <Button
            className="w-full"
            loading={enrollMut.isPending}
            disabled={!selectedStudents.length}
            onClick={() =>
              enrollMut.mutate({ courseId: activeCourse._id, studentIds: selectedStudents })
            }
          >
            Enroll selected students
          </Button>
        </div>
      </Modal>
    </div>
  );
}
