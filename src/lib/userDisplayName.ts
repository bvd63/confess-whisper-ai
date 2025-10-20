/**
 * Get display name for a user based on their privacy settings
 * Uses snapshot values from the confession if available
 */
export const getUserDisplayName = (
  snapshotNickname: string | null | undefined,
  snapshotVisibility: string | null | undefined,
  anonymousLabel: string
): string => {
  // If no snapshot visibility or it's ANON, show anonymous
  if (!snapshotVisibility || snapshotVisibility === 'ANON_ON_POSTS') {
    return anonymousLabel;
  }

  // If PUBLIC and nickname exists, show nickname
  if (snapshotVisibility === 'PUBLIC' && snapshotNickname) {
    return snapshotNickname;
  }

  // Default to anonymous
  return anonymousLabel;
};
