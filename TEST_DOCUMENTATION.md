# Barq Cashier System - Test Suite Documentation

## Overview
This document describes the comprehensive test suite for the Barq Cashier system, a complete restaurant/café POS system with WhatsApp integration, inventory management, and reporting features.

## Test Structure

### 1. API Tests (`tests/api.test.js`)
Tests all REST API endpoints to ensure they respond correctly and handle various scenarios.

**Coverage:**
- Health Check
- Authentication (Register, Login)
- Products Management
- Orders Management
- Payments Processing
- Reports (Sales, Products, Summary)
- Stock Management
- Tables Management
- Customer API
- System Setup

**Run:**
```bash
npm test -- tests/api.test.js
```

### 2. Unit Tests (`tests/unit.test.js`)
Tests individual functions and utilities in isolation.

**Coverage:**
- Utility Functions
  - Phone number normalization for WhatsApp
  - Verification code generation
- Data Validation
  - Email validation
  - Price validation
  - Order items validation
- Business Logic
  - Order total calculation
  - Discount application
  - Tax calculation
- Error Handling
  - JSON parsing with error handling
  - Retry operation logic

**Run:**
```bash
npm test -- tests/unit.test.js
```

### 3. Integration Tests (`tests/integration.test.js`)
Tests how different system components work together.

**Coverage:**
- Product Management workflows
- Order Management workflows
- Payment Processing workflows
- User Management workflows
- Multi-step workflows (Order → Payment → Completion)
- Stock deduction with orders
- Data consistency and referential integrity
- Concurrent operation handling

**Run:**
```bash
npm test -- tests/integration.test.js
```

## Available Commands

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage report
```bash
npm run test:coverage
```

### Run specific test file
```bash
npm test -- tests/api.test.js
npm test -- tests/unit.test.js
npm test -- tests/integration.test.js
```

### Run tests matching a pattern
```bash
npm test -- --testNamePattern="payment"
npm test -- --testNamePattern="order"
```

## Test Results Interpretation

### Passing Tests ✓
- Green checkmark indicates the test passed successfully
- The API/function behaved as expected

### Failing Tests ✗
- Red X indicates test failure
- Check the error message for details about what went wrong
- Common issues:
  - API returned unexpected status code
  - Function returned wrong value
  - Validation failed

### Skipped Tests ⊘
- Tests may be skipped if dependencies are not available
- Ensure all required packages are installed: `npm install`

## Expected Test Coverage

### API Endpoints Coverage
- ✓ GET /api/health
- ✓ POST /api/auth/register
- ✓ POST /api/auth/login
- ✓ GET /api/products
- ✓ POST /api/products
- ✓ PUT /api/products/:id
- ✓ GET /api/orders
- ✓ POST /api/orders
- ✓ GET /api/orders/:id
- ✓ POST /api/payments
- ✓ GET /api/payments/:orderId
- ✓ GET /api/reports/sales
- ✓ GET /api/reports/products
- ✓ GET /api/reports/summary
- ✓ GET /api/stock/movements
- ✓ GET /api/stock/low-stock
- ✓ POST /api/stock/adjust
- ✓ GET /api/tables
- ✓ POST /api/customer/request-code
- ✓ POST /api/customer/verify-code
- ✓ POST /api/setup/create-tenant
- ✓ POST /api/setup/create-demo

### Utility Functions Coverage
- ✓ Phone normalization for WhatsApp
- ✓ Verification code generation
- ✓ Email validation
- ✓ Price validation
- ✓ Order calculation
- ✓ Discount application
- ✓ Tax calculation

## Continuous Integration

To run tests in CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm test

- name: Generate coverage
  run: npm run test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Troubleshooting

### Issue: Tests timeout
- **Solution:** Increase Jest timeout in jest.config.json
  ```json
  "testTimeout": 15000
  ```

### Issue: Module not found
- **Solution:** Ensure all dependencies are installed
  ```bash
  npm install
  ```

### Issue: Database connection errors
- **Solution:** Tests use mocked databases, ensure NODE_ENV=test

### Issue: Port already in use
- **Solution:** Kill existing process or use different port
  ```bash
  npm test -- --testTimeout=5000
  ```

## Best Practices

1. **Run tests before committing**
   ```bash
   npm test
   ```

2. **Keep tests isolated**
   - Each test should be independent
   - Use beforeEach/afterEach for setup/cleanup

3. **Write descriptive test names**
   - Use clear descriptions of what is being tested
   - Bad: `test('works')`
   - Good: `test('POST /api/orders should create a new order with items')`

4. **Test edge cases**
   - Empty arrays
   - Null values
   - Invalid inputs
   - Boundary conditions

5. **Maintain test coverage**
   - Aim for >80% code coverage
   - Run `npm run test:coverage` regularly
   - Review uncovered lines

## Performance Testing

For load testing the system:

```bash
# Using Apache Bench
ab -n 100 -c 10 http://localhost:3000/api/health

# Using autocannon
npx autocannon -d 10 http://localhost:3000/api/health
```

## Next Steps

1. Run the full test suite: `npm test`
2. Monitor coverage: `npm run test:coverage`
3. Fix any failing tests
4. Integrate into CI/CD pipeline
5. Add more tests for new features

## Support

For test-related issues:
- Check test output messages
- Review test documentation in each test file
- Ensure all dependencies are installed
- Verify database setup is correct
