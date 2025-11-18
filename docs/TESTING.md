# Testing Guide

## Overview

This document outlines the testing strategy and setup for ConfessAI.

## Test Structure

### Unit Tests

Located in `tests/` directory:

- `stripe-integration.test.ts` - Stripe payment and subscription tests
- `onesignal-integration.test.ts` - Push notification integration tests

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Stripe Integration Tests

### Configuration Tests

- Validates Stripe price IDs are correctly configured
- Verifies checkout URL format and availability
- Ensures environment variables are properly loaded

### Checkout Flow Tests

- Tests checkout session creation with correct price IDs
- Validates error handling for failed checkout sessions
- Verifies proper response structure

### Subscription Management Tests

- **Upgrade Flow**: Tests immediate subscription upgrades to VIP tier
- **Downgrade Flow**: Tests scheduled downgrades at period end
- **Cancellation**: Tests subscription cancellation process

### Webhook Processing Tests

- **checkout.session.completed**: Validates new subscription creation
- **customer.subscription.updated**: Tests subscription status updates
- **customer.subscription.deleted**: Tests subscription cancellation handling

## OneSignal Integration Tests

### Initialization Tests

- Tests successful OneSignal SDK initialization
- Validates service worker registration
- Tests graceful failure handling

### Permission Management Tests

- Tests notification permission request flow
- Validates permission status checking
- Tests browser compatibility

### User Tracking Tests

- Tests user ID linking to OneSignal
- Validates tag sending for user segmentation
- Tests player ID retrieval

### Notification Preferences Tests

- Tests notification permission status retrieval
- Validates push notification enable/disable states

## Test Coverage Goals

### Current Coverage

- Stripe Integration: Configuration, Checkout, Management, Webhooks
- OneSignal Integration: Init, Permissions, User Tracking, Preferences

### Target Coverage

- Unit Tests: 80%+ coverage for critical paths
- Integration Tests: All payment and notification flows
- E2E Tests (Future): User journey testing with Playwright

## Best Practices

### Writing Tests

1. **Arrange-Act-Assert**: Follow AAA pattern for clear test structure
2. **Mocking**: Use Vitest mocks for external dependencies
3. **Isolation**: Each test should be independent and not rely on others
4. **Clarity**: Test names should clearly describe what is being tested

### Test Data

- Use consistent test fixtures
- Mock Stripe customer IDs: `cus_test123`
- Mock Stripe subscription IDs: `sub_test123`
- Mock OneSignal player IDs: `test-player-id-123`

### CI/CD Integration

Tests run automatically on:

- Pre-commit hooks (optional)
- Pull requests
- Main branch deployments

## Debugging Tests

### Common Issues

**Stripe Tests Failing**

```bash
# Check environment variables
echo $VITE_STRIPE_PRICE_VIP_MONTH_ID
echo $PRICE_VIP_MONTHLY

# Verify Stripe configuration
npm run test -- stripe-integration
```

**OneSignal Tests Failing**

```bash
# Check OneSignal App ID
echo $VITE_ONESIGNAL_APP_ID

# Run specific test file
npm run test -- onesignal-integration
```

### Verbose Output

```bash
# Run tests with detailed output
npm run test -- --reporter=verbose
```

## Future Enhancements

### Planned Test Additions

- [ ] E2E tests for complete user journeys
- [ ] Performance tests for API response times
- [ ] Load tests for concurrent user scenarios
- [ ] Security tests for RLS policies
- [ ] Accessibility tests with axe-core

### Test Infrastructure

- [ ] Visual regression testing
- [ ] Automated screenshot comparisons
- [ ] Database migration testing
- [ ] Edge function integration tests

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [OneSignal Testing](https://documentation.onesignal.com/docs/testing)

---

Last Updated: 2025-01-15
