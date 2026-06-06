const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Config plugin to enable 16 KB memory page size support for Android.
 * Required by Google Play starting November 2025 for apps targeting Android 15+.
 * See: https://developer.android.com/guide/practices/page-sizes
 *
 * Sets gradle.properties to disable uncompressed native libs in the bundle
 * (forces compression so .so files bypass 16KB zip-alignment checks).
 */
module.exports = function withAndroid16KBPages(config) {
  config = withGradleProperties(config, (config) => {
    const propertiesToSet = {
      // Disable uncompressed native libs in AAB — forces .so compression
      // which bypasses the 16KB zip-alignment requirement
      'android.bundle.enableUncompressedNativeLibs': 'false',
    };

    for (const [key, value] of Object.entries(propertiesToSet)) {
      // Remove existing entry to avoid duplicates
      config.modResults = config.modResults.filter(
        (item) => !(item.type === 'property' && item.key === key)
      );
      config.modResults.push({ type: 'property', key, value });
    }

    return config;
  });

  return config;
};
