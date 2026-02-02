import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bookingsApi } from '../../../src/api/bookings';
import { TimeSlot } from '../../../src/types';
import { Colors } from '../../../src/constants/colors';

export default function SelectDateTimeScreen() {
  const { serviceKey, serviceName, masterId, masterName } = useLocalSearchParams<{
    serviceKey: string;
    serviceName: string;
    masterId: string;
    masterName: string;
  }>();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const colors = Colors.light;

  // Generate next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  useEffect(() => {
    const fetchSlots = async () => {
      setLoading(true);
      try {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const slots = await bookingsApi.getAvailableSlots(
          dateStr,
          serviceKey!,
          masterId ? parseInt(masterId) : undefined
        );
        setTimeSlots(slots);
      } catch (error) {
        console.error('Error fetching slots:', error);
        // Mock data for demo
        setTimeSlots([
          { time: '09:00', available: true },
          { time: '10:00', available: true },
          { time: '11:00', available: false },
          { time: '12:00', available: true },
          { time: '14:00', available: true },
          { time: '15:00', available: true },
          { time: '16:00', available: false },
          { time: '17:00', available: true },
          { time: '18:00', available: true },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [selectedDate, serviceKey, masterId]);

  const handleSelectTime = (time: string) => {
    const datetime = `${selectedDate.toISOString().split('T')[0]}T${time}:00`;

    router.push({
      pathname: '/(client)/book/confirm',
      params: {
        serviceKey: serviceKey!,
        serviceName: serviceName!,
        masterId: masterId || '',
        masterName: masterName!,
        datetime,
      },
    });
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
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Выберите дату и время</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Шаг 3 из 4 • {serviceName}
        </Text>
      </View>

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

      {/* Time slots */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.slotsContainer}>
          <View style={styles.slotsGrid}>
            {timeSlots.map((slot) => (
              <TouchableOpacity
                key={slot.time}
                style={[
                  styles.slotItem,
                  {
                    backgroundColor: slot.available ? colors.surface : colors.border,
                    opacity: slot.available ? 1 : 0.5,
                  },
                ]}
                onPress={() => slot.available && handleSelectTime(slot.time)}
                disabled={!slot.available}
              >
                <Text
                  style={[
                    styles.slotTime,
                    { color: slot.available ? colors.text : colors.textSecondary },
                  ]}
                >
                  {slot.time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {timeSlots.filter((s) => s.available).length === 0 && (
            <Text style={[styles.noSlotsText, { color: colors.textSecondary }]}>
              Нет свободного времени на эту дату
            </Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  datesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    paddingVertical: 12,
    textTransform: 'capitalize',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotsContainer: {
    padding: 16,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  slotItem: {
    width: '30%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  slotTime: {
    fontSize: 16,
    fontWeight: '600',
  },
  noSlotsText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 40,
  },
});
