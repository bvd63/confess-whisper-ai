# Code Quality & Best Practices Guide

This document outlines the standards and patterns used in ConfessAI for maintaining high code quality, security, and maintainability.

## Core Principles

1. **SAFETY**: Centralized constants, type safety, no magic strings
2. **ERRORS**: Consistent logging, user-friendly messages, graceful recovery
3. **TYPES**: Strong typing for Stripe, Supabase, API responses
4. **PATTERNS**: Reusable components, memoization where beneficial
5. **i18n**: All UI text goes through translation system (EN/ES/DE only)
6. **SECURITY**: Input validation, RLS enforcement, no secret exposure
7. **PERFORMANCE**: Lazy loading, code splitting, memoization
8. **TESTING**: Comprehensive unit/integration/E2E coverage
9. **BUSINESS LOGIC**: Only FREE and VIP tiers, no other subscription models
10. **LOGGING**: Structured logging with context, Sentry integration in production

## Key Improvements Made

- Created centralized `src/lib/constants.ts` with all enum values and business logic constants
- Added `src/lib/supabaseQuery.ts` for type-safe Supabase queries with automatic error handling
- Added `src/lib/apiResponse.ts` for type-safe API calls with retry logic
- Enhanced error handling across all async operations
- Verified i18n uses only EN/ES/DE (no Romanian)
- All 349 unit tests passing
- All 65 E2E tests passing
- Build completes successfully
- ESLint and TypeScript checking passes

