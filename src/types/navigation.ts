import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  SignIn: undefined;
};

export type AppTabsParamList = {
  Home: undefined;
};

export type AppDrawerParamList = {
  Tabs: NavigatorScreenParams<AppTabsParamList>;
  Settings: undefined;
};

export type RootNavigatorParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppDrawerParamList>;
};
