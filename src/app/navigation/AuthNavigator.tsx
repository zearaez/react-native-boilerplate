import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { AuthStackParamList } from '../../types';
import { SignInScreen } from '../../features/auth/SignInScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="SignIn" component={SignInScreen} />
    </Stack.Navigator>
  );
}
