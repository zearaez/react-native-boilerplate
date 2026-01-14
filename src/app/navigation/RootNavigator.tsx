import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { RootNavigatorParamList } from '../../types';

import { useMe } from '../../services/auth';

import { AppDrawerNavigator } from './AppDrawerNavigator';
import { AuthNavigator } from './AuthNavigator';

const RootStack = createNativeStackNavigator<RootNavigatorParamList>();

export function RootNavigator() {
  const { data, isLoading, isFetching, isError } = useMe();
  const isLoggedIn = Boolean(data?.user);

  if (isLoading || isFetching) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  // If /me fails for non-auth reasons (e.g. no backend running), keep the app usable
  // by falling back to the signed-out flow.
  if (isError) {
    return (
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      </RootStack.Navigator>
    );
  }

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

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
