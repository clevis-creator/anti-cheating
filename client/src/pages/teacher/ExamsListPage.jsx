import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Copy, Eye, Pencil, Trash2 } from 'lucide-react';
import { examsAPI } from '../../services/api';
import { PageHeader, Button, Card, Badge, Skeleton } from '../../components/ui';
import { formatDate, getErrorMessage } from '../../utils/helpers';

export default function ExamsListPage({ basePath = '/teacher' }) {
  const qc = useQueryClient();
  const { data: exams, isLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: async () => (await examsAPI.list()).data.data.exams,
  });

  const publishMut = useMutation({
    mutationFn: (id) => examsAPI.publish(id),
    onSuccess: () => {
      toast.success('Exam published');
      qc.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handlePublish = (exam) => {
    const isOpenToAll = !exam.assignedStudents?.length;
    const message = isOpenToAll
      ? 'This exam has no specific students assigned and will be available to ALL active students. Publish this exam?'
      : 'Publish this exam to the assigned students?';
    if (confirm(message)) publishMut.mutate(exam._id);
  };

  const dupMut = useMutation({
    mutationFn: (id) => examsAPI.duplicate(id),
    onSuccess: () => {
      toast.success('Exam duplicated');
      qc.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const delMut = useMutation({
    mutationFn: (id) => examsAPI.remove(id),
    onSuccess: () => {
      toast.success('Exam deleted');
      qc.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="Exams"
        subtitle="Create and manage examinations"
        actions={
          <Link to={`${basePath}/exams/new`}>
            <Button>
              <Plus size={16} /> New exam
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="space-y-3">
          {(exams || []).map((exam) => (
            <Card key={exam._id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{exam.title}</h3>
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
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {exam.questions?.length || 0} questions · {exam.duration} min · {exam.totalMarks}{' '}
                  marks ·{' '}
                  {exam.assignedStudents?.length
                    ? `${exam.assignedStudents.length} assigned`
                    : 'Open to all students'}
                  {' · '}Created {formatDate(exam.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={`${basePath}/exams/${exam._id}/edit`}>
                  <Button size="sm" variant="secondary">
                    <Pencil size={14} /> Edit
                  </Button>
                </Link>
                {basePath === '/teacher' && (
                  <Link to={`/teacher/monitor/${exam._id}`}>
                    <Button size="sm" variant="ghost">
                      <Eye size={14} /> Monitor
                    </Button>
                  </Link>
                )}
                {exam.status === 'draft' && (
                  <Button size="sm" onClick={() => handlePublish(exam)}>
                    Publish
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => dupMut.mutate(exam._id)}>
                  <Copy size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600"
                  onClick={() => {
                    if (confirm('Delete this exam?')) delMut.mutate(exam._id);
                  }}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>
          ))}
          {!exams?.length && (
            <Card>
              <p className="py-10 text-center text-slate-500">No exams yet. Create your first exam.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
