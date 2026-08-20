import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { responsesAPI } from '../../services/api';
import { PageHeader, Card, Badge, Button, Skeleton } from '../../components/ui';
import { formatDateTime } from '../../utils/helpers';

export default function ExamHistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-responses'],
    queryFn: async () => (await responsesAPI.my()).data.data.responses,
  });

  const { data: results } = useQuery({
    queryKey: ['results'],
    queryFn: async () => (await responsesAPI.results()).data.data.results,
  });

  const resultByResponseId = (results || []).reduce((acc, r) => {
    const key = r.response?._id || r.response;
    if (key) acc[String(key)] = r;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader title="Exam History" subtitle="Your past and in-progress attempts" />
      {isLoading ? (
        <Skeleton className="h-48" />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-mist/50 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3 font-medium">Exam</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Warnings</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data || []).map((r) => {
                const examId = r.exam?._id || r.exam;
                const publishedResult = resultByResponseId[String(r._id)];
                const canViewResult =
                  Boolean(publishedResult) ||
                  r.status === 'published';

                return (
                  <tr key={r._id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3 font-medium">{r.exam?.title || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          r.status === 'published' || r.status === 'graded'
                            ? 'success'
                            : r.status === 'in_progress'
                              ? 'warning'
                              : 'default'
                        }
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {['graded', 'published', 'submitted'].includes(r.status)
                        ? `${r.percentage ?? publishedResult?.percentage ?? 0}%`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">{r.warnings}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(r.submittedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {r.status === 'in_progress' && examId && (
                          <Link to={`/student/exams/${examId}/take`}>
                            <Button size="sm">Continue</Button>
                          </Link>
                        )}
                        {canViewResult && publishedResult && (
                          <Link to={`/student/results/${publishedResult._id}`}>
                            <Button size="sm" variant="secondary">
                              View result
                            </Button>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!data?.length && <p className="p-8 text-center text-slate-500">No history yet.</p>}
        </Card>
      )}
    </div>
  );
}
