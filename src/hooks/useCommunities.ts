import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export const useCommunities = (category?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: communities, isLoading } = useQuery({
    queryKey: ['communities', category],
    queryFn: async () => {
      let query = supabase
        .from('communities')
        .select('*')
        .order('member_count', { ascending: false });
      
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const createCommunity = useMutation({
    mutationFn: async (community: {
      name: string;
      description: string;
      category: string;
      slug: string;
      is_private?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('communities')
        .insert({
          ...community,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-join as admin
      await supabase
        .from('community_members')
        .insert({
          community_id: data.id,
          user_id: user.id,
          role: 'admin',
          status: 'active',
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      toast({
        title: "Community created",
        description: "Your community has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    communities,
    isLoading,
    createCommunity: createCommunity.mutateAsync,
    isCreating: createCommunity.isPending,
  };
};

export const useCommunityMembers = (communityId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ['community-members', communityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_members')
        .select('*, profiles(*)')
        .eq('community_id', communityId)
        .eq('status', 'active');

      if (error) throw error;
      return data;
    },
    enabled: !!communityId,
  });

  // Real-time subscription for member changes
  useEffect(() => {
    if (!communityId) return;

    const channel = supabase
      .channel(`community-members-${communityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_members',
          filter: `community_id=eq.${communityId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['community-members', communityId] });
          queryClient.invalidateQueries({ queryKey: ['community-membership', communityId] });
          queryClient.invalidateQueries({ queryKey: ['community-pending', communityId] });
          queryClient.invalidateQueries({ queryKey: ['communities'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [communityId, queryClient]);

  const { data: membership } = useQuery({
    queryKey: ['community-membership', communityId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('community_members')
        .select('*')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!communityId,
  });

  const { data: pendingRequests } = useQuery({
    queryKey: ['community-pending', communityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_members')
        .select('*, profiles(*)')
        .eq('community_id', communityId)
        .eq('status', 'pending');

      if (error) throw error;
      return data;
    },
    enabled: !!communityId && (membership?.role === 'admin' || membership?.role === 'moderator'),
  });

  const joinCommunity = useMutation({
    mutationFn: async (isPrivate: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('community_members')
        .insert({
          community_id: communityId,
          user_id: user.id,
          role: 'member',
          status: isPrivate ? 'pending' : 'active',
        });

      if (error) throw error;
    },
    onSuccess: (_data, isPrivate) => {
      queryClient.invalidateQueries({ queryKey: ['community-members', communityId] });
      queryClient.invalidateQueries({ queryKey: ['community-membership', communityId] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      toast({
        title: isPrivate ? "Request sent" : "Joined community",
        description: isPrivate
          ? "Your request to join is pending approval."
          : "You are now a member of this community.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const approveMember = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase
        .from('community_members')
        .update({ status: 'active' })
        .eq('id', membershipId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-members', communityId] });
      queryClient.invalidateQueries({ queryKey: ['community-pending', communityId] });
      toast({
        title: "Member approved",
        description: "The user can now access this community.",
      });
    },
  });

  const rejectMember = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('id', membershipId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-pending', communityId] });
      toast({
        title: "Request rejected",
        description: "The join request has been rejected.",
      });
    },
  });

  const updateMemberRole = useMutation({
    mutationFn: async ({ membershipId, newRole }: { membershipId: string; newRole: string }) => {
      const { error } = await supabase
        .from('community_members')
        .update({ role: newRole })
        .eq('id', membershipId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-members', communityId] });
      toast({
        title: "Role updated",
        description: "Member role has been updated successfully.",
      });
    },
  });

  const kickMember = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase
        .from('community_members')
        .update({ status: 'banned' })
        .eq('id', membershipId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-members', communityId] });
      toast({
        title: "Member removed",
        description: "The member has been removed from this community.",
      });
    },
  });

  const leaveCommunity = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-members', communityId] });
      queryClient.invalidateQueries({ queryKey: ['community-membership', communityId] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      toast({
        title: "Left community",
        description: "You have left this community.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    members,
    membership,
    pendingRequests,
    isLoading,
    isMember: membership?.status === 'active',
    isPending: membership?.status === 'pending',
    isAdmin: membership?.role === 'admin',
    isModerator: membership?.role === 'moderator',
    joinCommunity: joinCommunity.mutate,
    leaveCommunity: leaveCommunity.mutate,
    approveMember: approveMember.mutate,
    rejectMember: rejectMember.mutate,
    updateMemberRole: updateMemberRole.mutate,
    kickMember: kickMember.mutate,
    isJoining: joinCommunity.isPending,
    isLeaving: leaveCommunity.isPending,
  };
};
