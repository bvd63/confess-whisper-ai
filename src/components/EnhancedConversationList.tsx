import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConversationActions } from '@/components/ConversationActions';
import { formatDistanceToNow } from 'date-fns';
import { VolumeX } from 'lucide-react';

interface Conversation {
  id: string;
  participant_id: string;
  participant_nickname: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  is_muted: boolean;
}

interface EnhancedConversationListProps {
  conversations: Conversation[];
  userId: string;
  onDelete: (conversationId: string) => void;
}

export const EnhancedConversationList = ({
  conversations,
  userId,
  onDelete,
}: EnhancedConversationListProps) => {
  const navigate = useNavigate();
  const [mutedConversations, setMutedConversations] = useState<Set<string>>(new Set());

  const handleMuteToggle = (conversationId: string) => {
    setMutedConversations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId);
      } else {
        newSet.add(conversationId);
      }
      return newSet;
    });
  };

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No conversations yet</p>
        <p className="text-sm mt-2">Start a conversation by messaging someone!</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {conversations.map((conversation) => {
        const isMuted = mutedConversations.has(conversation.id) || conversation.is_muted;

        return (
          <div
            key={conversation.id}
            className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors group"
          >
            <button
              onClick={() => navigate(`/messages?conversation=${conversation.id}`)}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <Avatar className="h-12 w-12 flex-shrink-0">
                <AvatarFallback>
                  {conversation.participant_nickname?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-medium truncate ${conversation.unread_count > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {conversation.participant_nickname || 'Anonymous'}
                  </span>
                  {isMuted && <VolumeX className="h-3 w-3 text-muted-foreground" />}
                </div>
                
                <p className={`text-sm truncate ${conversation.unread_count > 0 ? 'font-medium' : 'text-muted-foreground'}`}>
                  {conversation.last_message}
                </p>

                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                </p>
              </div>
            </button>

            <div className="flex items-center gap-2 flex-shrink-0">
              {conversation.unread_count > 0 && (
                <Badge variant="default" className="h-6 min-w-[24px] flex items-center justify-center">
                  {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                </Badge>
              )}

              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <ConversationActions
                  conversationId={conversation.id}
                  userId={userId}
                  isMuted={isMuted}
                  onMuteToggle={() => handleMuteToggle(conversation.id)}
                  onDelete={() => onDelete(conversation.id)}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};