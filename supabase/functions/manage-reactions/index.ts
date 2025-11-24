import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { messageId, emoji, action } = await req.json();

    if (!messageId || !emoji) {
      return new Response(
        JSON.stringify({ error: 'Missing messageId or emoji' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the current message
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('reactions, conversation_id')
      .eq('id', messageId)
      .single();

    if (fetchError || !message) {
      return new Response(
        JSON.stringify({ error: 'Message not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is part of the conversation
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', message.conversation_id)
      .eq('user_id', user.id)
      .single();

    if (!participant) {
      return new Response(
        JSON.stringify({ error: 'Not authorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const reactions = (message.reactions || []) as Array<{
      userId: string;
      emoji: string;
      createdAt: string;
    }>;

    let updatedReactions;

    if (action === 'add') {
      // Remove any existing reaction from this user with the same emoji
      updatedReactions = reactions.filter(
        r => !(r.userId === user.id && r.emoji === emoji)
      );
      // Add new reaction
      updatedReactions.push({
        userId: user.id,
        emoji,
        createdAt: new Date().toISOString(),
      });
    } else if (action === 'remove') {
      // Remove the reaction
      updatedReactions = reactions.filter(
        r => !(r.userId === user.id && r.emoji === emoji)
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "add" or "remove"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the message
    const { error: updateError } = await supabase
      .from('messages')
      .update({ reactions: updatedReactions })
      .eq('id', messageId);

    if (updateError) {
      throw updateError;
    }

    console.log(`[REACTIONS] User ${user.id} ${action}ed ${emoji} to message ${messageId}`);

    return new Response(
      JSON.stringify({ success: true, reactions: updatedReactions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[REACTIONS] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});