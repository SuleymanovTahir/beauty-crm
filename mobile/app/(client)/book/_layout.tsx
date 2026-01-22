import { Stack } from 'expo-router';
import { Colors } from '../../../src/constants/colors';

export default function BookLayout() {
  const colors = Colors.light;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerBackTitle: 'Назад',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="master" options={{ title: 'Выбор мастера' }} />
      <Stack.Screen name="datetime" options={{ title: 'Дата и время' }} />
      <Stack.Screen name="confirm" options={{ title: 'Подтверждение' }} />
    </Stack>
  );
}
