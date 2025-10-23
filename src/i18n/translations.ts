export type Language = 'en' | 'es' | 'de';

// Supported languages whitelist
export const SUPPORTED_LANGUAGES: Language[] = ['en', 'es', 'de'];

/**
 * Ensures the language code is supported, coercing to 'en' if not
 */
export function ensureLanguage(code: string | null | undefined): Language {
  if (!code) return 'en';
  const normalized = code.toLowerCase().slice(0, 2) as Language;
  return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : 'en';
}

/**
 * Safe translation helper with strict English fallback
 * Never returns mixed-language strings - falls back atomically to English
 */
export function getTranslation(
  key: keyof Translations,
  language: Language
): string {
  const translation = translations[language]?.[key];
  
  if (translation !== undefined) {
    return translation;
  }
  
  // Strict fallback to English
  const fallback = translations.en[key];
  
  // Log warning in development when fallback occurs
  if (import.meta.env.DEV && language !== 'en') {
    console.warn(
      `[i18n] Missing translation for key "${key}" in language "${language}". ` +
      `Falling back to English.`
    );
  }
  
  return fallback ?? key;
}

type Translations = {
  app_name: string;
  welcome_title: string;
  welcome_description: string;
  anonymous_secure: string;
  anonymous_description: string;
  ai_support: string;
  ai_description: string;
  get_started: string;
  skip: string;
  next: string;
  home_title: string;
  new_confession: string;
  vip_upgrade: string;
  placeholder_confession: string;
  submit: string;
  submitting: string;
  ai_reply_title: string;
  deep_insight_title: string;
  generate_insight: string;
  toast_sent: string;
  toast_flagged: string;
  error_generic: string;
  report: string;
  share: string;
  delete: string;
  language: string;
  profile: string;
  settings: string;
  logout: string;
  login: string;
  signup: string;
  confessions_count: string;
  insights_used: string;
  member_since: string;
  crisis_hint: string;
  
  // Error messages
  error_submit: string;
  error_delete: string;
  error_load: string;
  error_auth: string;
  
  // Success messages
  success_sent: string;
  success_deleted: string;
  success_reported: string;
  success_logout: string;
  
  // Validation
  validation_min: string;
  validation_max: string;
  
  // Deep Insight
  deep_insight_vip: string;
  deep_insight_description: string;
  deep_insight_success: string;
  insight_title: string;
  insight_run: string;
  insight_reset: string;
  insight_delete: string;
  
  // User Display
  user_anonymous: string;
  
  // Boost Confession
  boost_cta: string;
  boost_price: string;
  boost_active: string;
  boost_badge: string;
  boost_confirm: string;
  boost_expiry_in: string;
  boost_reboost: string;
  boost_not_enough: string;
  boost_error_active: string;
  
  // Subscription Management (new keys only)
  subscription_tier_free: string;
  subscription_tier_vip: string;
  subscription_cta_upgrade: string;
  subscription_downgrade: string;
  subscription_single_active_policy: string;
  subscription_already_subscribed: string;
  subscription_conflict_resolved_keep_new: string;
  subscription_conflict_resolved_keep_old: string;
  
  // VIP
  vip_member: string;
  vip_feature: string;
  vip_benefits: string;
  upgrade_now: string;
  
  // Actions
  delete_account: string;
  delete_account_description: string;
  delete_confirm: string;
  delete_warning: string;
  deleting: string;
  export_data: string;
  
  // Referral
  referral_title: string;
  referral_description: string;
  referral_earned: string;
  
  // Footer
  privacy_policy: string;
  terms_of_service: string;
  all_rights_reserved: string;
  
  // Achievements
  achievements_title: string;
  achievements_unlocked: string;
  achievement_first_confession: string;
  achievement_first_confession_desc: string;
  achievement_active_user: string;
  achievement_active_user_desc: string;
  achievement_power_user: string;
  achievement_power_user_desc: string;
  achievement_deep_thinker: string;
  achievement_deep_thinker_desc: string;
  achievement_vip_member: string;
  achievement_vip_member_desc: string;
  achievement_supporter: string;
  achievement_supporter_desc: string;
  
  // Feature Highlights
  feature_ai_empathy: string;
  feature_ai_empathy_desc: string;
  feature_anonymous: string;
  feature_anonymous_desc: string;
  feature_deep_insights: string;
  feature_deep_insights_desc: string;
  feature_instant_response: string;
  feature_instant_response_desc: string;
  
  // Error Boundary
  error_boundary_title: string;
  error_boundary_description: string;
  error_boundary_reload: string;
  error_boundary_home: string;
  
  // Referral
  referral_link_label: string;
  referral_friends_invited: string;
  referral_link_copied: string;
  referral_share_message: string;
  referral_reward_message: string;
  referral_continue_inviting: string;
  
  // Share
  share_title: string;
  share_copy_link: string;
  share_link_copied: string;
  share_text: string;
  
  // Social Stats
  stats_active_users: string;
  stats_confessions_shared: string;
  stats_empathetic_reactions: string;
  stats_vip_members: string;
  
  // Auth
  auth_welcome_back: string;
  auth_create_account: string;
  auth_email_placeholder: string;
  auth_password_placeholder: string;
  auth_logging_in: string;
  auth_creating_account: string;
  auth_login_button: string;
  auth_signup_button: string;
  auth_no_account: string;
  auth_signup_link: string;
  auth_have_account: string;
  auth_login_link: string;
  auth_benefits_title: string;
  auth_benefit_unlimited: string;
  auth_benefit_ai_responses: string;
  auth_benefit_community: string;
  auth_invalid_email: string;
  auth_password_min: string;
  auth_invalid_credentials: string;
  auth_email_exists: string;
  auth_welcome_message: string;
  auth_login_success: string;
  auth_signup_success: string;
  auth_error: string;
  auth_error_generic: string;
  auth_captcha_failed: string;
  auth_session_revoked: string;
  auth_all_sessions_revoked: string;
  auth_device_mismatch: string;
  auth_session_limit: string;
  auth_account_locked: string;
  auth_password_rules_title: string;
  auth_password_rules_len: string;
  auth_password_rules_upper: string;
  auth_password_rules_lower: string;
  auth_password_rules_digit: string;
  auth_password_rules_special: string;
  auth_password_match_ok: string;
  auth_password_match_fail: string;
  auth_password_strength_weak: string;
  auth_password_strength_fair: string;
  auth_password_strength_good: string;
  auth_password_strength_strong: string;
  auth_stay_signed_in: string;
  auth_confirm_password_placeholder: string;
  auth_show_password: string;
  auth_hide_password: string;
  auth_password_too_short: string;
  auth_password_weak: string;
  auth_validation_passed: string;
  auth_success: string;
  
  // Password Reset
  passwordReset_title: string;
  passwordReset_emailSent: string;
  passwordReset_emailPlaceholder: string;
  passwordReset_submitButton: string;
  passwordReset_loading: string;
  
  // Common
  common_success: string;
  common_something_went_wrong: string;
  common_unauthorized: string;
  common_rate_limit: string;
  
  // UI General
  ui_recent: string;
  ui_popular: string;
  ui_loading: string;
  ui_safe_space: string;
  ui_share_thoughts: string;
  ui_safe_description: string;
  ui_no_confessions: string;
  ui_first_confession_desc: string;
  ui_upgrading: string;
  ui_payment_redirect: string;
  ui_welcome_vip: string;
  ui_vip_access: string;
  ui_help_question: string;
  ui_help_choose: string;
  ui_help_reply_time: string;
  ui_pull_to_refresh: string;
  ui_release_to_refresh: string;
  ui_refreshing: string;
  
  // Subscription Plans
  subscription_vip_title: string;
  subscription_choose_plan: string;
  subscription_monthly: string;
  subscription_yearly: string;
  subscription_per_month: string;
  subscription_per_year: string;
  subscription_save_percent: string;
  subscription_most_popular: string;
  subscription_subscribe: string;
  subscription_subscribe_yearly: string;
  subscription_processing: string;
  subscription_cancel_anytime: string;
  subscription_cancel_confirm: string;
  subscription_benefit_1: string;
  subscription_benefit_2: string;
  subscription_benefit_3: string;
  subscription_benefit_4: string;
  subscription_benefit_5: string;
  subscription_auth_required: string;
  subscription_error: string;
  
  // Subscription Plans - New Benefits (Confession Limits)
  plans_free_benefit_confessions: string;
  plans_vip_benefit_confessions: string;
  plans_free_benefit_basic: string;
  plans_free_benefit_ads: string;
  plans_vip_benefit_unlimited_ai: string;
  plans_vip_benefit_no_ads: string;
  plans_vip_benefit_custom_themes: string;
  plans_vip_benefit_private_confessions: string;
  plans_vip_benefit_advanced_stats: string;
  plans_vip_benefit_special_badge: string;
  plans_vip_benefit_unlimited_ai_desc: string;
  plans_vip_benefit_priority_ai: string;
  plans_vip_benefit_priority_support: string;
  plans_vip_benefit_coins_bonus: string;
  plans_vip_benefit_login_rewards: string;
  plans_vip_benefit_images: string;
  plans_vip_benefit_stats: string;
  plans_vip_benefit_support: string;
  plans_vip_benefit_badge: string;
  plans_upgrade_now: string;
  plans_downgrade: string;
  plans_current_plan: string;
  plans_renews_on: string;
  plans_vip_activated: string;
  plans_vip_welcome: string;
  
  // Plan Titles and Tooltips
  plans_free_title: string;
  plans_free_tooltip: string;
  plans_vip_title: string;
  plans_vip_tooltip: string;
  
  // Paywall
  plans_paywall_title: string;
  plans_paywall_subtitle: string;
  
  // Trial System
  trial_offer_title: string;
  trial_offer_desc: string;
  trial_button_text: string;
  trial_already_used_title: string;
  trial_already_used_desc: string;
  trial_activated_title: string;
  trial_activated_desc: string;
  trial_activation_error: string;
  trial_banner_title: string;
  trial_banner_days_remaining: string;
  trial_banner_desc: string;
  trial_banner_cta: string;
  trial_banner_disclaimer: string;
  trial_error_used: string;
  trial_error_already_subscribed: string;
  trial_ended_toast: string;
  trial_purchase: string;
  
  // Confession Limits
  limit_reached_title: string;
  limit_reached_description: string;
  limit_current_plan: string;
  limit_used_today: string;
  limit_resets_in: string;
  limit_upgrade_benefits: string;
  limit_see_plans: string;
  limit_confessions_remaining: string;
  limit_confessions_unlimited: string;
  
  // Auth Captcha
  auth_captcha_required_after_fails: string;
  
  // Forgot / Reset Password
  auth_forgot_password: string;
  auth_forgot_password_title: string;
  auth_forgot_password_desc: string;
  auth_forgot_password_button: string;
  auth_forgot_password_success: string;
  auth_reset_password_title: string;
  auth_reset_password_desc: string;
  auth_reset_password_button: string;
  auth_reset_password_success: string;
  auth_reset_password_new: string;
  auth_reset_password_confirm: string;
  auth_reset_token_invalid: string;
  auth_reset_token_expired: string;
  auth_back_to_login: string;
  
  // Email Verification
  auth_verify_email_title: string;
  auth_verify_email_success: string;
  auth_verify_email_error: string;
  auth_verify_email_desc: string;
  auth_email_not_verified: string;
  auth_check_email_verify: string;
  
  // Common Actions
  common_close: string;
  
  // Trust Badges
  trust_anonymous: string;
  trust_anonymous_desc: string;
  trust_ssl: string;
  trust_ssl_desc: string;
  trust_moderation: string;
  trust_moderation_desc: string;
  trust_safe_community: string;
  trust_safe_community_desc: string;
  
  // Payment
  payment_canceled_title: string;
  payment_canceled_desc: string;
  payment_back_home: string;
  payment_try_again: string;
  payment_contact_help: string;
  payment_success_title: string;
  payment_success_desc: string;
  payment_success_deep_insights: string;
  payment_success_analysis: string;
  payment_success_priority: string;
  payment_success_explore: string;
  payment_redirect_info: string;
  
  // Profile
  profile_your_account: string;
  profile_subscription_active: string;
  profile_refresh_status: string;
  profile_discover_vip: string;
  profile_vip_description: string;
  profile_you_are_vip: string;
  profile_vip_thanks: string;
  profile_no_confessions: string;
  
  // User Confessions List
  ucl_no_confessions: string;
  
  // Common
  common_back: string;
  common_error: string;
  common_help_aria: string;
  common_theme_aria: string;
  common_view_all: string;
  
  // Search
  search_results: string;
  
  // Communities
  communities_trending: string;
  communities_all: string;
  communities_empty_title: string;
  communities_empty_description: string;
  
  // FAQ
  faq_title: string;
  faq_q1: string;
  faq_a1: string;
  faq_q2: string;
  faq_a2: string;
  faq_q3: string;
  faq_a3: string;
  faq_q4: string;
  faq_a4: string;
  faq_q5: string;
  faq_a5: string;
  faq_q6: string;
  faq_a6: string;
  faq_q7: string;
  faq_a7: string;
  faq_q8: string;
  faq_a8: string;
  
  // Settings
  settings_title: string;
  settings_manage: string;
  settings_export_data: string;
  settings_export_desc: string;
  settings_privacy_view: string;
  settings_delete_warning: string;
  settings_data_exported: string;
  settings_export_error: string;
  
  // Profile Page
  profile_verifying: string;
  
  // Privacy Policy
  privacy_title: string;
  privacy_section_1: string;
  privacy_section_1_text: string;
  privacy_section_1_list: string;
  privacy_section_2: string;
  privacy_section_2_text: string;
  privacy_section_3: string;
  privacy_section_3_text: string;
  privacy_section_4: string;
  privacy_section_4_text: string;
  privacy_section_5: string;
  privacy_section_5_text: string;
  privacy_section_5_list: string;
  privacy_section_6: string;
  privacy_section_6_text: string;
  privacy_section_7: string;
  privacy_section_7_text: string;
  privacy_last_updated: string;
  
  // Terms of Service
  terms_title: string;
  terms_section_1: string;
  terms_section_1_text: string;
  terms_section_2: string;
  terms_section_2_text: string;
  terms_section_2_list: string;
  terms_section_3: string;
  terms_section_3_text: string;
  terms_section_3_list: string;
  terms_section_4: string;
  terms_section_4_text: string;
  terms_section_5: string;
  terms_section_5_text: string;
  terms_section_6: string;
  terms_section_6_text: string;
  terms_section_7: string;
  terms_section_7_text: string;
  terms_section_8: string;
  terms_section_8_text: string;
  terms_last_updated: string;
  
  // Index Page
  index_no_confessions_title: string;
  index_no_confessions_desc: string;
  
  // Not Found Page
  notfound_404: string;
  notfound_title: string;
  notfound_return_home: string;
  
  // Categories
  category_relationships: string;
  category_work: string;
  category_family: string;
  category_health: string;
  category_money: string;
  category_other: string;
  select_category: string;
  filter_by_category: string;
  all_categories: string;
  
  // Analytics
  analytics_title: string;
  analytics_total_confessions: string;
  analytics_total_likes: string;
  analytics_most_popular: string;
  analytics_by_category: string;
  analytics_no_data: string;
  
  // Comments
  comments_title: string;
  comments_add: string;
  comments_placeholder: string;
  comments_submit: string;
  comments_delete: string;
  comments_edit: string;
  comments_none: string;
  comments_show: string;
  comments_hide: string;
  
  // Notifications
  notifications_title: string;
  notifications_mark_read: string;
  notifications_mark_all_read: string;
  notifications_delete: string;
  notifications_delete_all: string;
  notifications_delete_confirm: string;
  notifications_delete_all_confirm: string;
  notifications_marked_read: string;
  notifications_deleted: string;
  notifications_all_deleted: string;
  notifications_none: string;
  notification_like: string;
  notification_comment: string;
  notification_new: string;
  notification_message_prefix: string;
  notification_message_new: string;
  notification_view: string;
  
  // Bookmarks
  bookmarks_title: string;
  bookmarks_add: string;
  bookmarks_remove: string;
  bookmarks_none: string;
  bookmarks_saved: string;
  bookmarks_empty_state: string;
  bookmarks_empty_description: string;
  
  // Profile Analytics
  profile_title: string;
  profile_nickname_change_restricted: string;
  profile_nickname_cooldown_message: string;
  profile_nickname_days_remaining_singular: string;
  profile_nickname_days_remaining_plural: string;
  profile_nickname_change_available: string;
  profile_nickname_updated: string;
  profile_nickname_update_success: string;
  profile_settings_updated: string;
  profile_settings_update_success: string;
  profile_nickname_empty_error: string;
  profile_update_error: string;
  profile_my_confessions: string;
  profile_statistics: string;
  profile_total_confessions: string;
  profile_total_likes: string;
  profile_total_comments: string;
  profile_empty_state: string;
  profile_empty_description: string;
  profile_email_label: string;
  profile_change_password: string;
  profile_current_password: string;
  profile_new_password: string;
  profile_confirm_password: string;
  profile_password_changed: string;
  profile_password_cooldown: string;
  profile_password_mismatch: string;
  profile_password_weak: string;
  profile_password_same: string;
  profile_hours_remaining: string;
  
  achievement_new_badge: string;
  
  system_error_occurred: string;
  system_rate_limit_exceeded: string;
  system_service_unavailable: string;
  system_network_error: string;
  system_timeout_error: string;
  system_validation_error: string;
  system_loading: string;
  system_retrying: string;
  system_cache_cleared: string;
  validation_content_min: string;
  validation_content_max: string;
  validation_email_invalid: string;
  validation_password_min: string;
  validation_password_requirements: string;
  validation_nickname_min: string;
  validation_nickname_max: string;
  validation_nickname_format: string;
  validation_required_field: string;
  validation_invalid_url: string;
  validation_max_length: string;
  performance_cache_hit: string;
  performance_cache_miss: string;
  performance_slow_query: string;
  performance_optimizing: string;
  
  daily_prompt_title: string;
  daily_prompt_share: string;
  
  // Confession Header
  confession_anonymous: string;
  time_now: string;
  time_minutes: string;
  time_hours: string;
  time_days: string;
  
  // Word Cloud
  wordcloud_title: string;
  wordcloud_used_times: string;
  wordcloud_based_on: string;
  
  // SEO
  seo_default_title: string;
  seo_default_description: string;
  seo_default_keywords: string;
  seo_app_name: string;
  
  // Search
  search_placeholder: string;
  search_button: string;
  search_clear_filters: string;
  search_category_label: string;
  search_sort_label: string;
  search_period_label: string;
  search_all_categories: string;
  search_anytime: string;
  search_today: string;
  search_this_week: string;
  search_this_month: string;
  search_most_recent: string;
  search_most_popular: string;
  search_trending: string;
  
  // Blocked Users
  blocked_users_title: string;
  blocked_user_unblocked: string;
  blocked_user_unblocked_desc: string;
  blocked_users_error: string;
  blocked_users_none: string;
  blocked_users_anonymous: string;
  blocked_on: string;
  
  // Follow
  follow_now_following: string;
  follow_now_following_desc: string;
  follow_error: string;
  follow_error_desc: string;
  
  // Daily Rewards
  reward_daily_title: string;
  reward_daily_desc: string;
  reward_claim: string;
  reward_claimed: string;
  reward_claimed_desc: string;
  
  // VIP Teasers
  teaser_feature: string;
  teaser_description: string;
  teaser_unlock: string;
  teaser_explore_feature: string;
  teaser_explore_description: string;
  
  // Feature Comparison
  comparison_title: string;
  comparison_feature: string;
  comparison_daily_confessions: string;
  comparison_ai_responses: string;
  comparison_deep_insights: string;
  comparison_analytics: string;
  comparison_boost: string;
  comparison_priority_support: string;
  comparison_custom_badge: string;
  comparison_unlimited: string;
  comparison_upgrade_now: string;
  
  // Trending Hashtags
  hashtags_trending: string;
  
  // Install Prompt
  install_app: string;
  install_app_description: string;
  install: string;
  not_now: string;
  
  // Onboarding
  onboarding_anonymous_desc: string;
  onboarding_social_title: string;
  onboarding_social_desc: string;
  onboarding_messages_title: string;
  onboarding_messages_desc: string;
  onboarding_ai_title: string;
  onboarding_ai_desc: string;
  onboarding_welcome_title: string;
  onboarding_welcome_desc: string;
  onboarding_privacy_title: string;
  onboarding_privacy_desc: string;
  onboarding_terms_desc: string;
  
  // Network Status
  network_offline: string;
  network_syncing: string;
  
  // Common (continued)
  common_continue: string;
  
  // Mood Tracker
  mood_how_feeling: string;
  mood_intensity: string;
  mood_happy: string;
  mood_sad: string;
  mood_anxious: string;
  mood_angry: string;
  mood_neutral: string;
  mood_hopeful: string;
  
  // Badges (DB badges translations)
  badge_first_confession: string;
  badge_first_confession_desc: string;
  badge_regular_confessor: string;
  badge_regular_confessor_desc: string;
  badge_veteran: string;
  badge_veteran_desc: string;
  badge_popular: string;
  badge_popular_desc: string;
  badge_influencer: string;
  badge_influencer_desc: string;
  badge_fire_week: string;
  badge_fire_week_desc: string;
  badge_perfect_month: string;
  badge_perfect_month_desc: string;
  badge_anniversary: string;
  badge_anniversary_desc: string;
  badge_active_commenter: string;
  badge_active_commenter_desc: string;
  badge_sharer: string;
  badge_sharer_desc: string;
  badge_avid_reader: string;
  badge_avid_reader_desc: string;
  badge_collector: string;
  badge_collector_desc: string;
  badge_night_owl: string;
  badge_night_owl_desc: string;
  badge_social_butterfly: string;
  badge_social_butterfly_desc: string;
  badge_viral_confession: string;
  badge_viral_confession_desc: string;
  
  // Report Dialog
  report_title: string;
  report_description: string;
  report_reason_label: string;
  report_reason_spam: string;
  report_reason_harassment: string;
  report_reason_hate_speech: string;
  report_reason_violence: string;
  report_reason_adult_content: string;
  report_reason_misinformation: string;
  report_reason_personal_info: string;
  report_reason_other: string;
  report_details_label: string;
  report_details_placeholder: string;
  report_select_reason_error: string;
  report_already_reported_title: string;
  report_already_reported_desc: string;
  report_submit_success_desc: string;
  report_submit_error_desc: string;
  report_submitting: string;
  report_submit_button: string;
  
  // Comment Thread
  comments_reply_placeholder: string;
  comments_reply_button: string;
  comments_send_button: string;
  comments_reply_added_desc: string;
  comments_too_long_error: string;
  
  // Follow
  follow_cannot_self_desc: string;
  follow_unfollowed_title: string;
  follow_unfollowed_desc: string;
  
  // Help
  help_user_guide_title: string;
  help_user_guide_desc: string;
  help_view_guide: string;
  help_faq_title: string;
  help_faq_desc: string;
  help_view_faq: string;
  help_contact_title: string;
  help_contact_desc: string;
  help_send_email: string;
  help_dialog_title: string;
  help_dialog_desc: string;
  help_response_time: string;
  
  // Streak Reminder
  streak_reminder_text: string;
  streak_post_now: string;
  streak_keep_your_streak: string;
  
  // Draft Manager
  draft_deleted: string;
  draft_deleted_desc: string;
  draft_delete_error_desc: string;
  drafts_saved: string;
  
  // Export Data
  export_title: string;
  export_description: string;
  export_format: string;
  export_what: string;
  export_my_comments: string;
  export_my_likes: string;
  export_my_bookmarks: string;
  export_download: string;
  export_downloading: string;
  export_success: string;
  export_success_desc: string;
  
  // Coins Display
  coins_title: string;
  coins_current_balance: string;
  coins_total_earned: string;
  coins_history: string;
  coins_how_to_earn: string;
  coins_per_confession_detail: string;
  coins_per_confession_new: string;
  coins_no_transactions: string;
  coins_all_transactions: string;
  coins_confession_created: string;
  coins_how_to_spend: string;
  coins_polish_detail: string;
  coins_boost_detail: string;
  coins_flairs_detail: string;
  badge_expires_in: string;
  badge_expired: string;
  badge_active_for: string;
  buy_again: string;
  days: string;
  hours: string;
  referral_reward_referrer: string;
  referral_reward_referred: string;
  first_confession_bonus: string;
  
  // Boost Confession
  boost_confession: string;
  boost_success_title: string;
  boost_success_description: string;
  boost_error: string;
  boost_confirmation_description: string;
  boost_cost: string;
  boost_now: string;
  
  // Profile Customization
  customize_profile: string;
  themes: string;
  badges: string;
  theme_default: string;
  theme_ocean: string;
  theme_sunset: string;
  theme_forest: string;
  theme_galaxy: string;
  theme_royal: string;
  badge_star: string;
  badge_fire: string;
  badge_heart: string;
  badge_rocket: string;
  badge_gem: string;
  badge_crown: string;
  owned: string;
  purchase_for: string;
  purchase_theme_success: string;
  purchase_badge_success: string;
  equip_theme_success: string;
  equip_badge_success: string;
  customization_error: string;
  insufficient_coins: string;
  
  // Engagement Features
  highlight_comment: string;
  highlight_comment_description: string;
  highlight_comment_success_title: string;
  highlight_comment_success_description: string;
  highlight_comment_error: string;
  highlight_comment_features: string;
  highlight_comment_feature_1: string;
  highlight_comment_feature_2: string;
  highlight_comment_feature_3: string;
  highlight_comment_cost: string;
  highlight_now: string;
  ai_makeover: string;
  ai_makeover_description: string;
  ai_makeover_features: string;
  ai_makeover_feature_1: string;
  ai_makeover_feature_2: string;
  ai_makeover_feature_3: string;
  ai_makeover_feature_4: string;
  ai_makeover_cost: string;
  ai_makeover_error: string;
  ai_makeover_applied_title: string;
  ai_makeover_applied_description: string;
  original_content: string;
  improved_content: string;
  edit_improved_content: string;
  generate_makeover: string;
  apply_changes: string;
  applying: string;
  custom_background: string;
  custom_background_description: string;
  background_applied_title: string;
  background_applied_description: string;
  background_error: string;
  your_balance: string;
  coins: string;
  free: string;
  current: string;
  already_applied: string;
  cost: string;
  apply_background: string;
  
  // Polish Confession
  polish_confession: string;
  polishing: string;
  polish_success_title: string;
  polish_success_description: string;
  polish_error: string;
  polish_empty_error: string;
  
  // Flairs Shop
  flairs_shop: string;
  flair_shop_description: string;
  flair_purchased_title: string;
  flair_purchased_description: string;
  flair_purchase_error: string;
  flair_equipped: string;
  equipped: string;
  equip: string;
  shop_free_tier: string;
  shop_vip_tier: string;
  shop_empty: string;
  shop_buy: string;
  shop_open: string;
  rarity_common: string;
  rarity_uncommon: string;
  rarity_rare: string;
  rarity_epic: string;
  rarity_legendary: string;
  
  // Flair Names
  flair_star: string;
  flair_fire: string;
  flair_heart: string;
  flair_crown: string;
  flair_sparkles: string;
  flair_diamond: string;
  flair_trophy: string;
  flair_rocket: string;
  flair_rainbow: string;
  flair_unicorn: string;
  flair_moon: string;
  
  // UI General Additions
  loading: string;
  success: string;
  cancel: string;
  processing: string;
  
  // Nickname & User Search
  nickname_label: string;
  nickname_placeholder: string;
  nickname_update: string;
  nickname_updated: string;
  nickname_error: string;
  nickname_taken: string;
  nickname_invalid: string;
  nickname_cooldown: string;
  
  // Common
  common_anonymous: string;
  
  // Nickname validation
  validation_nickname_too_short: string;
  validation_nickname_too_long: string;
  validation_nickname_invalid_chars: string;
  validation_nickname_invalid_underscores: string;
  validation_nickname_double_underscores: string;
  validation_nickname_reserved: string;
  validation_nickname_not_available: string;
  nickname_days_remaining: string;
  nickname_current: string;
  nickname_visibility: string;
  nickname_public_desc: string;
  nickname_private_desc: string;
  settings_updated: string;
  search_users: string;
  search_users_placeholder: string;
  no_users_found: string;
  
  // Messages
  messages_title: string;
  messages_new: string;
  messages_send: string;
  messages_type_message: string;
  messages_no_conversations: string;
  messages_start_conversation: string;
  messages_conversation_with: string;
  messages_delete_confirm: string;
  messages_deleted: string;
  messages_delete_conversation: string;
  messages_delete_conversation_confirm: string;
  messages_delete_conversation_title: string;
  messages_retry: string;
  messages_input_placeholder: string;
  messages_empty: string;
  messages_seen: string;
  messages_delivered: string;
  messages_sent: string;
  messages_typing: string;
  messages_reaction_add: string;
  messages_reaction_remove: string;
  
  // Bottom Navigation
  nav_home: string;
  nav_explore: string;
  nav_messages: string;
  nav_profile: string;
  
  // Profile
  profile_posts: string;
  profile_followers: string;
  profile_following: string;
  profile_follows_you: string;
  profile_follow: string;
  profile_unfollow: string;

  // Explore - Search Users
  explore_search_card_title: string;
  explore_search_card_placeholder: string;
  explore_search_card_follow: string;
  explore_search_card_unfollow: string;
  explore_search_card_message: string;
  explore_search_card_no_results: string;

  // Home - Communities
  home_communities_title: string;
  home_communities_join: string;
  home_communities_leave: string;
  
  // Following Feed
  following_feed_loading: string;
  following_feed_start: string;
  
  // Image Upload
  image_invalid_file: string;
  image_invalid_file_desc: string;
  image_too_large: string;
  image_uploading: string;
  image_add_optional: string;
  
  // Moderation Panel
  moderation_no_permissions: string;
  moderation_loading: string;
  moderation_keep: string;
  moderation_delete: string;
  moderation_cancel: string;
  
  // User Preferences
  preferences_saving: string;
  preferences_save: string;
  
  // Subscription
  subscription_active_plan: string;
  subscription_choose: string;
  subscription_title: string;
  subscription_description: string;
  subscription_plan_free: string;
  subscription_plan_vip: string;
  subscription_manage: string;
  subscription_upgrade: string;
  upgrade_required: string;
  required: string;
  subscription_feature_unlimited_ai: string;
  subscription_feature_advanced_analytics: string;
  subscription_feature_exclusive_badges: string;
  subscription_feature_no_ads: string;
  subscription_feature_priority_moderation: string;
  subscription_feature_image_confessions: string;
  subscription_feature_detailed_stats: string;
  subscription_feature_priority_support: string;
  subscription_feature_vip_badge: string;
  
  // Trial & Subscription Management
  trial_cta_title: string;
  trial_cta_desc: string;
  trial_cta_button: string;
  trial_cta_disclaimer: string;
  trial_active: string;
  subs_manage: string;
  subs_cancel: string;
  subs_upgrade: string;
  subs_downgrade: string;
  coins_bonus_vip: string;
  shop_badge_price_free: string;
  shop_badge_price_vip: string;
  
  // Manage Subscription Dialog
  subs_manage_title: string;
  subs_manage_currentPlan: string;
  subs_manage_renews: string;
  subs_manage_trialEnds: string;
  subs_action_upgrade: string;
  subs_action_downgrade: string;
  
  // Subscription Flow Messages
  payment_processing_wait: string;
  upgrade_processing_now: string;
  upgrade_success: string;
  downgrade_scheduled_next_period: string;
  cancel_scheduled: string;
  processing_request: string;
  request_done: string;
  upgradeFailed: string;
  webhookLag: string;
  already_on_this_plan: string;
  invalid_target_plan: string;
  subs_action_cancel: string;
  subs_action_cancelNow: string;
  subs_action_cancelAtPeriodEnd: string;
  subs_action_cancelTrial: string;
  subs_action_reactivate: string;
  subs_confirm_title: string;
  subs_confirm_upgrade: string;
  subs_confirm_downgrade: string;
  subs_confirm_cancel_periodEnd: string;
  subs_confirm_cancel_now: string;
  subs_confirm_reactivate: string;
  subs_confirm_cancel: string;
  subs_confirm_change_to_vip: string;
  subs_cancel_immediate: string;
  subs_cancel_at_period_end: string;
  subs_toast_success: string;
  subs_toast_change_success: string;
  subs_toast_cancel_success: string;
  subs_toast_cancel_now_success: string;
  subs_toast_reactivate_success: string;
  subs_note_inline: string;
  common_cancel: string;
  subs_status_cancels: string;
  subs_full_management: string;
  subs_portal_description: string;
  subs_open_portal: string;
  subs_quick_actions: string;
  subs_portal_opening: string;
  subs_portal_failed: string;
  subs_action_buy: string;
  subs_action_change: string;
  subs_confirm_buy: string;
  subs_toast_buy_success: string;
  subs_buy_select_plan: string;
  subs_buy_trial_available: string;
  subs_error_already_subscribed: string;
  subs_error_no_trial: string;
  
  // Payment
  payment_view_profile: string;
  payment_redirecting: string;
  
  // Profile
  profile_portal_error: string;
  profile_portal_error_desc: string;
  
  // Moderation
  moderation_reject_title: string;
  moderation_reject_description: string;
  moderation_reason_placeholder: string;
  
  // Analytics
  analytics_confessions: string;
  analytics_average_per: string;
  
  // Coins
  coins_per_confession: string;
  
  // Confession actions
  confession_deleted: string;
  confession_your_confession: string;
  confession_reported_success: string;
  confession_report_error: string;
  
  // Draft
  draft_delete_error: string;

  // Font Size Control
  font_size_small: string;
  font_size_normal: string;
  font_size_large: string;
  font_size_xl: string;
  
  // Copy Text
  copy_text: string;
  text_copied: string;
  
  // Anonymous Badge
  anonymous_badge: string;
  identity_protected: string;
  
  // Offline Enhanced
  offline_mode: string;
  offline_message: string;
  
  // Haptic
  haptic_enabled: string;
  
  // Loading Quotes
  loading_quote_1: string;
  loading_quote_2: string;
  loading_quote_3: string;
  
  // Edit/Delete Windows
  edit_available: string;
  delete_available: string;
  edit_window_expired: string;
  
  // Theme
  theme_oled: string;
  
  // Export
  export_error: string;
  export_my_confessions: string;
  
  // Following
  following_load_error: string;
  following_start_following: string;
  following_count_confessions: string;
  
  // Image Upload
  image_added: string;
  image_upload_error: string;
  
  // Leaderboard
  leaderboard_confessions: string;
  leaderboard_reactions: string;
  
  // Moderation actions
  moderation_approved: string;
  moderation_rejected: string;
  moderation_marked: string;
  moderation_action_error: string;
  moderation_no_pending: string;
  moderation_no_reported: string;
  
  // Reactions
  reaction_update_error: string;
  reaction_heart: string;
  reaction_sad: string;
  reaction_strong: string;
  reaction_thinking: string;
  reaction_auth_required: string;
  reaction_auth_required_desc: string;
  
  // Streak
  streak_last_confession: string;
  
  // Subscription errors
  subscription_payment_error: string;
  subscription_portal_error: string;
  
  // Preferences
  preferences_save_error: string;
  
  // Comment Thread
  comment_reply_error: string;
  
  // Analytics
  analytics_activity_7days: string;
  
  // Subscription
  subscription_billed_yearly: string;
  subscription_plan_unavailable: string;
  subscription_yearly_discount: string;
  subscription_thanks: string;
  subscription_upgrade_more: string;
  subscription_upgrade_vip: string;
  subscription_current_plan: string;
  subscription_your_plan: string;
  subscription_downgrade_to_free: string;
  subscription_change_to_plan: string;
  subscription_free: string;
  subscription_trial_available: string;
  
  // Subscription Benefits - Free
  subscription_benefits_free_confessions: string;
  subscription_benefits_free_basic_features: string;
  subscription_benefits_free_community_access: string;
  subscription_limitations_free_ads: string;
  subscription_limitations_free_limited_ai: string;
  subscription_limitations_free_basic_analytics: string;
  
  // Subscription Benefits - VIP
  subscription_benefits_vip_no_ads: string;
  subscription_benefits_vip_custom_themes: string;
  subscription_benefits_vip_private_confessions: string;
  subscription_benefits_vip_advanced_stats: string;
  subscription_benefits_vip_special_badge: string;
  subscription_benefits_vip_unlimited_ai: string;
  subscription_benefits_vip_priority_ai: string;
  subscription_benefits_vip_priority_support: string;
  subscription_benefits_vip_coins_bonus: string;
  subscription_benefits_vip_login_rewards: string;
  subscription_benefits_vip_unlimited_confessions: string;
  subscription_benefits_vip_detailed_statistics: string;
  subscription_benefits_vip_early_access: string;
  
  // Subscription Management (New keys for interval management)
  subscription_current_status: string;
  subscription_interval_monthly: string;
  subscription_interval_yearly: string;
  subscription_per_month_short: string;
  subscription_per_year_short: string;
  subscription_savings_badge: string;
  subscription_compare_plans: string;
  subscription_benefits_title: string;
  subscription_actions_change: string;
  subscription_actions_cancel: string;
  subscription_actions_reactivate: string;
  subscription_confirm_change_title: string;
  subscription_confirm_change_body: string;
  subscription_confirm_cancel_title: string;
  subscription_confirm_cancel_body_now: string;
  subscription_confirm_cancel_body_period_end: string;
  subscription_confirm_reactivate_title: string;
  subscription_status_active: string;
  subscription_status_canceled: string;
  subscription_status_trialing: string;
  subscription_status_past_due: string;
  subscription_errors_generic: string;
  subscription_errors_not_eligible: string;
  subscription_errors_requires_action: string;
  subscription_trial_countdown: string;
  subscription_trial_used: string;
  subscription_next_billing_date: string;
  subscription_cancel_ends_at: string;
  subscription_change_interval: string;
  subscription_change_success: string;
  subscription_cancel_success: string;
  subscription_reactivate_success: string;
  subscription_not_available: string;
  subscription_proration_info: string;
  subscription_downgrade_period_end: string;
  
  // Profile
  profile_achievements: string;
  profile_moods: string;
  profile_settings: string;
  profile_moderation: string;
  profile_plan_free: string;
  profile_plan_vip: string;
  
  // Referral
  referral_benefits: string;
  referral_benefit_coins: string;
  referral_benefit_friend: string;
  referral_benefit_badge: string;
  
  // Preferences
  preferences_customization: string;
  preferences_accent_color: string;
  preferences_text_size: string;
  preferences_size_small: string;
  preferences_size_medium: string;
  preferences_size_large: string;
  
  // Badges
  badges_your_badges: string;
  
  // Export
  export_my_data: string;
  
  // Moderation extras
  moderation_reject_desc: string;
  
  // Notifications extras
  notification_followed: string;
  notification_badge_earned: string;
  notification_streak_milestone: string;
  
  // Recommended
  recommended_read: string;
  
  // Referral extras
  referral_coins_earned: string;
  referral_your_code: string;
  
  // Various
  anonymous_user: string;
  leaderboard_top_this_week: string;
  recommended_for_you: string;
  badges_earned_on: string;
  
  // More UI texts
  analytics_category_distribution: string;
  error_something_wrong: string;
  error_unexpected: string;
  error_try_again_desc: string;
  error_reload_page: string;
  error_retry: string;
  ui_previous: string;
  ui_next: string;
  ui_toggle_sidebar: string;
  ui_image_preview: string;
  ui_confession_image: string;
  ui_following_feed: string;
  ui_close: string;
  ui_previous_slide: string;
  ui_next_slide: string;
  follow_connections: string;
  follow_following: string;
  follow_followers: string;
  mood_distribution: string;
  mood_intensity_evolution: string;
  rate_limit_title: string;
  rate_limit_desc: string;
  rate_limit_remaining: string;
  rate_limit_reset_in: string;
  rate_limit_wait_message: string;
  moderation_action_done: string;
  moderation_action_approved: string;
  moderation_action_rejected: string;
  moderation_action_marked: string;
  moderation_error_action: string;
  moderation_panel_title: string;
  moderation_role_admin: string;
  moderation_role_moderator: string;
  moderation_reports_title: string;
  referral_program_title: string;
  referral_completed: string;
  deep_insight_your_confession: string;
  moderation_pending_count: string;
  moderation_approve: string;
  moderation_reported_count: string;
  moderation_reason_optional: string;
  referral_link_copied_toast: string;
  referral_link_copied_desc: string;
  referral_pending: string;
  streak_your: string;
  streak_consecutive_days: string;
  streak_personal_best: string;
  subscription_payment_error_desc: string;
  preferences_color_green: string;
  preferences_color_red: string;
  preferences_color_orange: string;
  preferences_color_violet: string;
  preferences_color_blue: string;
  preferences_color_pink: string;
  following_your_feed: string;
  index_back_to_feed: string;
  moderation_category_label: string;
  
  // Instagram-style Social
  explore: string;
  compose: string;
  type_message_placeholder: string;
  send_message_button: string;
  message_sent_toast: string;
  message_failed_toast: string;
  retry_send: string;
  delete_message_action: string;
  delete_message_confirm_text: string;
  read_receipt_status: string;
  unread_count_badge: string;
  message_thread_title: string;
  user_is_typing: string;
  users_are_typing: string;
  
  // Profile Header
  posts_count: string;
  followers_count: string;
  following_count: string;
  message_user_button: string;
  edit_profile: string;
  profile_bio: string;
  profile_bio_placeholder: string;
  profile_handle: string;
  profile_avatar: string;
  profile_privacy_public: string;
  profile_privacy_limited: string;
  profile_privacy_private: string;
  profile_privacy_mode: string;
  
  // Quote of the Day
  qotd_title: string;
  qotd_loading: string;
  
  // Admin Panel
  admin_title: string;
  admin_moderation_queue: string;
  admin_reports: string;
  admin_no_items: string;
  admin_approve: string;
  admin_reject: string;
  admin_view_confession: string;
  
  // GDPR & Privacy  
  export_data_description_text: string;
  export_data_success_toast: string;
  export_data_failed_toast: string;
  delete_my_account_button: string;
  delete_account_warning_full: string;
  delete_account_confirm_dialog: string;
  account_deleted_toast: string;
  consent_management_title: string;
  view_consents_button: string;
  
  // Crisis Support
  crisis_support_title: string;
  crisis_message_text: string;
  crisis_hotline_label: string;
  crisis_chat_label: string;
  emergency_services_label: string;
  you_are_not_alone_message: string;
  
  // Safety & Moderation
  content_review_notice_title: string;
  content_blocked_title: string;
  moderation_reason_label: string;
  
  // Communities
  communities_title: string;
  communities_discover: string;
  communities_create: string;
  communities_category: string;
  communities_name: string;
  communities_description: string;
  communities_slug_label: string;
  communities_slug_placeholder: string;
  communities_icon: string;
  communities_private: string;
  communities_creating: string;
  communities_create_success: string;
  communities_create_error: string;
  communities_join: string;
  communities_leave: string;
  communities_members: string;
  communities_posts: string;
  communities_not_found: string;
  communities_back: string;
  communities_no_posts: string;
  communities_first_post: string;
  communities_recent: string;
  communities_create_confession: string;
  communities_filter_all: string;
  communities_filter_mental_health: string;
  communities_filter_relationships: string;
  communities_filter_work: string;
  communities_filter_general: string;
  
  // Location
  location_add: string;
  location_detecting: string;
  location_detected: string;
  location_error: string;
  location_error_permission: string;
  location_city: string;
  location_optional: string;
  location_community_optional: string;
  location_select_community: string;
  location_no_community: string;
  
  // Nearby Confessions
  nearby_title: string;
  nearby_discover: string;
  nearby_radius: string;
  nearby_within_km: string;
  nearby_list_view: string;
  nearby_map_view: string;
  nearby_map_coming_soon: string;
  nearby_no_location: string;
  nearby_enable_location: string;
  nearby_none_found: string;
  nearby_increase_radius: string;
  nearby_distance_km: string;
  
  // Quick Actions
  quick_action_new: string;
  quick_action_explore: string;
  quick_action_messages: string;
  quick_action_search: string;
  quick_action_communities: string;
  quick_action_nearby: string;
  
  // Profile Tiers
  profile_tiers_free: string;
  profile_tiers_vip: string;
  profile_tiers_expires: string;
  profile_tiers_benefits: string;
  
  // Perks System
  perks_title: string;
  perks_subscription_title: string;
  perks_badges_title: string;
  perks_badges_status_active: string;
  perks_badges_status_expired: string;
  perks_badges_status_hidden: string;
  perks_badges_make_public: string;
  perks_badges_make_private: string;
  perks_badges_set_featured: string;
  perks_badges_remove_featured: string;
  perks_badges_earned_on: string;
  perks_no_badges: string;
  
  // Shop
  shop_title: string;
  shop_required_plan_free: string;
  shop_required_plan_vip: string;
  shop_lock_vip: string;
  shop_purchase: string;
  shop_purchased: string;
  shop_expires_in: string;
  shop_expired: string;
  shop_active_for: string;
  shop_buy_again: string;
  shop_coins_balance: string;
  
  // Flair Names (Additional)
  flair_sparkle: string;
  flair_gem: string;
  flair_lightning: string;
  flair_magic: string;
  
  // Errors
  errors_plan_too_low: string;
  
  // Test-required keys (only adding missing ones)
  common_confirm: string;
  common_loading: string;
  auth_signin: string;
  auth_signout: string;
  auth_signup: string;
  auth_login: string;
  subscription_cancel: string;
  subscription_active: string;
  subscription_expired: string;
  subscription_trial: string;
  nav_confessions: string;
  confession_submit: string;
  confession_content: string;
  error_network: string;
  error_validation: string;
  
  // Coin System
  coins_balance: string;
  coins_get_more: string;
  coins_shop_title: string;
  coins_shop_subtitle: string;
  coins_best_value: string;
  coins_per_coin: string;
  coins_buy_now: string;
  coins_processing: string;
  coins_secure_payment: string;
  coins_instant_delivery: string;
  coins_satisfaction: string;
  coins_purchase_error: string;
  coins_purchase_success_title: string;
  coins_purchase_success_message: string;
  coins_purchase_cancelled_title: string;
  coins_purchase_cancelled_message: string;
  coins_go_home: string;
  coins_visit_store: string;
  coins_try_again: string;
  coins_most_popular: string;
  
  // Gift Coins
  coins_gift_title: string;
  coins_gift_amount: string;
  coins_gift_message: string;
  coins_gift_anonymous: string;
  coins_gift_anonymous_fee: string;
  coins_gift_platform_fee: string;
  coins_gift_total: string;
  coins_gift_send: string;
  coins_gift_success: string;
  coins_gift_insufficient: string;
  
  // Awards
  coins_award_title: string;
  coins_award_star: string;
  coins_award_heart: string;
  coins_award_fire: string;
  coins_award_diamond: string;
  coins_award_give: string;
  coins_award_success: string;
  coins_award_creator_earns: string;
  coins_award_appreciation: string;
  
  // Boosts
  coins_boost_title: string;
  coins_boost_basic: string;
  coins_boost_super: string;
  coins_boost_pin: string;
  coins_boost_activate: string;
  coins_boost_active: string;
  coins_boost_expires: string;
  coins_boost_description: string;
  coins_boost_duration: string;
  coins_boost_success: string;
  coins_boost_already_active: string;
  
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
  analytics_engagement: string;
  analytics_engagement_desc: string;
  analytics_best_times: string;
  views: string;
  likes: string;
  comments: string;
  shares: string;
  
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
  
  // Quick Actions
  scroll_top: string;
  drafts: string;
  confession_new: string;
  
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
  
  // Karma
  karma_points: string;
  karma_level: string;
  karma_next_level: string;
  karma_points_to_go: string;
  
  // Search Suggestions
  search_recent: string;
  search_clear: string;
  
  // Sensitive Content
  sensitive_content_warning: string;
  sensitive_content_description: string;
  sensitive_content_view: string;
};

export const translations: Record<Language, Translations> = {
  en: {
    app_name: "Confess+",
    welcome_title: "Welcome to Confess+",
    welcome_description: "A safe space where you can share anything anonymously.",
    anonymous_secure: "100% Anonymous & Secure",
    anonymous_description: "Your identity remains completely confidential. We don't store any personal information.",
    ai_support: "Empathetic AI Support",
    ai_description: "Get empathetic AI responses and, with VIP, deep psychological insights.",
    get_started: "Get Started",
    skip: "Skip",
    next: "Next",
    
    home_title: "Anonymous Confessions",
    new_confession: "New Confession",
    vip_upgrade: "Upgrade to VIP",
    
  placeholder_confession: "Share what's on your mind... (10-2000 characters)",
  submit: "Submit confession",
  submitting: "Submitting...",
    
    ai_reply_title: "AI Response",
    deep_insight_title: "Deep Insight",
    generate_insight: "Generate Deep Insight",
    insight_title: "Deep Insight",
    insight_run: "Run",
    insight_reset: "Reset",
    insight_delete: "Delete Insight",
    
    user_anonymous: "Anonymous",
    
    boost_cta: "Boost Confession",
    boost_price: "{price} coins",
    boost_active: "Boost active",
    boost_badge: "Boosted",
    boost_confirm: "Your confession was boosted for 24h.",
    boost_expiry_in: "Expires in {time}",
    boost_reboost: "Reboost",
    boost_not_enough: "Not enough coins to boost.",
    boost_error_active: "A boost is already active for this confession.",
    
  subscription_tier_free: "Free",
  subscription_tier_vip: "VIP",
  subscription_cta_upgrade: "Get a subscription",
  subscription_upgrade: "Upgrade",
  subscription_downgrade: "Downgrade",
  subscription_single_active_policy: "Only one active subscription is allowed. Use Upgrade, Downgrade or Cancel.",
  subscription_already_subscribed: "You already have a subscription. Use Upgrade, Downgrade, or Cancel.",
  subscription_conflict_resolved_keep_new: "Your plan was updated to the latest purchase and the old plan was canceled.",
  subscription_conflict_resolved_keep_old: "Your existing plan remains active; the new purchase was canceled.",
  upgrade_required: "Upgrade Required",
  required: "Required",
    
    toast_sent: "Your confession was sent anonymously 💭",
    toast_flagged: "Content not allowed. Please rephrase.",
    error_generic: "Something went wrong. Try again.",
    
    report: "Report",
    share: "Share",
    delete: "Delete",
    
    language: "Language",
    profile: "Profile",
    settings: "Settings",
    logout: "Logout",
    login: "Login",
    signup: "Sign Up",
    
    confessions_count: "confessions",
    insights_used: "insights used",
    member_since: "Member since",
    
    crisis_hint: "If you're in immediate danger, contact local emergency services.",
    
    error_submit: "Could not submit confession. Try again.",
    error_delete: "Could not delete confession.",
    error_load: "Could not load confessions.",
    error_auth: "You must be authenticated to post.",
    
    success_sent: "Your confession was sent! 💜",
    success_deleted: "Confession deleted successfully.",
    success_reported: "Report sent. We'll review this confession. Thank you!",
    success_logout: "Goodbye! 👋",
    
    validation_min: "Confession must be at least 10 characters",
    validation_max: "Confession cannot exceed 2000 characters",
    
    deep_insight_vip: "Deep Insight is only available for VIP users.",
    deep_insight_description: "Deep psychological analysis for complete understanding.",
    deep_insight_success: "Deep Insight generated! ✨",
    
    vip_member: "VIP Member",
    vip_feature: "VIP Feature",
    vip_benefits: "Unlimited Deep Insights, detailed responses, ad-free experience.",
    upgrade_now: "Upgrade Now",
    
    delete_account: "Delete Account",
    delete_account_description: "Permanently delete your account and all associated data",
    delete_confirm: "Delete Permanently",
    delete_warning: "This action cannot be undone. This will permanently delete your account and all data.",
    deleting: "Deleting...",
    export_data: "Export Data",
    
    referral_title: "Invite Friends",
    referral_description: "Earn rewards for each friend who signs up",
    referral_earned: "You earned {days} days of free VIP!",
    
    privacy_policy: "Privacy Policy",
    terms_of_service: "Terms of Service",
    all_rights_reserved: "All rights reserved.",
    
    // Categories
    category_relationships: "Relationships",
    category_work: "Work",
    category_family: "Family",
    category_health: "Health",
    category_money: "Money",
    category_other: "Other",
    select_category: "Select a category",
    filter_by_category: "Filter by category",
    all_categories: "All Categories",
    
    // Analytics
    analytics_title: "Your Stats",
    analytics_total_confessions: "Total Confessions",
    analytics_total_likes: "Likes Received",
    analytics_most_popular: "Most Popular",
    analytics_by_category: "By Category",
    analytics_no_data: "No data yet",
    
    // Comments
    comments_title: "Comments",
    comments_add: "Add a comment",
    comments_placeholder: "Write your comment... (max 500 characters)",
    comments_submit: "Post",
    comments_delete: "Delete",
    comments_edit: "Edit",
    comments_none: "No comments yet",
    comments_show: "Show comments",
    comments_hide: "Hide comments",
    
    // Notifications
    notifications_title: "Notifications",
    notifications_mark_read: "Mark all as read",
    notifications_mark_all_read: "Mark all as read",
    notifications_delete: "Delete notification",
    notifications_delete_all: "Delete all",
    notifications_delete_confirm: "Are you sure you want to delete this notification?",
    notifications_delete_all_confirm: "This will delete all your notifications. This action cannot be undone.",
    notifications_marked_read: "All marked as read",
    notifications_deleted: "Notification deleted",
    notifications_all_deleted: "All notifications deleted",
    notifications_none: "No notifications",
    notification_like: "liked your confession",
    notification_comment: "commented on your confession",
    notification_new: "New",
    notification_message_prefix: "New message:",
    notification_message_new: "New message",
    notification_view: "View",
    
    // Bookmarks
    bookmarks_title: "Saved",
    bookmarks_add: "Save",
    bookmarks_remove: "Remove",
    bookmarks_none: "No saved confessions",
    bookmarks_saved: "Saved to bookmarks",
    bookmarks_empty_state: "No bookmarks yet",
    bookmarks_empty_description: "Start bookmarking confessions to see them here",
    
    // Profile Analytics
    profile_title: "Profile",
    profile_nickname_change_restricted: "Nickname Change Restricted",
    profile_nickname_cooldown_message: "You can change your nickname again in {days} day{plural}",
    profile_nickname_days_remaining_singular: "You can change your nickname again in {days} day",
    profile_nickname_days_remaining_plural: "You can change your nickname again in {days} days",
    profile_nickname_change_available: "You can change your nickname now",
    profile_nickname_updated: "Nickname Updated",
    profile_nickname_update_success: "Your nickname has been updated successfully",
    profile_settings_updated: "Settings Updated",
    profile_settings_update_success: "Your settings have been saved successfully",
    profile_nickname_empty_error: "Nickname cannot be empty",
    profile_update_error: "Failed to update profile",
    profile_my_confessions: "My Confessions",
    profile_statistics: "Statistics",
    profile_total_confessions: "Total Confessions",
    profile_total_likes: "Total Likes",
    profile_total_comments: "Total Comments",
    profile_empty_state: "No confessions yet",
    profile_empty_description: "Start sharing your thoughts anonymously",
    profile_email_label: "Email Address",
    profile_change_password: "Change Password",
    profile_current_password: "Current Password",
    profile_new_password: "New Password",
    profile_confirm_password: "Confirm New Password",
    profile_password_changed: "Password changed successfully",
    profile_password_cooldown: "You can only change your password once every 24 hours",
    profile_password_mismatch: "Passwords do not match",
    profile_password_weak: "Password must be at least 6 characters",
    profile_password_same: "New password must be different from current password",
    profile_hours_remaining: "hours remaining until you can change your password",
    
    // System & Performance
    system_error_occurred: "An error occurred. Please try again.",
    system_rate_limit_exceeded: "Too many requests. Please wait {seconds} seconds before trying again.",
    system_service_unavailable: "Service temporarily unavailable. We're working on it.",
    system_network_error: "Network error. Please check your connection.",
    system_timeout_error: "Request timeout. Please try again.",
    system_validation_error: "Validation error",
    system_loading: "Loading...",
    system_retrying: "Retrying... (Attempt {attempt})",
    system_cache_cleared: "Cache cleared successfully",
    
    // Validation errors
    validation_content_min: "Content must be at least {min} characters",
    validation_content_max: "Content must not exceed {max} characters",
    validation_email_invalid: "Invalid email address",
    validation_password_min: "Password must be at least {min} characters",
    validation_password_requirements: "Password must contain uppercase, lowercase, and a number",
    validation_nickname_min: "Nickname must be at least {min} characters",
    validation_nickname_max: "Nickname must not exceed {max} characters",
    validation_nickname_format: "Nickname can only contain letters, numbers, hyphens and underscores",
    validation_required_field: "This field is required",
    validation_invalid_url: "Invalid URL format",
    validation_max_length: "Must not exceed {max} characters",
    
    // Performance monitoring
    performance_cache_hit: "Loaded from cache",
    performance_cache_miss: "Fetching fresh data",
    performance_slow_query: "Slow response detected",
    performance_optimizing: "Optimizing performance...",
    
    achievement_new_badge: "🏆 You earned a new badge!",
    
    daily_prompt_title: "Question of the Day",
    daily_prompt_share: "Share your thoughts",
    
    confession_anonymous: "Anonymous",
    time_now: "now",
    time_minutes: "m",
    time_hours: "h",
    time_days: "d",
    
    wordcloud_title: "Your Frequent Words",
    wordcloud_used_times: "Used {count} times",
    wordcloud_based_on: "Based on {count} words from your confessions",
    
    seo_default_title: "Anonymous Confessions - Share Your Thoughts Safely",
    seo_default_description: "Safe and anonymous platform for confessions. Share your thoughts, receive AI support and connect with others in a protected space.",
    seo_default_keywords: "anonymous confessions, emotional support, AI confessions, safe platform, anonymous sharing",
    seo_app_name: "Anonymous Confessions",
    
    search_placeholder: "Search confessions...",
    search_button: "Search",
    search_clear_filters: "Clear filters",
    search_category_label: "Category",
    search_sort_label: "Sort",
    search_period_label: "Period",
    search_all_categories: "All",
    search_anytime: "Anytime",
    search_today: "Today",
    search_this_week: "This week",
    search_this_month: "This month",
    search_most_recent: "Most recent",
    search_most_popular: "Most popular",
    search_trending: "Trending",
    
    blocked_users_title: "Blocked Users",
    blocked_user_unblocked: "User unblocked",
    blocked_user_unblocked_desc: "You'll see this user's confessions again",
    blocked_users_error: "Could not unblock user",
    blocked_users_none: "You haven't blocked any users",
    blocked_users_anonymous: "Anonymous user",
    blocked_on: "Blocked on",
    
    follow_now_following: "Now following",
    follow_now_following_desc: "You'll see this user's confessions in your feed",
    follow_error: "Error",
    follow_error_desc: "Could not complete the action",
    
    mood_how_feeling: "How are you feeling now?",
    mood_intensity: "Intensity",
    mood_happy: "Happy",
    mood_sad: "Sad",
    mood_anxious: "Anxious",
    mood_angry: "Angry",
    mood_neutral: "Neutral",
    mood_hopeful: "Hopeful",
    
    badge_first_confession: "First Confession",
    badge_first_confession_desc: "You posted your first confession",
    badge_regular_confessor: "Regular Confessor",
    badge_regular_confessor_desc: "You posted 10 confessions",
    badge_veteran: "Veteran",
    badge_veteran_desc: "You posted 100 confessions",
    badge_popular: "Popular",
    badge_popular_desc: "You received 100 reactions",
    badge_influencer: "Influencer",
    badge_influencer_desc: "You received 1000 reactions",
    badge_fire_week: "Fire Week",
    badge_fire_week_desc: "You posted 7 consecutive days",
    badge_perfect_month: "Perfect Month",
    badge_perfect_month_desc: "You posted 30 consecutive days",
    badge_anniversary: "Anniversary",
    badge_anniversary_desc: "One year on the platform",
    badge_active_commenter: "Active Commenter",
    badge_active_commenter_desc: "Posted 50 comments",
    badge_sharer: "Sharer",
    badge_sharer_desc: "Shared 25 confessions",
    badge_avid_reader: "Avid Reader",
    badge_avid_reader_desc: "Viewed 200 confessions",
    badge_collector: "Collector",
    badge_collector_desc: "Saved 30 bookmarks",
    badge_night_owl: "Night Owl",
    badge_night_owl_desc: "Posted 20 confessions between 10 PM-6 AM",
    badge_social_butterfly: "Social Butterfly",
    badge_social_butterfly_desc: "Has 20 followers",
    badge_viral_confession: "Viral Confession",
    badge_viral_confession_desc: "Has a confession with 100+ likes",
    
    report_title: "Report confession",
    report_description: "Help us keep the community safe. Your report is anonymous.",
    report_reason_label: "Reason for reporting",
    report_reason_spam: "Spam or advertising",
    report_reason_harassment: "Harassment or bullying",
    report_reason_hate_speech: "Hate speech",
    report_reason_violence: "Violence or threats",
    report_reason_adult_content: "Adult content",
    report_reason_misinformation: "Misinformation",
    report_reason_personal_info: "Personal information",
    report_reason_other: "Other",
    report_details_label: "Additional details (optional)",
    report_details_placeholder: "Provide more details about the issue...",
    report_select_reason_error: "Please select a reason",
    report_already_reported_title: "Already reported",
    report_already_reported_desc: "You already reported this confession",
    report_submit_success_desc: "Thank you for your report. Our team will investigate.",
    report_submit_error_desc: "Could not submit report",
    report_submitting: "Submitting...",
    report_submit_button: "Submit Report",
    
    comments_reply_placeholder: "Write a reply...",
    comments_reply_button: "Reply",
    comments_send_button: "Send",
    comments_reply_added_desc: "Reply was added",
    comments_too_long_error: "Comment too long (max 500 characters)",
    
    follow_cannot_self_desc: "You cannot follow yourself",
    follow_unfollowed_title: "Unfollowed",
    follow_unfollowed_desc: "You stopped following this user",
    
    help_user_guide_title: "User Guide",
    help_user_guide_desc: "Learn how to use the platform",
    help_view_guide: "View guide",
    help_faq_title: "FAQ",
    help_faq_desc: "Answers to frequently asked questions",
    help_view_faq: "View FAQ",
    help_contact_title: "Contact us",
    help_contact_desc: "Send us an email for support",
    help_send_email: "Send email",
    help_dialog_title: "How can we help?",
    help_dialog_desc: "Choose one of the options below to get help",
    help_response_time: "We usually reply within 24 hours",
    
    streak_reminder_text: "You have a {count} day streak! Post a confession today to keep it.",
    streak_post_now: "Post now",
    streak_keep_your_streak: "Keep your streak! 🔥",
    
    moderation_reject_title: "Reject confession",
    moderation_reject_description: "Provide a reason for rejecting this confession",
    moderation_reason_placeholder: "Reason (optional)...",
    
    analytics_confessions: "confessions",
    analytics_average_per: "Average per confession",
    
    coins_per_confession: "coins for each confession",
    
    confession_deleted: "Confession was deleted",
    confession_your_confession: "Your confession:",
    confession_reported_success: "Confession was reported",
    confession_report_error: "Could not report confession",
    
    draft_delete_error: "Could not delete draft",
    
    export_error: "Could not export data",
    export_my_confessions: "My Confessions",
    
    following_load_error: "Could not load confessions",
    following_start_following: "Start following users to see their confessions here",
    following_count_confessions: "confessions",
    
    image_added: "Image was added to confession",
    image_upload_error: "Could not upload image",
    
    leaderboard_confessions: "confessions",
    leaderboard_reactions: "reactions",
    
    moderation_approved: "approved",
    moderation_rejected: "rejected",
    moderation_marked: "marked",
    moderation_action_error: "Could not perform action",
    moderation_no_pending: "No pending confessions",
    moderation_no_reported: "No reported confessions",
    
    reaction_update_error: "Could not update reaction",
    
    streak_last_confession: "Last confession:",
    
    subscription_payment_error: "Could not initiate payment process",
    subscription_portal_error: "Could not open subscription portal",
    
    preferences_save_error: "Could not save preferences",
    
    comment_reply_error: "Could not send reply",
    
    achievements_title: "Achievements",
    achievements_unlocked: "unlocked",
    achievement_first_confession: "First Confession",
    achievement_first_confession_desc: "Posted your first confession",
    achievement_active_user: "Active User",
    achievement_active_user_desc: "Posted 10+ confessions",
    achievement_power_user: "Power User",
    achievement_power_user_desc: "Posted 50+ confessions",
    achievement_deep_thinker: "Deep Thinker",
    achievement_deep_thinker_desc: "Generated 5+ Deep Insights",
    achievement_vip_member: "VIP Member",
    achievement_vip_member_desc: "Member of the VIP community",
    achievement_supporter: "Supporter",
    achievement_supporter_desc: "Supporting the platform development",
    
    feature_ai_empathy: "AI Empathy",
    feature_ai_empathy_desc: "Empathetic responses generated by AI trained to understand and support",
    feature_anonymous: "100% Anonymous",
    feature_anonymous_desc: "Your identity remains confidential; confessions cannot be attributed",
    feature_deep_insights: "Deep Insights",
    feature_deep_insights_desc: "In-depth psychological analysis for complete understanding (VIP)",
    feature_instant_response: "Instant Response",
    feature_instant_response_desc: "Get immediate feedback, available 24/7 when you need it",
    
    error_boundary_title: "Oops! Something went wrong",
    error_boundary_description: "Sorry for the inconvenience. Try reloading the page or return to the homepage.",
    error_boundary_reload: "Reload",
    error_boundary_home: "Home",
    
    referral_link_label: "Your referral link:",
    referral_friends_invited: "friends invited",
    referral_link_copied: "Link copied! 🎉",
    referral_share_message: "Join me on Confess+ - a safe space for anonymous confessions with AI support!",
    referral_reward_message: "You earned {days} days of free VIP!",
    referral_continue_inviting: "Keep inviting friends for more benefits",
    
    share_title: "Share Confession",
    share_copy_link: "Copy Link",
    share_link_copied: "Link copied!",
    share_text: "Discover this confession on Confess+",
    
    stats_active_users: "Active users",
    stats_confessions_shared: "Confessions shared",
    stats_empathetic_reactions: "Empathetic reactions",
    stats_vip_members: "VIP members",
    
    auth_welcome_back: "Welcome back",
    auth_create_account: "Create your free account",
    auth_email_placeholder: "Email",
    auth_password_placeholder: "Password",
    auth_logging_in: "Logging in...",
    auth_creating_account: "Creating account...",
    auth_login_button: "Login",
    auth_signup_button: "Sign Up",
    auth_no_account: "No account?",
    auth_signup_link: "Sign up",
    auth_have_account: "Already have an account?",
    auth_login_link: "Login",
    auth_benefits_title: "Free account benefits:",
    auth_benefit_unlimited: "Unlimited anonymous confessions",
    auth_benefit_ai_responses: "Empathetic AI responses",
    auth_benefit_community: "Support community",
    auth_invalid_email: "Invalid email",
    auth_password_min: "Password must be at least 6 characters",
    auth_invalid_credentials: "Incorrect email or password",
    auth_email_exists: "This email is already registered",
    auth_welcome_message: "Welcome to the Confess+ community",
    auth_login_success: "Successfully logged in.",
    auth_signup_success: "Account created successfully! 🎉",
    auth_error: "Error",
    auth_error_generic: "An error occurred. Please try again.",
    auth_captcha_failed: "CAPTCHA verification failed. Please try again.",
    auth_session_revoked: "Session revoked successfully.",
    auth_all_sessions_revoked: "All sessions revoked. Please log in again.",
    auth_device_mismatch: "Device mismatch detected. Please log in again.",
    auth_session_limit: "Maximum active sessions reached. Please log out from another device.",
    auth_account_locked: "Account temporarily locked due to multiple failed login attempts. Please try again later.",
    auth_password_rules_title: "Password requirements:",
    auth_password_rules_len: "At least 10 characters",
    auth_password_rules_upper: "At least one uppercase letter (A-Z)",
    auth_password_rules_lower: "At least one lowercase letter (a-z)",
    auth_password_rules_digit: "At least one number (0-9)",
    auth_password_rules_special: "At least one special character (!@#$%^&*...)",
    auth_password_match_ok: "Passwords match",
    auth_password_match_fail: "Passwords do not match",
    auth_password_strength_weak: "Weak",
    auth_password_strength_fair: "Fair",
    auth_password_strength_good: "Good",
    auth_password_strength_strong: "Strong",
    auth_stay_signed_in: "Stay signed in",
    auth_confirm_password_placeholder: "Confirm password",
    auth_show_password: "Show password",
    auth_hide_password: "Hide password",
    auth_password_too_short: "Password must be at least 10 characters",
    auth_password_weak: "Password does not meet security requirements",
    auth_validation_passed: "Validation successful",
    auth_success: "Success!",
    
    // Password Reset
    passwordReset_title: "Reset Password",
    passwordReset_emailSent: "Password reset email sent! Check your inbox.",
    passwordReset_emailPlaceholder: "Enter your email address",
    passwordReset_submitButton: "Send Reset Link",
    passwordReset_loading: "Sending...",
    
    common_success: "Success",
    common_something_went_wrong: "Something went wrong. Please try again.",
    common_unauthorized: "Unauthorized access.",
    common_rate_limit: "Too many requests. Please try again later.",
    
    ui_recent: "Recent",
    ui_popular: "Popular",
    ui_loading: "Loading...",
    ui_safe_space: "Safe and anonymous space",
    ui_share_thoughts: "Share your thoughts",
    ui_safe_description: "A safe place where you can be yourself. Write anonymously what you feel and get empathetic AI responses.",
    ui_no_confessions: "No confessions yet",
    ui_first_confession_desc: "Be the first to share your thoughts. You'll instantly get an empathetic AI response.",
    ui_upgrading: "Upgrading... 💳",
    ui_payment_redirect: "Redirecting to payment system (Demo)",
    ui_welcome_vip: "Welcome to VIP! 🎉",
    ui_vip_access: "You now have access to all VIP features.",
    ui_help_question: "How can we help?",
    ui_help_choose: "Choose one of the options below to get help",
    ui_help_reply_time: "We usually reply within 24 hours",
    ui_pull_to_refresh: "Pull to refresh",
    ui_release_to_refresh: "Release to refresh",
    ui_refreshing: "Refreshing...",
    
    subscription_vip_title: "Confess+ VIP",
    subscription_choose_plan: "Choose {plan}",
    subscription_monthly: "Monthly",
    subscription_yearly: "Yearly",
    subscription_per_month: "per month",
    subscription_per_year: "per year",
    subscription_save_percent: "Save 40%",
    subscription_most_popular: "MOST POPULAR",
    subscription_subscribe: "Subscribe",
    subscription_subscribe_yearly: "Subscribe Yearly",
    subscription_processing: "Processing...",
    subscription_cancel_anytime: "You can cancel anytime from account settings. No long-term commitments.",
    subscription_cancel_confirm: "Are you sure you want to cancel your subscription? You'll lose access to all VIP features at the end of your billing period.",
    subscription_benefit_1: "Unlimited Deep Insight AI - deep psychological analysis",
    subscription_benefit_2: "Extended and more detailed AI responses",
    subscription_benefit_3: "Ad-free - clean experience",
    subscription_benefit_4: "Priority in AI processing",
    subscription_benefit_5: "Access to future features",
    subscription_auth_required: "You must be authenticated to subscribe.",
    subscription_error: "Could not initiate subscription process. Try again.",
    
    // Subscription Plans - New Benefits (Confession Limits)
    plans_free_benefit_confessions: "3 confessions per day",
    plans_vip_benefit_confessions: "Unlimited confessions per day",
    plans_free_benefit_basic: "Basic features",
    plans_free_benefit_ads: "Ads enabled",
    plans_vip_benefit_unlimited_ai: "Unlimited AI responses",
    plans_vip_benefit_no_ads: "No ads",
    plans_vip_benefit_custom_themes: "Custom themes",
    plans_vip_benefit_private_confessions: "Private confessions",
    plans_vip_benefit_advanced_stats: "Advanced stats",
    plans_vip_benefit_special_badge: "Special VIP badge",
    plans_vip_benefit_unlimited_ai_desc: "Unlimited AI analysis",
    plans_vip_benefit_priority_ai: "Priority AI responses",
    plans_vip_benefit_priority_support: "Priority support",
    plans_vip_benefit_coins_bonus: "+250 coins bonus",
    plans_vip_benefit_login_rewards: "Daily login rewards",
    plans_vip_benefit_images: "Image confessions",
    plans_vip_benefit_stats: "Detailed statistics",
    plans_vip_benefit_support: "Priority support",
    plans_vip_benefit_badge: "Special VIP badge",
    plans_upgrade_now: "Upgrade Now",
    plans_downgrade: "Downgrade",
    plans_current_plan: "Current Plan",
    plans_renews_on: "Renews on",
    plans_vip_activated: "👑 You're now VIP!",
    plans_vip_welcome: "Welcome to VIP! Enjoy unlimited confessions and all exclusive features.",
    
    // Plan Titles and Tooltips
    plans_free_title: "Free",
    plans_free_tooltip: "Free Member",
    plans_vip_title: "VIP",
    plans_vip_tooltip: "VIP Member - Exclusive access with all features",
    
    // Paywall
    plans_paywall_title: "Choose your subscription plan",
    plans_paywall_subtitle: "Compare features and find your best experience.",
    
  // Trial System
  trial_offer_title: "Try VIP Free!",
  trial_offer_desc: "Enjoy full VIP features for 3 days.",
  trial_button_text: "Try 3 Days Free",
    trial_already_used_title: "Trial Already Used",
    trial_already_used_desc: "You've already used your free trial.",
    trial_activated_title: "🎉 VIP Trial Activated!",
    trial_activated_desc: "Enjoy 3 days of VIP features for free!",
    trial_activation_error: "Could not activate trial. Please try again.",
    trial_banner_title: "🎉 VIP Trial Active",
    trial_banner_days_remaining: "{days} days remaining",
    trial_banner_desc: "Enjoy full VIP features for 3 days.",
    trial_banner_cta: "Try 3 Days Free",
    trial_banner_disclaimer: "After 3 days, you'll be charged the VIP plan price unless you cancel.",
    trial_error_used: "You've already used your VIP trial.",
    trial_error_already_subscribed: "You already have an active subscription.",
    trial_ended_toast: "Your VIP trial ended. You're back to Free.",
    trial_purchase: "Trial",
    
    // Confession Limits
    limit_reached_title: "Daily Limit Reached",
    limit_reached_description: "You've reached your daily confession limit. Upgrade to post more!",
    limit_current_plan: "Current Plan",
    limit_used_today: "Used Today",
    limit_resets_in: "Resets in",
    limit_upgrade_benefits: "Upgrade to post more:",
    limit_see_plans: "See Plans",
    limit_confessions_remaining: "{count} confessions left today",
    limit_confessions_unlimited: "Unlimited confessions today",
    
    // Auth Captcha
  auth_captcha_required_after_fails: "Please verify you're human to continue",
  
  // Forgot / Reset Password
  auth_forgot_password: "Forgot password?",
  auth_forgot_password_title: "Reset your password",
  auth_forgot_password_desc: "Enter your email and we'll send reset instructions.",
  auth_forgot_password_button: "Send reset link",
  auth_forgot_password_success: "If an account exists, you'll receive reset instructions shortly.",
  auth_reset_password_title: "Set a new password",
  auth_reset_password_desc: "Choose a strong password for your account.",
  auth_reset_password_button: "Update password",
  auth_reset_password_success: "Password successfully updated. Please sign in.",
  auth_reset_password_new: "New password",
  auth_reset_password_confirm: "Confirm new password",
  auth_reset_token_invalid: "Invalid or expired reset link",
  auth_reset_token_expired: "This reset link has expired. Please request a new one.",
  auth_back_to_login: "Back to login",
  
  // Email Verification
  auth_verify_email_title: "Verify your email",
  auth_verify_email_success: "Email verified successfully!",
  auth_verify_email_error: "Verification failed. Please try again.",
  auth_verify_email_desc: "Please check your email to verify your account.",
  auth_email_not_verified: "Please verify your email to continue",
  auth_check_email_verify: "Check your email to verify your account",
  
  // Common Actions
  common_close: "Close",
    
    trust_anonymous: "100% Anonymous",
    trust_anonymous_desc: "Your identity remains confidential",
    trust_ssl: "SSL Secure",
    trust_ssl_desc: "All data is encrypted",
    trust_moderation: "AI Moderation",
    trust_moderation_desc: "Content automatically verified",
    trust_safe_community: "Safe Community",
    trust_safe_community_desc: "Judgment-free space",
    
    payment_canceled_title: "Payment Canceled",
    payment_canceled_desc: "The payment process was canceled. No amount has been charged.",
    payment_back_home: "Back to homepage",
    payment_try_again: "Try again",
    payment_contact_help: "If you encountered problems, please contact us.",
    payment_success_title: "Payment Successful!",
    payment_success_desc: "Congratulations! Your VIP account has been successfully activated.",
    payment_success_deep_insights: "Access to Deep Insights AI",
    payment_success_analysis: "Deep psychological analysis",
    payment_success_priority: "Priority support",
    payment_success_explore: "Explore Confess+",
    payment_redirect_info: "You will be redirected automatically in 5 seconds...",
    
    profile_your_account: "Your Account",
    profile_subscription_active: "Active subscription until",
    profile_refresh_status: "Refresh Status",
    profile_discover_vip: "Discover Confess+ VIP",
    profile_vip_description: "Get unlimited access to Deep Insights AI, extended responses and an ad-free experience.",
    profile_you_are_vip: "You are a VIP member!",
    profile_vip_thanks: "You enjoy all Confess+ benefits. Thank you for your support! 💜",
    profile_no_confessions: "You haven't posted any confessions yet.",
    
    ucl_no_confessions: "You haven't posted any confessions yet.",
    
    common_back: "Back",
    common_error: "Error",
    common_help_aria: "Help",
    common_theme_aria: "Toggle theme",
    common_view_all: "View All",
    
    search_results: "Search Results",
    
  communities_trending: "Trending Communities",
  communities_all: "All Communities",
  communities_empty_title: "No Communities Yet",
  communities_empty_description: "Be the first to create a community and connect with others who share your interests!",
    
    faq_title: "Frequently Asked Questions",
    faq_q1: "Is it really anonymous?",
    faq_a1: "Yes! Your confessions are completely anonymous. Your name never appears publicly and can't be linked to your confessions by other users. We only store the data necessary for the platform to function.",
    faq_q2: "How does the AI work?",
    faq_a2: "Our AI analyzes your confession and generates an empathetic, understanding response. We use advanced language models trained to be empathic and non-judgmental. Responses aren't pre-written; they're generated uniquely for each confession.",
    faq_q3: "What is Deep Insight?",
    faq_a3: "Deep Insight is a VIP feature that provides deeper psychological analysis of your confession. It includes extra perspectives, practical advice, and reflective questions to help you better understand your situation.",
    faq_q4: "Can I delete my confessions?",
    faq_a4: "Yes, you can edit or delete your confessions anytime from the profile page. Once deleted, they are permanently removed from the database.",
    faq_q5: "What does the VIP subscription offer?",
    faq_a5: "VIP gives you unlimited AI Deep Insights, more detailed responses, an ad-free experience, and priority AI processing. You also support the development of the platform!",
    faq_q6: "How does the referral program work?",
    faq_a6: "You get a unique referral code you can share with friends. When someone signs up using your code, both of you get benefits. See full details on the profile page.",
    faq_q7: "Is my data secure?",
    faq_a7: "Yes! All data is encrypted and stored securely. We use best-in-class security practices and comply with GDPR. We do not sell or share your data with third parties.",
    faq_q8: "Can I use the platform for professional counseling?",
    faq_a8: "No. Confess+ does not replace professional counseling. If you're facing serious mental health issues, please contact a specialist. Our platform is for emotional support and personal reflection.",
    
    settings_title: "Settings",
    settings_manage: "Manage your account and privacy",
    settings_export_data: "Export Data",
    settings_export_desc: "Download all your data in JSON format",
    settings_privacy_view: "View Privacy Policy",
    settings_delete_warning: "This action is permanent and cannot be undone",
    settings_data_exported: "Data Exported",
    settings_export_error: "Could not export data",
    
    profile_verifying: "Verifying...",
    
    privacy_title: "Privacy Policy",
    privacy_section_1: "1. Data Collection",
    privacy_section_1_text: "Confess.AI collects only the data strictly necessary for platform operation:",
    privacy_section_1_list: "Email address (for authentication) • Your confessions (stored anonymously) • Usage statistics (for service improvement)",
    privacy_section_2: "2. Anonymity",
    privacy_section_2_text: "Your confessions are completely anonymous. Your name never appears publicly and cannot be associated with your confessions by other users.",
    privacy_section_3: "3. AI Usage",
    privacy_section_3_text: "Your confessions are processed by AI models to generate empathetic responses. This data is not used for model training and remains confidential.",
    privacy_section_4: "4. Data Security",
    privacy_section_4_text: "All data is encrypted and stored securely. We use best security practices to protect your information.",
    privacy_section_5: "5. Your Rights",
    privacy_section_5_text: "You have the right to:",
    privacy_section_5_list: "Access your personal data • Delete your account and all associated data • Request export of your data • Withdraw consent for data processing",
    privacy_section_6: "6. Cookies",
    privacy_section_6_text: "We only use essential cookies for platform functionality (authentication and preferences). We do not use tracking or advertising cookies.",
    privacy_section_7: "7. Contact",
    privacy_section_7_text: "For any privacy questions, you can contact us at: privacy@confess.ai",
    privacy_last_updated: "Last updated: October 2025",
    
    terms_title: "Terms and Conditions",
    terms_section_1: "1. Acceptance of Terms",
    terms_section_1_text: "By using Confess.AI, you agree to these terms and conditions. If you do not agree, please do not use the platform.",
    terms_section_2: "2. Service Usage",
    terms_section_2_text: "Confess.AI is a platform for anonymous sharing of thoughts and receiving empathetic AI responses. You commit to:",
    terms_section_2_list: "Use the platform responsibly • Not post illegal, offensive or harmful content • Respect community rules • Not attempt to identify other users",
    terms_section_3: "3. Content",
    terms_section_3_text: "You are responsible for the content you post. We reserve the right to moderate and delete content that:",
    terms_section_3_list: "Violates applicable laws • Is threatening or harassing • Contains false or misleading information • Violates others' rights",
    terms_section_4: "4. VIP Subscription and Payments",
    terms_section_4_text: "VIP subscription offers additional features. Payments are processed securely through Stripe. You can cancel your subscription anytime from account settings.",
    terms_section_5: "5. Limitation of Liability",
    terms_section_5_text: "Confess.AI does not provide professional counseling services. AI responses are generated automatically and do not replace professional help. For serious mental health issues, please contact a specialist.",
    terms_section_6: "6. Changes to Terms",
    terms_section_6_text: "We reserve the right to modify these terms. Changes will be communicated through the platform and by email.",
    terms_section_7: "7. Applicable Law",
    terms_section_7_text: "These terms are governed by the laws of Romania. Any dispute will be resolved in the competent courts of Bucharest.",
    terms_section_8: "8. Contact",
    terms_section_8_text: "For questions about terms and conditions: legal@confess.ai",
    terms_last_updated: "Last updated: October 2025",
    
    index_no_confessions_title: "No confessions yet",
    index_no_confessions_desc: "Be the first to share your thoughts. You'll instantly get an empathetic AI response.",
    
    notfound_404: "404",
    notfound_title: "Oops! Page not found",
    notfound_return_home: "Return to Home",
    
    analytics_activity_7days: "Activity last 7 days",
    subscription_billed_yearly: "Billed annually",
    subscription_plan_unavailable: "Subscription plan unavailable",
    subscription_yearly_discount: "-33%",
    profile_achievements: "Achievements",
    profile_moods: "Moods",
    profile_settings: "Settings",
    profile_moderation: "Moderation",
    profile_plan_free: "Free",
    profile_plan_vip: "VIP",
    referral_benefits: "Benefits:",
    referral_benefit_coins: "• 100 coins for each completed referral",
    referral_benefit_friend: "• Your friend receives 50 bonus coins",
    referral_benefit_badge: "• Special badge after 10 referrals",
    preferences_customization: "Customization",
    preferences_accent_color: "Accent color",
    preferences_text_size: "Text size",
    preferences_size_small: "Small",
    preferences_size_medium: "Medium",
    preferences_size_large: "Large",
    
    subscription_thanks: "Thank you for your support!",
    subscription_upgrade_more: "Upgrade for more features",
    subscription_upgrade_vip: "Upgrade to VIP",
    subscription_current_plan: "Current Plan",
    subscription_your_plan: "Your Plan",
    subscription_downgrade_to_free: "Downgrade to Free",
    subscription_change_to_plan: "Change to {plan}",
    subscription_free: "Free",
    subscription_trial_available: "3-Day Free Trial Available",
    
    // Subscription Benefits - Free
    subscription_benefits_free_confessions: "Limited confessions per day",
    subscription_benefits_free_basic_features: "Basic features",
    subscription_benefits_free_community_access: "Community access",
    subscription_limitations_free_ads: "With ads",
    subscription_limitations_free_limited_ai: "Limited AI responses",
    subscription_limitations_free_basic_analytics: "Basic analytics only",
    
    // Subscription Benefits - VIP
    subscription_benefits_vip_no_ads: "No ads",
    subscription_benefits_vip_custom_themes: "Custom themes",
    subscription_benefits_vip_private_confessions: "Private confessions",
    subscription_benefits_vip_advanced_stats: "Advanced stats",
    subscription_benefits_vip_special_badge: "Special VIP badge",
    subscription_benefits_vip_unlimited_ai: "Unlimited AI responses",
    subscription_benefits_vip_priority_ai: "Priority AI responses",
    subscription_benefits_vip_priority_support: "Priority support",
    subscription_benefits_vip_coins_bonus: "+250 coins bonus",
    subscription_benefits_vip_login_rewards: "Daily login rewards",
    subscription_benefits_vip_unlimited_confessions: "Unlimited confessions",
    subscription_benefits_vip_detailed_statistics: "Detailed statistics",
    subscription_benefits_vip_early_access: "Early access to features",
    
    // Subscription Management
    subscription_current_status: "Current Status",
    subscription_interval_monthly: "Monthly",
    subscription_interval_yearly: "Yearly",
    subscription_per_month_short: "/mo",
    subscription_per_year_short: "/yr",
    subscription_savings_badge: "Save {percent}%",
    subscription_compare_plans: "Compare Plans",
    subscription_benefits_title: "Benefits",
    subscription_actions_change: "Change Plan",
    subscription_actions_cancel: "Cancel Subscription",
    subscription_actions_reactivate: "Reactivate Subscription",
    subscription_confirm_change_title: "Change Your Plan",
    subscription_confirm_change_body: "You are about to change to {plan} {interval}. Your new rate will be ${price}{suffix}. {prorationNote}",
    subscription_confirm_cancel_title: "Cancel Subscription",
    subscription_confirm_cancel_body_now: "Your subscription will end immediately and you will lose access to VIP features now.",
    subscription_confirm_cancel_body_period_end: "Your subscription will remain active until {date}, then you'll return to the Free plan.",
    subscription_confirm_reactivate_title: "Reactivate Subscription",
    subscription_status_active: "Active",
    subscription_status_canceled: "Canceled",
    subscription_status_trialing: "Trial",
    subscription_status_past_due: "Past Due",
    subscription_errors_generic: "An error occurred. Please try again.",
    subscription_errors_not_eligible: "You are not eligible for this action.",
    subscription_errors_requires_action: "Additional action required to complete this operation.",
    subscription_trial_countdown: "{days} days left in trial",
    subscription_trial_used: "Trial already used",
    subscription_next_billing_date: "Next billing: {date}",
    subscription_cancel_ends_at: "Ends: {date}",
    subscription_change_interval: "Change Billing",
    subscription_change_success: "Plan changed successfully!",
    subscription_cancel_success: "Subscription canceled successfully",
    subscription_reactivate_success: "Subscription reactivated successfully!",
    subscription_not_available: "Not available",
    subscription_proration_info: "You'll be charged a prorated amount today.",
    subscription_downgrade_period_end: "Your plan will change at the end of the current period.",
    
    badges_your_badges: "Your Badges",
    
    export_my_data: "Export my data",
    
    draft_deleted: "Draft deleted",
    draft_deleted_desc: "The draft was successfully deleted",
    draft_delete_error_desc: "Could not delete the draft",
    drafts_saved: "Saved Drafts",
    
    export_title: "Export Your Data",
    export_description: "Download a copy of your data in JSON or CSV format",
    export_format: "Format",
    export_what: "What do you want to export?",
    export_my_comments: "My Comments",
    export_my_likes: "My Likes",
    export_my_bookmarks: "My Bookmarks",
    export_download: "Download Data",
    export_downloading: "Exporting...",
    export_success: "Export Successful",
    export_success_desc: "Your data has been exported successfully",
    
    coins_title: "Coins",
    coins_current_balance: "Current Balance",
    coins_total_earned: "Total Earned",
    coins_history: "View History",
    coins_how_to_earn: "How to earn coins:",
    coins_per_confession_detail: "📝 +2 coins per confession",
    coins_per_confession_new: "+2 coins per confession",
    coins_no_transactions: "No transactions yet",
    coins_all_transactions: "All your coin transactions",
    coins_confession_created: "New confession",
    coins_how_to_spend: "💎 How to Spend Coins",
    coins_polish_detail: "✨ Polish Confession (10 coins) - AI improves your text",
    coins_boost_detail: "🚀 Boost Confession (15 coins) - Highlight for 1 hour",
    coins_flairs_detail: "🎨 Profile Flairs (30 coins) - Active for 5 days",
    badge_expires_in: "Expires in",
    badge_expired: "Expired",
    badge_active_for: "Active for 5 days",
    buy_again: "Buy Again",
    days: "days",
    hours: "hours",
    referral_reward_referrer: "+20 coins when referred user posts first confession",
    referral_reward_referred: "+10 for referred user after first confession",
    first_confession_bonus: "First confession bonus",
    
    boost_confession: "Boost Confession",
    boost_success_title: "Confession Boosted!",
    boost_success_description: "Your confession will be highlighted for 1 hour",
    boost_error: "Failed to boost confession",
    boost_confirmation_description: "Boost this confession to make it more visible for 1 hour.",
    boost_cost: "Cost: 15 coins",
    boost_now: "Boost Now",
    
    customize_profile: "Customize Profile",
    themes: "Themes",
    badges: "Badges",
    theme_default: "Default",
    theme_ocean: "Ocean",
    theme_sunset: "Sunset",
    theme_forest: "Forest",
    theme_galaxy: "Galaxy",
    theme_royal: "Royal",
    badge_star: "Star",
    badge_fire: "Fire",
    badge_heart: "Heart",
    badge_rocket: "Rocket",
    badge_gem: "Gem",
    badge_crown: "Crown",
    owned: "Owned",
    purchase_for: "Purchase for",
    purchase_theme_success: "Theme purchased successfully!",
    purchase_badge_success: "Badge purchased successfully!",
    equip_theme_success: "Theme equipped!",
    equip_badge_success: "Badge equipped!",
    customization_error: "Failed to apply customization",
    insufficient_coins: "Not enough coins",
    
    highlight_comment: "Highlight Comment",
    highlight_comment_description: "Make your comment stand out with a golden highlight for 24 hours.",
    highlight_comment_success_title: "Comment Highlighted!",
    highlight_comment_success_description: "Your comment will be highlighted for 24 hours",
    highlight_comment_error: "Failed to highlight comment",
    highlight_comment_features: "Highlight Features:",
    highlight_comment_feature_1: "Golden border and background",
    highlight_comment_feature_2: "Stays at top of comments",
    highlight_comment_feature_3: "Active for 24 hours",
    highlight_comment_cost: "Cost: {cost} coins",
    highlight_now: "Highlight Now",
    ai_makeover: "AI Makeover",
    ai_makeover_description: "Let AI improve your confession with better writing, clarity, and emotional impact.",
    ai_makeover_features: "AI Makeover Features:",
    ai_makeover_feature_1: "Improves writing quality and grammar",
    ai_makeover_feature_2: "Enhances emotional impact",
    ai_makeover_feature_3: "Maintains your original message",
    ai_makeover_feature_4: "You can edit before applying",
    ai_makeover_cost: "Cost: {cost} coins",
    ai_makeover_error: "Failed to generate makeover",
    ai_makeover_applied_title: "Makeover Applied!",
    ai_makeover_applied_description: "Your confession has been updated",
    original_content: "Original Content",
    improved_content: "Improved Content",
    edit_improved_content: "Edit the improved content before applying...",
    generate_makeover: "Generate Makeover",
    apply_changes: "Apply Changes",
    applying: "Applying...",
    custom_background: "Custom Background",
    custom_background_description: "Choose a beautiful gradient background for your confession.",
    background_applied_title: "Background Applied!",
    background_applied_description: "Your confession now has a custom background",
    background_error: "Failed to apply background",
    your_balance: "Your Balance",
    coins: "coins",
    free: "Free",
    current: "Current",
    already_applied: "Already Applied",
    cost: "Cost",
    apply_background: "Apply Background",
    
    polish_confession: "Polish Confession",
    polishing: "Polishing...",
    polish_success_title: "Confession Polished!",
    polish_success_description: "Your confession has been improved by AI",
    polish_error: "Failed to polish confession",
    polish_empty_error: "Please write your confession first",
    
    flairs_shop: "Flairs Shop",
    flair_shop_description: "Customize your profile with unique flairs and badges",
    flair_purchased_title: "Flair Purchased!",
    flair_purchased_description: "Your new flair is now equipped",
    flair_purchase_error: "Failed to purchase flair",
    flair_equipped: "Flair equipped successfully",
    equipped: "Equipped",
    equip: "Equip",
    shop_free_tier: "Free Flairs",
    shop_vip_tier: "VIP Flairs",
    shop_empty: "No flairs available for your plan",
    shop_buy: "Buy",
    shop_open: "Open Flairs Shop",
    rarity_common: "Common",
    rarity_uncommon: "Uncommon",
    rarity_rare: "Rare",
    rarity_epic: "Epic",
    rarity_legendary: "Legendary",
    
    flair_star: "Star",
    flair_fire: "Fire",
    flair_heart: "Heart",
    flair_crown: "Crown",
    flair_sparkles: "Sparkles",
    flair_diamond: "Diamond",
    flair_trophy: "Trophy",
    flair_rocket: "Rocket",
    flair_rainbow: "Rainbow",
    flair_unicorn: "Unicorn",
    flair_moon: "Moon",
    
    loading: "Loading...",
    success: "Success",
    cancel: "Cancel",
    processing: "Processing...",
    
    nickname_label: "Nickname",
    nickname_placeholder: "Enter your nickname",
    nickname_update: "Update Nickname",
    nickname_updated: "Nickname updated successfully",
    nickname_error: "Error updating nickname",
    nickname_taken: "This nickname is already taken",
    nickname_invalid: "Nickname must be 3-24 characters (letters, numbers, _)",
    nickname_cooldown: "You can only change your nickname once every 21 days",
    
    common_anonymous: "Anonymous",
    
    validation_nickname_too_short: "Nickname must be at least 3 characters",
    validation_nickname_too_long: "Nickname cannot exceed 24 characters",
    validation_nickname_invalid_chars: "Nickname can only contain letters, numbers, and underscores",
    validation_nickname_invalid_underscores: "Nickname cannot start or end with an underscore",
    validation_nickname_double_underscores: "Nickname cannot contain double underscores",
    validation_nickname_reserved: "This nickname is reserved and cannot be used",
    validation_nickname_not_available: "This nickname is not available",
    
    nickname_days_remaining: "days remaining until you can change your nickname",
    nickname_current: "Current nickname",
    nickname_visibility: "Nickname Visibility",
    nickname_public_desc: "Others can see your nickname",
    nickname_private_desc: "Only you can see your nickname",
    settings_updated: "Settings updated successfully",
    search_users: "Search Users",
    search_users_placeholder: "Search by nickname...",
    no_users_found: "No users found",
    
    messages_title: "Messages",
    messages_new: "New Message",
    messages_send: "Send",
    messages_type_message: "Type a message...",
    messages_no_conversations: "No conversations yet",
    messages_start_conversation: "Start a conversation",
    messages_conversation_with: "Conversation with",
    messages_delete_confirm: "Delete this message?",
    messages_deleted: "Message deleted",
    messages_delete_conversation: "Delete conversation",
    messages_delete_conversation_confirm: "Are you sure you want to delete this conversation? This action cannot be undone.",
    messages_delete_conversation_title: "Delete Conversation",
    messages_retry: "Retry",
    messages_input_placeholder: "Type a message...",
    messages_empty: "No messages yet",
    messages_seen: "Seen",
    messages_delivered: "Delivered",
    messages_sent: "Sent",
    messages_typing: "is typing...",
    messages_reaction_add: "Add reaction",
    messages_reaction_remove: "Remove reaction",
    
    // Bottom Navigation
    nav_home: "Home",
    nav_explore: "Explore",
    nav_messages: "Messages",
    nav_profile: "Profile",
    
    profile_posts: "Posts",
    profile_followers: "Followers",
    profile_following: "Following",
    profile_follows_you: "Follows you",
    profile_follow: "Follow",
    profile_unfollow: "Unfollow",
    
    // Explore - Search Users
    explore_search_card_title: "Find Users",
    explore_search_card_placeholder: "Search by nickname...",
    explore_search_card_follow: "Follow",
    explore_search_card_unfollow: "Unfollow",
    explore_search_card_message: "Message",
    explore_search_card_no_results: "No users found",
    
    // Home - Communities
    home_communities_title: "Communities",
    home_communities_join: "Join",
    home_communities_leave: "Leave",
    
    following_feed_loading: "Loading feed...",
    following_feed_start: "Start following users to see their confessions here",
    
    image_invalid_file: "Invalid File",
    image_invalid_file_desc: "Please select an image (JPEG, PNG, GIF or WebP)",
    image_too_large: "File Too Large",
    image_uploading: "Uploading...",
    image_add_optional: "Add image (optional)",
    
    moderation_no_permissions: "You don't have moderation permissions",
    moderation_loading: "Loading...",
    moderation_keep: "Keep",
    moderation_delete: "Delete",
    moderation_cancel: "Cancel",
    
    preferences_saving: "Saving...",
    preferences_save: "Save Preferences",
    
    subscription_active_plan: "Active Plan",
    subscription_choose: "Choose",
    subscription_title: "Your Subscription",
    subscription_description: "Unlock all features and get a superior experience",
    subscription_plan_free: "Free",
    subscription_plan_vip: "VIP",
    subscription_manage: "Manage subscription",
    subscription_feature_unlimited_ai: "Unlimited AI responses",
    subscription_feature_advanced_analytics: "Advanced analytics",
    subscription_feature_exclusive_badges: "Exclusive badges",
    subscription_feature_no_ads: "Ad-free",
    subscription_feature_priority_moderation: "Priority in moderation",
    subscription_feature_image_confessions: "Confessions with images",
    subscription_feature_detailed_stats: "Detailed statistics",
    subscription_feature_priority_support: "Priority support",
  subscription_feature_vip_badge: "Special VIP badge",
  
  // Trial & Subscription Management
  trial_cta_title: "Try VIP Free!",
  trial_cta_desc: "Enjoy full VIP for 3 days.",
  trial_cta_button: "Try 3 Days Free",
  trial_cta_disclaimer: "After 3 days, you'll be charged the VIP plan price unless you cancel.",
  trial_active: "Your VIP trial is active until {date}",
  subs_manage: "Manage subscription",
  subs_cancel: "Cancel subscription",
  subs_upgrade: "Upgrade",
  subs_downgrade: "Downgrade",
  coins_bonus_vip: "You received +250 coins for activating VIP.",
  shop_badge_price_free: "Badges cost 25 coins (Free)",
  shop_badge_price_vip: "Badges cost 100 coins (VIP)",
  
  // Manage Subscription Dialog
  subs_manage_title: "Manage subscription",
  subs_manage_currentPlan: "Current plan",
  subs_manage_renews: "Renews on {date}",
  subs_manage_trialEnds: "Trial ends on {date}",
  subs_action_upgrade: "Upgrade",
  subs_action_downgrade: "Downgrade",
  subs_action_cancel: "Cancel subscription",
  subs_action_cancelNow: "Cancel now",
  subs_action_cancelAtPeriodEnd: "Cancel at period end",
  subs_action_cancelTrial: "Cancel trial",
  subs_action_reactivate: "Reactivate",
  subs_confirm_title: "Confirm action",
  subs_confirm_upgrade: "Upgrade to {tier} now?",
  subs_confirm_downgrade: "Downgrade to {tier} now?",
  subs_confirm_cancel_periodEnd: "Keep benefits until {date}, then cancel. Continue?",
  subs_confirm_cancel_now: "Cancel immediately and lose benefits now. Continue?",
  subs_confirm_reactivate: "Reactivate your subscription and continue enjoying VIP benefits?",
  subs_confirm_cancel: "Are you sure you want to cancel your subscription?",
  subs_confirm_change_to_vip: "Upgrade to VIP for unlimited confessions and exclusive features!",
  subs_cancel_immediate: "Cancel Now",
  subs_cancel_at_period_end: "Cancel at Period End",
  subs_toast_success: "Done!",
  subs_toast_change_success: "Plan changed successfully!",
  subs_toast_cancel_success: "Subscription will cancel at period end",
  subs_toast_cancel_now_success: "Subscription canceled immediately",
  subs_toast_reactivate_success: "Subscription reactivated successfully!",
  subs_note_inline: "You can change, cancel, or reactivate your plan here at any time.",
  common_cancel: "Cancel",
  subs_status_cancels: "Cancels on",
  subs_full_management: "Full Subscription Management",
  subs_portal_description: "Access Stripe portal to change plans, update payment method, view invoices, or cancel subscription.",
  subs_open_portal: "Open Stripe Portal",
  subs_quick_actions: "Quick Actions",
  subs_portal_opening: "Opening Stripe portal where you can manage your subscription...",
  subs_portal_failed: "Failed to open customer portal",
  subs_action_buy: "Buy Subscription",
  subs_action_change: "Change Plan",
  subs_confirm_buy: "Start a new {tier} subscription?",
  subs_toast_buy_success: "Subscription purchase started",
  subs_buy_select_plan: "Select a Plan",
  subs_buy_trial_available: "3-Day Free Trial Available",
  subs_error_already_subscribed: "You already have an active subscription",
  subs_error_no_trial: "Trial already used or subscription active",
  
  payment_view_profile: "View Your VIP Profile",
    payment_redirecting: "You will be redirected automatically in a few seconds...",
    
    profile_portal_error: "Error",
    profile_portal_error_desc: "Could not open subscription portal",
    
    reaction_heart: "Heart",
    reaction_sad: "Sad",
    reaction_strong: "Power",
    reaction_thinking: "Interesting",
    reaction_auth_required: "Authentication required",
    reaction_auth_required_desc: "You must be authenticated to react",
    
    moderation_reject_desc: "Provide a reason for rejecting this confession",
    notification_followed: "started following you",
    notification_badge_earned: "you earned a new badge!",
    notification_streak_milestone: "you reached a new milestone!",
    recommended_read: "Read",
    referral_coins_earned: "Coins Earned",
    referral_your_code: "Your Referral Code",
    anonymous_user: "User",
    leaderboard_top_this_week: "Top This Week",
    recommended_for_you: "Recommended for You",
    badges_earned_on: "Earned on",
    
    analytics_category_distribution: "Category Distribution",
    error_something_wrong: "Oops! Something went wrong",
    error_unexpected: "An unexpected error occurred. Please try again.",
    error_try_again_desc: "Try again",
    error_reload_page: "Reload Page",
    error_retry: "Try Again",
    ui_previous: "Previous",
    ui_next: "Next",
    ui_toggle_sidebar: "Toggle Sidebar",
    ui_image_preview: "Image preview",
    ui_confession_image: "Confession image",
    ui_following_feed: "Following Feed",
    ui_close: "Close",
    ui_previous_slide: "Previous slide",
    ui_next_slide: "Next slide",
    follow_connections: "Connections",
    follow_following: "Following",
    follow_followers: "Followers",
    mood_distribution: "Your Mood Distribution",
    mood_intensity_evolution: "Intensity Evolution",
    rate_limit_title: "Too Many Requests",
    rate_limit_desc: "You've reached the AI request limit. Please wait a few moments before trying again.",
    rate_limit_remaining: "Requests Remaining",
    rate_limit_reset_in: "Resets in {time}",
    rate_limit_wait_message: "You've reached the limit. Please try again later.",
    moderation_action_done: "Action Completed",
    moderation_action_approved: "approved",
    moderation_action_rejected: "rejected",
    moderation_action_marked: "marked",
    moderation_error_action: "Could not perform action",
    moderation_panel_title: "Moderation Panel",
    moderation_role_admin: "Administrator",
    moderation_role_moderator: "Moderator",
    moderation_reports_title: "Reasons:",
    referral_program_title: "Referral Program",
    referral_completed: "Completed",
    deep_insight_your_confession: "Your confession:",
    moderation_pending_count: "Pending",
    moderation_approve: "Approve",
    moderation_reported_count: "Reported",
    moderation_reason_optional: "Reason (optional)...",
    referral_link_copied_toast: "Link copied!",
    referral_link_copied_desc: "The referral link has been copied to clipboard",
    referral_pending: "Pending",
    streak_your: "Your Streak",
    streak_consecutive_days: "Consecutive Days",
    streak_personal_best: "Personal Best",
    subscription_payment_error_desc: "Could not initiate payment process",
    preferences_color_green: "Green",
    preferences_color_red: "Red",
    preferences_color_orange: "Orange",
    preferences_color_violet: "Violet",
    preferences_color_blue: "Blue",
    preferences_color_pink: "Pink",
    following_your_feed: "Your Feed",
    index_back_to_feed: "Back to Feed",
    moderation_category_label: "Category",
    
    // Instagram-style Social
    explore: "Explore",
    compose: "Compose",
    type_message_placeholder: "Type a message...",
    send_message_button: "Send",
    message_sent_toast: "Message sent",
    message_failed_toast: "Failed to send message",
    retry_send: "Retry",
    delete_message_action: "Delete message",
    delete_message_confirm_text: "Are you sure you want to delete this message?",
    read_receipt_status: "Read",
    unread_count_badge: "new",
    message_thread_title: "Messages",
    
    // Profile Header
    posts_count: "Posts",
    followers_count: "Followers",
    following_count: "Following",
    message_user_button: "Message",
    edit_profile: "Edit Profile",
    profile_bio: "Bio",
    profile_bio_placeholder: "Tell us about yourself...",
    profile_handle: "Handle",
    profile_avatar: "Avatar",
    profile_privacy_public: "Public",
    profile_privacy_limited: "Limited",
    profile_privacy_private: "Private",
    profile_privacy_mode: "Privacy Mode",
    user_is_typing: "{user} is typing...",
    users_are_typing: "{users} are typing...",
    
    // Quote of the Day
    qotd_title: "Quote of the Day",
    qotd_loading: "Loading quote...",
    
    // Admin Panel
    admin_title: "Admin Dashboard",
    admin_moderation_queue: "Moderation Queue",
    admin_reports: "Reports",
    admin_no_items: "No items to review",
    admin_approve: "Approve",
    admin_reject: "Reject",
    admin_view_confession: "View Confession",
    
    // GDPR & Privacy
    export_data_description_text: "Download a copy of all your data",
    export_data_success_toast: "Data exported successfully",
    export_data_failed_toast: "Failed to export data",
    delete_my_account_button: "Delete My Account",
    delete_account_warning_full: "This action cannot be undone. All your data will be permanently deleted.",
    delete_account_confirm_dialog: "Are you sure you want to delete your account?",
    account_deleted_toast: "Account deleted successfully",
    consent_management_title: "Consent Management",
    view_consents_button: "View My Consents",
    
    // Crisis Support
    crisis_support_title: "Crisis Support",
    crisis_message_text: "If you're experiencing thoughts of self-harm or suicide, please reach out for help immediately:",
    crisis_hotline_label: "Crisis Hotline",
    crisis_chat_label: "Online Crisis Chat",
    emergency_services_label: "Emergency Services",
    you_are_not_alone_message: "You are not alone. Help is available.",
    
    // Safety & Moderation
    content_review_notice_title: "Content Review Notice",
    content_blocked_title: "Content Blocked",
    moderation_reason_label: "Reason:",
    
    // Communities
    communities_title: "Communities",
    communities_discover: "Discover communities that share your interests",
    communities_create: "Create Community",
    communities_category: "Category",
    communities_name: "Community Name",
    communities_description: "Description",
    communities_slug_label: "Slug (URL identifier)",
    communities_slug_placeholder: "community-slug",
    communities_icon: "Icon (emoji)",
    communities_private: "Private Community",
    communities_creating: "Creating...",
    communities_create_success: "Community created successfully",
    communities_create_error: "Failed to create community",
    communities_join: "Join",
    communities_leave: "Leave",
    communities_members: "members",
    communities_posts: "posts",
    communities_not_found: "Community not found",
    communities_back: "Back to Communities",
    communities_no_posts: "No confessions yet. Be the first to share!",
    communities_first_post: "Be the first to share!",
    communities_recent: "Recent Confessions",
    communities_create_confession: "Create Confession",
    communities_filter_all: "All",
    communities_filter_mental_health: "Mental Health",
    communities_filter_relationships: "Relationships",
    communities_filter_work: "Work & Career",
    communities_filter_general: "General",
    
    // Location
    location_add: "Add location (optional)",
    location_detecting: "Detecting location...",
    location_detected: "Location detected",
    location_error: "Location error",
    location_error_permission: "Could not get your location. Please enable location permissions.",
    location_city: "Location",
    location_optional: "Location (optional)",
    location_community_optional: "Community (optional)",
    location_select_community: "Select a community",
    location_no_community: "No community",
    
    // Nearby Confessions
    nearby_title: "Nearby Confessions",
    nearby_discover: "Discover confessions from people around you",
    nearby_radius: "Radius",
    nearby_within_km: "Within {km} km",
    nearby_list_view: "List",
    nearby_map_view: "Map",
    nearby_map_coming_soon: "Map view coming soon",
    nearby_no_location: "Could not get your location",
    nearby_enable_location: "Please enable location permissions to see nearby confessions",
    nearby_none_found: "No nearby confessions found",
    nearby_increase_radius: "Try increasing the search radius or check back later",
    nearby_distance_km: "{distance} km",
    
    // Quick Actions
    quick_action_new: "New",
    quick_action_explore: "Explore",
    quick_action_messages: "Messages",
    quick_action_search: "Search",
    quick_action_communities: "Communities",
    quick_action_nearby: "Nearby",
    
    // Profile Tiers
    profile_tiers_free: "Free Member",
    profile_tiers_vip: "VIP Member",
    profile_tiers_expires: "Expires on {date}",
    profile_tiers_benefits: "View benefits",
    
    // Perks System
    perks_title: "My Perks",
    perks_subscription_title: "Subscription",
    perks_badges_title: "Badges & Flairs",
    perks_badges_status_active: "Active",
    perks_badges_status_expired: "Expired",
    perks_badges_status_hidden: "Hidden",
    perks_badges_make_public: "Make Public",
    perks_badges_make_private: "Make Private",
    perks_badges_set_featured: "Set as Featured",
    perks_badges_remove_featured: "Remove from Featured",
    perks_badges_earned_on: "Earned on {date}",
    perks_no_badges: "No badges yet. Start by posting confessions!",
    
    // Shop
    shop_title: "Flairs Shop",
    shop_required_plan_free: "Available for all",
    shop_required_plan_vip: "Requires VIP",
    shop_lock_vip: "Upgrade to VIP to unlock",
    shop_purchase: "Purchase",
    shop_purchased: "Purchased",
    shop_expires_in: "Expires in {days} days",
    shop_expired: "Expired",
    shop_active_for: "Active for 5 days",
    shop_buy_again: "Buy Again",
    shop_coins_balance: "Coins: {balance}",
    
    // Flair Names (Additional)
    flair_sparkle: "Sparkle",
    flair_gem: "Gem",
    flair_lightning: "Lightning",
    flair_magic: "Magic",
    
    // Errors
    errors_plan_too_low: "This item requires {plan}",
    
    // Test-required keys
    common_confirm: "Confirm",
    common_loading: "Loading...",
    auth_signin: "Sign In",
    auth_signout: "Sign Out",
    auth_signup: "Sign Up",
    auth_login: "Login",
    subscription_cancel: "Cancel Subscription",
    subscription_active: "Active",
    subscription_expired: "Expired",
    subscription_trial: "Trial",
    nav_confessions: "Confessions",
    confession_submit: "Submit Confession",
    confession_content: "Confession Content",
    error_network: "Network error",
    error_validation: "Validation error",
    
    // Daily Rewards
    reward_daily_title: "Daily Login Reward",
    reward_daily_desc: "Claim your free coins!",
    reward_claim: "Claim",
    reward_claimed: "Reward Claimed!",
    reward_claimed_desc: "You received 10 coins for logging in today",
    
    // VIP Teasers
    teaser_feature: "Unlock VIP Features",
    teaser_description: "Get unlimited insights, priority support, and exclusive perks",
    teaser_unlock: "Unlock VIP",
    teaser_explore_feature: "Discover More Content",
    teaser_explore_description: "VIP users get access to exclusive trending content and advanced search",
    
    // Feature Comparison
    comparison_title: "Compare Plans",
    comparison_feature: "Feature",
    comparison_daily_confessions: "Daily Confessions",
    comparison_ai_responses: "AI Responses",
    comparison_deep_insights: "Deep Insights",
    comparison_analytics: "Advanced Analytics",
    comparison_boost: "Boost Confessions",
    comparison_priority_support: "Priority Support",
    comparison_custom_badge: "Custom Badge",
    comparison_unlimited: "Unlimited",
    comparison_upgrade_now: "Upgrade Now",
    
    // Trending Hashtags
    hashtags_trending: "Trending Hashtags",
    
    // Install Prompt
    install_app: "Install App",
    install_app_description: "Add ConfessAI to your home screen for a better experience",
    install: "Install",
    not_now: "Not Now",
    
    // Onboarding
    onboarding_anonymous_desc: "Your identity is protected. Share freely without fear.",
    onboarding_social_title: "Social Features",
    onboarding_social_desc: "Follow users, like confessions, and build your community.",
    onboarding_messages_title: "Direct Messages",
    onboarding_messages_desc: "Connect privately with others in the community.",
    onboarding_ai_title: "AI Insights",
    onboarding_ai_desc: "Get thoughtful AI responses to your confessions.",
    onboarding_welcome_title: "Welcome to Your Safe Space",
    onboarding_welcome_desc: "A place where you can share your thoughts anonymously and connect with others",
    onboarding_privacy_title: "Your Privacy Matters",
    onboarding_privacy_desc: "We use end-to-end encryption and never share your data. Your confessions remain anonymous unless you choose otherwise.",
    onboarding_terms_desc: "By continuing, you agree to our Terms of Service and Privacy Policy. You can delete your data at any time from your profile settings.",
    
    // Network Status
    network_offline: "You are offline. Messages will be sent when connection is restored.",
    network_syncing: "Syncing {count} pending operation(s)...",
    
    // Content Moderation
    content_warning_title: "Personal Information Detected",
    content_warning_detected: "Personal information detected. Continue?",
    content_warning_continue: "Post Anyway",
    content_email: "Email address",
    content_phone: "Phone number",
    content_address: "Physical address",
    content_banned: "Restricted content",

    // Admin
    admin_performance: "Performance Metrics",
    admin_performance_desc: "System health and monitoring",
    admin_active_users: "Active Users",
    admin_last_5_minutes: "Last 5 minutes",
    admin_cache: "Cache Management",
    admin_clear_cache: "Clear Cache",
    admin_confirm_clear: "Clear all cache?",
    admin_clear_warning: "This will remove all cached data. Users may experience slower loading temporarily.",
    cache_cleared: "Cache cleared successfully",

    // Analytics
    analytics_engagement: "Engagement Breakdown",
    analytics_engagement_desc: "Distribution of interactions",
    analytics_best_times: "Best Times to Post",
    analytics_best_times_desc: "Peak engagement hours",
    views: "Views",
    likes: "Likes",
    comments: "Comments",
    shares: "Shares",

    // Quick Actions
    scroll_top: "Scroll to Top",
    drafts: "Drafts",

    // Font Size Control
    font_size_small: "Small",
    font_size_normal: "Normal",
    font_size_large: "Large",
    font_size_xl: "Extra Large",
    
    // Copy Text
    copy_text: "Copy text",
    text_copied: "Text copied to clipboard",
    
    // Anonymous Badge
    anonymous_badge: "100% Anonymous",
    identity_protected: "Your identity is completely protected",
    
    // Offline Enhanced
    offline_mode: "Offline Mode",
    offline_message: "You're offline. Content will sync when connected",
    
    // Haptic
    haptic_enabled: "Haptic Feedback Enabled",
    
    // Loading Quotes
    loading_quote_1: "Secrets make us human...",
    loading_quote_2: "Your story matters...",
    loading_quote_3: "Everyone has something to share...",
    
    // Edit/Delete Windows
    edit_available: "Edit available for {seconds}s",
    delete_available: "Delete available for {time}",
    edit_window_expired: "Edit window expired",
    
    // Theme
    theme_oled: "OLED Black",
    
    confession_new: "New Confession",

    // Filters
    filters_title: "Filters",
    filters_date: "Date Range",
    filters_community: "Community",
    filters_sort: "Sort By",
    filters_clear: "Clear Filters",
    sort_newest: "Newest First",
    sort_oldest: "Oldest First",
    sort_most_liked: "Most Liked",
    sort_most_commented: "Most Commented",
    
    // Common (continued)
    common_continue: "Continue",
    
    // Karma
    karma_points: "Karma Points",
    karma_level: "Level",
    karma_next_level: "Next Level",
    karma_points_to_go: "points to go",
    
    // Search Suggestions
    search_recent: "Recent",
    search_clear: "Clear",
    
    // Sensitive Content
    sensitive_content_warning: "Sensitive Content",
    sensitive_content_description: "This content may be disturbing or triggering",
    sensitive_content_view: "View Anyway",
    
    // Coin System
    coins_balance: "Balance",
    coins_get_more: "Get Coins",
    coins_shop_title: "Coin Shop",
    coins_shop_subtitle: "Purchase coins to unlock premium features",
    coins_best_value: "Best Value",
    coins_per_coin: "per coin",
    coins_buy_now: "Buy Now",
    coins_processing: "Processing...",
    coins_secure_payment: "🔒 Secure Payment",
    coins_instant_delivery: "⚡ Instant Delivery",
    coins_satisfaction: "✓ 100% Satisfaction",
    coins_purchase_error: "Purchase failed. Please try again.",
    coins_purchase_success_title: "Purchase Successful!",
    coins_purchase_success_message: "Your coins have been added to your account",
    coins_purchase_cancelled_title: "Purchase Cancelled",
    coins_purchase_cancelled_message: "Your payment was cancelled. No charges were made.",
    coins_go_home: "Go Home",
    coins_visit_store: "Visit Store",
    coins_try_again: "Try Again",
    coins_most_popular: "Most Popular",
    
    // Gift Coins
    coins_gift_title: "Gift Coins",
    coins_gift_amount: "Amount",
    coins_gift_message: "Message (Optional)",
    coins_gift_anonymous: "Send Anonymously",
    coins_gift_anonymous_fee: "+50 coins fee",
    coins_gift_platform_fee: "Platform fee (5%)",
    coins_gift_total: "Total cost",
    coins_gift_send: "Send Gift",
    coins_gift_success: "Successfully gifted {amount} coins!",
    coins_gift_insufficient: "Insufficient coins. You need {amount} coins",
    
    // Awards
    coins_award_title: "Give an Award",
    coins_award_star: "Star",
    coins_award_heart: "Heart",
    coins_award_fire: "Fire",
    coins_award_diamond: "Diamond",
    coins_award_give: "Give Award",
    coins_award_success: "Award given! The creator earned {amount} coins",
    coins_award_creator_earns: "Creator earns",
    coins_award_appreciation: "Show your appreciation! The creator will receive 50% of the award value.",
    
    // Boosts
    coins_boost_title: "Boost Your Confession",
    coins_boost_basic: "Basic Boost",
    coins_boost_super: "Super Boost",
    coins_boost_pin: "Profile Pin",
    coins_boost_activate: "Activate Boost",
    coins_boost_active: "Boost Active",
    coins_boost_expires: "Expires in {hours} hours",
    coins_boost_description: "Boost your confession to reach more people and get more engagement!",
    coins_boost_duration: "Duration",
    coins_boost_success: "{name} activated for {duration}!",
    coins_boost_already_active: "This confession already has an active boost",
    
    // Subscription flow messages
    payment_processing_wait: "Processing your subscription… please wait",
    upgrade_processing_now: "Upgrading your plan…",
    upgrade_success: "Plan upgraded successfully",
    downgrade_scheduled_next_period: "Your downgrade is scheduled for the next billing period.",
    cancel_scheduled: "Your subscription will end at the end of this billing period.",
    processing_request: "Processing your request…",
    request_done: "Done!",
    upgradeFailed: "Upgrade failed. Please try again.",
    webhookLag: "Upgrade received. Syncing your account…",
    already_on_this_plan: "You are already on this plan.",
    invalid_target_plan: "Invalid target plan.",
  },
  es: {
    app_name: "Confess+",
    welcome_title: "Bienvenido a Confess+",
    welcome_description: "Un espacio seguro donde puedes compartir cualquier cosa de forma anónima.",
    anonymous_secure: "100% Anónimo y Seguro",
    anonymous_description: "Tu identidad permanece completamente confidencial. No almacenamos información personal.",
    ai_support: "Soporte IA Empático",
    ai_description: "Recibe respuestas empáticas de IA y, con VIP, insights psicológicos profundos.",
    get_started: "Comenzar",
    skip: "Saltar",
    next: "Siguiente",
    
    home_title: "Confesiones Anónimas",
    new_confession: "Nueva Confesión",
    vip_upgrade: "Actualizar a VIP",
    
  placeholder_confession: "Comparte lo que piensas... (10-2000 caracteres)",
  submit: "Enviar confesión",
  submitting: "Enviando...",
    
    ai_reply_title: "Respuesta IA",
    deep_insight_title: "Insight Profundo",
    generate_insight: "Generar Insight Profundo",
    insight_title: "Deep Insight",
    insight_run: "Ejecutar",
    insight_reset: "Reiniciar",
    insight_delete: "Eliminar Insight",
    
    user_anonymous: "Anónimo",
    
    boost_cta: "Impulsar confesión",
    boost_price: "{price} monedas",
    boost_active: "Impulso activo",
    boost_badge: "Impulsada",
    boost_confirm: "Tu confesión fue impulsada por 24h.",
    boost_expiry_in: "Expira en {time}",
    boost_reboost: "Reimpulsar",
    boost_not_enough: "No tienes monedas suficientes.",
    boost_error_active: "Ya hay un impulso activo para esta confesión.",
    
  subscription_tier_free: "Free",
  subscription_tier_vip: "VIP",
  subscription_cta_upgrade: "Obtener suscripción",
  subscription_upgrade: "Mejorar plan",
  subscription_downgrade: "Bajar plan",
  subscription_single_active_policy: "Solo se permite una suscripción activa. Usa Mejorar, Bajar o Cancelar.",
  subscription_already_subscribed: "Ya tienes una suscripción. Usa Mejorar, Bajar o Cancelar.",
  subscription_conflict_resolved_keep_new: "Tu plan se actualizó a la última compra y el plan antiguo fue cancelado.",
  subscription_conflict_resolved_keep_old: "Tu plan existente permanece activo; la nueva compra fue cancelada.",
  upgrade_required: "Actualización Requerida",
  required: "Requerido",
    
    toast_sent: "Tu confesión fue enviada anónimamente 💭",
    toast_flagged: "Contenido no permitido. Por favor, reformula.",
    error_generic: "Algo salió mal. Inténtalo de nuevo.",
    
    report: "Reportar",
    share: "Compartir",
    delete: "Eliminar",
    
    language: "Idioma",
    profile: "Perfil",
    settings: "Configuración",
    logout: "Cerrar Sesión",
    login: "Iniciar Sesión",
    signup: "Registrarse",
    
    confessions_count: "confesiones",
    insights_used: "insights usados",
    member_since: "Miembro desde",
    
    crisis_hint: "Si estás en peligro inmediato, contacta a los servicios de emergencia locales.",
    
    error_submit: "No se pudo enviar la confesión. Inténtalo de nuevo.",
    error_delete: "No se pudo eliminar la confesión.",
    error_load: "No se pudieron cargar las confesiones.",
    error_auth: "Debes estar autenticado para publicar.",
    
    success_sent: "¡Tu confesión fue enviada! 💜",
    success_deleted: "Confesión eliminada exitosamente.",
    success_reported: "Reporte enviado. Revisaremos esta confesión. ¡Gracias!",
    success_logout: "¡Hasta luego! 👋",
    
    validation_min: "La confesión debe tener al menos 10 caracteres",
    validation_max: "La confesión no puede exceder 2000 caracteres",
    
    deep_insight_vip: "Deep Insight solo está disponible para usuarios VIP.",
    deep_insight_description: "Análisis psicológico profundo para comprensión completa.",
    deep_insight_success: "¡Deep Insight generado! ✨",
    
    vip_member: "Miembro VIP",
    vip_feature: "Función VIP",
    vip_benefits: "Deep Insights ilimitados, respuestas detalladas, sin anuncios.",
    upgrade_now: "Actualizar Ahora",
    
    delete_account: "Eliminar Cuenta",
    delete_account_description: "Eliminar permanentemente tu cuenta y todos los datos asociados",
    delete_confirm: "Eliminar Permanentemente",
    delete_warning: "Esta acción no se puede deshacer. Eliminará permanentemente tu cuenta y todos los datos.",
    deleting: "Eliminando...",
    export_data: "Exportar Datos",
    
    referral_title: "Invitar Amigos",
    referral_description: "Gana 1 día VIP por cada amigo que se registre",
    referral_earned: "¡Ganaste {days} días de VIP gratis!",
    
    privacy_policy: "Política de Privacidad",
    terms_of_service: "Términos de Servicio",
    all_rights_reserved: "Todos los derechos reservados.",
    
    // Categories
    category_relationships: "Relaciones",
    category_work: "Trabajo",
    category_family: "Familia",
    category_health: "Salud",
    category_money: "Dinero",
    category_other: "Otro",
    select_category: "Selecciona una categoría",
    filter_by_category: "Filtrar por categoría",
    all_categories: "Todas las Categorías",
    
    // Analytics
    analytics_title: "Tus Estadísticas",
    analytics_total_confessions: "Total Confesiones",
    analytics_total_likes: "Likes Recibidos",
    analytics_most_popular: "Más Popular",
    analytics_by_category: "Por Categoría",
    analytics_no_data: "Sin datos aún",
    
    // Comments
    comments_title: "Comentarios",
    comments_add: "Agregar un comentario",
    comments_placeholder: "Escribe tu comentario... (máx 500 caracteres)",
    comments_submit: "Publicar",
    comments_delete: "Eliminar",
    comments_edit: "Editar",
    comments_none: "Sin comentarios aún",
    comments_show: "Mostrar comentarios",
    comments_hide: "Ocultar comentarios",
    
    // Notifications
    notifications_title: "Notificaciones",
    notifications_mark_read: "Marcar todas como leídas",
    notifications_mark_all_read: "Marcar todo como leído",
    notifications_delete: "Eliminar notificación",
    notifications_delete_all: "Eliminar todo",
    notifications_delete_confirm: "¿Estás seguro de que quieres eliminar esta notificación?",
    notifications_delete_all_confirm: "Esto eliminará todas tus notificaciones. Esta acción no se puede deshacer.",
    notifications_marked_read: "Todo marcado como leído",
    notifications_deleted: "Notificación eliminada",
    notifications_all_deleted: "Todas las notificaciones eliminadas",
    notifications_none: "Sin notificaciones",
    notification_like: "le gustó tu confesión",
    notification_comment: "comentó en tu confesión",
    notification_new: "Nueva",
    notification_message_prefix: "Mensaje nuevo:",
    notification_message_new: "Mensaje nuevo",
    notification_view: "Ver",
    
    // Bookmarks
    bookmarks_title: "Guardadas",
    bookmarks_add: "Guardar",
    bookmarks_remove: "Eliminar",
    bookmarks_none: "Sin confesiones guardadas",
    bookmarks_saved: "Guardado en marcadores",
    
    achievements_title: "Logros",
    achievements_unlocked: "desbloqueados",
    achievement_first_confession: "Primera Confesión",
    achievement_first_confession_desc: "Publicaste tu primera confesión",
    achievement_active_user: "Usuario Activo",
    achievement_active_user_desc: "Publicaste 10+ confesiones",
    achievement_power_user: "Power User",
    achievement_power_user_desc: "Publicaste 50+ confesiones",
    achievement_deep_thinker: "Pensador Profundo",
    achievement_deep_thinker_desc: "Generaste 5+ Deep Insights",
    achievement_vip_member: "Miembro VIP",
    achievement_vip_member_desc: "Miembro de la comunidad VIP",
    achievement_supporter: "Seguidor",
    achievement_supporter_desc: "Apoyas el desarrollo de la plataforma",
    
    feature_ai_empathy: "Empatía IA",
    feature_ai_empathy_desc: "Respuestas empáticas generadas por IA entrenada para comprender y apoyar",
    feature_anonymous: "100% Anónimo",
    feature_anonymous_desc: "Tu identidad permanece confidencial; las confesiones no pueden ser atribuidas",
    feature_deep_insights: "Deep Insights",
    feature_deep_insights_desc: "Análisis psicológico profundo para una comprensión completa (VIP)",
    feature_instant_response: "Respuesta Instantánea",
    feature_instant_response_desc: "Obtén retroalimentación inmediata, disponible 24/7 cuando lo necesites",
    
    error_boundary_title: "¡Ups! Algo salió mal",
    error_boundary_description: "Lo sentimos por el inconveniente. Intenta recargar la página o volver a la página principal.",
    error_boundary_reload: "Recargar",
    error_boundary_home: "Inicio",
    
    referral_link_label: "Tu enlace de referidos:",
    referral_friends_invited: "amigos invitados",
    referral_link_copied: "¡Enlace copiado! 🎉",
    referral_share_message: "Únete a mí en Confess+ - ¡un espacio seguro para confesiones anónimas con soporte de IA!",
    referral_reward_message: "¡Ganaste {days} días de VIP gratis!",
    referral_continue_inviting: "Sigue invitando amigos para más beneficios",
    
    share_title: "Compartir Confesión",
    share_copy_link: "Copiar Enlace",
    share_link_copied: "¡Enlace copiado!",
    share_text: "Descubre esta confesión en Confess+",
    
    stats_active_users: "Usuarios activos",
    stats_confessions_shared: "Confesiones compartidas",
    stats_empathetic_reactions: "Reacciones empáticas",
    stats_vip_members: "Miembros VIP",
    
    auth_welcome_back: "Bienvenido de nuevo",
    auth_create_account: "Crea tu cuenta gratuita",
    auth_email_placeholder: "Email",
    auth_password_placeholder: "Contraseña",
    auth_logging_in: "Iniciando sesión...",
    auth_creating_account: "Creando cuenta...",
    auth_login_button: "Iniciar Sesión",
    auth_signup_button: "Registrarse",
    auth_no_account: "¿No tienes cuenta?",
    auth_signup_link: "Regístrate",
    auth_have_account: "¿Ya tienes cuenta?",
    auth_login_link: "Iniciar sesión",
    auth_benefits_title: "Beneficios de cuenta gratuita:",
    auth_benefit_unlimited: "Confesiones anónimas ilimitadas",
    auth_benefit_ai_responses: "Respuestas empáticas de IA",
    auth_benefit_community: "Comunidad de apoyo",
    auth_invalid_email: "Email inválido",
    auth_password_min: "La contraseña debe tener al menos 6 caracteres",
    auth_invalid_credentials: "Email o contraseña incorrectos",
    auth_email_exists: "Este email ya está registrado",
    auth_welcome_message: "Bienvenido a la comunidad Confess+",
    auth_login_success: "Inicio de sesión exitoso.",
    auth_signup_success: "¡Cuenta creada exitosamente! 🎉",
    auth_error: "Error",
    auth_error_generic: "Ocurrió un error. Por favor, inténtalo de nuevo.",
    auth_captcha_failed: "Verificación CAPTCHA fallida. Por favor, inténtalo de nuevo.",
    auth_session_revoked: "Sesión revocada exitosamente.",
    auth_all_sessions_revoked: "Todas las sesiones revocadas. Por favor, inicia sesión nuevamente.",
    auth_device_mismatch: "Dispositivo no coincidente detectado. Por favor, inicia sesión nuevamente.",
    auth_session_limit: "Número máximo de sesiones activas alcanzado. Por favor, cierra sesión en otro dispositivo.",
    auth_account_locked: "Cuenta bloqueada temporalmente debido a múltiples intentos fallidos de inicio de sesión. Por favor, inténtalo más tarde.",
    auth_password_rules_title: "Requisitos de contraseña:",
    auth_password_rules_len: "Al menos 10 caracteres",
    auth_password_rules_upper: "Al menos una letra mayúscula (A-Z)",
    auth_password_rules_lower: "Al menos una letra minúscula (a-z)",
    auth_password_rules_digit: "Al menos un número (0-9)",
    auth_password_rules_special: "Al menos un carácter especial (!@#$%^&*...)",
    auth_password_match_ok: "Las contraseñas coinciden",
    auth_password_match_fail: "Las contraseñas no coinciden",
    auth_password_strength_weak: "Débil",
    auth_password_strength_fair: "Regular",
    auth_password_strength_good: "Buena",
    auth_password_strength_strong: "Fuerte",
    auth_stay_signed_in: "Mantener sesión iniciada",
    auth_confirm_password_placeholder: "Confirmar contraseña",
    auth_show_password: "Mostrar contraseña",
    auth_hide_password: "Ocultar contraseña",
    auth_password_too_short: "La contraseña debe tener al menos 10 caracteres",
    auth_password_weak: "La contraseña no cumple con los requisitos de seguridad",
    auth_validation_passed: "Validación exitosa",
    auth_success: "¡Éxito!",
    
    // Password Reset
    passwordReset_title: "Restablecer Contraseña",
    passwordReset_emailSent: "¡Correo de restablecimiento enviado! Revisa tu bandeja de entrada.",
    passwordReset_emailPlaceholder: "Ingresa tu dirección de correo",
    passwordReset_submitButton: "Enviar Enlace de Restablecimiento",
    passwordReset_loading: "Enviando...",
    
    common_success: "Éxito",
    common_something_went_wrong: "Algo salió mal. Por favor, inténtalo de nuevo.",
    common_unauthorized: "Acceso no autorizado.",
    common_rate_limit: "Demasiadas solicitudes. Por favor, inténtalo más tarde.",
    
    ui_recent: "Reciente",
    ui_popular: "Popular",
    ui_loading: "Cargando...",
    ui_safe_space: "Espacio seguro y anónimo",
    ui_share_thoughts: "Comparte tus pensamientos",
    ui_safe_description: "Un lugar seguro donde puedes ser tú mismo. Escribe anónimamente lo que sientes y recibe respuestas empáticas de IA.",
    ui_no_confessions: "Aún no hay confesiones",
    ui_first_confession_desc: "Sé el primero en compartir tus pensamientos. Obtendrás instantáneamente una respuesta empática de IA.",
    ui_upgrading: "Actualizando... 💳",
    ui_payment_redirect: "Redirigiendo al sistema de pago (Demo)",
    ui_welcome_vip: "¡Bienvenido a VIP! 🎉",
    ui_vip_access: "Ahora tienes acceso a todas las funciones VIP.",
    ui_help_question: "¿Cómo podemos ayudarte?",
    ui_help_choose: "Elige una de las opciones a continuación para obtener ayuda",
    ui_help_reply_time: "Normalmente respondemos en 24 horas",
    ui_pull_to_refresh: "Desliza para actualizar",
    ui_release_to_refresh: "Suelta para actualizar",
    ui_refreshing: "Actualizando...",
    
    subscription_vip_title: "Confess+ VIP",
    subscription_choose_plan: "Elegir {plan}",
    subscription_monthly: "Mensual",
    subscription_yearly: "Anual",
    subscription_per_month: "por mes",
    subscription_per_year: "por año",
    subscription_save_percent: "Ahorra 40%",
    subscription_most_popular: "MÁS POPULAR",
    subscription_subscribe: "Suscribirse",
    subscription_subscribe_yearly: "Suscripción Anual",
    subscription_processing: "Procesando...",
    subscription_cancel_anytime: "Puedes cancelar en cualquier momento desde la configuración de la cuenta. Sin compromisos a largo plazo.",
    subscription_cancel_confirm: "¿Estás seguro de que quieres cancelar tu suscripción? Perderás el acceso a todas las funciones VIP al final de tu período de facturación.",
    subscription_benefit_1: "Deep Insight AI ilimitado - análisis psicológico profundo",
    subscription_benefit_2: "Respuestas de IA extendidas y más detalladas",
    subscription_benefit_3: "Sin anuncios - experiencia limpia",
    subscription_benefit_4: "Prioridad en procesamiento de IA",
    subscription_benefit_5: "Acceso a funciones futuras",
    subscription_auth_required: "Debes estar autenticado para suscribirte.",
    subscription_error: "No se pudo iniciar el proceso de suscripción. Inténtalo de nuevo.",
    
    // Subscription Plans - New Benefits (Confession Limits)
    plans_free_benefit_confessions: "3 confesiones por día",
    plans_vip_benefit_confessions: "Confesiones ilimitadas por día",
    plans_free_benefit_basic: "Funciones básicas",
    plans_free_benefit_ads: "Anuncios habilitados",
    plans_vip_benefit_unlimited_ai: "Respuestas AI ilimitadas",
    plans_vip_benefit_no_ads: "Sin anuncios",
    plans_vip_benefit_custom_themes: "Temas personalizados",
    plans_vip_benefit_private_confessions: "Confesiones privadas",
    plans_vip_benefit_advanced_stats: "Estadísticas avanzadas",
    plans_vip_benefit_special_badge: "Insignia VIP especial",
    plans_vip_benefit_unlimited_ai_desc: "Análisis AI ilimitado",
    plans_vip_benefit_priority_ai: "Respuestas AI prioritarias",
    plans_vip_benefit_priority_support: "Soporte prioritario",
    plans_vip_benefit_coins_bonus: "+250 monedas de bonificación",
    plans_vip_benefit_login_rewards: "Recompensas de inicio de sesión diarias",
    plans_vip_benefit_images: "Confesiones con imagen",
    plans_vip_benefit_stats: "Estadísticas detalladas",
    plans_vip_benefit_support: "Soporte prioritario",
    plans_vip_benefit_badge: "Insignia VIP especial",
    plans_upgrade_now: "Actualizar ahora",
    plans_downgrade: "Bajar de categoría",
    plans_current_plan: "Plan Actual",
    plans_renews_on: "Se renueva el",
    plans_vip_activated: "👑 ¡Ahora eres VIP!",
    plans_vip_welcome: "¡Bienvenido a VIP! Disfruta de confesiones ilimitadas y soporte prioritario.",
    
    // Plan Titles and Tooltips
    plans_free_title: "Gratis",
    plans_free_tooltip: "Miembro Gratis",
    plans_vip_title: "VIP",
    plans_vip_tooltip: "Miembro VIP - Acceso VIP con beneficios exclusivos",
    
    // Paywall
    plans_paywall_title: "Elige tu plan de suscripción",
    plans_paywall_subtitle: "Compara características y encuentra tu mejor experiencia.",
    
    // Trial System
    trial_offer_title: "¡Prueba VIP Gratis!",
    trial_offer_desc: "Obtén acceso VIP completo por 3 días, sin tarjeta de crédito",
    trial_button_text: "Prueba 3 Días Gratis",
    trial_already_used_title: "Prueba Ya Usada",
    trial_already_used_desc: "Ya has usado tu prueba gratuita.",
    trial_activated_title: "🎉 ¡Prueba VIP Activada!",
    trial_activated_desc: "¡Disfruta de 3 días de funciones VIP gratis!",
    trial_activation_error: "No se pudo activar la prueba. Inténtalo de nuevo.",
    trial_banner_title: "🎉 Prueba VIP Activa",
    trial_banner_days_remaining: "{days} días restantes",
    trial_banner_desc: "Disfruta todas las funciones VIP por 3 días.",
    trial_banner_cta: "Prueba 3 días gratis",
    trial_banner_disclaimer: "Después de 3 días, se te cobrará el precio de VIP a menos que canceles.",
    trial_error_used: "Ya has utilizado tu prueba de VIP.",
    trial_error_already_subscribed: "Ya tienes una suscripción activa.",
    trial_ended_toast: "Tu prueba de VIP terminó. Has vuelto a Free.",
    trial_purchase: "Prueba",
    
    // Confession Limits
    limit_reached_title: "Límite Diario Alcanzado",
    limit_reached_description: "Has alcanzado tu límite diario de confesiones. ¡Mejora para publicar más!",
    limit_current_plan: "Plan Actual",
    limit_used_today: "Usado Hoy",
    limit_resets_in: "Se reinicia en",
    limit_upgrade_benefits: "Mejora para publicar más:",
    limit_see_plans: "Ver Planes",
    limit_confessions_remaining: "{count} confesiones restantes hoy",
    limit_confessions_unlimited: "Confesiones ilimitadas hoy",
    
    // Auth Captcha
    auth_captcha_required_after_fails: "Por favor verifica que eres humano para continuar",
    
    // Forgot / Reset Password
    auth_forgot_password: "¿Olvidaste tu contraseña?",
    auth_forgot_password_title: "Restablece tu contraseña",
    auth_forgot_password_desc: "Ingresa tu correo y te enviaremos las instrucciones.",
    auth_forgot_password_button: "Enviar enlace de restablecimiento",
    auth_forgot_password_success: "Si existe una cuenta, recibirás instrucciones pronto.",
    auth_reset_password_title: "Crea una nueva contraseña",
    auth_reset_password_desc: "Elige una contraseña segura para tu cuenta.",
    auth_reset_password_button: "Actualizar contraseña",
    auth_reset_password_success: "Contraseña actualizada con éxito. Inicia sesión.",
    auth_reset_password_new: "Nueva contraseña",
    auth_reset_password_confirm: "Confirmar nueva contraseña",
    auth_reset_token_invalid: "Enlace de restablecimiento inválido o expirado",
    auth_reset_token_expired: "Este enlace de restablecimiento ha expirado. Solicita uno nuevo.",
    auth_back_to_login: "Volver al inicio de sesión",
    
    // Email Verification
    auth_verify_email_title: "Verifica tu correo electrónico",
    auth_verify_email_success: "¡Correo verificado exitosamente!",
    auth_verify_email_error: "La verificación falló. Por favor intenta de nuevo.",
    auth_verify_email_desc: "Por favor revisa tu correo para verificar tu cuenta.",
    auth_email_not_verified: "Por favor verifica tu correo para continuar",
    auth_check_email_verify: "Revisa tu correo para verificar tu cuenta",
    
    // Common Actions
    common_close: "Cerrar",
    
    trust_anonymous: "100% Anónimo",
    trust_anonymous_desc: "Tu identidad permanece confidencial",
    trust_ssl: "SSL Seguro",
    trust_ssl_desc: "Todos los datos están encriptados",
    trust_moderation: "Moderación IA",
    trust_moderation_desc: "Contenido verificado automáticamente",
    trust_safe_community: "Comunidad Segura",
    trust_safe_community_desc: "Espacio sin juicios",
    
    payment_canceled_title: "Pago Cancelado",
    payment_canceled_desc: "El proceso de pago fue cancelado. No se ha cobrado ningún importe.",
    payment_back_home: "Volver a la página principal",
    payment_try_again: "Intentar de nuevo",
    payment_contact_help: "Si encontraste problemas, por favor contáctanos.",
    payment_success_title: "¡Pago Exitoso!",
    payment_success_desc: "¡Felicitaciones! Tu cuenta VIP ha sido activada exitosamente.",
    payment_success_deep_insights: "Acceso a Deep Insights IA",
    payment_success_analysis: "Análisis psicológico profundo",
    payment_success_priority: "Soporte prioritario",
    payment_success_explore: "Explorar Confess+",
    payment_redirect_info: "Serás redirigido automáticamente en 5 segundos...",
    
    profile_your_account: "Tu Cuenta",
    profile_subscription_active: "Suscripción activa hasta",
    profile_refresh_status: "Actualizar Estado",
    profile_discover_vip: "Descubre Confess+ VIP",
    profile_vip_description: "Obtén acceso ilimitado a Deep Insights IA, respuestas extendidas y una experiencia sin anuncios.",
    profile_you_are_vip: "¡Eres miembro VIP!",
    profile_vip_thanks: "Disfrutas de todos los beneficios de Confess+. ¡Gracias por tu apoyo! 💜",
    profile_no_confessions: "Aún no has publicado ninguna confesión.",
    
    ucl_no_confessions: "Aún no has publicado ninguna confesión.",
    
    common_back: "Atrás",
    common_error: "Error",
    common_help_aria: "Ayuda",
    common_theme_aria: "Cambiar tema",
    common_view_all: "Ver Todo",
    
    search_results: "Resultados de búsqueda",
    
  communities_trending: "Comunidades Populares",
  communities_all: "Todas las Comunidades",
  communities_empty_title: "Aún No Hay Comunidades",
  communities_empty_description: "¡Sé el primero en crear una comunidad y conectar con otros que comparten tus intereses!",
    
    faq_title: "Preguntas Frecuentes",
    faq_q1: "¿Es realmente anónimo?",
    faq_a1: "¡Sí! Tus confesiones son completamente anónimas. Tu nombre nunca aparece públicamente y no puede ser vinculado a tus confesiones por otros usuarios. Solo almacenamos los datos necesarios para que la plataforma funcione.",
    faq_q2: "¿Cómo funciona la IA?",
    faq_a2: "Nuestra IA analiza tu confesión y genera una respuesta empática y comprensiva. Usamos modelos de lenguaje avanzados entrenados para ser empáticos y sin juicios. Las respuestas no están pre-escritas; se generan únicamente para cada confesión.",
    faq_q3: "¿Qué es Deep Insight?",
    faq_a3: "Deep Insight es una función VIP que proporciona un análisis psicológico más profundo de tu confesión. Incluye perspectivas adicionales, consejos prácticos y preguntas reflexivas para ayudarte a comprender mejor tu situación.",
    faq_q4: "¿Puedo eliminar mis confesiones?",
    faq_a4: "Sí, puedes editar o eliminar tus confesiones en cualquier momento desde la página de perfil. Una vez eliminadas, se eliminan permanentemente de la base de datos.",
    faq_q5: "¿Qué ofrece la suscripción VIP?",
    faq_a5: "VIP te da Deep Insights IA ilimitados, respuestas más detalladas, una experiencia sin anuncios y procesamiento de IA prioritario. ¡También apoyas el desarrollo de la plataforma!",
    faq_q6: "¿Cómo funciona el programa de referidos?",
    faq_a6: "Obtienes un código de referido único que puedes compartir con amigos. Cuando alguien se registra usando tu código, ambos obtienen beneficios. Ver detalles completos en la página de perfil.",
    faq_q7: "¿Mis datos están seguros?",
    faq_a7: "¡Sí! Todos los datos están encriptados y almacenados de forma segura. Usamos las mejores prácticas de seguridad y cumplimos con el GDPR. No vendemos ni compartimos tus datos con terceros.",
    faq_q8: "¿Puedo usar la plataforma para asesoramiento profesional?",
    faq_a8: "No. Confess+ no reemplaza el asesoramiento profesional. Si enfrentas problemas graves de salud mental, por favor contacta a un especialista. Nuestra plataforma es para apoyo emocional y reflexión personal.",
    
    settings_title: "Configuración",
    settings_manage: "Gestiona tu cuenta y privacidad",
    settings_export_data: "Exportar Datos",
    settings_export_desc: "Descarga todos tus datos en formato JSON",
    settings_privacy_view: "Ver Política de Privacidad",
    settings_delete_warning: "Esta acción es permanente y no se puede deshacer",
    settings_data_exported: "Datos Exportados",
    settings_export_error: "No se pudieron exportar los datos",
    
    profile_verifying: "Verificando...",
    
    privacy_title: "Política de Privacidad",
    privacy_section_1: "1. Recopilación de Datos",
    privacy_section_1_text: "Confess.AI recopila solo los datos estrictamente necesarios para el funcionamiento de la plataforma:",
    privacy_section_1_list: "Dirección de correo electrónico (para autenticación) • Tus confesiones (almacenadas de forma anónima) • Estadísticas de uso (para mejorar el servicio)",
    privacy_section_2: "2. Anonimato",
    privacy_section_2_text: "Tus confesiones son completamente anónimas. Tu nombre nunca aparece públicamente y no puede ser asociado con tus confesiones por otros usuarios.",
    privacy_section_3: "3. Uso de IA",
    privacy_section_3_text: "Tus confesiones son procesadas por modelos de IA para generar respuestas empáticas. Estos datos no se usan para entrenar modelos y permanecen confidenciales.",
    privacy_section_4: "4. Seguridad de Datos",
    privacy_section_4_text: "Todos los datos están encriptados y almacenados de forma segura. Usamos las mejores prácticas de seguridad para proteger tu información.",
    privacy_section_5: "5. Tus Derechos",
    privacy_section_5_text: "Tienes derecho a:",
    privacy_section_5_list: "Acceder a tus datos personales • Eliminar tu cuenta y todos los datos asociados • Solicitar la exportación de tus datos • Retirar el consentimiento para el procesamiento de datos",
    privacy_section_6: "6. Cookies",
    privacy_section_6_text: "Solo usamos cookies esenciales para la funcionalidad de la plataforma (autenticación y preferencias). No usamos cookies de seguimiento o publicidad.",
    privacy_section_7: "7. Contacto",
    privacy_section_7_text: "Para cualquier pregunta sobre privacidad, puedes contactarnos en: privacy@confess.ai",
    privacy_last_updated: "Última actualización: Octubre 2025",
    
    terms_title: "Términos y Condiciones",
    terms_section_1: "1. Aceptación de Términos",
    terms_section_1_text: "Al usar Confess.AI, aceptas estos términos y condiciones. Si no estás de acuerdo, por favor no uses la plataforma.",
    terms_section_2: "2. Uso del Servicio",
    terms_section_2_text: "Confess.AI es una plataforma para compartir anónimamente pensamientos y recibir respuestas empáticas de IA. Te comprometes a:",
    terms_section_2_list: "Usar la plataforma de manera responsable • No publicar contenido ilegal, ofensivo o dañino • Respetar las reglas de la comunidad • No intentar identificar a otros usuarios",
    terms_section_3: "3. Contenido",
    terms_section_3_text: "Eres responsable del contenido que publicas. Nos reservamos el derecho de moderar y eliminar contenido que:",
    terms_section_3_list: "Viole las leyes aplicables • Sea amenazante o acosador • Contenga información falsa o engañosa • Viole los derechos de otros",
    terms_section_4: "4. VIP y Pagos",
    terms_section_4_text: "La suscripción VIP ofrece funciones adicionales. Los pagos se procesan de forma segura a través de Stripe. Puedes cancelar tu suscripción en cualquier momento desde la configuración de la cuenta.",
    terms_section_5: "5. Limitación de Responsabilidad",
    terms_section_5_text: "Confess.AI no ofrece servicios de asesoramiento profesional. Las respuestas de IA se generan automáticamente y no reemplazan la ayuda profesional. Para problemas graves de salud mental, por favor contacta a un especialista.",
    terms_section_6: "6. Cambios en los Términos",
    terms_section_6_text: "Nos reservamos el derecho de modificar estos términos. Los cambios se comunicarán a través de la plataforma y por correo electrónico.",
    terms_section_7: "7. Ley Aplicable",
    terms_section_7_text: "Estos términos se rigen por las leyes de Rumania. Cualquier disputa se resolverá en los tribunales competentes de Bucarest.",
    terms_section_8: "8. Contacto",
    terms_section_8_text: "Para preguntas sobre términos y condiciones: legal@confess.ai",
    terms_last_updated: "Última actualización: Octubre 2025",
    
    index_no_confessions_title: "Aún no hay confesiones",
    index_no_confessions_desc: "Sé el primero en compartir tus pensamientos. Recibirás instantáneamente una respuesta empática de IA.",
    
    notfound_404: "404",
    notfound_title: "¡Ups! Página no encontrada",
    notfound_return_home: "Volver al Inicio",
    
    bookmarks_empty_state: "Sin marcadores aún",
    bookmarks_empty_description: "Empieza a marcar confesiones para verlas aquí",
    profile_title: "Perfil",
    profile_nickname_change_restricted: "Cambio de Apodo Restringido",
    profile_nickname_cooldown_message: "Puedes cambiar tu apodo nuevamente en {days} día{plural}",
    profile_nickname_days_remaining_singular: "Podrás cambiar tu apodo de nuevo en {days} día",
    profile_nickname_days_remaining_plural: "Podrás cambiar tu apodo de nuevo en {days} días",
    profile_nickname_change_available: "Puedes cambiar tu apodo ahora",
    profile_nickname_updated: "Apodo Actualizado",
    profile_nickname_update_success: "Tu apodo ha sido actualizado exitosamente",
    profile_settings_updated: "Configuración Actualizada",
    profile_settings_update_success: "Tu configuración ha sido guardada exitosamente",
    profile_nickname_empty_error: "El apodo no puede estar vacío",
    profile_update_error: "Error al actualizar el perfil",
    profile_my_confessions: "Mis Confesiones",
    profile_statistics: "Estadísticas",
    profile_total_confessions: "Total de Confesiones",
    profile_total_likes: "Total de Me Gusta",
    profile_total_comments: "Total de Comentarios",
    profile_empty_state: "Sin confesiones aún",
    profile_empty_description: "Empieza a compartir tus pensamientos anónimamente",
    profile_email_label: "Dirección de Email",
    profile_change_password: "Cambiar Contraseña",
    profile_current_password: "Contraseña Actual",
    profile_new_password: "Nueva Contraseña",
    profile_confirm_password: "Confirmar Nueva Contraseña",
    profile_password_changed: "Contraseña cambiada exitosamente",
    profile_password_cooldown: "Solo puedes cambiar tu contraseña una vez cada 24 horas",
    profile_password_mismatch: "Las contraseñas no coinciden",
    profile_password_weak: "La contraseña debe tener al menos 6 caracteres",
    profile_password_same: "La nueva contraseña debe ser diferente de la actual",
    profile_hours_remaining: "horas restantes hasta que puedas cambiar tu contraseña",
    
    // System & Performance
    system_error_occurred: "Ocurrió un error. Por favor intenta de nuevo.",
    system_rate_limit_exceeded: "Demasiadas solicitudes. Espera {seconds} segundos antes de intentar nuevamente.",
    system_service_unavailable: "Servicio temporalmente no disponible. Estamos trabajando en ello.",
    system_network_error: "Error de red. Por favor verifica tu conexión.",
    system_timeout_error: "Tiempo de espera agotado. Por favor intenta de nuevo.",
    system_validation_error: "Error de validación",
    system_loading: "Cargando...",
    system_retrying: "Reintentando... (Intento {attempt})",
    system_cache_cleared: "Caché borrado exitosamente",
    
    // Validation errors
    validation_content_min: "El contenido debe tener al menos {min} caracteres",
    validation_content_max: "El contenido no debe exceder {max} caracteres",
    validation_email_invalid: "Dirección de correo electrónico inválida",
    validation_password_min: "La contraseña debe tener al menos {min} caracteres",
    validation_password_requirements: "La contraseña debe contener mayúsculas, minúsculas y un número",
    validation_nickname_min: "El apodo debe tener al menos {min} caracteres",
    validation_nickname_max: "El apodo no debe exceder {max} caracteres",
    validation_nickname_format: "El apodo solo puede contener letras, números, guiones y guiones bajos",
    validation_required_field: "Este campo es obligatorio",
    validation_invalid_url: "Formato de URL inválido",
    validation_max_length: "No debe exceder {max} caracteres",
    
    // Performance monitoring
    performance_cache_hit: "Cargado desde caché",
    performance_cache_miss: "Obteniendo datos frescos",
    performance_slow_query: "Respuesta lenta detectada",
    performance_optimizing: "Optimizando rendimiento...",
    
    achievement_new_badge: "🏆 ¡Has obtenido una nueva insignia!",
    
    daily_prompt_title: "Pregunta del Día",
    daily_prompt_share: "Comparte tus pensamientos",
    
    confession_anonymous: "Anónimo",
    time_now: "ahora",
    time_minutes: "m",
    time_hours: "h",
    time_days: "d",
    
    wordcloud_title: "Tus Palabras Frecuentes",
    wordcloud_used_times: "Usado {count} veces",
    wordcloud_based_on: "Basado en {count} palabras de tus confesiones",
    
    seo_default_title: "Confesiones Anónimas - Comparte Tus Pensamientos de Forma Segura",
    seo_default_description: "Plataforma segura y anónima para confesiones. Comparte tus pensamientos, recibe apoyo de IA y conéctate con otros en un espacio protegido.",
    seo_default_keywords: "confesiones anónimas, apoyo emocional, confesiones con IA, plataforma segura, compartir anónimamente",
    seo_app_name: "Confesiones Anónimas",
    
    search_placeholder: "Buscar confesiones...",
    search_button: "Buscar",
    search_clear_filters: "Limpiar filtros",
    search_category_label: "Categoría",
    search_sort_label: "Ordenar",
    search_period_label: "Período",
    search_all_categories: "Todas",
    search_anytime: "Cualquier momento",
    search_today: "Hoy",
    search_this_week: "Esta semana",
    search_this_month: "Este mes",
    search_most_recent: "Más recientes",
    search_most_popular: "Más populares",
    search_trending: "En tendencia",
    
    blocked_users_title: "Usuarios Bloqueados",
    blocked_user_unblocked: "Usuario desbloqueado",
    blocked_user_unblocked_desc: "Volverás a ver las confesiones de este usuario",
    blocked_users_error: "No se pudo desbloquear al usuario",
    blocked_users_none: "No has bloqueado a ningún usuario",
    blocked_users_anonymous: "Usuario anónimo",
    blocked_on: "Bloqueado el",
    
    follow_now_following: "Ahora siguiendo",
    follow_now_following_desc: "Verás las confesiones de este usuario en tu feed",
    follow_error: "Error",
    follow_error_desc: "No se pudo completar la acción",
    
    mood_how_feeling: "¿Cómo te sientes ahora?",
    mood_intensity: "Intensidad",
    mood_happy: "Feliz",
    mood_sad: "Triste",
    mood_anxious: "Ansioso",
    mood_angry: "Enojado",
    mood_neutral: "Neutral",
    mood_hopeful: "Esperanzado",
    
    badge_first_confession: "Primera Confesión",
    badge_first_confession_desc: "Publicaste tu primera confesión",
    badge_regular_confessor: "Confesor Regular",
    badge_regular_confessor_desc: "Publicaste 10 confesiones",
    badge_veteran: "Veterano",
    badge_veteran_desc: "Publicaste 100 confesiones",
    badge_popular: "Popular",
    badge_popular_desc: "Recibiste 100 reacciones",
    badge_influencer: "Influencer",
    badge_influencer_desc: "Recibiste 1000 reacciones",
    badge_fire_week: "Semana de Fuego",
    badge_fire_week_desc: "Publicaste 7 días consecutivos",
    badge_perfect_month: "Mes Perfecto",
    badge_perfect_month_desc: "Publicaste 30 días consecutivos",
    badge_anniversary: "Aniversario",
    badge_anniversary_desc: "Un año en la plataforma",
    badge_active_commenter: "Comentarista Activo",
    badge_active_commenter_desc: "Publicó 50 comentarios",
    badge_sharer: "Compartidor",
    badge_sharer_desc: "Compartió 25 confesiones",
    badge_avid_reader: "Lector Ávido",
    badge_avid_reader_desc: "Vio 200 confesiones",
    badge_collector: "Coleccionista",
    badge_collector_desc: "Guardó 30 marcadores",
    badge_night_owl: "Noctámbulo",
    badge_night_owl_desc: "Publicó 20 confesiones entre las 22:00-6:00",
    badge_social_butterfly: "Mariposa Social",
    badge_social_butterfly_desc: "Tiene 20 seguidores",
    badge_viral_confession: "Confesión Viral",
    badge_viral_confession_desc: "Tiene una confesión con más de 100 likes",
    
    report_title: "Reportar confesión",
    report_description: "Ayúdanos a mantener la comunidad segura. Tu reporte es anónimo.",
    report_reason_label: "Motivo del reporte",
    report_reason_spam: "Spam o publicidad",
    report_reason_harassment: "Acoso o intimidación",
    report_reason_hate_speech: "Discurso de odio",
    report_reason_violence: "Violencia o amenazas",
    report_reason_adult_content: "Contenido adulto",
    report_reason_misinformation: "Desinformación",
    report_reason_personal_info: "Información personal",
    report_reason_other: "Otro",
    report_details_label: "Detalles adicionales (opcional)",
    report_details_placeholder: "Proporciona más detalles sobre el problema...",
    report_select_reason_error: "Por favor selecciona un motivo",
    report_already_reported_title: "Ya reportado",
    report_already_reported_desc: "Ya has reportado esta confesión",
    report_submit_success_desc: "Gracias por tu reporte. Nuestro equipo investigará.",
    report_submit_error_desc: "No se pudo enviar el reporte",
    report_submitting: "Enviando...",
    report_submit_button: "Enviar Reporte",
    
    comments_reply_placeholder: "Escribe una respuesta...",
    comments_reply_button: "Responder",
    comments_send_button: "Enviar",
    comments_reply_added_desc: "Respuesta añadida",
    comments_too_long_error: "Comentario demasiado largo (máx. 500 caracteres)",
    
    follow_cannot_self_desc: "No puedes seguirte a ti mismo",
    follow_unfollowed_title: "Dejaste de seguir",
    follow_unfollowed_desc: "Dejaste de seguir a este usuario",
    
    help_user_guide_title: "Guía de usuario",
    help_user_guide_desc: "Aprende a usar la plataforma",
    help_view_guide: "Ver guía",
    help_faq_title: "Preguntas frecuentes",
    help_faq_desc: "Respuestas a preguntas frecuentes",
    help_view_faq: "Ver FAQ",
    help_contact_title: "Contáctanos",
    help_contact_desc: "Envíanos un correo para soporte",
    help_send_email: "Enviar correo",
    help_dialog_title: "¿Cómo podemos ayudarte?",
    help_dialog_desc: "Elige una de las opciones a continuación para obtener ayuda",
    help_response_time: "Normalmente respondemos en 24 horas",
    
    streak_reminder_text: "¡Tienes una racha de {count} días! Publica una confesión hoy para mantenerla.",
    streak_post_now: "Publicar ahora",
    streak_keep_your_streak: "¡Mantén tu racha! 🔥",
    
    moderation_reject_title: "Rechazar confesión",
    moderation_reject_description: "Proporciona una razón para rechazar esta confesión",
    moderation_reason_placeholder: "Motivo (opcional)...",
    
    analytics_confessions: "confesiones",
    analytics_average_per: "Promedio por confesión",
    
    coins_per_confession: "monedas por cada confesión",
    
    confession_deleted: "La confesión fue eliminada",
    confession_your_confession: "Tu confesión:",
    confession_reported_success: "La confesión fue reportada",
    confession_report_error: "No se pudo reportar la confesión",
    
    draft_delete_error: "No se pudo eliminar el borrador",
    
    export_error: "No se pudieron exportar los datos",
    export_my_confessions: "Mis Confesiones",
    
    following_load_error: "No se pudieron cargar las confesiones",
    following_start_following: "Comienza a seguir usuarios para ver sus confesiones aquí",
    following_count_confessions: "confesiones",
    
    image_added: "La imagen fue añadida a la confesión",
    image_upload_error: "No se pudo cargar la imagen",
    
    leaderboard_confessions: "confesiones",
    leaderboard_reactions: "reacciones",
    
    moderation_approved: "aprobada",
    moderation_rejected: "rechazada",
    moderation_marked: "marcada",
    moderation_action_error: "No se pudo realizar la acción",
    moderation_no_pending: "No hay confesiones pendientes",
    moderation_no_reported: "No hay confesiones reportadas",
    
    reaction_update_error: "No se pudo actualizar la reacción",
    
    streak_last_confession: "Última confesión:",
    
    subscription_payment_error: "No se pudo iniciar el proceso de pago",
    subscription_portal_error: "No se pudo abrir el portal de suscripción",
    
    preferences_save_error: "No se pudieron guardar las preferencias",
    
    comment_reply_error: "No se pudo enviar la respuesta",
    
    draft_deleted: "Borrador eliminado",
    draft_deleted_desc: "El borrador fue eliminado exitosamente",
    draft_delete_error_desc: "No se pudo eliminar el borrador",
    drafts_saved: "Borradores Guardados",
    
    export_title: "Exportar Tus Datos",
    export_description: "Descarga una copia de tus datos en formato JSON o CSV",
    export_format: "Formato",
    export_what: "¿Qué quieres exportar?",
    export_my_comments: "Mis Comentarios",
    export_my_likes: "Mis Me Gusta",
    export_my_bookmarks: "Mis Marcadores",
    export_download: "Descargar Datos",
    export_downloading: "Exportando...",
    export_success: "Exportación Exitosa",
    export_success_desc: "Tus datos han sido exportados exitosamente",
    
    coins_title: "Monedas",
    coins_current_balance: "Saldo Actual",
    coins_total_earned: "Total Ganado",
    coins_history: "Ver Historial",
    coins_how_to_earn: "Cómo ganar monedas:",
    coins_per_confession_detail: "📝 +2 monedas por confesión",
    coins_per_confession_new: "+2 monedas por confesión",
    coins_no_transactions: "Aún no hay transacciones",
    coins_all_transactions: "Todas tus transacciones de monedas",
    coins_confession_created: "Nueva confesión",
    coins_how_to_spend: "💎 Cómo Gastar Monedas",
    coins_polish_detail: "✨ Mejorar Confesión (10 monedas) - IA mejora tu texto",
    coins_boost_detail: "🚀 Impulsar Confesión (15 monedas) - Destacar por 1 hora",
    coins_flairs_detail: "🎨 Insignias de Perfil (30 monedas) - Activas por 5 días",
    badge_expires_in: "Expira en",
    badge_expired: "Expirado",
    badge_active_for: "Activo por 5 días",
    buy_again: "Comprar de nuevo",
    days: "días",
    hours: "horas",
    referral_reward_referrer: "+20 monedas cuando el referido publica su primera confesión",
    referral_reward_referred: "+10 para usuario referido después de primera confesión",
    first_confession_bonus: "Bono de primera confesión",
    
    boost_confession: "Impulsar Confesión",
    boost_success_title: "¡Confesión Impulsada!",
    boost_success_description: "Tu confesión será destacada durante 1 hora",
    boost_error: "Error al impulsar confesión",
    boost_confirmation_description: "Impulsa esta confesión para hacerla más visible durante 1 hora.",
    boost_cost: "Costo: 15 monedas",
    boost_now: "Impulsar Ahora",
    
    customize_profile: "Personalizar Perfil",
    themes: "Temas",
    badges: "Insignias",
    theme_default: "Predeterminado",
    theme_ocean: "Océano",
    theme_sunset: "Atardecer",
    theme_forest: "Bosque",
    theme_galaxy: "Galaxia",
    theme_royal: "Real",
    badge_star: "Estrella",
    badge_fire: "Fuego",
    badge_heart: "Corazón",
    badge_rocket: "Cohete",
    badge_gem: "Gema",
    badge_crown: "Corona",
    owned: "Propiedad",
    purchase_for: "Comprar por",
    purchase_theme_success: "¡Tema comprado exitosamente!",
    purchase_badge_success: "¡Insignia comprada exitosamente!",
    equip_theme_success: "¡Tema equipado!",
    equip_badge_success: "¡Insignia equipada!",
    customization_error: "Error al aplicar personalización",
    insufficient_coins: "Monedas insuficientes",
    
    highlight_comment: "Destacar Comentario",
    highlight_comment_description: "Haz que tu comentario se destaque con un resaltado dorado durante 24 horas.",
    highlight_comment_success_title: "¡Comentario Destacado!",
    highlight_comment_success_description: "Tu comentario será destacado durante 24 horas",
    highlight_comment_error: "Error al destacar comentario",
    highlight_comment_features: "Características de Destacado:",
    highlight_comment_feature_1: "Borde y fondo dorado",
    highlight_comment_feature_2: "Se mantiene en la parte superior de comentarios",
    highlight_comment_feature_3: "Activo durante 24 horas",
    highlight_comment_cost: "Costo: {cost} monedas",
    highlight_now: "Destacar Ahora",
    ai_makeover: "Transformación IA",
    ai_makeover_description: "Deja que la IA mejore tu confesión con mejor redacción, claridad e impacto emocional.",
    ai_makeover_features: "Características de Transformación IA:",
    ai_makeover_feature_1: "Mejora la calidad de escritura y gramática",
    ai_makeover_feature_2: "Aumenta el impacto emocional",
    ai_makeover_feature_3: "Mantiene tu mensaje original",
    ai_makeover_feature_4: "Puedes editar antes de aplicar",
    ai_makeover_cost: "Costo: {cost} monedas",
    ai_makeover_error: "Error al generar transformación",
    ai_makeover_applied_title: "¡Transformación Aplicada!",
    ai_makeover_applied_description: "Tu confesión ha sido actualizada",
    original_content: "Contenido Original",
    improved_content: "Contenido Mejorado",
    edit_improved_content: "Edita el contenido mejorado antes de aplicar...",
    generate_makeover: "Generar Transformación",
    apply_changes: "Aplicar Cambios",
    applying: "Aplicando...",
    custom_background: "Fondo Personalizado",
    custom_background_description: "Elige un hermoso fondo degradado para tu confesión.",
    background_applied_title: "¡Fondo Aplicado!",
    background_applied_description: "Tu confesión ahora tiene un fondo personalizado",
    background_error: "Error al aplicar fondo",
    your_balance: "Tu Saldo",
    coins: "monedas",
    free: "Gratis",
    current: "Actual",
    already_applied: "Ya Aplicado",
    cost: "Costo",
    apply_background: "Aplicar Fondo",
    
    polish_confession: "Mejorar Confesión",
    polishing: "Mejorando...",
    polish_success_title: "¡Confesión Mejorada!",
    polish_success_description: "Tu confesión ha sido mejorada por IA",
    polish_error: "Error al mejorar confesión",
    polish_empty_error: "Por favor escribe tu confesión primero",
    
    flairs_shop: "Tienda de Insignias",
    flair_shop_description: "Personaliza tu perfil con insignias y emblemas únicos",
    flair_purchased_title: "¡Insignia Comprada!",
    flair_purchased_description: "Tu nueva insignia está ahora equipada",
    flair_purchase_error: "Error al comprar insignia",
    flair_equipped: "Insignia equipada exitosamente",
    equipped: "Equipada",
    equip: "Equipar",
    shop_free_tier: "Insignias Gratis",
    shop_vip_tier: "Insignias VIP",
    shop_empty: "No hay insignias disponibles para tu plan",
    shop_buy: "Comprar",
    shop_open: "Abrir Tienda de Insignias",
    rarity_common: "Común",
    rarity_uncommon: "Poco Común",
    rarity_rare: "Rara",
    rarity_epic: "Épica",
    rarity_legendary: "Legendaria",
    
    flair_star: "Estrella",
    flair_fire: "Fuego",
    flair_heart: "Corazón",
    flair_crown: "Corona",
    flair_sparkles: "Destellos",
    flair_diamond: "Diamante",
    flair_trophy: "Trofeo",
    flair_rocket: "Cohete",
    flair_rainbow: "Arcoíris",
    flair_unicorn: "Unicornio",
    flair_moon: "Luna",
    
    loading: "Cargando...",
    success: "Éxito",
    cancel: "Cancelar",
    processing: "Procesando...",
    
    nickname_label: "Apodo",
    nickname_placeholder: "Ingresa tu apodo",
    nickname_update: "Actualizar Apodo",
    nickname_updated: "Apodo actualizado exitosamente",
    nickname_error: "Error al actualizar apodo",
    nickname_taken: "Este apodo ya está en uso",
    nickname_invalid: "El apodo debe tener 3-24 caracteres (letras, números, _)",
    nickname_cooldown: "Solo puedes cambiar tu apodo una vez cada 21 días",
    
    common_anonymous: "Anónimo",
    
    validation_nickname_too_short: "El apodo debe tener al menos 3 caracteres",
    validation_nickname_too_long: "El apodo no puede exceder 24 caracteres",
    validation_nickname_invalid_chars: "El apodo solo puede contener letras, números y guiones bajos",
    validation_nickname_invalid_underscores: "El apodo no puede comenzar o terminar con un guion bajo",
    validation_nickname_double_underscores: "El apodo no puede contener guiones bajos dobles",
    validation_nickname_reserved: "Este apodo está reservado y no se puede usar",
    validation_nickname_not_available: "Este apodo no está disponible",
    
    nickname_days_remaining: "días restantes hasta que puedas cambiar tu apodo",
    nickname_current: "Apodo actual",
    nickname_visibility: "Visibilidad del apodo",
    nickname_public_desc: "Otros pueden ver tu apodo",
    nickname_private_desc: "Solo tú puedes ver tu apodo",
    settings_updated: "Configuración actualizada con éxito",
    search_users: "Buscar Usuarios",
    search_users_placeholder: "Buscar por apodo...",
    no_users_found: "No se encontraron usuarios",
    
    messages_title: "Mensajes",
    messages_new: "Nuevo Mensaje",
    messages_send: "Enviar",
    messages_type_message: "Escribe un mensaje...",
    messages_no_conversations: "Aún no hay conversaciones",
    messages_start_conversation: "Iniciar una conversación",
    messages_conversation_with: "Conversación con",
    messages_delete_confirm: "¿Eliminar este mensaje?",
    messages_deleted: "Mensaje eliminado",
    messages_delete_conversation: "Eliminar conversación",
    messages_delete_conversation_confirm: "¿Estás seguro de que quieres eliminar esta conversación? Esta acción no se puede deshacer.",
    messages_delete_conversation_title: "Eliminar Conversación",
    messages_retry: "Reintentar",
    messages_input_placeholder: "Escribe un mensaje...",
    messages_empty: "No hay mensajes aún",
    messages_seen: "Visto",
    messages_delivered: "Entregado",
    messages_sent: "Enviado",
    messages_typing: "está escribiendo...",
    messages_reaction_add: "Añadir reacción",
    messages_reaction_remove: "Quitar reacción",
    
    // Bottom Navigation
    nav_home: "Inicio",
    nav_explore: "Explorar",
    nav_messages: "Mensajes",
    nav_profile: "Perfil",
    
    profile_posts: "Publicaciones",
    profile_followers: "Seguidores",
    profile_following: "Siguiendo",
    profile_follows_you: "Te sigue",
    profile_follow: "Seguir",
    profile_unfollow: "Dejar de seguir",
    
    // Explore - Search Users
    explore_search_card_title: "Buscar Usuarios",
    explore_search_card_placeholder: "Buscar por apodo...",
    explore_search_card_follow: "Seguir",
    explore_search_card_unfollow: "Dejar de seguir",
    explore_search_card_message: "Mensaje",
    explore_search_card_no_results: "No se encontraron usuarios",
    
    // Home - Communities
    home_communities_title: "Comunidades",
    home_communities_join: "Unirse",
    home_communities_leave: "Salir",
    
    following_feed_loading: "Cargando feed...",
    following_feed_start: "Comienza a seguir usuarios para ver sus confesiones aquí",
    
    image_invalid_file: "Archivo Inválido",
    image_invalid_file_desc: "Por favor selecciona una imagen (JPEG, PNG, GIF o WebP)",
    image_too_large: "Archivo Demasiado Grande",
    image_uploading: "Subiendo...",
    image_add_optional: "Agregar imagen (opcional)",
    
    moderation_no_permissions: "No tienes permisos de moderación",
    moderation_loading: "Cargando...",
    moderation_keep: "Mantener",
    moderation_delete: "Eliminar",
    moderation_cancel: "Cancelar",
    
    preferences_saving: "Guardando...",
    preferences_save: "Guardar Preferencias",
    
    subscription_active_plan: "Plan Activo",
    subscription_choose: "Elegir",
    subscription_title: "Tu suscripción",
    subscription_description: "Desbloquea todas las funciones y obtén una experiencia superior",
    subscription_plan_free: "Gratis",
    subscription_plan_vip: "VIP",
    subscription_manage: "Gestionar suscripción",
    subscription_feature_unlimited_ai: "Respuestas AI ilimitadas",
    subscription_feature_advanced_analytics: "Análisis avanzados",
    subscription_feature_exclusive_badges: "Insignias exclusivas",
    subscription_feature_no_ads: "Sin anuncios",
    subscription_feature_priority_moderation: "Prioridad en moderación",
    subscription_feature_image_confessions: "Confesiones con imágenes",
    subscription_feature_detailed_stats: "Estadísticas detalladas",
    subscription_feature_priority_support: "Soporte prioritario",
  subscription_feature_vip_badge: "Insignia VIP especial",
  
  // Trial & Subscription Management
  trial_cta_title: "¡Prueba VIP gratis!",
  trial_cta_desc: "Disfruta de VIP completo durante 3 días.",
  trial_cta_button: "Prueba 3 días gratis",
  trial_cta_disclaimer: "Después de 3 días, se te cobrará el precio de VIP a menos que canceles.",
  trial_active: "Tu prueba VIP está activa hasta {date}",
  subs_manage: "Gestionar suscripción",
  subs_cancel: "Cancelar suscripción",
  subs_upgrade: "Mejorar plan",
  subs_downgrade: "Reducir plan",
  coins_bonus_vip: "Has recibido +250 monedas por activar VIP.",
  shop_badge_price_free: "Las insignias cuestan 25 monedas (Free)",
  shop_badge_price_vip: "Las insignias cuestan 100 monedas (VIP)",
  
  // Manage Subscription Dialog
  subs_manage_title: "Gestionar suscripción",
  subs_manage_currentPlan: "Plan actual",
  subs_manage_renews: "Se renueva el {date}",
  subs_manage_trialEnds: "La prueba termina el {date}",
  subs_action_upgrade: "Mejorar plan",
  subs_action_downgrade: "Reducir plan",
  subs_action_cancel: "Cancelar suscripción",
  subs_action_cancelNow: "Cancelar ahora",
  subs_action_cancelAtPeriodEnd: "Cancelar al final del período",
  subs_action_cancelTrial: "Cancelar prueba",
  subs_action_reactivate: "Reactivar",
  subs_confirm_title: "Confirmar acción",
  subs_confirm_upgrade: "¿Mejorar a {tier} ahora?",
  subs_confirm_downgrade: "¿Reducir a {tier} ahora?",
  subs_confirm_cancel_periodEnd: "Mantener beneficios hasta {date}, luego cancelar. ¿Continuar?",
  subs_confirm_cancel_now: "Cancelar de inmediato y perder beneficios ahora. ¿Continuar?",
  subs_confirm_reactivate: "¿Reactivar tu suscripción y seguir disfrutando de los beneficios VIP?",
  subs_confirm_cancel: "¿Está seguro de que desea cancelar su suscripción?",
  subs_confirm_change_to_vip: "¡Actualiza a VIP para confesiones ilimitadas y funciones exclusivas!",
  subs_cancel_immediate: "Cancelar ahora",
  subs_cancel_at_period_end: "Cancelar al final del período",
  subs_toast_success: "¡Hecho!",
  subs_toast_change_success: "¡Plan cambiado exitosamente!",
  subs_toast_cancel_success: "La suscripción se cancelará al final del período",
  subs_toast_cancel_now_success: "Suscripción cancelada inmediatamente",
  subs_toast_reactivate_success: "¡Suscripción reactivada exitosamente!",
  subs_note_inline: "Puedes cambiar, cancelar o reactivar tu plan aquí en cualquier momento.",
  common_cancel: "Cancelar",
  subs_status_cancels: "Se cancela el",
  subs_full_management: "Gestión Completa de Suscripción",
  subs_portal_description: "Accede al portal de Stripe para cambiar planes, actualizar método de pago, ver facturas o cancelar suscripción.",
  subs_open_portal: "Abrir Portal de Stripe",
  subs_quick_actions: "Acciones Rápidas",
  subs_portal_opening: "Abriendo portal de Stripe donde puedes gestionar tu suscripción...",
  subs_portal_failed: "Error al abrir el portal de cliente",
  subs_action_buy: "Comprar Suscripción",
  subs_action_change: "Cambiar Plan",
  subs_confirm_buy: "¿Iniciar una nueva suscripción {tier}?",
  subs_toast_buy_success: "Compra de suscripción iniciada",
  subs_buy_select_plan: "Seleccionar un Plan",
  subs_buy_trial_available: "Prueba Gratis de 3 Días Disponible",
  subs_error_already_subscribed: "Ya tienes una suscripción activa",
  subs_error_no_trial: "Prueba ya usada o suscripción activa",
  
  payment_view_profile: "Ver Tu Perfil VIP",
    payment_redirecting: "Serás redirigido automáticamente en unos segundos...",
    
    profile_portal_error: "Error",
    profile_portal_error_desc: "No se pudo abrir el portal de suscripción",
    
    reaction_heart: "Corazón",
    reaction_sad: "Triste",
    reaction_strong: "Fuerte",
    reaction_thinking: "Interesante",
    reaction_auth_required: "Autenticación requerida",
    reaction_auth_required_desc: "Debes estar autenticado para reaccionar",
    
    analytics_activity_7days: "Actividad últimos 7 días",
    subscription_billed_yearly: "Facturado anualmente",
    subscription_plan_unavailable: "Plan de suscripción no disponible",
    subscription_yearly_discount: "-33%",
    
    profile_achievements: "Logros",
    profile_moods: "Estados",
    profile_settings: "Configuración",
    profile_moderation: "Moderación",
    profile_plan_free: "Gratis",
    profile_plan_vip: "VIP",
    
    referral_benefits: "Beneficios:",
    referral_benefit_coins: "• 100 monedas por cada referido completado",
    referral_benefit_friend: "• Tu amigo recibe 50 monedas de bonificación",
    referral_benefit_badge: "• Insignia especial después de 10 referidos",
    
    preferences_customization: "Personalización",
    preferences_accent_color: "Color de acento",
    preferences_text_size: "Tamaño del texto",
    preferences_size_small: "Pequeño",
    preferences_size_medium: "Mediano",
    preferences_size_large: "Grande",
    
    subscription_thanks: "¡Gracias por tu apoyo!",
    subscription_upgrade_more: "Mejora para más funciones",
    subscription_upgrade_vip: "Mejorar a VIP",
    subscription_current_plan: "Plan Actual",
    subscription_your_plan: "Tu Plan",
    subscription_downgrade_to_free: "Cambiar a Gratis",
    subscription_change_to_plan: "Cambiar a {plan}",
    subscription_free: "Gratis",
    subscription_trial_available: "Prueba Gratis de 3 Días Disponible",
    
    // Subscription Benefits - Free
    subscription_benefits_free_confessions: "Confesiones limitadas por día",
    subscription_benefits_free_basic_features: "Funciones básicas",
    subscription_benefits_free_community_access: "Acceso a comunidad",
    subscription_limitations_free_ads: "Con anuncios",
    subscription_limitations_free_limited_ai: "Respuestas IA limitadas",
    subscription_limitations_free_basic_analytics: "Solo análisis básicos",
    
    subscription_benefits_vip_unlimited_confessions: "Confesiones ilimitadas",
    subscription_benefits_vip_unlimited_ai: "Respuestas IA ilimitadas",
    subscription_benefits_vip_detailed_statistics: "Estadísticas detalladas",
    subscription_benefits_vip_priority_support: "Soporte prioritario",
    subscription_benefits_vip_special_badge: "Insignia VIP especial",
    subscription_benefits_vip_early_access: "Acceso anticipado a funciones",
    subscription_benefits_vip_custom_themes: "Temas personalizados",
    subscription_benefits_vip_no_ads: "Sin anuncios",
    subscription_benefits_vip_private_confessions: "Confesiones privadas",
    subscription_benefits_vip_advanced_stats: "Estadísticas avanzadas",
    subscription_benefits_vip_priority_ai: "IA prioritaria",
    subscription_benefits_vip_coins_bonus: "Bonificación de monedas",
    subscription_benefits_vip_login_rewards: "Recompensas de inicio de sesión",
    
    // Subscription Management
    subscription_current_status: "Estado Actual",
    subscription_interval_monthly: "Mensual",
    subscription_interval_yearly: "Anual",
    subscription_per_month_short: "/mes",
    subscription_per_year_short: "/año",
    subscription_savings_badge: "Ahorra {percent}%",
    subscription_compare_plans: "Comparar Planes",
    subscription_benefits_title: "Beneficios",
    subscription_actions_change: "Cambiar Plan",
    subscription_actions_cancel: "Cancelar Suscripción",
    subscription_actions_reactivate: "Reactivar Suscripción",
    subscription_confirm_change_title: "Cambiar Tu Plan",
    subscription_confirm_change_body: "Cambiarás a {plan} {interval}. Tu nueva tarifa será ${price}{suffix}. {prorationNote}",
    subscription_confirm_cancel_title: "Cancelar Suscripción",
    subscription_confirm_cancel_body_now: "Tu suscripción finalizará inmediatamente.",
    subscription_confirm_cancel_body_period_end: "Tu suscripción permanecerá activa hasta {date}.",
    subscription_confirm_reactivate_title: "Reactivar Suscripción",
    subscription_status_active: "Activo",
    subscription_status_canceled: "Cancelado",
    subscription_status_trialing: "Prueba",
    subscription_status_past_due: "Vencido",
    subscription_errors_generic: "Ocurrió un error. Inténtalo de nuevo.",
    subscription_errors_not_eligible: "No eres elegible para esta acción.",
    subscription_errors_requires_action: "Se requiere acción adicional.",
    subscription_trial_countdown: "{days} días restantes en la prueba",
    subscription_trial_used: "Prueba ya utilizada",
    subscription_next_billing_date: "Próxima facturación: {date}",
    subscription_cancel_ends_at: "Finaliza: {date}",
    subscription_change_interval: "Cambiar Facturación",
    subscription_change_success: "¡Plan cambiado exitosamente!",
    subscription_cancel_success: "Suscripción cancelada exitosamente",
    subscription_reactivate_success: "¡Suscripción reactivada!",
    subscription_not_available: "No disponible",
    subscription_proration_info: "Se te cobrará un monto prorrateado hoy.",
    subscription_downgrade_period_end: "Tu plan cambiará al final del período actual.",
    
    badges_your_badges: "Tus Insignias",
    
    export_my_data: "Exportar mis datos",
    
    moderation_reject_desc: "Proporciona una razón para rechazar esta confesión",
    notification_followed: "empezó a seguirte",
    notification_badge_earned: "¡has ganado una nueva insignia!",
    notification_streak_milestone: "¡has alcanzado un nuevo hito!",
    recommended_read: "Leer",
    referral_coins_earned: "Monedas Ganadas",
    referral_your_code: "Tu Código de Referido",
    anonymous_user: "Usuario",
    leaderboard_top_this_week: "Top Esta Semana",
    recommended_for_you: "Recomendado para Ti",
    badges_earned_on: "Obtenido el",
    
    analytics_category_distribution: "Distribución de Categorías",
    error_something_wrong: "¡Ups! Algo salió mal",
    error_unexpected: "Ocurrió un error inesperado. Por favor intenta nuevamente.",
    error_try_again_desc: "Intentar nuevamente",
    error_reload_page: "Recargar Página",
    error_retry: "Intentar Nuevamente",
    ui_previous: "Anterior",
    ui_next: "Siguiente",
    ui_toggle_sidebar: "Alternar barra lateral",
    ui_image_preview: "Vista previa de imagen",
    ui_confession_image: "Imagen de confesión",
    ui_following_feed: "Feed de seguidos",
    ui_close: "Cerrar",
    ui_previous_slide: "Diapositiva anterior",
    ui_next_slide: "Siguiente diapositiva",
    follow_connections: "Conexiones",
    follow_following: "Siguiendo",
    follow_followers: "Seguidores",
    mood_distribution: "Tu Distribución de Estados",
    mood_intensity_evolution: "Evolución de Intensidad",
    rate_limit_title: "Demasiadas Solicitudes",
    rate_limit_desc: "Has alcanzado el límite de solicitudes de IA. Por favor espera unos momentos antes de intentar nuevamente.",
    rate_limit_remaining: "Solicitudes Restantes",
    rate_limit_reset_in: "Se reinicia en {time}",
    rate_limit_wait_message: "Has alcanzado el límite. Por favor, intenta de nuevo más tarde.",
    moderation_action_done: "Acción Completada",
    moderation_action_approved: "aprobada",
    moderation_action_rejected: "rechazada",
    moderation_action_marked: "marcada",
    moderation_error_action: "No se pudo realizar la acción",
    moderation_panel_title: "Panel de Moderación",
    moderation_role_admin: "Administrador",
    moderation_role_moderator: "Moderador",
    moderation_reports_title: "Razones:",
    referral_program_title: "Programa de Referidos",
    referral_completed: "Completados",
    deep_insight_your_confession: "Tu confesión:",
    moderation_pending_count: "Pendiente",
    moderation_approve: "Aprobar",
    moderation_reported_count: "Reportada",
    moderation_reason_optional: "Razón (opcional)...",
    referral_link_copied_toast: "¡Enlace copiado!",
    referral_link_copied_desc: "El enlace de referido ha sido copiado al portapapeles",
    referral_pending: "Pendiente",
    streak_your: "Tu Racha",
    streak_consecutive_days: "Días Consecutivos",
    streak_personal_best: "Récord Personal",
    subscription_payment_error_desc: "No se pudo iniciar el proceso de pago",
    preferences_color_green: "Verde",
    preferences_color_red: "Rojo",
    preferences_color_orange: "Naranja",
    preferences_color_violet: "Violeta",
    preferences_color_blue: "Azul",
    preferences_color_pink: "Rosa",
    following_your_feed: "Tu Feed",
    index_back_to_feed: "Volver al Feed",
    moderation_category_label: "Categoría",
    
    // Instagram-style Social
    explore: "Explorar",
    compose: "Componer",
    type_message_placeholder: "Escribe un mensaje...",
    send_message_button: "Enviar",
    message_sent_toast: "Mensaje enviado",
    message_failed_toast: "No se pudo enviar el mensaje",
    retry_send: "Reintentar",
    delete_message_action: "Eliminar mensaje",
    delete_message_confirm_text: "¿Estás seguro de que quieres eliminar este mensaje?",
    read_receipt_status: "Leído",
    unread_count_badge: "nuevo",
    message_thread_title: "Mensajes",
    
    // Profile Header
    posts_count: "Publicaciones",
    followers_count: "Seguidores",
    following_count: "Siguiendo",
    message_user_button: "Mensaje",
    edit_profile: "Editar Perfil",
    profile_bio: "Biografía",
    profile_bio_placeholder: "Cuéntanos sobre ti...",
    profile_handle: "Usuario",
    profile_avatar: "Avatar",
    profile_privacy_public: "Público",
    profile_privacy_limited: "Limitado",
    profile_privacy_private: "Privado",
    profile_privacy_mode: "Modo de Privacidad",
    user_is_typing: "{user} está escribiendo...",
    users_are_typing: "{users} están escribiendo...",
    
    // Quote of the Day
    qotd_title: "Cita del Día",
    qotd_loading: "Cargando cita...",
    
    // Admin Panel
    admin_title: "Panel de Administración",
    admin_moderation_queue: "Cola de Moderación",
    admin_reports: "Reportes",
    admin_no_items: "No hay elementos para revisar",
    admin_approve: "Aprobar",
    admin_reject: "Rechazar",
    admin_view_confession: "Ver Confesión",
    
    // GDPR & Privacy
    export_data_description_text: "Descarga una copia de todos tus datos",
    export_data_success_toast: "Datos exportados correctamente",
    export_data_failed_toast: "Error al exportar datos",
    delete_my_account_button: "Eliminar Mi Cuenta",
    delete_account_warning_full: "Esta acción no se puede deshacer. Todos tus datos serán eliminados permanentemente.",
    delete_account_confirm_dialog: "¿Estás seguro de que quieres eliminar tu cuenta?",
    account_deleted_toast: "Cuenta eliminada correctamente",
    consent_management_title: "Gestión de Consentimiento",
    view_consents_button: "Ver Mis Consentimientos",
    
    // Crisis Support
    crisis_support_title: "Apoyo en Crisis",
    crisis_message_text: "Si estás experimentando pensamientos de autolesión o suicidio, por favor busca ayuda inmediatamente:",
    crisis_hotline_label: "Línea de Crisis",
    crisis_chat_label: "Chat de Crisis en Línea",
    emergency_services_label: "Servicios de Emergencia",
    you_are_not_alone_message: "No estás solo. Hay ayuda disponible.",
    
    // Safety & Moderation
    content_review_notice_title: "Aviso de Revisión de Contenido",
    content_blocked_title: "Contenido Bloqueado",
    moderation_reason_label: "Razón:",
    
    // Communities
    communities_title: "Comunidades",
    communities_discover: "Descubre comunidades que comparten tus intereses",
    communities_create: "Crear Comunidad",
    communities_category: "Categoría",
    communities_name: "Nombre de la Comunidad",
    communities_description: "Descripción",
    communities_slug_label: "Identificador (URL)",
    communities_slug_placeholder: "identificador-comunidad",
    communities_icon: "Ícono (emoji)",
    communities_private: "Comunidad Privada",
    communities_creating: "Creando...",
    communities_create_success: "Comunidad creada exitosamente",
    communities_create_error: "Error al crear la comunidad",
    communities_join: "Unirse",
    communities_leave: "Salir",
    communities_members: "miembros",
    communities_posts: "publicaciones",
    communities_not_found: "Comunidad no encontrada",
    communities_back: "Volver a Comunidades",
    communities_no_posts: "Aún no hay confesiones. ¡Sé el primero en compartir!",
    communities_first_post: "¡Sé el primero en compartir!",
    communities_recent: "Confesiones Recientes",
    communities_create_confession: "Crear Confesión",
    communities_filter_all: "Todas",
    communities_filter_mental_health: "Salud Mental",
    communities_filter_relationships: "Relaciones",
    communities_filter_work: "Trabajo y Carrera",
    communities_filter_general: "General",
    
    // Location
    location_add: "Agregar ubicación (opcional)",
    location_detecting: "Detectando ubicación...",
    location_detected: "Ubicación detectada",
    location_error: "Error de ubicación",
    location_error_permission: "No se pudo obtener tu ubicación. Por favor, habilita los permisos de ubicación.",
    location_city: "Ubicación",
    location_optional: "Ubicación (opcional)",
    location_community_optional: "Comunidad (opcional)",
    location_select_community: "Selecciona una comunidad",
    location_no_community: "Sin comunidad",
    
    // Nearby Confessions
    nearby_title: "Confesiones Cercanas",
    nearby_discover: "Descubre confesiones de personas cerca de ti",
    nearby_radius: "Radio",
    nearby_within_km: "Dentro de {km} km",
    nearby_list_view: "Lista",
    nearby_map_view: "Mapa",
    nearby_map_coming_soon: "Vista de mapa próximamente",
    nearby_no_location: "No se pudo obtener tu ubicación",
    nearby_enable_location: "Por favor, habilita los permisos de ubicación para ver confesiones cercanas",
    nearby_none_found: "No se encontraron confesiones cercanas",
    nearby_increase_radius: "Intenta aumentar el radio de búsqueda o vuelve más tarde",
    nearby_distance_km: "{distance} km",
    
    // Quick Actions
    quick_action_new: "Nuevo",
    quick_action_explore: "Explorar",
    quick_action_messages: "Mensajes",
    quick_action_search: "Buscar",
    quick_action_communities: "Comunidades",
    quick_action_nearby: "Cercanas",
    
    // Profile Tiers
    profile_tiers_free: "Miembro Gratis",
    profile_tiers_vip: "Miembro VIP",
    profile_tiers_expires: "Expira el {date}",
    profile_tiers_benefits: "Ver beneficios",
    
    // Perks System
    perks_title: "Mis Ventajas",
    perks_subscription_title: "Suscripción",
    perks_badges_title: "Insignias y Flairs",
    perks_badges_status_active: "Activo",
    perks_badges_status_expired: "Expirado",
    perks_badges_status_hidden: "Oculto",
    perks_badges_make_public: "Hacer Público",
    perks_badges_make_private: "Hacer Privado",
    perks_badges_set_featured: "Destacar",
    perks_badges_remove_featured: "Quitar de Destacados",
    perks_badges_earned_on: "Obtenido el {date}",
    perks_no_badges: "Aún no tienes insignias. ¡Comienza publicando confesiones!",
    
    // Shop
    shop_title: "Tienda de Flairs",
    shop_required_plan_free: "Disponible para todos",
    shop_required_plan_vip: "Requiere VIP",
    shop_lock_vip: "Actualiza a VIP para desbloquear",
    shop_purchase: "Comprar",
    shop_purchased: "Comprado",
    shop_expires_in: "Expira en {days} días",
    shop_expired: "Expirado",
    shop_active_for: "Activo por 5 días",
    shop_buy_again: "Comprar de nuevo",
    shop_coins_balance: "Monedas: {balance}",
    
    // Flair Names (Additional)
    flair_sparkle: "Brillo",
    flair_gem: "Gema",
    flair_lightning: "Relámpago",
    flair_magic: "Magia",
    
    // Errors
    errors_plan_too_low: "Este artículo requiere {plan}",
    
    // Test-required keys
    common_confirm: "Confirmar",
    common_loading: "Cargando...",
    auth_signin: "Iniciar Sesión",
    auth_signout: "Cerrar Sesión",
    auth_signup: "Registrarse",
    auth_login: "Iniciar sesión",
    subscription_cancel: "Cancelar Suscripción",
    subscription_active: "Activo",
    subscription_expired: "Expirado",
    subscription_trial: "Prueba",
    nav_confessions: "Confesiones",
    confession_submit: "Enviar Confesión",
    confession_content: "Contenido de Confesión",
    error_network: "Error de red",
    error_validation: "Error de validación",
    
    // Daily Rewards
    reward_daily_title: "Recompensa de Inicio Diario",
    reward_daily_desc: "¡Reclama tus monedas gratis!",
    reward_claim: "Reclamar",
    reward_claimed: "¡Recompensa Reclamada!",
    reward_claimed_desc: "Recibiste 10 monedas por iniciar sesión hoy",
    
    // Premium Teasers
    teaser_feature: "Desbloquea Funciones VIP",
    teaser_description: "Obtén información ilimitada, soporte prioritario y ventajas exclusivas",
    teaser_unlock: "Desbloquear VIP",
    teaser_explore_feature: "Descubre Más Contenido",
    teaser_explore_description: "Los usuarios VIP tienen acceso a contenido exclusivo en tendencia y búsqueda avanzada",
    
    // Feature Comparison
    comparison_title: "Comparar Planes",
    comparison_feature: "Característica",
    comparison_daily_confessions: "Confesiones Diarias",
    comparison_ai_responses: "Respuestas IA",
    comparison_deep_insights: "Análisis Profundo",
    comparison_analytics: "Análisis Avanzado",
    comparison_boost: "Impulsar Confesiones",
    comparison_priority_support: "Soporte Prioritario",
    comparison_custom_badge: "Insignia Personalizada",
    comparison_unlimited: "Ilimitado",
    comparison_upgrade_now: "Actualizar Ahora",
    
    // Trending Hashtags
    hashtags_trending: "Hashtags en Tendencia",
    
    // Install Prompt
    install_app: "Instalar Aplicación",
    install_app_description: "Agrega ConfessAI a tu pantalla de inicio para una mejor experiencia",
    install: "Instalar",
    not_now: "Ahora No",
    
    // Onboarding
    onboarding_anonymous_desc: "Tu identidad está protegida. Comparte libremente sin miedo.",
    onboarding_social_title: "Funciones Sociales",
    onboarding_social_desc: "Sigue usuarios, da me gusta a confesiones y construye tu comunidad.",
    onboarding_messages_title: "Mensajes Directos",
    onboarding_messages_desc: "Conéctate privadamente con otros en la comunidad.",
    onboarding_ai_title: "Perspectivas IA",
    onboarding_ai_desc: "Obtén respuestas reflexivas de IA a tus confesiones.",
    onboarding_welcome_title: "Bienvenido a Tu Espacio Seguro",
    onboarding_welcome_desc: "Un lugar donde puedes compartir tus pensamientos de forma anónima y conectarte con otros",
    onboarding_privacy_title: "Tu Privacidad Importa",
    onboarding_privacy_desc: "Usamos cifrado de extremo a extremo y nunca compartimos tus datos. Tus confesiones permanecen anónimas a menos que elijas lo contrario.",
    onboarding_terms_desc: "Al continuar, aceptas nuestros Términos de Servicio y Política de Privacidad. Puedes eliminar tus datos en cualquier momento desde la configuración de tu perfil.",
    
    // Network Status
    network_offline: "Estás desconectado. Los mensajes se enviarán cuando se restaure la conexión.",
    network_syncing: "Sincronizando {count} operación(es) pendiente(s)...",
    
    // Content Moderation
    content_warning_title: "Información Personal Detectada",
    content_warning_detected: "Información personal detectada. ¿Continuar?",
    content_warning_continue: "Publicar De Todos Modos",
    content_email: "Dirección de email",
    content_phone: "Número de teléfono",
    content_address: "Dirección física",
    content_banned: "Contenido restringido",

    // Admin
    admin_performance: "Métricas de Rendimiento",
    admin_performance_desc: "Salud del sistema y monitoreo",
    admin_active_users: "Usuarios Activos",
    admin_last_5_minutes: "Últimos 5 minutos",
    admin_cache: "Gestión de Caché",
    admin_clear_cache: "Limpiar Caché",
    admin_confirm_clear: "¿Limpiar todo el caché?",
    admin_clear_warning: "Esto eliminará todos los datos en caché.",
    cache_cleared: "Caché limpiado exitosamente",

    // Analytics
    analytics_engagement: "Desglose de Interacción",
    analytics_engagement_desc: "Distribución de interacciones",
    analytics_best_times: "Mejores Horarios para Publicar",
    analytics_best_times_desc: "Horas pico de interacción",
    views: "Vistas",
    likes: "Me Gusta",
    comments: "Comentarios",
    shares: "Compartidos",

    // Quick Actions
    scroll_top: "Subir Arriba",
    drafts: "Borradores",

    // Font Size Control
    font_size_small: "Pequeño",
    font_size_normal: "Normal",
    font_size_large: "Grande",
    font_size_xl: "Extra Grande",
    
    // Copy Text
    copy_text: "Copiar texto",
    text_copied: "Texto copiado al portapapeles",
    
    // Anonymous Badge
    anonymous_badge: "100% Anónimo",
    identity_protected: "Tu identidad está completamente protegida",
    
    // Offline Enhanced
    offline_mode: "Modo Sin Conexión",
    offline_message: "Estás sin conexión. Se sincronizará al conectar",
    
    // Haptic
    haptic_enabled: "Retroalimentación Háptica Activada",
    
    // Loading Quotes
    loading_quote_1: "Los secretos nos hacen humanos...",
    loading_quote_2: "Tu historia importa...",
    loading_quote_3: "Todos tienen algo que compartir...",
    
    // Edit/Delete Windows
    edit_available: "Edición disponible por {seconds}s",
    delete_available: "Eliminación disponible por {time}",
    edit_window_expired: "Ventana de edición expirada",
    
    // Theme
    theme_oled: "Negro OLED",
    
    confession_new: "Nueva Confesión",

    // Filters
    filters_title: "Filtros",
    filters_date: "Rango de Fechas",
    filters_community: "Comunidad",
    filters_sort: "Ordenar Por",
    filters_clear: "Limpiar Filtros",
    sort_newest: "Más Recientes",
    sort_oldest: "Más Antiguos",
    sort_most_liked: "Más Gustados",
    sort_most_commented: "Más Comentados",
    
    // Common (continued)
    common_continue: "Continuar",
    
    // Karma
    karma_points: "Puntos de Karma",
    karma_level: "Nivel",
    karma_next_level: "Próximo Nivel",
    karma_points_to_go: "puntos para avanzar",
    
    // Search Suggestions
    search_recent: "Recientes",
    search_clear: "Limpiar",
    
    // Sensitive Content
    sensitive_content_warning: "Contenido Sensible",
    sensitive_content_description: "Este contenido puede ser perturbador o activador",
    sensitive_content_view: "Ver De Todos Modos",
    
    // Coin System
    coins_balance: "Saldo",
    coins_get_more: "Obtener Monedas",
    coins_shop_title: "Tienda de Monedas",
    coins_shop_subtitle: "Compra monedas para desbloquear funciones VIP",
    coins_best_value: "Mejor Valor",
    coins_per_coin: "por moneda",
    coins_buy_now: "Comprar Ahora",
    coins_processing: "Procesando...",
    coins_secure_payment: "🔒 Pago Seguro",
    coins_instant_delivery: "⚡ Entrega Instantánea",
    coins_satisfaction: "✓ 100% Satisfacción",
    coins_purchase_error: "Compra fallida. Por favor intenta de nuevo.",
    coins_purchase_success_title: "¡Compra Exitosa!",
    coins_purchase_success_message: "Tus monedas han sido agregadas a tu cuenta",
    coins_purchase_cancelled_title: "Compra Cancelada",
    coins_purchase_cancelled_message: "Tu pago fue cancelado. No se realizaron cargos.",
    coins_go_home: "Ir a Inicio",
    coins_visit_store: "Visitar Tienda",
    coins_try_again: "Intentar de Nuevo",
    coins_most_popular: "Más Popular",
    
    // Gift Coins
    coins_gift_title: "Regalar Monedas",
    coins_gift_amount: "Cantidad",
    coins_gift_message: "Mensaje (Opcional)",
    coins_gift_anonymous: "Enviar Anónimamente",
    coins_gift_anonymous_fee: "+50 monedas de tarifa",
    coins_gift_platform_fee: "Tarifa de plataforma (5%)",
    coins_gift_total: "Costo total",
    coins_gift_send: "Enviar Regalo",
    coins_gift_success: "¡{amount} monedas regaladas exitosamente!",
    coins_gift_insufficient: "Monedas insuficientes. Necesitas {amount} monedas",
    
    // Awards
    coins_award_title: "Dar un Premio",
    coins_award_star: "Estrella",
    coins_award_heart: "Corazón",
    coins_award_fire: "Fuego",
    coins_award_diamond: "Diamante",
    coins_award_give: "Dar Premio",
    coins_award_success: "¡Premio otorgado! El creador ganó {amount} monedas",
    coins_award_creator_earns: "El creador gana",
    coins_award_appreciation: "¡Muestra tu aprecio! El creador recibirá el 50% del valor del premio.",
    
    // Boosts
    coins_boost_title: "Impulsa Tu Confesión",
    coins_boost_basic: "Impulso Básico",
    coins_boost_super: "Super Impulso",
    coins_boost_pin: "Fijar en Perfil",
    coins_boost_activate: "Activar Impulso",
    coins_boost_active: "Impulso Activo",
    coins_boost_expires: "Expira en {hours} horas",
    coins_boost_description: "¡Impulsa tu confesión para llegar a más personas y obtener más interacción!",
    coins_boost_duration: "Duración",
    coins_boost_success: "¡{name} activado por {duration}!",
    coins_boost_already_active: "Esta confesión ya tiene un impulso activo",
    
    // Subscription flow messages
    payment_processing_wait: "Procesando tu suscripción… por favor espera",
    upgrade_processing_now: "Actualizando tu plan…",
    upgrade_success: "Plan actualizado correctamente",
    downgrade_scheduled_next_period: "Tu cambio de plan se aplicará en el próximo ciclo de facturación.",
    cancel_scheduled: "Tu suscripción finalizará al final de este ciclo de facturación.",
    processing_request: "Procesando tu solicitud…",
    request_done: "¡Listo!",
    upgradeFailed: "Error en la actualización. Inténtalo de nuevo.",
    webhookLag: "Actualización recibida. Sincronizando tu cuenta…",
    already_on_this_plan: "Ya estás en este plan.",
    invalid_target_plan: "Plan de destino no válido.",
  },
  de: {
    app_name: "Confess+",
    welcome_title: "Willkommen bei Confess+",
    welcome_description: "Ein sicherer Ort, an dem du anonym alles teilen kannst.",
    anonymous_secure: "100% Anonym & Sicher",
    anonymous_description: "Deine Identität bleibt vollständig vertraulich. Wir speichern keine persönlichen Informationen.",
    ai_support: "Einfühlsame KI-Unterstützung",
    ai_description: "Erhalte empathische KI-Antworten und mit VIP tiefe psychologische Einblicke.",
    get_started: "Jetzt Starten",
    skip: "Überspringen",
    next: "Weiter",
    
    home_title: "Anonyme Geständnisse",
    new_confession: "Neues Geständnis",
    vip_upgrade: "Auf VIP Upgraden",
    
  placeholder_confession: "Teile, was dich bewegt... (10-2000 Zeichen)",
  submit: "Geständnis absenden",
  submitting: "Wird gesendet...",
    
    ai_reply_title: "KI-Antwort",
    deep_insight_title: "Tiefer Einblick",
    generate_insight: "Tiefen Einblick Generieren",
    insight_title: "Deep Insight",
    insight_run: "Ausführen",
    insight_reset: "Zurücksetzen",
    insight_delete: "Insight löschen",
    
    user_anonymous: "Anonym",
    
    boost_cta: "Beichte boosten",
    boost_price: "{price} Münzen",
    boost_active: "Boost aktiv",
    boost_badge: "Geboostet",
    boost_confirm: "Deine Beichte wurde für 24h geboostet.",
    boost_expiry_in: "Läuft ab in {time}",
    boost_reboost: "Erneut boosten",
    boost_not_enough: "Nicht genug Münzen.",
    boost_error_active: "Für diese Beichte ist bereits ein aktiver Boost vorhanden.",
    
  subscription_tier_free: "Free",
  subscription_tier_vip: "VIP",
  subscription_cta_upgrade: "Abo abschließen",
  subscription_upgrade: "Upgrade",
  subscription_downgrade: "Downgrade",
  subscription_single_active_policy: "Nur ein aktives Abonnement ist erlaubt. Verwenden Sie Upgrade, Downgrade oder Kündigen.",
  subscription_already_subscribed: "Sie haben bereits ein Abonnement. Verwenden Sie Upgrade, Downgrade oder Kündigen.",
  subscription_conflict_resolved_keep_new: "Ihr Plan wurde auf den letzten Kauf aktualisiert und der alte Plan wurde gekündigt.",
  subscription_conflict_resolved_keep_old: "Ihr bestehender Plan bleibt aktiv; der neue Kauf wurde storniert.",
  upgrade_required: "Upgrade Erforderlich",
  required: "Erforderlich",
    
    toast_sent: "Dein Geständnis wurde anonym gesendet 💭",
    toast_flagged: "Inhalt nicht erlaubt. Bitte umformulieren.",
    error_generic: "Etwas ist schiefgelaufen. Bitte erneut versuchen.",
    
    report: "Melden",
    share: "Teilen",
    delete: "Löschen",
    
    language: "Sprache",
    profile: "Profil",
    settings: "Einstellungen",
    logout: "Abmelden",
    login: "Anmelden",
    signup: "Registrieren",
    
    confessions_count: "Geständnisse",
    insights_used: "Einblicke genutzt",
    member_since: "Mitglied seit",
    
    crisis_hint: "Wenn du in unmittelbarer Gefahr bist, wende dich an den örtlichen Notdienst.",
    
    error_submit: "Geständnis konnte nicht gesendet werden. Bitte erneut versuchen.",
    error_delete: "Geständnis konnte nicht gelöscht werden.",
    error_load: "Geständnisse konnten nicht geladen werden.",
    error_auth: "Du musst angemeldet sein, um zu posten.",
    
    success_sent: "Dein Geständnis wurde gesendet! 💜",
    success_deleted: "Geständnis erfolgreich gelöscht.",
    success_reported: "Meldung gesendet. Wir werden dieses Geständnis überprüfen. Danke!",
    success_logout: "Auf Wiedersehen! 👋",
    
    validation_min: "Geständnis muss mindestens 10 Zeichen haben",
    validation_max: "Geständnis darf 2000 Zeichen nicht überschreiten",
    
    deep_insight_vip: "Deep Insight ist nur für VIP-Nutzer verfügbar.",
    deep_insight_description: "Tiefgreifende psychologische Analyse für vollständiges Verständnis.",
    deep_insight_success: "Deep Insight generiert! ✨",
    
    vip_member: "VIP-Mitglied",
    vip_feature: "VIP-Funktion",
    vip_benefits: "Unbegrenzte Deep Insights, detaillierte Antworten, werbefrei.",
    upgrade_now: "Jetzt Upgraden",
    
    delete_account: "Konto Löschen",
    delete_account_description: "Konto und alle zugehörigen Daten dauerhaft löschen",
    delete_confirm: "Dauerhaft Löschen",
    delete_warning: "Diese Aktion kann nicht rückgängig gemacht werden. Dein Konto und alle Daten werden dauerhaft gelöscht.",
    deleting: "Wird gelöscht...",
    export_data: "Daten Exportieren",
    
    referral_title: "Freunde Einladen",
    referral_description: "Verdiene 1 Tag VIP für jeden Freund, der sich registriert",
    referral_earned: "Du hast {days} Tage kostenloses VIP verdient!",
    
    privacy_policy: "Datenschutzrichtlinie",
    terms_of_service: "Nutzungsbedingungen",
    all_rights_reserved: "Alle Rechte vorbehalten.",
    
    // Categories
    category_relationships: "Beziehungen",
    category_work: "Arbeit",
    category_family: "Familie",
    category_health: "Gesundheit",
    category_money: "Geld",
    category_other: "Sonstiges",
    select_category: "Kategorie wählen",
    filter_by_category: "Nach Kategorie filtern",
    all_categories: "Alle Kategorien",
    
    // Analytics
    analytics_title: "Deine Statistiken",
    analytics_total_confessions: "Gesamte Geständnisse",
    analytics_total_likes: "Erhaltene Likes",
    analytics_most_popular: "Am Beliebtesten",
    analytics_by_category: "Nach Kategorie",
    analytics_no_data: "Noch keine Daten",
    
    // Comments
    comments_title: "Kommentare",
    comments_add: "Kommentar hinzufügen",
    comments_placeholder: "Schreibe deinen Kommentar... (max 500 Zeichen)",
    comments_submit: "Veröffentlichen",
    comments_delete: "Löschen",
    comments_edit: "Bearbeiten",
    comments_none: "Noch keine Kommentare",
    comments_show: "Kommentare anzeigen",
    comments_hide: "Kommentare ausblenden",
    
    // Notifications
    notifications_title: "Benachrichtigungen",
    notifications_mark_read: "Alle als gelesen markieren",
    notifications_mark_all_read: "Alle als gelesen markieren",
    notifications_delete: "Benachrichtigung löschen",
    notifications_delete_all: "Alle löschen",
    notifications_delete_confirm: "Möchten Sie diese Benachrichtigung wirklich löschen?",
    notifications_delete_all_confirm: "Dies löscht alle Ihre Benachrichtigungen. Diese Aktion kann nicht rückgängig gemacht werden.",
    notifications_marked_read: "Alle als gelesen markiert",
    notifications_deleted: "Benachrichtigung gelöscht",
    notifications_all_deleted: "Alle Benachrichtigungen gelöscht",
    notifications_none: "Keine Benachrichtigungen",
    notification_like: "hat dein Geständnis geliked",
    notification_comment: "hat dein Geständnis kommentiert",
    notification_new: "Neu",
    notification_message_prefix: "Neue Nachricht:",
    notification_message_new: "Neue Nachricht",
    notification_view: "Ansehen",
    
    // Bookmarks
    bookmarks_title: "Gespeichert",
    bookmarks_add: "Speichern",
    bookmarks_remove: "Entfernen",
    bookmarks_none: "Keine gespeicherten Geständnisse",
    bookmarks_saved: "In Lesezeichen gespeichert",
    
    achievements_title: "Errungenschaften",
    achievements_unlocked: "freigeschaltet",
    achievement_first_confession: "Erstes Geständnis",
    achievement_first_confession_desc: "Dein erstes Geständnis gepostet",
    achievement_active_user: "Aktiver Nutzer",
    achievement_active_user_desc: "10+ Geständnisse gepostet",
    achievement_power_user: "Power-Nutzer",
    achievement_power_user_desc: "50+ Geständnisse gepostet",
    achievement_deep_thinker: "Tiefer Denker",
    achievement_deep_thinker_desc: "5+ Deep Insights generiert",
    achievement_vip_member: "VIP-Mitglied",
    achievement_vip_member_desc: "Mitglied der VIP-Community",
    achievement_supporter: "Unterstützer",
    achievement_supporter_desc: "Unterstützt die Plattformentwicklung",
    
    feature_ai_empathy: "KI-Empathie",
    feature_ai_empathy_desc: "Empathische Antworten von KI, die trainiert wurde, um zu verstehen und zu unterstützen",
    feature_anonymous: "100% Anonym",
    feature_anonymous_desc: "Deine Identität bleibt vertraulich; Geständnisse können nicht zugeordnet werden",
    feature_deep_insights: "Deep Insights",
    feature_deep_insights_desc: "Tiefgreifende psychologische Analyse für vollständiges Verständnis (VIP)",
    feature_instant_response: "Sofortige Antwort",
    feature_instant_response_desc: "Erhalte sofortiges Feedback, 24/7 verfügbar, wenn du es brauchst",
    
    error_boundary_title: "Hoppla! Etwas ist schiefgelaufen",
    error_boundary_description: "Entschuldigung für die Unannehmlichkeiten. Versuche die Seite neu zu laden oder zur Startseite zurückzukehren.",
    error_boundary_reload: "Neu laden",
    error_boundary_home: "Startseite",
    
    referral_link_label: "Dein Empfehlungslink:",
    referral_friends_invited: "Freunde eingeladen",
    referral_link_copied: "Link kopiert! 🎉",
    referral_share_message: "Begleite mich auf Confess+ - ein sicherer Ort für anonyme Geständnisse mit KI-Unterstützung!",
    referral_reward_message: "Du hast {days} Tage kostenloses VIP verdient!",
    referral_continue_inviting: "Lade weiter Freunde ein für mehr Vorteile",
    
    share_title: "Geständnis Teilen",
    share_copy_link: "Link Kopieren",
    share_link_copied: "Link kopiert!",
    share_text: "Entdecke dieses Geständnis auf Confess+",
    
    stats_active_users: "Aktive Nutzer",
    stats_confessions_shared: "Geteilte Geständnisse",
    stats_empathetic_reactions: "Empathische Reaktionen",
    stats_vip_members: "VIP-Mitglieder",
    
    auth_welcome_back: "Willkommen zurück",
    auth_create_account: "Erstelle dein kostenloses Konto",
    auth_email_placeholder: "E-Mail",
    auth_password_placeholder: "Passwort",
    auth_logging_in: "Anmeldung läuft...",
    auth_creating_account: "Konto wird erstellt...",
    auth_login_button: "Anmelden",
    auth_signup_button: "Registrieren",
    auth_no_account: "Kein Konto?",
    auth_signup_link: "Registrieren",
    auth_have_account: "Bereits ein Konto?",
    auth_login_link: "Anmelden",
    auth_benefits_title: "Vorteile des kostenlosen Kontos:",
    auth_benefit_unlimited: "Unbegrenzte anonyme Geständnisse",
    auth_benefit_ai_responses: "Empathische KI-Antworten",
    auth_benefit_community: "Unterstützungs-Community",
    auth_invalid_email: "Ungültige E-Mail",
    auth_password_min: "Passwort muss mindestens 6 Zeichen haben",
    auth_invalid_credentials: "E-Mail oder Passwort falsch",
    auth_email_exists: "Diese E-Mail ist bereits registriert",
    auth_welcome_message: "Willkommen in der Confess+ Community",
    auth_login_success: "Erfolgreich angemeldet.",
    auth_signup_success: "Konto erfolgreich erstellt! 🎉",
    auth_error: "Fehler",
    auth_error_generic: "Ein Fehler ist aufgetreten. Bitte versuche es erneut.",
    auth_captcha_failed: "CAPTCHA-Verifizierung fehlgeschlagen. Bitte versuche es erneut.",
    auth_session_revoked: "Sitzung erfolgreich widerrufen.",
    auth_all_sessions_revoked: "Alle Sitzungen widerrufen. Bitte melde dich erneut an.",
    auth_device_mismatch: "Gerätekonflikt erkannt. Bitte melde dich erneut an.",
    auth_session_limit: "Maximale Anzahl aktiver Sitzungen erreicht. Bitte melde dich auf einem anderen Gerät ab.",
    auth_account_locked: "Konto vorübergehend gesperrt aufgrund mehrerer fehlgeschlagener Anmeldeversuche. Bitte versuche es später erneut.",
    auth_password_rules_title: "Passwortanforderungen:",
    auth_password_rules_len: "Mindestens 10 Zeichen",
    auth_password_rules_upper: "Mindestens ein Großbuchstabe (A-Z)",
    auth_password_rules_lower: "Mindestens ein Kleinbuchstabe (a-z)",
    auth_password_rules_digit: "Mindestens eine Zahl (0-9)",
    auth_password_rules_special: "Mindestens ein Sonderzeichen (!@#$%^&*...)",
    auth_password_match_ok: "Passwörter stimmen überein",
    auth_password_match_fail: "Passwörter stimmen nicht überein",
    auth_password_strength_weak: "Schwach",
    auth_password_strength_fair: "Mittel",
    auth_password_strength_good: "Gut",
    auth_password_strength_strong: "Stark",
    auth_stay_signed_in: "Angemeldet bleiben",
    auth_confirm_password_placeholder: "Passwort bestätigen",
    auth_show_password: "Passwort anzeigen",
    auth_hide_password: "Passwort verbergen",
    auth_password_too_short: "Passwort muss mindestens 10 Zeichen haben",
    auth_password_weak: "Passwort erfüllt nicht die Sicherheitsanforderungen",
    auth_validation_passed: "Validierung erfolgreich",
    auth_success: "Erfolg!",
    
    // Password Reset
    passwordReset_title: "Passwort Zurücksetzen",
    passwordReset_emailSent: "Passwort-Reset-E-Mail gesendet! Überprüfe deinen Posteingang.",
    passwordReset_emailPlaceholder: "Gib deine E-Mail-Adresse ein",
    passwordReset_submitButton: "Reset-Link Senden",
    passwordReset_loading: "Wird gesendet...",
    
    common_success: "Erfolg",
    common_something_went_wrong: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
    common_unauthorized: "Unbefugter Zugriff.",
    common_rate_limit: "Zu viele Anfragen. Bitte versuche es später erneut.",
    
    ui_recent: "Neueste",
    ui_popular: "Beliebt",
    ui_loading: "Lädt...",
    ui_safe_space: "Sicherer und anonymer Raum",
    ui_share_thoughts: "Teile deine Gedanken",
    ui_safe_description: "Ein sicherer Ort, an dem du du selbst sein kannst. Schreibe anonym, was du fühlst und erhalte empathische KI-Antworten.",
    ui_no_confessions: "Noch keine Geständnisse",
    ui_first_confession_desc: "Sei der Erste, der seine Gedanken teilt. Du erhältst sofort eine empathische KI-Antwort.",
    ui_upgrading: "Upgrade läuft... 💳",
    ui_payment_redirect: "Weiterleitung zum Zahlungssystem (Demo)",
    ui_welcome_vip: "Willkommen bei VIP! 🎉",
    ui_vip_access: "Du hast jetzt Zugriff auf alle VIP-Funktionen.",
    ui_help_question: "Wie können wir helfen?",
    ui_help_choose: "Wähle eine der unten stehenden Optionen, um Hilfe zu erhalten",
    ui_help_reply_time: "Wir antworten normalerweise innerhalb von 24 Stunden",
    ui_pull_to_refresh: "Zum Aktualisieren ziehen",
    ui_release_to_refresh: "Zum Aktualisieren loslassen",
    ui_refreshing: "Aktualisiert...",
    
    subscription_vip_title: "Confess+ VIP",
    subscription_choose_plan: "Wähle {plan}",
    subscription_monthly: "Monatlich",
    subscription_yearly: "Jährlich",
    subscription_per_month: "pro Monat",
    subscription_per_year: "pro Jahr",
    subscription_save_percent: "Spare 40%",
    subscription_most_popular: "AM BELIEBTESTEN",
    subscription_subscribe: "Abonnieren",
    subscription_subscribe_yearly: "Jährlich Abonnieren",
    subscription_processing: "Verarbeitung...",
    subscription_cancel_anytime: "Du kannst jederzeit in den Kontoeinstellungen kündigen. Keine langfristigen Verpflichtungen.",
    subscription_cancel_confirm: "Bist du sicher, dass du dein Abonnement kündigen möchtest? Du verlierst den Zugriff auf alle VIP-Funktionen am Ende deines Abrechnungszeitraums.",
    subscription_benefit_1: "Unbegrenztes Deep Insight AI - tiefgreifende psychologische Analyse",
    subscription_benefit_2: "Erweiterte und detailliertere KI-Antworten",
    subscription_benefit_3: "Werbefrei - sauberes Erlebnis",
    subscription_benefit_4: "Priorität bei KI-Verarbeitung",
    subscription_benefit_5: "Zugang zu zukünftigen Funktionen",
    subscription_auth_required: "Du musst angemeldet sein, um zu abonnieren.",
    subscription_error: "Abonnementprozess konnte nicht gestartet werden. Versuche es erneut.",
    
    // Subscription Plans - New Benefits (Confession Limits)
    plans_free_benefit_confessions: "3 Beichten pro Tag",
    plans_vip_benefit_confessions: "Unbegrenzte Beichten pro Tag",
    plans_free_benefit_basic: "Grundfunktionen",
    plans_free_benefit_ads: "Werbung aktiviert",
    plans_vip_benefit_unlimited_ai: "Unbegrenzte KI-Antworten",
    plans_vip_benefit_no_ads: "Keine Werbung",
    plans_vip_benefit_custom_themes: "Benutzerdefinierte Designs",
    plans_vip_benefit_private_confessions: "Private Beichten",
    plans_vip_benefit_advanced_stats: "Erweiterte Statistiken",
    plans_vip_benefit_special_badge: "Spezielles VIP-Abzeichen",
    plans_vip_benefit_unlimited_ai_desc: "Unbegrenzte KI-Analyse",
    plans_vip_benefit_priority_ai: "Prioritäts-KI-Antworten",
    plans_vip_benefit_priority_support: "Prioritäts-Support",
    plans_vip_benefit_coins_bonus: "+250 Münzen Bonus",
    plans_vip_benefit_login_rewards: "Tägliche Login-Belohnungen",
    plans_vip_benefit_images: "Beichten mit Bildern",
    plans_vip_benefit_stats: "Detaillierte Statistiken",
    plans_vip_benefit_support: "Prioritäts-Support",
    plans_vip_benefit_badge: "Spezielles VIP-Abzeichen",
    plans_upgrade_now: "Jetzt upgraden",
    plans_downgrade: "Herabstufen",
    plans_current_plan: "Aktueller Plan",
    plans_renews_on: "Verlängert am",
    plans_vip_activated: "👑 Sie sind jetzt VIP!",
    plans_vip_welcome: "Willkommen bei VIP! Genießen Sie unbegrenzte Geständnisse und vorrangigen Support.",
    
    // Plan Titles and Tooltips
    plans_free_title: "Kostenlos",
    plans_free_tooltip: "Kostenloses Mitglied",
    plans_vip_title: "VIP",
    plans_vip_tooltip: "VIP-Mitglied - VIP-Zugang mit exklusiven Vorteilen",
    
    // Paywall
    plans_paywall_title: "Wähle deinen Abonnement-Plan",
    plans_paywall_subtitle: "Vergleiche Funktionen und finde dein bestes Erlebnis.",
    
    // Trial System
    trial_offer_title: "VIP Kostenlos Testen!",
    trial_offer_desc: "Erhalte 3 Tage vollen VIP-Zugang, keine Kreditkarte erforderlich",
    trial_button_text: "3 Tage Kostenlos Testen",
    trial_already_used_title: "Testversion Bereits Verwendet",
    trial_already_used_desc: "Du hast deine kostenlose Testversion bereits genutzt.",
    trial_activated_title: "🎉 VIP-Testversion Aktiviert!",
    trial_activated_desc: "Genieße 3 Tage VIP-Funktionen kostenlos!",
    trial_activation_error: "Testversion konnte nicht aktiviert werden. Bitte versuche es erneut.",
    trial_banner_title: "🎉 VIP-Testversion Aktiv",
    trial_banner_days_remaining: "{days} Tage verbleibend",
    trial_banner_desc: "Erlebe alle VIP-Funktionen für 3 Tage.",
    trial_banner_cta: "3 Tage gratis testen",
    trial_banner_disclaimer: "Nach 3 Tagen wird der VIP-Preis berechnet, sofern du nicht kündigst.",
    trial_error_used: "Du hast den VIP-Test bereits genutzt.",
    trial_error_already_subscribed: "Du hast bereits ein aktives Abonnement.",
    trial_ended_toast: "Dein VIP-Test ist beendet. Du bist wieder Free.",
    trial_purchase: "Testversion",
    
    // Confession Limits
    limit_reached_title: "Tageslimit Erreicht",
    limit_reached_description: "Du hast dein tägliches Beichtlimit erreicht. Upgrade, um mehr zu posten!",
    limit_current_plan: "Aktueller Plan",
    limit_used_today: "Heute Verwendet",
    limit_resets_in: "Zurücksetzen in",
    limit_upgrade_benefits: "Upgrade für mehr Posts:",
    limit_see_plans: "Pläne Ansehen",
    limit_confessions_remaining: "{count} Beichten übrig heute",
    limit_confessions_unlimited: "Unbegrenzte Beichten heute",
    
    // Auth Captcha
    auth_captcha_required_after_fails: "Bitte bestätigen Sie, dass Sie ein Mensch sind, um fortzufahren",
    
    // Forgot / Reset Password
    auth_forgot_password: "Passwort vergessen?",
    auth_forgot_password_title: "Passwort zurücksetzen",
    auth_forgot_password_desc: "Gib deine E-Mail ein und wir senden dir Anweisungen.",
    auth_forgot_password_button: "Zurücksetzungs-Link senden",
    auth_forgot_password_success: "Wenn ein Konto existiert, erhältst du bald Anweisungen.",
    auth_reset_password_title: "Neues Passwort erstellen",
    auth_reset_password_desc: "Wähle ein sicheres Passwort für dein Konto.",
    auth_reset_password_button: "Passwort aktualisieren",
    auth_reset_password_success: "Passwort erfolgreich aktualisiert. Bitte melde dich an.",
    auth_reset_password_new: "Neues Passwort",
    auth_reset_password_confirm: "Neues Passwort bestätigen",
    auth_reset_token_invalid: "Ungültiger oder abgelaufener Zurücksetzungs-Link",
    auth_reset_token_expired: "Dieser Zurücksetzungs-Link ist abgelaufen. Bitte fordere einen neuen an.",
    auth_back_to_login: "Zurück zur Anmeldung",
    
    // Email Verification
    auth_verify_email_title: "E-Mail bestätigen",
    auth_verify_email_success: "E-Mail erfolgreich bestätigt!",
    auth_verify_email_error: "Bestätigung fehlgeschlagen. Bitte versuche es erneut.",
    auth_verify_email_desc: "Bitte überprüfe deine E-Mail, um dein Konto zu bestätigen.",
    auth_email_not_verified: "Bitte bestätige deine E-Mail um fortzufahren",
    auth_check_email_verify: "Überprüfe deine E-Mail um dein Konto zu bestätigen",
    
    // Common Actions
    common_close: "Schließen",
    
    trust_anonymous: "100% Anonym",
    trust_anonymous_desc: "Deine Identität bleibt vertraulich",
    trust_ssl: "SSL Sicher",
    trust_ssl_desc: "Alle Daten sind verschlüsselt",
    trust_moderation: "KI-Moderation",
    trust_moderation_desc: "Inhalte automatisch verifiziert",
    trust_safe_community: "Sichere Community",
    trust_safe_community_desc: "Urteilsfreier Raum",
    
    payment_canceled_title: "Zahlung Abgebrochen",
    payment_canceled_desc: "Der Zahlungsprozess wurde abgebrochen. Es wurde kein Betrag belastet.",
    payment_back_home: "Zurück zur Startseite",
    payment_try_again: "Erneut versuchen",
    payment_contact_help: "Wenn du Probleme hattest, kontaktiere uns bitte.",
    payment_success_title: "Zahlung Erfolgreich!",
    payment_success_desc: "Glückwunsch! Dein VIP-Konto wurde erfolgreich aktiviert.",
    payment_success_deep_insights: "Zugang zu Deep Insights KI",
    payment_success_analysis: "Tiefgreifende psychologische Analyse",
    payment_success_priority: "Prioritäts-Support",
    payment_success_explore: "Confess+ Erkunden",
    payment_redirect_info: "Du wirst in 5 Sekunden automatisch weitergeleitet...",
    
    profile_your_account: "Dein Konto",
    profile_subscription_active: "Aktives Abonnement bis",
    profile_refresh_status: "Status Aktualisieren",
    profile_discover_vip: "Entdecke Confess+ VIP",
    profile_vip_description: "Erhalte unbegrenzten Zugang zu Deep Insights KI, erweiterten Antworten und einem werbefreien Erlebnis.",
    profile_you_are_vip: "Du bist VIP-Mitglied!",
    profile_vip_thanks: "Du genießt alle Confess+ Vorteile. Danke für deine Unterstützung! 💜",
    profile_no_confessions: "Du hast noch keine Geständnisse gepostet.",
    
    ucl_no_confessions: "Du hast noch keine Geständnisse gepostet.",
    
    common_back: "Zurück",
    common_error: "Fehler",
    common_help_aria: "Hilfe",
    common_theme_aria: "Design wechseln",
    common_view_all: "Alle anzeigen",
    
    search_results: "Suchergebnisse",
    
  communities_trending: "Trending Communities",
  communities_all: "Alle Communities",
  communities_empty_title: "Noch Keine Communities",
  communities_empty_description: "Sei der Erste, der eine Community erstellt und dich mit anderen verbindet, die deine Interessen teilen!",
    
    faq_title: "Häufig gestellte Fragen",
    faq_q1: "Ist es wirklich anonym?",
    faq_a1: "Ja! Deine Geständnisse sind vollständig anonym. Dein Name erscheint nie öffentlich und kann von anderen Nutzern nicht mit deinen Geständnissen verknüpft werden. Wir speichern nur die Daten, die für den Betrieb der Plattform erforderlich sind.",
    faq_q2: "Wie funktioniert die KI?",
    faq_a2: "Unsere KI analysiert dein Geständnis und generiert eine empathische, verständnisvolle Antwort. Wir verwenden fortschrittliche Sprachmodelle, die darauf trainiert sind, einfühlsam und nicht wertend zu sein. Die Antworten sind nicht vorgeschrieben; sie werden einzigartig für jedes Geständnis generiert.",
    faq_q3: "Was ist Deep Insight?",
    faq_a3: "Deep Insight ist eine VIP-Funktion, die eine tiefere psychologische Analyse deines Geständnisses bietet. Es umfasst zusätzliche Perspektiven, praktische Ratschläge und reflektierende Fragen, um dir zu helfen, deine Situation besser zu verstehen.",
    faq_q4: "Kann ich meine Geständnisse löschen?",
    faq_a4: "Ja, du kannst deine Geständnisse jederzeit von der Profilseite aus bearbeiten oder löschen. Einmal gelöscht, werden sie dauerhaft aus der Datenbank entfernt.",
    faq_q5: "Was bietet das VIP-Abonnement?",
    faq_a5: "VIP gibt dir unbegrenzte KI Deep Insights, detailliertere Antworten, ein werbefreies Erlebnis und prioritäre KI-Verarbeitung. Du unterstützt auch die Entwicklung der Plattform!",
    faq_q6: "Wie funktioniert das Empfehlungsprogramm?",
    faq_a6: "Du erhältst einen eindeutigen Empfehlungscode, den du mit Freunden teilen kannst. Wenn sich jemand mit deinem Code anmeldet, profitieren beide von Vorteilen. Vollständige Details findest du auf der Profilseite.",
    faq_q7: "Sind meine Daten sicher?",
    faq_a7: "Ja! Alle Daten sind verschlüsselt und sicher gespeichert. Wir verwenden erstklassige Sicherheitspraktiken und entsprechen der DSGVO. Wir verkaufen oder teilen deine Daten nicht mit Dritten.",
    faq_q8: "Kann ich die Plattform für professionelle Beratung nutzen?",
    faq_a8: "Nein. Confess+ ersetzt keine professionelle Beratung. Wenn du mit ernsthaften psychischen Problemen konfrontiert bist, wende dich bitte an einen Spezialisten. Unsere Plattform dient der emotionalen Unterstützung und persönlichen Reflexion.",
    
    settings_title: "Einstellungen",
    settings_manage: "Verwalte dein Konto und deine Privatsphäre",
    settings_export_data: "Daten Exportieren",
    settings_export_desc: "Lade alle deine Daten im JSON-Format herunter",
    settings_privacy_view: "Datenschutzrichtlinie Ansehen",
    settings_delete_warning: "Diese Aktion ist dauerhaft und kann nicht rückgängig gemacht werden",
    settings_data_exported: "Daten Exportiert",
    settings_export_error: "Daten konnten nicht exportiert werden",
    
    profile_verifying: "Überprüfung...",
    
    privacy_title: "Datenschutzrichtlinie",
    privacy_section_1: "1. Datenerfassung",
    privacy_section_1_text: "Confess.AI erfasst nur die Daten, die für den Betrieb der Plattform unbedingt erforderlich sind:",
    privacy_section_1_list: "E-Mail-Adresse (zur Authentifizierung) • Deine Geständnisse (anonym gespeichert) • Nutzungsstatistiken (zur Verbesserung des Dienstes)",
    privacy_section_2: "2. Anonymität",
    privacy_section_2_text: "Deine Geständnisse sind vollständig anonym. Dein Name erscheint nie öffentlich und kann von anderen Nutzern nicht mit deinen Geständnissen verknüpft werden.",
    privacy_section_3: "3. KI-Nutzung",
    privacy_section_3_text: "Deine Geständnisse werden von KI-Modellen verarbeitet, um empathische Antworten zu generieren. Diese Daten werden nicht für das Modelltraining verwendet und bleiben vertraulich.",
    privacy_section_4: "4. Datensicherheit",
    privacy_section_4_text: "Alle Daten sind verschlüsselt und sicher gespeichert. Wir verwenden die besten Sicherheitspraktiken, um deine Informationen zu schützen.",
    privacy_section_5: "5. Deine Rechte",
    privacy_section_5_text: "Du hast das Recht:",
    privacy_section_5_list: "Auf deine persönlichen Daten zuzugreifen • Dein Konto und alle zugehörigen Daten zu löschen • Den Export deiner Daten anzufordern • Die Zustimmung zur Datenverarbeitung zu widerrufen",
    privacy_section_6: "6. Cookies",
    privacy_section_6_text: "Wir verwenden nur essenzielle Cookies für die Funktionalität der Plattform (Authentifizierung und Präferenzen). Wir verwenden keine Tracking- oder Werbe-Cookies.",
    privacy_section_7: "7. Kontakt",
    privacy_section_7_text: "Bei Fragen zum Datenschutz kannst du uns kontaktieren unter: privacy@confess.ai",
    privacy_last_updated: "Zuletzt aktualisiert: Oktober 2025",
    
    terms_title: "Allgemeine Geschäftsbedingungen",
    terms_section_1: "1. Annahme der Bedingungen",
    terms_section_1_text: "Durch die Nutzung von Confess.AI stimmst du diesen Bedingungen zu. Wenn du nicht einverstanden bist, verwende die Plattform bitte nicht.",
    terms_section_2: "2. Nutzung des Dienstes",
    terms_section_2_text: "Confess.AI ist eine Plattform zum anonymen Teilen von Gedanken und zum Empfangen empathischer KI-Antworten. Du verpflichtest dich:",
    terms_section_2_list: "Die Plattform verantwortungsvoll zu nutzen • Keine illegalen, beleidigenden oder schädlichen Inhalte zu posten • Die Community-Regeln zu respektieren • Nicht zu versuchen, andere Nutzer zu identifizieren",
    terms_section_3: "3. Inhalte",
    terms_section_3_text: "Du bist für die Inhalte verantwortlich, die du postest. Wir behalten uns das Recht vor, Inhalte zu moderieren und zu löschen, die:",
    terms_section_3_list: "Gegen geltende Gesetze verstoßen • Bedrohlich oder belästigend sind • Falsche oder irreführende Informationen enthalten • Die Rechte anderer verletzen",
    terms_section_4: "4. VIP und Zahlungen",
    terms_section_4_text: "Das VIP-Abonnement bietet zusätzliche Funktionen. Zahlungen werden sicher über Stripe abgewickelt. Du kannst dein Abonnement jederzeit in den Kontoeinstellungen kündigen.",
    terms_section_5: "5. Haftungsbeschränkung",
    terms_section_5_text: "Confess.AI bietet keine professionellen Beratungsdienste. KI-Antworten werden automatisch generiert und ersetzen keine professionelle Hilfe. Bei ernsthaften psychischen Problemen wende dich bitte an einen Spezialisten.",
    terms_section_6: "6. Änderungen der Bedingungen",
    terms_section_6_text: "Wir behalten uns das Recht vor, diese Bedingungen zu ändern. Änderungen werden über die Plattform und per E-Mail kommuniziert.",
    terms_section_7: "7. Anwendbares Recht",
    terms_section_7_text: "Diese Bedingungen unterliegen den Gesetzen Rumäniens. Alle Streitigkeiten werden vor den zuständigen Gerichten in Bukarest beigelegt.",
    terms_section_8: "8. Kontakt",
    terms_section_8_text: "Für Fragen zu den Allgemeinen Geschäftsbedingungen: legal@confess.ai",
    terms_last_updated: "Zuletzt aktualisiert: Oktober 2025",
    
    index_no_confessions_title: "Noch keine Geständnisse",
    index_no_confessions_desc: "Sei der Erste, der seine Gedanken teilt. Du erhältst sofort eine empathische KI-Antwort.",
    
    notfound_404: "404",
    notfound_title: "Hoppla! Seite nicht gefunden",
    notfound_return_home: "Zurück zur Startseite",
    
    bookmarks_empty_state: "Noch keine Lesezeichen",
    bookmarks_empty_description: "Beginnen Sie, Geständnisse zu markieren, um sie hier zu sehen",
    profile_title: "Profil",
    profile_nickname_change_restricted: "Nickname-Änderung Eingeschränkt",
    profile_nickname_cooldown_message: "Du kannst deinen Nickname in {days} Tag{plural} wieder ändern",
    profile_nickname_days_remaining_singular: "Du kannst deinen Nickname in {days} Tag wieder ändern",
    profile_nickname_days_remaining_plural: "Du kannst deinen Nickname in {days} Tagen wieder ändern",
    profile_nickname_change_available: "Du kannst deinen Nickname jetzt ändern",
    profile_nickname_updated: "Nickname Aktualisiert",
    profile_nickname_update_success: "Dein Nickname wurde erfolgreich aktualisiert",
    profile_settings_updated: "Einstellungen Aktualisiert",
    profile_settings_update_success: "Deine Einstellungen wurden erfolgreich gespeichert",
    profile_nickname_empty_error: "Nickname darf nicht leer sein",
    profile_update_error: "Fehler beim Aktualisieren des Profils",
    profile_my_confessions: "Meine Geständnisse",
    profile_statistics: "Statistiken",
    profile_total_confessions: "Gesamt Geständnisse",
    profile_total_likes: "Gesamt Likes",
    profile_total_comments: "Gesamt Kommentare",
    profile_empty_state: "Noch keine Geständnisse",
    profile_empty_description: "Beginnen Sie, Ihre Gedanken anonym zu teilen",
    profile_email_label: "E-Mail-Adresse",
    profile_change_password: "Passwort Ändern",
    profile_current_password: "Aktuelles Passwort",
    profile_new_password: "Neues Passwort",
    profile_confirm_password: "Neues Passwort Bestätigen",
    profile_password_changed: "Passwort erfolgreich geändert",
    profile_password_cooldown: "Du kannst dein Passwort nur alle 24 Stunden ändern",
    profile_password_mismatch: "Passwörter stimmen nicht überein",
    profile_password_weak: "Passwort muss mindestens 6 Zeichen lang sein",
    profile_password_same: "Neues Passwort muss sich vom aktuellen unterscheiden",
    profile_hours_remaining: "Stunden verbleibend, bis du dein Passwort ändern kannst",
    
    // System & Performance
    system_error_occurred: "Ein Fehler ist aufgetreten. Bitte versuche es erneut.",
    system_rate_limit_exceeded: "Zu viele Anfragen. Bitte warte {seconds} Sekunden, bevor du es erneut versuchst.",
    system_service_unavailable: "Service vorübergehend nicht verfügbar. Wir arbeiten daran.",
    system_network_error: "Netzwerkfehler. Bitte überprüfe deine Verbindung.",
    system_timeout_error: "Zeitüberschreitung der Anfrage. Bitte versuche es erneut.",
    system_validation_error: "Validierungsfehler",
    system_loading: "Lädt...",
    system_retrying: "Erneuter Versuch... (Versuch {attempt})",
    system_cache_cleared: "Cache erfolgreich geleert",
    
    // Validation errors
    validation_content_min: "Inhalt muss mindestens {min} Zeichen haben",
    validation_content_max: "Inhalt darf {max} Zeichen nicht überschreiten",
    validation_email_invalid: "Ungültige E-Mail-Adresse",
    validation_password_min: "Passwort muss mindestens {min} Zeichen haben",
    validation_password_requirements: "Passwort muss Groß-, Kleinbuchstaben und eine Zahl enthalten",
    validation_nickname_min: "Nickname muss mindestens {min} Zeichen haben",
    validation_nickname_max: "Nickname darf {max} Zeichen nicht überschreiten",
    validation_nickname_format: "Nickname darf nur Buchstaben, Zahlen, Bindestriche und Unterstriche enthalten",
    validation_required_field: "Dieses Feld ist erforderlich",
    validation_invalid_url: "Ungültiges URL-Format",
    validation_max_length: "Darf {max} Zeichen nicht überschreiten",
    
    // Performance monitoring
    performance_cache_hit: "Aus Cache geladen",
    performance_cache_miss: "Frische Daten werden abgerufen",
    performance_slow_query: "Langsame Antwort erkannt",
    performance_optimizing: "Leistung wird optimiert...",
    
    achievement_new_badge: "🏆 Du hast ein neues Abzeichen erhalten!",
    
    daily_prompt_title: "Frage des Tages",
    daily_prompt_share: "Teile deine Gedanken",
    
    confession_anonymous: "Anonym",
    time_now: "jetzt",
    time_minutes: "Min",
    time_hours: "Std",
    time_days: "T",
    
    wordcloud_title: "Deine Häufigen Wörter",
    wordcloud_used_times: "{count} Mal verwendet",
    wordcloud_based_on: "Basierend auf {count} Wörtern aus deinen Geständnissen",
    
    seo_default_title: "Anonyme Geständnisse - Teile Deine Gedanken Sicher",
    seo_default_description: "Sichere und anonyme Plattform für Geständnisse. Teile deine Gedanken, erhalte KI-Unterstützung und verbinde dich mit anderen in einem geschützten Raum.",
    seo_default_keywords: "anonyme Geständnisse, emotionale Unterstützung, KI-Geständnisse, sichere Plattform, anonymes Teilen",
    seo_app_name: "Anonyme Geständnisse",
    
    search_placeholder: "Geständnisse suchen...",
    search_button: "Suchen",
    search_clear_filters: "Filter löschen",
    search_category_label: "Kategorie",
    search_sort_label: "Sortieren",
    search_period_label: "Zeitraum",
    search_all_categories: "Alle",
    search_anytime: "Jederzeit",
    search_today: "Heute",
    search_this_week: "Diese Woche",
    search_this_month: "Diesen Monat",
    search_most_recent: "Neueste",
    search_most_popular: "Beliebteste",
    search_trending: "Im Trend",
    
    blocked_users_title: "Blockierte Benutzer",
    blocked_user_unblocked: "Benutzer entsperrt",
    blocked_user_unblocked_desc: "Du wirst die Geständnisse dieses Benutzers wieder sehen",
    blocked_users_error: "Benutzer konnte nicht entsperrt werden",
    blocked_users_none: "Du hast keine Benutzer blockiert",
    blocked_users_anonymous: "Anonymer Benutzer",
    blocked_on: "Blockiert am",
    
    follow_now_following: "Jetzt folgend",
    follow_now_following_desc: "Du wirst die Geständnisse dieses Benutzers in deinem Feed sehen",
    follow_error: "Fehler",
    follow_error_desc: "Die Aktion konnte nicht abgeschlossen werden",
    
    mood_how_feeling: "Wie fühlst du dich jetzt?",
    mood_intensity: "Intensität",
    mood_happy: "Glücklich",
    mood_sad: "Traurig",
    mood_anxious: "Ängstlich",
    mood_angry: "Wütend",
    mood_neutral: "Neutral",
    mood_hopeful: "Hoffnungsvoll",
    
    badge_first_confession: "Erstes Geständnis",
    badge_first_confession_desc: "Du hast dein erstes Geständnis gepostet",
    badge_regular_confessor: "Regelmäßiger Beichtvater",
    badge_regular_confessor_desc: "Du hast 10 Geständnisse gepostet",
    badge_veteran: "Veteran",
    badge_veteran_desc: "Du hast 100 Geständnisse gepostet",
    badge_popular: "Beliebt",
    badge_popular_desc: "Du hast 100 Reaktionen erhalten",
    badge_influencer: "Influencer",
    badge_influencer_desc: "Du hast 1000 Reaktionen erhalten",
    badge_fire_week: "Feuerwoche",
    badge_fire_week_desc: "Du hast 7 aufeinanderfolgende Tage gepostet",
    badge_perfect_month: "Perfekter Monat",
    badge_perfect_month_desc: "Du hast 30 aufeinanderfolgende Tage gepostet",
    badge_anniversary: "Jubiläum",
    badge_anniversary_desc: "Ein Jahr auf der Plattform",
    badge_active_commenter: "Aktiver Kommentator",
    badge_active_commenter_desc: "50 Kommentare veröffentlicht",
    badge_sharer: "Teiler",
    badge_sharer_desc: "25 Geständnisse geteilt",
    badge_avid_reader: "Eifriger Leser",
    badge_avid_reader_desc: "200 Geständnisse angesehen",
    badge_collector: "Sammler",
    badge_collector_desc: "30 Lesezeichen gespeichert",
    badge_night_owl: "Nachteule",
    badge_night_owl_desc: "20 Geständnisse zwischen 22:00-6:00 Uhr veröffentlicht",
    badge_social_butterfly: "Geselliger Schmetterling",
    badge_social_butterfly_desc: "Hat 20 Follower",
    badge_viral_confession: "Virales Geständnis",
    badge_viral_confession_desc: "Hat ein Geständnis mit über 100 Likes",
    
    report_title: "Geständnis melden",
    report_description: "Hilf uns, die Community sicher zu halten. Deine Meldung ist anonym.",
    report_reason_label: "Grund der Meldung",
    report_reason_spam: "Spam oder Werbung",
    report_reason_harassment: "Belästigung oder Mobbing",
    report_reason_hate_speech: "Hassrede",
    report_reason_violence: "Gewalt oder Drohungen",
    report_reason_adult_content: "Erwachseneninhalte",
    report_reason_misinformation: "Fehlinformation",
    report_reason_personal_info: "Persönliche Informationen",
    report_reason_other: "Andere",
    report_details_label: "Zusätzliche Details (optional)",
    report_details_placeholder: "Gib weitere Details zum Problem an...",
    report_select_reason_error: "Bitte wähle einen Grund",
    report_already_reported_title: "Bereits gemeldet",
    report_already_reported_desc: "Du hast dieses Geständnis bereits gemeldet",
    report_submit_success_desc: "Danke für deine Meldung. Unser Team wird es untersuchen.",
    report_submit_error_desc: "Meldung konnte nicht gesendet werden",
    report_submitting: "Wird gesendet...",
    report_submit_button: "Meldung Absenden",
    
    comments_reply_placeholder: "Schreibe eine Antwort...",
    comments_reply_button: "Antworten",
    comments_send_button: "Senden",
    comments_reply_added_desc: "Antwort hinzugefügt",
    comments_too_long_error: "Kommentar zu lang (max. 500 Zeichen)",
    
    follow_cannot_self_desc: "Du kannst dir nicht selbst folgen",
    follow_unfollowed_title: "Nicht mehr gefolgt",
    follow_unfollowed_desc: "Du folgst diesem Benutzer nicht mehr",
    
    help_user_guide_title: "Benutzerhandbuch",
    help_user_guide_desc: "Lerne, wie du die Plattform benutzt",
    help_view_guide: "Anleitung anzeigen",
    help_faq_title: "FAQ",
    help_faq_desc: "Antworten auf häufig gestellte Fragen",
    help_view_faq: "FAQ anzeigen",
    help_contact_title: "Kontaktiere uns",
    help_contact_desc: "Sende uns eine E-Mail für Unterstützung",
    help_send_email: "E-Mail senden",
    help_dialog_title: "Wie können wir helfen?",
    help_dialog_desc: "Wähle eine der folgenden Optionen, um Hilfe zu erhalten",
    help_response_time: "Wir antworten normalerweise innerhalb von 24 Stunden",
    
    streak_reminder_text: "Du hast eine {count}-Tage-Serie! Poste heute ein Geständnis, um sie zu behalten.",
    streak_post_now: "Jetzt posten",
    streak_keep_your_streak: "Behalte deine Serie! 🔥",
    
    moderation_reject_title: "Geständnis ablehnen",
    moderation_reject_description: "Gib einen Grund für die Ablehnung dieses Geständnisses an",
    moderation_reason_placeholder: "Grund (optional)...",
    
    analytics_confessions: "Geständnisse",
    analytics_average_per: "Durchschnitt pro Geständnis",
    
    coins_per_confession: "Münzen für jedes Geständnis",
    
    confession_deleted: "Das Geständnis wurde gelöscht",
    confession_your_confession: "Dein Geständnis:",
    confession_reported_success: "Das Geständnis wurde gemeldet",
    confession_report_error: "Das Geständnis konnte nicht gemeldet werden",
    
    draft_delete_error: "Der Entwurf konnte nicht gelöscht werden",
    
    export_error: "Die Daten konnten nicht exportiert werden",
    export_my_confessions: "Meine Geständnisse",
    
    following_load_error: "Die Geständnisse konnten nicht geladen werden",
    following_start_following: "Beginne Benutzern zu folgen, um ihre Geständnisse hier zu sehen",
    following_count_confessions: "Geständnisse",
    
    image_added: "Das Bild wurde zum Geständnis hinzugefügt",
    image_upload_error: "Das Bild konnte nicht hochgeladen werden",
    
    leaderboard_confessions: "Geständnisse",
    leaderboard_reactions: "Reaktionen",
    
    moderation_approved: "genehmigt",
    moderation_rejected: "abgelehnt",
    moderation_marked: "markiert",
    moderation_action_error: "Die Aktion konnte nicht durchgeführt werden",
    moderation_no_pending: "Keine ausstehenden Geständnisse",
    moderation_no_reported: "Keine gemeldeten Geständnisse",
    
    reaction_update_error: "Die Reaktion konnte nicht aktualisiert werden",
    
    streak_last_confession: "Letztes Geständnis:",
    
    subscription_payment_error: "Der Zahlungsprozess konnte nicht gestartet werden",
    subscription_portal_error: "Das Abonnementportal konnte nicht geöffnet werden",
    
    preferences_save_error: "Die Einstellungen konnten nicht gespeichert werden",
    
    comment_reply_error: "Die Antwort konnte nicht gesendet werden",
    
    draft_deleted: "Entwurf gelöscht",
    draft_deleted_desc: "Der Entwurf wurde erfolgreich gelöscht",
    draft_delete_error_desc: "Der Entwurf konnte nicht gelöscht werden",
    drafts_saved: "Gespeicherte Entwürfe",
    
    export_title: "Deine Daten Exportieren",
    export_description: "Lade eine Kopie deiner Daten im JSON- oder CSV-Format herunter",
    export_format: "Format",
    export_what: "Was möchtest du exportieren?",
    export_my_comments: "Meine Kommentare",
    export_my_likes: "Meine Likes",
    export_my_bookmarks: "Meine Lesezeichen",
    export_download: "Daten Herunterladen",
    export_downloading: "Exportiere...",
    export_success: "Export Erfolgreich",
    export_success_desc: "Deine Daten wurden erfolgreich exportiert",
    
    coins_title: "Münzen",
    coins_current_balance: "Aktueller Saldo",
    coins_total_earned: "Insgesamt Verdient",
    coins_history: "Verlauf Anzeigen",
    coins_how_to_earn: "Wie man Münzen verdient:",
    coins_per_confession_detail: "📝 +2 Münzen pro Geständnis",
    coins_per_confession_new: "+2 Münzen pro Geständnis",
    coins_no_transactions: "Noch keine Transaktionen",
    coins_all_transactions: "Alle deine Münztransaktionen",
    coins_confession_created: "Neues Geständnis",
    coins_how_to_spend: "💎 Münzen Ausgeben",
    coins_polish_detail: "✨ Geständnis Verbessern (10 Münzen) - KI verbessert deinen Text",
    coins_boost_detail: "🚀 Geständnis Boosten (15 Münzen) - 1 Stunde hervorheben",
    coins_flairs_detail: "🎨 Profil-Abzeichen (30 Münzen) - 5 Tage aktiv",
    badge_expires_in: "Läuft ab in",
    badge_expired: "Abgelaufen",
    badge_active_for: "5 Tage aktiv",
    buy_again: "Erneut kaufen",
    days: "Tage",
    hours: "Stunden",
    referral_reward_referrer: "+20 Münzen wenn Geworbener erstes Geständnis postet",
    referral_reward_referred: "+10 für geworbenen Nutzer nach erstem Geständnis",
    first_confession_bonus: "Bonus für erstes Geständnis",
    
    boost_confession: "Geständnis Boosten",
    boost_success_title: "Geständnis Geboostet!",
    boost_success_description: "Dein Geständnis wird 1 Stunde hervorgehoben",
    boost_error: "Fehler beim Boosten des Geständnisses",
    boost_confirmation_description: "Booste dieses Geständnis, um es 1 Stunde lang sichtbarer zu machen.",
    boost_cost: "Kosten: 15 Münzen",
    boost_now: "Jetzt Boosten",
    
    customize_profile: "Profil Anpassen",
    themes: "Themen",
    badges: "Abzeichen",
    theme_default: "Standard",
    theme_ocean: "Ozean",
    theme_sunset: "Sonnenuntergang",
    theme_forest: "Wald",
    theme_galaxy: "Galaxie",
    theme_royal: "Königlich",
    badge_star: "Stern",
    badge_fire: "Feuer",
    badge_heart: "Herz",
    badge_rocket: "Rakete",
    badge_gem: "Edelstein",
    badge_crown: "Krone",
    owned: "Besessen",
    purchase_for: "Kaufen für",
    purchase_theme_success: "Thema erfolgreich gekauft!",
    purchase_badge_success: "Abzeichen erfolgreich gekauft!",
    equip_theme_success: "Thema ausgerüstet!",
    equip_badge_success: "Abzeichen ausgerüstet!",
    customization_error: "Fehler beim Anwenden der Anpassung",
    insufficient_coins: "Nicht genug Münzen",
    
    highlight_comment: "Kommentar Hervorheben",
    highlight_comment_description: "Hebe deinen Kommentar mit einer goldenen Hervorhebung für 24 Stunden hervor.",
    highlight_comment_success_title: "Kommentar Hervorgehoben!",
    highlight_comment_success_description: "Dein Kommentar wird 24 Stunden hervorgehoben",
    highlight_comment_error: "Fehler beim Hervorheben des Kommentars",
    highlight_comment_features: "Hervorhebungs-Funktionen:",
    highlight_comment_feature_1: "Goldener Rahmen und Hintergrund",
    highlight_comment_feature_2: "Bleibt oben in den Kommentaren",
    highlight_comment_feature_3: "24 Stunden aktiv",
    highlight_comment_cost: "Kosten: {cost} Münzen",
    highlight_now: "Jetzt Hervorheben",
    ai_makeover: "KI-Verbesserung",
    ai_makeover_description: "Lass KI dein Geständnis mit besserer Schreibweise, Klarheit und emotionaler Wirkung verbessern.",
    ai_makeover_features: "KI-Verbesserungs-Funktionen:",
    ai_makeover_feature_1: "Verbessert Schreibqualität und Grammatik",
    ai_makeover_feature_2: "Erhöht emotionale Wirkung",
    ai_makeover_feature_3: "Bewahrt deine ursprüngliche Botschaft",
    ai_makeover_feature_4: "Du kannst vor dem Anwenden bearbeiten",
    ai_makeover_cost: "Kosten: {cost} Münzen",
    ai_makeover_error: "Fehler beim Generieren der Verbesserung",
    ai_makeover_applied_title: "Verbesserung Angewendet!",
    ai_makeover_applied_description: "Dein Geständnis wurde aktualisiert",
    original_content: "Original-Inhalt",
    improved_content: "Verbesserter Inhalt",
    edit_improved_content: "Bearbeite den verbesserten Inhalt vor dem Anwenden...",
    generate_makeover: "Verbesserung Generieren",
    apply_changes: "Änderungen Anwenden",
    applying: "Anwenden...",
    custom_background: "Benutzerdefinierter Hintergrund",
    custom_background_description: "Wähle einen schönen Verlaufshintergrund für dein Geständnis.",
    background_applied_title: "Hintergrund Angewendet!",
    background_applied_description: "Dein Geständnis hat jetzt einen benutzerdefinierten Hintergrund",
    background_error: "Fehler beim Anwenden des Hintergrunds",
    your_balance: "Dein Guthaben",
    coins: "Münzen",
    free: "Kostenlos",
    current: "Aktuell",
    already_applied: "Bereits Angewendet",
    cost: "Kosten",
    apply_background: "Hintergrund Anwenden",
    
    polish_confession: "Geständnis Verbessern",
    polishing: "Verbessern...",
    polish_success_title: "Geständnis Verbessert!",
    polish_success_description: "Dein Geständnis wurde von KI verbessert",
    polish_error: "Fehler beim Verbessern des Geständnisses",
    polish_empty_error: "Bitte schreibe zuerst dein Geständnis",
    
    flairs_shop: "Abzeichen-Shop",
    flair_shop_description: "Personalisiere dein Profil mit einzigartigen Abzeichen und Emblemen",
    flair_purchased_title: "Abzeichen Gekauft!",
    flair_purchased_description: "Dein neues Abzeichen ist jetzt ausgerüstet",
    flair_purchase_error: "Fehler beim Kauf des Abzeichens",
    flair_equipped: "Abzeichen erfolgreich ausgerüstet",
    equipped: "Ausgerüstet",
    equip: "Ausrüsten",
    shop_free_tier: "Kostenlose Abzeichen",
    shop_vip_tier: "VIP-Abzeichen",
    shop_empty: "Keine Abzeichen für deinen Plan verfügbar",
    shop_buy: "Kaufen",
    shop_open: "Abzeichen-Shop öffnen",
    rarity_common: "Gewöhnlich",
    rarity_uncommon: "Ungewöhnlich",
    rarity_rare: "Selten",
    rarity_epic: "Episch",
    rarity_legendary: "Legendär",
    
    flair_star: "Stern",
    flair_fire: "Feuer",
    flair_heart: "Herz",
    flair_crown: "Krone",
    flair_sparkles: "Funkeln",
    flair_diamond: "Diamant",
    flair_trophy: "Trophäe",
    flair_rocket: "Rakete",
    flair_rainbow: "Regenbogen",
    flair_unicorn: "Einhorn",
    flair_moon: "Mond",
    
    loading: "Laden...",
    success: "Erfolg",
    cancel: "Abbrechen",
    processing: "Verarbeitung...",
    
    nickname_label: "Spitzname",
    nickname_placeholder: "Gib deinen Spitznamen ein",
    nickname_update: "Spitzname Aktualisieren",
    nickname_updated: "Spitzname erfolgreich aktualisiert",
    nickname_error: "Fehler beim Aktualisieren des Spitznamens",
    nickname_taken: "Dieser Spitzname ist bereits vergeben",
    nickname_invalid: "Spitzname muss 3-24 Zeichen haben (Buchstaben, Zahlen, _)",
    nickname_cooldown: "Du kannst deinen Spitznamen nur alle 21 Tage ändern",
    
    common_anonymous: "Anonym",
    
    validation_nickname_too_short: "Spitzname muss mindestens 3 Zeichen haben",
    validation_nickname_too_long: "Spitzname darf 24 Zeichen nicht überschreiten",
    validation_nickname_invalid_chars: "Spitzname darf nur Buchstaben, Zahlen und Unterstriche enthalten",
    validation_nickname_invalid_underscores: "Spitzname darf nicht mit einem Unterstrich beginnen oder enden",
    validation_nickname_double_underscores: "Spitzname darf keine doppelten Unterstriche enthalten",
    validation_nickname_reserved: "Dieser Spitzname ist reserviert und kann nicht verwendet werden",
    validation_nickname_not_available: "Dieser Spitzname ist nicht verfügbar",
    
    nickname_days_remaining: "Tage verbleibend, bis du deinen Spitznamen ändern kannst",
    nickname_current: "Aktueller Spitzname",
    nickname_visibility: "Spitzname Sichtbarkeit",
    nickname_public_desc: "Andere können deinen Spitznamen sehen",
    nickname_private_desc: "Nur du kannst deinen Spitznamen sehen",
    settings_updated: "Einstellungen erfolgreich aktualisiert",
    search_users: "Benutzer Suchen",
    search_users_placeholder: "Nach Spitznamen suchen...",
    no_users_found: "Keine Benutzer gefunden",
    
    messages_title: "Nachrichten",
    messages_new: "Neue Nachricht",
    messages_send: "Senden",
    messages_type_message: "Nachricht eingeben...",
    messages_no_conversations: "Noch keine Konversationen",
    messages_start_conversation: "Konversation beginnen",
    messages_conversation_with: "Konversation mit",
    messages_delete_confirm: "Diese Nachricht löschen?",
    messages_deleted: "Nachricht gelöscht",
    messages_delete_conversation: "Konversation löschen",
    messages_delete_conversation_confirm: "Möchtest du diese Konversation wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
    messages_delete_conversation_title: "Konversation löschen",
    messages_retry: "Erneut versuchen",
    messages_input_placeholder: "Nachricht eingeben...",
    messages_empty: "Noch keine Nachrichten",
    messages_seen: "Gesehen",
    messages_delivered: "Zugestellt",
    messages_sent: "Gesendet",
    messages_typing: "tippt...",
    messages_reaction_add: "Reaktion hinzufügen",
    messages_reaction_remove: "Reaktion entfernen",
    
    // Bottom Navigation
    nav_home: "Start",
    nav_explore: "Entdecken",
    nav_messages: "Nachrichten",
    nav_profile: "Profil",
    
    profile_posts: "Beiträge",
    profile_followers: "Follower",
    profile_following: "Folge ich",
    profile_follows_you: "Folgt dir",
    profile_follow: "Folgen",
    profile_unfollow: "Nicht mehr folgen",
    
    // Explore - Search Users
    explore_search_card_title: "Benutzer finden",
    explore_search_card_placeholder: "Nach Spitznamen suchen...",
    explore_search_card_follow: "Folgen",
    explore_search_card_unfollow: "Nicht mehr folgen",
    explore_search_card_message: "Nachricht",
    explore_search_card_no_results: "Keine Benutzer gefunden",
    
    // Home - Communities
    home_communities_title: "Gemeinschaften",
    home_communities_join: "Beitreten",
    home_communities_leave: "Verlassen",
    
    following_feed_loading: "Lade Feed...",
    following_feed_start: "Beginne Benutzern zu folgen, um ihre Geständnisse hier zu sehen",
    
    image_invalid_file: "Ungültige Datei",
    image_invalid_file_desc: "Bitte wähle ein Bild (JPEG, PNG, GIF oder WebP)",
    image_too_large: "Datei Zu Groß",
    image_uploading: "Wird hochgeladen...",
    image_add_optional: "Bild hinzufügen (optional)",
    
    moderation_no_permissions: "Du hast keine Moderationsrechte",
    moderation_loading: "Laden...",
    moderation_keep: "Behalten",
    moderation_delete: "Löschen",
    moderation_cancel: "Abbrechen",
    
    preferences_saving: "Speichern...",
    preferences_save: "Einstellungen Speichern",
    
    subscription_active_plan: "Aktiver Plan",
    subscription_choose: "Wählen",
    subscription_title: "Dein Abonnement",
    subscription_description: "Schalte alle Funktionen frei und erhalte ein überlegenes Erlebnis",
    subscription_plan_free: "Free",
    subscription_plan_vip: "VIP",
    subscription_manage: "Abo verwalten",
    subscription_feature_unlimited_ai: "Unbegrenzte KI-Antworten",
    subscription_feature_advanced_analytics: "Erweiterte Analysen",
    subscription_feature_exclusive_badges: "Exklusive Abzeichen",
    subscription_feature_no_ads: "Werbefrei",
    subscription_feature_priority_moderation: "Priorität bei Moderation",
    subscription_feature_image_confessions: "Geständnisse mit Bildern",
    subscription_feature_detailed_stats: "Detaillierte Statistiken",
    subscription_feature_priority_support: "Prioritäts-Support",
  subscription_feature_vip_badge: "Spezielle VIP-Badge",
  
  // Trial & Subscription Management
  trial_cta_title: "VIP gratis testen!",
  trial_cta_desc: "Genieße alle VIP-Funktionen für 3 Tage.",
  trial_cta_button: "3 Tage gratis testen",
  trial_cta_disclaimer: "Nach 3 Tagen wird der VIP-Preis berechnet, sofern du nicht kündigst.",
  trial_active: "Deine VIP-Testphase läuft bis {date}",
  subs_manage: "Abo verwalten",
  subs_cancel: "Abo kündigen",
  subs_upgrade: "Upgrade",
  subs_downgrade: "Downgrade",
  coins_bonus_vip: "Du hast +250 Coins für die Aktivierung von VIP erhalten.",
  shop_badge_price_free: "Badges kosten 25 Coins (Free)",
  shop_badge_price_vip: "Badges kosten 100 Coins (VIP)",
  
  // Manage Subscription Dialog
  subs_manage_title: "Abo verwalten",
  subs_manage_currentPlan: "Aktueller Plan",
  subs_manage_renews: "Verlängert sich am {date}",
  subs_manage_trialEnds: "Testphase endet am {date}",
  subs_action_upgrade: "Upgrade",
  subs_action_downgrade: "Downgrade",
  subs_action_cancel: "Abo kündigen",
  subs_action_cancelNow: "Jetzt kündigen",
  subs_action_cancelAtPeriodEnd: "Zum Laufzeitende kündigen",
  subs_action_cancelTrial: "Testphase kündigen",
  subs_action_reactivate: "Reaktivieren",
  subs_confirm_title: "Aktion bestätigen",
  subs_confirm_upgrade: "Jetzt auf {tier} upgraden?",
  subs_confirm_downgrade: "Jetzt auf {tier} downgraden?",
  subs_confirm_cancel_periodEnd: "Vorteile bis {date} behalten, dann kündigen. Fortfahren?",
  subs_confirm_cancel_now: "Sofort kündigen und Vorteile verlieren. Fortfahren?",
  subs_confirm_reactivate: "Dein Abonnement reaktivieren und weiterhin VIP-Vorteile genießen?",
  subs_confirm_cancel: "Sind Sie sicher, dass Sie Ihr Abonnement kündigen möchten?",
  subs_confirm_change_to_vip: "Upgrade auf VIP für unbegrenzte Geständnisse und exklusive Funktionen!",
  subs_cancel_immediate: "Jetzt kündigen",
  subs_cancel_at_period_end: "Am Periodenende kündigen",
  subs_toast_success: "Erledigt!",
  subs_toast_change_success: "Plan erfolgreich geändert!",
  subs_toast_cancel_success: "Abonnement wird am Periodenende gekündigt",
  subs_toast_cancel_now_success: "Abonnement sofort gekündigt",
  subs_toast_reactivate_success: "Abonnement erfolgreich reaktiviert!",
  subs_note_inline: "Du kannst deinen Plan hier jederzeit ändern, kündigen oder reaktivieren.",
  common_cancel: "Abbrechen",
  subs_status_cancels: "Kündigt am",
  subs_full_management: "Vollständige Abo-Verwaltung",
  subs_portal_description: "Zugriff auf Stripe-Portal, um Pläne zu ändern, Zahlungsmethode zu aktualisieren, Rechnungen anzuzeigen oder Abonnement zu kündigen.",
  subs_open_portal: "Stripe-Portal Öffnen",
  subs_quick_actions: "Schnellaktionen",
  subs_portal_opening: "Öffne Stripe-Portal, wo du dein Abonnement verwalten kannst...",
  subs_portal_failed: "Kundenportal konnte nicht geöffnet werden",
  subs_action_buy: "Abonnement Kaufen",
  subs_action_change: "Plan Ändern",
  subs_confirm_buy: "Neues {tier}-Abonnement starten?",
  subs_toast_buy_success: "Abonnementkauf gestartet",
  subs_buy_select_plan: "Plan Auswählen",
  subs_buy_trial_available: "3-Tägige Testversion Verfügbar",
  subs_error_already_subscribed: "Du hast bereits ein aktives Abonnement",
  subs_error_no_trial: "Testphase bereits genutzt oder Abonnement aktiv",
  
  payment_view_profile: "Dein VIP-Profil Anzeigen",
    payment_redirecting: "Du wirst in wenigen Sekunden automatisch weitergeleitet...",
    
    profile_portal_error: "Fehler",
    profile_portal_error_desc: "Das Abonnementportal konnte nicht geöffnet werden",
    
    reaction_heart: "Herz",
    reaction_sad: "Traurig",
    reaction_strong: "Stark",
    reaction_thinking: "Interessant",
    reaction_auth_required: "Authentifizierung erforderlich",
    reaction_auth_required_desc: "Du musst authentifiziert sein, um zu reagieren",
    
    analytics_activity_7days: "Aktivität letzte 7 Tage",
    subscription_billed_yearly: "Jährlich abgerechnet",
    subscription_plan_unavailable: "Abonnementplan nicht verfügbar",
    subscription_yearly_discount: "-33%",
    
    profile_achievements: "Erfolge",
    profile_moods: "Stimmungen",
    profile_settings: "Einstellungen",
    profile_moderation: "Moderation",
    profile_plan_free: "Kostenlos",
    profile_plan_vip: "VIP",
    
    referral_benefits: "Vorteile:",
    referral_benefit_coins: "• 100 Münzen für jede abgeschlossene Empfehlung",
    referral_benefit_friend: "• Dein Freund erhält 50 Bonus-Münzen",
    referral_benefit_badge: "• Spezielle Auszeichnung nach 10 Empfehlungen",
    
    preferences_customization: "Anpassung",
    preferences_accent_color: "Akzentfarbe",
    preferences_text_size: "Textgröße",
    preferences_size_small: "Klein",
    preferences_size_medium: "Mittel",
    preferences_size_large: "Groß",
    
    subscription_thanks: "Vielen Dank für Ihre Unterstützung!",
    subscription_upgrade_more: "Upgrade für mehr Funktionen",
    subscription_upgrade_vip: "Auf VIP upgraden",
    subscription_current_plan: "Aktueller Plan",
    subscription_your_plan: "Dein Plan",
    subscription_downgrade_to_free: "Zu Kostenlos wechseln",
    subscription_change_to_plan: "Zu {plan} wechseln",
    subscription_free: "Kostenlos",
    subscription_trial_available: "3-Tägige Testversion Verfügbar",
    
    // Subscription Benefits - Free
    subscription_benefits_free_confessions: "Begrenzte Geständnisse pro Tag",
    subscription_benefits_free_basic_features: "Grundfunktionen",
    subscription_benefits_free_community_access: "Community-Zugang",
    subscription_limitations_free_ads: "Mit Werbung",
    subscription_limitations_free_limited_ai: "Begrenzte KI-Antworten",
    subscription_limitations_free_basic_analytics: "Nur Basis-Analysen",
    
    subscription_benefits_vip_unlimited_confessions: "Unbegrenzte Geständnisse",
    subscription_benefits_vip_unlimited_ai: "Unbegrenzte KI-Antworten",
    subscription_benefits_vip_detailed_statistics: "Detaillierte Statistiken",
    subscription_benefits_vip_priority_support: "Prioritätssupport",
    subscription_benefits_vip_special_badge: "Spezielle VIP-Auszeichnung",
    subscription_benefits_vip_early_access: "Früher Zugang zu Funktionen",
    subscription_benefits_vip_custom_themes: "Individuelle Designs",
    subscription_benefits_vip_no_ads: "Keine Werbung",
    subscription_benefits_vip_private_confessions: "Private Geständnisse",
    subscription_benefits_vip_advanced_stats: "Erweiterte Statistiken",
    subscription_benefits_vip_priority_ai: "Prioritäts-KI",
    subscription_benefits_vip_coins_bonus: "Münzbonus",
    subscription_benefits_vip_login_rewards: "Login-Belohnungen",
    
    // Subscription Management
    subscription_current_status: "Aktueller Status",
    subscription_interval_monthly: "Monatlich",
    subscription_interval_yearly: "Jährlich",
    subscription_per_month_short: "/Monat",
    subscription_per_year_short: "/Jahr",
    subscription_savings_badge: "{percent}% sparen",
    subscription_compare_plans: "Pläne Vergleichen",
    subscription_benefits_title: "Vorteile",
    subscription_actions_change: "Plan Ändern",
    subscription_actions_cancel: "Abo Kündigen",
    subscription_actions_reactivate: "Abo Reaktivieren",
    subscription_confirm_change_title: "Plan Ändern",
    subscription_confirm_change_body: "Du wechselst zu {plan} {interval}. Dein neuer Preis beträgt ${price}{suffix}. {prorationNote}",
    subscription_confirm_cancel_title: "Abo Kündigen",
    subscription_confirm_cancel_body_now: "Dein Abo endet sofort.",
    subscription_confirm_cancel_body_period_end: "Dein Abo bleibt bis {date} aktiv.",
    subscription_confirm_reactivate_title: "Abo Reaktivieren",
    subscription_status_active: "Aktiv",
    subscription_status_canceled: "Gekündigt",
    subscription_status_trialing: "Testversion",
    subscription_status_past_due: "Überfällig",
    subscription_errors_generic: "Ein Fehler ist aufgetreten.",
    subscription_errors_not_eligible: "Du bist nicht berechtigt.",
    subscription_errors_requires_action: "Zusätzliche Aktion erforderlich.",
    subscription_trial_countdown: "{days} Tage verbleibend",
    subscription_trial_used: "Testversion bereits genutzt",
    subscription_next_billing_date: "Nächste Abrechnung: {date}",
    subscription_cancel_ends_at: "Endet: {date}",
    subscription_change_interval: "Abrechnung Ändern",
    subscription_change_success: "Plan erfolgreich geändert!",
    subscription_cancel_success: "Abo erfolgreich gekündigt",
    subscription_reactivate_success: "Abo erfolgreich reaktiviert!",
    subscription_not_available: "Nicht verfügbar",
    subscription_proration_info: "Dir wird heute ein anteiliger Betrag berechnet.",
    subscription_downgrade_period_end: "Dein Plan wird am Ende geändert.",
    
    badges_your_badges: "Deine Auszeichnungen",
    
    export_my_data: "Meine Daten exportieren",
    
    moderation_reject_desc: "Gib einen Grund für die Ablehnung dieses Geständnisses an",
    notification_followed: "hat begonnen, dir zu folgen",
    notification_badge_earned: "du hast eine neue Auszeichnung verdient!",
    notification_streak_milestone: "du hast einen neuen Meilenstein erreicht!",
    recommended_read: "Lesen",
    referral_coins_earned: "Verdiente Münzen",
    referral_your_code: "Dein Empfehlungscode",
    anonymous_user: "Benutzer",
    leaderboard_top_this_week: "Top Diese Woche",
    recommended_for_you: "Empfohlen für Dich",
    badges_earned_on: "Erworben am",
    
    analytics_category_distribution: "Kategorienverteilung",
    error_something_wrong: "Hoppla! Etwas ist schiefgelaufen",
    error_unexpected: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.",
    error_try_again_desc: "Erneut versuchen",
    error_reload_page: "Seite Neu Laden",
    error_retry: "Erneut Versuchen",
    ui_previous: "Zurück",
    ui_next: "Weiter",
    ui_toggle_sidebar: "Seitenleiste umschalten",
    ui_image_preview: "Bildvorschau",
    ui_confession_image: "Geständnisbild",
    ui_following_feed: "Verfolgte Feed",
    ui_close: "Schließen",
    ui_previous_slide: "Vorherige Folie",
    ui_next_slide: "Nächste Folie",
    follow_connections: "Verbindungen",
    follow_following: "Folge ich",
    follow_followers: "Follower",
    mood_distribution: "Deine Stimmungsverteilung",
    mood_intensity_evolution: "Intensitätsentwicklung",
    rate_limit_title: "Zu Viele Anfragen",
    rate_limit_desc: "Du hast das KI-Anfragelimit erreicht. Bitte warte einige Momente, bevor du es erneut versuchst.",
    rate_limit_remaining: "Verbleibende Anfragen",
    rate_limit_reset_in: "Zurücksetzen in {time}",
    rate_limit_wait_message: "Sie haben das Limit erreicht. Bitte versuchen Sie es später erneut.",
    moderation_action_done: "Aktion Abgeschlossen",
    moderation_action_approved: "genehmigt",
    moderation_action_rejected: "abgelehnt",
    moderation_action_marked: "markiert",
    moderation_error_action: "Aktion konnte nicht ausgeführt werden",
    moderation_panel_title: "Moderationspanel",
    moderation_role_admin: "Administrator",
    moderation_role_moderator: "Moderator",
    moderation_reports_title: "Gründe:",
    referral_program_title: "Empfehlungsprogramm",
    referral_completed: "Abgeschlossen",
    deep_insight_your_confession: "Dein Geständnis:",
    moderation_pending_count: "Ausstehend",
    moderation_approve: "Genehmigen",
    moderation_reported_count: "Gemeldet",
    moderation_reason_optional: "Grund (optional)...",
    referral_link_copied_toast: "Link kopiert!",
    referral_link_copied_desc: "Der Empfehlungslink wurde in die Zwischenablage kopiert",
    referral_pending: "Ausstehend",
    streak_your: "Deine Serie",
    streak_consecutive_days: "Aufeinanderfolgende Tage",
    streak_personal_best: "Persönliche Bestleistung",
    subscription_payment_error_desc: "Der Zahlungsvorgang konnte nicht gestartet werden",
    preferences_color_green: "Grün",
    preferences_color_red: "Rot",
    preferences_color_orange: "Orange",
    preferences_color_violet: "Violett",
    preferences_color_blue: "Blau",
    preferences_color_pink: "Rosa",
    following_your_feed: "Dein Feed",
    index_back_to_feed: "Zurück zum Feed",
    moderation_category_label: "Kategorie",
    
    // Instagram-style Social
    explore: "Entdecken",
    compose: "Verfassen",
    type_message_placeholder: "Nachricht eingeben...",
    send_message_button: "Senden",
    message_sent_toast: "Nachricht gesendet",
    message_failed_toast: "Nachricht konnte nicht gesendet werden",
    retry_send: "Wiederholen",
    delete_message_action: "Nachricht löschen",
    delete_message_confirm_text: "Bist du sicher, dass du diese Nachricht löschen möchtest?",
    read_receipt_status: "Gelesen",
    unread_count_badge: "neu",
    message_thread_title: "Nachrichten",
    
    // Profile Header
    posts_count: "Beiträge",
    followers_count: "Follower",
    following_count: "Folge ich",
    message_user_button: "Nachricht",
    edit_profile: "Profil Bearbeiten",
    profile_bio: "Biografie",
    profile_bio_placeholder: "Erzähle uns von dir...",
    profile_handle: "Benutzername",
    profile_avatar: "Avatar",
    profile_privacy_public: "Öffentlich",
    profile_privacy_limited: "Eingeschränkt",
    profile_privacy_private: "Privat",
    profile_privacy_mode: "Datenschutzmodus",
    user_is_typing: "{user} schreibt...",
    users_are_typing: "{users} schreiben...",
    
    // Quote of the Day
    qotd_title: "Zitat des Tages",
    qotd_loading: "Zitat wird geladen...",
    
    // Admin Panel
    admin_title: "Admin-Dashboard",
    admin_moderation_queue: "Moderationswarteschlange",
    admin_reports: "Berichte",
    admin_no_items: "Keine Elemente zu überprüfen",
    admin_approve: "Genehmigen",
    admin_reject: "Ablehnen",
    admin_view_confession: "Geständnis ansehen",
    
    // GDPR & Privacy
    export_data_description_text: "Lade eine Kopie all deiner Daten herunter",
    export_data_success_toast: "Daten erfolgreich exportiert",
    export_data_failed_toast: "Datenexport fehlgeschlagen",
    delete_my_account_button: "Mein Konto Löschen",
    delete_account_warning_full: "Diese Aktion kann nicht rückgängig gemacht werden. Alle deine Daten werden dauerhaft gelöscht.",
    delete_account_confirm_dialog: "Bist du sicher, dass du dein Konto löschen möchtest?",
    account_deleted_toast: "Konto erfolgreich gelöscht",
    consent_management_title: "Einwilligungsverwaltung",
    view_consents_button: "Meine Einwilligungen Anzeigen",
    
    // Crisis Support
    crisis_support_title: "Krisenunterstützung",
    crisis_message_text: "Wenn du Gedanken an Selbstverletzung oder Suizid hast, bitte suche sofort Hilfe:",
    crisis_hotline_label: "Krisenhotline",
    crisis_chat_label: "Online-Krisen-Chat",
    emergency_services_label: "Notdienste",
    you_are_not_alone_message: "Du bist nicht allein. Hilfe ist verfügbar.",
    
    // Safety & Moderation
    content_review_notice_title: "Hinweis zur Inhaltsüberprüfung",
    content_blocked_title: "Inhalt Blockiert",
    moderation_reason_label: "Grund:",
    
    // Communities
    communities_title: "Communities",
    communities_discover: "Entdecke Communities, die deine Interessen teilen",
    communities_create: "Community erstellen",
    communities_category: "Kategorie",
    communities_name: "Community-Name",
    communities_description: "Beschreibung",
    communities_slug_label: "Kennung (URL)",
    communities_slug_placeholder: "community-kennung",
    communities_icon: "Symbol (Emoji)",
    communities_private: "Private Community",
    communities_creating: "Wird erstellt...",
    communities_create_success: "Community erfolgreich erstellt",
    communities_create_error: "Fehler beim Erstellen der Community",
    communities_join: "Beitreten",
    communities_leave: "Verlassen",
    communities_members: "Mitglieder",
    communities_posts: "Beiträge",
    communities_not_found: "Community nicht gefunden",
    communities_back: "Zurück zu Communities",
    communities_no_posts: "Noch keine Geständnisse. Sei der Erste, der etwas teilt!",
    communities_first_post: "Sei der Erste, der etwas teilt!",
    communities_recent: "Aktuelle Geständnisse",
    communities_create_confession: "Geständnis erstellen",
    communities_filter_all: "Alle",
    communities_filter_mental_health: "Psychische Gesundheit",
    communities_filter_relationships: "Beziehungen",
    communities_filter_work: "Arbeit & Karriere",
    communities_filter_general: "Allgemein",
    
    // Location
    location_add: "Standort hinzufügen (optional)",
    location_detecting: "Standort wird erkannt...",
    location_detected: "Standort erkannt",
    location_error: "Standortfehler",
    location_error_permission: "Standort konnte nicht ermittelt werden. Bitte aktiviere die Standortberechtigungen.",
    location_city: "Standort",
    location_optional: "Standort (optional)",
    location_community_optional: "Community (optional)",
    location_select_community: "Wähle eine Community",
    location_no_community: "Keine Community",
    
    // Nearby Confessions
    nearby_title: "Geständnisse in der Nähe",
    nearby_discover: "Entdecke Geständnisse von Menschen in deiner Nähe",
    nearby_radius: "Radius",
    nearby_within_km: "Innerhalb von {km} km",
    nearby_list_view: "Liste",
    nearby_map_view: "Karte",
    nearby_map_coming_soon: "Kartenansicht demnächst",
    nearby_no_location: "Standort konnte nicht ermittelt werden",
    nearby_enable_location: "Bitte aktiviere die Standortberechtigungen, um Geständnisse in der Nähe zu sehen",
    nearby_none_found: "Keine Geständnisse in der Nähe gefunden",
    nearby_increase_radius: "Versuche, den Suchradius zu erhöhen oder schaue später noch einmal vorbei",
    nearby_distance_km: "{distance} km",
    
    // Quick Actions
    quick_action_new: "Neu",
    quick_action_explore: "Entdecken",
    quick_action_messages: "Nachrichten",
    quick_action_search: "Suchen",
    quick_action_communities: "Communities",
    quick_action_nearby: "In der Nähe",
    
    // Profile Tiers
    profile_tiers_free: "Kostenloses Mitglied",
    profile_tiers_vip: "VIP-Mitglied",
    profile_tiers_expires: "Läuft ab am {date}",
    profile_tiers_benefits: "Vorteile ansehen",
    
    // Perks System
    perks_title: "Meine Vorteile",
    perks_subscription_title: "Abonnement",
    perks_badges_title: "Abzeichen & Flairs",
    perks_badges_status_active: "Aktiv",
    perks_badges_status_expired: "Abgelaufen",
    perks_badges_status_hidden: "Versteckt",
    perks_badges_make_public: "Öffentlich machen",
    perks_badges_make_private: "Privat machen",
    perks_badges_set_featured: "Als Empfohlen festlegen",
    perks_badges_remove_featured: "Von Empfohlen entfernen",
    perks_badges_earned_on: "Erworben am {date}",
    perks_no_badges: "Noch keine Abzeichen. Beginne damit, etwas zu posten!",
    
    // Shop
    shop_title: "Flairs-Shop",
    shop_required_plan_free: "Verfügbar für alle",
    shop_required_plan_vip: "Erfordert VIP",
    shop_lock_vip: "Upgrade auf VIP zum Freischalten",
    shop_purchase: "Kaufen",
    shop_purchased: "Gekauft",
    shop_expires_in: "Läuft ab in {days} Tagen",
    shop_expired: "Abgelaufen",
    shop_active_for: "Aktiv für 5 Tage",
    shop_buy_again: "Erneut kaufen",
    shop_coins_balance: "Münzen: {balance}",
    
    // Flair Names (Additional)
    flair_sparkle: "Funkeln",
    flair_gem: "Edelstein",
    flair_lightning: "Blitz",
    flair_magic: "Magie",
    
    // Errors
    errors_plan_too_low: "Dieses Element erfordert {plan}",
    
    // Test-required keys
    common_confirm: "Bestätigen",
    common_loading: "Laden...",
    auth_signin: "Anmelden",
    auth_signout: "Abmelden",
    auth_signup: "Registrieren",
    auth_login: "Anmelden",
    subscription_cancel: "Abonnement kündigen",
    subscription_active: "Aktiv",
    subscription_expired: "Abgelaufen",
    subscription_trial: "Testversion",
    nav_confessions: "Geständnisse",
    confession_submit: "Geständnis einreichen",
    confession_content: "Geständnis Inhalt",
    error_network: "Netzwerkfehler",
    error_validation: "Validierungsfehler",
    
    // Daily Rewards
    reward_daily_title: "Tägliche Login-Belohnung",
    reward_daily_desc: "Hol dir deine kostenlosen Münzen!",
    reward_claim: "Einlösen",
    reward_claimed: "Belohnung Erhalten!",
    reward_claimed_desc: "Du hast 10 Münzen für deine heutige Anmeldung erhalten",
    
    // Premium Teasers
    teaser_feature: "VIP-Funktionen Freischalten",
    teaser_description: "Erhalte unbegrenzte Einblicke, vorrangigen Support und exklusive Vorteile",
    teaser_unlock: "VIP Freischalten",
    teaser_explore_feature: "Entdecke Mehr Inhalte",
    teaser_explore_description: "VIP-Nutzer haben Zugriff auf exklusive Trendinhalte und erweiterte Suche",
    
    // Feature Comparison
    comparison_title: "Pläne Vergleichen",
    comparison_feature: "Funktion",
    comparison_daily_confessions: "Tägliche Geständnisse",
    comparison_ai_responses: "KI-Antworten",
    comparison_deep_insights: "Tiefenanalyse",
    comparison_analytics: "Erweiterte Analysen",
    comparison_boost: "Geständnisse Boosten",
    comparison_priority_support: "Prioritärer Support",
    comparison_custom_badge: "Benutzerdefiniertes Abzeichen",
    comparison_unlimited: "Unbegrenzt",
    comparison_upgrade_now: "Jetzt Upgraden",
    
    // Trending Hashtags
    hashtags_trending: "Trending Hashtags",
    
    // Install Prompt
    install_app: "App Installieren",
    install_app_description: "Füge ConfessAI zu deinem Startbildschirm hinzu für ein besseres Erlebnis",
    install: "Installieren",
    not_now: "Nicht Jetzt",
    
    // Onboarding
    onboarding_anonymous_desc: "Deine Identität ist geschützt. Teile frei ohne Angst.",
    onboarding_social_title: "Soziale Funktionen",
    onboarding_social_desc: "Folge Benutzern, like Geständnisse und baue deine Community auf.",
    onboarding_messages_title: "Direktnachrichten",
    onboarding_messages_desc: "Verbinde dich privat mit anderen in der Community.",
    onboarding_ai_title: "KI-Einblicke",
    onboarding_ai_desc: "Erhalte durchdachte KI-Antworten auf deine Geständnisse.",
    onboarding_welcome_title: "Willkommen in Deinem Sicheren Raum",
    onboarding_welcome_desc: "Ein Ort, an dem du deine Gedanken anonym teilen und dich mit anderen verbinden kannst",
    onboarding_privacy_title: "Deine Privatsphäre Zählt",
    onboarding_privacy_desc: "Wir verwenden Ende-zu-Ende-Verschlüsselung und teilen niemals deine Daten. Deine Geständnisse bleiben anonym, es sei denn, du entscheidest dich anders.",
    onboarding_terms_desc: "Durch Fortfahren stimmst du unseren Nutzungsbedingungen und Datenschutzrichtlinien zu. Du kannst deine Daten jederzeit in deinen Profileinstellungen löschen.",
    
    // Network Status
    network_offline: "Du bist offline. Nachrichten werden gesendet, sobald die Verbindung wiederhergestellt ist.",
    network_syncing: "Synchronisiere {count} ausstehende Operation(en)...",
    
    // Content Moderation
    content_warning_title: "Persönliche Informationen Erkannt",
    content_warning_detected: "Persönliche Informationen erkannt. Fortfahren?",
    content_warning_continue: "Trotzdem Posten",
    content_email: "E-Mail-Adresse",
    content_phone: "Telefonnummer",
    content_address: "Physische Adresse",
    content_banned: "Eingeschränkter Inhalt",

    // Admin
    admin_performance: "Leistungsmetriken",
    admin_performance_desc: "Systemzustand und Überwachung",
    admin_active_users: "Aktive Benutzer",
    admin_last_5_minutes: "Letzte 5 Minuten",
    admin_cache: "Cache-Verwaltung",
    admin_clear_cache: "Cache Löschen",
    admin_confirm_clear: "Gesamten Cache löschen?",
    admin_clear_warning: "Dies entfernt alle zwischengespeicherten Daten.",
    cache_cleared: "Cache erfolgreich gelöscht",

    // Analytics
    analytics_engagement: "Interaktionsaufschlüsselung",
    analytics_engagement_desc: "Verteilung der Interaktionen",
    analytics_best_times: "Beste Zeiten zum Posten",
    analytics_best_times_desc: "Spitzenzeiten für Interaktionen",
    views: "Ansichten",
    likes: "Gefällt mir",
    comments: "Kommentare",
    shares: "Geteilt",

    // Quick Actions
    scroll_top: "Nach Oben",
    drafts: "Entwürfe",

    // Font Size Control
    font_size_small: "Klein",
    font_size_normal: "Normal",
    font_size_large: "Groß",
    font_size_xl: "Extra Groß",
    
    // Copy Text
    copy_text: "Text kopieren",
    text_copied: "Text in Zwischenablage kopiert",
    
    // Anonymous Badge
    anonymous_badge: "100% Anonym",
    identity_protected: "Ihre Identität ist vollständig geschützt",
    
    // Offline Enhanced
    offline_mode: "Offline-Modus",
    offline_message: "Du bist offline. Wird synchronisiert wenn verbunden",
    
    // Haptic
    haptic_enabled: "Haptisches Feedback Aktiviert",
    
    // Loading Quotes
    loading_quote_1: "Geheimnisse machen uns menschlich...",
    loading_quote_2: "Deine Geschichte zählt...",
    loading_quote_3: "Jeder hat etwas zu teilen...",
    
    // Edit/Delete Windows
    edit_available: "Bearbeitung verfügbar für {seconds}s",
    delete_available: "Löschen verfügbar für {time}",
    edit_window_expired: "Bearbeitungsfenster abgelaufen",
    
    // Theme
    theme_oled: "OLED Schwarz",
    
    confession_new: "Neues Geständnis",

    // Filters
    filters_title: "Filter",
    filters_date: "Datumsbereich",
    filters_community: "Community",
    filters_sort: "Sortieren Nach",
    filters_clear: "Filter Löschen",
    sort_newest: "Neueste Zuerst",
    sort_oldest: "Älteste Zuerst",
    sort_most_liked: "Meistgemocht",
    sort_most_commented: "Meistkommentiert",
    
    // Common (continued)
    common_continue: "Weiter",
    
    // Karma
    karma_points: "Karma-Punkte",
    karma_level: "Level",
    karma_next_level: "Nächstes Level",
    karma_points_to_go: "Punkte bis dahin",
    
    // Search Suggestions
    search_recent: "Kürzlich",
    search_clear: "Löschen",
    
    // Sensitive Content
    sensitive_content_warning: "Sensibler Inhalt",
    sensitive_content_description: "Dieser Inhalt kann verstörend oder triggernd sein",
    sensitive_content_view: "Trotzdem Ansehen",
    
    // Coin System
    coins_balance: "Guthaben",
    coins_get_more: "Münzen Holen",
    coins_shop_title: "Münzladen",
    coins_shop_subtitle: "Kaufe Münzen um VIP-Funktionen freizuschalten",
    coins_best_value: "Bestes Angebot",
    coins_per_coin: "pro Münze",
    coins_buy_now: "Jetzt Kaufen",
    coins_processing: "Wird verarbeitet...",
    coins_secure_payment: "🔒 Sichere Zahlung",
    coins_instant_delivery: "⚡ Sofortige Lieferung",
    coins_satisfaction: "✓ 100% Zufriedenheit",
    coins_purchase_error: "Kauf fehlgeschlagen. Bitte versuche es erneut.",
    coins_purchase_success_title: "Kauf Erfolgreich!",
    coins_purchase_success_message: "Deine Münzen wurden deinem Konto hinzugefügt",
    coins_purchase_cancelled_title: "Kauf Abgebrochen",
    coins_purchase_cancelled_message: "Deine Zahlung wurde abgebrochen. Es wurden keine Gebühren erhoben.",
    coins_go_home: "Zur Startseite",
    coins_visit_store: "Laden Besuchen",
    coins_try_again: "Erneut Versuchen",
    coins_most_popular: "Am Beliebtesten",
    
    // Gift Coins
    coins_gift_title: "Münzen Verschenken",
    coins_gift_amount: "Betrag",
    coins_gift_message: "Nachricht (Optional)",
    coins_gift_anonymous: "Anonym Senden",
    coins_gift_anonymous_fee: "+50 Münzen Gebühr",
    coins_gift_platform_fee: "Plattformgebühr (5%)",
    coins_gift_total: "Gesamtkosten",
    coins_gift_send: "Geschenk Senden",
    coins_gift_success: "{amount} Münzen erfolgreich verschenkt!",
    coins_gift_insufficient: "Unzureichende Münzen. Du brauchst {amount} Münzen",
    
    // Awards
    coins_award_title: "Ein Award Vergeben",
    coins_award_star: "Stern",
    coins_award_heart: "Herz",
    coins_award_fire: "Feuer",
    coins_award_diamond: "Diamant",
    coins_award_give: "Award Vergeben",
    coins_award_success: "Award vergeben! Der Ersteller erhielt {amount} Münzen",
    coins_award_creator_earns: "Ersteller erhält",
    coins_award_appreciation: "Zeige deine Wertschätzung! Der Ersteller erhält 50% des Award-Werts.",
    
    // Boosts
    coins_boost_title: "Dein Geständnis Boosten",
    coins_boost_basic: "Basis Boost",
    coins_boost_super: "Super Boost",
    coins_boost_pin: "Profil Anpinnen",
    coins_boost_activate: "Boost Aktivieren",
    coins_boost_active: "Boost Aktiv",
    coins_boost_expires: "Läuft in {hours} Stunden ab",
    coins_boost_description: "Booste dein Geständnis um mehr Menschen zu erreichen und mehr Engagement zu erhalten!",
    coins_boost_duration: "Dauer",
    coins_boost_success: "{name} für {duration} aktiviert!",
    coins_boost_already_active: "Dieses Geständnis hat bereits einen aktiven Boost",
    
    // Subscription flow messages
    payment_processing_wait: "Abonnement wird verarbeitet… bitte warten",
    upgrade_processing_now: "Dein Tarif wird aktualisiert…",
    upgrade_success: "Tarif erfolgreich aktualisiert",
    downgrade_scheduled_next_period: "Dein Downgrade wird im nächsten Abrechnungszeitraum wirksam.",
    cancel_scheduled: "Dein Abonnement endet am Ende dieses Abrechnungszeitraums.",
    processing_request: "Anfrage wird verarbeitet…",
    request_done: "Fertig!",
    upgradeFailed: "Upgrade fehlgeschlagen. Bitte versuche es erneut.",
    webhookLag: "Upgrade empfangen. Konto wird synchronisiert…",
    already_on_this_plan: "Du nutzt bereits diesen Tarif.",
    invalid_target_plan: "Ungültiger Zieltarif.",
  },
};
