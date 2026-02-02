import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Booking, BookingStatus } from '../../types';
import { Colors } from '../../constants/colors';

interface BookingCardProps {
  booking: Booking;
  onPress?: () => void;
  onStatusChange?: (status: BookingStatus) => void;
  showActions?: boolean;
  compact?: boolean;
}

export function BookingCard({
  booking,
  onPress,
  onStatusChange,
  showActions = false,
  compact = false,
}: BookingCardProps) {
  const colors = Colors.light;

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
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isUpcoming =
    new Date(booking.datetime) > new Date() &&
    booking.status !== 'cancelled' &&
    booking.status !== 'completed';

  const canChangeStatus =
    booking.status !== 'cancelled' && booking.status !== 'completed';

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactCard, { backgroundColor: colors.surface }]}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <View style={styles.compactTime}>
          <Text style={[styles.timeText, { color: colors.primary }]}>
            {formatTime(booking.datetime)}
          </Text>
        </View>
        <View style={styles.compactContent}>
          <Text style={[styles.compactService, { color: colors.text }]} numberOfLines={1}>
            {booking.service_name}
          </Text>
          <Text style={[styles.compactClient, { color: colors.textSecondary }]} numberOfLines={1}>
            {booking.name || 'Клиент'}
          </Text>
        </View>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: getStatusColor(booking.status) },
          ]}
        />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.header}>
        <Text style={[styles.serviceName, { color: colors.text }]}>
          {booking.service_name}
        </Text>
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

      <Text style={[styles.dateTime, { color: colors.primary }]}>
        {formatDateTime(booking.datetime)}
      </Text>

      {booking.name && (
        <Text style={[styles.clientName, { color: colors.textSecondary }]}>
          {booking.name}
        </Text>
      )}

      {booking.master && (
        <Text style={[styles.masterName, { color: colors.textSecondary }]}>
          Мастер: {booking.master}
        </Text>
      )}

      {booking.revenue && (
        <Text style={[styles.revenue, { color: colors.text }]}>
          {booking.revenue.toLocaleString()} ₽
        </Text>
      )}

      {showActions && canChangeStatus && (
        <View style={styles.actions}>
          {booking.status === 'new' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => onStatusChange?.('confirmed')}
            >
              <Text style={styles.actionButtonText}>Подтвердить</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.success }]}
            onPress={() => onStatusChange?.('completed')}
          >
            <Text style={styles.actionButtonText}>Завершить</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
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
  clientName: {
    fontSize: 14,
    marginBottom: 2,
  },
  masterName: {
    fontSize: 14,
    marginBottom: 4,
  },
  revenue: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Compact styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  compactTime: {
    marginRight: 12,
  },
  timeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  compactContent: {
    flex: 1,
  },
  compactService: {
    fontSize: 14,
    fontWeight: '600',
  },
  compactClient: {
    fontSize: 12,
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
});
