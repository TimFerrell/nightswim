# Comprehensive Test Suite

This directory contains a comprehensive test suite designed to achieve **90+% code coverage** with **request/response validations** and **security testing**. All tests must pass before deployment to Vercel.

## 🎯 **Test Coverage Goals**

- **Lines**: 90%+
- **Functions**: 90%+
- **Branches**: 90%+
- **Statements**: 90%+

## 📁 **Test Structure**

```
tests/
├── services/                 # Service layer tests
│   ├── poolDataParser.test.js
│   ├── influxDBService.test.js
│   ├── poolDataService.test.js
│   ├── HaywardSession.test.js
│   ├── weatherService.test.js
│   ├── timeSeriesService.test.js
│   ├── pumpStateTracker.test.js
│   └── sessionManager.test.js
├── routes/                   # API route tests
│   ├── poolRoutes.test.js
│   └── cronRoutes.test.js
├── middleware/               # Middleware tests
│   └── auth.test.js
├── utils/                    # Utility tests
│   ├── credentials.test.js
│   └── constants.test.js
├── integration/              # Integration tests
│   ├── api.test.js
│   └── end-to-end.test.js
├── ui-optimizations.test.js  # UI optimization tests
├── integration-test.html     # Browser integration tests
├── setup.js                  # Test environment setup
└── README.md                 # This file
```

## 🚀 **Running Tests**

### **Quick Start**
```bash
# Install dependencies
npm install

# Run all tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:services
npm run test:routes
npm run test:ui
```

### **Test Commands**

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run test:coverage` | Run tests with 90% coverage requirement |
| `npm run test:ci` | Run tests in CI mode (no watch) |
| `npm run test:services` | Run service layer tests |
| `npm run test:routes` | Run API route tests |
| `npm run test:ui` | Run UI optimization tests |
| `npm run test:all` | Run all test suites |
| `npm run validate` | Run linting + tests |

### **Pre-deployment Validation**
```bash
# Must pass before deployment
npm run validate
```

## 🧪 **Test Categories**

### **1. Service Layer Tests**
Tests for business logic and data processing:

- **poolDataParser.test.js**: HTML parsing and data extraction
- **influxDBService.test.js**: Database operations and queries
- **poolDataService.test.js**: Data collection and processing
- **HaywardSession.test.js**: Authentication and session management
- **weatherService.test.js**: External weather API integration
- **timeSeriesService.test.js**: In-memory data management
- **pumpStateTracker.test.js**: Pump state monitoring
- **sessionManager.test.js**: Session lifecycle management

### **2. API Route Tests**
Tests for HTTP endpoints with request/response validation:

- **poolRoutes.test.js**: Pool data API endpoints
- **cronRoutes.test.js**: Scheduled job endpoints

**Request/Response Validation:**
- ✅ Input validation (query params, body, headers)
- ✅ Response structure validation
- ✅ Error handling and status codes
- ✅ Security headers and CORS
- ✅ Performance under load
- ✅ Security vulnerability testing

### **3. Middleware Tests**
Tests for request processing middleware:

- **auth.test.js**: Authentication middleware

### **4. Utility Tests**
Tests for helper functions and constants:

- **credentials.test.js**: Credential management
- **constants.test.js**: Application constants

### **5. Integration Tests**
End-to-end testing:

- **api.test.js**: Full API workflow testing
- **end-to-end.test.js**: Complete user journey testing

### **6. UI Tests**
Frontend optimization testing:

- **ui-optimizations.test.js**: Performance optimizations
- **integration-test.html**: Browser-based testing

## 🔒 **Security Testing**

### **Input Validation**
- SQL injection prevention
- XSS attack prevention
- Path traversal prevention
- Malformed JSON handling
- Invalid data type handling

### **Authentication & Authorization**
- Session management
- Credential validation
- Access control testing
- Token validation

### **Data Protection**
- Sensitive data handling
- Encryption validation
- Secure communication testing

## 📊 **Coverage Requirements**

### **Minimum Coverage Thresholds**
```json
{
  "branches": 90,
  "functions": 90,
  "lines": 90,
  "statements": 90
}
```

### **Coverage Reports**
- **Text**: Console output
- **HTML**: Detailed browser report
- **LCOV**: CI/CD integration

## 🚦 **CI/CD Integration**

### **GitHub Actions Workflow**
- **Test Job**: Runs on Node.js 18.x and 20.x
- **Security Job**: Vulnerability scanning
- **Deploy Job**: Vercel deployment (only after tests pass)

### **Pre-deployment Checks**
1. ✅ Linting passes
2. ✅ All tests pass
3. ✅ 90%+ coverage achieved
4. ✅ Security audit passes
5. ✅ No vulnerabilities found

## 🛠 **Test Utilities**

### **Mocking Strategy**
- **Services**: Mock external dependencies
- **APIs**: Mock HTTP requests
- **Database**: Mock InfluxDB operations
- **Time**: Mock timestamps and intervals

### **Test Data**
- **Valid Data**: Normal operation scenarios
- **Invalid Data**: Error handling scenarios
- **Edge Cases**: Boundary conditions
- **Performance Data**: Large datasets

### **Environment Setup**
```javascript
// tests/setup.js
- Global test timeout: 10 seconds
- Mock console methods
- Mock fetch API
- Mock Chart.js
- Mock browser APIs
- Helper functions
```

## 📈 **Performance Testing**

### **Load Testing**
- Concurrent request handling
- Large dataset processing
- Memory usage monitoring
- Response time validation

### **Stress Testing**
- High-frequency requests
- Resource exhaustion scenarios
- Recovery testing

## 🔍 **Debugging Tests**

### **Verbose Output**
```bash
npm test -- --verbose
```

### **Watch Mode**
```bash
npm run test:watch
```

### **Single Test File**
```bash
npm test -- tests/services/poolDataParser.test.js
```

### **Coverage Analysis**
```bash
# Open HTML coverage report
open coverage/lcov-report/index.html
```

## 📝 **Writing New Tests**

### **Test Structure**
```javascript
describe('Component Name', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  describe('Method Name', () => {
    test('should handle valid input', () => {
      // Test implementation
    });

    test('should handle invalid input', () => {
      // Error handling test
    });
  });
});
```

### **Best Practices**
1. **Arrange-Act-Assert**: Clear test structure
2. **Descriptive Names**: Test names explain the scenario
3. **Isolation**: Tests don't depend on each other
4. **Mocking**: Mock external dependencies
5. **Validation**: Test both success and failure cases
6. **Coverage**: Aim for 100% coverage of new code

## 🚨 **Common Issues**

### **Test Failures**
1. **Mock Issues**: Check mock implementations
2. **Async Problems**: Ensure proper async/await usage
3. **Environment**: Verify test environment setup
4. **Dependencies**: Check for missing mocks

### **Coverage Issues**
1. **Uncovered Branches**: Add tests for conditional logic
2. **Uncovered Functions**: Test all public methods
3. **Uncovered Lines**: Ensure all code paths are tested

## 📞 **Support**

For test-related issues:
1. Check the test logs for detailed error messages
2. Verify the test environment setup
3. Ensure all dependencies are properly mocked
4. Review the coverage report for gaps

## 🎉 **Success Criteria**

A successful test run means:
- ✅ All tests pass
- ✅ 90%+ coverage achieved
- ✅ No security vulnerabilities
- ✅ Performance benchmarks met
- ✅ Ready for deployment 