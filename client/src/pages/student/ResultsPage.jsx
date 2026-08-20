import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { responsesAPI } from '../../services/api';
import { PageHeader, Card, Badge, Button, Skeleton } from '../../components/ui';
import { formatDate } from '../../utils/helpers';

export default function ResultsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['results'],
    queryFn: async () => (await responsesAPI.results()).data.data.results,
  });

  return (
    <div>
      <PageHeader title="Results" subtitle="Published exam results" />
      {isLoading ? (
        <Skeleton className="h-48" />
      ) : (
        <div className="space-y-3">
          {(data || []).map((r) => (
            <Card key={r._id} className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold">{r.exam?.title}</h3>
                <p className="text-sm text-slate-500">
                  {r.obtainedMarks}/{r.totalMarks} · Grade {r.grade} · {formatDate(r.publishedAt || r.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-semibold">{r.percentage}%</span>
                <Badge variant={r.passed ? 'success' : 'danger'}>{r.passed ? 'Pass' : 'Fail'}</Badge>
                <Link to={`/student/results/${r._id}`}>
                  <Button size="sm" variant="secondary">
                    Details
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
          {!data?.length && (
            <Card>
              <p className="py-10 text-center text-slate-500">No published results yet.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
