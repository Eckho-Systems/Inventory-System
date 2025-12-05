module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Handle import.meta syntax - this plugin only enables parsing
      '@babel/plugin-syntax-import-meta',
      // Custom plugin to transform import.meta usage
      './babel-plugin-import-meta-fix.js',
      // Transform import.meta to be compatible with older environments
      ['@babel/plugin-transform-runtime', {
        corejs: false,
        helpers: true,
        regenerator: true,
        useESModules: true, // Enable ES modules for import.meta support
      }],
      // Required for react-native-reanimated
      'react-native-reanimated/plugin',
    ],
    env: {
      web: {
        presets: ['babel-preset-expo'],
        plugins: [
          '@babel/plugin-syntax-import-meta',
          './babel-plugin-import-meta-fix.js',
          ['@babel/plugin-transform-runtime', {
            corejs: false,
            helpers: true,
            regenerator: true,
            useESModules: true, // Enable ES modules for web
          }],
          // Required for react-native-reanimated
          'react-native-reanimated/plugin',
        ],
      },
    },
  };
};
