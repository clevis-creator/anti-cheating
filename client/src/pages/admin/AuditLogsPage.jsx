import { useQuery } from '@tanstack/react-query';
import { usersAPI } from '../../services/api';
import { PageHeader, Card, Badge, Skeleton } from '../../components/ui';
import { formatDateTime } from '../../utils/helpers';

export default function AuditLogsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => (await usersAPI.auditLogs({ limit: 100 })).data.data,
  });

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Security and administrative activity trail" />
      <Card className="overflow-x-auto p-0">
        {isLoading ? (
          <div className="p-6">
            <Skeleton className="h-48" />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-mist/50 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {(data?.logs || []).map((log) => (
                <tr key={log._id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {log.user ? `${log.user.firstName} ${log.user.lastName}` : '—'}
                  </td>
                  <td className="px-4 py-3">{log.action}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        log.severity === 'high' || log.severity === 'critical'
                          ? 'danger'
                          : log.severity === 'medium'
                            ? 'warning'
                            : 'default'
                      }
                    >
                      {log.severity}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{log.ipAddress || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
