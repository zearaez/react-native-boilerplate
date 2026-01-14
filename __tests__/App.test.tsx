/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('../src/services/auth', () => ({
  useMe: () => ({
    data: null,
    isLoading: false,
    isFetching: false,
    isError: false,
  }),
  getMe: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

test('renders correctly', async () => {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<App />);
  });

  await ReactTestRenderer.act(() => {
    tree?.unmount();
  });
});
