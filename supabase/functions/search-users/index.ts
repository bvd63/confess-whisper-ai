import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const url = new URL(req.url);
    const nickname = url.searchParams.get('nickname') || '';

    if (nickname.length < 2) {
      return new Response(JSON.stringify({ users: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Search for users by nickname (case-insensitive, partial match)
    const { data: profiles, error } = await supabaseClient
      .from('profiles')
      .select('user_id, nickname, bio, avatar_url')
      .ilike('nickname', `%${nickname}%`)
      .not('user_id', 'eq', user.id)
      .limit(20);

    if (error) throw error;

    // Check which users the current user is following
    const { data: followData } = await supabaseClient
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .in('following_id', profiles?.map(p => p.user_id) || []);

    const followingIds = new Set(followData?.map(f => f.following_id) || []);

    const users = profiles?.map(p => ({
      id: p.user_id,
      nickname: p.nickname,
      bio: p.bio,
      avatarUrl: p.avatar_url,
      isFollowing: followingIds.has(p.user_id),
    })) || [];

    return new Response(JSON.stringify({ users }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in search-users:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});