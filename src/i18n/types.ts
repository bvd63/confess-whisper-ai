export interface Translations {
  // Common
  common_cancel: string;
  common_confirm: string;
  common_success: string;
  common_error: string;
  common_loading: string;

  // Auth
  auth_signin: string;
  auth_signout: string;
  auth_signup: string;
  auth_login: string;

  // Subscription
  subs_manage: string;
  subscription_upgrade: string;
  subscription_cancel: string;
  subscription_active: string;
  subscription_expired: string;
  subscription_trial: string;

  // Navigation
  nav_home: string;
  nav_confessions: string;
  nav_profile: string;

  // Confessions
  confession_anonymous: string;
  confession_submit: string;
  confession_content: string;

  // Errors
  error_generic: string;
  error_network: string;
  error_validation: string;

  // Rate Limiting
  rate_limit_remaining: string;
  rate_limit_reset_in: string;
  rate_limit_wait_message: string;
  rate_limit_title: string;
  system_rate_limit_exceeded: string;

  // Content Moderation
  content_warning_title: string;
  content_warning_detected: string;
  content_warning_continue: string;
  content_email: string;
  content_phone: string;
  content_address: string;
  content_banned: string;

  // Admin
  admin_performance: string;
  admin_performance_desc: string;
  admin_active_users: string;
  admin_last_5_minutes: string;
  admin_cache: string;
  admin_clear_cache: string;
  admin_confirm_clear: string;
  admin_clear_warning: string;
  cache_cleared: string;

  // Analytics
  analytics_engagement: string;
  analytics_engagement_desc: string;
  analytics_best_times: string;
  analytics_best_times_desc: string;
  views: string;
  likes: string;
  shares: string;

  // Quick Actions
  scroll_top: string;
  drafts: string;

  // Filters
  filters_title: string;
  filters_date: string;
  filters_community: string;
  filters_sort: string;
  filters_clear: string;
  sort_newest: string;
  sort_oldest: string;
  sort_most_liked: string;
  sort_most_commented: string;
}
