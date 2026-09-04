import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  GripVertical,
  Plus,
  Trash2,
  Save,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { examsAPI, questionsAPI, coursesAPI, usersAPI } from '../../services/api';
import {
  PageHeader,
  Button,
  Input,
  TextArea,
  Select,
  Card,
  Badge,
} from '../../components/ui';
import { cn, getErrorMessage, questionTypeLabel } from '../../utils/helpers';
import StudentPicker from '../../components/StudentPicker';

const QUESTION_TYPES = [
  'multiple_choice',
  'checkbox',
  'true_false',
  'short_answer',
  'essay',
  'fill_blank',
  'matching',
  'dropdown',
  'image',
  'video',
  'file_upload',
];

const blankQuestion = (type = 'multiple_choice', order = 0) => ({
  type,
  title: '',
  description: '',
  required: true,
  marks: type === 'essay' ? 10 : 5,
  explanation: '',
  randomizeOptions: false,
  options:
    type === 'true_false'
      ? [
          { text: 'True', isCorrect: true },
          { text: 'False', isCorrect: false },
        ]
      : type === 'multiple_choice' || type === 'checkbox' || type === 'dropdown'
        ? [
            { text: 'Option 1', isCorrect: true },
            { text: 'Option 2', isCorrect: false },
          ]
        : [],
  correctAnswers: [],
  blanks: type === 'fill_blank' ? [{ placeholder: 'blank1', answers: [''] }] : [],
  matchingPairs:
    type === 'matching'
      ? [
          { left: 'Term A', right: 'Definition A' },
          { left: 'Term B', right: 'Definition B' },
        ]
      : [],
  referenceAnswer: '',
  rubric: '',
  mediaUrl: '',
  order,
  autoGrade: !['essay', 'file_upload', 'image', 'video'].includes(type),
});

export default function ExamBuilderPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [exam, setExam] = useState({
    title: '',
    description: '',
    instructions: '',
    duration: 60,
    passingMarks: 40,
    course: '',
    assignedStudents: [],
    settings: {
      shuffleQuestions: false,
      showResults: true,
      maxAttempts: 1,
      requireFullscreen: true,
      aiGrading: true,
      antiCheat: {
        enabled: true,
        maxWarnings: 3,
        detectTabSwitch: true,
        disableCopyPaste: true,
        disableRightClick: true,
        disableSelection: true,
        blockDevTools: true,
        logActivity: true,
      },
    },
  });
  const [questions, setQuestions] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [examId, setExamId] = useState(isNew ? null : id);
  const [dragIndex, setDragIndex] = useState(null);
  const [specificMode, setSpecificMode] = useState(isNew ? true : false);

  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => (await coursesAPI.list()).data.data.courses,
  });

  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: async () => (await usersAPI.list({ role: 'student' })).data.data.users,
  });

  const searchStudents = useCallback(
    async (q) => {
      const { data } = await usersAPI.list({ role: 'student', search: q, limit: 50 });
      return data.data.users;
    },
    []
  );

  const { data: existing, isLoading } = useQuery({
    queryKey: ['exam', id],
    queryFn: async () => (await examsAPI.get(id)).data.data.exam,
    enabled: !isNew,
  });

  const { data: assignmentData } = useQuery({
    queryKey: ['exam-assignments', examId],
    queryFn: async () => (await examsAPI.assignments(examId)).data.data,
    enabled: !!examId && !isNew,
  });

  useEffect(() => {
    if (existing) {
      setExam({
        title: existing.title,
        description: existing.description || '',
        instructions: existing.instructions || '',
        duration: existing.duration,
        passingMarks: existing.passingMarks,
        course: existing.course?._id || existing.course || '',
        assignedStudents: (existing.assignedStudents || []).map((student) => student._id || student),
        settings: existing.settings || exam.settings,
      });
      setQuestions(existing.questions || []);
      setExamId(existing._id);
      setSpecificMode((existing.assignedStudents || []).length > 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing]);

  const prepareExamPayload = (payload) => {
    const clean = { ...payload };
    clean.title = (clean.title || '').trim();
    clean.duration = Math.max(1, Number(clean.duration) || 60);
    clean.passingMarks = Math.max(0, Number(clean.passingMarks) || 0);
    if (!clean.title) {
      throw new Error('Exam title is required');
    }
    if (!clean.course) delete clean.course;
    if (!clean.assignedStudents || clean.assignedStudents.length === 0) delete clean.assignedStudents;
    return clean;
  };

  const saveExamMut = useMutation({
    mutationFn: async () => {
      const payload = prepareExamPayload(exam);
      if (examId) {
        const { data } = await examsAPI.update(examId, payload);
        return data.data.exam;
      }
      const { data } = await examsAPI.create(payload);
      return data.data.exam;
    },
    onSuccess: (saved) => {
      setExamId(saved._id);
      if (isNew) navigate(`/teacher/exams/${saved._id}/edit`, { replace: true });
      toast.success('Exam saved');
      qc.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const saveQuestion = async (q, index) => {
    if (!examId) {
      const saved = await saveExamMut.mutateAsync();
      return saveQuestionWithExam(q, index, saved._id);
    }
    return saveQuestionWithExam(q, index, examId);
  };

  const saveQuestionWithExam = async (q, index, eid) => {
    const payload = { ...q, exam: eid, order: index };
    delete payload._id;
    delete payload.createdAt;
    delete payload.updatedAt;
    delete payload.__v;

    if (!payload.title?.trim()) {
      payload.title = `Question ${index + 1}`;
    }

    if (q._id) {
      const { data } = await questionsAPI.update(q._id, payload);
      return data.data.question;
    }
    const { data } = await questionsAPI.create({ ...payload, exam: eid });
    return data.data.question;
  };

  const handleSaveAll = async () => {
    try {
      const payload = prepareExamPayload(exam);
      let eid = examId;
      if (!eid) {
        const saved = await examsAPI.create(payload);
        eid = saved.data.data.exam._id;
        setExamId(eid);
        navigate(`/teacher/exams/${eid}/edit`, { replace: true });
      } else {
        await examsAPI.update(eid, payload);
      }

      const savedQs = [];
      for (let i = 0; i < questions.length; i++) {
        const sq = await saveQuestionWithExam(questions[i], i, eid);
        savedQs.push(sq);
      }
      setQuestions(savedQs);
      toast.success('Exam and questions saved');
      qc.invalidateQueries({ queryKey: ['exam', eid] });
      qc.invalidateQueries({ queryKey: ['exams'] });
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const addQuestion = (type) => {
    const q = blankQuestion(type, questions.length);
    setQuestions([...questions, q]);
    setActiveIdx(questions.length);
  };

  const updateQuestion = (index, patch) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const removeQuestion = async (index) => {
    const q = questions[index];
    if (q._id) {
      try {
        await questionsAPI.remove(q._id);
      } catch (e) {
        toast.error(getErrorMessage(e));
        return;
      }
    }
    const next = questions.filter((_, i) => i !== index);
    setQuestions(next);
    setActiveIdx(Math.max(0, index - 1));
  };

  const moveQuestion = (from, to) => {
    if (to < 0 || to >= questions.length) return;
    const arr = [...questions];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    setQuestions(arr);
    setActiveIdx(to);
  };

  const onDragStart = (index) => setDragIndex(index);
  const onDragOver = (e, index) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    moveQuestion(dragIndex, index);
    setDragIndex(index);
  };
  const onDragEnd = async () => {
    setDragIndex(null);
    const order = questions
      .filter((q) => q._id)
      .map((q, index) => ({ id: q._id, order: index }));
    if (!order.length) return;
    try {
      await questionsAPI.reorder(order);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const active = questions[activeIdx];

  if (!isNew && isLoading) {
    return <p className="p-6">Loading exam builder…</p>;
  }

  return (
    <div>
      <PageHeader
        title={isNew ? 'Create Exam' : 'Edit Exam'}
        subtitle="Google Forms-style builder with drag-and-drop questions"
        actions={
          <Button onClick={handleSaveAll} loading={saveExamMut.isPending}>
            <Save size={16} /> Save all
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Sidebar question list */}
        <Card className="h-fit lg:sticky lg:top-20">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Questions ({questions.length})
          </h3>
          <div className="max-h-[50vh] space-y-1 overflow-y-auto">
            {questions.map((q, i) => (
              <div
                key={q._id || i}
                draggable
                onDragStart={() => onDragStart(i)}
                onDragOver={(e) => onDragOver(e, i)}
                onDragEnd={onDragEnd}
                onClick={() => setActiveIdx(i)}
                className={`flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2 text-sm transition ${
                  activeIdx === i
                    ? 'bg-brand-700 text-white'
                    : 'hover:bg-mist dark:hover:bg-slate-800'
                }`}
              >
                <GripVertical size={14} className="shrink-0 opacity-60" />
                <span className="min-w-0 flex-1 truncate">
                  {i + 1}. {q.title || 'Untitled'}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
            <p className="mb-2 text-xs font-medium text-slate-500">Add question</p>
            <Select
              onChange={(e) => {
                if (e.target.value) {
                  addQuestion(e.target.value);
                  e.target.value = '';
                }
              }}
              defaultValue=""
            >
              <option value="" disabled>
                Select type…
              </option>
              {QUESTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {questionTypeLabel(t)}
                </option>
              ))}
            </Select>
          </div>
        </Card>

        <div className="space-y-6">
          {/* Exam meta */}
          <Card>
            <h3 className="mb-4 font-semibold">Exam details</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="Title"
                  value={exam.title}
                  onChange={(e) => setExam({ ...exam, title: e.target.value })}
                />
              </div>
              <Input
                label="Duration (minutes)"
                type="number"
                min={1}
                value={exam.duration}
                onChange={(e) => setExam({ ...exam, duration: Number(e.target.value) })}
              />
              <Input
                label="Passing marks"
                type="number"
                min={0}
                value={exam.passingMarks}
                onChange={(e) => setExam({ ...exam, passingMarks: Number(e.target.value) })}
              />
              <div className="sm:col-span-2">
                <Select
                  label="Course"
                  value={exam.course}
                  onChange={(e) => setExam({ ...exam, course: e.target.value })}
                >
                  <option value="">No course</option>
                  {(courses || []).map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.code} — {c.title}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="sm:col-span-2 space-y-3">
                <div>
                  <p className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Availability
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <label
                      className={cn(
                        'flex flex-1 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition',
                        specificMode
                          ? 'border-brand-600 bg-brand-50 dark:bg-brand-950'
                          : 'border-slate-200 dark:border-slate-700'
                      )}
                    >
                      <input
                        type="radio"
                        name="availability"
                        value="specific"
                        checked={specificMode}
                        onChange={() => setSpecificMode(true)}
                        className="h-4 w-4 text-brand-700 focus:ring-brand-500"
                      />
                      <span>
                        <span className="font-medium">Specific students</span>
                        <span className="block text-xs text-slate-500">
                          Only the students you select can take this exam
                        </span>
                      </span>
                    </label>
                    <label
                      className={cn(
                        'flex flex-1 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition',
                        !specificMode
                          ? 'border-brand-600 bg-brand-50 dark:bg-brand-950'
                          : 'border-slate-200 dark:border-slate-700'
                      )}
                    >
                      <input
                        type="radio"
                        name="availability"
                        value="all"
                        checked={!specificMode}
                        onChange={() => {
                          setExam({ ...exam, assignedStudents: [] });
                          setSpecificMode(false);
                        }}
                        className="h-4 w-4 text-brand-700 focus:ring-brand-500"
                      />
                      <span>
                        <span className="font-medium">All eligible students</span>
                        <span className="block text-xs text-slate-500">
                          Every active student on the platform can take this exam
                        </span>
                      </span>
                    </label>
                  </div>
                </div>

                {specificMode && (
                  <StudentPicker
                    students={students || []}
                    value={exam.assignedStudents}
                    onChange={(ids) => setExam({ ...exam, assignedStudents: ids })}
                    searchStudents={searchStudents}
                  />
                )}
              </div>
              {!!assignmentData?.assignments?.length && (
                <div className="sm:col-span-2">
                  <h4 className="mb-2 text-sm font-semibold">Assignment status</h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-mist/50 dark:bg-slate-900">
                        <tr>
                          <th className="px-3 py-2">Student</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Warnings</th>
                          <th className="px-3 py-2">Submitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignmentData.assignments.map((row) => (
                          <tr key={row.student._id} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="px-3 py-2">
                              {row.student.firstName} {row.student.lastName}
                            </td>
                            <td className="px-3 py-2">
                              <Badge>{row.status.replace('_', ' ')}</Badge>
                            </td>
                            <td className="px-3 py-2">{row.warnings}</td>
                            <td className="px-3 py-2">
                              {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <div className="sm:col-span-2">
                <TextArea
                  label="Description"
                  value={exam.description}
                  onChange={(e) => setExam({ ...exam, description: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <TextArea
                  label="Instructions"
                  value={exam.instructions}
                  onChange={(e) => setExam({ ...exam, instructions: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                ['shuffleQuestions', 'Shuffle questions'],
                ['showResults', 'Show results after submit'],
                ['requireFullscreen', 'Require fullscreen'],
                ['aiGrading', 'Enable AI essay grading'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!exam.settings?.[key]}
                    onChange={(e) =>
                      setExam({
                        ...exam,
                        settings: { ...exam.settings, [key]: e.target.checked },
                      })
                    }
                  />
                  {label}
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!exam.settings?.antiCheat?.enabled}
                  onChange={(e) =>
                    setExam({
                      ...exam,
                      settings: {
                        ...exam.settings,
                        antiCheat: { ...exam.settings.antiCheat, enabled: e.target.checked },
                      },
                    })
                  }
                />
                Anti-cheating enabled
              </label>
            </div>
          </Card>

          {/* Active question editor */}
          {active ? (
            <Card>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge>{questionTypeLabel(active.type)}</Badge>
                  <span className="text-sm text-slate-500">Question {activeIdx + 1}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => moveQuestion(activeIdx, activeIdx - 1)}>
                    <ChevronUp size={16} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => moveQuestion(activeIdx, activeIdx + 1)}>
                    <ChevronDown size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
                    onClick={() => removeQuestion(activeIdx)}
                  >
                    <Trash2 size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      try {
                        const saved = await saveQuestion(active, activeIdx);
                        setQuestions((prev) => prev.map((q, i) => (i === activeIdx ? saved : q)));
                        toast.success('Question saved');
                      } catch (e) {
                        toast.error(getErrorMessage(e));
                      }
                    }}
                  >
                    <Save size={14} /> Save question
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <TextArea
                  label="Question"
                  value={active.title}
                  onChange={(e) => updateQuestion(activeIdx, { title: e.target.value })}
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input
                    label="Marks"
                    type="number"
                    min={0}
                    value={active.marks}
                    onChange={(e) => updateQuestion(activeIdx, { marks: Number(e.target.value) })}
                  />
                  <label className="flex items-end gap-2 pb-2 text-sm">
                    <input
                      type="checkbox"
                      checked={active.required}
                      onChange={(e) => updateQuestion(activeIdx, { required: e.target.checked })}
                    />
                    Required
                  </label>
                  <label className="flex items-end gap-2 pb-2 text-sm">
                    <input
                      type="checkbox"
                      checked={active.randomizeOptions}
                      onChange={(e) =>
                        updateQuestion(activeIdx, { randomizeOptions: e.target.checked })
                      }
                    />
                    Randomize options
                  </label>
                </div>

                {/* Options for MCQ / checkbox / dropdown / TF */}
                {['multiple_choice', 'checkbox', 'dropdown', 'true_false'].includes(active.type) && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Options</p>
                    {(active.options || []).map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          type={active.type === 'checkbox' ? 'checkbox' : 'radio'}
                          name={`correct-${activeIdx}`}
                          checked={!!opt.isCorrect}
                          onChange={() => {
                            let options;
                            if (active.type === 'checkbox') {
                              options = active.options.map((o, i) =>
                                i === oi ? { ...o, isCorrect: !o.isCorrect } : o
                              );
                            } else {
                              options = active.options.map((o, i) => ({
                                ...o,
                                isCorrect: i === oi,
                              }));
                            }
                            updateQuestion(activeIdx, { options });
                          }}
                        />
                        <input
                          className="flex-1 rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
                          value={opt.text}
                          onChange={(e) => {
                            const options = active.options.map((o, i) =>
                              i === oi ? { ...o, text: e.target.value } : o
                            );
                            updateQuestion(activeIdx, { options });
                          }}
                          disabled={active.type === 'true_false'}
                        />
                        {active.type !== 'true_false' && (
                          <button
                            type="button"
                            className="text-red-500"
                            onClick={() =>
                              updateQuestion(activeIdx, {
                                options: active.options.filter((_, i) => i !== oi),
                              })
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                    {active.type !== 'true_false' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          updateQuestion(activeIdx, {
                            options: [...(active.options || []), { text: 'New option', isCorrect: false }],
                          })
                        }
                      >
                        <Plus size={14} /> Add option
                      </Button>
                    )}
                  </div>
                )}

                {active.type === 'short_answer' && (
                  <Input
                    label="Accepted answers (comma-separated)"
                    value={(active.correctAnswers || []).join(', ')}
                    onChange={(e) =>
                      updateQuestion(activeIdx, {
                        correctAnswers: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                  />
                )}

                {active.type === 'fill_blank' && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Accepted answers for blank</p>
                    {(active.blanks || []).map((b, bi) => (
                      <Input
                        key={bi}
                        label={`Blank ${bi + 1}`}
                        value={(b.answers || []).join(', ')}
                        onChange={(e) => {
                          const blanks = [...active.blanks];
                          blanks[bi] = {
                            ...b,
                            answers: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                          };
                          updateQuestion(activeIdx, { blanks });
                        }}
                      />
                    ))}
                  </div>
                )}

                {active.type === 'matching' && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Matching pairs</p>
                    {(active.matchingPairs || []).map((p, pi) => (
                      <div key={pi} className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Left"
                          value={p.left}
                          onChange={(e) => {
                            const matchingPairs = active.matchingPairs.map((mp, i) =>
                              i === pi ? { ...mp, left: e.target.value } : mp
                            );
                            updateQuestion(activeIdx, { matchingPairs });
                          }}
                        />
                        <Input
                          placeholder="Right"
                          value={p.right}
                          onChange={(e) => {
                            const matchingPairs = active.matchingPairs.map((mp, i) =>
                              i === pi ? { ...mp, right: e.target.value } : mp
                            );
                            updateQuestion(activeIdx, { matchingPairs });
                          }}
                        />
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        updateQuestion(activeIdx, {
                          matchingPairs: [
                            ...(active.matchingPairs || []),
                            { left: '', right: '' },
                          ],
                        })
                      }
                    >
                      <Plus size={14} /> Add pair
                    </Button>
                  </div>
                )}

                {active.type === 'essay' && (
                  <>
                    <TextArea
                      label="Reference answer"
                      value={active.referenceAnswer || ''}
                      onChange={(e) =>
                        updateQuestion(activeIdx, { referenceAnswer: e.target.value })
                      }
                    />
                    <TextArea
                      label="Grading rubric"
                      value={active.rubric || ''}
                      onChange={(e) => updateQuestion(activeIdx, { rubric: e.target.value })}
                    />
                  </>
                )}

                {['image', 'video'].includes(active.type) && (
                  <Input
                    label="Media URL"
                    value={active.mediaUrl || ''}
                    onChange={(e) => updateQuestion(activeIdx, { mediaUrl: e.target.value })}
                  />
                )}

                <TextArea
                  label="Explanation (shown after grading)"
                  value={active.explanation || ''}
                  onChange={(e) => updateQuestion(activeIdx, { explanation: e.target.value })}
                />
              </div>
            </Card>
          ) : (
            <Card>
              <div className="py-12 text-center">
                <p className="text-slate-500">Add your first question to get started</p>
                <Button className="mt-4" onClick={() => addQuestion('multiple_choice')}>
                  <Plus size={16} /> Add multiple choice
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
