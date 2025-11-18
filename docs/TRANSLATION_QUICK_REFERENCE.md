# Translation System - Quick Reference

## 🚀 Quick Start

### Using Translations in Components

```tsx
import { useLanguage } from "@/contexts/LanguageContext";

function MyComponent() {
  const { t, language, setLanguage } = useLanguage();

  return (
    <div>
      <h1>{t.my_title}</h1>
      <p>{t.my_description}</p>
      <button>{t.button_save}</button>
    </div>
  );
}
```

---

## 📋 Common Translation Keys

### Navigation

```typescript
t.nav_home; // "Home" / "Inicio" / "Startseite"
t.nav_explore; // "Explore" / "Explorar" / "Erkunden"
t.nav_profile; // "Profile" / "Perfil" / "Profil"
t.nav_messages; // "Messages" / "Mensajes" / "Nachrichten"
t.nav_settings; // "Settings" / "Ajustes" / "Einstellungen"
```

### Common Actions

```typescript
t.common_save; // "Save"
t.common_cancel; // "Cancel"
t.common_delete; // "Delete"
t.common_edit; // "Edit"
t.common_close; // "Close"
t.common_confirm; // "Confirm"
t.common_back; // "Back"
t.common_next; // "Next"
```

### Status Messages

```typescript
t.common_success; // "Success"
t.common_error; // "Error"
t.common_loading; // "Loading..."
t.ui_loading; // "Loading..."
t.success_saved; // "Saved successfully"
t.error_generic; // "An error occurred"
```

### Authentication

```typescript
t.auth_signin; // "Sign In"
t.auth_signup; // "Sign Up"
t.auth_signout; // "Sign Out"
t.auth_email; // "Email"
t.auth_password; // "Password"
t.auth_forgot_password; // "Forgot Password?"
```

### Confessions

```typescript
t.confession_submit; // "Submit Confession"
t.confession_anonymous; // "Anonymous"
t.confession_content; // "Confession Content"
t.confession_edit; // "Edit Confession"
t.confession_delete; // "Delete Confession"
```

### Comments

```typescript
t.comments_add; // "Add Comment"
t.comments_reply; // "Reply"
t.comments_delete; // "Delete Comment"
t.comments_empty; // "No comments yet"
```

### Premium Features

```typescript
t.subscription_upgrade; // "Upgrade"
t.subs_manage; // "Manage Subscription"
t.premium_feature; // "Premium Feature"
t.trial_active; // "Trial Active"
```

---

## 🔄 Language Switching

### Programmatic Language Change

```tsx
const { setLanguage } = useLanguage();

// Change to Spanish
setLanguage("es");

// Change to German
setLanguage("de");

// Change to English
setLanguage("en");
```

### Using LanguageSelector Component

```tsx
import { LanguageSelector } from "@/components/LanguageSelector";

function MyHeader() {
  return (
    <header>
      <LanguageSelector />
    </header>
  );
}
```

---

## 🎨 Dynamic Content

### String Interpolation

```tsx
// For dynamic content, use string replacement
const count = 5;
const message = t.items_count_text.replace("{count}", count.toString());

// Example: "You have {count} items" -> "You have 5 items"
```

### Date Formatting

```tsx
const { language } = useLanguage();

const date = new Date();
const formatted = date.toLocaleDateString(
  language === "es" ? "es-ES" : language === "de" ? "de-DE" : "en-US",
);
```

---

## ✅ Form Validation

### Using i18n Validation

```tsx
import { useI18nValidation } from "@/lib/i18nValidation";
import { z } from "zod";

function MyForm() {
  const { getErrorMessage } = useI18nValidation();

  const schema = z.object({
    email: z.string().email(),
    content: z.string().min(10).max(500),
  });

  // Errors automatically translated
}
```

---

## 🐛 Troubleshooting

### Missing Translation Key

```tsx
// If a key is missing, it will show the key name
{
  t.nonexistent_key;
} // Shows: "nonexistent_key"

// Always check translations.ts for the correct key name
```

### Language Not Persisting

```tsx
// Language is saved to localStorage automatically
// If not persisting, check browser storage permissions
```

### TypeScript Errors

```tsx
// Make sure the key exists in types.ts
// If adding new keys, add to both types.ts and translations.ts
```

---

## 📝 Adding New Translations

### Step 1: Add to Types

```typescript
// src/i18n/types.ts
export interface Translations {
  // ... existing keys
  my_new_key: string;
}
```

### Step 2: Add to All Languages

```typescript
// src/i18n/translations.ts
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

### Step 3: Use in Component

```tsx
const { t } = useLanguage();
<p>{t.my_new_key}</p>;
```

---

## 🧪 Testing Translations

### Manual Testing

1. Change language using LanguageSelector
2. Navigate through all pages
3. Verify text updates correctly
4. Check form validation messages
5. Test error/success notifications

### E2E Testing

```typescript
// tests/e2e/i18n.spec.ts
test("displays in Spanish", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("language", "es");
  });

  await page.goto("/");
  // Verify Spanish text appears
});
```

---

## 💡 Best Practices

### DO ✅

- Always use translation keys for user-facing text
- Add keys to all three languages simultaneously
- Use descriptive key names
- Test in all languages before committing
- Keep translations concise

### DON'T ❌

- Don't hardcode user-facing strings
- Don't use generic key names like `text1`, `label2`
- Don't forget to add TypeScript types
- Don't mix languages in the same component
- Don't make translations too long

---

## 📚 Full Documentation

For complete documentation, see:

- `docs/TRANSLATION_SYSTEM.md` - Full system documentation
- `docs/TRANSLATION_IMPLEMENTATION_COMPLETE.md` - Implementation details
- `docs/TRANSLATION_ACCEPTANCE_TESTS.md` - Testing checklist

---

**Last Updated:** 2025-01-22  
**Version:** 1.0.0
