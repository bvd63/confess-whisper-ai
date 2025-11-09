import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreVertical, VolumeX, Volume2, Ban, Trash } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logError } from '@/lib/logger';

interface ConversationActionsProps {
  conversationId: string;
  userId: string;
  isMuted: boolean;
  onMuteToggle: () => void;
  onDelete: () => void;
}

export const ConversationActions = ({
  conversationId,
  userId,
  isMuted,
  onMuteToggle,
  onDelete,
}: ConversationActionsProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  const handleMuteToggle = async () => {
    try {
      const { error } = await supabase
        .from('conversation_participants')
        .update({ is_muted: !isMuted })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (error) throw error;

      onMuteToggle();
      toast({
        title: isMuted ? 'Unmuted' : 'Muted',
        description: isMuted ? 'You will receive notifications' : 'Notifications disabled',
      });
    } catch (error) {
      logError('Error toggling mute', error instanceof Error ? error : undefined);
      toast({
        title: 'Error',
        description: 'Failed to update mute status',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    try {
      const { data, error } = await supabase
        .rpc('delete_conversation', {
          _conversation_id: conversationId,
          _user_id: userId,
        });

      if (error) throw error;

      if (data) {
        onDelete();
        toast({
          title: 'Conversation deleted',
          description: 'This conversation has been removed',
        });
      }
    } catch (error) {
      logError('Error deleting conversation', error instanceof Error ? error : undefined);
      toast({
        title: 'Error',
        description: 'Failed to delete conversation',
        variant: 'destructive',
      });
    }
    
    setShowDeleteDialog(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleMuteToggle}>
            {isMuted ? (
              <>
                <Volume2 className="h-4 w-4 mr-2" />
                Unmute
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4 mr-2" />
                Mute
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash className="h-4 w-4 mr-2" />
            Delete Conversation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All messages will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};