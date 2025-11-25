const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for WASM files
config.resolver.assetExts.push('wasm');

// Configure resolver to properly handle WASM files
config.resolver.sourceExts = config.resolver.sourceExts.filter(ext => ext !== 'wasm');

// Add WASM to asset extensions but keep it out of source extensions
config.resolver.assetExts = [...config.resolver.assetExts, 'wasm'];

module.exports = config;
