const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for WASM files
config.resolver.assetExts.push('wasm');

// Configure resolver to properly handle WASM files
config.resolver.sourceExts = config.resolver.sourceExts.filter(ext => ext !== 'wasm');

// Configure transformer for web compatibility and ES modules
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
  minifierConfig: {
    keep_fnames: true,
    mangle: false,
  },
};

// Configure server for better hot reloading
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Add headers to prevent caching issues
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return middleware(req, res, next);
    };
  },
};

// Configure resolver for ES modules
config.resolver = {
  ...config.resolver,
  alias: {
    ...config.resolver.alias,
  },
};

module.exports = config;
