import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { responsesAPI } from '../../services/api';
import { PageHeader, Card, Button, Badge, Input, TextArea, Modal, Skeleton } from '../../components/ui';
import { formatDateTime, getErrorMessage, questionTypeLabel } from '../../utils/helpers';

export default function GradingPage() {
  const { responseId: routeResponseId } = useParams();
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [gradeForm, setGradeForm] = useState({ answerId: '', marksAwarded: 0, feedback: '' });

  const { data: pending, isLoading } = useQuery({
    queryKey: ['pending-grading'],
    queryFn: async () => (await responsesAPI.pending()).data.data.responses,
  });

  const loadDetail = useCallback(async (id) => {
    const { data } = await responsesAPI.get(id);
    setDetail(data.data);
    setSelected(id);
  }, []);

  useEffect(() => {
    if (routeResponseId) {
      loadDetail(routeResponseId).catch((e) => toast.error(getErrorMessage(e)));
    }
  }, [routeResponseId, loadDetail]);

  const gradeMut = useMutation({
    mutationFn: () =>
      responsesAPI.grade(selected, {
        answerId: gradeForm.answerId,
        marksAwarded: Number(gradeForm.marksAwarded),
        feedback: gradeForm.feedback,
      }),
    onSuccess: async () => {
      toast.success('Marks saved');
      await loadDetail(selected);
      qc.invalidateQueries({ queryKey: ['pending-grading'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const regradeMut = useMutation({
    mutationFn: (answerId) => responsesAPI.regradeAI(selected, answerId),
    onSuccess: async () => {
      toast.success('AI regrade complete');
      await loadDetail(selected);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const overrideMut = useMutation({
    mutationFn: ({ id, score, feedback }) => responsesAPI.overrideAI(id, { score, feedback }),
    onSuccess: async () => {
      toast.success('AI score overridden');
      await loadDetail(selected);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const publishMut = useMutation({
    mutationFn: (examId) => responsesAPI.publishResults(examId),
    onSuccess: () => {
      toast.success('Results published');
      qc.invalidateQueries({ queryKey: ['pending-grading'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div>
      <PageHeader title="Grading" subtitle="Manual grading and AI score review" />

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : (
        <div className="space-y-3">
          {(pending || []).map((r) => (
            <Card key={r._id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{r.exam?.title}</p>
                <p className="text-sm text-slate-500">
                  {r.student?.firstName} {r.student?.lastName} · {formatDateTime(r.submittedAt)} ·{' '}
                  {r.percentage}%
                </p>
              </div>
              <div className="flex gap-2">
                <Badge>{r.status}</Badge>
                <Button size="sm" variant="secondary" onClick={() => loadDetail(r._id)}>
                  Review
                </Button>
                <Button size="sm" onClick={() => publishMut.mutate(r.exam?._id || r.exam)}>
                  Publish
                </Button>
                <Link to={`/teacher/monitor/${r.exam?._id || r.exam}`}>
                  <Button size="sm" variant="ghost">
                    Monitor
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
          {!pending?.length && (
            <Card>
              <p className="py-10 text-center text-slate-500">No submissions pending review.</p>
            </Card>
          )}
        </div>
      )}

      <Modal
        open={!!detail}
        onClose={() => {
          setDetail(null);
          setSelected(null);
        }}
        title="Grade submission"
        size="xl"
      >
        {detail && (
          <div className="max-h-[70vh] space-y-4 overflow-y-auto">
            <p className="text-sm text-slate-500">
              {detail.response.student?.firstName} {detail.response.student?.lastName} · Score:{' '}
              {detail.response.obtainedMarks}/{detail.response.totalMarks} ({detail.response.percentage}
              %) · Warnings: {detail.response.warnings}
            </p>

            {(detail.response.answers || []).map((ans) => {
              const q =
                detail.response.exam?.questions?.find(
                  (qq) => qq._id === ans.question || qq._id === ans.question?._id
                ) || ans.question;
              const ai = (detail.aiGrades || []).find(
                (g) => g.question === (q?._id || ans.question)
              );
              return (
                <div key={ans._id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex justify-between gap-2">
                    <div>
                      <Badge>{questionTypeLabel(q?.type || 'essay')}</Badge>
                      <p className="mt-1 font-medium">{q?.title}</p>
                    </div>
                    <p className="font-semibold">
                      {ans.marksAwarded}/{q?.marks || 0}
                    </p>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap rounded-lg bg-mist/50 p-2 text-sm dark:bg-slate-800">
                    {typeof ans.answer === 'object'
                      ? JSON.stringify(ans.answer, null, 2)
                      : String(ans.answer ?? '—')}
                  </p>

                  {ai && (
                    <div className="mt-2 rounded-lg border border-brand-200 p-2 text-sm dark:border-brand-900">
                      <p>
                        AI ({ai.provider}): {ai.overridden ? ai.overrideScore : ai.score}/
                        {ai.maxMarks}
                      </p>
                      <p className="text-slate-500">{ai.feedback}</p>
                      <p className="text-xs text-slate-400">{ai.reasoning}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-1"
                        onClick={() => {
                          const score = prompt('Override score', String(ai.score));
                          if (score == null) return;
                          const feedback = prompt('Override feedback', ai.feedback || '') || '';
                          overrideMut.mutate({ id: ai._id, score: Number(score), feedback });
                        }}
                      >
                        Override AI
                      </Button>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setGradeForm({
                          answerId: ans._id,
                          marksAwarded: ans.marksAwarded || 0,
                          feedback: ans.feedback || '',
                        })
                      }
                    >
                      Manual grade
                    </Button>
                    {(q?.type === 'essay' || ans.aiGraded) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={regradeMut.isPending}
                        onClick={() => regradeMut.mutate(ans._id)}
                      >
                        Regrade with AI
                      </Button>
                    )}
                  </div>

                  {gradeForm.answerId === ans._id && (
                    <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                      <Input
                        label="Marks"
                        type="number"
                        value={gradeForm.marksAwarded}
                        onChange={(e) =>
                          setGradeForm({ ...gradeForm, marksAwarded: e.target.value })
                        }
                      />
                      <TextArea
                        label="Feedback"
                        value={gradeForm.feedback}
                        onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                      />
                      <Button size="sm" loading={gradeMut.isPending} onClick={() => gradeMut.mutate()}>
                        Save marks
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}
