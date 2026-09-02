import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Wifi, AlertTriangle } from 'lucide-react';
import { reportsAPI, examsAPI, responsesAPI, getSignedMediaUrl } from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { PageHeader, Card, Badge, Skeleton } from '../../components/ui';
import { formatDuration, formatDateTime } from '../../utils/helpers';

export default function LiveMonitorPage() {
  const { examId } = useParams();
  const { socket, connected } = useSocket();
  const [online, setOnline] = useState([]);
  const [events, setEvents] = useState([]);
  const [showRecordings, setShowRecordings] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const { data: exam } = useQuery({
    queryKey: ['exam', examId],
    queryFn: async () => (await examsAPI.get(examId)).data.data.exam,
  });

  const { data: live, refetch } = useQuery({
    queryKey: ['live', examId],
    queryFn: async () => (await reportsAPI.live(examId)).data.data.monitoring,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (!socket || !examId) return undefined;
    socket.emit('monitor:subscribe', { examId });

    const onOnline = (payload) => {
      if (payload.examId === examId) setOnline(payload.students || []);
    };
    const onWarning = (payload) => {
      setEvents((prev) => [
        { ...payload, at: new Date(), kind: 'warning' },
        ...prev.slice(0, 49),
      ]);
      refetch();
    };
    const onStatus = (payload) => {
      setOnline((prev) => {
        const idx = prev.findIndex((s) => String(s.studentId) === String(payload.studentId));
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], ...payload };
        return next;
      });
    };
    const onSubmitted = (payload) => {
      setEvents((prev) => [
        { ...payload, at: new Date(), kind: 'submitted', studentName: 'Student' },
        ...prev.slice(0, 49),
      ]);
      refetch();
    };

    socket.on('students:online', onOnline);
    socket.on('student:warning', onWarning);
    socket.on('student:status', onStatus);
    socket.on('student:submitted', onSubmitted);

    return () => {
      socket.off('students:online', onOnline);
      socket.off('student:warning', onWarning);
      socket.off('student:status', onStatus);
      socket.off('student:submitted', onSubmitted);
    };
  }, [socket, examId, refetch]);

  const students = online.length ? online : live?.students || [];

  const viewRecordings = async (s) => {
    const id = s.responseId || s.response;
    if (!id) return;
    try {
      const res = await responsesAPI.get(id);
      const response = res.data.data.response;
      const media = response?.proctoring?.media || [];
      const list = await Promise.all(
        media.map(async (m) => {
          const filename = m.filename || (m.url ? m.url.split('/').pop() : '');
          try {
            const url = await getSignedMediaUrl(id, filename);
            return { ...m, url };
          } catch {
            return { ...m, url: '' };
          }
        })
      );
      setRecordings(list);
      setSelectedStudent(
        s.student?.firstName
          ? `${s.student.firstName} ${s.student.lastName}`
          : s.name || s.studentId
      );
      setShowRecordings(true);
    } catch (err) {
      console.error('Failed to load recordings', err);
    }
  };

  return (
    <div>
      <PageHeader
        title={`Live Monitor — ${exam?.title || 'Exam'}`}
        subtitle={
          <span className="inline-flex items-center gap-2">
            <Wifi size={14} className={connected ? 'text-emerald-500' : 'text-slate-400'} />
            {connected ? 'Realtime connected' : 'Connecting…'} · {students.length} online
          </span>
        }
      />

      {showRecordings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-4xl overflow-auto rounded-xl bg-white p-4 dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Recordings — {selectedStudent}</h3>
              <button type="button" onClick={() => setShowRecordings(false)} className="text-sm">
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              {recordings.length === 0 && (
                <p className="text-sm text-slate-500">No recordings found for this student.</p>
              )}
              {recordings.map((r, i) => (
                <div key={i} className="rounded-lg border p-2">
                  {r.type && r.type.startsWith('image') ? (
                    <img src={r.url} alt={r.filename} className="max-h-64 w-full object-contain" />
                  ) : r.url ? (
                    <video controls className="w-full">
                      <source src={r.url} type={r.type || 'video/webm'} />
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <p className="text-sm text-slate-500">Unable to load recording.</p>
                  )}
                  <p className="mt-2 text-xs text-slate-500">
                    Uploaded: {new Date(r.uploadedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {!live && !online.length ? (
            <Skeleton className="h-48" />
          ) : students.length === 0 ? (
            <Card>
              <p className="py-10 text-center text-slate-500">No students currently in the exam.</p>
            </Card>
          ) : (
            students.map((s) => (
              <Card key={s.responseId || s.studentId || s.socketId}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {s.student
                        ? `${s.student.firstName} ${s.student.lastName}`
                        : s.name || 'Student'}
                    </p>
                    <p className="text-xs text-slate-500">
                      Q{(s.currentQuestionIndex || 0) + 1} · Progress {s.progress || 0}/
                      {s.totalQuestions || '—'} · Last activity{' '}
                      {formatDateTime(s.lastActivity || s.joinedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.warnings > 0 ? 'danger' : 'success'}>
                      {s.warnings || 0} warnings
                    </Badge>
                    <span className="font-mono text-sm">{formatDuration(s.timeRemaining || 0)}</span>
                    <button
                      type="button"
                      onClick={() => viewRecordings(s)}
                      className="ml-2 rounded-md bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800"
                    >
                      View recordings
                    </button>
                  </div>
                </div>
                {!!s.warningLogs?.length && (
                  <div className="mt-3 space-y-1">
                    {s.warningLogs.map((w, i) => (
                      <p
                        key={i}
                        className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400"
                      >
                        <AlertTriangle size={12} /> {w.type}: {w.message}
                      </p>
                    ))}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>

        <Card>
          <h3 className="font-semibold">Live events</h3>
          <div className="mt-3 max-h-[60vh] space-y-2 overflow-y-auto">
            {events.map((e, i) => (
              <div
                key={i}
                className={`rounded-lg px-3 py-2 text-sm ${
                  e.kind === 'warning'
                    ? 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200'
                    : 'bg-mist dark:bg-slate-800'
                }`}
              >
                <p className="font-medium">{e.studentName || e.studentId}</p>
                <p className="text-xs opacity-80">
                  {e.kind === 'warning'
                    ? `${e.type}: ${e.message}${e.severity === 'info' ? ' (info)' : ''}`
                    : 'Submitted exam'}
                </p>
              </div>
            ))}
            {!events.length && <p className="text-sm text-slate-500">Waiting for activity…</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
