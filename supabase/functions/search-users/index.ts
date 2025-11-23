import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { buildCorsHeaders } from "../_shared/env.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { logError, logInfo, logWarn } from "../_shared/logger.ts";
import { getRequestContext } from "../_shared/security.ts";
import { requireAuth } from "../_shared/supabase.ts";

const SearchBodySchema = z.object({
  nickname: z.string().trim().min(1).max(64).optional(),
});

const MIN_NICKNAME_LENGTH = 2;
const ALLOW_HEADER = "GET,POST,OPTIONS";

const withCorsOverrides = (origin?: string | null) => ({
  ...buildCorsHeaders(origin ?? undefined),
  "Access-Control-Allow-Methods": ALLOW_HEADER,
});

serve(async (req) => {
  const context = getRequestContext(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: withCorsOverrides(context.origin) });
  }

  if (!["GET", "POST"].includes(req.method)) {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405, context.origin, {
      "Allow": ALLOW_HEADER,
      "Access-Control-Allow-Methods": ALLOW_HEADER,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const authResult = await requireAuth(authHeader);
    if (!authResult.user || !authResult.client) {
      logWarn("search-users: unauthorized", { reason: authResult.error });
      return jsonResponse({ error: "UNAUTHORIZED" }, 401, context.origin, {
        "Access-Control-Allow-Methods": ALLOW_HEADER,
      });
    }

    let nicknameCandidate = "";
    if (req.method === "GET") {
      nicknameCandidate = new URL(req.url).searchParams.get("nickname") ?? "";
    } else {
      let rawBody: unknown;
      try {
        rawBody = await req.json();
      } catch (parseError) {
        logWarn("search-users: invalid JSON", {
          userId: authResult.user.id,
          error: parseError instanceof Error ? parseError.message : String(parseError),
        });
        return jsonResponse({ error: "INVALID_JSON" }, 400, context.origin, {
          "Access-Control-Allow-Methods": ALLOW_HEADER,
        });
      }

      const parsed = SearchBodySchema.safeParse(rawBody);
      if (!parsed.success) {
        logWarn("search-users: invalid payload", {
          userId: authResult.user.id,
          issues: parsed.error.flatten().fieldErrors,
        });
        return jsonResponse({ error: "INVALID_PAYLOAD" }, 400, context.origin, {
          "Access-Control-Allow-Methods": ALLOW_HEADER,
        });
      }

      nicknameCandidate = parsed.data.nickname ?? "";
    }

    const nickname = nicknameCandidate.trim();
    if (nickname.length < MIN_NICKNAME_LENGTH) {
      logInfo("search-users: nickname too short", {
        userId: authResult.user.id,
        nicknameLength: nickname.length,
      });
      return jsonResponse({ users: [] }, 200, context.origin, {
        "Access-Control-Allow-Methods": ALLOW_HEADER,
      });
    }

    const sanitizedQuery = nickname.slice(0, 64);
    const supabase = authResult.client;

    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, nickname, bio, avatar_url")
      .ilike("nickname", `%${sanitizedQuery}%`)
      .not("user_id", "eq", authResult.user.id)
      .limit(20);

    if (profileError) {
      logError("search-users: profile lookup failed", {
        userId: authResult.user.id,
        error: profileError.message,
      });
      return jsonResponse({ error: "PROFILE_LOOKUP_FAILED" }, 500, context.origin, {
        "Access-Control-Allow-Methods": ALLOW_HEADER,
      });
    }

    const profileIds = profiles?.map((profile) => profile.user_id) ?? [];
    let followingIds = new Set<string>();
    if (profileIds.length > 0) {
      const { data: followData, error: followError } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", authResult.user.id)
        .in("following_id", profileIds);

      if (followError) {
        logError("search-users: follow lookup failed", {
          userId: authResult.user.id,
          error: followError.message,
        });
        return jsonResponse({ error: "FOLLOW_LOOKUP_FAILED" }, 500, context.origin, {
          "Access-Control-Allow-Methods": ALLOW_HEADER,
        });
      }

      followingIds = new Set(followData?.map((row) => row.following_id) ?? []);
    }

    const users = (profiles ?? []).map((profile) => ({
      id: profile.user_id,
      nickname: profile.nickname,
      bio: profile.bio,
      avatarUrl: profile.avatar_url,
      isFollowing: followingIds.has(profile.user_id),
    }));

    logInfo("search-users: completed", {
      userId: authResult.user.id,
      queryLength: sanitizedQuery.length,
      resultCount: users.length,
      ipAddress: context.ipAddress,
    });

    return jsonResponse({ users }, 200, context.origin, {
      "Access-Control-Allow-Methods": ALLOW_HEADER,
    });
  } catch (error) {
    logError("search-users: unexpected failure", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: "INTERNAL_ERROR" }, 500, context.origin, {
      "Access-Control-Allow-Methods": ALLOW_HEADER,
    });
  }
});