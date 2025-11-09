export type Author = { id: string; username?: string | null; avatarUrl?: string | null };

export function maskUsernameIfAnonymous(isAnonymous: boolean, author?: Author | null) {
  if (isAnonymous) return { displayName: "Anonymous", avatarUrl: null, isMasked: true };
  return { displayName: author?.username ?? "Unknown", avatarUrl: author?.avatarUrl ?? null, isMasked: false };
}
