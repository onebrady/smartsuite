# Test Suite Documentation

## Overview

This project uses Vitest for unit and integration testing. The test suite is organized into three categories:

- **Unit Tests** (`tests/unit/`): Test individual functions and modules in isolation
- **Integration Tests** (`tests/integration/`): Test interactions between components (requires database)
- **E2E Tests** (`tests/e2e/`): End-to-end test scenarios for manual testing

## Running Tests

### Unit Tests

Unit tests can be run without a database. They test pure functions and logic:

```bash
# Run all unit tests
npm test

# Run specific test file
npm test tests/unit/transforms.test.ts

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

### Passing Tests

✅ **Transforms** (15 tests): All string, number, date, array, and type conversion transforms
✅ **Field Types** (15 tests): SmartSuite ↔ Webflow field type compatibility checks
✅ **Validator** (27 tests): Field validation, required fields, slug validation

### Skipped Tests

The following tests require environment setup and are currently skipped:

⏭️ **Crypto** - Requires valid DATA_ENCRYPTION_KEY
⏭️ **Webhook Security** - Requires environment configuration
⏭️ **Mapper** - Requires Prisma client
⏭️ **Queue Manager** - Requires database connection

### Integration Tests

Integration tests require a test database. To run them:

1. Set up test environment variables in `.env.test`:
```bash
cp .env.example .env.test
# Edit .env.test with test credentials
```

2. Run tests:
```bash
NODE_ENV=test npm test tests/integration/
```

**Note**: Integration tests are currently excluded from the default test run. They require:
- PostgreSQL test database
- Valid SmartSuite/Webflow test accounts
- Running application server

### End-to-End Tests

E2E tests are documented test scenarios in `tests/e2e/`. These are manual tests:

1. **Complete Sync Flow** (`complete-sync-flow.md`): Full webhook → event → Webflow sync
2. **Failed Event Recovery** (`failed-event-recovery.md`): Error handling and replay
3. **Rate Limiting** (`rate-limiting.md`): High-volume webhook testing
4. **Error Handling** (`error-handling.md`): Various error scenarios

To run E2E tests, follow the step-by-step instructions in each markdown file.

## Test Structure

```
tests/
├── unit/                      # Unit tests
│   ├── transforms.test.ts     # Transform functions
│   ├── field-types.test.ts    # Field type compatibility
│   ├── validator.test.ts      # Field validation
│   ├── crypto.test.ts         # Encryption (skipped)
│   ├── webhook-security.test.ts  # Webhook signature verification (skipped)
│   ├── mapper.test.ts         # Field mapping (skipped)
│   └── queue-manager.test.ts  # Queue management (skipped)
├── integration/               # Integration tests (require DB)
│   ├── event-processor.test.ts
│   └── webhook-ingress.test.ts
├── e2e/                       # E2E test scenarios
│   ├── complete-sync-flow.md
│   ├── failed-event-recovery.md
│   ├── rate-limiting.md
│   └── error-handling.md
├── setup.ts                   # Test environment setup
└── README.md                  # This file
```

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '@/lib/my-module';

describe('My Module', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### Integration Test Example

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/db';

describe('Integration Test', () => {
  let testData;

  beforeEach(async () => {
    // Set up test data
    testData = await prisma.model.create({ data: {...} });
  });

  afterEach(async () => {
    // Clean up
    await prisma.model.delete({ where: { id: testData.id } });
  });

  it('should work end-to-end', async () => {
    // Test implementation
  });
});
```

## Test Configuration

### Vitest Config

Configuration is in `vitest.config.ts`:

- Environment: Node.js
- Globals: Enabled (no need to import `describe`, `it`, `expect`)
- Setup Files: `tests/setup.ts`
- Integration tests excluded by default
- Coverage provider: v8

### Environment Variables

Test environment variables are set in `vitest.config.ts` and `tests/setup.ts`.

For integration tests, use `.env.test`:

```bash
# Database
DATABASE_URL=postgresql://...
DIRECT_DATABASE_URL=postgresql://...

# Test API credentials
# Use test accounts, not production!
```

## Test Coverage

Current coverage (unit tests only):

| Module | Coverage |
|--------|----------|
| lib/transforms.ts | 100% |
| lib/field-types.ts | 100% |
| lib/validator.ts | 100% |
| lib/mapper.ts | Skipped |
| lib/crypto.ts | Skipped |
| lib/queue-manager.ts | Skipped |

To generate coverage report:

```bash
npm test -- --coverage
open coverage/index.html
```

## Troubleshooting

### "Invalid environment variables" Error

Some tests require environment variables. If you see this error:

1. Check `vitest.config.ts` has all required env vars
2. For integration tests, create `.env.test` with valid credentials
3. Use `NODE_ENV=test` when running tests

### Database Connection Errors

Integration tests need a database:

1. Ensure PostgreSQL is running
2. Create test database: `createdb smartsuite_test`
3. Run migrations: `NODE_ENV=test npx prisma migrate dev`

### Tests Hanging

If tests hang:

1. Check for infinite loops or missing awaits
2. Ensure all async functions return promises
3. Use timeout parameter: `npm test -- --timeout=10000`

## CI/CD

For CI/CD pipelines, run only unit tests:

```bash
# In CI (GitHub Actions, etc.)
npm test -- --run
```

Integration and E2E tests should be run separately with proper test environment setup.

## Future Improvements

- [ ] Mock Prisma client for unit tests (allows testing mapper, crypto, etc.)
- [ ] Set up test database for integration tests
- [ ] Automate E2E tests with Playwright
- [ ] Add snapshot testing for UI components
- [ ] Improve coverage to >80% overall

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Testing Library](https://testing-library.com/)
