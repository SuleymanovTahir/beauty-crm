import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '../../../src/components/ui';
import { bookingsApi } from '../../../src/api/bookings';
import { useAuthStore } from '../../../src/store/authStore';
import { Colors } from '../../../src/constants/colors';

export default function ConfirmBookingScreen() {
  const { serviceKey, serviceName, masterId, masterName, datetime } = useLocalSearchParams<{
    serviceKey: string;
    serviceName: string;
    masterId: string;
    masterName: string;
    datetime: string;
  }>();

  const user = useAuthStore((state) => state.user);
  const colors = Colors.light;

  const [phone, setPhone] = useState(user?.phone || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleConfirm = async () => {
    if (!phone.trim()) {
      Alert.alert('Ошибка', 'Введите номер телефона');
      return;
    }

    setLoading(true);
    try {
      await bookingsApi.createClientBooking({
        service_key: serviceKey!,
        datetime: datetime!,
        master_id: masterId ? parseInt(masterId) : undefined,
        phone: phone.trim(),
        notes: notes.trim() || undefined,
      });

      Alert.alert('Успешно!', 'Вы записаны на услугу', [
        {
          text: 'OK',
          onPress: () => router.replace('/(client)'),
        },
      ]);
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось создать запись. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Подтверждение записи</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Шаг 4 из 4
          </Text>
        </View>

        {/* Booking Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Услуга
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {serviceName}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Мастер
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {masterName}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Дата и время
            </Text>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>
              {formatDateTime(datetime!)}
            </Text>
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.form}>
          <Input
            label="Телефон для связи"
            placeholder="+7 999 123 45 67"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Input
            label="Комментарий (необязательно)"
            placeholder="Пожелания или дополнительная информация"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Confirm Button */}
        <View style={styles.footer}>
          <Button onPress={handleConfirm} loading={loading}>
            Подтвердить запись
          </Button>

          <Button
            variant="ghost"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            Изменить время
          </Button>
        </View>
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
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  summaryRow: {
    paddingVertical: 12,
  },
  summaryLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
  },
  form: {
    marginBottom: 24,
  },
  footer: {
    marginTop: 'auto',
  },
  backButton: {
    marginTop: 12,
  },
});
