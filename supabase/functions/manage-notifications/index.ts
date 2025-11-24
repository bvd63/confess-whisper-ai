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

    const { action, notificationId } = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Missing action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'mark_read') {
      if (!notificationId) {
        return new Response(
          JSON.stringify({ error: 'Missing notificationId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      console.log(`[NOTIFICATIONS] Marked notification ${notificationId} as read for user ${user.id}`);
    } 
    else if (action === 'mark_all_read') {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      console.log(`[NOTIFICATIONS] Marked all notifications as read for user ${user.id}`);
    } 
    else if (action === 'delete') {
      if (!notificationId) {
        return new Response(
          JSON.stringify({ error: 'Missing notificationId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Soft delete: add user to deleted_for array
      const { data: notification } = await supabase
        .from('notifications')
        .select('deleted_for')
        .eq('id', notificationId)
        .single();

      if (notification) {
        const deletedFor = notification.deleted_for || [];
        if (!deletedFor.includes(user.id)) {
          deletedFor.push(user.id);
        }

        const { error } = await supabase
          .from('notifications')
          .update({ deleted_for: deletedFor })
          .eq('id', notificationId)
          .eq('user_id', user.id);

        if (error) throw error;
      }

      console.log(`[NOTIFICATIONS] Deleted notification ${notificationId} for user ${user.id}`);
    } 
    else if (action === 'delete_all') {
      // Get all user's notifications and add user to their deleted_for
      const { data: notifications } = await supabase
        .from('notifications')
        .select('id, deleted_for')
        .eq('user_id', user.id);

      if (notifications) {
        for (const notif of notifications) {
          const deletedFor = notif.deleted_for || [];
          if (!deletedFor.includes(user.id)) {
            deletedFor.push(user.id);
            await supabase
              .from('notifications')
              .update({ deleted_for: deletedFor })
              .eq('id', notif.id);
          }
        }
      }

      console.log(`[NOTIFICATIONS] Deleted all notifications for user ${user.id}`);
    }
    else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[NOTIFICATIONS] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});