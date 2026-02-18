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
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { confessionId, extraPrompt, action = 'run' } = await req.json();

    if (!confessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing confessionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get confession details
    const { data: confession, error: confessionError } = await supabaseClient
      .from('confessions')
      .select('id, content, category, image_url, user_id')
      .eq('id', confessionId)
      .single();

    if (confessionError || !confession) {
      return new Response(
        JSON.stringify({ error: 'Confession not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (confession.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Not authorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle delete action
    if (action === 'delete') {
      const { error: deleteError } = await supabaseClient
        .from('confession_insights')
        .delete()
        .eq('confession_id', confessionId)
        .eq('user_id', user.id);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: 'Failed to delete insight' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, action: 'deleted' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle run action - generate insight using Lovable AI
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') ?? '',
          },
        },
      }
    );

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';

    const rateLimitResult = await serviceClient.functions.invoke('rate-limit', {
      body: {
        action: 'ai_request',
        ip: clientIp,
      },
      headers: {
        Authorization: req.headers.get('Authorization') ?? '',
      },
    });

    if (rateLimitResult.error) {
      return new Response(
        JSON.stringify({ error: 'Rate limit unavailable. Please try again.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (rateLimitResult.data?.allowed === false) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build message with image if available
    let userContent: any;
    
    if (confession.image_url) {
      userContent = [
        { 
          type: 'text', 
          text: `Provide a deep psychological insight for this confession:\n\n${confession.content}\n\nCategory: ${confession.category}${extraPrompt ? `\n\nAdditional context: ${extraPrompt}` : ''}\n\nProvide empathetic, actionable insights focusing on emotional patterns, underlying motivations, and constructive pathways forward. Analyze the attached image and incorporate observations into your analysis.`
        },
        { 
          type: 'image_url', 
          image_url: { url: confession.image_url } 
        }
      ];
    } else {
      userContent = `Provide a deep psychological insight for this confession:\n\n${confession.content}\n\nCategory: ${confession.category}${extraPrompt ? `\n\nAdditional context: ${extraPrompt}` : ''}\n\nProvide empathetic, actionable insights focusing on emotional patterns, underlying motivations, and constructive pathways forward.`;
    }

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are an empathetic AI counselor providing deep psychological insights. Be compassionate, constructive, and focus on emotional well-being. When an image is provided, analyze it carefully and integrate your observations into the psychological insight.' 
          },
          { role: 'user', content: userContent }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate insight' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const insightText = aiData.choices?.[0]?.message?.content;

    if (!insightText) {
      return new Response(
        JSON.stringify({ error: 'No insight generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save or update insight
    const { data: insight, error: insightError } = await supabaseClient
      .from('confession_insights')
      .upsert({
        confession_id: confessionId,
        user_id: user.id,
        insight_text: insightText,
        extra_prompt: extraPrompt || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'confession_id'
      })
      .select()
      .single();

    if (insightError) {
      console.error('Error saving insight:', insightError);
      return new Response(
        JSON.stringify({ error: 'Failed to save insight' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        insight: {
          id: insight.id,
          text: insight.insight_text,
          createdAt: insight.created_at,
          updatedAt: insight.updated_at
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in deep-insight:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});