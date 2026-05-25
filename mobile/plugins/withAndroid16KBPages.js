const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Config plugin to enable 16 KB memory page size support for Android.
 * Required by Google Play for new app submissions / updates.
 * See: https://developer.android.com/guide/practices/page-sizes
 */
module.exports = function withAndroid16KBPages(config) {
  return withGradleProperties(config, (config) => {
    // Remove existing entry if present to avoid duplicates
    config.modResults = config.modResults.filter(
      (item) => !(item.type === 'property' && item.key === 'android.config.pageSize')
    );
    // Add 16KB page size property
    config.modResults.push({
      type: 'property',
      key: 'android.config.pageSize',
      value: '16384',
    });
    return config;
  });
};
