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

      // Best practices
      'no-unused-vars': 'error',
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',

      // ES6+ features
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',

      // Function and variable declarations
      'func-style': ['error', 'expression'],
      'no-use-before-define': 'error',

      // Object and array rules
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],

      // Control flow
      'no-else-return': 'error',
      'no-nested-ternary': 'error',

      // JSDoc rules
      'jsdoc/check-types': 'error',
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: true,
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true
          }
        }
      ],
      'jsdoc/require-param-type': 'error',
      'jsdoc/require-returns-type': 'error',
      'jsdoc/valid-types': 'error'
    }
  }
];
