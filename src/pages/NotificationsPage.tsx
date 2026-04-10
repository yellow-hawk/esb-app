import { useNavigate } from 'react-router-dom';
import { Bell, Calendar, Newspaper, Check, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNotifications } from '@/hooks/useNotifications';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();

  const handleNotificationClick = async (notification: typeof notifications[0]) => {
    // Mark as read
    if (notification.notification_recipients.some(r => r.read_at === null)) {
      await markAsRead(notification.id);
    }

    // Navigate to target
    if (notification.target_type === 'post') {
      navigate(`/posts/${notification.target_id}`);
    } else if (notification.target_type === 'event') {
      navigate(`/events/${notification.target_id}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'post_published':
        return <Newspaper className="h-5 w-5" />;
      case 'event_published':
      case 'event_update':
      case 'event_reminder':
        return <Calendar className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 
            className="font-display font-bold text-2xl"
            style={{ color: 'var(--brand-secondary)' }}
          >
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Toutes lues'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            Tout lire
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Bell className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-display font-semibold text-lg">Aucune notification</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Vous serez notifié des nouvelles actualités et événements
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const isUnread = notification.notification_recipients.some(r => r.read_at === null);
            
            return (
              <Card
                key={notification.id}
                className={cn(
                  "p-4 cursor-pointer transition-all hover:shadow-md",
                  isUnread && "border-l-4"
                )}
                style={{
                  borderLeftColor: isUnread ? 'var(--brand-accent)' : undefined,
                  backgroundColor: isUnread ? 'hsl(var(--accent) / 0.05)' : undefined,
                }}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex gap-3">
                  <div 
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ 
                      backgroundColor: 'var(--brand-accent)',
                      color: 'white'
                    }}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={cn(
                        "font-medium text-sm line-clamp-1",
                        isUnread && "font-semibold"
                      )}>
                        {notification.title}
                      </h3>
                      {isUnread && (
                        <div 
                          className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5"
                          style={{ backgroundColor: 'var(--brand-accent)' }}
                        />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                      {notification.body}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { 
                        addSuffix: true,
                        locale: fr 
                      })}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
