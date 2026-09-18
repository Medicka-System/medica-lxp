/**
 * Preset de ESLint compartido (ESLint 8, config legacy).
 * Cada paquete lo extiende con `extends: ['@campus/config/eslint-preset']`.
 * TypeScript strict (§5): prohibido `any` sin justificación.
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
  },
  ignorePatterns: ['dist/', '.next/', 'node_modules/', 'coverage/', '.turbo/'],
};
