import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";

const BOOST_TABLE = "confession_boosts";
const BOOST_STATUS_ACTIVE = "ACTIVE";
const HOUR_IN_MS = 60 * 60 * 1000;

export interface ActiveBoostRecord {
  confession_id: string;
  ends_at: string;
}

const fetchActiveBoostMap = async (confessionIds: string[]) => {
  const boostMap = new Map<string, string>();

  if (confessionIds.length === 0) {
    return boostMap;
  }

  try {
    const { data, error } = await supabase
      .from(BOOST_TABLE)
      .select("confession_id, ends_at")
      .eq("status", BOOST_STATUS_ACTIVE)
      .in("confession_id", confessionIds);

    if (error) {
      throw error;
    }

    data?.forEach((boost) => {
      if (boost.confession_id && boost.ends_at) {
        boostMap.set(boost.confession_id, boost.ends_at);
      }
    });
  } catch (error) {
    logError("Failed to fetch active boosts", error as Error);
  }

  return boostMap;
};

export const attachActiveBoosts = async <T extends { id: string; boost_expires_at?: string | null }>(
  confessions: T[]
): Promise<T[]> => {
  if (!Array.isArray(confessions) || confessions.length === 0) {
    return confessions;
  }

  const confessionIds = confessions.map((confession) => confession.id);
  const boostMap = await fetchActiveBoostMap(confessionIds);

  return confessions.map((confession) => {
    const existingExpiry = confession.boost_expires_at ?? null;
    const refreshedExpiry = boostMap.get(confession.id) ?? existingExpiry;

    return {
      ...confession,
      boost_expires_at: refreshedExpiry ?? null,
    };
  });
};

export interface BoostStatus {
  isBoosted: boolean;
  hoursLeft: number;
  lessThanHour: boolean;
}

export const getBoostStatus = (boostExpiresAt: string | null, now = Date.now()): BoostStatus => {
  if (!boostExpiresAt) {
    return { isBoosted: false, hoursLeft: 0, lessThanHour: false };
  }

  const endsAt = new Date(boostExpiresAt).getTime();

  if (Number.isNaN(endsAt)) {
    return { isBoosted: false, hoursLeft: 0, lessThanHour: false };
  }

  const diffMs = endsAt - now;

  if (diffMs <= 0) {
    return { isBoosted: false, hoursLeft: 0, lessThanHour: false };
  }

  const hoursLeft = Math.floor(diffMs / HOUR_IN_MS);

  return {
    isBoosted: true,
    hoursLeft,
    lessThanHour: hoursLeft < 1,
  };
};

export const addTwentyFourHours = (from: number = Date.now()) => new Date(from + 24 * HOUR_IN_MS).toISOString();
