# ConfessAI Operational Runbook

**Version:** 1.0.0  
**Last Updated:** 2025-10-18  
**On-Call Rotation:** TBD

## Table of Contents

1. [System Overview](#system-overview)
2. [Health Checks](#health-checks)
3. [Common Incidents](#common-incidents)
4. [Monitoring & Alerts](#monitoring--alerts)
5. [Deployment Procedures](#deployment-procedures)
6. [Rollback Procedures](#rollback-procedures)
7. [Emergency Contacts](#emergency-contacts)

## System Overview

### Architecture

```
User → Lovable CDN → React SPA
                    ↓
           Supabase Edge Functions
                    ↓
         PostgreSQL (Supabase)
         Storage (Supabase)
         Auth (Supabase)
                    ↓
          External Services:
          - Stripe (Payments)
          - Lovable AI (GPT/Gemini)
```

### Key Components

- **Frontend:** React SPA hosted on Lovable CDN
- **API:** Supabase Edge Functions (Deno runtime)
- **Database:** PostgreSQL 15+ (managed by Supabase)
- **Authentication:** Supabase Auth (JWT)
- **Storage:** Supabase Storage (S3-compatible)

### Service Dependencies

| Service    | Purpose                 | SLA    | Fallback             |
| ---------- | ----------------------- | ------ | -------------------- |
| Supabase   | Database, Auth, Storage | 99.9%  | None - critical      |
| Stripe     | Payments                | 99.99% | Queue for retry      |
| Lovable AI | AI responses            | 99%    | Graceful degradation |

## Health Checks

### Database Health

```sql
-- Check active connections
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE state = 'active';

-- Check for long-running queries (>30s)
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
AND now() - pg_stat_activity.query_start > interval '30 seconds';

-- Check table sizes
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

### Edge Function Health

Check Edge Function logs:

```bash
# In Lovable Cloud dashboard
# Navigate to: Backend → Functions → Logs
# Filter by: Last 1 hour, Error level
```

### Authentication Health

```sql
-- Check recent auth failures
SELECT COUNT(*) as failed_logins_last_hour
FROM auth.audit_log_entries
WHERE created_at > NOW() - INTERVAL '1 hour'
AND payload->>'action' = 'login'
AND payload->>'status' = 'failed';
```

## Common Incidents

### 1. High Error Rate (5xx Responses)

**Symptoms:**

- Users reporting "Something went wrong" errors
- 5xx error rate > 1%
- Edge function failures in logs

**Diagnosis:**

```bash
# Check Edge Function errors
# Lovable Cloud: Backend → Functions → Logs
# Look for: Error level, Last 15 minutes

# Check database performance
-- Run health checks above
-- Look for: slow queries, connection pool exhaustion
```

**Resolution:**

1. Check if database is responsive (run health check)
2. Check Edge Function logs for specific errors
3. If database overload:
   - Identify slow queries
   - Add emergency indexes if needed
   - Scale up database if necessary
4. If Edge Function errors:
   - Check external service status (Stripe, AI APIs)
   - Implement circuit breaker if needed
   - Roll back recent deployment if applicable

**Escalation:** If not resolved in 15 minutes, escalate to engineering lead

---

### 2. Authentication Failures

**Symptoms:**

- Users can't log in
- "Invalid JWT" errors
- 403 responses on protected routes

**Diagnosis:**

```sql
-- Check auth error logs
SELECT * FROM auth.audit_log_entries
WHERE created_at > NOW() - INTERVAL '1 hour'
AND payload->>'status' = 'failed'
ORDER BY created_at DESC
LIMIT 20;
```

**Resolution:**

1. Check Supabase Auth service status
2. Verify JWT secret hasn't changed
3. Check if user tokens need refresh
4. Clear user sessions if needed:

```sql
-- Force logout all users (EMERGENCY ONLY)
DELETE FROM auth.sessions WHERE last_sign_in_at < NOW() - INTERVAL '1 hour';
```

**Escalation:** Critical - escalate immediately if widespread

---

### 3. Database Connection Pool Exhausted

**Symptoms:**

- "Too many connections" errors
- Slow response times across all endpoints
- Connection timeout errors

**Diagnosis:**

```sql
-- Check connection usage
SELECT count(*), state
FROM pg_stat_activity
GROUP BY state;

-- Find connection hogs
SELECT usename, count(*)
FROM pg_stat_activity
GROUP BY usename
ORDER BY count(*) DESC;
```

**Resolution:**

1. Kill idle connections:

```sql
-- Kill idle connections older than 5 minutes
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND state_change < NOW() - INTERVAL '5 minutes'
AND usename != 'supabase_admin';
```

2. Check for connection leaks in Edge Functions
3. Temporarily increase connection pool (via Supabase dashboard)
4. Identify and fix root cause (missing connection cleanup)

**Prevention:** Implement connection pooling with timeouts

---

### 4. Slow Page Load Times

**Symptoms:**

- User complaints about slow app
- Time to Interactive > 5 seconds
- Slow query logs

**Diagnosis:**

```sql
-- Check for slow queries
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Resolution:**

1. Identify slow queries (above)
2. Check query execution plans:

```sql
EXPLAIN ANALYZE <slow_query_here>;
```

3. Add missing indexes
4. Optimize query (reduce columns, add WHERE clauses)
5. Implement caching for hot queries

**Escalation:** Not urgent unless widespread

---

### 5. AI Service Degradation

**Symptoms:**

- AI responses failing
- "AI is temporarily unavailable" messages
- Edge function timeouts on AI endpoints

**Diagnosis:**

```bash
# Check Edge Function logs for ai-confession-response and ai-moderation
# Look for: timeout errors, API key issues, rate limit errors
```

**Resolution:**

1. Check Lovable AI service status
2. Verify API quotas not exceeded
3. Implement graceful degradation:
   - Queue failed requests for retry
   - Show cached responses if available
   - Allow posts without AI response temporarily
4. If persistent, disable AI features temporarily

**Communication:** Notify users via status banner if extended outage

---

### 6. Payment Processing Failures

**Symptoms:**

- Users can't upgrade to premium
- Stripe webhook failures
- Payment success but subscription not activated

**Diagnosis:**

```sql
-- Check recent payment attempts
SELECT * FROM payment_history
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check subscription status
SELECT user_id, subscription_status, subscription_tier
FROM profiles
WHERE subscription_status = 'active'
AND subscription_ends_at < NOW();
```

**Resolution:**

1. Check Stripe dashboard for failures
2. Verify webhook signatures
3. Manually activate subscriptions if needed:

```sql
UPDATE profiles
SET is_premium = true,
    subscription_status = 'active',
    subscription_tier = 'premium'
WHERE user_id = '<user_id>';
```

4. Re-sync Stripe data if needed

**Escalation:** High priority - affects revenue

---

### 7. Community Features Broken

**Symptoms:**

- Can't create/join communities
- "Infinite recursion" errors in logs
- Community pages not loading

**Diagnosis:**

```sql
-- Check for RLS policy issues
SELECT * FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND relname IN ('communities', 'community_members');

-- Test community queries
SELECT * FROM communities LIMIT 1;
SELECT * FROM community_members LIMIT 1;
```

**Resolution:**

1. ✅ Already fixed: RLS infinite recursion
2. Check if security definer function exists:

```sql
SELECT * FROM pg_proc
WHERE proname = 'is_community_admin';
```

3. If missing, run migration to recreate it
4. Clear any query cache

**Status:** FIXED (2025-10-18)

## Monitoring & Alerts

### Key Metrics to Monitor

#### Application Metrics

- **Error Rate:** < 0.1% (5xx responses)
- **Response Time:** p95 < 200ms, p99 < 500ms
- **Request Rate:** Track for anomalies
- **Active Users:** Real-time concurrent users

#### Database Metrics

- **Connection Pool:** < 80% utilization
- **Query Performance:** p95 < 100ms
- **Disk Usage:** < 80% capacity
- **Replication Lag:** < 1 second

#### Edge Function Metrics

- **Invocations:** Track trends
- **Execution Time:** p95 < 3s
- **Error Rate:** < 1%
- **Cold Starts:** Monitor frequency

### Alert Thresholds

| Metric         | Warning   | Critical  | Action                  |
| -------------- | --------- | --------- | ----------------------- |
| Error Rate     | > 0.5%    | > 1%      | Investigate immediately |
| p95 Latency    | > 500ms   | > 1s      | Check slow queries      |
| DB Connections | > 80%     | > 95%     | Scale or fix leaks      |
| Disk Usage     | > 80%     | > 90%     | Clean up or scale       |
| Failed Logins  | > 100/min | > 500/min | Check for attacks       |

### Dashboards

**Primary Dashboard (Supabase):**

- Database performance
- API request rate and errors
- Edge function invocations
- Storage usage

**Custom Metrics:**

```sql
-- Daily active users
SELECT COUNT(DISTINCT user_id) as dau
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '24 hours';

-- New confessions per hour
SELECT DATE_TRUNC('hour', created_at) as hour, COUNT(*) as count
FROM confessions
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Premium conversion rate
SELECT
  (COUNT(*) FILTER (WHERE is_premium = true))::float /
  COUNT(*)::float * 100 as premium_pct
FROM profiles;
```

## Deployment Procedures

### Pre-Deployment Checklist

- [ ] All tests passing (unit, integration, e2e)
- [ ] Database migrations reviewed and tested
- [ ] i18n completeness verified (EN/ES/DE)
- [ ] Breaking changes documented
- [ ] Rollback plan prepared
- [ ] Stakeholders notified

### Deployment Steps

#### 1. Database Migrations

```bash
# Migrations run automatically via Lovable Cloud
# Verify migration success in Supabase dashboard
# Backend → Database → Migrations
```

#### 2. Code Deployment

```bash
# Lovable automatically deploys on code changes
# Monitor deployment progress in Lovable dashboard
# Check build logs for errors
```

#### 3. Post-Deployment Verification

```bash
# 1. Check health endpoints (when implemented)
curl https://confess-whisper-ai.lovable.app/healthz

# 2. Run smoke tests
- Login as test user
- Create a confession
- View notifications
- Test payment flow (in test mode)

# 3. Monitor metrics for 15 minutes
- Watch error rate
- Check response times
- Monitor Edge Function logs

# 4. Verify all languages work
- Switch to EN, ES, DE
- Verify no mixed language rendering
```

### Feature Flag Strategy

**High-Risk Changes:**

```typescript
// Use feature flags for risky features
const isNewFeatureEnabled = user.is_premium || user.id in BETA_USER_IDS;

if (isNewFeatureEnabled) {
  // New feature code
} else {
  // Old code path
}
```

## Rollback Procedures

### When to Rollback

- Error rate > 5% for > 5 minutes
- Critical functionality broken
- Database corruption detected
- Security vulnerability introduced

### Rollback Steps

#### 1. Code Rollback

```bash
# In Lovable dashboard:
# 1. Navigate to project history
# 2. Find last working version
# 3. Click "Restore" to revert

# Verify rollback:
# - Check build succeeds
# - Run smoke tests
# - Monitor error rate returns to normal
```

#### 2. Database Migration Rollback

```sql
-- If migration has down script, run it
-- Otherwise, manually revert changes
-- Example:
DROP POLICY IF EXISTS "new_policy" ON table_name;
-- Restore old policy...
```

#### 3. Communication

- Update status page
- Notify affected users
- Post-mortem document required

### Post-Rollback Actions

1. Root cause analysis
2. Add tests to prevent recurrence
3. Fix issue in dev/staging
4. Plan re-deployment

## Emergency Contacts

### Primary On-Call

- **Email:** TBD
- **Phone:** TBD
- **Slack:** TBD

### Escalation Path

1. **L1:** On-call engineer (response: 15 min)
2. **L2:** Tech lead (response: 30 min)
3. **L3:** CTO (response: 1 hour)

### External Services Support

- **Supabase:** support@supabase.io (Enterprise support)
- **Stripe:** https://support.stripe.com
- **Lovable Cloud:** support@lovable.dev

### Status Pages

- Supabase: https://status.supabase.com
- Stripe: https://status.stripe.com

## Incident Response Process

### 1. Detection (0-5 minutes)

- Alert triggers or user report received
- On-call engineer notified
- Acknowledge alert

### 2. Assessment (5-10 minutes)

- Determine severity (SEV1-SEV4)
- Check system health
- Identify affected users/features
- Start incident channel

### 3. Mitigation (10-30 minutes)

- Follow relevant runbook section
- Implement temporary fixes
- Escalate if needed
- Update stakeholders

### 4. Resolution

- Apply permanent fix
- Verify system stability
- Close incident

### 5. Post-Mortem (24-48 hours)

- Document what happened
- Root cause analysis
- Action items to prevent recurrence
- Share learnings

## Severity Definitions

**SEV1 (Critical):**

- App completely down
- Data loss
- Security breach
- Payment processing broken
- **Response:** Immediate
- **Communication:** All hands

**SEV2 (High):**

- Major feature broken
- Significant performance degradation
- Auth issues affecting >10% users
- **Response:** 15 minutes
- **Communication:** Engineering + stakeholders

**SEV3 (Medium):**

- Minor feature broken
- Performance degradation
- Non-critical errors
- **Response:** 1 hour
- **Communication:** Engineering only

**SEV4 (Low):**

- Cosmetic issues
- Known workarounds
- Technical debt
- **Response:** Best effort
- **Communication:** Ticket only

## Maintenance Windows

### Regular Maintenance

- **Frequency:** Monthly
- **Duration:** 30 minutes
- **Time:** Sunday 2-3 AM UTC
- **Notification:** 72 hours advance

### Emergency Maintenance

- Minimal notice required
- Status page updated
- Post-mortem required

## Useful Commands

### Database

```sql
-- Kill all connections to database (EMERGENCY)
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE datname = current_database()
AND pid <> pg_backend_pid();

-- Reset sequences after bulk import
SELECT setval(pg_get_serial_sequence('table_name', 'id'),
  (SELECT MAX(id) FROM table_name));

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename;
```

### Edge Functions

```bash
# Test edge function locally (when needed)
# supabase functions serve function-name

# View live logs
# Lovable Cloud: Backend → Functions → function-name → Logs
```

## Change Log

| Date       | Change                       | Author    |
| ---------- | ---------------------------- | --------- |
| 2025-10-18 | Initial runbook created      | AI System |
|            | RLS recursion fix documented | AI System |

---

**Document Owner:** Engineering Team  
**Review Frequency:** Quarterly  
**Next Review:** 2026-01-18
