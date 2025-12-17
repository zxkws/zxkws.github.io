const { getStylelintConfig } = require('@iceworks/spec');

const baseConfig = getStylelintConfig('react');

module.exports = {
  ...baseConfig,
  rules: {
    ...baseConfig.rules,
    // Keep consistent with existing CSS code style in this repo.
    indentation: 'tab',
    // Allow multi-line values (e.g. gradients) while still enforcing single-line spacing.
    'declaration-colon-space-after': 'always-single-line',
    // Global styles rely on IDs for root containers.
    'selector-max-id': null,
  },
};
