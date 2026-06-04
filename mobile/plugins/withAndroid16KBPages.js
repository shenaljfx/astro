const { withGradleProperties, withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Config plugin to enable 16 KB memory page size support for Android.
 * Required by Google Play starting November 2025 for apps targeting Android 15+.
 * See: https://developer.android.com/guide/practices/page-sizes
 *
 * This plugin:
 * 1. Sets gradle properties to disable uncompressed native libs in the bundle
 *    (forces compression so .so files bypass 16KB zip-alignment checks)
 * 2. Adds CMake/ndk-build linker flags for 16KB ELF alignment of any
 *    native code compiled from source during the build
 */
module.exports = function withAndroid16KBPages(config) {
  // Step 1: Set gradle.properties for 16KB support
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

  // Step 2: Add linker flags for 16KB ELF alignment of natively compiled code
  config = withAppBuildGradle(config, (config) => {
    const marker = '// -- 16KB PAGE SIZE SUPPORT --';
    if (!config.modResults.contents.includes(marker)) {
      const block = `
${marker}
android {
    defaultConfig {
        externalNativeBuild {
            cmake {
                cppFlags "-Wl,-z,max-page-size=16384"
                arguments "-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON", "-DCMAKE_SHARED_LINKER_FLAGS=-Wl,-z,max-page-size=16384 -Wl,-z,common-page-size=16384"
            }
            ndkBuild {
                arguments "APP_SUPPORT_FLEXIBLE_PAGE_SIZES=true"
            }
        }
        ndk {
            abiFilters "arm64-v8a", "x86_64"
        }
    }
}
`;
      config.modResults.contents += block;
    }
    return config;
  });

  return config;
};
