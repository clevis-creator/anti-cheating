import { useQuery } from '@tanstack/react-query';
import { Users, GraduationCap, BookOpen, ClipboardList, TrendingUp, Shield } from 'lucide-react';
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
import { usersAPI, reportsAPI } from '../../services/api';
import { PageHeader, StatCard, Card, Skeleton, Badge } from '../../components/ui';
import { formatDateTime } from '../../utils/helpers';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function AdminDashboard() {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => (await usersAPI.stats()).data.data,
  });

  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => (await reportsAPI.analytics()).data.data.analytics,
  });

  const stats = statsData?.stats || {};

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  const barData = {
    labels: (analytics?.chartData || []).map((c) => c.title.slice(0, 20)),
    datasets: [
      {
        label: 'Avg score %',
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
      <PageHeader title="Admin Dashboard" subtitle="Platform overview and system health" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={stats.totalUsers || 0} icon={Users} />
        <StatCard title="Teachers" value={stats.totalTeachers || 0} icon={GraduationCap} />
        <StatCard title="Students" value={stats.totalStudents || 0} icon={BookOpen} />
        <StatCard title="Exams" value={stats.totalExams || 0} icon={ClipboardList} />
        <StatCard title="Submissions" value={stats.totalResponses || 0} icon={Shield} />
        <StatCard title="Courses" value={stats.totalCourses || 0} icon={BookOpen} />
        <StatCard title="Avg Score" value={`${stats.avgPercentage || 0}%`} icon={TrendingUp} />
        <StatCard title="Pass Rate" value={`${stats.passRate || 0}%`} icon={TrendingUp} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold">Exam performance</h3>
          {(analytics?.chartData || []).length ? (
            <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">No exam data yet</p>
          )}
        </Card>
        <Card>
          <h3 className="mb-4 font-semibold">Grade distribution</h3>
          {(analytics?.totalResults || 0) > 0 ? (
            <div className="mx-auto max-w-xs">
              <Doughnut data={doughnutData} />
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">No results yet</p>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <h3 className="mb-4 font-semibold">Recent activity</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800">
                <th className="pb-2 font-medium">User</th>
                <th className="pb-2 font-medium">Action</th>
                <th className="pb-2 font-medium">Details</th>
                <th className="pb-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {(statsData?.recentLogs || []).map((log) => (
                <tr key={log._id} className="border-b border-slate-100 dark:border-slate-800/60">
                  <td className="py-3">
                    {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                    {log.user?.role && (
                      <Badge className="ml-2" variant="info">
                        {log.user.role}
                      </Badge>
                    )}
                  </td>
                  <td className="py-3">{log.action}</td>
                  <td className="py-3 text-slate-500">{log.details}</td>
                  <td className="py-3 text-slate-500">{formatDateTime(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
