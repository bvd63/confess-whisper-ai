# Automated Cron Jobs

## Overview
The system uses PostgreSQL cron jobs to automate maintenance tasks and keep data fresh.

## Active Cron Jobs

### 1. Daily Quote Rotation
**Schedule**: Every day at midnight UTC (00:00)
**Function**: `rotate-qotd`
**Purpose**: Rotates the quote of the day
```
Cron: 0 0 * * *
```

### 2. Soft Delete Cleanup
**Schedule**: Every Sunday at 2 AM UTC
**Function**: `cleanup-soft-deletes`
**Purpose**: Permanently removes soft-deleted records older than 30 days
```
Cron: 0 2 * * 0
```

### 3. Trending Confessions Refresh
**Schedule**: Every hour on the hour
**Purpose**: Refreshes materialized view for trending content
```
Cron: 0 * * * *
```

## Monitoring

### View Active Cron Jobs
```sql
SELECT * FROM cron.job;
```

### View Cron Job History
```sql
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

### View Cron Logs (Admin Only)
```sql
SELECT * FROM cron_job_logs 
ORDER BY executed_at DESC;
```

## Management

### Unschedule a Job
```sql
SELECT cron.unschedule('job-name');
```

### Update Schedule
```sql
-- First unschedule
SELECT cron.unschedule('rotate-daily-quote');

-- Then reschedule with new time
SELECT cron.schedule(
  'rotate-daily-quote',
  '0 6 * * *',  -- 6 AM instead of midnight
  $$ ... $$
);
```

## Troubleshooting

### Job Not Running?
1. Check if extension is enabled:
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

2. Check job status:
```sql
SELECT * FROM cron.job WHERE jobname = 'rotate-daily-quote';
```

3. Check recent runs:
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'rotate-daily-quote')
ORDER BY start_time DESC
LIMIT 5;
```

### Failed Jobs
Check logs for errors:
```sql
SELECT * FROM cron.job_run_details 
WHERE status = 'failed'
ORDER BY start_time DESC;
```

## Security Notes

- Cron jobs use the anon key (safe for public endpoints)
- Edge functions validate authentication internally
- Sensitive operations require admin role
- Job logs only viewable by admins

## Adding New Cron Jobs

1. Create the edge function
2. Add cron schedule via migration:
```sql
SELECT cron.schedule(
  'job-name',
  'cron-expression',
  $$
  SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/function-name',
    headers:='{"Authorization": "Bearer YOUR_KEY"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
```

3. Test manually:
```sql
SELECT cron.schedule(
  'test-job',
  '* * * * *',  -- every minute for testing
  $$ ... $$
);
```

4. Monitor for 1-2 runs, then adjust schedule

## Cron Expression Guide

```
* * * * *
│ │ │ │ │
│ │ │ │ └─ Day of week (0-7, Sunday=0 or 7)
│ │ │ └─── Month (1-12)
│ │ └───── Day of month (1-31)
│ └─────── Hour (0-23)
└───────── Minute (0-59)
```

Examples:
- `0 0 * * *` - Daily at midnight
- `0 */6 * * *` - Every 6 hours
- `0 9 * * 1` - Every Monday at 9 AM
- `*/15 * * * *` - Every 15 minutes
- `0 0 1 * *` - First day of every month
