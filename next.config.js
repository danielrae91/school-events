/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@upstash/redis']
  },
  // Add chunk loading error handling
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks.cacheGroups.default.minChunks = 1;
      config.optimization.splitChunks.cacheGroups.vendor = {
        name: 'vendor',
        test: /[\\/]node_modules[\\/]/,
        chunks: 'all',
        priority: 1
      };
    }
    return config;
  },
  // Handle chunk loading errors with automatic retry
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  }
}

module.exports = nextConfig
