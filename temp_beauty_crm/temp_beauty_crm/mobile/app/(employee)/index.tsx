import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bookingsApi } from '../../src/api/bookings';
import { useAuthStore } from '../../src/store/authStore';
import { Booking, BookingStatus } from '../../src/types';
import { Colors } from '../../src/constants/colors';

export default function EmployeeDashboardScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const user = useAuthStore((state) => state.user);
  const colors = Colors.light;

  const today = new Date().toISOString().split('T')[0];

  const fetchBookings = async () => {
    try {
      const data = await bookingsApi.getAll({ date: today });
      setBookings(
        data.sort(
          (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
        )
      );
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

  const handleStatusChange = async (booking: Booking, newStatus: BookingStatus) => {
    try {
      await bookingsApi.updateStatus(booking.id, newStatus);
      fetchBookings();
    } catch (error) {
      console.error('Error updating status:', error);
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
        return 'Подтв.';
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderBooking = ({ item }: { item: Booking }) => {
    const isPast = new Date(item.datetime) < new Date();
    const canComplete =
      !isPast && (item.status === 'new' || item.status === 'confirmed');

    return (
      <TouchableOpacity
        style={[styles.bookingCard, { backgroundColor: colors.surface }]}
        onPress={() =>
          router.push({
            pathname: '/(employee)/bookings/[id]',
            params: { id: item.id.toString() },
          })
        }
      >
        <View style={styles.timeColumn}>
          <Text style={[styles.time, { color: colors.primary }]}>
            {formatTime(item.datetime)}
          </Text>
        </View>

        <View style={styles.bookingInfo}>
          <Text style={[styles.clientName, { color: colors.text }]}>
            {item.name || 'Клиент'}
          </Text>
          <Text style={[styles.serviceName, { color: colors.textSecondary }]}>
            {item.service_name}
          </Text>
          {item.phone && (
            <Text style={[styles.phone, { color: colors.textSecondary }]}>
              {item.phone}
            </Text>
          )}
        </View>

        <View style={styles.statusColumn}>
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

          {canComplete && (
            <TouchableOpacity
              style={[styles.completeButton, { backgroundColor: colors.success }]}
              onPress={() => handleStatusChange(item, 'completed')}
            >
              <Text style={styles.completeButtonText}>✓</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const upcomingCount = bookings.filter(
    (b) =>
      new Date(b.datetime) >= new Date() &&
      b.status !== 'cancelled' &&
      b.status !== 'completed'
  ).length;

  const completedCount = bookings.filter(
    (b) => b.status === 'completed'
  ).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.statValue, { color: colors.primaryDark }]}>
            {upcomingCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.primaryDark }]}>
            Предстоит
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {completedCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Завершено
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {bookings.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Всего
          </Text>
        </View>
      </View>

      {/* Bookings List */}
      <FlatList
        data={bookings}
        renderItem={renderBooking}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Нет записей на сегодня
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
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  bookingCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  timeColumn: {
    marginRight: 16,
  },
  time: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  bookingInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
  },
  serviceName: {
    fontSize: 14,
    marginTop: 2,
  },
  phone: {
    fontSize: 12,
    marginTop: 2,
  },
  statusColumn: {
    alignItems: 'flex-end',
    gap: 8,
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
  completeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
  },
});
