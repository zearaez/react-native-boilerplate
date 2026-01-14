import { StyleSheet, Text, View } from 'react-native';

export function SignInScreen() {
  return (
    <View style={styles.container}>
      <Text>Sign In (placeholder)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
