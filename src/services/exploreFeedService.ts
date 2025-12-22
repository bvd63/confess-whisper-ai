import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { attachActiveBoosts } from "@/lib/boosts";

const MIN_CONTENT_LENGTH = 20;
const AUTHOR_COOLDOWN_MS = 10 * 60 * 1000;
const CATEGORY_CAP_PER_PAGE = 3;
const PAGE_SIZE = 15;
const OVERFETCH_LIMIT = 60;
const HARD_CAP = 50;
const TRENDING_WINDOW_HOURS = 48;
const POPULAR_WINDOW_DAYS = 30;
const TRENDING_TIME_DECAY_K = 0.6; // Simple linear decay: ~0.6 points per hour of age
const MIN_ENGAGEMENT_TRENDING = 1;
const MIN_ENGAGEMENT_POPULAR = 1;

const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;

type ConfessionRow = Database["public"]["Tables"]["confessions"]["Row"] & {
  boost_expires_at?: string | null;
  is_highlighted?: boolean | null;
  highlight_expires_at?: string | null;
};

type ExploreSource =
  | "trending"
  | "popular"
  | "recent"
  | "popular-fallback"
  | "recent-fallback";

type ExploreTab = "trending" | "popular" | "recent";

type ExploreFetchParams = {
  cursor?: string | null;
  currentUserId?: string | null;
  loadedCount?: number;
};

type ExploreResult = {
  items: ConfessionRow[];
  source: ExploreSource;
  nextCursor: string | null;
  hasMore: boolean;
};

const ensureHardCapAvailable = (loadedCount = 0) => loadedCount < HARD_CAP;

const applyQueryGuards = (tab: ExploreTab, cursor?: string | null, currentUserId?: string | null) => {
  const now = Date.now();
  let query = supabase
    .from("confessions")
    .select("*")
    .eq("moderation_status", "approved")
    .not("is_draft", "eq", true)
    .not("is_private", "eq", true)
    .not("is_reported", "eq", true);

  if (currentUserId) {
    query = query.neq("user_id", currentUserId);
  }

  if (tab === "trending") {
    query = query.gte("created_at", new Date(now - TRENDING_WINDOW_HOURS * HOUR_IN_MS).toISOString());
  }

  if (tab === "popular") {
    query = query.gte("created_at", new Date(now - POPULAR_WINDOW_DAYS * DAY_IN_MS).toISOString());
  }

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  if (tab === "recent") {
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.order("likes_count", { ascending: false }).order("comments_count", { ascending: false }).order("created_at", { ascending: false });
  }

  query = query.limit(OVERFETCH_LIMIT);

  return query;
};

const isBoosted = (confession: ConfessionRow, now: number) => {
  const boostExpiresAt = confession.boost_expires_at;
  return Boolean(boostExpiresAt && new Date(boostExpiresAt).getTime() > now);
};

const isHighlighted = (confession: ConfessionRow, now: number) => {
  const highlightExpiresAt = confession.highlight_expires_at;
  const highlightedFlag = confession.is_highlighted;
  if (highlightExpiresAt) {
    return new Date(highlightExpiresAt).getTime() > now;
  }
  return Boolean(highlightedFlag);
};

const computeTrendingScore = (confession: ConfessionRow, now: number) => {
  const likes = confession.likes_count ?? 0;
  const comments = confession.comments_count ?? 0;
  const engagement = likes * 1.5 + comments * 2;
  const boostBonus = isBoosted(confession, now) ? 20 : 0;
  const highlightBonus = isHighlighted(confession, now) ? 10 : 0;
  const ageHours = (now - new Date(confession.created_at).getTime()) / HOUR_IN_MS;
  const timeDecay = ageHours * TRENDING_TIME_DECAY_K;
  return engagement + boostBonus + highlightBonus - timeDecay;
};

const computePopularScore = (confession: ConfessionRow) => {
  const likes = confession.likes_count ?? 0;
  const comments = confession.comments_count ?? 0;
  return likes * 1.5 + comments * 2;
};

const hasEngagement = (confession: ConfessionRow) => (confession.likes_count ?? 0) + (confession.comments_count ?? 0);

const passesEngagementGate = (confession: ConfessionRow, tab: ExploreTab, now: number) => {
  if (tab === "recent") return true;

  const engaged = hasEngagement(confession);
  const boosted = isBoosted(confession, now) || isHighlighted(confession, now);

  if (tab === "trending") return boosted || engaged >= MIN_ENGAGEMENT_TRENDING;
  if (tab === "popular") return boosted || engaged >= MIN_ENGAGEMENT_POPULAR;

  return true;
};

const passesClientFilters = (confession: ConfessionRow, currentUserId?: string | null) => {
  if (!confession) return false;

  if (confession.is_private) return false;
  if (confession.is_draft) return false;
  if (confession.is_reported) return false;
  if (confession.moderation_status && confession.moderation_status !== "approved") return false;

  return true;
};

type SelectionRules = {
  minContentLength: number | null;
  applyCategoryCap: boolean;
  applyAuthorCooldown: boolean;
};

const applySelectionRules = (candidates: ConfessionRow[], loadedCount = 0, rules: SelectionRules) => {
  const selected: ConfessionRow[] = [];
  const categoryCounts = new Map<string, number>();
  const authorTimestamps = new Map<string, number>();

  for (const candidate of candidates) {
    if (selected.length >= PAGE_SIZE || loadedCount + selected.length >= HARD_CAP) break;

    const createdAtMs = new Date(candidate.created_at).getTime();
    if (Number.isNaN(createdAtMs)) continue;

    const contentLength = candidate.content?.trim().length ?? 0;
    if (rules.minContentLength !== null && contentLength < rules.minContentLength) {
      continue;
    }

    if (rules.applyAuthorCooldown) {
      const authorId = candidate.user_id ?? "unknown";
      const lastIncludedAt = authorTimestamps.get(authorId);
      if (lastIncludedAt && Math.abs(createdAtMs - lastIncludedAt) < AUTHOR_COOLDOWN_MS) {
        continue;
      }
      authorTimestamps.set(authorId, createdAtMs);
    }

    if (rules.applyCategoryCap) {
      const category = candidate.category ?? "other";
      const categoryCount = categoryCounts.get(category) ?? 0;
      if (categoryCount >= CATEGORY_CAP_PER_PAGE) {
        continue;
      }
      categoryCounts.set(category, categoryCount + 1);
    }

    selected.push(candidate);
  }

  const hasMore = selected.length === PAGE_SIZE && loadedCount + selected.length < HARD_CAP;
  const nextCursor = hasMore ? selected[selected.length - 1]?.created_at ?? null : null;

  return { selected, hasMore, nextCursor };
};

const sortCandidates = (tab: ExploreTab, candidates: ConfessionRow[]) => {
  if (tab === "recent") {
    return [...candidates].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const now = Date.now();
  return [...candidates]
    .map((candidate) => ({
      candidate,
      score: tab === "trending" ? computeTrendingScore(candidate, now) : computePopularScore(candidate),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ candidate }) => candidate);
};

const buildTabResult = async (
  tab: ExploreTab,
  { cursor = null, currentUserId = null, loadedCount = 0 }: ExploreFetchParams
): Promise<ExploreResult> => {
  if (!ensureHardCapAvailable(loadedCount)) {
    return { items: [], source: tab, nextCursor: null, hasMore: false };
  }

  const query = applyQueryGuards(tab, cursor, currentUserId);
  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const now = Date.now();
  const withBoosts = await attachActiveBoosts((data as ConfessionRow[]) || []);
  const filtered = withBoosts
    .filter((confession) => passesClientFilters(confession, currentUserId))
    .filter((confession) => passesEngagementGate(confession, tab, now));
  const sorted = sortCandidates(tab, filtered);

  const baseRules: SelectionRules = {
    minContentLength: tab === "recent" ? 10 : MIN_CONTENT_LENGTH,
    applyCategoryCap: tab !== "recent",
    applyAuthorCooldown: tab === "trending",
  };

  const stages: SelectionRules[] = [
    baseRules,
    { ...baseRules, applyCategoryCap: false },
    { ...baseRules, applyCategoryCap: false, applyAuthorCooldown: false },
    { ...baseRules, applyCategoryCap: false, applyAuthorCooldown: false, minContentLength: null },
  ];

  let selection = applySelectionRules(sorted, loadedCount, stages[0]);

  for (let i = 1; i < stages.length; i++) {
    if (selection.selected.length >= PAGE_SIZE || loadedCount + selection.selected.length >= HARD_CAP) {
      break;
    }

    const relaxed = applySelectionRules(sorted, loadedCount, stages[i]);
    if (relaxed.selected.length > selection.selected.length) {
      selection = relaxed;
    }
  }

  return {
    items: selection.selected,
    source: tab,
    nextCursor: selection.nextCursor,
    hasMore: selection.hasMore,
  };
};

export const fetchTrendingConfessions = async (params: ExploreFetchParams = {}): Promise<ExploreResult> => {
  const primary = await buildTabResult("trending", params);
  if (primary.items.length > 0) return primary;

  const fallbackPopular = await buildTabResult("popular", { ...params, cursor: null });
  if (fallbackPopular.items.length > 0) {
    return { ...fallbackPopular, source: "popular-fallback" };
  }

  const fallbackRecent = await buildTabResult("recent", { ...params, cursor: null });
  return { ...fallbackRecent, source: "recent-fallback" };
};

export const fetchPopularConfessions = async (params: ExploreFetchParams = {}): Promise<ExploreResult> => {
  return buildTabResult("popular", params);
};

export const fetchRecentConfessions = async (params: ExploreFetchParams = {}): Promise<ExploreResult> => {
  return buildTabResult("recent", params);
};
