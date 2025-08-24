module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Error prevention
    'no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    'no-console': 'off', // Allow console logs for server-side logging
    'no-debugger': 'error',
    'no-undef': 'error',
    
    // Code quality
    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    
    // Style (warnings, not errors)
    'indent': ['warn', 2],
    'quotes': ['warn', 'single', { avoidEscape: true }],
    'semi': ['warn', 'always'],
    'comma-dangle': ['error', 'always-multiline'], // Require trailing commas in multiline objects/arrays
    'no-trailing-spaces': 'warn',
    'eol-last': 'warn',
    
    // Additional syntax error prevention
    'object-curly-spacing': ['warn', 'always'],
    'comma-spacing': ['warn', { before: false, after: true }]
  },
  overrides: [
    {
      // Specific rules for test files
      files: ['tests/**/*.js', 'test/**/*.js'],
      rules: {
        'no-unused-vars': 'off' // Allow unused vars in tests (mocks, etc.)
      }
    },
    {
      // Specific rules for browser-side JavaScript
      files: ['public/**/*.js'],
      env: {
        browser: true,
        node: false
      }
    }
  ]
};