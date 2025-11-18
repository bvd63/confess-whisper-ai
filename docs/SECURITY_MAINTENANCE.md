# Security Maintenance Guide - ConfessAI

## 🔄 Ongoing Security Tasks

This document outlines the security maintenance procedures for ConfessAI to ensure continued protection of user data and system integrity.

---

## 📅 Regular Security Checks

### Weekly Tasks

#### 1. Monitor Failed Authentication Attempts

```sql
-- Check for suspicious auth activity
SELECT
  COUNT(*) as failed_attempts,
  event_message,
  DATE_TRUNC('hour', timestamp) as hour
FROM auth_logs
WHERE metadata.status >= 400
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY event_message, hour
HAVING COUNT(*) > 50
ORDER BY hour DESC;
```

#### 2. Review Rate Limit Violations

```sql
-- Check rate limit table for patterns
SELECT
  key,
  count,
  reset_at
FROM rate_limits
WHERE count >= (
  CASE
    WHEN key LIKE '%confession%' THEN 10
    WHEN key LIKE '%comment%' THEN 30
    WHEN key LIKE '%message%' THEN 50
    ELSE 100
  END
)
ORDER BY count DESC
LIMIT 20;
```

#### 3. Check Moderation Queue

```sql
-- Ensure moderation queue isn't backing up
SELECT
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/3600) as avg_hours_waiting
FROM moderation_queue
GROUP BY status;
```

---

### Monthly Tasks

#### 1. RLS Policy Audit

Run the Supabase linter and review all findings:

```bash
# In your terminal
supabase db lint
```

Check for new tables without RLS:

```sql
SELECT
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  )
  AND tablename NOT LIKE 'pg_%';
```

#### 2. Review Edge Function Authorization

Verify all edge functions have appropriate JWT verification:

- Open `supabase/config.toml`
- Check `verify_jwt` settings for each function
- Ensure sensitive functions require authentication

#### 3. Dependency Security Updates

```bash
# Check for vulnerable dependencies
npm audit

# Update dependencies
npm update

# Review breaking changes before deploying
```

#### 4. Database Performance Check

```sql
-- Check for slow queries
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;
```

---

### Quarterly Tasks

#### 1. Comprehensive Security Review

- Review all RLS policies for correctness
- Audit user permissions and roles
- Check for data exposure in views/functions
- Review API endpoint security
- Test authentication flows

#### 2. Penetration Testing

Consider professional security testing for:

- Authentication bypass attempts
- Authorization vulnerabilities
- SQL injection vectors
- XSS vulnerabilities
- CSRF protections

#### 3. Backup Testing

```sql
-- Test database backup restoration
-- Document in incident response plan
-- Verify backup encryption
-- Test recovery time objectives (RTO)
```

#### 4. Security Documentation Review

- Update security policies
- Review incident response procedures
- Update team security training
- Document new threats and mitigations

---

## 🚨 Incident Response

### Security Incident Checklist

#### Immediate Response (First Hour)

1. **Identify the incident**
   - What data was accessed?
   - Which systems are affected?
   - Is the vulnerability still active?

2. **Contain the breach**
   - Disable affected endpoints
   - Revoke compromised credentials
   - Enable additional logging

3. **Document everything**
   - Timeline of events
   - Actions taken
   - Systems affected

#### Investigation Phase (Hours 1-24)

1. **Analyze the attack**

   ```sql
   -- Check for unauthorized access
   SELECT * FROM auth_logs
   WHERE timestamp > '[incident_start_time]'
   ORDER BY timestamp DESC;

   -- Review database changes
   SELECT * FROM moderation_logs
   WHERE created_at > '[incident_start_time]';
   ```

2. **Identify scope**
   - Number of users affected
   - Data types compromised
   - Attack vector and method

3. **Preserve evidence**
   - Export relevant logs
   - Take database snapshots
   - Document attack signatures

#### Remediation Phase (Days 1-7)

1. **Fix the vulnerability**
   - Deploy security patches
   - Update RLS policies
   - Strengthen authentication

2. **Monitor for recurrence**
   - Enhanced logging
   - Alerting rules
   - Continuous monitoring

3. **Notify affected users**
   - Transparent communication
   - Remediation steps
   - Security recommendations

#### Post-Incident Review (Week 2+)

1. **Root cause analysis**
   - How did it happen?
   - Why weren't controls effective?
   - What could prevent recurrence?

2. **Update security measures**
   - Implement new controls
   - Update documentation
   - Team training

3. **Regulatory compliance**
   - GDPR notification (if EU users affected)
   - Document compliance activities
   - Legal review

---

## 🔐 Security Hardening Checklist

### Database Security

- [ ] All tables have RLS enabled
- [ ] RLS policies tested with different user roles
- [ ] No public tables with sensitive data
- [ ] Views use `security_invoker` option
- [ ] Functions use appropriate `SECURITY DEFINER` sparingly
- [ ] Database passwords rotated regularly
- [ ] Connection pooling configured
- [ ] SSL/TLS enforced for connections

### API Security

- [ ] Rate limiting on all endpoints
- [ ] JWT expiration times appropriate
- [ ] Refresh token rotation enabled
- [ ] CORS properly configured
- [ ] Input validation on all endpoints
- [ ] Output sanitization
- [ ] Error messages don't leak information

### Application Security

- [ ] XSS prevention (no unsanitized user input in HTML)
- [ ] CSRF tokens on state-changing operations
- [ ] Secure session management
- [ ] Password complexity requirements
- [ ] Multi-factor authentication (consider for admins)
- [ ] Secure password reset flow
- [ ] Account lockout after failed attempts

### Infrastructure Security

- [ ] Environment variables properly secured
- [ ] Secrets rotation schedule
- [ ] Monitoring and alerting configured
- [ ] Backup encryption enabled
- [ ] Network security groups configured
- [ ] DDoS protection enabled
- [ ] CDN with WAF capabilities

---

## 📊 Security Metrics to Track

### Key Performance Indicators

```sql
-- Monthly security metrics query
WITH metrics AS (
  SELECT
    'Failed Login Attempts' as metric,
    COUNT(*) as value
  FROM auth_logs
  WHERE metadata.status = 401
    AND timestamp > NOW() - INTERVAL '30 days'

  UNION ALL

  SELECT
    'Rate Limit Violations',
    COUNT(*)
  FROM rate_limits
  WHERE count >= 50
    AND created_at > NOW() - INTERVAL '30 days'

  UNION ALL

  SELECT
    'Reports Filed',
    COUNT(*)
  FROM confession_reports
  WHERE created_at > NOW() - INTERVAL '30 days'

  UNION ALL

  SELECT
    'Content Moderated',
    COUNT(*)
  FROM moderation_logs
  WHERE created_at > NOW() - INTERVAL '30 days'
)
SELECT * FROM metrics;
```

### Alerting Thresholds

Set up alerts for:

- **Failed login rate** > 100 per hour
- **Rate limit hits** > 1000 per hour
- **Moderation queue** > 100 pending items
- **Database connections** > 80% of max
- **API error rate** > 5%
- **Response time** > 2 seconds (95th percentile)

---

## 🛠️ Security Tools & Resources

### Recommended Tools

1. **Database Security**
   - Supabase Database Linter (built-in)
   - pgAudit for audit logging
   - pg_stat_statements for query analysis

2. **Application Security**
   - npm audit for dependency scanning
   - ESLint security plugins
   - OWASP ZAP for penetration testing

3. **Monitoring**
   - Supabase Dashboard (built-in)
   - Sentry for error tracking
   - DataDog/New Relic for APM

### Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [PostgreSQL Security Documentation](https://www.postgresql.org/docs/current/security.html)

---

## 📝 Change Management

### Security-Sensitive Changes

Before deploying changes that affect:

- Authentication/Authorization
- RLS policies
- Edge function permissions
- API endpoints
- Data models

**Required Reviews:**

1. Security impact assessment
2. RLS policy verification
3. Test with multiple user roles
4. Review by senior developer
5. Document security implications

### Deployment Checklist

- [ ] Security review completed
- [ ] RLS policies tested
- [ ] Edge function auth verified
- [ ] Rate limits configured
- [ ] Input validation added
- [ ] Error handling doesn't leak info
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented

---

## 🎓 Security Training

### Team Training Topics

**For Developers:**

- Secure coding practices
- SQL injection prevention
- XSS and CSRF protection
- RLS policy design
- Secure API design

**For Moderators:**

- Content policy enforcement
- User privacy protection
- Incident reporting
- Suspicious activity identification

**For Admins:**

- Access control management
- Incident response procedures
- Compliance requirements
- Security monitoring

---

## 📞 Security Contacts

### Escalation Path

1. **Security Incident (P0)**
   - Immediate: Disable affected systems
   - Contact: Security team lead
   - Timeline: < 1 hour response

2. **Vulnerability Discovered (P1)**
   - Immediate: Document findings
   - Contact: Development lead
   - Timeline: < 4 hours response

3. **Security Question (P2)**
   - Document concern
   - Contact: Team lead
   - Timeline: < 24 hours response

---

## 📋 Compliance Requirements

### GDPR Compliance (EU Users)

- [ ] Privacy policy updated
- [ ] Cookie consent implemented
- [ ] Data export functionality
- [ ] Right to deletion implemented
- [ ] Data breach notification procedures
- [ ] Data processing agreements

### Data Retention

```sql
-- Cleanup old data per retention policy
-- Run monthly via cron job

-- Delete soft-deleted confessions older than 30 days
DELETE FROM confessions
WHERE deleted_at IS NOT NULL
  AND deleted_at < NOW() - INTERVAL '30 days';

-- Archive old analytics events (older than 1 year)
DELETE FROM analytics_events
WHERE created_at < NOW() - INTERVAL '1 year';

-- Clean expired rate limits
SELECT cleanup_expired_rate_limits();
```

---

## 🔄 Version History

| Version | Date       | Changes                            | Author               |
| ------- | ---------- | ---------------------------------- | -------------------- |
| 1.0     | 2025-10-18 | Initial security maintenance guide | Security Review Team |

---

**Last Updated:** October 18, 2025  
**Next Review:** January 18, 2026
