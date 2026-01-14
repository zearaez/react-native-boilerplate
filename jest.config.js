module.exports = {
  preset: 'react-native',
  setupFiles: [
    '<rootDir>/node_modules/react-native-gesture-handler/jestSetup.js',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-drawer-layout|react-native-gesture-handler|react-native-reanimated|react-native-screens|react-native-safe-area-context|react-native-worklets|react-redux|@tanstack|use-sync-external-store|immer)/)',
  ],
};
