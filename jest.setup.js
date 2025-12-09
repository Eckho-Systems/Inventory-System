// Import the jest-native matchers
import '@testing-library/jest-native/extend-expect';

// Mock expo winter runtime that causes import issues
jest.mock('expo/src/winter/runtime.native.ts', () => ({}), { virtual: true });
jest.mock('expo/src/winter/installGlobal.ts', () => ({}), { virtual: true });

// Mock import.meta for modules that use it
Object.defineProperty(global, 'import', {
  value: {
    meta: {
      url: 'file:///mock',
    },
  },
  writable: true,
});

// Also mock import.meta directly on global
global.import = {
  meta: {
    url: 'file:///mock',
  },
};

// Mock __ExpoImportMetaRegistry
global.__ExpoImportMetaRegistry = new Map();

// Mock structuredClone
global.structuredClone = jest.fn((val) => JSON.parse(JSON.stringify(val)));

// Mock window.confirm
global.window = {
  confirm: jest.fn(() => true),
};

// Mock timers
global.setTimeout = setTimeout;
global.clearTimeout = clearTimeout;

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-constants
jest.mock('expo-constants', () => ({
  manifest: {},
  sessionId: 'test-session-id',
  deviceName: 'Test Device',
  nativeAppVersion: '1.0.0',
  nativeBuildVersion: '1',
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: 'View',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  },
  useSegments: () => [],
  usePathname: () => '/',
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn(),
    executeSql: jest.fn(),
  })),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock Alert separately
jest.mock('react-native/Libraries/Alert/Alert.js', () => ({
  alert: jest.fn(),
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text, TextInput } = require('react-native');
  
  return {
    Button: ({ children, onPress, mode, style, ...props }) => 
      React.createElement(View, { 
        onPress, 
        style: [style, { backgroundColor: mode === 'contained' ? '#007AFF' : 'transparent' }],
        testID: props.testID || 'button',
        ...props 
      }, React.createElement(Text, { style: { color: mode === 'contained' ? 'white' : '#007AFF' } }, children)),
    
    Card: ({ children, style, ...props }) => 
      React.createElement(View, { style: [style, { backgroundColor: 'white', borderRadius: 8, padding: 16 }], ...props }, children),
    
    'Card.Content': ({ children, ...props }) => 
      React.createElement(View, { ...props }, children),
    
    Chip: ({ children, selected, onPress, style, ...props }) => 
      React.createElement(View, { 
        style: [style, { 
          backgroundColor: selected ? '#007AFF' : '#f0f0f0', 
          borderRadius: 16, 
          paddingHorizontal: 12, 
          paddingVertical: 6 
        }],
        onPress,
        testID: props.testID || 'chip',
        ...props 
      }, React.createElement(Text, { style: { color: selected ? 'white' : '#333', fontSize: 12 } }, children)),
    
    DataTable: {
      Header: ({ children, ...props }) => 
        React.createElement(View, { style: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 }, ...props }, children),
      
      Title: ({ children, ...props }) => 
        React.createElement(Text, { style: { flex: 1, fontWeight: 'bold', fontSize: 12 }, ...props }, children),
      
      Row: ({ children, ...props }) => 
        React.createElement(View, { style: { flexDirection: 'row', paddingVertical: 8 }, ...props }, children),
      
      Cell: ({ children, ...props }) => 
        React.createElement(View, { style: { flex: 1, paddingHorizontal: 4 }, ...props }, children),
    },
    
    Modal: ({ children, visible, onDismiss, ...props }) => 
      visible ? React.createElement(View, { style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }, ...props }, children) : null,
    
    Portal: ({ children }) => children,
    
    Text: ({ children, style, ...props }) => 
      React.createElement(Text, { style, ...props }, children),
    
    TextInput: ({ label, value, onChangeText, mode, keyboardType, maxLength, secureTextEntry, style, ...props }) => 
      React.createElement(TextInput, { 
        value, 
        onChangeText, 
        keyboardType, 
        maxLength, 
        secureTextEntry, 
        style: [style, { borderWidth: 1, borderColor: '#ddd', borderRadius: 4, padding: 8 }],
        placeholder: label,
        testID: props.testID || 'text-input',
        ...props 
      }),
    
    PaperProvider: ({ children }) => children,
  };
});
