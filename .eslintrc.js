module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:security/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier/@typescript-eslint',
    'plugin:prettier/recommended',
  ],
  env: {
    es6: true,
    node: true,
    jest: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 8,
    project: './tsconfig.eslint.json',
  },
  plugins: ['@typescript-eslint', 'security'],
};
