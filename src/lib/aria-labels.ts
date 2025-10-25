import type { Language } from "@/i18n/translations";

/**
 * Comprehensive ARIA labels for accessibility
 * Organized by component type
 */

interface AriaLabels {
  // Common actions
  close: string;
  open: string;
  menu: string;
  search: string;
  filter: string;
  sort: string;
  loading: string;
  
  // Social actions
  like: string;
  unlike: string;
  comment: string;
  share: string;
  report: string;
  follow: string;
  unfollow: string;
  
  // Navigation
  home: string;
  profile: string;
  settings: string;
  notifications: string;
  messages: string;
  back: string;
  next: string;
  previous: string;
  
  // Inputs
  searchInput: string;
  messageInput: string;
  confessionInput: string;
  commentInput: string;
  
  // Badges & Indicators
  vipBadge: string;
  newNotification: string;
  unreadMessages: string;
  verifiedUser: string;
  
  // Dialogs
  closeDialog: string;
  confirmAction: string;
  cancelAction: string;
  
  // Media
  uploadImage: string;
  removeImage: string;
  playVideo: string;
  pauseVideo: string;
  
  // Confession specific
  generateInsight: string;
  viewInsight: string;
  deleteConfession: string;
  editConfession: string;
  
  // Theme
  toggleTheme: string;
  darkMode: string;
  lightMode: string;
}

export const ariaLabels: Record<Language, AriaLabels> = {
  en: {
    // Common actions
    close: "Close",
    open: "Open",
    menu: "Menu",
    search: "Search",
    filter: "Filter",
    sort: "Sort",
    loading: "Loading",
    
    // Social actions
    like: "Like",
    unlike: "Unlike",
    comment: "Comment",
    share: "Share",
    report: "Report",
    follow: "Follow",
    unfollow: "Unfollow",
    
    // Navigation
    home: "Home",
    profile: "Profile",
    settings: "Settings",
    notifications: "Notifications",
    messages: "Messages",
    back: "Go back",
    next: "Next",
    previous: "Previous",
    
    // Inputs
    searchInput: "Search confessions",
    messageInput: "Type a message",
    confessionInput: "Write your confession",
    commentInput: "Write a comment",
    
    // Badges & Indicators
    vipBadge: "VIP member",
    newNotification: "New notification",
    unreadMessages: "Unread messages",
    verifiedUser: "Verified user",
    
    // Dialogs
    closeDialog: "Close dialog",
    confirmAction: "Confirm action",
    cancelAction: "Cancel action",
    
    // Media
    uploadImage: "Upload image",
    removeImage: "Remove image",
    playVideo: "Play video",
    pauseVideo: "Pause video",
    
    // Confession specific
    generateInsight: "Generate AI insight",
    viewInsight: "View insight",
    deleteConfession: "Delete confession",
    editConfession: "Edit confession",
    
    // Theme
    toggleTheme: "Toggle theme",
    darkMode: "Switch to dark mode",
    lightMode: "Switch to light mode",
  },
  es: {
    // Common actions
    close: "Cerrar",
    open: "Abrir",
    menu: "Menú",
    search: "Buscar",
    filter: "Filtrar",
    sort: "Ordenar",
    loading: "Cargando",
    
    // Social actions
    like: "Me gusta",
    unlike: "Quitar me gusta",
    comment: "Comentar",
    share: "Compartir",
    report: "Reportar",
    follow: "Seguir",
    unfollow: "Dejar de seguir",
    
    // Navigation
    home: "Inicio",
    profile: "Perfil",
    settings: "Configuración",
    notifications: "Notificaciones",
    messages: "Mensajes",
    back: "Volver",
    next: "Siguiente",
    previous: "Anterior",
    
    // Inputs
    searchInput: "Buscar confesiones",
    messageInput: "Escribe un mensaje",
    confessionInput: "Escribe tu confesión",
    commentInput: "Escribe un comentario",
    
    // Badges & Indicators
    vipBadge: "Miembro VIP",
    newNotification: "Nueva notificación",
    unreadMessages: "Mensajes no leídos",
    verifiedUser: "Usuario verificado",
    
    // Dialogs
    closeDialog: "Cerrar diálogo",
    confirmAction: "Confirmar acción",
    cancelAction: "Cancelar acción",
    
    // Media
    uploadImage: "Subir imagen",
    removeImage: "Eliminar imagen",
    playVideo: "Reproducir video",
    pauseVideo: "Pausar video",
    
    // Confession specific
    generateInsight: "Generar análisis de IA",
    viewInsight: "Ver análisis",
    deleteConfession: "Eliminar confesión",
    editConfession: "Editar confesión",
    
    // Theme
    toggleTheme: "Cambiar tema",
    darkMode: "Cambiar a modo oscuro",
    lightMode: "Cambiar a modo claro",
  },
  de: {
    // Common actions
    close: "Schließen",
    open: "Öffnen",
    menu: "Menü",
    search: "Suchen",
    filter: "Filtern",
    sort: "Sortieren",
    loading: "Lädt",
    
    // Social actions
    like: "Gefällt mir",
    unlike: "Gefällt mir nicht mehr",
    comment: "Kommentieren",
    share: "Teilen",
    report: "Melden",
    follow: "Folgen",
    unfollow: "Nicht mehr folgen",
    
    // Navigation
    home: "Startseite",
    profile: "Profil",
    settings: "Einstellungen",
    notifications: "Benachrichtigungen",
    messages: "Nachrichten",
    back: "Zurück",
    next: "Weiter",
    previous: "Zurück",
    
    // Inputs
    searchInput: "Beichten suchen",
    messageInput: "Nachricht eingeben",
    confessionInput: "Schreibe deine Beichte",
    commentInput: "Kommentar schreiben",
    
    // Badges & Indicators
    vipBadge: "VIP-Mitglied",
    newNotification: "Neue Benachrichtigung",
    unreadMessages: "Ungelesene Nachrichten",
    verifiedUser: "Verifizierter Benutzer",
    
    // Dialogs
    closeDialog: "Dialog schließen",
    confirmAction: "Aktion bestätigen",
    cancelAction: "Aktion abbrechen",
    
    // Media
    uploadImage: "Bild hochladen",
    removeImage: "Bild entfernen",
    playVideo: "Video abspielen",
    pauseVideo: "Video pausieren",
    
    // Confession specific
    generateInsight: "KI-Analyse generieren",
    viewInsight: "Analyse anzeigen",
    deleteConfession: "Beichte löschen",
    editConfession: "Beichte bearbeiten",
    
    // Theme
    toggleTheme: "Design wechseln",
    darkMode: "Zum Dunkelmodus wechseln",
    lightMode: "Zum Hellmodus wechseln",
  },
};

/**
 * Get aria-label for a specific key and language
 */
export const getAriaLabel = (key: keyof AriaLabels, language: Language = 'en'): string => {
  return ariaLabels[language][key] || ariaLabels.en[key];
};
