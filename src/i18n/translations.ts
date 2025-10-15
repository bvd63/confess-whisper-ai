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
  },
};
