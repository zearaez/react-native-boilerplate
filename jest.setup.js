/* eslint-env jest */

jest.mock('react-native-worklets', () =>
  require('react-native-worklets/lib/module/mock'),
);

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');

  Reanimated.default.call = () => {};

  return Reanimated;
});

jest.mock('react-native-safe-area-context', () =>
  (() => {
    const actual = jest.requireActual('react-native-safe-area-context');
    const safeAreaMockModule = require('react-native-safe-area-context/jest/mock');
    const safeAreaMock = safeAreaMockModule.default ?? safeAreaMockModule;

    return {
      ...actual,
      ...safeAreaMock,
    };
  })(),
);
