const { withGradleProperties, withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Config plugin to enable 16 KB memory page size support for Android.
 * Required by Google Play for new app submissions / updates.
 * See: https://developer.android.com/guide/practices/page-sizes
 *
 * This plugin does two things:
 * 1. Sets android.config.pageSize=16384 in gradle.properties
 * 2. Adds linker flags (-Wl,-z,max-page-size=16384) for native libraries
 */
module.exports = function withAndroid16KBPages(config) {
  // Step 1: Gradle property for page size
  config = withGradleProperties(config, (config) => {
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

  // Step 2: Add linker flags for native library alignment
  config = withAppBuildGradle(config, (config) => {
    const linkerFlag = '-Wl,-z,max-page-size=16384';
    if (!config.modResults.contents.includes(linkerFlag)) {
      // Insert the packaging options and CMake linker args before the last closing brace
      const ndkBlock = `
android {
    packagingOptions {
        jniLibs {
            useLegacyPackaging = false
        }
    }
    defaultConfig {
        externalNativeBuild {
            cmake {
                arguments "-DCMAKE_SHARED_LINKER_FLAGS=-Wl,-z,max-page-size=16384"
            }
        }
    }
}
`;
      config.modResults.contents += ndkBlock;
    }
    return config;
  });

  return config;
};
