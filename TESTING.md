# Testing Guide for AI-Prompting-Guide-Extension

This document provides comprehensive information about the test automation setup for the Chrome extension.

## Test Structure

The test suite is organized into the following categories:

### 1. Unit Tests (`tests/unit/`)
- **Background Service Worker Tests** (`background.spec.js`)
  - Data loading and storage operations
  - Message handling and validation
  - Error handling and fallback mechanisms
  - User preference management
  - Advice generation and keyword extraction

- **Popup Interface Tests** (`popup.spec.js`)
  - UI component initialization
  - User interaction handling
  - Settings management
  - Chrome API integration
  - Error handling and recovery

- **Message Validation Tests** (`message-validation.spec.js`)
  - Input sanitization and XSS prevention
  - Message structure validation
  - Rate limiting implementation
  - Security boundary enforcement

### 2. Integration Tests (`tests/integration/`)
- **Chrome API Integration** (`chrome-apis.spec.js`)
  - Storage API operations and error handling
  - Runtime messaging and communication
  - Tabs API integration and permissions
  - Extension lifecycle management

- **Message Passing Tests** (`message-passing.spec.js`)
  - Background ↔ Content Script communication
  - Popup ↔ Background communication
  - Cross-component message flows
  - Error recovery and retry mechanisms

### 3. End-to-End Tests (`tests/e2e/`)
- **Extension Lifecycle** (`extension-lifecycle.spec.js`)
  - Installation and initialization
  - Popup workflows and user interactions
  - Content script injection and UI flows
  - Data persistence across sessions
  - Performance and memory usage

### 4. Security Tests (`tests/security/`)
- **XSS Prevention** (`xss-prevention.spec.js`)
  - HTML content sanitization
  - URL validation and sanitization
  - Event handler security
  - Content Security Policy compliance
  - Input validation edge cases

### 5. Performance Tests (`tests/performance/`)
- **Memory and DOM Operations** (`memory-dom.spec.js`)
  - Memory usage monitoring and leak detection
  - DOM manipulation performance
  - Event listener efficiency
  - Storage operation performance
  - Background script responsiveness

## Test Configuration

### Coverage Requirements
- **Global Coverage**: Minimum 80% for branches, functions, lines, and statements
- **Critical Files**: Background script requires 85% coverage
- **Security Functions**: 100% coverage for sanitization functions

### Performance Thresholds
- **Memory Usage**: Maximum 50MB during normal operation
- **Execution Time**: Operations must complete within 1 second
- **DOM Operations**: Maximum 1000 DOM nodes
- **Event Listeners**: Maximum 100 concurrent listeners

## Running Tests

### All Tests
```bash
npm test
```

### Test Categories
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# End-to-end tests only
npm run test:e2e

# Security tests only
npm run test:security

# Performance tests only
npm run test:performance
```

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html
```

### Watch Mode
```bash
# Run tests in watch mode during development
npm run test:watch
```

## Test Data and Fixtures

Test data is centralized in `tests/fixtures/test-data.js`:

- **Test Specialists**: Sample specialist configurations
- **Test Models**: Sample AI model configurations  
- **Test User Preferences**: Default user settings
- **Security Payloads**: XSS and injection test cases
- **Performance Config**: Performance test thresholds

## Mocking Strategy

### Chrome APIs
- **Location**: `tests/mocks/chrome-apis.js`
- **Coverage**: All Chrome extension APIs used by the extension
- **Features**: 
  - Realistic API behavior simulation
  - Error condition testing
  - Permission validation
  - Message passing simulation

### DOM APIs
- **Setup**: `tests/setup.js`
- **Mocked APIs**: ResizeObserver, MutationObserver, DOM manipulation
- **Security**: Input sanitization and XSS prevention testing

## Security Testing

### XSS Prevention
- HTML content sanitization
- JavaScript injection prevention
- Event handler validation
- URL scheme validation

### Input Validation
- User message sanitization
- Custom rule validation
- File path traversal prevention
- SQL injection prevention (for future database features)

### Content Security Policy
- Inline script prevention
- Unsafe-eval restriction
- Resource loading validation
- Nonce-based script execution

## Performance Testing

### Memory Management
- Memory leak detection
- Resource cleanup validation
- Garbage collection monitoring
- Memory pressure handling

### DOM Performance
- Element creation/update efficiency
- Event listener management
- Batch operation optimization
- Rendering performance

### Background Script
- Message processing throughput
- Concurrent operation handling
- Service worker lifecycle management
- Storage operation efficiency

## CI/CD Integration

### GitHub Actions
- **File**: `.github/workflows/test.yml`
- **Triggers**: Push to main/develop, Pull requests
- **Matrix Testing**: Node.js 18.x and 20.x
- **Stages**: Lint → Unit → Integration → Security → Performance → E2E

### Quality Gates
1. **Linting**: ESLint rules enforcement
2. **Unit Tests**: 80%+ coverage requirement
3. **Security Tests**: All security tests must pass
4. **Performance Tests**: Must meet performance thresholds
5. **E2E Tests**: Full workflow validation

## Development Workflow

### Test-Driven Development
1. Write failing tests for new features
2. Implement minimal code to pass tests
3. Refactor while maintaining test coverage
4. Add security and performance tests

### Pre-Commit Checks
```bash
# Lint code
npm run lint

# Run all tests
npm test

# Check coverage
npm run test:coverage
```

### Debugging Tests
```bash
# Run specific test file
npx jest tests/unit/background.spec.js

# Run tests with debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# Run tests in watch mode with coverage
npm run test:watch -- --coverage
```

## Common Testing Patterns

### Chrome Extension Testing
```javascript
// Mock Chrome APIs
const chromeMocks = new ChromeApiMocks();
global.chrome = chromeMocks.chrome;
chromeMocks.setupDefaultBehaviors();

// Test storage operations
chromeMocks.mockStorageWithData({
  'aiPromptingGuide_specialists': testSpecialists
});

// Test message passing
chromeMocks.chrome.runtime.sendMessage.callsFake((message, callback) => {
  callback({ success: true });
});
```

### Security Testing
```javascript
// Test XSS prevention
const maliciousInput = '<script>alert("XSS")</script>';
const sanitized = sanitizeHtmlContent(maliciousInput);
expect(sanitized).not.toContain('<script>');
```

### Performance Testing
```javascript
// Test memory usage
const initialMemory = performance.memory.usedJSHeapSize;
await performOperation();
const finalMemory = performance.memory.usedJSHeapSize;
expect(finalMemory - initialMemory).toBeLessThan(MAX_MEMORY_INCREASE);
```

## Troubleshooting

### Common Issues

1. **Chrome API Mocking Issues**
   - Ensure proper mock setup in `beforeEach`
   - Check for proper async/await usage
   - Verify mock responses match expected format

2. **E2E Test Failures**
   - Check for proper browser setup
   - Verify extension loading in test environment
   - Ensure adequate timeouts for operations

3. **Coverage Issues**
   - Check for uncovered error handling paths
   - Verify all public functions have tests
   - Review conditional logic coverage

### Debug Commands
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test pattern
npm test -- --testNamePattern="should handle"

# Run tests with coverage and open report
npm run test:coverage && open coverage/lcov-report/index.html
```

## Contributing

When adding new tests:

1. **Follow naming conventions**: Descriptive test names that explain expected behavior
2. **Use appropriate test category**: Unit, Integration, E2E, Security, or Performance  
3. **Include edge cases**: Error conditions, boundary values, malicious input
4. **Document complex tests**: Add comments explaining test purpose and approach
5. **Update coverage thresholds**: If adding new critical functionality

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Puppeteer Documentation](https://pptr.dev/)
- [Chrome Extension Testing Guide](https://developer.chrome.com/docs/extensions/mv3/tut_testing/)
- [Security Testing Best Practices](https://owasp.org/www-project-web-security-testing-guide/)

---

For questions or issues with the test suite, please create an issue in the repository with the `testing` label.