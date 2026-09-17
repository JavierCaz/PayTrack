// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // eslint-config-expo 56+ enables React Compiler rules as errors. These
      // set-state-in-effect occurrences are pre-existing async data-loading /
      // form-sync patterns; keep them surfaced as warnings until refactored.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]);
