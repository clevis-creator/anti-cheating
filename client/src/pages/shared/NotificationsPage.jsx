import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { notificationsAPI } from '../../services/api';
import { PageHeader, Card, Button, Badge, Skeleton } from '../../components/ui';
import { formatDateTime, getErrorMessage } from '../../utils/helpers';

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await notificationsAPI.list()).data.data,
  });

  const markAll = useMutation({
    mutationFn: () => notificationsAPI.markAllRead(),
    onSuccess: () => {
      toast.success('All marked as read');
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markOne = useMutation({
    mutationFn: (id) => notificationsAPI.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={`${data?.unread || 0} unread`}
        actions={
          <Button variant="secondary" onClick={() => markAll.mutate()}>
            Mark all read
          </Button>
        }
      />
      {isLoading ? (
        <Skeleton className="h-48" />
      ) : (
        <div className="space-y-2">
          {(data?.notifications || []).map((n) => (
            <Card
              key={n._id}
              className={`cursor-pointer ${!n.read ? 'border-brand-300 dark:border-brand-700' : ''}`}
              onClick={() => !n.read && markOne.mutate(n._id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{n.title}</p>
                    {!n.read && <Badge variant="info">New</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{n.message}</p>
                  <p className="mt-2 text-xs text-slate-400">{formatDateTime(n.createdAt)}</p>
                </div>
                <Badge>{n.type}</Badge>
              </div>
            </Card>
          ))}
          {!data?.notifications?.length && (
            <Card>
              <p className="py-10 text-center text-slate-500">No notifications</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
