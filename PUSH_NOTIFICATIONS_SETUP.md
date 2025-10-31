# 🔔 Push Notifications Setup Guide

## Overview
This guide covers the complete setup of OneSignal Web Push notifications for Confess+ with automated cron jobs for daily, evening, and streak reminders.

---

## ✅ Prerequisites Completed

The following have been implemented in the codebase:

1. ✅ **Database Table**: `user_push_tokens` with RLS policies
2. ✅ **Edge Functions**: 
   - `send-push` - Core push notification sender
   - `cron-daily-notifications` - Daily morning reminders (7 AM)
   - `cron-night-notifications` - Evening reminders (7 PM)
   - `cron-streak-check` - Hourly streak warnings
3. ✅ **Client Integration**: OneSignal SDK with React hooks
4. ✅ **UI Components**: Push notification settings in Settings → Notifications
5. ✅ **i18n Support**: Complete translations for EN/ES/DE
6. ✅ **Stripe Integration**: VIP welcome push on subscription creation

---

## 🔧 Configuration Steps

### 1. OneSignal App Setup

1. Go to [OneSignal Dashboard](https://app.onesignal.com)
2. Create a new Web Push app or use existing
3. Get your credentials:
   - **App ID**: Found in Settings → Keys & IDs
   - **REST API Key**: Found in Settings → Keys & IDs

### 2. Environment Variables

The following secrets have been added to your Supabase project:

- `VITE_ONESIGNAL_APP_ID` - Your OneSignal App ID (public)
- `ONESIGNAL_REST_API_KEY` - Your OneSignal REST API Key (private)

These are already configured and ready to use.

### 3. OneSignal Configuration

In your OneSignal dashboard:

1. **Web Configuration**:
   - Go to Settings → Platforms → Web Push
   - Add your site URL (both dev and production)
   - Enable "My site is not fully HTTPS" if testing locally

2. **Typical Site Setup**:
   - Set "Site URL" to your production domain
   - Add localhost for development if needed

3. **Service Worker**: 
   - The service worker files are already in `/public/` folder
   - OneSignal will automatically detect them

---

## ⏰ Cron Jobs Configuration

### Automated Scheduling

The cron jobs are configured in `supabase/config.toml` but need to be scheduled in your Supabase database.

### Setting Up Cron Jobs

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Daily morning notifications (7 AM UTC)
SELECT cron.schedule(
  'daily-notifications',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://fxwvlbopvnjjjrzshqvw.supabase.co/functions/v1/cron-daily-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Evening notifications (7 PM UTC)
SELECT cron.schedule(
  'night-notifications',
  '0 19 * * *',
  $$
  SELECT net.http_post(
    url := 'https://fxwvlbopvnjjjrzshqvw.supabase.co/functions/v1/cron-night-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Streak check (every hour)
SELECT cron.schedule(
  'streak-check',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://fxwvlbopvnjjjrzshqvw.supabase.co/functions/v1/cron-streak-check',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

### Verify Cron Jobs

```sql
-- View all scheduled cron jobs
SELECT * FROM cron.job;

-- View cron job execution history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Unschedule a job if needed
SELECT cron.unschedule('job-name-here');
```

---

## 🧪 Testing

### Test Push Notification

1. Navigate to Settings → Notifications
2. Enable "Push Notifications" toggle
3. Grant permission when browser prompts
4. Click "Send Test Notification"
5. You should receive a test push

### Test Cron Functions Manually

You can trigger cron functions manually for testing:

```bash
# Test daily notifications
curl -X POST \
  'https://fxwvlbopvnjjjrzshqvw.supabase.co/functions/v1/cron-daily-notifications' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'

# Test night notifications
curl -X POST \
  'https://fxwvlbopvnjjjrzshqvw.supabase.co/functions/v1/cron-night-notifications' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'

# Test streak check
curl -X POST \
  'https://fxwvlbopvnjjjrzshqvw.supabase.co/functions/v1/cron-streak-check' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'
```

---

## 📊 Monitoring

### View Logs

Check edge function logs in your Lovable backend:

1. Click "View Backend" button in chat
2. Navigate to Edge Functions
3. Select the function to view logs

### Common Issues

**Push not received**:
- Check if user has enabled push in Settings
- Verify notification permission is granted
- Check browser console for OneSignal errors
- Verify `user_push_tokens` table has entries

**Cron not running**:
- Verify pg_cron extension is enabled
- Check cron.job table for scheduled jobs
- Review cron.job_run_details for execution logs
- Ensure service role key is correctly configured

**VIP welcome push not sent**:
- Verify Stripe webhook is configured
- Check edge function logs for `stripe-webhook-subscriptions`
- Ensure `send-push` function is deployed

---

## 🎯 Features Implemented

### Push Notifications
- ✅ OneSignal Web Push integration
- ✅ Service worker for background notifications
- ✅ Per-user targeting via external user IDs
- ✅ Token management in Supabase
- ✅ Settings UI with enable/disable toggle
- ✅ Test notification button

### Automated Reminders
- ✅ Daily morning reminders (7 AM UTC)
- ✅ Evening reflection prompts (7 PM UTC)
- ✅ Streak warning alerts (hourly check)
- ✅ Respects user notification preferences

### Stripe Integration
- ✅ VIP welcome push on subscription creation
- ✅ Automatic push when VIP tier activated

### Internationalization
- ✅ Full EN/ES/DE support
- ✅ Localized push notification titles and bodies
- ✅ Translated UI strings

---

## 🔐 Security

- All push tokens stored with RLS policies
- Service role access only for cron jobs
- User-specific token management
- No sensitive data in push payloads
- Proper authentication on all endpoints

---

## 📱 User Experience

1. **First Visit**: User sees push notification prompt in Settings
2. **Grant Permission**: Browser asks for notification permission
3. **Token Storage**: OneSignal Player ID saved to database
4. **Receive Notifications**: User gets automated reminders based on preferences
5. **Manage Settings**: User can enable/disable push anytime in Settings

---

## 🚀 Next Steps

1. Set up cron jobs using the SQL commands above
2. Test push notifications with test button
3. Verify Stripe webhook sends VIP welcome push
4. Monitor edge function logs for any issues
5. Adjust cron timings based on user timezone preferences (future enhancement)

---

## 📞 Support

For issues with:
- **OneSignal**: Check [OneSignal Docs](https://documentation.onesignal.com/docs/web-push-quickstart)
- **Supabase Cron**: Check [Supabase Cron Docs](https://supabase.com/docs/guides/database/extensions/pg_cron)
- **Edge Functions**: Use Lovable backend viewer to check logs

---

## 🎉 Success!

Your push notification system is now fully integrated with:
- Automated daily and night reminders
- Streak protection alerts
- VIP welcome notifications
- Complete multilingual support
- Fallback to local notifications when push unavailable
