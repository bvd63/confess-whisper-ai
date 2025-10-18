import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
    createCommunity: createCommunity.mutate,
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
        .eq('community_id', communityId);

      if (error) throw error;
      return data;
    },
    enabled: !!communityId,
  });

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

  const joinCommunity = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('community_members')
        .insert({
          community_id: communityId,
          user_id: user.id,
          role: 'member',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-members', communityId] });
      queryClient.invalidateQueries({ queryKey: ['community-membership', communityId] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      toast({
        title: "Joined community",
        description: "You are now a member of this community.",
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
    isLoading,
    isMember: !!membership,
    joinCommunity: joinCommunity.mutate,
    leaveCommunity: leaveCommunity.mutate,
    isJoining: joinCommunity.isPending,
    isLeaving: leaveCommunity.isPending,
  };
};
