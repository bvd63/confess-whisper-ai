export type Language = 'en' | 'es' | 'de' | 'ro';

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
  },
  ro: {
    app_name: "Confess+",
    welcome_title: "Bine ai venit la Confess+",
    welcome_description: "Un spațiu sigur unde poți împărtăși orice te apasă, în deplină anonimitate.",
    anonymous_secure: "100% Anonim și Sigur",
    anonymous_description: "Identitatea ta rămâne complet confidențială. Nu stocăm nicio informație personală.",
    ai_support: "Suport AI Empatic",
    ai_description: "Primești răspunsuri empatice generate de AI și, cu Premium, insights psihologice profunde.",
    get_started: "Începe",
    skip: "Skip",
    next: "Următorul",
    
    home_title: "Confesiuni Anonime",
    new_confession: "Confesiune Nouă",
    premium_upgrade: "Upgrade la Premium",
    
    placeholder_confession: "Împărtășește ce ai pe suflet... (10-2000 caractere)",
    submit: "Trimite Anonim",
    submitting: "Se trimite...",
    
    ai_reply_title: "Răspuns AI",
    deep_insight_title: "Insight Profund",
    generate_insight: "Generează Insight Profund",
    
    toast_sent: "Confesiunea ta a fost trimisă anonim 💭",
    toast_flagged: "Conținut nepermis. Te rog reformulează.",
    error_generic: "Ceva nu a mers bine. Încearcă din nou.",
    
    report: "Raportează",
    share: "Distribuie",
    delete: "Șterge",
    
    language: "Limbă",
    profile: "Profil",
    settings: "Setări",
    logout: "Deconectare",
    login: "Autentificare",
    signup: "Înregistrare",
    
    confessions_count: "confesiuni",
    insights_used: "insights folosite",
    member_since: "Membru din",
    
    crisis_hint: "Dacă ești în pericol imediat, contactează serviciile de urgență locale.",
  },
};
