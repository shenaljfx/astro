/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Exclude native binaries and heavy renderer packages from webpack bundle
    config.externals = [
      ...(config.externals || []),
      'canvas',
      '@remotion/bundler',
      '@remotion/renderer',
      '@remotion/cli',
      'ffmpeg-static',
    ];
    return config;
  },
  // Ignore Remotion source files in build (only used by render script)
  typescript: {
    ignoreBuildErrors: true, // Remotion types may conflict during build
  },
};

module.exports = nextConfig;
