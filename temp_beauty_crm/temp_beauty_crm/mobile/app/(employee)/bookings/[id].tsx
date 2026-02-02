import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../src/components/ui';
import { bookingsApi } from '../../../src/api/bookings';
import { Booking, BookingStatus } from '../../../src/types';
import { Colors } from '../../../src/constants/colors';

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const colors = Colors.light;

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const data = await bookingsApi.getById(parseInt(id!));
        setBooking(data);
      } catch (error) {
        console.error('Error fetching booking:', error);
        Alert.alert('Ошибка', 'Не удалось загрузить запись');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchBooking();
  }, [id]);

  const handleStatusChange = async (newStatus: BookingStatus) => {
    if (!booking) return;

    setUpdating(true);
    try {
      await bookingsApi.updateStatus(booking.id, newStatus);
      setBooking({ ...booking, status: newStatus });
      Alert.alert('Успешно', 'Статус обновлён');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось обновить статус');
    } finally {
      setUpdating(false);
    }
  };

  const handleCall = () => {
    if (booking?.phone) {
      Linking.openURL(`tel:${booking.phone}`);
    }
  };

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'new':
        return colors.info;
      case 'confirmed':
        return colors.primary;
      case 'completed':
        return colors.success;
      case 'cancelled':
        return colors.error;
      case 'no-show':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: BookingStatus) => {
    switch (status) {
      case 'new':
        return 'Новая';
      case 'confirmed':
        return 'Подтверждена';
      case 'completed':
        return 'Завершена';
      case 'cancelled':
        return 'Отменена';
      case 'no-show':
        return 'Неявка';
      default:
        return status;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          Запись не найдена
        </Text>
        <Button variant="outline" onPress={() => router.back()}>
          Назад
        </Button>
      </View>
    );
  }

  const canChangeStatus =
    booking.status !== 'cancelled' && booking.status !== 'completed';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Badge */}
        <View style={styles.statusSection}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(booking.status) + '20' },
            ]}
          >
            <Text
              style={[styles.statusText, { color: getStatusColor(booking.status) }]}
            >
              {getStatusText(booking.status)}
            </Text>
          </View>
        </View>

        {/* Main Info Card */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.serviceName, { color: colors.text }]}>
            {booking.service_name}
          </Text>
          <Text style={[styles.dateTime, { color: colors.primary }]}>
            {formatDateTime(booking.datetime)}
          </Text>
        </View>

        {/* Client Info */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
            Клиент
          </Text>
          <Text style={[styles.clientName, { color: colors.text }]}>
            {booking.name || 'Не указано'}
          </Text>
          {booking.phone && (
            <Button variant="outline" onPress={handleCall} style={styles.callButton}>
              Позвонить: {booking.phone}
            </Button>
          )}
        </View>

        {/* Master Info */}
        {booking.master && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
              Мастер
            </Text>
            <Text style={[styles.masterName, { color: colors.text }]}>
              {booking.master}
            </Text>
          </View>
        )}

        {/* Revenue */}
        {booking.revenue && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
              Стоимость
            </Text>
            <Text style={[styles.revenue, { color: colors.text }]}>
              {booking.revenue.toLocaleString()} ₽
            </Text>
          </View>
        )}

        {/* Notes */}
        {booking.notes && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
              Комментарий
            </Text>
            <Text style={[styles.notes, { color: colors.text }]}>
              {booking.notes}
            </Text>
          </View>
        )}

        {/* Status Actions */}
        {canChangeStatus && (
          <View style={styles.actionsSection}>
            <Text style={[styles.actionsTitle, { color: colors.text }]}>
              Изменить статус
            </Text>
            <View style={styles.actionsRow}>
              {booking.status === 'new' && (
                <Button
                  onPress={() => handleStatusChange('confirmed')}
                  loading={updating}
                  style={styles.actionButton}
                >
                  Подтвердить
                </Button>
              )}
              <Button
                variant="secondary"
                onPress={() => handleStatusChange('completed')}
                loading={updating}
                style={[styles.actionButton, { backgroundColor: colors.success }]}
              >
                Завершить
              </Button>
            </View>
            <View style={styles.actionsRow}>
              <Button
                variant="outline"
                onPress={() => handleStatusChange('no-show')}
                loading={updating}
                style={styles.actionButton}
                textStyle={{ color: colors.warning }}
              >
                Неявка
              </Button>
              <Button
                variant="outline"
                onPress={() =>
                  Alert.alert('Отменить запись?', 'Это действие нельзя отменить', [
                    { text: 'Нет', style: 'cancel' },
                    {
                      text: 'Да, отменить',
                      style: 'destructive',
                      onPress: () => handleStatusChange('cancelled'),
                    },
                  ])
                }
                loading={updating}
                style={styles.actionButton}
                textStyle={{ color: colors.error }}
              >
                Отменить
              </Button>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 16,
  },
  content: {
    padding: 16,
  },
  statusSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  serviceName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  dateTime: {
    fontSize: 16,
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
  },
  callButton: {
    marginTop: 12,
  },
  masterName: {
    fontSize: 18,
  },
  revenue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  notes: {
    fontSize: 16,
    lineHeight: 24,
  },
  actionsSection: {
    marginTop: 8,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
  },
});
