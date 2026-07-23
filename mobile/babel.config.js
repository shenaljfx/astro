module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    env: {
      production: {
        // Release bundles ship with all console.* stripped (errors kept for
        // crash triage) — dev logging stays untouched.
        plugins: [['transform-remove-console', { exclude: ['error'] }]],
      },
    },
  };
};
