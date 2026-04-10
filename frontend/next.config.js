/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,

      fs: false,
      net: false,
      tls: false,

      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("stream-browserify"),
      buffer: require.resolve("buffer"),
      assert: require.resolve("assert"),              
      process: require.resolve("process/browser"),    
    };

    return config;
  },
};

module.exports = nextConfig;