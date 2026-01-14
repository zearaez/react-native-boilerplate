import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { RootNavigatorParamList } from '../../types';

import { AppDrawerNavigator } from './AppDrawerNavigator';
import { AuthNavigator } from './AuthNavigator';

const RootStack = createNativeStackNavigator<RootNavigatorParamList>();

export function RootNavigator() {
  const isLoggedIn = false;

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <RootStack.Screen name="App" component={AppDrawerNavigator} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
}
