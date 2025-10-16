# Translation System Documentation

## Overview

The Confess.AI application uses a centralized, atomic translation system that ensures the entire UI renders in a single language with no mixed strings.

## Supported Languages

**Whitelist:** Only these languages are supported:
- `en` - English (default/fallback)
- `es` - Spanish (Español)
- `de` - German (Deutsch)

Any other language code will automatically coerce to English.

## Architecture

### Single Source of Truth

The application maintains a single, global language state managed by `LanguageContext`:

```typescript
// src/contexts/LanguageContext.tsx
const { language, setLanguage, t } = useLanguage();
```

Language selection priority:
1. **localStorage** (`language` key) - User's saved preference
2. **Browser detection** - Automatic detection from `navigator.language`
3. **Default fallback** - English (`en`)

### Centralized Translations

All UI strings are defined in `src/i18n/translations.ts`:

```typescript
export const translations = {
  en: { /* English translations */ },
  es: { /* Spanish translations */ },
  de: { /* German translations */ }
};
```

### Strict Fallback Logic

When a translation key is missing:
1. The system attempts to use the selected language
2. If missing, it **atomically** falls back to English
3. In development mode, a console warning is logged
4. **Never** returns mixed-language strings in one render

```typescript
// Implemented in getTranslation() helper
const text = t.welcome_title; // Uses current language with EN fallback
```

## Usage in Components

### Reading Translations

Always use the `useLanguage` hook:

```tsx
import { useLanguage } from '@/contexts/LanguageContext';

const MyComponent = () => {
  const { t, language } = useLanguage();
  
  return (
    <div>
      <h1>{t.welcome_title}</h1>
      <p>{t.welcome_description}</p>
    </div>
  );
};
```

### Changing Language

Language changes trigger a full page reload for atomic synchronization:

```tsx
const { setLanguage } = useLanguage();

// This will reload the page with the new language
setLanguage('es');
```

### Date Formatting

Use locale-aware date formatting:

```tsx
const { language } = useLanguage();

const locale = language === 'es' ? 'es-ES' 
  : language === 'de' ? 'de-DE' 
  : 'en-US';

const formattedDate = date.toLocaleDateString(locale, { 
  month: 'short', 
  day: 'numeric' 
});
```

## Backend Integration

### Edge Functions

Edge functions accept a `language` parameter and enforce the same whitelist:

```typescript
// supabase/functions/ai-confession-response/index.ts
const SUPPORTED_LANGUAGES = ['en', 'es', 'de'];
const validLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : 'en';
```

Pass the current language when calling edge functions:

```typescript
const { language } = useLanguage();

await supabase.functions.invoke('ai-confession-response', {
  body: {
    confession: text,
    language, // Current UI language
    type: 'basic'
  }
});
```

## Rules & Best Practices

### ✅ DO

- **Always** use `t.key_name` for UI strings
- Use `useLanguage()` hook in every component that displays text
- Pass `language` parameter to all backend calls
- Use locale-aware formatting for dates/numbers
- Test language switching to ensure atomic updates

### ❌ DON'T

- **Never** hardcode strings directly in JSX
- Don't create component-level language state
- Don't mix languages in a single render
- Don't use language codes outside EN/ES/DE
- Don't forget to add new keys to all three languages

## Adding New Translations

When adding new UI text:

1. **Add the key** to the `Translations` type in `src/i18n/translations.ts`
2. **Add translations** for all three languages (en, es, de)
3. **Use the key** via `t.your_new_key` in components

```typescript
// 1. Add to type
type Translations = {
  // ... existing keys
  new_feature_title: string;
};

// 2. Add translations
export const translations = {
  en: {
    // ... existing translations
    new_feature_title: "New Feature"
  },
  es: {
    // ... existing translations
    new_feature_title: "Nueva Característica"
  },
  de: {
    // ... existing translations
    new_feature_title: "Neue Funktion"
  }
};

// 3. Use in component
const { t } = useLanguage();
<h1>{t.new_feature_title}</h1>
```

## Language Detection

Browser language detection with coercion:

```typescript
// Automatic on first load
const detected = navigator.language; // e.g., 'fr-FR'
const normalized = detected.slice(0, 2); // 'fr'
const validLang = ['en', 'es', 'de'].includes(normalized) 
  ? normalized 
  : 'en'; // Coerces to 'en'
```

## Atomic Render Guarantee

The system ensures atomic language switches:

1. User clicks language selector
2. `setLanguage()` updates localStorage
3. `window.location.reload()` triggers full page refresh
4. On mount, `LanguageProvider` reads the new language
5. All components render with the new language atomically
6. **Result:** Zero mixed-language frames

## Troubleshooting

### Missing Translation Warning

```
[i18n] Missing translation for key "some_key" in language "es". 
Falling back to English.
```

**Solution:** Add the missing key to the Spanish translations in `translations.ts`.

### Wrong Language Detected

If the wrong language is detected on first load:

1. Clear localStorage: `localStorage.removeItem('language')`
2. Reload the page
3. The system will re-detect from browser settings

### Mixed Language Display

If you see mixed languages:

1. Check all hardcoded strings are using `t.key`
2. Verify edge function calls include `language` parameter
3. Ensure no component maintains local language state
4. Test with page reload (not hot reload during development)

## Testing

Test the translation system:

```bash
# 1. Test English (default)
localStorage.setItem('language', 'en');
window.location.reload();

# 2. Test Spanish
localStorage.setItem('language', 'es');
window.location.reload();

# 3. Test German
localStorage.setItem('language', 'de');
window.location.reload();

# 4. Test invalid language (should fallback to EN)
localStorage.setItem('language', 'fr');
window.location.reload();

# 5. Test browser detection
localStorage.removeItem('language');
window.location.reload();
```

## Summary

✅ **Single source of truth** - `LanguageContext` manages global state  
✅ **Atomic renders** - Page reload ensures no mixed frames  
✅ **Strict whitelist** - Only EN/ES/DE, coerce others to EN  
✅ **Centralized translations** - All strings in `translations.ts`  
✅ **Fallback to English** - Never show missing keys or mixed languages  
✅ **Backend sync** - Edge functions use same language parameter  

This architecture guarantees a consistent, single-language user experience across the entire application.
