import { useMemo } from 'react';

export function useEditDeleteWindow(createdAt: string) {
  const windows = useMemo(() => {
    const now = new Date().getTime();
    const created = new Date(createdAt).getTime();
    const elapsed = Math.floor((now - created) / 1000); // seconds

    const canEdit = elapsed < 60; // 60 seconds
    const canDelete = elapsed < 300; // 5 minutes
    
    const editTimeLeft = Math.max(0, 60 - elapsed);
    const deleteTimeLeft = Math.max(0, 300 - elapsed);

    return {
      canEdit,
      canDelete,
      editTimeLeft,
      deleteTimeLeft,
      elapsed
    };
  }, [createdAt]);

  return windows;
}
