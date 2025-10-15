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
    referral_description: "Earn 7 days Premium for each friend who signs up",
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
    referral_description: "Gana 7 días Premium por cada amigo que se registre",
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
    referral_description: "Verdiene 7 Tage Premium für jeden Freund, der sich registriert",
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
  },
};
