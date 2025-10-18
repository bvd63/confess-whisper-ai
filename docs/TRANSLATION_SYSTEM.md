# Translation System Documentation

## Overview

ConfessAI supports 3 languages with a robust i18n system that ensures all user-facing content is properly translated.

## Supported Languages

- **English (en)** - Default language
- **Spanish (es)** - Español
- **German (de)** - Deutsch

## Architecture

### Core Components

1. **LanguageContext** (`src/contexts/LanguageContext.tsx`)
   - Manages current language state
   - Provides translation function `t`
   - Automatically detects browser language
   - Persists language preference in localStorage

2. **Translation Files** (`src/i18n/translations.ts`)
   - Contains all translation keys for all languages
   - Organized by feature/domain
   - Type-safe with TypeScript

3. **i18n Validation** (`src/lib/i18nValidation.ts`)
   - Integrates Zod validation with translations
   - Provides translated error messages
   - Supports parameter interpolation

## Usage

### In Components

```tsx
import { useLanguage } from '@/contexts/LanguageContext';

export const MyComponent = () => {
  const { t, language } = useLanguage();
  
  return (
    <div>
      <h1>{t.common_welcome}</h1>
      <p>{t.auth_login_subtitle}</p>
    </div>
  );
};
```

### With Form Validation

```tsx
import { useI18nValidation } from '@/lib/i18nValidation';
import { z } from 'zod';

export const MyForm = () => {
  const { getErrorMessage } = useI18nValidation();
  
  const schema = z.object({
    email: z.string().email(),
    content: z.string().min(10).max(1000)
  });
  
  try {
    schema.parse(formData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = getErrorMessage(error);
      toast.error(message);
    }
  }
};
```

## Best Practices

1. **Always Use Translation Keys** - Never hardcode strings
2. **Keep Translations Concise** - Max 100 chars for buttons/labels
3. **Use Consistent Naming** - Prefix by domain: `auth_`, `profile_`, `system_`
4. **Validate All Translations** - Run validation script before deployment

## Resources

- Translation validation script: `src/lib/i18nValidator.ts`
- Complete documentation: See inline comments in translation files
