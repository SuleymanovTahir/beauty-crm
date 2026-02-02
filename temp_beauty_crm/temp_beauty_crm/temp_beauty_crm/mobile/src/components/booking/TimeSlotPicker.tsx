import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../../constants/colors';

interface TimeSlot {
  time: string; // "09:00", "09:30", etc.
  available: boolean;
}

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedSlot?: string;
  onSelectSlot: (time: string) => void;
  showUnavailable?: boolean;
}

export function TimeSlotPicker({
  slots,
  selectedSlot,
  onSelectSlot,
  showUnavailable = true,
}: TimeSlotPickerProps) {
  const colors = Colors.light;

  // Group slots by hour for better visualization
  const groupedSlots = useMemo(() => {
    const groups: { [hour: string]: TimeSlot[] } = {};

    slots.forEach((slot) => {
      const hour = slot.time.split(':')[0];
      if (!groups[hour]) {
        groups[hour] = [];
      }
      groups[hour].push(slot);
    });

    return groups;
  }, [slots]);

  // Get time periods for section headers
  const getPeriodName = (hour: string): string => {
    const h = parseInt(hour);
    if (h < 12) return 'Утро';
    if (h < 17) return 'День';
    return 'Вечер';
  };

  // Group by period
  const periodGroups = useMemo(() => {
    const periods: { [period: string]: TimeSlot[] } = {
      'Утро': [],
      'День': [],
      'Вечер': [],
    };

    slots.forEach((slot) => {
      const hour = parseInt(slot.time.split(':')[0]);
      if (hour < 12) {
        periods['Утро'].push(slot);
      } else if (hour < 17) {
        periods['День'].push(slot);
      } else {
        periods['Вечер'].push(slot);
      }
    });

    return periods;
  }, [slots]);

  const renderSlot = (slot: TimeSlot) => {
    const isSelected = selectedSlot === slot.time;
    const isAvailable = slot.available;

    if (!isAvailable && !showUnavailable) {
      return null;
    }

    return (
      <TouchableOpacity
        key={slot.time}
        style={[
          styles.slot,
          {
            backgroundColor: isSelected
              ? colors.primary
              : isAvailable
              ? colors.surface
              : colors.background,
            borderColor: isSelected
              ? colors.primary
              : isAvailable
              ? colors.border
              : colors.border,
            opacity: isAvailable ? 1 : 0.5,
          },
        ]}
        onPress={() => isAvailable && onSelectSlot(slot.time)}
        disabled={!isAvailable}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.slotText,
            {
              color: isSelected
                ? '#FFFFFF'
                : isAvailable
                ? colors.text
                : colors.textSecondary,
            },
          ]}
        >
          {slot.time}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderPeriod = (periodName: string, periodSlots: TimeSlot[]) => {
    const availableCount = periodSlots.filter((s) => s.available).length;

    if (periodSlots.length === 0) {
      return null;
    }

    return (
      <View key={periodName} style={styles.periodSection}>
        <View style={styles.periodHeader}>
          <Text style={[styles.periodTitle, { color: colors.text }]}>
            {periodName}
          </Text>
          <Text style={[styles.periodCount, { color: colors.textSecondary }]}>
            {availableCount} свободно
          </Text>
        </View>
        <View style={styles.slotsGrid}>
          {periodSlots.map(renderSlot)}
        </View>
      </View>
    );
  };

  const availableCount = slots.filter((s) => s.available).length;

  if (slots.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Нет доступных слотов на эту дату
        </Text>
      </View>
    );
  }

  if (availableCount === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Все слоты на эту дату заняты
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {Object.entries(periodGroups).map(([period, periodSlots]) =>
        renderPeriod(period, periodSlots)
      )}
    </ScrollView>
  );
}

// Helper to generate time slots for a given schedule
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  intervalMinutes: number = 30,
  bookedSlots: string[] = []
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let currentMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  while (currentMinutes < endMinutes) {
    const hour = Math.floor(currentMinutes / 60);
    const min = currentMinutes % 60;
    const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

    slots.push({
      time: timeString,
      available: !bookedSlots.includes(timeString),
    });

    currentMinutes += intervalMinutes;
  }

  return slots;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingVertical: 8,
  },
  periodSection: {
    marginBottom: 20,
  },
  periodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  periodTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  periodCount: {
    fontSize: 13,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  slot: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    margin: 4,
    minWidth: 70,
    alignItems: 'center',
  },
  slotText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
