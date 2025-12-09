const NodeEnvironment = require('jest-environment-node').default;

class CustomTestEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context);
  }

  async setup() {
    await super.setup();
    
    // Mock import.meta
    this.global.import = {
      meta: {
        url: 'file:///mock',
      },
    };
    
    // Mock __ExpoImportMetaRegistry
    this.global.__ExpoImportMetaRegistry = new Map();
    
    // Mock structuredClone
    this.global.structuredClone = (val) => JSON.parse(JSON.stringify(val));
    
    // Mock globalThis
    this.global.globalThis = this.global;
    
    // Mock setTimeout
    this.global.setTimeout = global.setTimeout;
    this.global.clearTimeout = global.clearTimeout;
  }

  async teardown() {
    await super.teardown();
  }
}

module.exports = CustomTestEnvironment;
