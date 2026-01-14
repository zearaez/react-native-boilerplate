import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import type { AppTabsParamList } from '../../types';
import { HomeScreen } from '../../features/home/HomeScreen';

const Tabs = createBottomTabNavigator<AppTabsParamList>();

export function AppTabsNavigator() {
  return (
    <Tabs.Navigator>
      <Tabs.Screen name="Home" component={HomeScreen} />
    </Tabs.Navigator>
  );
}
