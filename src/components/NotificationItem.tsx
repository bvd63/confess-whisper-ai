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

export const NotificationItem = ({ notification, onMarkAsRead, onDelete }: NotificationItemProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  
  const translations: any = {
    en: {
      someone: 'Someone',
      'liked your confession': 'liked your confession',
      'commented on your confession': 'commented on your confession',
      'started following you': 'started following you',
      'You earned a new badge!': 'You earned a new badge!',
      'Your deep insight is ready': 'Your deep insight is ready',
      'New streak milestone!': 'New streak milestone!',
      'New notification': 'New notification'
    },
    es: {
      someone: 'Alguien',
      'liked your confession': 'le gustó tu confesión',
      'commented on your confession': 'comentó tu confesión',
      'started following you': 'comenzó a seguirte',
      'You earned a new badge!': '¡Ganaste una nueva insignia!',
      'Your deep insight is ready': 'Tu perspectiva profunda está lista',
      'New streak milestone!': '¡Nuevo hito de racha!',
      'New notification': 'Nueva notificación'
    },
    de: {
      someone: 'Jemand',
      'liked your confession': 'hat dein Geständnis gemocht',
      'commented on your confession': 'hat dein Geständnis kommentiert',
      'started following you': 'folgt dir jetzt',
      'You earned a new badge!': 'Du hast ein neues Abzeichen verdient!',
      'Your deep insight is ready': 'Deine tiefe Einsicht ist bereit',
      'New streak milestone!': 'Neuer Streak-Meilenstein!',
      'New notification': 'Neue Benachrichtigung'
    }
  };
  
  const t = (key: string) => translations[language][key] || key;

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
            {t('liked your confession')}
          </>
        );
      case 'comment':
        return (
          <>
            {showNickname && (
              <UserDisplayName userId={notification.triggered_by} clickable={false} className="inline" showBadges={true} />
            )}
            {' '}
            {t('commented on your confession')}
          </>
        );
      case 'follow':
        return (
          <>
            {showNickname && (
              <UserDisplayName userId={notification.triggered_by} clickable={false} className="inline" showBadges={true} />
            )}
            {' '}
            {t('started following you')}
          </>
        );
      case 'badge_earned':
        return t('You earned a new badge!');
      case 'deep_insight':
        return t('Your deep insight is ready');
      case 'streak_milestone':
        return t('New streak milestone!');
      default:
        return t('New notification');
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
      className={`notification-card flex items-center gap-4 p-4 cursor-pointer group ${
        !notification.is_read ? 'notification-card-unread' : ''
      }`}
    >
      {/* Icon Container */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-background/50 dark:bg-background/30 flex items-center justify-center border border-border/50">
        {getIcon()}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-relaxed">
          <span className={!notification.is_read ? 'font-medium' : 'font-normal'}>
            {getMessage()}
          </span>
        </p>
        {notification.comment_content && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {notification.comment_content}
          </p>
        )}
      </div>

      {/* Timestamp - Right aligned */}
      <div className="flex-shrink-0 flex items-center gap-2">
        <p className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: false })}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 rounded-full"
          onClick={handleDelete}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};