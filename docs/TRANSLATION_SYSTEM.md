# ConfessAI Translation System

Complete guide to the internationalization (i18n) system supporting English (EN), Spanish (ES), and German (DE).

## 🌍 Architecture

### Core Components

1. **LanguageContext** (`src/contexts/LanguageContext.tsx`)
   - Manages language state across the app
   - Provides `t` function for translations
   - Handles browser language detection
   - Persists language preference to localStorage

2. **Translation Files** (`src/i18n/translations.ts`)
   - Centralized translation keys
   - Organized by feature/component
   - Type-safe with TypeScript

3. **i18n Validation** (`src/lib/i18nValidation.ts`)
   - Zod integration for translated error messages
   - Parameter interpolation support

## 📝 Usage

### In Components

```tsx
import { useLanguage } from '@/contexts/LanguageContext';

function MyComponent() {
  const { t, language } = useLanguage();
  
  return (
    <div>
      <h1>{t.welcome_title}</h1>
      <p>{t.welcome_message}</p>
    </div>
  );
}
```

### With Form Validation

```tsx
import { useI18nValidation } from '@/lib/i18nValidation';
import { z } from 'zod';

function MyForm() {
  const { getErrorMessage } = useI18nValidation();
  
  const schema = z.object({
    email: z.string().email(),
    content: z.string().min(10).max(500),
  });
  
  // Errors automatically translated
}
```

## ✅ Translation Coverage

- **Total Keys**: 800+
- **Languages**: EN, ES, DE
- **Coverage**: 100% across all languages
- **Features Covered**:
  - Authentication flows
  - Confession CRUD
  - Comments & reactions
  - Communities
  - Messaging
  - Settings & preferences
  - Error messages
  - Success notifications
  - Empty states
  - Loading states

## 🔧 Adding New Translations

1. Add key to all three languages in `translations.ts`:

```typescript
export const translations = {
  en: {
    // ... existing keys
    my_new_key: "My new text",
  },
  es: {
    // ... existing keys
    my_new_key: "Mi nuevo texto",
  },
  de: {
    // ... existing keys
    my_new_key: "Mein neuer Text",
  },
};
```

2. Use in component:

```tsx
const { t } = useLanguage();
<p>{t.my_new_key}</p>
```

## 🧪 Testing

All UI flows should be tested in all three languages to ensure:
- No hardcoded strings
- Proper text length handling
- Correct pluralization
- Date/time formatting
- Number formatting

## 📋 Checklist for New Features

- [ ] All user-facing text uses translation keys
- [ ] Keys added to EN, ES, DE
- [ ] Tested in all three languages
- [ ] No layout breaks with longer text
- [ ] Form validation messages translated
- [ ] Empty states translated
- [ ] Loading states translated
- [ ] Error messages translated

---

*Last Updated: 2025-10-18*
