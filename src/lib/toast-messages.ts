import { toast } from "sonner";
import type { Language } from "@/i18n/translations";

interface ToastMessages {
  // Success messages
  confessionCreated: string;
  confessionDeleted: string;
  confessionReported: string;
  vipActivated: string;
  profileUpdated: string;
  imageSaved: string;
  commentPosted: string;
  
  // Error messages
  networkError: string;
  unauthorized: string;
  rateLimited: string;
  serverError: string;
  invalidInput: string;
  imageUploadFailed: string;
  
  // Info messages
  streakLost: string;
  maintenance: string;
  updateAvailable: string;
  offlineMode: string;
  
  // Loading messages
  creating: string;
  uploading: string;
  processing: string;
  loading: string;
}

const messages: Record<Language, ToastMessages> = {
  en: {
    // Success
    confessionCreated: "Your confession was shared anonymously! 💜",
    confessionDeleted: "Confession deleted successfully",
    confessionReported: "Report submitted. We'll review this confession. Thank you!",
    vipActivated: "VIP access activated! Enjoy premium features ✨",
    profileUpdated: "Profile updated successfully",
    imageSaved: "Image saved successfully",
    commentPosted: "Comment posted successfully",
    
    // Error
    networkError: "Network error. Please check your connection.",
    unauthorized: "You must be logged in to do this.",
    rateLimited: "Too many requests. Please wait a moment.",
    serverError: "Something went wrong. Please try again.",
    invalidInput: "Please check your input and try again.",
    imageUploadFailed: "Failed to upload image. Please try again.",
    
    // Info
    streakLost: "Your streak was lost. Start a new one today!",
    maintenance: "Scheduled maintenance in progress. Some features may be limited.",
    updateAvailable: "A new version is available. Refresh to update.",
    offlineMode: "You're offline. Some features may not work.",
    
    // Loading
    creating: "Creating...",
    uploading: "Uploading...",
    processing: "Processing...",
    loading: "Loading...",
  },
  es: {
    // Success
    confessionCreated: "¡Tu confesión fue compartida de forma anónima! 💜",
    confessionDeleted: "Confesión eliminada exitosamente",
    confessionReported: "Reporte enviado. Revisaremos esta confesión. ¡Gracias!",
    vipActivated: "¡Acceso VIP activado! Disfruta de las funciones premium ✨",
    profileUpdated: "Perfil actualizado exitosamente",
    imageSaved: "Imagen guardada exitosamente",
    commentPosted: "Comentario publicado exitosamente",
    
    // Error
    networkError: "Error de red. Verifica tu conexión.",
    unauthorized: "Debes estar autenticado para hacer esto.",
    rateLimited: "Demasiadas solicitudes. Espera un momento.",
    serverError: "Algo salió mal. Inténtalo de nuevo.",
    invalidInput: "Verifica tu entrada e inténtalo de nuevo.",
    imageUploadFailed: "Error al subir la imagen. Inténtalo de nuevo.",
    
    // Info
    streakLost: "Tu racha se perdió. ¡Comienza una nueva hoy!",
    maintenance: "Mantenimiento programado en curso. Algunas funciones pueden estar limitadas.",
    updateAvailable: "Una nueva versión está disponible. Actualiza para obtenerla.",
    offlineMode: "Estás desconectado. Algunas funciones pueden no funcionar.",
    
    // Loading
    creating: "Creando...",
    uploading: "Subiendo...",
    processing: "Procesando...",
    loading: "Cargando...",
  },
  de: {
    // Success
    confessionCreated: "Deine Beichte wurde anonym geteilt! 💜",
    confessionDeleted: "Beichte erfolgreich gelöscht",
    confessionReported: "Meldung eingereicht. Wir werden diese Beichte überprüfen. Danke!",
    vipActivated: "VIP-Zugang aktiviert! Genieße Premium-Funktionen ✨",
    profileUpdated: "Profil erfolgreich aktualisiert",
    imageSaved: "Bild erfolgreich gespeichert",
    commentPosted: "Kommentar erfolgreich gepostet",
    
    // Error
    networkError: "Netzwerkfehler. Bitte überprüfe deine Verbindung.",
    unauthorized: "Du musst angemeldet sein, um dies zu tun.",
    rateLimited: "Zu viele Anfragen. Bitte warte einen Moment.",
    serverError: "Etwas ist schief gelaufen. Bitte versuche es erneut.",
    invalidInput: "Bitte überprüfe deine Eingabe und versuche es erneut.",
    imageUploadFailed: "Bild-Upload fehlgeschlagen. Bitte versuche es erneut.",
    
    // Info
    streakLost: "Deine Serie wurde unterbrochen. Starte heute eine neue!",
    maintenance: "Geplante Wartung im Gange. Einige Funktionen können eingeschränkt sein.",
    updateAvailable: "Eine neue Version ist verfügbar. Aktualisiere, um sie zu erhalten.",
    offlineMode: "Du bist offline. Einige Funktionen funktionieren möglicherweise nicht.",
    
    // Loading
    creating: "Wird erstellt...",
    uploading: "Wird hochgeladen...",
    processing: "Wird verarbeitet...",
    loading: "Lädt...",
  },
};

/**
 * Standardized toast notification helpers
 */
export const showToast = {
  // Success toasts
  success: (key: keyof ToastMessages, language: Language = 'en') => {
    toast.success(messages[language][key]);
  },
  
  // Error toasts
  error: (key: keyof ToastMessages, language: Language = 'en') => {
    toast.error(messages[language][key]);
  },
  
  // Info toasts
  info: (key: keyof ToastMessages, language: Language = 'en') => {
    toast.info(messages[language][key]);
  },
  
  // Loading toasts
  loading: (key: keyof ToastMessages, language: Language = 'en') => {
    return toast.loading(messages[language][key]);
  },
  
  // Custom toast
  custom: (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    toast[type](message);
  },
};

// Export messages for direct access if needed
export { messages };
