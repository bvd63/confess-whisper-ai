# Ops

## Trial expiry cron

- Workflow file: `.github/workflows/check-trial-expiry-cron.yml`
- Schedule: daily at **03:15 UTC** (`15 3 * * *`)
- Purpose: triggers the internal `check-trial-expiry` Edge Function so expired trials are deactivated and trial-only purchases are revoked.

### Required GitHub Actions secrets

Configure these in **GitHub repository settings -> Secrets and variables -> Actions**:

- `SUPABASE_URL` (example: `https://<project-ref>.supabase.co`)
- `SUPABASE_INTERNAL_SECRET` (must match `INTERNAL_JOB_SECRET` configured for Edge Functions)
