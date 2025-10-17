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
  premium_upgrade: string;
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
  deep_insight_premium: string;
  deep_insight_description: string;
  deep_insight_success: string;
  
  // Premium
  premium_member: string;
  premium_feature: string;
  premium_benefits: string;
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
  achievement_premium_member: string;
  achievement_premium_member_desc: string;
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
  stats_premium_members: string;
  
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
  ui_welcome_premium: string;
  ui_premium_access: string;
  ui_help_question: string;
  ui_help_choose: string;
  ui_help_reply_time: string;
  ui_pull_to_refresh: string;
  ui_release_to_refresh: string;
  ui_refreshing: string;
  
  // Subscription Plans
  subscription_premium_title: string;
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
  subscription_benefit_1: string;
  subscription_benefit_2: string;
  subscription_benefit_3: string;
  subscription_benefit_4: string;
  subscription_benefit_5: string;
  subscription_auth_required: string;
  subscription_error: string;
  
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
  profile_discover_premium: string;
  profile_premium_description: string;
  profile_you_are_premium: string;
  profile_premium_thanks: string;
  profile_no_confessions: string;
  
  // User Confessions List
  ucl_no_confessions: string;
  
  // Common
  common_back: string;
  common_error: string;
  common_help_aria: string;
  common_theme_aria: string;
  
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
  notifications_none: string;
  notification_like: string;
  notification_comment: string;
  notification_new: string;
  
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
  profile_my_confessions: string;
  profile_statistics: string;
  profile_total_confessions: string;
  profile_total_likes: string;
  profile_total_comments: string;
  profile_empty_state: string;
  profile_empty_description: string;
  
  // Achievement Toast
  achievement_new_badge: string;
  
  // Daily Prompt
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
  coins_per_comment_detail: string;
  coins_per_like_detail: string;
  coins_no_transactions: string;
  coins_all_transactions: string;
  coins_confession_created: string;
  coins_comment_added: string;
  coins_like_received: string;
  
  // Nickname & User Search
  nickname_label: string;
  nickname_placeholder: string;
  nickname_update: string;
  nickname_updated: string;
  nickname_error: string;
  nickname_taken: string;
  nickname_invalid: string;
  nickname_cooldown: string;
  nickname_days_remaining: string;
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
  subscription_feature_unlimited_ai: string;
  subscription_feature_advanced_analytics: string;
  subscription_feature_exclusive_badges: string;
  subscription_feature_no_ads: string;
  subscription_feature_priority_moderation: string;
  subscription_feature_all_premium: string;
  subscription_feature_image_confessions: string;
  subscription_feature_detailed_stats: string;
  subscription_feature_priority_support: string;
  subscription_feature_vip_badge: string;
  
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
  subscription_manage: string;
  subscription_upgrade_premium: string;
  
  // Profile
  profile_achievements: string;
  profile_moods: string;
  profile_settings: string;
  profile_moderation: string;
  profile_plan_free: string;
  profile_plan_premium: string;
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
};

export const translations: Record<Language, Translations> = {
  en: {
    app_name: "Confess+",
    welcome_title: "Welcome to Confess+",
    welcome_description: "A safe space where you can share anything anonymously.",
    anonymous_secure: "100% Anonymous & Secure",
    anonymous_description: "Your identity remains completely confidential. We don't store any personal information.",
    ai_support: "Empathetic AI Support",
    ai_description: "Get empathetic AI responses and, with Premium, deep psychological insights.",
    get_started: "Get Started",
    skip: "Skip",
    next: "Next",
    
    home_title: "Anonymous Confessions",
    new_confession: "New Confession",
    premium_upgrade: "Upgrade to Premium",
    
    placeholder_confession: "Share what's on your mind... (10-2000 characters)",
    submit: "Submit Anonymously",
    submitting: "Submitting...",
    
    ai_reply_title: "AI Response",
    deep_insight_title: "Deep Insight",
    generate_insight: "Generate Deep Insight",
    
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
    
    deep_insight_premium: "Deep Insight is only available for Premium users.",
    deep_insight_description: "Deep psychological analysis for complete understanding.",
    deep_insight_success: "Deep Insight generated! ✨",
    
    premium_member: "Premium Member",
    premium_feature: "Premium Feature",
    premium_benefits: "Unlimited Deep Insights, detailed responses, ad-free experience.",
    upgrade_now: "Upgrade Now",
    
    delete_account: "Delete Account",
    delete_account_description: "Permanently delete your account and all associated data",
    delete_confirm: "Delete Permanently",
    delete_warning: "This action cannot be undone. This will permanently delete your account and all data.",
    deleting: "Deleting...",
    export_data: "Export Data",
    
    referral_title: "Invite Friends",
    referral_description: "Earn 1 day Premium for each friend who signs up",
    referral_earned: "You earned {days} days of free Premium!",
    
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
    notifications_none: "No notifications",
    notification_like: "liked your confession",
    notification_comment: "commented on your confession",
    notification_new: "New",
    
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
    profile_my_confessions: "My Confessions",
    profile_statistics: "Statistics",
    profile_total_confessions: "Total Confessions",
    profile_total_likes: "Total Likes",
    profile_total_comments: "Total Comments",
    profile_empty_state: "No confessions yet",
    profile_empty_description: "Start sharing your thoughts anonymously",
    
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
    achievement_premium_member: "Premium Member",
    achievement_premium_member_desc: "Member of the Premium community",
    achievement_supporter: "Supporter",
    achievement_supporter_desc: "Supporting the platform development",
    
    feature_ai_empathy: "AI Empathy",
    feature_ai_empathy_desc: "Empathetic responses generated by AI trained to understand and support",
    feature_anonymous: "100% Anonymous",
    feature_anonymous_desc: "Your identity remains confidential; confessions cannot be attributed",
    feature_deep_insights: "Deep Insights",
    feature_deep_insights_desc: "In-depth psychological analysis for complete understanding (Premium)",
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
    referral_reward_message: "You earned {days} days of free Premium!",
    referral_continue_inviting: "Keep inviting friends for more benefits",
    
    share_title: "Share Confession",
    share_copy_link: "Copy Link",
    share_link_copied: "Link copied!",
    share_text: "Discover this confession on Confess+",
    
    stats_active_users: "Active users",
    stats_confessions_shared: "Confessions shared",
    stats_empathetic_reactions: "Empathetic reactions",
    stats_premium_members: "Premium members",
    
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
    ui_welcome_premium: "Welcome to Premium! 🎉",
    ui_premium_access: "You now have access to all premium features.",
    ui_help_question: "How can we help?",
    ui_help_choose: "Choose one of the options below to get help",
    ui_help_reply_time: "We usually reply within 24 hours",
    ui_pull_to_refresh: "Pull to refresh",
    ui_release_to_refresh: "Release to refresh",
    ui_refreshing: "Refreshing...",
    
    subscription_premium_title: "Confess+ Premium",
    subscription_choose_plan: "Choose the plan that suits you best",
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
    subscription_benefit_1: "Unlimited Deep Insight AI - deep psychological analysis",
    subscription_benefit_2: "Extended and more detailed AI responses",
    subscription_benefit_3: "Ad-free - clean experience",
    subscription_benefit_4: "Priority in AI processing",
    subscription_benefit_5: "Access to future features",
    subscription_auth_required: "You must be authenticated to subscribe.",
    subscription_error: "Could not initiate subscription process. Try again.",
    
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
    payment_success_desc: "Congratulations! Your Premium account has been successfully activated.",
    payment_success_deep_insights: "Access to Deep Insights AI",
    payment_success_analysis: "Deep psychological analysis",
    payment_success_priority: "Priority support",
    payment_success_explore: "Explore Confess+",
    payment_redirect_info: "You will be redirected automatically in 5 seconds...",
    
    profile_your_account: "Your Account",
    profile_subscription_active: "Active subscription until",
    profile_refresh_status: "Refresh Status",
    profile_discover_premium: "Discover Confess+ Premium",
    profile_premium_description: "Get unlimited access to Deep Insights AI, extended responses and an ad-free experience.",
    profile_you_are_premium: "You are a Premium member!",
    profile_premium_thanks: "You enjoy all Confess+ benefits. Thank you for your support! 💜",
    profile_no_confessions: "You haven't posted any confessions yet.",
    
    ucl_no_confessions: "You haven't posted any confessions yet.",
    
    common_back: "Back",
    common_error: "Error",
    common_help_aria: "Help",
    common_theme_aria: "Toggle theme",
    
    faq_title: "Frequently Asked Questions",
    faq_q1: "Is it really anonymous?",
    faq_a1: "Yes! Your confessions are completely anonymous. Your name never appears publicly and can't be linked to your confessions by other users. We only store the data necessary for the platform to function.",
    faq_q2: "How does the AI work?",
    faq_a2: "Our AI analyzes your confession and generates an empathetic, understanding response. We use advanced language models trained to be empathic and non-judgmental. Responses aren't pre-written; they're generated uniquely for each confession.",
    faq_q3: "What is Deep Insight?",
    faq_a3: "Deep Insight is a premium feature that provides deeper psychological analysis of your confession. It includes extra perspectives, practical advice, and reflective questions to help you better understand your situation.",
    faq_q4: "Can I delete my confessions?",
    faq_a4: "Yes, you can edit or delete your confessions anytime from the profile page. Once deleted, they are permanently removed from the database.",
    faq_q5: "What does the Premium subscription offer?",
    faq_a5: "Premium gives you unlimited AI Deep Insights, more detailed responses, an ad-free experience, and priority AI processing. You also support the development of the platform!",
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
    terms_section_4: "4. Premium and Payments",
    terms_section_4_text: "Premium subscription offers additional features. Payments are processed securely through Stripe. You can cancel your subscription anytime from account settings.",
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
    profile_plan_premium: "Premium",
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
    subscription_manage: "Manage subscription",
    subscription_upgrade_premium: "Upgrade to Premium",
    
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
    coins_per_confession_detail: "• 10 coins for each confession",
    coins_per_comment_detail: "• 5 coins for each comment",
    coins_per_like_detail: "• 2 coins when you receive a like",
    coins_no_transactions: "No transactions yet",
    coins_all_transactions: "All your coin transactions",
    coins_confession_created: "New confession",
    coins_comment_added: "Comment added",
    coins_like_received: "Like received",
    
    nickname_label: "Nickname",
    nickname_placeholder: "Enter your nickname",
    nickname_update: "Update Nickname",
    nickname_updated: "Nickname updated successfully",
    nickname_error: "Error updating nickname",
    nickname_taken: "This nickname is already taken",
    nickname_invalid: "Nickname must be 3-20 characters (letters, numbers, _, .)",
    nickname_cooldown: "You can only change your nickname once every 21 days",
    nickname_days_remaining: "days remaining until you can change your nickname",
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
    subscription_title: "Choose Your Premium Plan",
    subscription_description: "Unlock all features and get a superior experience",
    subscription_feature_unlimited_ai: "Unlimited AI responses",
    subscription_feature_advanced_analytics: "Advanced analytics",
    subscription_feature_exclusive_badges: "Exclusive badges",
    subscription_feature_no_ads: "Ad-free",
    subscription_feature_priority_moderation: "Priority in moderation",
    subscription_feature_all_premium: "All Premium benefits",
    subscription_feature_image_confessions: "Confessions with images",
    subscription_feature_detailed_stats: "Detailed statistics",
    subscription_feature_priority_support: "Priority support",
    subscription_feature_vip_badge: "Special VIP badge",
    
    payment_view_profile: "View Your Premium Profile",
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
  },
  es: {
    app_name: "Confess+",
    welcome_title: "Bienvenido a Confess+",
    welcome_description: "Un espacio seguro donde puedes compartir cualquier cosa de forma anónima.",
    anonymous_secure: "100% Anónimo y Seguro",
    anonymous_description: "Tu identidad permanece completamente confidencial. No almacenamos información personal.",
    ai_support: "Soporte IA Empático",
    ai_description: "Recibe respuestas empáticas de IA y, con Premium, insights psicológicos profundos.",
    get_started: "Comenzar",
    skip: "Saltar",
    next: "Siguiente",
    
    home_title: "Confesiones Anónimas",
    new_confession: "Nueva Confesión",
    premium_upgrade: "Actualizar a Premium",
    
    placeholder_confession: "Comparte lo que piensas... (10-2000 caracteres)",
    submit: "Enviar Anónimamente",
    submitting: "Enviando...",
    
    ai_reply_title: "Respuesta IA",
    deep_insight_title: "Insight Profundo",
    generate_insight: "Generar Insight Profundo",
    
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
    
    deep_insight_premium: "Deep Insight solo está disponible para usuarios Premium.",
    deep_insight_description: "Análisis psicológico profundo para comprensión completa.",
    deep_insight_success: "¡Deep Insight generado! ✨",
    
    premium_member: "Miembro Premium",
    premium_feature: "Función Premium",
    premium_benefits: "Deep Insights ilimitados, respuestas detalladas, sin anuncios.",
    upgrade_now: "Actualizar Ahora",
    
    delete_account: "Eliminar Cuenta",
    delete_account_description: "Eliminar permanentemente tu cuenta y todos los datos asociados",
    delete_confirm: "Eliminar Permanentemente",
    delete_warning: "Esta acción no se puede deshacer. Eliminará permanentemente tu cuenta y todos los datos.",
    deleting: "Eliminando...",
    export_data: "Exportar Datos",
    
    referral_title: "Invitar Amigos",
    referral_description: "Gana 1 día Premium por cada amigo que se registre",
    referral_earned: "¡Ganaste {days} días de Premium gratis!",
    
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
    notifications_none: "Sin notificaciones",
    notification_like: "le gustó tu confesión",
    notification_comment: "comentó en tu confesión",
    notification_new: "Nueva",
    
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
    achievement_premium_member: "Miembro Premium",
    achievement_premium_member_desc: "Miembro de la comunidad Premium",
    achievement_supporter: "Seguidor",
    achievement_supporter_desc: "Apoyas el desarrollo de la plataforma",
    
    feature_ai_empathy: "Empatía IA",
    feature_ai_empathy_desc: "Respuestas empáticas generadas por IA entrenada para comprender y apoyar",
    feature_anonymous: "100% Anónimo",
    feature_anonymous_desc: "Tu identidad permanece confidencial; las confesiones no pueden ser atribuidas",
    feature_deep_insights: "Deep Insights",
    feature_deep_insights_desc: "Análisis psicológico profundo para una comprensión completa (Premium)",
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
    referral_reward_message: "¡Ganaste {days} días de Premium gratis!",
    referral_continue_inviting: "Sigue invitando amigos para más beneficios",
    
    share_title: "Compartir Confesión",
    share_copy_link: "Copiar Enlace",
    share_link_copied: "¡Enlace copiado!",
    share_text: "Descubre esta confesión en Confess+",
    
    stats_active_users: "Usuarios activos",
    stats_confessions_shared: "Confesiones compartidas",
    stats_empathetic_reactions: "Reacciones empáticas",
    stats_premium_members: "Miembros Premium",
    
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
    ui_welcome_premium: "¡Bienvenido a Premium! 🎉",
    ui_premium_access: "Ahora tienes acceso a todas las funciones premium.",
    ui_help_question: "¿Cómo podemos ayudarte?",
    ui_help_choose: "Elige una de las opciones a continuación para obtener ayuda",
    ui_help_reply_time: "Normalmente respondemos en 24 horas",
    ui_pull_to_refresh: "Desliza para actualizar",
    ui_release_to_refresh: "Suelta para actualizar",
    ui_refreshing: "Actualizando...",
    
    subscription_premium_title: "Confess+ Premium",
    subscription_choose_plan: "Elige el plan que mejor se adapte a ti",
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
    subscription_benefit_1: "Deep Insight AI ilimitado - análisis psicológico profundo",
    subscription_benefit_2: "Respuestas de IA extendidas y más detalladas",
    subscription_benefit_3: "Sin anuncios - experiencia limpia",
    subscription_benefit_4: "Prioridad en procesamiento de IA",
    subscription_benefit_5: "Acceso a funciones futuras",
    subscription_auth_required: "Debes estar autenticado para suscribirte.",
    subscription_error: "No se pudo iniciar el proceso de suscripción. Inténtalo de nuevo.",
    
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
    payment_success_desc: "¡Felicitaciones! Tu cuenta Premium ha sido activada exitosamente.",
    payment_success_deep_insights: "Acceso a Deep Insights IA",
    payment_success_analysis: "Análisis psicológico profundo",
    payment_success_priority: "Soporte prioritario",
    payment_success_explore: "Explorar Confess+",
    payment_redirect_info: "Serás redirigido automáticamente en 5 segundos...",
    
    profile_your_account: "Tu Cuenta",
    profile_subscription_active: "Suscripción activa hasta",
    profile_refresh_status: "Actualizar Estado",
    profile_discover_premium: "Descubre Confess+ Premium",
    profile_premium_description: "Obtén acceso ilimitado a Deep Insights IA, respuestas extendidas y una experiencia sin anuncios.",
    profile_you_are_premium: "¡Eres miembro Premium!",
    profile_premium_thanks: "Disfrutas de todos los beneficios de Confess+. ¡Gracias por tu apoyo! 💜",
    profile_no_confessions: "Aún no has publicado ninguna confesión.",
    
    ucl_no_confessions: "Aún no has publicado ninguna confesión.",
    
    common_back: "Atrás",
    common_error: "Error",
    common_help_aria: "Ayuda",
    common_theme_aria: "Cambiar tema",
    
    faq_title: "Preguntas Frecuentes",
    faq_q1: "¿Es realmente anónimo?",
    faq_a1: "¡Sí! Tus confesiones son completamente anónimas. Tu nombre nunca aparece públicamente y no puede ser vinculado a tus confesiones por otros usuarios. Solo almacenamos los datos necesarios para que la plataforma funcione.",
    faq_q2: "¿Cómo funciona la IA?",
    faq_a2: "Nuestra IA analiza tu confesión y genera una respuesta empática y comprensiva. Usamos modelos de lenguaje avanzados entrenados para ser empáticos y sin juicios. Las respuestas no están pre-escritas; se generan únicamente para cada confesión.",
    faq_q3: "¿Qué es Deep Insight?",
    faq_a3: "Deep Insight es una función premium que proporciona un análisis psicológico más profundo de tu confesión. Incluye perspectivas adicionales, consejos prácticos y preguntas reflexivas para ayudarte a comprender mejor tu situación.",
    faq_q4: "¿Puedo eliminar mis confesiones?",
    faq_a4: "Sí, puedes editar o eliminar tus confesiones en cualquier momento desde la página de perfil. Una vez eliminadas, se eliminan permanentemente de la base de datos.",
    faq_q5: "¿Qué ofrece la suscripción Premium?",
    faq_a5: "Premium te da Deep Insights IA ilimitados, respuestas más detalladas, una experiencia sin anuncios y procesamiento de IA prioritario. ¡También apoyas el desarrollo de la plataforma!",
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
    terms_section_4: "4. Premium y Pagos",
    terms_section_4_text: "La suscripción Premium ofrece funciones adicionales. Los pagos se procesan de forma segura a través de Stripe. Puedes cancelar tu suscripción en cualquier momento desde la configuración de la cuenta.",
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
    profile_my_confessions: "Mis Confesiones",
    profile_statistics: "Estadísticas",
    profile_total_confessions: "Total de Confesiones",
    profile_total_likes: "Total de Me Gusta",
    profile_total_comments: "Total de Comentarios",
    profile_empty_state: "Sin confesiones aún",
    profile_empty_description: "Empieza a compartir tus pensamientos anónimamente",
    
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
    coins_per_confession_detail: "• 10 monedas por cada confesión",
    coins_per_comment_detail: "• 5 monedas por cada comentario",
    coins_per_like_detail: "• 2 monedas cuando recibes un me gusta",
    coins_no_transactions: "Aún no hay transacciones",
    coins_all_transactions: "Todas tus transacciones de monedas",
    coins_confession_created: "Nueva confesión",
    coins_comment_added: "Comentario añadido",
    coins_like_received: "Me gusta recibido",
    
    nickname_label: "Apodo",
    nickname_placeholder: "Ingresa tu apodo",
    nickname_update: "Actualizar Apodo",
    nickname_updated: "Apodo actualizado exitosamente",
    nickname_error: "Error al actualizar apodo",
    nickname_taken: "Este apodo ya está en uso",
    nickname_invalid: "El apodo debe tener 3-20 caracteres (letras, números, _, .)",
    nickname_cooldown: "Solo puedes cambiar tu apodo una vez cada 21 días",
    nickname_days_remaining: "días restantes hasta que puedas cambiar tu apodo",
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
    subscription_title: "Elige Tu Plan Premium",
    subscription_description: "Desbloquea todas las funciones y obtén una experiencia superior",
    subscription_feature_unlimited_ai: "Respuestas AI ilimitadas",
    subscription_feature_advanced_analytics: "Análisis avanzados",
    subscription_feature_exclusive_badges: "Insignias exclusivas",
    subscription_feature_no_ads: "Sin anuncios",
    subscription_feature_priority_moderation: "Prioridad en moderación",
    subscription_feature_all_premium: "Todos los beneficios Premium",
    subscription_feature_image_confessions: "Confesiones con imágenes",
    subscription_feature_detailed_stats: "Estadísticas detalladas",
    subscription_feature_priority_support: "Soporte prioritario",
    subscription_feature_vip_badge: "Insignia VIP especial",
    
    payment_view_profile: "Ver Tu Perfil Premium",
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
    profile_plan_premium: "Premium",
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
    subscription_manage: "Gestionar suscripción",
    subscription_upgrade_premium: "Mejorar a Premium",
    
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
  },
  de: {
    app_name: "Confess+",
    welcome_title: "Willkommen bei Confess+",
    welcome_description: "Ein sicherer Ort, an dem du anonym alles teilen kannst.",
    anonymous_secure: "100% Anonym & Sicher",
    anonymous_description: "Deine Identität bleibt vollständig vertraulich. Wir speichern keine persönlichen Informationen.",
    ai_support: "Einfühlsame KI-Unterstützung",
    ai_description: "Erhalte empathische KI-Antworten und mit Premium tiefe psychologische Einblicke.",
    get_started: "Jetzt Starten",
    skip: "Überspringen",
    next: "Weiter",
    
    home_title: "Anonyme Geständnisse",
    new_confession: "Neues Geständnis",
    premium_upgrade: "Auf Premium Upgraden",
    
    placeholder_confession: "Teile, was dich bewegt... (10-2000 Zeichen)",
    submit: "Anonym Absenden",
    submitting: "Wird gesendet...",
    
    ai_reply_title: "KI-Antwort",
    deep_insight_title: "Tiefer Einblick",
    generate_insight: "Tiefen Einblick Generieren",
    
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
    
    deep_insight_premium: "Deep Insight ist nur für Premium-Nutzer verfügbar.",
    deep_insight_description: "Tiefgreifende psychologische Analyse für vollständiges Verständnis.",
    deep_insight_success: "Deep Insight generiert! ✨",
    
    premium_member: "Premium-Mitglied",
    premium_feature: "Premium-Funktion",
    premium_benefits: "Unbegrenzte Deep Insights, detaillierte Antworten, werbefrei.",
    upgrade_now: "Jetzt Upgraden",
    
    delete_account: "Konto Löschen",
    delete_account_description: "Konto und alle zugehörigen Daten dauerhaft löschen",
    delete_confirm: "Dauerhaft Löschen",
    delete_warning: "Diese Aktion kann nicht rückgängig gemacht werden. Dein Konto und alle Daten werden dauerhaft gelöscht.",
    deleting: "Wird gelöscht...",
    export_data: "Daten Exportieren",
    
    referral_title: "Freunde Einladen",
    referral_description: "Verdiene 1 Tag Premium für jeden Freund, der sich registriert",
    referral_earned: "Du hast {days} Tage kostenloses Premium verdient!",
    
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
    notifications_none: "Keine Benachrichtigungen",
    notification_like: "hat dein Geständnis geliked",
    notification_comment: "hat dein Geständnis kommentiert",
    notification_new: "Neu",
    
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
    achievement_premium_member: "Premium-Mitglied",
    achievement_premium_member_desc: "Mitglied der Premium-Community",
    achievement_supporter: "Unterstützer",
    achievement_supporter_desc: "Unterstützt die Plattformentwicklung",
    
    feature_ai_empathy: "KI-Empathie",
    feature_ai_empathy_desc: "Empathische Antworten von KI, die trainiert wurde, um zu verstehen und zu unterstützen",
    feature_anonymous: "100% Anonym",
    feature_anonymous_desc: "Deine Identität bleibt vertraulich; Geständnisse können nicht zugeordnet werden",
    feature_deep_insights: "Deep Insights",
    feature_deep_insights_desc: "Tiefgreifende psychologische Analyse für vollständiges Verständnis (Premium)",
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
    referral_reward_message: "Du hast {days} Tage kostenloses Premium verdient!",
    referral_continue_inviting: "Lade weiter Freunde ein für mehr Vorteile",
    
    share_title: "Geständnis Teilen",
    share_copy_link: "Link Kopieren",
    share_link_copied: "Link kopiert!",
    share_text: "Entdecke dieses Geständnis auf Confess+",
    
    stats_active_users: "Aktive Nutzer",
    stats_confessions_shared: "Geteilte Geständnisse",
    stats_empathetic_reactions: "Empathische Reaktionen",
    stats_premium_members: "Premium-Mitglieder",
    
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
    ui_welcome_premium: "Willkommen bei Premium! 🎉",
    ui_premium_access: "Du hast jetzt Zugriff auf alle Premium-Funktionen.",
    ui_help_question: "Wie können wir helfen?",
    ui_help_choose: "Wähle eine der unten stehenden Optionen, um Hilfe zu erhalten",
    ui_help_reply_time: "Wir antworten normalerweise innerhalb von 24 Stunden",
    ui_pull_to_refresh: "Zum Aktualisieren ziehen",
    ui_release_to_refresh: "Zum Aktualisieren loslassen",
    ui_refreshing: "Aktualisiert...",
    
    subscription_premium_title: "Confess+ Premium",
    subscription_choose_plan: "Wähle den Plan, der am besten zu dir passt",
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
    subscription_benefit_1: "Unbegrenztes Deep Insight AI - tiefgreifende psychologische Analyse",
    subscription_benefit_2: "Erweiterte und detailliertere KI-Antworten",
    subscription_benefit_3: "Werbefrei - sauberes Erlebnis",
    subscription_benefit_4: "Priorität bei KI-Verarbeitung",
    subscription_benefit_5: "Zugang zu zukünftigen Funktionen",
    subscription_auth_required: "Du musst angemeldet sein, um zu abonnieren.",
    subscription_error: "Abonnementprozess konnte nicht gestartet werden. Versuche es erneut.",
    
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
    payment_success_desc: "Glückwunsch! Dein Premium-Konto wurde erfolgreich aktiviert.",
    payment_success_deep_insights: "Zugang zu Deep Insights KI",
    payment_success_analysis: "Tiefgreifende psychologische Analyse",
    payment_success_priority: "Prioritäts-Support",
    payment_success_explore: "Confess+ Erkunden",
    payment_redirect_info: "Du wirst in 5 Sekunden automatisch weitergeleitet...",
    
    profile_your_account: "Dein Konto",
    profile_subscription_active: "Aktives Abonnement bis",
    profile_refresh_status: "Status Aktualisieren",
    profile_discover_premium: "Entdecke Confess+ Premium",
    profile_premium_description: "Erhalte unbegrenzten Zugang zu Deep Insights KI, erweiterten Antworten und einem werbefreien Erlebnis.",
    profile_you_are_premium: "Du bist Premium-Mitglied!",
    profile_premium_thanks: "Du genießt alle Confess+ Vorteile. Danke für deine Unterstützung! 💜",
    profile_no_confessions: "Du hast noch keine Geständnisse gepostet.",
    
    ucl_no_confessions: "Du hast noch keine Geständnisse gepostet.",
    
    common_back: "Zurück",
    common_error: "Fehler",
    common_help_aria: "Hilfe",
    common_theme_aria: "Design wechseln",
    
    faq_title: "Häufig gestellte Fragen",
    faq_q1: "Ist es wirklich anonym?",
    faq_a1: "Ja! Deine Geständnisse sind vollständig anonym. Dein Name erscheint nie öffentlich und kann von anderen Nutzern nicht mit deinen Geständnissen verknüpft werden. Wir speichern nur die Daten, die für den Betrieb der Plattform erforderlich sind.",
    faq_q2: "Wie funktioniert die KI?",
    faq_a2: "Unsere KI analysiert dein Geständnis und generiert eine empathische, verständnisvolle Antwort. Wir verwenden fortschrittliche Sprachmodelle, die darauf trainiert sind, einfühlsam und nicht wertend zu sein. Die Antworten sind nicht vorgeschrieben; sie werden einzigartig für jedes Geständnis generiert.",
    faq_q3: "Was ist Deep Insight?",
    faq_a3: "Deep Insight ist eine Premium-Funktion, die eine tiefere psychologische Analyse deines Geständnisses bietet. Es umfasst zusätzliche Perspektiven, praktische Ratschläge und reflektierende Fragen, um dir zu helfen, deine Situation besser zu verstehen.",
    faq_q4: "Kann ich meine Geständnisse löschen?",
    faq_a4: "Ja, du kannst deine Geständnisse jederzeit von der Profilseite aus bearbeiten oder löschen. Einmal gelöscht, werden sie dauerhaft aus der Datenbank entfernt.",
    faq_q5: "Was bietet das Premium-Abonnement?",
    faq_a5: "Premium gibt dir unbegrenzte KI Deep Insights, detailliertere Antworten, ein werbefreies Erlebnis und prioritäre KI-Verarbeitung. Du unterstützt auch die Entwicklung der Plattform!",
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
    terms_section_4: "4. Premium und Zahlungen",
    terms_section_4_text: "Das Premium-Abonnement bietet zusätzliche Funktionen. Zahlungen werden sicher über Stripe abgewickelt. Du kannst dein Abonnement jederzeit in den Kontoeinstellungen kündigen.",
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
    profile_my_confessions: "Meine Geständnisse",
    profile_statistics: "Statistiken",
    profile_total_confessions: "Gesamt Geständnisse",
    profile_total_likes: "Gesamt Likes",
    profile_total_comments: "Gesamt Kommentare",
    profile_empty_state: "Noch keine Geständnisse",
    profile_empty_description: "Beginnen Sie, Ihre Gedanken anonym zu teilen",
    
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
    coins_total_earned: "Gesamt Verdient",
    coins_history: "Verlauf Anzeigen",
    coins_how_to_earn: "Wie man Münzen verdient:",
    coins_per_confession_detail: "• 10 Münzen für jedes Geständnis",
    coins_per_comment_detail: "• 5 Münzen für jeden Kommentar",
    coins_per_like_detail: "• 2 Münzen wenn du ein Like erhältst",
    coins_no_transactions: "Noch keine Transaktionen",
    coins_all_transactions: "Alle deine Münztransaktionen",
    coins_confession_created: "Neues Geständnis",
    coins_comment_added: "Kommentar hinzugefügt",
    coins_like_received: "Like erhalten",
    
    nickname_label: "Spitzname",
    nickname_placeholder: "Gib deinen Spitznamen ein",
    nickname_update: "Spitzname Aktualisieren",
    nickname_updated: "Spitzname erfolgreich aktualisiert",
    nickname_error: "Fehler beim Aktualisieren des Spitznamens",
    nickname_taken: "Dieser Spitzname ist bereits vergeben",
    nickname_invalid: "Spitzname muss 3-20 Zeichen haben (Buchstaben, Zahlen, _, .)",
    nickname_cooldown: "Du kannst deinen Spitznamen nur alle 21 Tage ändern",
    nickname_days_remaining: "Tage verbleibend, bis du deinen Spitznamen ändern kannst",
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
    subscription_title: "Wähle Deinen Premium-Plan",
    subscription_description: "Schalte alle Funktionen frei und erhalte ein überlegenes Erlebnis",
    subscription_feature_unlimited_ai: "Unbegrenzte KI-Antworten",
    subscription_feature_advanced_analytics: "Erweiterte Analysen",
    subscription_feature_exclusive_badges: "Exklusive Abzeichen",
    subscription_feature_no_ads: "Werbefrei",
    subscription_feature_priority_moderation: "Priorität bei Moderation",
    subscription_feature_all_premium: "Alle Premium-Vorteile",
    subscription_feature_image_confessions: "Geständnisse mit Bildern",
    subscription_feature_detailed_stats: "Detaillierte Statistiken",
    subscription_feature_priority_support: "Prioritäts-Support",
    subscription_feature_vip_badge: "Spezielle VIP-Badge",
    
    payment_view_profile: "Dein Premium-Profil Anzeigen",
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
    profile_plan_premium: "Premium",
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
    subscription_manage: "Abonnement verwalten",
    subscription_upgrade_premium: "Auf Premium upgraden",
    
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
  },
};
