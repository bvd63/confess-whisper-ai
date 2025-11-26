const CONFESSION_BASE_COLUMNS = [
  'id',
  'content',
  'category',
  'user_id',
  'comments_count',
  'likes_count',
  'ai_response',
  'ai_deep_insight',
  'created_at',
  'image_url',
  'image_blurred',
  'author_nickname_snapshot',
  'author_visibility_snapshot',
  'author_display_name_snapshot',
  'emotional_tone',
  'is_anonymous',
] as const;

const MESSAGE_BASE_COLUMNS = [
  'id',
  'conversation_id',
  'content',
  'sender_id',
  'created_at',
  'updated_at',
  'read_at',
  'is_read',
  'edited_at',
  'sent_at',
  'delivered_at',
  'seen_at',
  'reactions',
  'client_message_id',
  'deleted_for_sender',
  'deleted_for_recipient',
] as const;

const joinColumns = (columns: readonly string[]) => columns.join(', ');

export const CONFESSION_FEED_COLUMNS = joinColumns(CONFESSION_BASE_COLUMNS);
export const CONFESSION_LOCATION_COLUMNS = joinColumns([
  ...CONFESSION_BASE_COLUMNS,
  'location_enabled',
  'location_lat',
  'location_lng',
]);

export const buildConfessionColumns = (extras: string[] = []) =>
  joinColumns([...new Set([...CONFESSION_BASE_COLUMNS, ...extras])]);

export const MESSAGE_THREAD_COLUMNS = joinColumns(MESSAGE_BASE_COLUMNS);
export const MESSAGE_MIN_COLUMNS = joinColumns([
  'id',
  'content',
  'sender_id',
  'conversation_id',
  'created_at',
]);
