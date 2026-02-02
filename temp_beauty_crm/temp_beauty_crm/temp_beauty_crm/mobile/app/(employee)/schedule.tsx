import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bookingsApi } from '../../src/api/bookings';
import { Booking } from '../../src/types';
import { Colors } from '../../src/constants/colors';

export default function ScheduleScreen() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const colors = Colors.light;

  // Generate 7 days starting from today
  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  const fetchBookings = async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const data = await bookingsApi.getAll({ date: dateStr });
      setBookings(
        data
          .filter((b) => b.status !== 'cancelled')
          .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
      );
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchBookings();
  }, [selectedDate]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const formatDayOfWeek = (date: Date) => {
    return date.toLocaleDateString('ru-RU', { weekday: 'short' });
  };

  const formatDayNumber = (date: Date) => {
    return date.getDate().toString();
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Generate time slots for the day
  const timeSlots = Array.from({ length: 12 }, (_, i) => {
    const hour = 9 + i; // 9:00 - 20:00
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  const getBookingForSlot = (slotTime: string) => {
    return bookings.find((b) => {
      const bookingTime = formatTime(b.datetime);
      return bookingTime.startsWith(slotTime.slice(0, 2));
    });
  };

  const renderDateItem = (date: Date) => {
    const isSelected = isSameDay(date, selectedDate);
    const isToday = isSameDay(date, new Date());

    return (
      <TouchableOpacity
        key={date.toISOString()}
        style={[
          styles.dateItem,
          {
            backgroundColor: isSelected ? colors.primary : colors.surface,
          },
        ]}
        onPress={() => setSelectedDate(date)}
      >
        <Text
          style={[
            styles.dayOfWeek,
            { color: isSelected ? '#FFFFFF' : colors.textSecondary },
          ]}
        >
          {formatDayOfWeek(date)}
        </Text>
        <Text
          style={[
            styles.dayNumber,
            { color: isSelected ? '#FFFFFF' : colors.text },
          ]}
        >
          {formatDayNumber(date)}
        </Text>
        {isToday && (
          <View
            style={[
              styles.todayDot,
              { backgroundColor: isSelected ? '#FFFFFF' : colors.primary },
            ]}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Date selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.datesContainer}
      >
        {dates.map(renderDateItem)}
      </ScrollView>

      {/* Selected date display */}
      <Text style={[styles.selectedDateText, { color: colors.text }]}>
        {selectedDate.toLocaleDateString('ru-RU', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })}
      </Text>

      {/* Schedule Grid */}
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scheduleContainer}
      >
        {timeSlots.map((slot) => {
          const booking = getBookingForSlot(slot);

          return (
            <View key={slot} style={styles.timeSlotRow}>
              <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
                {slot}
              </Text>

              {booking ? (
                <TouchableOpacity
                  style={[styles.bookingSlot, { backgroundColor: colors.primaryLight }]}
                  onPress={() =>
                    router.push({
                      pathname: '/(employee)/bookings/[id]',
                      params: { id: booking.id.toString() },
                    })
                  }
                >
                  <Text style={[styles.bookingClient, { color: colors.primaryDark }]}>
                    {booking.name || 'Клиент'}
                  </Text>
                  <Text style={[styles.bookingService, { color: colors.primaryDark }]}>
                    {booking.service_name}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.emptySlot, { borderColor: colors.border }]} />
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  datesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateItem: {
    width: 56,
    height: 72,
    borderRadius: 12,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOfWeek: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  dayNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'capitalize',
  },
  scheduleContainer: {
    padding: 16,
  },
  timeSlotRow: {
    flexDirection: 'row',
    marginBottom: 8,
    minHeight: 60,
  },
  timeLabel: {
    width: 50,
    fontSize: 14,
    paddingTop: 8,
  },
  bookingSlot: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    marginLeft: 8,
  },
  bookingClient: {
    fontSize: 14,
    fontWeight: '600',
  },
  bookingService: {
    fontSize: 12,
    marginTop: 2,
  },
  emptySlot: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginLeft: 8,
  },
});
