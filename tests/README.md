# Manage Subscription Test Suite

Comprehensive automated QA suite for the Manage Subscription feature.

## Structure

```
tests/
├── fixtures/          # Test data and mock responses
│   ├── users/        # User subscription states
│   └── stripe/       # Stripe API responses and webhooks
├── helpers/          # Test utilities and mocks
├── unit/             # Unit tests (Vitest + RTL)
├── integration/      # Integration tests (Vitest + RTL)
├── e2e/              # End-to-end tests (Playwright)
└── README.md
```

## Running Tests

### All Tests
```bash
npm run test:ci
```

### Unit Tests
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

### With Coverage
```bash
npm run test -- --coverage
```

## Test Coverage

Targets 85%+ coverage for:
- Lines
- Branches
- Functions
- Statements

## Fixtures

### User States
- `free_user` - Free tier user
- `premium_monthly_active` - Premium monthly subscription
- `vip_monthly_active` - VIP monthly subscription
- `premium_year_active` - Premium yearly subscription
- `vip_year_active` - VIP yearly subscription
- `trial_premium_active` - Active trial user
- `canceled_at_period_end_premium` - Canceled subscription
- `pending_change_vip_to_premium` - Pending downgrade
- `delinquent_premium` - Past due payment

### Stripe Previews
- Upgrade previews (free → premium, premium → VIP)
- Downgrade previews (VIP → premium at period end)
- Yearly plans with savings calculations
- SCA required scenarios

### Stripe Webhooks
- Payment intent succeeded/failed
- Checkout session completed
- Invoice paid
- Subscription updated/deleted

## Key Test Scenarios

### Upgrades
- Immediate upgrades with proration
- Entitlement refresh
- Loading states
- Error handling

### Downgrades
- Scheduled at period end
- Exact date rendering (timezone-aware)
- Pending change indicators
- Conflict prevention

### Cancellations
- Cancel at period end
- Cancel immediately (with warnings)
- Reactivation
- Error handling

### Trial Edge Cases
- Trial status display
- Disabled downgrade during trial
- Tooltips for disabled actions
- Trial end date prominence

### Payment Updates
- Delinquent status warnings
- Payment Element integration
- Automatic retry after update
- Error handling

### SCA (Strong Customer Authentication)
- Detect when SCA required
- Display authentication prompt
- Handle success/failure
- Retry capability

## Accessibility

All tests include accessibility assertions:
- Focus trap
- Keyboard navigation
- ARIA attributes
- Screen reader compatibility
- No critical axe violations

## Internationalization

Tests verify:
- EN/ES/DE translations present
- Date/currency formatting per locale
- Localized error messages

## CI Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Pre-deployment

Playwright traces and screenshots saved on failure.
