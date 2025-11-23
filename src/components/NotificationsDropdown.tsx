import { useState, useEffect } from "react";
import { Bell, Heart, MessageSquare, Check, Trash2, History, BarChart3 } from "lucide-react";
import { analytics } from '@/lib/analytics';
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { getNicknameCached } from "@/lib/nicknameCache";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { logError } from "@/lib/logger";

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'deep_insight' | 'follow' | 'badge_earned' | 'streak_milestone';
  confession_id: string;
  comment_content?: string;
  is_read: boolean;
  created_at: string;
  triggered_by?: string;
  triggered_by_nickname?: string;
  deleted_for?: string[] | null;
}

const NotificationsDropdown = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();

    // Set up real-time subscription
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from<Notification>('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Filter out soft-deleted notifications
      const visibleNotifications = (data || []).filter((notif) => {
        const deletedFor = notif.deleted_for || [];
        return !deletedFor.includes(user.id);
      });

      // Fetch nicknames (via secure RPC) for users who triggered notifications
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
      setUnreadCount(notificationsWithNicknames?.filter((n) => !n.is_read).length || 0);
    } catch (error) {
      logError('Error loading notifications', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Track read event
      analytics.track('notification_read', {
        notificationId,
      });
      
      const { error } = await supabase.functions.invoke('manage-notifications', {
        body: { action: 'mark_read', notificationId },
      });

      if (error) throw error;
      await loadNotifications();
    } catch (error) {
      logError('Error marking notification as read', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase.functions.invoke('manage-notifications', {
        body: { action: 'mark_all_read' },
      });

      if (error) throw error;
      toast.success(t.notifications_marked_read || 'All marked as read');
      await loadNotifications();
    } catch (error) {
      logError('Error marking all as read', error);
      toast.error(t.error_generic);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      // Track delete event
      analytics.track('notification_dismissed', {
        notificationId,
      });
      
      const { error } = await supabase.functions.invoke('manage-notifications', {
        body: { action: 'delete', notificationId },
      });

      if (error) throw error;
      toast.success(t.notifications_deleted || 'Notification deleted');
      await loadNotifications();
    } catch (error) {
      logError('Error deleting notification', error);
      toast.error(t.error_generic);
    } finally {
      setDeleteDialogOpen(false);
      setNotificationToDelete(null);
    }
  };

  const deleteAllNotifications = async () => {
    try {
      const { error } = await supabase.functions.invoke('manage-notifications', {
        body: { action: 'delete_all' },
      });

      if (error) throw error;
      toast.success(t.notifications_all_deleted || 'All notifications deleted');
      await loadNotifications();
    } catch (error) {
      logError('Error deleting all notifications', error);
      toast.error(t.error_generic);
    } finally {
      setDeleteAllDialogOpen(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Track click event
    analytics.track('notification_clicked', {
      notification_type: notification.type,
      notificationId: notification.id,
    });
    
    await markAsRead(notification.id);
    
    // For message notifications, navigate to specific conversation via query param
    if (notification.type === 'comment' && notification.triggered_by) {
      navigate(`/messages?user=${notification.triggered_by}`);
      setIsOpen(false);
      return;
    }
    
    setIsOpen(false);
    // Navigate to the confession (could be implemented to scroll to specific confession)
    navigate('/');
  };

  const timeAgo = (date: string) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - notifDate.getTime()) / 60000);
    
    if (diffInMinutes < 1) return t.time_now;
    if (diffInMinutes < 60) return `${diffInMinutes}${t.time_minutes}`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}${t.time_hours}`;
    return `${Math.floor(diffInMinutes / 1440)}${t.time_days}`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-primary" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-primary" />;
      case 'follow':
        return <Bell className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case 'like':
        return t.notification_like;
      case 'comment':
        // Check if it's a message notification (has comment_content and triggered_by)
        if (notification.comment_content && notification.triggered_by) {
          const preview = notification.comment_content.substring(0, 40);
          return `${t.notification_message_prefix} ${preview}${notification.comment_content.length > 40 ? '...' : ''}`;
        }
        return t.notification_comment;
      case 'follow':
        return t.notification_followed;
      case 'badge_earned':
        return t.notification_badge_earned;
      case 'streak_milestone':
        return t.notification_streak_milestone;
      default:
        return '';
    }
  };

  return (
    <>
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-9 sm:w-9">
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 bg-primary text-primary-foreground text-[9px] sm:text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80 p-0" align="end">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-border">
          <h3 className="text-sm sm:text-base font-semibold">{t.notifications_title}</h3>
          <div className="flex gap-0.5 sm:gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-7 sm:h-8 text-[10px] sm:text-xs px-1.5 sm:px-2"
              >
                <Check className="w-3 h-3 mr-0.5 sm:mr-1" />
                <span className="hidden xs:inline">{t.notifications_mark_all_read}</span>
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteAllDialogOpen(true)}
                className="h-7 sm:h-8 text-[10px] sm:text-xs px-1.5 sm:px-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* View All and Analytics Buttons */}
        <div className="px-3 sm:px-4 py-2 border-b border-border bg-muted/30 space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs"
            onClick={() => {
              navigate('/notifications');
              setIsOpen(false);
            }}
          >
            <History className="w-3 h-3 mr-2" />
            View All Notifications
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs"
            onClick={() => {
              navigate('/notifications/analytics');
              setIsOpen(false);
            }}
          >
            <BarChart3 className="w-3 h-3 mr-2" />
            View Analytics
          </Button>
        </div>

        <ScrollArea className="h-[320px] sm:h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 sm:py-12 text-muted-foreground">
              <Bell className="w-10 h-10 sm:w-12 sm:h-12 mb-2 opacity-50" />
              <p className="text-xs sm:text-sm">{t.notifications_none}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-center group ${
                    !notification.is_read ? 'bg-primary/5' : ''
                  }`}
                >
                  <button
                    onClick={() => handleNotificationClick(notification)}
                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="mt-0.5 sm:mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                          <span className="text-xs sm:text-sm font-medium truncate">
                            @{notification.triggered_by_nickname || t.anonymous_user}
                          </span>
                          <span className="text-xs sm:text-sm text-muted-foreground truncate">
                            {getNotificationText(notification)}
                          </span>
                          {!notification.is_read && (
                            <Badge variant="secondary" className="text-[9px] sm:text-xs bg-primary text-primary-foreground px-1 sm:px-1.5 py-0 flex-shrink-0">
                              {t.notification_new}
                            </Badge>
                          )}
                        </div>
                        {notification.comment_content && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                            "{notification.comment_content}"
                          </p>
                        )}
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                          {timeAgo(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mr-1.5 sm:mr-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setNotificationToDelete(notification.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.notifications_delete}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.notifications_delete_confirm}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.common_back}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => notificationToDelete && deleteNotification(notificationToDelete)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t.delete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.notifications_delete_all}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.notifications_delete_all_confirm || 'This will delete all your notifications. This action cannot be undone.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.common_back}</AlertDialogCancel>
          <AlertDialogAction
            onClick={deleteAllNotifications}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t.delete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
};

export default NotificationsDropdown;