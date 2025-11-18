# 🚀 Production Monitoring Setup Guide

Complete guide to set up production monitoring for ConfessAI.

---

## 📊 Overview

ConfessAI uses a multi-layered monitoring approach:

1. **Health Check Endpoint** - Real-time system status
2. **Structured Logging** - Detailed event tracking
3. **Metrics Collection** - Performance measurements
4. **Alerting System** - Proactive issue detection

---

## 1️⃣ Health Check Endpoint

### Endpoint URL

```bash
GET https://fxwvlbopvnjjjrzshqvw.supabase.co/functions/v1/health
```

### Response Format

```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2025-10-26T12:00:00.000Z",
  "version": "1.1.0",
  "uptime": 3600000,
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 45
    },
    "storage": {
      "status": "healthy",
      "latency": 32
    },
    "functions": {
      "status": "healthy"
    }
  },
  "memory": {
    "used": 52428800,
    "total": 134217728,
    "percentage": 39.06
  }
}
```

### HTTP Status Codes

- **200** - Healthy or Degraded (system operational)
- **503** - Unhealthy (critical failure)

---

## 2️⃣ Monitoring Setup Options

### Option A: UptimeRobot (Free Tier)

**Setup Steps:**

1. Sign up at [https://uptimerobot.com](https://uptimerobot.com)
2. Create new monitor:
   - **Monitor Type:** HTTP(s)
   - **URL:** `https://fxwvlbopvnjjjrzshqvw.supabase.co/functions/v1/health`
   - **Interval:** 5 minutes
   - **Alert Contacts:** Your email/Slack/Discord
3. Set alert conditions:
   - Trigger on: Status code != 200
   - Or: Response time > 5000ms

**Pros:**

- ✅ Free tier (50 monitors)
- ✅ Easy setup (5 minutes)
- ✅ Email/SMS/Slack alerts
- ✅ Status page generation

**Cons:**

- ❌ Basic metrics only
- ❌ 5-minute minimum interval

---

### Option B: BetterStack (Recommended)

**Setup Steps:**

1. Sign up at [https://betterstack.com](https://betterstack.com)
2. Create new uptime monitor:
   - **URL:** `https://fxwvlbopvnjjjrzshqvw.supabase.co/functions/v1/health`
   - **Interval:** 30 seconds
   - **Regions:** Multiple (US, EU, Asia)
3. Configure incident management:
   - **On-call schedule:** Your team
   - **Escalation:** Email → SMS → Phone call
   - **Integrations:** Slack, Discord, PagerDuty

**Pros:**

- ✅ 30-second checks
- ✅ Global monitoring (10+ regions)
- ✅ Advanced incident management
- ✅ Beautiful dashboards
- ✅ Log aggregation

**Cons:**

- ❌ Paid (starts at $18/month)

---

### Option C: Custom Monitoring Script

For advanced users who want full control:

```typescript
// monitoring-script.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const HEALTH_URL =
  "https://fxwvlbopvnjjjrzshqvw.supabase.co/functions/v1/health";
const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL");
const CHECK_INTERVAL = 60000; // 1 minute

interface HealthCheck {
  status: string;
  checks: {
    database: { status: string; latency?: number };
    storage: { status: string; latency?: number };
  };
}

async function checkHealth(): Promise<HealthCheck | null> {
  try {
    const response = await fetch(HEALTH_URL);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error("Health check failed:", error);
    return null;
  }
}

async function sendAlert(message: string) {
  if (!SLACK_WEBHOOK_URL) return;

  await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  });
}

async function monitor() {
  const health = await checkHealth();

  if (!health) {
    await sendAlert("🚨 CRITICAL: Health check failed - system unreachable");
    return;
  }

  if (health.status === "unhealthy") {
    await sendAlert(
      `🚨 CRITICAL: System unhealthy - ${JSON.stringify(health.checks)}`,
    );
  } else if (health.status === "degraded") {
    await sendAlert(
      `⚠️ WARNING: System degraded - ${JSON.stringify(health.checks)}`,
    );
  }

  // Check latency thresholds
  if (health.checks.database.latency && health.checks.database.latency > 200) {
    await sendAlert(
      `⚠️ WARNING: High database latency: ${health.checks.database.latency}ms`,
    );
  }

  if (health.checks.storage.latency && health.checks.storage.latency > 200) {
    await sendAlert(
      `⚠️ WARNING: High storage latency: ${health.checks.storage.latency}ms`,
    );
  }
}

// Run monitor every minute
setInterval(monitor, CHECK_INTERVAL);

// Keep script alive
serve(() => new Response("Monitoring active"));
```

**Deploy to:**

- Deno Deploy (free)
- Cloudflare Workers (free tier)
- Railway.app (free tier)

---

## 3️⃣ Alert Configuration

### Alert Levels

#### 🚨 CRITICAL (Immediate Response Required)

- Status: `unhealthy`
- HTTP status: 503
- Database: Unreachable
- Response: < 15 minutes

**Actions:**

1. Check Supabase status page
2. Verify database connections
3. Restart edge functions if needed
4. Escalate to on-call engineer

#### ⚠️ WARNING (Investigation Needed)

- Status: `degraded`
- High latency: >200ms (p95)
- Storage issues: Bucket errors
- Response: < 1 hour

**Actions:**

1. Review logs in Supabase Dashboard
2. Check for query bottlenecks
3. Monitor for auto-recovery
4. Document incident

#### ℹ️ INFO (Monitoring Only)

- Status: `healthy`
- Normal latency: <100ms
- All checks passing
- No action needed

---

## 4️⃣ Metrics to Track

### Performance Metrics

| Metric           | Target | Warning    | Critical |
| ---------------- | ------ | ---------- | -------- |
| **p50 Latency**  | <100ms | 100-200ms  | >200ms   |
| **p95 Latency**  | <200ms | 200-500ms  | >500ms   |
| **p99 Latency**  | <500ms | 500-1000ms | >1000ms  |
| **Error Rate**   | <0.1%  | 0.1-1%     | >1%      |
| **Availability** | >99.9% | 99.5-99.9% | <99.5%   |

### Business Metrics

- **Active Users:** Daily/Weekly/Monthly
- **Subscriptions:** New/Active/Churned
- **Revenue:** MRR/ARR growth
- **Confessions:** Posted per day
- **Engagement:** Comments/Likes/Shares

---

## 5️⃣ Log Aggregation

### Supabase Edge Function Logs

**Access logs:**

1. Go to Supabase Dashboard
2. Navigate to Edge Functions
3. Select function → Logs tab
4. Filter by:
   - Time range
   - Log level (info/warn/error)
   - Search term

**Example log query:**

```sql
-- Database logs (Postgres errors)
SELECT
  identifier,
  timestamp,
  event_message,
  parsed.error_severity
FROM postgres_logs
CROSS JOIN unnest(metadata) as m
CROSS JOIN unnest(m.parsed) as parsed
WHERE timestamp > now() - interval '1 hour'
ORDER BY timestamp DESC
LIMIT 100;
```

**Auth logs:**

```sql
SELECT
  id,
  timestamp,
  event_message,
  metadata.level,
  metadata.status,
  metadata.msg
FROM auth_logs
CROSS JOIN unnest(metadata) as metadata
WHERE timestamp > now() - interval '1 hour'
ORDER BY timestamp DESC
LIMIT 100;
```

---

## 6️⃣ Dashboard Setup

### Grafana Dashboard (Optional)

**Metrics to visualize:**

1. **Health Status Timeline**
   - Line chart: healthy/degraded/unhealthy over time
2. **Latency Heatmap**
   - Database latency (p50/p95/p99)
   - Storage latency
3. **Error Rate**
   - Errors per minute
   - Error types breakdown
4. **Memory Usage**
   - Heap used/total
   - Percentage trend
5. **Uptime Percentage**
   - 7-day rolling average
   - Monthly SLA tracking

---

## 7️⃣ Incident Response Playbook

### When Alert Triggers

#### Step 1: Verify Alert (30 seconds)

```bash
# Check health endpoint
curl https://fxwvlbopvnjjjrzshqvw.supabase.co/functions/v1/health

# Expected response:
# { "status": "healthy", ... }
```

#### Step 2: Check Supabase Status (1 minute)

- Visit: [https://status.supabase.com](https://status.supabase.com)
- Check for ongoing incidents
- Review scheduled maintenance

#### Step 3: Review Recent Logs (2 minutes)

- Navigate to Supabase Dashboard → Edge Functions → Logs
- Filter last 15 minutes
- Look for error patterns

#### Step 4: Identify Root Cause (5 minutes)

- **Database issues?** Check query performance, connection pool
- **Storage issues?** Check bucket permissions, file uploads
- **Function issues?** Check deployment status, code errors
- **External API?** Check Stripe/Lovable AI status

#### Step 5: Implement Fix (10 minutes)

- **Quick fix:** Restart edge function, clear cache
- **Code fix:** Deploy hotfix via Git
- **Configuration:** Update secrets, RLS policies

#### Step 6: Monitor Recovery (5 minutes)

- Verify health check returns "healthy"
- Check metrics return to normal
- Confirm no new errors in logs

#### Step 7: Post-Mortem (24 hours)

- Document incident timeline
- Identify prevention measures
- Update monitoring/alerts if needed

---

## 8️⃣ Maintenance Windows

### Scheduled Maintenance

- **Frequency:** Monthly
- **Duration:** 2 hours
- **Time:** Sundays 2-4 AM UTC (low traffic)
- **Notification:** 48 hours advance notice

### Zero-Downtime Deployments

- ✅ Edge function updates (instant)
- ✅ Database migrations (transaction-safe)
- ✅ Frontend deploys (Lovable auto-deploys)

---

## 9️⃣ Cost Estimation

### Free Tier Setup (UptimeRobot)

- **Monthly Cost:** $0
- **Features:**
  - 50 monitors
  - 5-minute checks
  - Email alerts
  - 180-day logs

### Professional Setup (BetterStack)

- **Monthly Cost:** $18-50
- **Features:**
  - Unlimited monitors
  - 30-second checks
  - Phone/SMS/Slack alerts
  - 1-year logs
  - Incident management
  - Status pages

### Enterprise Setup (Custom)

- **Monthly Cost:** $100-500
- **Features:**
  - Custom monitoring scripts
  - Grafana dashboards
  - PagerDuty integration
  - Advanced analytics
  - SLA reports

---

## 🎯 Quick Start (15 Minutes)

### Minimal Setup

1. **Sign up for UptimeRobot** (5 min)
   - Create account
   - Add health check monitor
   - Set email alert

2. **Test alert system** (5 min)
   - Temporarily disable edge function
   - Verify alert received
   - Re-enable function

3. **Document on-call** (5 min)
   - Create rotation schedule
   - Share access credentials
   - Set escalation policy

**Done!** You now have basic monitoring.

---

## 📚 Additional Resources

- [Supabase Monitoring Docs](https://supabase.com/docs/guides/platform/monitoring)
- [Edge Function Observability](https://supabase.com/docs/guides/functions/debugging)
- [PostgreSQL Performance](https://supabase.com/docs/guides/database/query-optimization)
- [Better Stack Guide](https://betterstack.com/docs/uptime/)

---

**Last Updated:** 2025-10-26  
**Next Review:** 2025-11-26
