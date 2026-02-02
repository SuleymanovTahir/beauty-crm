import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '../../src/components/ui';
import { useAuthStore } from '../../src/store/authStore';
import { authApi } from '../../src/api/auth';
import { Colors } from '../../src/constants/colors';

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const verifyEmail = useAuthStore((state) => state.verifyEmail);
  const colors = Colors.light;

  const handleVerify = async () => {
    if (!code.trim()) {
      Alert.alert('Ошибка', 'Введите код подтверждения');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyEmail(code.trim());

      if (result.success) {
        Alert.alert('Успешно', 'Email подтверждён!', [
          { text: 'OK', onPress: () => router.replace('/') },
        ]);
      } else {
        Alert.alert('Ошибка', result.message || 'Неверный код');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      Alert.alert('Ошибка', 'Email не указан');
      return;
    }

    setResending(true);
    try {
      const result = await authApi.resendVerification(email);

      if (result.success) {
        Alert.alert('Успешно', 'Код отправлен повторно');
      } else {
        Alert.alert('Ошибка', result.message || 'Не удалось отправить код');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Произошла ошибка');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Подтверждение Email</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Мы отправили код подтверждения на{'\n'}
            <Text style={{ fontWeight: '600' }}>{email}</Text>
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Код подтверждения"
            placeholder="Введите код из письма"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />

          <Button onPress={handleVerify} loading={loading} style={styles.verifyButton}>
            Подтвердить
          </Button>

          <Button
            variant="ghost"
            onPress={handleResend}
            loading={resending}
            style={styles.resendButton}
          >
            Отправить код повторно
          </Button>
        </View>

        <Button variant="outline" onPress={() => router.back()} style={styles.backButton}>
          Назад
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    marginBottom: 24,
  },
  verifyButton: {
    marginBottom: 16,
  },
  resendButton: {
    marginBottom: 8,
  },
  backButton: {
    marginTop: 'auto',
  },
});
