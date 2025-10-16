# Translation System - Acceptance Tests

This document provides step-by-step acceptance tests to verify that the translation system meets all requirements.

## ✅ Test 1: Atomic Language Switching

**Objective:** Verify that switching language updates every visible string in one render with no mixed UI.

**Steps:**
1. Open the application
2. Note the current language (check header, buttons, labels)
3. Click the language selector (globe icon)
4. Select a different language (e.g., switch from English to Spanish)
5. Observe the page reload

**Expected Result:**
- Page reloads completely
- **All** UI text updates to the new language atomically
- **Zero** mixed-language strings visible at any point
- No gradual/progressive updates - everything changes at once

**Pass Criteria:**
- ✅ All visible text is in the selected language
- ✅ No English text appears when Spanish is selected
- ✅ No Spanish text appears when German is selected
- ✅ Buttons, labels, placeholders, tooltips all match selected language

---

## ✅ Test 2: Language Persistence

**Objective:** Verify that selected language persists across page reloads and browser sessions.

**Steps:**
1. Select Spanish as the language
2. Wait for page reload
3. Hard refresh the page (Ctrl+R or Cmd+R)
4. Close the browser tab
5. Reopen the application in a new tab

**Expected Result:**
- Language remains Spanish after all operations
- No reset to default language

**Pass Criteria:**
- ✅ Selected language persists after refresh
- ✅ Selected language persists after closing/reopening tab
- ✅ localStorage contains correct language code

**Verification:**
```javascript
// In browser console
localStorage.getItem('language') // Should return 'es'
```

---

## ✅ Test 3: Unknown Language Coercion

**Objective:** Verify that unsupported language codes coerce to English.

**Steps:**
1. Open browser DevTools console
2. Clear current language:
   ```javascript
   localStorage.removeItem('language');
   ```
3. Set browser language to unsupported language (if possible):
   ```javascript
   // Or manually set invalid language
   localStorage.setItem('language', 'fr'); // French not supported
   ```
4. Reload the page

**Expected Result:**
- Application displays in English (fallback)
- Console logs no errors (development mode may show coercion)

**Pass Criteria:**
- ✅ French (fr) → coerces to English
- ✅ Portuguese (pt) → coerces to English  
- ✅ Italian (it) → coerces to English
- ✅ Any non-EN/ES/DE code → coerces to English

**Verification:**
```javascript
// After page reload
document.documentElement.lang // Should be 'en'
localStorage.getItem('language') // Should be 'en'
```

---

## ✅ Test 4: Browser Language Detection

**Objective:** Verify that first-time users get the correct language based on browser settings.

**Steps:**
1. Clear all localStorage:
   ```javascript
   localStorage.clear();
   ```
2. Set browser language preferences:
   - **Chrome/Edge:** chrome://settings/languages
   - **Firefox:** about:preferences#general → Language
3. Set browser language to:
   - Test A: Spanish (es-ES)
   - Test B: German (de-DE)
   - Test C: French (fr-FR) - unsupported
4. Reload page for each test

**Expected Result:**
- Test A: App displays in Spanish
- Test B: App displays in German
- Test C: App displays in English (coerced)

**Pass Criteria:**
- ✅ Supported browser languages (es, de) auto-detected
- ✅ Unsupported browser languages (fr, pt, etc.) → English
- ✅ Language saved to localStorage for future visits

---

## ✅ Test 5: Translation Completeness

**Objective:** Verify all UI elements use translations (no hardcoded strings).

**Steps:**
1. Open application in development mode
2. Open browser DevTools console
3. Look for validation messages from `i18nValidator`
4. Switch to each language (EN → ES → DE)
5. Navigate through all pages:
   - Home / Feed
   - Profile
   - Settings
   - Auth (Login/Signup)
   - Premium subscription modal
6. Interact with all dialogs/modals:
   - New confession
   - Deep insight
   - Report dialog
   - Help dialog

**Expected Result:**
- Console shows: `✅ Translation system validation passed`
- No warnings about missing keys
- All UI elements display translated text

**Pass Criteria:**
- ✅ No hardcoded English strings visible when other languages selected
- ✅ All buttons translated
- ✅ All labels translated
- ✅ All placeholders translated
- ✅ All error messages translated
- ✅ All success messages translated
- ✅ All tooltips/aria-labels translated

**Check these specific elements:**
- [ ] Navigation buttons (Home, Profile, etc.)
- [ ] "New Confession" button
- [ ] Confession placeholder text
- [ ] Submit button text
- [ ] AI response title
- [ ] Date formatting (should be locale-aware)
- [ ] Error messages in toasts
- [ ] Subscription plan names and features
- [ ] Settings dialog options
- [ ] Moderation panel (if admin)

---

## ✅ Test 6: No Leftover Assets

**Objective:** Verify no files/keys/locales exist outside EN/ES/DE.

**Steps:**
1. Search codebase for language references:
   ```bash
   # Search for unsupported language codes
   grep -r "ro\|fr\|pt\|it\|ja\|zh" src/ --include="*.ts" --include="*.tsx"
   ```
2. Check translations file:
   - Open `src/i18n/translations.ts`
   - Verify only `en`, `es`, `de` keys exist in `translations` object
3. Check edge functions:
   - Open `supabase/functions/ai-confession-response/index.ts`
   - Verify language whitelist: `['en', 'es', 'de']`
   - Open `supabase/functions/ai-moderation/index.ts`
   - Verify same whitelist

**Expected Result:**
- No references to other languages (Romanian, French, etc.)
- Clean codebase with only EN/ES/DE

**Pass Criteria:**
- ✅ No `ro`, `fr`, `pt`, `it`, `ja`, `zh` references in code
- ✅ `translations` object has exactly 3 keys: `en`, `es`, `de`
- ✅ Edge functions enforce same whitelist
- ✅ No unused locale files in project

---

## ✅ Test 7: Backend Language Synchronization

**Objective:** Verify edge functions respect UI language selection.

**Steps:**
1. Select Spanish as language
2. Create a new confession
3. Wait for AI response
4. Check that AI response is in Spanish
5. Switch to German
6. Create another confession
7. Check that AI response is in German

**Expected Result:**
- AI responses match selected UI language
- No English responses when other language is selected

**Pass Criteria:**
- ✅ AI response language matches UI language
- ✅ Edge function logs show correct language parameter
- ✅ Moderation messages (if triggered) in correct language

**Verification (in Edge Function logs):**
```
Processing confession with type: basic language: es
```

---

## ✅ Test 8: Date/Time Localization

**Objective:** Verify dates display in locale-aware format.

**Steps:**
1. Switch to English → check date format
2. Switch to Spanish → check date format
3. Switch to German → check date format
4. Check these locations:
   - Confession timestamps
   - Badge earned dates
   - Streak last confession date
   - Moderation panel dates
   - Comment dates

**Expected Result:**
- Dates format according to selected locale
- English: "Jan 15, 2025" or "1/15/2025"
- Spanish: "15 ene 2025" or "15/1/2025"
- German: "15. Jan 2025" or "15.1.2025"

**Pass Criteria:**
- ✅ Date format changes with language
- ✅ Month abbreviations translated
- ✅ No hardcoded date formats (like "2025-01-15" everywhere)

---

## ✅ Test 9: Strict Fallback to English

**Objective:** Verify missing translation keys fall back to English atomically.

**Steps:**
1. Open `src/i18n/translations.ts`
2. Temporarily remove one key from Spanish translations:
   ```typescript
   es: {
     // ... other keys
     // welcome_title: "Bienvenido...", // <- comment this out
   }
   ```
3. Save file
4. Select Spanish language
5. Navigate to page using that key
6. Check browser console

**Expected Result:**
- UI shows English text for missing key
- Console warning (dev mode):
  ```
  [i18n] Missing translation for key "welcome_title" in language "es". 
  Falling back to English.
  ```
- **No mixed languages** - just the one fallback key in English

**Pass Criteria:**
- ✅ Missing key displays English fallback
- ✅ Other Spanish keys still show Spanish
- ✅ Development warning logged
- ✅ No crash or blank text

**Cleanup:** Restore the commented key after testing.

---

## ✅ Test 10: Multiple Rapid Language Switches

**Objective:** Verify system handles rapid language switching without corruption.

**Steps:**
1. Rapidly switch languages: EN → ES → DE → EN → ES
2. Don't wait for full page reload between switches
3. Observe final state after all switches settle

**Expected Result:**
- No UI corruption
- Final language matches last selection
- No mixed language state

**Pass Criteria:**
- ✅ System remains stable
- ✅ Final UI matches last selected language
- ✅ No console errors
- ✅ localStorage has correct final language

---

## Summary Checklist

After running all tests, verify:

- [ ] **Test 1:** Atomic language switching (no mixed UI)
- [ ] **Test 2:** Language persistence across reloads
- [ ] **Test 3:** Unsupported languages coerce to English
- [ ] **Test 4:** Browser language auto-detection works
- [ ] **Test 5:** All UI uses translations (zero hardcoded strings)
- [ ] **Test 6:** No leftover non-EN/ES/DE assets
- [ ] **Test 7:** Backend respects UI language selection
- [ ] **Test 8:** Dates format according to locale
- [ ] **Test 9:** Missing keys fall back to English cleanly
- [ ] **Test 10:** Rapid switching doesn't corrupt state

---

## Reporting Issues

If any test fails:

1. **Document exact steps** to reproduce
2. **Capture screenshot** showing mixed language or error
3. **Check browser console** for errors/warnings
4. **Verify localStorage** state:
   ```javascript
   console.log(localStorage.getItem('language'));
   console.log(document.documentElement.lang);
   ```
5. **Check edge function logs** (if backend issue)

All tests must pass for 100% translation system compliance.
