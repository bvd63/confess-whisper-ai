import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Heart, MessageSquare, UserPlus, MessageCircle, ArrowLeft, Check, Trash2, Filter, Award, Lightbulb, Flame, ChevronDown, ChevronRight, BarChart3 } from "lucide-react";
import { analytics } from '@/lib/analytics';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
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
import AppLayout from "@/components/AppLayout";
import { logError } from "@/lib/logger";

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'badge_earned' | 'deep_insight' | 'streak_milestone';
  confession_id: string;
  comment_content?: string;
  is_read: boolean;
  created_at: string;
  triggered_by?: string;
  triggered_by_nickname?: string;
}

interface GroupedNotification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'badge_earned' | 'deep_insight' | 'streak_milestone';
  confession_id?: string;
  notifications: Notification[];
  count: number;
  hasUnread: boolean;
  latestDate: string;
  isExpanded?: boolean;
}

const NotificationHistory = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useCurrentUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [groupedNotifications, setGroupedNotifications] = useState<GroupedNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
      
      // Set up real-time subscription
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

  useEffect(() => {
    // Apply filter
    const filtered = filter === 'unread' 
      ? notifications.filter(n => !n.is_read)
      : notifications;
    
    setFilteredNotifications(filtered);
    
    // Group notifications
    const grouped = groupNotifications(filtered);
    setGroupedNotifications(grouped);
  }, [filter, notifications]);

  const groupNotifications = (notifs: Notification[]): GroupedNotification[] => {
    const groups: Map<string, GroupedNotification> = new Map();
    
    notifs.forEach(notif => {
      // Groupable types: like, comment, follow
      // Non-groupable: message, badge_earned, deep_insight, streak_milestone
      const isGroupable = ['like', 'comment', 'follow'].includes(notif.type);
      
      if (!isGroupable) {
        // Create individual group for non-groupable notifications
        groups.set(notif.id, {
          id: notif.id,
          type: notif.type,
          notifications: [notif],
          count: 1,
          hasUnread: !notif.is_read,
          latestDate: notif.created_at,
        });
        return;
      }
      
      // Create group key based on type and related entity
      let groupKey = '';
      if (notif.type === 'like' || notif.type === 'comment') {
        groupKey = `${notif.type}-${notif.confession_id}`;
      } else if (notif.type === 'follow') {
        // Group all follows together
        groupKey = 'follow-all';
      }
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          id: groupKey,
          type: notif.type,
          confession_id: notif.confession_id,
          notifications: [],
          count: 0,
          hasUnread: false,
          latestDate: notif.created_at,
        });
      }
      
      const group = groups.get(groupKey)!;
      group.notifications.push(notif);
      group.count++;
      if (!notif.is_read) group.hasUnread = true;
      // Update to latest date
      if (new Date(notif.created_at) > new Date(group.latestDate)) {
        group.latestDate = notif.created_at;
      }
    });
    
    // Convert to array and sort by latest date
    return Array.from(groups.values()).sort((a, b) => 
      new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
    );
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const loadNotifications = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out soft-deleted notifications
      const visibleNotifications = (data || []).filter((notif: any) => {
        const deletedFor = notif.deleted_for || [];
        return !deletedFor.includes(user.id);
      });

      // Fetch nicknames for users who triggered notifications
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
      logError('Error marking notification as read', error as Error);
      toast.error('Failed to mark as read');
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
      toast.error('Failed to mark all as read');
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
      toast.success('Notification deleted');
      await loadNotifications();
    } catch (error) {
      logError('Error deleting notification', error as Error);
      toast.error('Failed to delete notification');
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
      toast.success('All notifications deleted');
      await loadNotifications();
    } catch (error) {
      logError('Error deleting all notifications', error as Error);
      toast.error('Failed to delete all');
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
    
    if (notification.type === 'message' && notification.triggered_by) {
      navigate(`/messages?user=${notification.triggered_by}`);
    } else if (notification.type === 'follow' && notification.triggered_by) {
      navigate(`/profile/${notification.triggered_by}`);
    } else {
      navigate('/');
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-5 h-5 text-primary" fill="currentColor" />;
      case 'comment':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'follow':
        return <UserPlus className="w-5 h-5 text-purple-500" />;
      case 'message':
        return <MessageCircle className="w-5 h-5 text-green-500" />;
      case 'badge_earned':
        return <Award className="w-5 h-5 text-yellow-500" />;
      case 'deep_insight':
        return <Lightbulb className="w-5 h-5 text-orange-500" />;
      case 'streak_milestone':
        return <Flame className="w-5 h-5 text-red-500" />;
      default:
        return <Bell className="w-5 h-5 text-primary" />;
    }
  };

  const getNotificationText = (notification: Notification) => {
    const name = notification.triggered_by_nickname || 'Someone';
    switch (notification.type) {
      case 'like':
        return `${name} liked your confession`;
      case 'comment':
        return `${name} commented on your confession`;
      case 'follow':
        return `${name} started following you`;
      case 'message':
        return `${name} sent you a message`;
      case 'badge_earned':
        return `You earned a new badge!`;
      case 'deep_insight':
        return `New AI insight on your confession`;
      case 'streak_milestone':
        return `You reached a streak milestone!`;
      default:
        return 'New notification';
    }
  };

  const getGroupedNotificationText = (group: GroupedNotification) => {
    if (group.count === 1) {
      return getNotificationText(group.notifications[0]);
    }
    
    const names = group.notifications
      .slice(0, 3)
      .map(n => n.triggered_by_nickname || 'Someone');
    
    const nameText = group.count <= 3
      ? names.join(', ')
      : `${names.slice(0, 2).join(', ')} and ${group.count - 2} other${group.count > 3 ? 's' : ''}`;
    
    switch (group.type) {
      case 'like':
        return `${nameText} liked your confession`;
      case 'comment':
        return `${nameText} commented on your confession`;
      case 'follow':
        return `${nameText} started following you`;
      default:
        return getNotificationText(group.notifications[0]);
    }
  };

  const markGroupAsRead = async (group: GroupedNotification) => {
    const unreadIds = group.notifications
      .filter(n => !n.is_read)
      .map(n => n.id);
    
    if (unreadIds.length === 0) return;
    
    try {
      await Promise.all(unreadIds.map(id => markAsRead(id)));
    } catch (error) {
      logError('Error marking group as read', error as Error);
    }
  };

  const deleteGroup = async (group: GroupedNotification) => {
    try {
      await Promise.all(group.notifications.map(n => deleteNotification(n.id)));
    } catch (error) {
      logError('Error deleting group', error as Error);
    }
  };

  const handleGroupClick = async (group: GroupedNotification) => {
    // Track group expansion for multi-notification groups
    if (group.count > 1) {
      analytics.track('notification_group_expanded', {
        notification_type: group.type,
        count: group.count,
      });
      
      // For grouped items, just toggle expansion
      toggleGroup(group.id);
    } else {
      await handleNotificationClick(group.notifications[0]);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Notification History</h1>
              <p className="text-sm text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/notifications/analytics')}
              className="gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
              >
                <Check className="w-4 h-4 mr-2" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')} className="mb-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread ({unreadCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Notifications List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">No notifications</p>
                <p className="text-sm">
                  {filter === 'unread' ? 'All notifications have been read' : 'You have no notifications yet'}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {groupedNotifications.map((group) => (
                  <div key={group.id}>
                    {/* Group Header */}
                    <div
                      className={`flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors group ${
                        group.hasUnread ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {getNotificationIcon(group.type)}
                      </div>
                      
                      <button
                        onClick={() => handleGroupClick(group)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {group.count > 1 && (
                            <div className="flex-shrink-0">
                              {expandedGroups.has(group.id) ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          )}
                          <p className="text-sm font-medium truncate">
                            {getGroupedNotificationText(group)}
                          </p>
                          {group.hasUnread && (
                            <Badge variant="secondary" className="text-xs bg-primary text-primary-foreground flex-shrink-0">
                              New
                            </Badge>
                          )}
                          {group.count > 1 && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {group.count}
                            </Badge>
                          )}
                        </div>
                        {group.count === 1 && group.notifications[0].comment_content && (
                          <p className="text-sm text-muted-foreground truncate mb-1">
                            "{group.notifications[0].comment_content}"
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {timeAgo(group.latestDate)}
                        </p>
                      </button>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {group.hasUnread && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              markGroupAsRead(group);
                            }}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (group.count === 1) {
                              setNotificationToDelete(group.notifications[0].id);
                              setDeleteDialogOpen(true);
                            } else {
                              deleteGroup(group);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Individual Notifications */}
                    {group.count > 1 && expandedGroups.has(group.id) && (
                      <div className="bg-muted/30">
                        {group.notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`flex items-center gap-4 p-4 pl-16 hover:bg-muted/50 transition-colors group ${
                              !notification.is_read ? 'bg-primary/5' : ''
                            }`}
                          >
                            <button
                              onClick={() => handleNotificationClick(notification)}
                              className="flex-1 text-left min-w-0"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-medium truncate">
                                  {getNotificationText(notification)}
                                </p>
                                {!notification.is_read && (
                                  <Badge variant="secondary" className="text-xs bg-primary text-primary-foreground flex-shrink-0">
                                    New
                                  </Badge>
                                )}
                              </div>
                              {notification.comment_content && (
                                <p className="text-sm text-muted-foreground truncate mb-1">
                                  "{notification.comment_content}"
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {timeAgo(notification.created_at)}
                              </p>
                            </button>

                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!notification.is_read && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNotificationToDelete(notification.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete All Button */}
        {notifications.length > 0 && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteAllDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete All Notifications
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialogs */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this notification? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => notificationToDelete && deleteNotification(notificationToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Notifications</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your notifications. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteAllNotifications}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default NotificationHistory;
