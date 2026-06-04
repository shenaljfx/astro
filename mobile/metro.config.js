const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Workaround for Firebase SDK compatibility with Metro's package.json exports
// (enabled by default in React Native 0.79 / Expo SDK 53)
// See: https://github.com/expo/expo/discussions/36551
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
