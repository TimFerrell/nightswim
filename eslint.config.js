const js = require('@eslint/js');
const globals = require('globals');
const jsdoc = require('eslint-plugin-jsdoc');

module.exports = [
  js.configs.recommended,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      '*.min.js',
      'dist/**',
      'build/**',
      'pages/**'
    ]
  },
  // Browser-specific rules
  {
    files: ['public/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        Chart: 'readonly',
        annotationPlugin: 'readonly'
      }
    },
    rules: {
      'no-undef': 'error' // Stricter for browser files since we defined globals
    }
  },
  {
    plugins: {
      jsdoc
    },
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.browser
      }
    },
    rules: {
      // Code style and formatting
      'indent': ['error', 2],
      'linebreak-style': ['error', 'unix'],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'never'],
      'no-trailing-spaces': 'error',
      'eol-last': 'error',

      // Best practices - relaxed for pool monitoring app
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off', // Allow console logs for server/debugging
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-undef': 'warn', // Warn instead of error for Chart.js globals

      // ES6+ features
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'warn', // Warn instead of error
      'prefer-template': 'warn',

      // Function and variable declarations - relaxed
      'func-style': 'off', // Allow both function declarations and expressions
      'no-use-before-define': ['error', { functions: false, classes: true, variables: true }],

      // Object and array rules
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],

      // Control flow - relaxed
      'no-else-return': 'warn',
      'no-nested-ternary': 'warn',
      'no-const-assign': 'error',

      // JSDoc rules - relaxed for this project
      'jsdoc/check-types': 'warn',
      'jsdoc/require-jsdoc': 'off', // Turn off JSDoc requirements
      'jsdoc/require-param-type': 'off',
      'jsdoc/require-returns-type': 'off',
      'jsdoc/valid-types': 'warn'
    }
  }
];
