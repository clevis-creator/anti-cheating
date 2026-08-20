import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ClipboardList, Award, Clock, BarChart3 } from 'lucide-react';
import { responsesAPI, examsAPI } from '../../services/api';
import { PageHeader, StatCard, Card, Button, Skeleton } from '../../components/ui';
import { formatDate } from '../../utils/helpers';

export default function StudentDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['student-stats'],
    queryFn: async () => (await responsesAPI.studentStats()).data.data,
  });

  const { data: exams } = useQuery({
    queryKey: ['student-exams'],
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
      <PageHeader title="Student Dashboard" subtitle="Your exams, results, and certificates" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Available" value={s.availableExams || 0} icon={ClipboardList} />
        <StatCard title="Completed" value={s.completedExams || 0} icon={Award} />
        <StatCard title="In progress" value={s.inProgress || 0} icon={Clock} />
        <StatCard title="Avg score" value={`${s.avgScore || 0}%`} icon={BarChart3} />
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Available exams</h3>
          <Link to="/student/exams" className="text-sm text-brand-700">
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
                  {exam.duration} min · {exam.totalMarks} marks · Due {formatDate(exam.endTime)}
                </p>
              </div>
              <Link to={`/student/exams/${exam._id}/take`}>
                <Button size="sm">Start</Button>
              </Link>
            </div>
          ))}
          {!exams?.length && <p className="py-8 text-center text-sm text-slate-500">No exams available</p>}
        </div>
      </Card>
    </div>
  );
}
