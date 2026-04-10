/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for algosdk buffer polyfills in Next.js 14
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("stream-browserify"),
      buffer: require.resolve("buffer"),
    };
    return config;
  },
};

module.exports = nextConfig;
