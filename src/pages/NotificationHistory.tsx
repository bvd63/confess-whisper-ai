import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Heart, MessageSquare, Star, ArrowUp, MessageCircle, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getNicknameCached } from "@/lib/nicknameCache";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { logError } from "@/lib/logger";

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'badge_earned' | 'deep_insight' | 'streak_milestone' | 'highlight' | 'boost_expired';
  confession_id: string;
  comment_content?: string;
  is_read: boolean;
  created_at: string;
  triggered_by?: string;
  triggered_by_nickname?: string;
}

const NotificationHistory = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useCurrentUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
      
      const channel = supabase
        .channel('notification-history-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            loadNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  const loadNotifications = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const visibleNotifications = (data || []).filter((notif: any) => {
        const deletedFor = notif.deleted_for || [];
        return !deletedFor.includes(user.id);
      });

      const notificationsWithNicknames = await Promise.all(
        visibleNotifications.map(async (notification) => {
          if (notification.triggered_by) {
            const nickname = await getNicknameCached(notification.triggered_by);
            return {
              ...notification,
              triggered_by_nickname: nickname || null,
            };
          }
          return notification;
        })
      );

      setNotifications(notificationsWithNicknames);
    } catch (error) {
      logError('Error loading notifications', error as Error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.functions.invoke('manage-notifications', {
        body: { action: 'mark_read', notificationId },
      });
      if (error) throw error;
      await loadNotifications();
    } catch (error) {
      logError('Error marking notification as read', error as Error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase.functions.invoke('manage-notifications', {
        body: { action: 'mark_all_read' },
      });
      if (error) throw error;
      toast.success('All notifications marked as read');
      await loadNotifications();
    } catch (error) {
      logError('Error marking all as read', error as Error);
    }
  };

  const timeAgo = (date: string) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - notifDate.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const getNotificationConfig = (type: string) => {
    switch (type) {
      case 'like':
        return {
          icon: Heart,
          iconBg: 'bg-red-500/20',
          iconColor: 'text-red-500',
          emoji: '❤️',
          getText: (name: string) => `Someone reacted ${String.fromCodePoint(0x2764, 0xFE0F)} to your confession.`
        };
      case 'highlight':
        return {
          icon: Star,
          iconBg: 'bg-yellow-500/20',
          iconColor: 'text-yellow-500',
          emoji: '⭐',
          getText: () => 'Your comment was highlighted.'
        };
      case 'boost_expired':
        return {
          icon: ArrowUp,
          iconBg: 'bg-primary/20',
          iconColor: 'text-primary',
          emoji: '↑',
          getText: () => 'Your boost expired.'
        };
      case 'comment':
        return {
          icon: MessageCircle,
          iconBg: 'bg-muted/40',
          iconColor: 'text-muted-foreground',
          emoji: '💬',
          getText: () => 'New comment received.'
        };
      default:
        return {
          icon: Bell,
          iconBg: 'bg-primary/20',
          iconColor: 'text-primary',
          emoji: '🔔',
          getText: () => 'New notification'
        };
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto pb-24">
        {/* Premium Header */}
        <div className="sticky top-0 z-10 glass-strong border-b border-border/30">
          <div className="header-gradient">
            <div className="flex items-center justify-between px-4 py-5">
              <h1 className="text-2xl font-bold">Notifications</h1>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-sm text-primary hover:bg-primary/10"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="px-4 py-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-semibold">No notifications</p>
              <p className="text-sm">You're all caught up! ✨</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const config = getNotificationConfig(notification.type);
              const IconComponent = config.icon;
              
              return (
                <button
                  key={notification.id}
                  onClick={() => {
                    markAsRead(notification.id);
                    navigate('/');
                  }}
                  className={`
                    w-full glass-card p-4 flex items-center gap-4 transition-all duration-200 
                    hover:scale-[1.01] hover:shadow-lg
                    ${!notification.is_read ? 'border-primary/30 bg-gradient-to-r from-primary/10 via-transparent to-neon-blue/10' : ''}
                  `}
                >
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <IconComponent className={`w-6 h-6 ${config.iconColor}`} fill="currentColor" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {config.getText(notification.triggered_by_nickname || 'Someone')}
                    </p>
                  </div>

                  {/* Time */}
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {timeAgo(notification.created_at)}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default NotificationHistory;