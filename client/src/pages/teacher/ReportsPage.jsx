import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Download } from 'lucide-react';
import { reportsAPI, examsAPI, uploadUrl } from '../../services/api';
import { PageHeader, Card, Button, Select, Skeleton } from '../../components/ui';
import { getErrorMessage } from '../../utils/helpers';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function ReportsPage() {
  const [examId, setExamId] = useState('');
  const [format, setFormat] = useState('csv');

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => (await reportsAPI.analytics()).data.data.analytics,
  });

  const { data: exams } = useQuery({
    queryKey: ['exams'],
    queryFn: async () => (await examsAPI.list()).data.data.exams,
  });

  const { data: examReport } = useQuery({
    queryKey: ['exam-report', examId],
    queryFn: async () => (await reportsAPI.examReport(examId)).data.data.report,
    enabled: !!examId,
  });

  const exportMut = useMutation({
    mutationFn: (payload) => reportsAPI.export(payload),
    onSuccess: ({ data }) => {
      toast.success('Export ready');
      const url = data.data.fileUrl;
      window.open(uploadUrl(url), '_blank', 'noopener,noreferrer');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const barData = {
    labels: (analytics?.chartData || []).map((c) => c.title.slice(0, 18)),
    datasets: [
      {
        label: 'Average %',
        data: (analytics?.chartData || []).map((c) => c.avgScore),
        backgroundColor: '#0f766e',
        borderRadius: 8,
      },
    ],
  };

  const doughnutData = {
    labels: Object.keys(analytics?.distribution || {}),
    datasets: [
      {
        data: Object.values(analytics?.distribution || {}),
        backgroundColor: ['#0f766e', '#14b8a6', '#5eead4', '#f59e0b', '#ef4444'],
      },
    ],
  };

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Performance insights and exportable reports"
        actions={
          <div className="flex flex-wrap gap-2">
            <Select value={format} onChange={(e) => setFormat(e.target.value)} className="w-28">
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
            </Select>
            <Button
              variant="secondary"
              loading={exportMut.isPending}
              onClick={() =>
                exportMut.mutate({
                  type: examId ? 'exam' : 'students',
                  examId: examId || undefined,
                  format,
                })
              }
            >
              <Download size={16} /> Export
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h3 className="mb-4 font-semibold">Exam averages</h3>
            {(analytics?.chartData || []).length ? (
              <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">No data yet</p>
            )}
          </Card>
          <Card>
            <h3 className="mb-4 font-semibold">Grade distribution</h3>
            <div className="mx-auto max-w-xs">
              {(analytics?.totalResults || 0) > 0 ? (
                <Doughnut data={doughnutData} />
              ) : (
                <p className="py-10 text-center text-sm text-slate-500">No results</p>
              )}
            </div>
            <p className="mt-4 text-center text-sm text-slate-500">
              Overall average: {analytics?.overallAvg || 0}%
            </p>
          </Card>
        </div>
      )}

      <Card className="mt-6">
        <h3 className="mb-3 font-semibold">Exam report</h3>
        <Select label="Select exam" value={examId} onChange={(e) => setExamId(e.target.value)}>
          <option value="">Choose exam…</option>
          {(exams || []).map((e) => (
            <option key={e._id} value={e._id}>
              {e.title}
            </option>
          ))}
        </Select>

        {examReport && (
          <div className="mt-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <Stat label="Attempts" value={examReport.summary.totalAttempts} />
              <Stat label="Avg %" value={examReport.summary.avgPercentage} />
              <Stat label="Pass rate" value={`${examReport.summary.passRate}%`} />
              <Stat label="Avg warnings" value={examReport.summary.avgWarnings} />
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2">Student</th>
                    <th className="py-2">Marks</th>
                    <th className="py-2">%</th>
                    <th className="py-2">Grade</th>
                    <th className="py-2">Passed</th>
                  </tr>
                </thead>
                <tbody>
                  {examReport.results.map((r, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2">{r.student}</td>
                      <td className="py-2">
                        {r.obtainedMarks}/{r.totalMarks}
                      </td>
                      <td className="py-2">{r.percentage}</td>
                      <td className="py-2">{r.grade}</td>
                      <td className="py-2">{r.passed ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-mist/70 p-3 dark:bg-slate-800">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
