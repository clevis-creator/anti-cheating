import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { questionsAPI } from '../../services/api';
import { PageHeader, Card, Badge, Button, Skeleton } from '../../components/ui';
import { questionTypeLabel } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/helpers';

export default function QuestionBankPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['question-bank'],
    queryFn: async () => (await questionsAPI.list({ bank: 'true' })).data.data.questions,
  });

  const delMut = useMutation({
    mutationFn: (id) => questionsAPI.remove(id),
    onSuccess: () => {
      toast.success('Removed from bank');
      qc.invalidateQueries({ queryKey: ['question-bank'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="Question Bank"
        subtitle="Reusable questions saved from exams. Use “Add to bank” while editing a question."
      />
      {isLoading ? (
        <Skeleton className="h-48" />
      ) : (
        <div className="space-y-3">
          {(data || []).map((q) => (
            <Card key={q._id} className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge>{questionTypeLabel(q.type)}</Badge>
                <p className="mt-2 font-medium">{q.title}</p>
                <p className="text-xs text-slate-500">{q.marks} marks · {q.difficulty}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600"
                onClick={() => delMut.mutate(q._id)}
              >
                Delete
              </Button>
            </Card>
          ))}
          {!data?.length && (
            <Card>
              <p className="py-10 text-center text-slate-500">
                Question bank is empty. Save questions from the exam builder.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
