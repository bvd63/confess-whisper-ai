import { Heart, MessageCircle, UserPlus, Sparkles, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserDisplayName } from './UserDisplayName';

interface NotificationItemProps {
  notification: {
    id: string;
    type: 'like' | 'comment' | 'follow' | 'message' | 'badge_earned' | 'deep_insight' | 'streak_milestone';
    triggered_by: string | null;
    triggered_by_nickname: string | null;
    confession_id: string | null;
    comment_content: string | null;
    created_at: string;
    is_read: boolean;
  };
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const notificationTranslations = {
  en: {
    someone: 'Someone',
    likedConfession: 'liked your confession',
    commentedConfession: 'commented on your confession',
    startedFollowing: 'started following you',
    badgeEarned: 'You earned a new badge!',
    deepInsightReady: 'Your deep insight is ready',
    streakMilestone: 'New streak milestone!',
    defaultNotification: 'New notification',
  },
  es: {
    someone: 'Alguien',
    likedConfession: 'le gustó tu confesión',
    commentedConfession: 'comentó tu confesión',
    startedFollowing: 'comenzó a seguirte',
    badgeEarned: '¡Ganaste una nueva insignia!',
    deepInsightReady: 'Tu perspectiva profunda está lista',
    streakMilestone: '¡Nuevo hito de racha!',
    defaultNotification: 'Nueva notificación',
  },
  de: {
    someone: 'Jemand',
    likedConfession: 'hat dein Geständnis gemocht',
    commentedConfession: 'hat dein Geständnis kommentiert',
    startedFollowing: 'folgt dir jetzt',
    badgeEarned: 'Du hast ein neues Abzeichen verdient!',
    deepInsightReady: 'Deine tiefe Einsicht ist bereit',
    streakMilestone: 'Neuer Streak-Meilenstein!',
    defaultNotification: 'Neue Benachrichtigung',
  },
};

type NotificationTranslationKey = keyof typeof notificationTranslations.en;

export const NotificationItem = ({ notification, onMarkAsRead, onDelete }: NotificationItemProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const t = (key: NotificationTranslationKey) => {
    const translation = notificationTranslations[language][key];
    return translation ?? notificationTranslations.en[key];
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'deep_insight':
      case 'badge_earned':
      case 'streak_milestone':
        return <Sparkles className="h-4 w-4 text-yellow-500" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getMessage = () => {
    const showNickname = notification.triggered_by && 
      ['like', 'comment', 'follow'].includes(notification.type);
    
    switch (notification.type) {
      case 'like':
        return (
          <>
            {showNickname && (
              <UserDisplayName userId={notification.triggered_by} clickable={false} className="inline" showBadges={true} />
            )}
            {' '}
            {t('likedConfession')}
          </>
        );
      case 'comment':
        return (
          <>
            {showNickname && (
              <UserDisplayName userId={notification.triggered_by} clickable={false} className="inline" showBadges={true} />
            )}
            {' '}
            {t('commentedConfession')}
          </>
        );
      case 'follow':
        return (
          <>
            {showNickname && (
              <UserDisplayName userId={notification.triggered_by} clickable={false} className="inline" showBadges={true} />
            )}
            {' '}
            {t('startedFollowing')}
          </>
        );
      case 'badge_earned':
        return t('badgeEarned');
      case 'deep_insight':
        return t('deepInsightReady');
      case 'streak_milestone':
        return t('streakMilestone');
      default:
        return t('defaultNotification');
    }
  };

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }

    if (notification.confession_id) {
      navigate(`/?confession=${notification.confession_id}`);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  return (
    <div
      onClick={handleClick}
      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors group ${
        !notification.is_read ? 'bg-primary/5' : 'hover:bg-muted/50'
      }`}
    >
      <div className="flex-shrink-0 mt-1">{getIcon()}</div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className={!notification.is_read ? 'font-medium' : ''}>
            {getMessage()}
          </span>
        </p>
        {notification.comment_content && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {notification.comment_content}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={handleDelete}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};