/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

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

// Basic sanitization since this flows into emails
const sanitize = (value?: string, fallback = "-") => {
  if (!value) return fallback;
  return value.toString().trim().slice(0, 2000) || fallback;
};

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

    const name = sanitize(rawName);
    const email = sanitize(rawEmail);
    const issue = sanitize(rawIssue, "(empty)");

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

    const subject = `Support request from ${name}`;
    const textBody = [
      `Language: ${language}`,
      `User ID: ${user.id}`,
      `Email: ${email}`,
      `Name: ${name}`,
      `Issue:`,
      issue,
    ].join("\n\n");

    const htmlBody = `<!doctype html><html><body style="font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #0f172a;">
      <h2 style="margin: 0 0 12px; font-size: 18px;">New ConfessAI support request</h2>
      <p><strong>Language:</strong> ${language}</p>
      <p><strong>User ID:</strong> ${user.id}</p>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Issue:</strong></p>
      <pre style="white-space: pre-wrap; background: #f8fafc; padding: 12px; border-radius: 8px;">${issue}</pre>
    </body></html>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
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
    });

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
