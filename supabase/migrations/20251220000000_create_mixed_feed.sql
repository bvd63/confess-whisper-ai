-- Mixed feed RPC for interleaving following + explore pools with adaptive ratios
CREATE OR REPLACE FUNCTION public.get_mixed_feed(p_limit integer DEFAULT 30, p_cursor jsonb DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  content text,
  category text,
  user_id uuid,
  comments_count integer,
  likes_count integer,
  ai_response text,
  ai_deep_insight text,
  created_at timestamptz,
  author_display_name_snapshot text,
  author_nickname_snapshot text,
  author_visibility_snapshot text,
  is_anonymous boolean,
  image_url text,
  image_blurred boolean,
  boost_expires_at timestamptz,
  score numeric,
  pool text,
  mix_order numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_following_count integer := 0;
  v_follow_ratio numeric := 0.6;
  v_explore_ratio numeric := 0.4;
BEGIN
  -- Determine following count using cached profile counter when available
  SELECT COALESCE(following_count, 0) INTO v_following_count
  FROM profiles
  WHERE user_id = v_user;

  -- Adaptive ratios based on following count
  IF v_following_count <= 5 THEN
    v_follow_ratio := 0.4;
    v_explore_ratio := 0.6;
  ELSIF v_following_count <= 20 THEN
    v_follow_ratio := 0.6;
    v_explore_ratio := 0.4;
  ELSE
    v_follow_ratio := 0.7;
    v_explore_ratio := 0.3;
  END IF;

  RETURN QUERY WITH following_edges AS (
    SELECT following_id
    FROM user_follows
    WHERE follower_id = v_user
  ),
  base_confessions AS (
    SELECT c.id,
           c.content,
           c.category,
           c.user_id,
           COALESCE(c.comments_count, 0) AS comments_count,
           COALESCE(c.likes_count, 0) AS likes_count,
           c.ai_response,
           c.ai_deep_insight,
           c.created_at,
           c.author_display_name_snapshot,
           c.author_nickname_snapshot,
           c.author_visibility_snapshot,
           COALESCE(c.is_anonymous, FALSE) AS is_anonymous,
           c.image_url,
           c.image_blurred
    FROM confessions c
    WHERE c.moderation_status = 'approved'
      AND COALESCE(c.is_draft, FALSE) = FALSE
      AND COALESCE(c.is_private, FALSE) = FALSE
  ),
  reaction_counts AS (
    SELECT confession_id, COUNT(*) AS reaction_count
    FROM confession_reactions
    GROUP BY confession_id
  ),
  active_boosts AS (
    SELECT confession_id, MAX(ends_at) AS ends_at
    FROM confession_boosts
    WHERE status = 'ACTIVE'
      AND ends_at > NOW()
    GROUP BY confession_id
  ),
  following_pool AS (
    SELECT b.*, 
           COALESCE(rc.reaction_count, 0) AS reaction_count,
           COALESCE(ab.ends_at, NULL) AS boost_expires_at,
           EXTRACT(EPOCH FROM (NOW() - b.created_at)) / 3600 AS hours_since_post,
           CASE WHEN ab.ends_at IS NULL THEN 0 ELSE 10 END AS boost_bonus
    FROM base_confessions b
    LEFT JOIN reaction_counts rc ON rc.confession_id = b.id
    LEFT JOIN active_boosts ab ON ab.confession_id = b.id
    WHERE v_user IS NOT NULL
      AND (b.user_id = v_user OR b.user_id IN (SELECT following_id FROM following_edges))
  ),
  explore_pool AS (
    SELECT b.*, 
           COALESCE(rc.reaction_count, 0) AS reaction_count,
           COALESCE(ab.ends_at, NULL) AS boost_expires_at,
           EXTRACT(EPOCH FROM (NOW() - b.created_at)) / 3600 AS hours_since_post,
           CASE WHEN ab.ends_at IS NULL THEN 0 ELSE 10 END AS boost_bonus
    FROM base_confessions b
    LEFT JOIN reaction_counts rc ON rc.confession_id = b.id
    LEFT JOIN active_boosts ab ON ab.confession_id = b.id
    WHERE (v_user IS NULL OR b.user_id <> v_user)
      AND (v_user IS NULL OR b.user_id NOT IN (SELECT following_id FROM following_edges))
  ),
  scored_following AS (
    SELECT *,
      ((COALESCE(reaction_count, 0)::numeric + (1.5 * COALESCE(comments_count, 0)) + 3 + boost_bonus) *
       EXP(- (hours_since_post / 24))) AS score,
      ROW_NUMBER() OVER (
        ORDER BY ((COALESCE(reaction_count, 0)::numeric + (1.5 * COALESCE(comments_count, 0)) + 3 + boost_bonus) *
                  EXP(- (hours_since_post / 24))) DESC,
                 created_at DESC,
                 id DESC
      ) AS rn
    FROM following_pool
  ),
  scored_explore AS (
    SELECT *,
      ((COALESCE(reaction_count, 0)::numeric + (1.5 * COALESCE(comments_count, 0)) + boost_bonus) *
       EXP(- (hours_since_post / 24))) AS score,
      ROW_NUMBER() OVER (
        ORDER BY ((COALESCE(reaction_count, 0)::numeric + (1.5 * COALESCE(comments_count, 0)) + boost_bonus) *
                  EXP(- (hours_since_post / 24))) DESC,
                 created_at DESC,
                 id DESC
      ) AS rn
    FROM explore_pool
  ),
  combined AS (
    SELECT id, content, category, user_id, comments_count, likes_count, ai_response, ai_deep_insight, created_at,
           author_display_name_snapshot, author_nickname_snapshot, author_visibility_snapshot,
           is_anonymous, image_url, image_blurred, boost_expires_at, score,
           'following'::text AS pool,
           (rn::numeric / NULLIF(v_follow_ratio, 0.0001)) AS mix_order
    FROM scored_following
    UNION ALL
    SELECT id, content, category, user_id, comments_count, likes_count, ai_response, ai_deep_insight, created_at,
           author_display_name_snapshot, author_nickname_snapshot, author_visibility_snapshot,
           is_anonymous, image_url, image_blurred, boost_expires_at, score,
           'explore'::text AS pool,
           (rn::numeric / NULLIF(v_explore_ratio, 0.0001)) AS mix_order
    FROM scored_explore
  ),
  cursor_values AS (
    SELECT
      COALESCE((p_cursor ->> 'mix_order')::numeric, -1) AS last_mix_order,
      COALESCE((p_cursor ->> 'score')::numeric, -1) AS last_score,
      COALESCE((p_cursor ->> 'created_at')::timestamptz, TO_TIMESTAMP(0)) AS last_created_at,
      COALESCE((p_cursor ->> 'id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid) AS last_id,
      (p_cursor IS NOT NULL AND jsonb_typeof(p_cursor) = 'object') AS has_cursor
  ),
  filtered AS (
    SELECT c.*
    FROM combined c
    CROSS JOIN cursor_values cv
    WHERE cv.has_cursor = FALSE
       OR c.mix_order > cv.last_mix_order
       OR (c.mix_order = cv.last_mix_order AND c.score > cv.last_score)
       OR (c.mix_order = cv.last_mix_order AND c.score = cv.last_score AND c.created_at > cv.last_created_at)
       OR (c.mix_order = cv.last_mix_order AND c.score = cv.last_score AND c.created_at = cv.last_created_at AND c.id > cv.last_id)
  )
  SELECT *
  FROM filtered
  ORDER BY mix_order, score DESC, created_at DESC, id DESC
  LIMIT p_limit;
END;
$$;
