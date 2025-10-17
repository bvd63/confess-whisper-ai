import { Heart, MessageCircle, UserPlus, Sparkles, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface NotificationItemProps {
  notification: {
    id: string;
    type: 'like' | 'comment' | 'follow' | 'message' | 'badge_earned' | 'deep_insight' | 'streak_milestone';
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
    const nickname = notification.triggered_by_nickname || t('someone');
    
    switch (notification.type) {
      case 'like':
        return `${nickname} ${t('liked your confession')}`;
      case 'comment':
        return `${nickname} ${t('commented on your confession')}`;
      case 'follow':
        return `${nickname} ${t('started following you')}`;
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