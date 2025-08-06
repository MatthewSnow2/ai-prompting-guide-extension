module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Test patterns
  testMatch: [
    '<rootDir>/tests/**/*.spec.js',
    '<rootDir>/tests/**/*.test.js'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'background/**/*.js',
    'popup/**/*.js',
    'content/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**'
  ],
  
  coverageDirectory: 'coverage',
  
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Individual file thresholds
    './background/background.js': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './popup/popup.js': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Module mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  
  // Global configuration
  globals: {
    chrome: 'readonly',
    browser: 'readonly'
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Verbose output for debugging
  verbose: process.env.NODE_ENV === 'development',
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/.git/'
  ],
  
  // Performance optimization
  maxWorkers: '50%',
  
  // Custom test suites
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.spec.js']
    },
    {
      displayName: 'integration', 
      testMatch: ['<rootDir>/tests/integration/**/*.spec.js']
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/tests/e2e/**/*.spec.js'],
      testTimeout: 60000 // Longer timeout for E2E tests
    },
    {
      displayName: 'security',
      testMatch: ['<rootDir>/tests/security/**/*.spec.js']
    },
    {
      displayName: 'performance',
      testMatch: ['<rootDir>/tests/performance/**/*.spec.js']
    }
  ]
};