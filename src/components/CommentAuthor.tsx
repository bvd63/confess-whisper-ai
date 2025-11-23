import { UserDisplayName } from "./UserDisplayName";

interface CommentAuthorProps {
  userId: string;
  showBadge?: boolean;
}

export const CommentAuthor = ({ userId, showBadge = true }: CommentAuthorProps) => {
  return (
    <UserDisplayName 
      userId={userId}
      showBadges={showBadge}
      clickable={false}
      maxLength={24}
    />
  );
};
