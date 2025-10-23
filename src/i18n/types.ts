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

  rate_limit_title: string;
  rate_limit_desc: string;
  rate_limit_remaining: string;
  rate_limit_reset_in: string;
  rate_limit_wait_message: string;
  system_rate_limit_exceeded: string;

  // Content Moderation
  content_warning_title: string;
  content_warning_detected: string;
  content_warning_continue: string;
  content_email: string;
  content_phone: string;
  content_address: string;
  content_banned: string;

  // Analytics
  analytics_best_times_desc: string;
}
