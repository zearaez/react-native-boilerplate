import { createDrawerNavigator } from '@react-navigation/drawer';

import type { AppDrawerParamList } from '../../types';
import { SettingsScreen } from '../../features/settings/SettingsScreen';

import { AppTabsNavigator } from './AppTabsNavigator';

const Drawer = createDrawerNavigator<AppDrawerParamList>();

export function AppDrawerNavigator() {
  return (
    <Drawer.Navigator screenOptions={{ drawerPosition: 'right' }}>
      <Drawer.Screen
        name="Tabs"
        component={AppTabsNavigator}
        options={{ headerShown: false, title: 'App' }}
      />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}
