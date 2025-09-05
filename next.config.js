/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@upstash/redis']
  },
  // Add chunk loading error handling
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Ensure splitChunks exists and has cacheGroups
      if (!config.optimization.splitChunks) {
        config.optimization.splitChunks = {};
      }
      if (!config.optimization.splitChunks.cacheGroups) {
        config.optimization.splitChunks.cacheGroups = {};
      }
      
      // Set default cache group properties
      if (!config.optimization.splitChunks.cacheGroups.default) {
        config.optimization.splitChunks.cacheGroups.default = {};
      }
      config.optimization.splitChunks.cacheGroups.default.minChunks = 1;
      
      // Add vendor cache group
      config.optimization.splitChunks.cacheGroups.vendor = {
        name: 'vendor',
        test: /[\\/]node_modules[\\/]/,
        chunks: 'all',
        priority: 1
      };
    }
    return config;
  }
}

module.exports = nextConfig
