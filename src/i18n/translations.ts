export type Language = 'en' | 'es' | 'de';

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
  profile_my_confessions: string;
  
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
    profile_my_confessions: "My Confessions",
    
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
    profile_my_confessions: "Mis Confesiones",
    
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
    profile_my_confessions: "Meine Geständnisse",
    
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
  },
};
