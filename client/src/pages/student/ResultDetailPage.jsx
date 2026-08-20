import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { responsesAPI } from '../../services/api';
import { PageHeader, Card, Badge, Button, Skeleton } from '../../components/ui';
import { questionTypeLabel } from '../../utils/helpers';

export default function ResultDetailPage() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['result', id],
    queryFn: async () => (await responsesAPI.result(id)).data.data,
  });

  if (isLoading) return <Skeleton className="h-64" />;
  const { result, aiGrades } = data || {};
  if (!result) return <p>Result not found</p>;

  const answers = result.response?.answers || [];

  return (
    <div>
      <PageHeader
        title={result.exam?.title || 'Result'}
        subtitle="Detailed score breakdown"
        actions={
          <Link to="/student/results">
            <Button variant="secondary">Back</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Score</p>
          <p className="text-3xl font-semibold">
            {result.obtainedMarks}/{result.totalMarks}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Percentage</p>
          <p className="text-3xl font-semibold">{result.percentage}%</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Grade</p>
          <p className="text-3xl font-semibold">{result.grade}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Result</p>
          <Badge variant={result.passed ? 'success' : 'danger'} className="mt-2 text-base">
            {result.passed ? 'PASS' : 'FAIL'}
          </Badge>
        </Card>
      </div>

      <div className="mt-6 space-y-4">
        {answers.map((ans, i) => {
          const q = ans.question;
          const ai = (aiGrades || []).find((g) => g.question === (q?._id || q));
          return (
            <Card key={ans._id || i}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Badge className="mb-2">{questionTypeLabel(q?.type)}</Badge>
                  <h3 className="font-medium">{q?.title || `Question ${i + 1}`}</h3>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {ans.marksAwarded}/{q?.marks ?? 0}
                  </p>
                  {ans.isCorrect === true && <Badge variant="success">Correct</Badge>}
                  {ans.isCorrect === false && <Badge variant="danger">Wrong</Badge>}
                </div>
              </div>
              <div className="mt-3 rounded-xl bg-mist/60 p-3 text-sm dark:bg-slate-800">
                <p className="text-xs font-medium text-slate-500">Your answer</p>
                <p className="mt-1 whitespace-pre-wrap">
                  {typeof ans.answer === 'object' ? JSON.stringify(ans.answer) : String(ans.answer ?? '—')}
                </p>
              </div>
              {ans.feedback && (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Feedback: {ans.feedback}
                </p>
              )}
              {ai && (
                <div className="mt-3 rounded-xl border border-brand-200 p-3 text-sm dark:border-brand-900">
                  <p className="font-medium text-brand-800 dark:text-brand-300">AI feedback ({ai.provider})</p>
                  <p className="mt-1">{ai.overridden ? ai.overrideFeedback : ai.feedback}</p>
                  {ai.suggestions && <p className="mt-1 text-slate-500">Suggestions: {ai.suggestions}</p>}
                </div>
              )}
              {result.exam?.settings?.showCorrectAnswers && q?.explanation && (
                <p className="mt-2 text-xs text-slate-500">Explanation: {q.explanation}</p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
