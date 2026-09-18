module.exports = {
  extends: [require.resolve('@campus/config/eslint-preset')],
  parserOptions: {
    ecmaFeatures: { jsx: true },
    tsconfigRootDir: __dirname,
  },
  env: {
    browser: true,
    node: true,
  },
};
