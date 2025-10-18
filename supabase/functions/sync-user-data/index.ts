import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Background sync function for user data consistency
 * Handles periodic cleanup, validation, and sync operations
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, operation } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    let result;

    switch (operation) {
      case 'sync-conversations':
        result = await syncConversations(supabase, userId);
        break;
      
      case 'cleanup-stale-drafts':
        result = await cleanupStaleDrafts(supabase, userId);
        break;
      
      case 'validate-data':
        result = await validateUserData(supabase, userId);
        break;
      
      case 'recalculate-unread':
        result = await recalculateUnreadCounts(supabase, userId);
        break;
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid operation' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

/**
 * Sync conversation data and fix inconsistencies
 */
async function syncConversations(supabase: any, userId: string) {
  // Get all user's conversations
  const { data: participants } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId);

  if (!participants) return { synced: 0 };

  let synced = 0;

  for (const { conversation_id } of participants) {
    // Verify conversation still exists
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversation_id)
      .single();

    if (!conversation) {
      // Orphaned participant - clean up
      await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversation_id)
        .eq('user_id', userId);
      
      synced++;
    }
  }

  return { synced, total: participants.length };
}

/**
 * Clean up stale drafts older than 7 days
 */
async function cleanupStaleDrafts(supabase: any, userId: string) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Note: Drafts are stored in IndexedDB client-side
  // This function could clean up any server-side draft storage if implemented
  
  return { cleaned: 0, message: 'Draft cleanup handled client-side' };
}

/**
 * Validate user data consistency
 */
async function validateUserData(supabase: any, userId: string) {
  const issues = [];

  // Check for messages in non-existent conversations
  const { data: messages } = await supabase
    .from('messages')
    .select('id, conversation_id')
    .eq('sender_id', userId);

  if (messages) {
    for (const message of messages) {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', message.conversation_id)
        .single();

      if (!conversation) {
        issues.push({
          type: 'orphaned_message',
          messageId: message.id,
          conversationId: message.conversation_id
        });
      }
    }
  }

  // Check for conversations without participants
  const { data: conversations } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId);

  if (conversations) {
    for (const { conversation_id } of conversations) {
      const { count } = await supabase
        .from('conversation_participants')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversation_id);

      if (count === 0) {
        issues.push({
          type: 'conversation_no_participants',
          conversationId: conversation_id
        });
      }
    }
  }

  return { issues, valid: issues.length === 0 };
}

/**
 * Recalculate unread message counts
 */
async function recalculateUnreadCounts(supabase: any, userId: string) {
  const { data: participants } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId);

  if (!participants) return { counts: {} };

  const counts: Record<string, number> = {};

  for (const { conversation_id } of participants) {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversation_id)
      .eq('is_read', false)
      .neq('sender_id', userId);

    counts[conversation_id] = count || 0;
  }

  return { counts };
}
