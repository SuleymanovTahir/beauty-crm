import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bookingsApi } from '../../src/api/bookings';
import { Booking, BookingStatus } from '../../src/types';
import { Colors } from '../../src/constants/colors';

export default function HistoryScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const colors = Colors.light;

  const fetchBookings = async () => {
    try {
      const data = await bookingsApi.getClientBookings();
      setBookings(data.sort((a, b) =>
        new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
      ));
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const handleCancel = (booking: Booking) => {
    Alert.alert(
      'Отменить запись?',
      `Вы уверены, что хотите отменить запись на "${booking.service_name}"?`,
      [
        { text: 'Нет', style: 'cancel' },
        {
          text: 'Да, отменить',
          style: 'destructive',
          onPress: async () => {
            try {
              await bookingsApi.cancelClientBooking(booking.id);
              fetchBookings();
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось отменить запись');
            }
          },
        },
      ]
    );
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isUpcoming = (booking: Booking) => {
    return (
      new Date(booking.datetime) > new Date() &&
      booking.status !== 'cancelled' &&
      booking.status !== 'completed'
    );
  };

  const renderBooking = ({ item }: { item: Booking }) => {
    const upcoming = isUpcoming(item);

    return (
      <View style={[styles.bookingCard, { backgroundColor: colors.surface }]}>
        <View style={styles.bookingHeader}>
          <Text style={[styles.serviceName, { color: colors.text }]}>
            {item.service_name}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + '20' },
            ]}
          >
            <Text
              style={[styles.statusText, { color: getStatusColor(item.status) }]}
            >
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        <Text style={[styles.dateTime, { color: colors.primary }]}>
          {formatDate(item.datetime)}
        </Text>

        {item.master && (
          <Text style={[styles.master, { color: colors.textSecondary }]}>
            Мастер: {item.master}
          </Text>
        )}

        {item.revenue && (
          <Text style={[styles.price, { color: colors.text }]}>
            {item.revenue.toLocaleString()} ₽
          </Text>
        )}

        {upcoming && (
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.error }]}
            onPress={() => handleCancel(item)}
          >
            <Text style={[styles.cancelButtonText, { color: colors.error }]}>
              Отменить запись
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const upcomingBookings = bookings.filter(isUpcoming);
  const pastBookings = bookings.filter((b) => !isUpcoming(b));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <FlatList
        data={bookings}
        renderItem={renderBooking}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          upcomingBookings.length > 0 ? (
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Все записи
            </Text>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                У вас пока нет записей
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Запишитесь на услугу в разделе "Записаться"
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  bookingCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateTime: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  master: {
    fontSize: 14,
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
