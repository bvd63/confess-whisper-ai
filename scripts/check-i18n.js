#!/usr/bin/env node

/**
 * i18n Completeness Checker
 * Validates that all translation keys exist in all supported languages
 * Run: node scripts/check-i18n.js
 */

import { translations, SUPPORTED_LANGUAGES } from '../src/i18n/translations.ts';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color, ...args) {
  console.log(color, ...args, COLORS.reset);
}

function validateTranslations() {
  log(COLORS.blue, '\n🔍 Checking i18n completeness...\n');

  const errors = [];
  const warnings = [];

  // Get all keys from each language
  const keysByLanguage = {};
  SUPPORTED_LANGUAGES.forEach(lang => {
    keysByLanguage[lang] = Object.keys(translations[lang]);
  });

  // Use English as reference
  const referenceKeys = keysByLanguage['en'];
  const referenceCount = referenceKeys.length;

  log(COLORS.blue, `📝 Reference (EN): ${referenceCount} keys`);

  // Check each language
  SUPPORTED_LANGUAGES.forEach(lang => {
    if (lang === 'en') return;

    const langKeys = keysByLanguage[lang];
    const langCount = langKeys.length;

    log(COLORS.blue, `📝 ${lang.toUpperCase()}: ${langCount} keys`);

    // Find missing keys
    const missing = referenceKeys.filter(key => !langKeys.includes(key));
    const extra = langKeys.filter(key => !referenceKeys.includes(key));

    if (missing.length > 0) {
      errors.push({
        language: lang,
        type: 'missing',
        keys: missing,
      });
    }

    if (extra.length > 0) {
      warnings.push({
        language: lang,
        type: 'extra',
        keys: extra,
      });
    }
  });

  // Report results
  console.log('\n' + '='.repeat(60));
  
  if (errors.length === 0 && warnings.length === 0) {
    log(COLORS.green, '\n✅ All translations are complete!\n');
    log(COLORS.green, `   Total keys: ${referenceCount}`);
    log(COLORS.green, `   Languages: ${SUPPORTED_LANGUAGES.join(', ').toUpperCase()}`);
    console.log('\n' + '='.repeat(60) + '\n');
    process.exit(0);
  }

  // Report errors
  if (errors.length > 0) {
    log(COLORS.red, '\n❌ Missing translations found:\n');
    
    errors.forEach(({ language, keys }) => {
      log(COLORS.red, `  ${language.toUpperCase()}:`);
      keys.forEach(key => {
        console.log(`    - ${key}`);
      });
      console.log('');
    });
  }

  // Report warnings
  if (warnings.length > 0) {
    log(COLORS.yellow, '⚠️  Extra translations found (not in EN):\n');
    
    warnings.forEach(({ language, keys }) => {
      log(COLORS.yellow, `  ${language.toUpperCase()}:`);
      keys.forEach(key => {
        console.log(`    - ${key}`);
      });
      console.log('');
    });
  }

  console.log('='.repeat(60) + '\n');

  if (errors.length > 0) {
    log(COLORS.red, '❌ Translation check FAILED');
    log(COLORS.red, `   ${errors.reduce((sum, e) => sum + e.keys.length, 0)} missing keys\n`);
    process.exit(1);
  }

  if (warnings.length > 0) {
    log(COLORS.yellow, '⚠️  Translation check passed with warnings');
    log(COLORS.yellow, `   ${warnings.reduce((sum, w) => sum + w.keys.length, 0)} extra keys\n`);
  }

  process.exit(0);
}

// Run validation
validateTranslations();
