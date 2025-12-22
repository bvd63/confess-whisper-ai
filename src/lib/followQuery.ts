import type { QueryClient } from "@tanstack/react-query";

// React Query keys for follow system:
// - Profile counts (followers/following) for a profileUserId:
//   followCountsKey(profileUserId) => ["follow-counts", profileUserId]
// - Followers list for a profileUserId:
//   followersListKey(profileUserId) => ["followers-list", profileUserId]
// - Following list for a profileUserId:
//   followingListKey(profileUserId) => ["following-list", profileUserId]
// - Relationship (current user ↔ profile user):
//   followRelationshipKey(currentUserId, profileUserId) => ["follow-rel", currentUserId, profileUserId]

export type FollowCounts = {
  followersCount: number;
  followingCount: number;
};

export type MinimalUserProfile = {
  user_id: string;
  nickname: string | null;
  avatar_url: string | null;
};

export const followCountsKey = (profileUserId: string) => ["follow-counts", profileUserId] as const;
export const followersListKey = (profileUserId: string) => ["followers-list", profileUserId] as const;
export const followingListKey = (profileUserId: string) => ["following-list", profileUserId] as const;
export const followRelationshipKey = (currentUserId: string, profileUserId: string) =>
  ["follow-rel", currentUserId, profileUserId] as const;

type FollowRelationship = {
  isFollowing: boolean;
  isFollowedBy: boolean;
};

const upsertToFront = (list: MinimalUserProfile[], item: MinimalUserProfile) => {
  const next = list.filter((u) => u.user_id !== item.user_id);
  next.unshift(item);
  return next;
};

export type OptimisticFollowContext = {
  prevTargetCounts?: FollowCounts;
  prevCurrentCounts?: FollowCounts;
  prevTargetFollowers?: MinimalUserProfile[];
  prevCurrentFollowing?: MinimalUserProfile[];
  prevRelationship?: FollowRelationship;

  createdTargetCounts?: boolean;
  createdCurrentCounts?: boolean;
  createdRelationship?: boolean;
};

export const applyOptimisticFollow = (
  queryClient: QueryClient,
  args: { currentUserId: string; targetUserId: string }
): OptimisticFollowContext => {
  const { currentUserId, targetUserId } = args;

  const prevTargetCounts = queryClient.getQueryData<FollowCounts>(followCountsKey(targetUserId));
  const prevCurrentCounts = queryClient.getQueryData<FollowCounts>(followCountsKey(currentUserId));
  const prevTargetFollowers = queryClient.getQueryData<MinimalUserProfile[]>(followersListKey(targetUserId));
  const prevCurrentFollowing = queryClient.getQueryData<MinimalUserProfile[]>(followingListKey(currentUserId));
  const prevRelationship = queryClient.getQueryData<FollowRelationship>(followRelationshipKey(currentUserId, targetUserId));

  const nextTargetCounts = {
    ...(prevTargetCounts ?? { followersCount: 0, followingCount: 0 }),
    followersCount: (prevTargetCounts?.followersCount ?? 0) + 1,
  };
  queryClient.setQueryData<FollowCounts>(followCountsKey(targetUserId), nextTargetCounts);

  const nextCurrentCounts = {
    ...(prevCurrentCounts ?? { followersCount: 0, followingCount: 0 }),
    followingCount: (prevCurrentCounts?.followingCount ?? 0) + 1,
  };
  queryClient.setQueryData<FollowCounts>(followCountsKey(currentUserId), nextCurrentCounts);

  if (prevTargetFollowers) {
    queryClient.setQueryData<MinimalUserProfile[]>(followersListKey(targetUserId),
      upsertToFront(prevTargetFollowers, { user_id: currentUserId, nickname: null, avatar_url: null })
    );
  }

  if (prevCurrentFollowing) {
    queryClient.setQueryData<MinimalUserProfile[]>(followingListKey(currentUserId),
      upsertToFront(prevCurrentFollowing, { user_id: targetUserId, nickname: null, avatar_url: null })
    );
  }

  queryClient.setQueryData<FollowRelationship>(followRelationshipKey(currentUserId, targetUserId), {
    ...(prevRelationship ?? { isFollowing: false, isFollowedBy: false }),
    isFollowing: true,
  });

  return {
    prevTargetCounts,
    prevCurrentCounts,
    prevTargetFollowers,
    prevCurrentFollowing,
    prevRelationship,

    createdTargetCounts: !prevTargetCounts,
    createdCurrentCounts: !prevCurrentCounts,
    createdRelationship: !prevRelationship,
  };
};

export const applyOptimisticUnfollow = (
  queryClient: QueryClient,
  args: { currentUserId: string; targetUserId: string }
): OptimisticFollowContext => {
  const { currentUserId, targetUserId } = args;

  const prevTargetCounts = queryClient.getQueryData<FollowCounts>(followCountsKey(targetUserId));
  const prevCurrentCounts = queryClient.getQueryData<FollowCounts>(followCountsKey(currentUserId));
  const prevTargetFollowers = queryClient.getQueryData<MinimalUserProfile[]>(followersListKey(targetUserId));
  const prevCurrentFollowing = queryClient.getQueryData<MinimalUserProfile[]>(followingListKey(currentUserId));
  const prevRelationship = queryClient.getQueryData<FollowRelationship>(followRelationshipKey(currentUserId, targetUserId));

  const nextTargetCounts = {
    ...(prevTargetCounts ?? { followersCount: 0, followingCount: 0 }),
    followersCount: Math.max(0, (prevTargetCounts?.followersCount ?? 0) - 1),
  };
  queryClient.setQueryData<FollowCounts>(followCountsKey(targetUserId), nextTargetCounts);

  const nextCurrentCounts = {
    ...(prevCurrentCounts ?? { followersCount: 0, followingCount: 0 }),
    followingCount: Math.max(0, (prevCurrentCounts?.followingCount ?? 0) - 1),
  };
  queryClient.setQueryData<FollowCounts>(followCountsKey(currentUserId), nextCurrentCounts);

  if (prevTargetFollowers) {
    queryClient.setQueryData<MinimalUserProfile[]>(followersListKey(targetUserId),
      prevTargetFollowers.filter((u) => u.user_id !== currentUserId)
    );
  }

  if (prevCurrentFollowing) {
    queryClient.setQueryData<MinimalUserProfile[]>(followingListKey(currentUserId),
      prevCurrentFollowing.filter((u) => u.user_id !== targetUserId)
    );
  }

  queryClient.setQueryData<FollowRelationship>(followRelationshipKey(currentUserId, targetUserId), {
    ...(prevRelationship ?? { isFollowing: false, isFollowedBy: false }),
    isFollowing: false,
  });

  return {
    prevTargetCounts,
    prevCurrentCounts,
    prevTargetFollowers,
    prevCurrentFollowing,
    prevRelationship,

    createdTargetCounts: !prevTargetCounts,
    createdCurrentCounts: !prevCurrentCounts,
    createdRelationship: !prevRelationship,
  };
};

export const rollbackOptimisticFollow = (
  queryClient: QueryClient,
  args: { currentUserId: string; targetUserId: string },
  ctx?: OptimisticFollowContext
) => {
  if (!ctx) return;
  const { currentUserId, targetUserId } = args;

  if (ctx.createdTargetCounts) {
    queryClient.removeQueries({ queryKey: followCountsKey(targetUserId) });
  } else if (ctx.prevTargetCounts) {
    queryClient.setQueryData(followCountsKey(targetUserId), ctx.prevTargetCounts);
  }

  if (ctx.createdCurrentCounts) {
    queryClient.removeQueries({ queryKey: followCountsKey(currentUserId) });
  } else if (ctx.prevCurrentCounts) {
    queryClient.setQueryData(followCountsKey(currentUserId), ctx.prevCurrentCounts);
  }

  if (ctx.prevTargetFollowers) queryClient.setQueryData(followersListKey(targetUserId), ctx.prevTargetFollowers);
  if (ctx.prevCurrentFollowing) queryClient.setQueryData(followingListKey(currentUserId), ctx.prevCurrentFollowing);

  if (ctx.createdRelationship) {
    queryClient.removeQueries({ queryKey: followRelationshipKey(currentUserId, targetUserId) });
  } else if (ctx.prevRelationship) {
    queryClient.setQueryData(followRelationshipKey(currentUserId, targetUserId), ctx.prevRelationship);
  }
};
