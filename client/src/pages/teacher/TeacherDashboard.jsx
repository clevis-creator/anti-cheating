import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ClipboardList, Users, BarChart3, Clock } from 'lucide-react';
import { responsesAPI, examsAPI } from '../../services/api';
import { PageHeader, StatCard, Card, Button, Badge, Skeleton } from '../../components/ui';
import { formatDate } from '../../utils/helpers';

export default function TeacherDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['teacher-stats'],
    queryFn: async () => (await responsesAPI.teacherStats()).data.data,
  });

  const { data: exams } = useQuery({
    queryKey: ['teacher-exams'],
    queryFn: async () => (await examsAPI.list()).data.data.exams,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  const s = stats?.stats || {};

  return (
    <div>
      <PageHeader
        title="Teacher Dashboard"
        subtitle="Create exams, grade submissions, and monitor integrity"
        actions={
          <Link to="/teacher/exams/new">
            <Button>Create exam</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Exams" value={s.totalExams || 0} icon={ClipboardList} />
        <StatCard title="Submissions" value={s.totalResponses || 0} icon={Users} />
        <StatCard title="Pending grading" value={s.pendingGrading || 0} icon={Clock} />
        <StatCard title="Avg score" value={`${s.avgScore || 0}%`} icon={BarChart3} />
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Your exams</h3>
          <Link to="/teacher/exams" className="text-sm text-brand-700 dark:text-brand-400">
            View all
          </Link>
        </div>
        <div className="space-y-3">
          {(exams || []).slice(0, 5).map((exam) => (
            <div
              key={exam._id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3 dark:border-slate-800"
            >
              <div>
                <p className="font-medium">{exam.title}</p>
                <p className="text-xs text-slate-500">
                  {exam.duration} min · {exam.totalMarks} marks · {formatDate(exam.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    exam.status === 'published'
                      ? 'success'
                      : exam.status === 'draft'
                        ? 'warning'
                        : 'default'
                  }
                >
                  {exam.status}
                </Badge>
                <Link to={`/teacher/exams/${exam._id}/edit`}>
                  <Button size="sm" variant="secondary">
                    Edit
                  </Button>
                </Link>
                <Link to={`/teacher/monitor/${exam._id}`}>
                  <Button size="sm" variant="ghost">
                    Monitor
                  </Button>
                </Link>
              </div>
            </div>
          ))}
          {!exams?.length && <p className="py-8 text-center text-sm text-slate-500">No exams yet</p>}
        </div>
      </Card>
    </div>
  );
}
