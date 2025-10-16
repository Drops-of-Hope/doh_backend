// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  // Ignore compiled output
  { ignores: ['dist/'] },
  // JS recommended rules (scoped via files below to avoid linting dist)
  { ...js.configs.recommended, files: ['src//*.ts'] },
  // TypeScript recommended
  ...tseslint.configs.recommended,
  {
    files: ['src//*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
      // Node environment globals
      globals: {
        console: 'readonly',
        process: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off', // if you MUST use require()
      // Your custom rules
    },
  },
];