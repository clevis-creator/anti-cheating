import { useQuery } from '@tanstack/react-query';
import { usersAPI, coursesAPI } from '../../services/api';
import { PageHeader, Card, Skeleton, Badge } from '../../components/ui';

export default function StudentsPage() {
  const { data: students, isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: async () => (await usersAPI.list({ role: 'student' })).data.data.users,
  });

  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => (await coursesAPI.list()).data.data.courses,
  });

  return (
    <div>
      <PageHeader title="Students" subtitle="Students in your courses and institution" />
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
                    <Badge variant={s.isActive ? 'success' : 'danger'}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
