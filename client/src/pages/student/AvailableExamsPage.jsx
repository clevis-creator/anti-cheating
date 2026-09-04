import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { examsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader, Card, Button, Badge, Skeleton } from '../../components/ui';
import { formatDateTime } from '../../utils/helpers';

export default function AvailableExamsPage() {
  const { mustVerifyEmailBeforeExam } = useAuth();

  const { data: exams, isLoading } = useQuery({
    queryKey: ['student-exams'],
    queryFn: async () => (await examsAPI.list()).data.data.exams,
  });

  return (
    <div>
      <PageHeader title="Available Exams" subtitle="Exams assigned to you" />
      {isLoading ? (
        <Skeleton className="h-48" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(exams || []).map((exam) => (
            <Card key={exam._id}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-semibold">{exam.title}</h3>
                <Badge variant="success">{exam.status}</Badge>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                {exam.description || exam.instructions || 'No description'}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
                <p>Duration: {exam.duration} min</p>
                <p>Marks: {exam.totalMarks}</p>
                <p>Passing: {exam.passingMarks}</p>
                <p>Ends: {formatDateTime(exam.endTime)}</p>
              </div>
              {mustVerifyEmailBeforeExam ? (
                <div className="mt-4">
                  <Button disabled variant="secondary" className="w-full">
                    Verify email to start
                  </Button>
                  <p className="mt-2 text-xs text-slate-500">
                    Check your inbox for the verification link, or use <span className="font-medium">Resend email</span> above.
                  </p>
                </div>
              ) : (
                <Link to={`/student/exams/${exam._id}/take`} className="mt-4 inline-block">
                  <Button>Take exam</Button>
                </Link>
              )}
            </Card>
          ))}
          {!exams?.length && (
            <Card className="md:col-span-2">
              <p className="py-10 text-center text-slate-500">No exams available right now.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
