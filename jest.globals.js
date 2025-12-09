// Set up global variables for React Native testing
Object.defineProperty(global, '__DEV__', {
  value: true,
  writable: true,
});

// Mock console methods to reduce noise in tests
global.console.warn = jest.fn();
global.console.error = jest.fn();
