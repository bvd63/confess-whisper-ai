import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { buildCorsHeaders } from "../_shared/env.ts";
import { handleOptions, jsonResponse } from "../_shared/http.ts";
import { logError, logInfo, logWarn } from "../_shared/logger.ts";
import { getRequestContext, isEdgeAuthorized } from "../_shared/security.ts";
import { requireAuth } from "../_shared/supabase.ts";

type MetricType = "counter" | "gauge" | "histogram";

interface Metric {
  name: string;
  value: number;
  type: MetricType;
  labels?: Record<string, string>;
  timestamp: number;
}

const MetricSchema = z.object({
  name: z.string().min(1).max(128),
  value: z.number(),
  type: z.enum(["counter", "gauge", "histogram"]).default("counter"),
  labels: z.record(z.string().min(1), z.string()).optional(),
});

const metrics: Metric[] = [];
const MAX_METRICS = 10_000;

const aggregateMetrics = (records: Metric[]) => {
  const grouped = records.reduce<Record<string, number[]>>((acc, metric) => {
    const bucket = acc[metric.name];
    if (bucket) {
      bucket.push(metric.value);
    } else {
      acc[metric.name] = [metric.value];
    }
    return acc;
  }, {});

  const result: Record<string, {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  }> = {};

  for (const [name, values] of Object.entries(grouped)) {
    if (values.length === 0) {
      continue;
    }

    const sorted = [...values].sort((a, b) => a - b);
    if (sorted.length === 0) {
      continue;
    }

    const sum = values.reduce((total, value) => total + value, 0);
    const percentile = (ratio: number): number => {
      const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * ratio)));
      return sorted[index] ?? sorted[sorted.length - 1]!;
    };

    result[name] = {
      count: values.length,
      sum,
      avg: sum / values.length,
      min: sorted[0]!,
      max: sorted[sorted.length - 1]!,
      p50: percentile(0.5),
      p95: percentile(0.95),
      p99: percentile(0.99),
    };
  }

  return result;
};

const generatePrometheusFormat = (records: Metric[]) => {
  const lines: string[] = [];
  const grouped = records.reduce<Record<string, Metric[]>>((acc, metric) => {
    const bucket = acc[metric.name];
    if (bucket) {
      bucket.push(metric);
    } else {
      acc[metric.name] = [metric];
    }
    return acc;
  }, {});

  for (const [name, metricList] of Object.entries(grouped)) {
    const firstMetric = metricList[0];
    if (!firstMetric) continue;
    lines.push(`# TYPE ${name} ${firstMetric.type}`);
    for (const metric of metricList) {
      const labels = metric.labels
        ? Object.entries(metric.labels)
          .map(([key, value]) => `${key}="${value}"`)
          .join(",")
        : "";
      const labelString = labels ? `{${labels}}` : "";
      lines.push(`${name}${labelString} ${metric.value} ${metric.timestamp}`);
    }
    lines.push("");
  }

  return lines.join("\n");
};

serve(async (req) => {
  const context = getRequestContext(req);

  if (req.method === "OPTIONS") {
    return handleOptions(context.origin);
  }

  try {
    const edgeAuthorized = isEdgeAuthorized(req);
    const searchParams = new URL(req.url).searchParams;

    if (req.method === "POST") {
      let userId: string | null = null;
      if (!edgeAuthorized) {
        const authHeader = req.headers.get("Authorization");
        const authResult = await requireAuth(authHeader);
        if (!authResult.user) {
          return jsonResponse({ error: "UNAUTHORIZED" }, 401, context.origin);
        }
        userId = authResult.user.id;
      }

      let rawBody: unknown;
      try {
        rawBody = await req.json();
      } catch {
        return jsonResponse({ error: "INVALID_JSON" }, 400, context.origin);
      }

      const parsed = MetricSchema.safeParse(rawBody);
      if (!parsed.success) {
        logWarn("metrics: invalid payload", { issues: parsed.error.flatten().fieldErrors });
        return jsonResponse({ error: "INVALID_PAYLOAD" }, 400, context.origin);
      }

      const payload = parsed.data;
      metrics.push({
        name: payload.name,
        value: payload.value,
        type: payload.type,
        labels: { ...payload.labels, ...(userId ? { user_id: userId } : {}) },
        timestamp: Date.now(),
      });

      if (metrics.length > MAX_METRICS) {
        metrics.splice(0, metrics.length - MAX_METRICS);
      }

      logInfo("metrics: recorded", {
        name: payload.name,
        type: payload.type,
        totalMetrics: metrics.length,
        userId,
        ipAddress: context.ipAddress,
      });

      return jsonResponse({ success: true }, 201, context.origin);
    }

    if (req.method === "GET") {
      if (!edgeAuthorized) {
        return jsonResponse({ error: "UNAUTHORIZED" }, 401, context.origin);
      }

      const format = searchParams.get("format") ?? "json";
      const nameFilter = searchParams.get("name");
      const start = searchParams.get("start");
      const end = searchParams.get("end");

      let filteredMetrics = [...metrics];
      if (nameFilter) {
        filteredMetrics = filteredMetrics.filter((metric) => metric.name === nameFilter);
      }
      if (start) {
        const startValue = Number(start);
        if (!Number.isNaN(startValue)) {
          filteredMetrics = filteredMetrics.filter((metric) => metric.timestamp >= startValue);
        }
      }
      if (end) {
        const endValue = Number(end);
        if (!Number.isNaN(endValue)) {
          filteredMetrics = filteredMetrics.filter((metric) => metric.timestamp <= endValue);
        }
      }

      logInfo("metrics: fetch", {
        format,
        nameFilter,
        total: filteredMetrics.length,
      });

      if (format === "prometheus") {
        return new Response(generatePrometheusFormat(filteredMetrics), {
          headers: {
            ...buildCorsHeaders(context.origin ?? undefined),
            "Content-Type": "text/plain",
          },
        });
      }

      return jsonResponse({
        total: filteredMetrics.length,
        timeRange: {
          start: filteredMetrics[0]?.timestamp ?? null,
          end: filteredMetrics[filteredMetrics.length - 1]?.timestamp ?? null,
        },
        metrics: aggregateMetrics(filteredMetrics),
      }, 200, context.origin);
    }

    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405, context.origin);
  } catch (error) {
    logError("metrics: unexpected error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: "INTERNAL_ERROR" }, 500, context.origin);
  }
});
