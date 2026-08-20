import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Flag, ChevronLeft, ChevronRight, Send, AlertTriangle } from 'lucide-react';
import { responsesAPI, setExamSessionToken, clearExamSessionToken, examsAPI } from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { useAntiCheat } from '../../hooks/useAntiCheat';
import { Button, Card, Badge } from '../../components/ui';
import useProctoring from '../../hooks/useProctoring';
import { formatDuration, getErrorMessage, questionTypeLabel } from '../../utils/helpers';

export default function TakeExamPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState(null);
  const [response, setResponse] = useState(null);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [flagged, setFlagged] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [warnings, setWarnings] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [needsAccessCode, setNeedsAccessCode] = useState(false);
  const [requiresSEB, setRequiresSEB] = useState(false);

  const answersRef = useRef(answers);
  const responseRef = useRef(response);
  const currentRef = useRef(current);
  const timeRemainingRef = useRef(timeRemaining);
  const flaggedRef = useRef(flagged);
  const submittingRef = useRef(false);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    responseRef.current = response;
  }, [response]);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);
  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
  }, [timeRemaining]);
  useEffect(() => {
    flaggedRef.current = flagged;
  }, [flagged]);

  const antiCheatEnabled = exam?.settings?.antiCheat?.enabled !== false;
  const maxWarnings = exam?.settings?.antiCheat?.maxWarnings || 3;

  const logActivity = useCallback(async (action, details = '') => {
    const res = responseRef.current;
    if (!res?._id) return;
    try {
      await responsesAPI.activity(res._id, { action, details });
    } catch {
      // non-blocking
    }
  }, []);

  const buildAnswersPayload = useCallback(() => {
    return Object.entries(answersRef.current).map(([question, answer]) => ({
      question,
      answer,
    }));
  }, []);

  const saveProgressFromRefs = useCallback(async () => {
    const res = responseRef.current;
    if (!res?._id) return;
    const flaggedIds = flaggedRef.current;
    const payload = {
      answers: Object.entries(answersRef.current).map(([question, answer]) => ({
        question,
        answer,
        flagged: flaggedIds.includes(question),
      })),
      currentQuestionIndex: currentRef.current,
      timeRemaining: timeRemainingRef.current,
      flaggedQuestions: flaggedIds,
    };
    await responsesAPI.save(res._id, payload);
  }, []);

  const finishAndLeave = useCallback(async () => {
    socket?.emit('exam:leave', { examId });
    clearExamSessionToken();
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    }
    navigate('/student/history');
  }, [socket, examId, navigate]);

  const handleAutoSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    toast.error('Maximum warnings reached. Exam auto-submitted.');
    const res = responseRef.current;
    try {
      if (res?._id) {
        try {
          await saveProgressFromRefs();
        } catch {
          // may already be submitted by warning endpoint
        }
        try {
          await responsesAPI.submit(res._id, { answers: buildAnswersPayload() });
        } catch {
          // server may have already auto-submitted on max warnings
        }
        await logActivity('auto_submit', 'Exam auto-submitted after max warnings');
      }
    } finally {
      await finishAndLeave();
    }
  }, [saveProgressFromRefs, buildAnswersPayload, logActivity, finishAndLeave]);

  const { enterFullscreen } = useAntiCheat({
    enabled: started && antiCheatEnabled,
    responseId: response?._id,
    requireFullscreen: exam?.settings?.requireFullscreen,
    antiCheat: exam?.settings?.antiCheat || {},
    onWarning: (count, type) => {
      setWarnings(count);
      toast.error(`Warning ${count}/${maxWarnings}: ${type.replace('_', ' ')}`);
      if (exam?.settings?.antiCheat?.logActivity !== false) {
        logActivity('anti_cheat_warning', `${type} (warning ${count}/${maxWarnings})`);
      }
      saveProgressFromRefs().catch(() => {});
    },
    onAutoSubmit: handleAutoSubmit,
  });

  // start periodic proctoring recordings when exam started and consent given
  const proctoringEnabled = started && response?.proctoring?.consentGiven;
  // lazy-load hook
  useProctoring({ enabled: proctoringEnabled, responseId: response?._id, type: 'screen', chunkMs: 15000 });

  const startExamApi = async () => {
    try {
      setLoading(true);
      const deviceInfo = {
        browser: navigator.userAgent,
        os: navigator.platform,
        device: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      };
      const { data } = await responsesAPI.start(examId, deviceInfo);
      const res = data.data.response;
      const ex = data.data.exam;
      setExam(ex);
      setResponse(res);
      responseRef.current = res;
      setTimeRemaining(res.timeRemaining ?? ex.duration * 60);
      setCurrent(res.currentQuestionIndex || 0);
      setFlagged((res.flaggedQuestions || []).map(String));

      const map = {};
      (res.answers || []).forEach((a) => {
        map[a.question] = a.answer;
      });
      setAnswers(map);
      answersRef.current = map;
      setWarnings(res.warnings || 0);
      setStarted(true);
      await enterFullscreen();

      socket?.emit('exam:join', { examId, responseId: res._id });
      try {
        await responsesAPI.activity(res._id, {
          action: 'exam_started',
          details: 'Student entered secure exam session',
        });
      } catch {
        // non-blocking
      }
      return res;
    } catch (err) {
      toast.error(getErrorMessage(err));
      navigate('/student/exams');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const startExam = () => setShowConsent(true);

  const captureAndUploadSelfie = async (responseId, consent = false) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        const file = new File([blob], `selfie-${Date.now()}.png`, { type: 'image/png' });
        try {
          await responsesAPI.proctoringUpload(responseId, file, consent);
          toast.success('Selfie uploaded for proctoring');
        } catch (err) {
          console.error('Upload failed', err);
        }
      }
    } catch (err) {
      console.error('Could not capture selfie', err);
    } finally {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    }
  };

  const proceedStart = async (consent) => {
    setShowConsent(false);
    try {
      const res = await startExamApi(accessCode);
      if (consent && res?._id) {
        // set consent on server by uploading a small empty form or selfie
        await captureAndUploadSelfie(res._id, true);
        // update local response object to indicate consent so useProctoring starts
        setResponse((prev) => ({ ...prev, proctoring: { ...(prev?.proctoring || {}), consentGiven: true, consentAt: new Date() } }));
      }
    } catch {
      // handled in startExamApi
    }
  };

  useEffect(() => {
    examsAPI
      .get(examId)
      .then(({ data }) => {
        const ex = data.data.exam;
        setNeedsAccessCode(!!ex?.accessCode?.trim());
        setRequiresSEB(!!ex?.settings?.requireSEB);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [examId]);

  // Countdown
  useEffect(() => {
    if (!started || !response) return undefined;
    const t = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, response?._id]);

  // Autosave every 20s
  useEffect(() => {
    if (!started || !response) return undefined;
    const t = setInterval(() => saveProgress(), 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, response?._id, answers, current, timeRemaining, flagged]);

  // Heartbeat
  useEffect(() => {
    if (!started || !socket) return undefined;
    const t = setInterval(() => {
      const progress = Object.values(answers).filter(
        (a) => a !== null && a !== undefined && a !== ''
      ).length;
      socket.emit('student:heartbeat', {
        examId,
        timeRemaining,
        currentQuestionIndex: current,
        progress,
      });
    }, 10000);
    return () => clearInterval(t);
  }, [started, socket, examId, timeRemaining, current, answers]);

  const questions = exam?.questions || [];
  const question = questions[current];

  const progressPct = useMemo(() => {
    if (!questions.length) return 0;
    const answered = questions.filter((q) => {
      const a = answers[q._id];
      return a !== null && a !== undefined && a !== '' && !(Array.isArray(a) && !a.length);
    }).length;
    return Math.round((answered / questions.length) * 100);
  }, [questions, answers]);

  const saveProgress = async () => {
    if (!response) return;
    try {
      const payload = {
        answers: Object.entries(answers).map(([question, answer]) => ({
          question,
          answer,
          flagged: flagged.includes(question),
        })),
        currentQuestionIndex: current,
        timeRemaining,
        flaggedQuestions: flagged,
      };
      await responsesAPI.save(response._id, payload);
    } catch {
      // silent — connection loss resilience
    }
  };

  const handleSubmit = async (auto = false) => {
    if (submittingRef.current || !responseRef.current) return;
    if (!auto && !confirm('Submit your exam? You cannot change answers after submission.')) return;
    submittingRef.current = true;
    setSubmitting(true);
    const res = responseRef.current;
    try {
      try {
        await saveProgressFromRefs();
      } catch {
        // continue to submit
      }
      await responsesAPI.submit(res._id, {
        answers: buildAnswersPayload(),
      });
      toast.success(auto ? 'Time up — exam submitted' : 'Exam submitted successfully');
      await finishAndLeave();
    } catch (err) {
      toast.error(getErrorMessage(err));
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const setAnswer = (qid, value) => setAnswers((prev) => ({ ...prev, [qid]: value }));

  const toggleFlag = () => {
    if (!question) return;
    const id = question._id;
    setFlagged((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  if (!started) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <Card>
          <h1 className="text-2xl font-semibold">Ready to begin?</h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            This exam uses secure browser mode. Switching tabs, exiting fullscreen, or using
            copy/paste will trigger warnings. After {maxWarnings} warnings the exam auto-submits.
          </p>
          <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-400">
            <li>Ensure a stable internet connection</li>
            <li>Close other applications and browser tabs</li>
            <li>Your progress autosaves every 20 seconds</li>
            {requiresSEB && (
              <li className="font-medium text-amber-700">This exam requires Safe Exam Browser (SEB)</li>
            )}
          </ul>
          {needsAccessCode && (
            <div className="mt-4">
              <label className="text-sm font-medium">Exam access code</label>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900"
                placeholder="Enter access code"
              />
            </div>
          )}
          <Button className="mt-6" onClick={startExam} loading={loading}>
            Start exam
          </Button>
          {showConsent && (
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
              <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
                <h3 className="text-lg font-semibold">Consent for Webcam Capture</h3>
                <p className="mt-3 text-sm text-slate-600">
                  This exam may capture a short selfie to verify your identity and assist proctors.
                  Images are stored securely and used only for exam integrity purposes. Do you
                  consent to a pre-exam webcam capture?
                </p>
                <div className="mt-6 flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => proceedStart(false)}>Decline</Button>
                  <Button onClick={() => proceedStart(true)}>Allow & Start</Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (!question) {
    return <p className="p-6">No questions in this exam.</p>;
  }

  return (
    <div className="exam-secure fixed inset-0 z-50 flex flex-col bg-sand dark:bg-ink">
      {/* Top bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
        <div>
          <p className="font-semibold">{exam.title}</p>
          <p className="text-xs text-slate-500">
            Question {current + 1} of {questions.length}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {warnings > 0 && (
            <Badge variant="danger">
              <AlertTriangle size={12} className="mr-1 inline" />
              {warnings}/{maxWarnings}
            </Badge>
          )}
          <div
            className={`rounded-xl px-3 py-1.5 font-mono text-sm font-semibold ${
              timeRemaining < 300 ? 'bg-red-100 text-red-700' : 'bg-mist text-brand-800'
            }`}
          >
            {formatDuration(timeRemaining)}
          </div>
          <Button size="sm" onClick={() => handleSubmit(false)} loading={submitting}>
            <Send size={14} /> Submit
          </Button>
        </div>
      </header>

      {/* Progress */}
      <div className="h-1.5 bg-slate-200 dark:bg-slate-800">
        <div className="h-full bg-brand-600 transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Nav rail */}
        <aside className="hidden w-52 overflow-y-auto border-r border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 sm:block">
          <div className="grid grid-cols-4 gap-1.5">
            {questions.map((q, i) => {
              const answered =
                answers[q._id] !== null &&
                answers[q._id] !== undefined &&
                answers[q._id] !== '';
              const isFlagged = flagged.includes(q._id);
              return (
                <button
                  key={q._id}
                  onClick={() => setCurrent(i)}
                  className={`relative flex h-9 items-center justify-center rounded-lg text-xs font-medium ${
                    i === current
                      ? 'bg-brand-700 text-white'
                      : answered
                        ? 'bg-brand-100 text-brand-800 dark:bg-brand-900'
                        : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  {i + 1}
                  {isFlagged && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-500" />
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Question */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="mx-auto max-w-3xl">
            <div className="mb-4 flex items-center justify-between">
              <Badge>{questionTypeLabel(question.type)}</Badge>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">{question.marks} marks</span>
                <Button size="sm" variant={flagged.includes(question._id) ? 'primary' : 'ghost'} onClick={toggleFlag}>
                  <Flag size={14} /> Flag
                </Button>
              </div>
            </div>

            <h2 className="text-xl font-semibold leading-snug">{question.title}</h2>
            {question.description && (
              <p className="mt-2 text-sm text-slate-500">{question.description}</p>
            )}
            {question.mediaUrl && question.type === 'image' && (
              <img src={question.mediaUrl} alt="" className="mt-4 max-h-64 rounded-xl" />
            )}
            {question.mediaUrl && question.type === 'video' && (
              <video src={question.mediaUrl} controls className="mt-4 max-h-64 w-full rounded-xl" />
            )}

            <div className="mt-6">
              <AnswerInput question={question} value={answers[question._id]} onChange={(v) => setAnswer(question._id, v)} />
            </div>

            <div className="mt-10 flex justify-between">
              <Button
                variant="secondary"
                disabled={current === 0}
                onClick={() => setCurrent((c) => c - 1)}
              >
                <ChevronLeft size={16} /> Previous
              </Button>
              {current < questions.length - 1 ? (
                <Button onClick={() => setCurrent((c) => c + 1)}>
                  Next <ChevronRight size={16} />
                </Button>
              ) : (
                <Button onClick={() => handleSubmit(false)} loading={submitting}>
                  Submit exam
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function AnswerInput({ question, value, onChange }) {
  const type = question.type;

  if (['multiple_choice', 'true_false', 'dropdown'].includes(type)) {
    if (type === 'dropdown') {
      return (
        <select
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select an answer</option>
          {(question.options || []).map((o) => (
            <option key={o._id || o.text} value={o.text}>
              {o.text}
            </option>
          ))}
        </select>
      );
    }
    return (
      <div className="space-y-2">
        {(question.options || []).map((o) => (
          <label
            key={o._id || o.text}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
              value === o.text
                ? 'border-brand-600 bg-brand-50 dark:bg-brand-950'
                : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            <input
              type="radio"
              name={question._id}
              checked={value === o.text}
              onChange={() => onChange(o.text)}
            />
            {o.text}
          </label>
        ))}
      </div>
    );
  }

  if (type === 'checkbox') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-2">
        {(question.options || []).map((o) => {
          const checked = selected.includes(o.text);
          return (
            <label
              key={o._id || o.text}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${
                checked ? 'border-brand-600 bg-brand-50 dark:bg-brand-950' : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  onChange(
                    checked ? selected.filter((x) => x !== o.text) : [...selected, o.text]
                  );
                }}
              />
              {o.text}
            </label>
          );
        })}
      </div>
    );
  }

  if (type === 'fill_blank') {
    const blanks = question.blanks?.length || 1;
    const vals = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-3">
        {Array.from({ length: blanks }).map((_, i) => (
          <input
            key={i}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900"
            placeholder={`Blank ${i + 1}`}
            value={vals[i] || ''}
            onChange={(e) => {
              const next = [...vals];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
        ))}
      </div>
    );
  }

  if (type === 'matching') {
    const pairs = question.matchingPairs || [];
    const rights = pairs.map((p) => p.right);
    const map = typeof value === 'object' && value ? value : {};
    return (
      <div className="space-y-3">
        {pairs.map((p) => (
          <div key={p.left} className="grid gap-2 sm:grid-cols-2 sm:items-center">
            <p className="rounded-xl bg-mist px-3 py-2 text-sm dark:bg-slate-800">{p.left}</p>
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900"
              value={map[p.left] || ''}
              onChange={(e) => onChange({ ...map, [p.left]: e.target.value })}
            >
              <option value="">Match…</option>
              {rights.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'essay') {
    return (
      <textarea
        className="min-h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write your essay answer…"
      />
    );
  }

  if (type === 'file_upload') {
    return (
      <input
        type="file"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const { data } = await responsesAPI.upload(file);
            onChange(data.data.url);
            toast.success('File uploaded');
          } catch (err) {
            toast.error(getErrorMessage(err));
          }
        }}
      />
    );
  }

  // short_answer / image / video default text
  return (
    <textarea
      className="min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Your answer…"
    />
  );
}
