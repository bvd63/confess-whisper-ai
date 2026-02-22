/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { fetchWithTimeout } from "../_shared/fetch-with-timeout.ts";
import {
  buildSupportEmailBodies,
  sanitizeSupportField,
} from "./utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactSupportPayload {
  name?: string;
  email?: string;
  issue?: string;
  language?: string;
}

const SUPPORTED_LANGS = new Set(["en", "es", "de"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: ContactSupportPayload = await req.json();
    const rawName = payload.name?.trim() ?? "";
    const rawEmail = payload.email?.trim() ?? "";
    const rawIssue = payload.issue?.trim() ?? "";
    const language = payload.language && SUPPORTED_LANGS.has(payload.language) ? payload.language : "en";

    if (!rawName || !rawEmail || !rawIssue) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!EMAIL_PATTERN.test(rawEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const name = sanitizeSupportField(rawName);
    const email = sanitizeSupportField(rawEmail);
    const issue = sanitizeSupportField(rawIssue, "(empty)");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } = { user: null } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supportInbox = Deno.env.get("SUPPORT_EMAIL") ?? "confess.supp@gmail.com";
    const fromAddress = Deno.env.get("SUPPORT_FROM_EMAIL") ?? "ConfessAI Support <support@confess.ai>";

    const { subject, textBody, htmlBody } = buildSupportEmailBodies({
      language,
      userId: user.id,
      name,
      email,
      issue,
    });

    const resendResponse = await fetchWithTimeout("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [supportInbox],
        reply_to: email,
        subject,
        text: textBody,
        html: htmlBody,
        tags: [
          { name: "source", value: "contact-support" },
          { name: "language", value: language },
        ],
      }),
    }, 10_000);

    if (!resendResponse.ok) {
      const errorPayload = await resendResponse.json().catch(() => ({}));
      console.error("Resend error", errorPayload);
      throw new Error("Failed to send support email");
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("contact-support error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
