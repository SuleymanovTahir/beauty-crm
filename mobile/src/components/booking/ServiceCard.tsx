import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Service } from '../../types';
import { Colors } from '../../constants/colors';

interface ServiceCardProps {
  service: Service;
  selected?: boolean;
  onPress?: () => void;
  showPrice?: boolean;
  showDuration?: boolean;
  compact?: boolean;
}

export function ServiceCard({
  service,
  selected = false,
  onPress,
  showPrice = true,
  showDuration = true,
  compact = false,
}: ServiceCardProps) {
  const colors = Colors.light;

  const formatPrice = () => {
    if (service.min_price && service.max_price && service.min_price !== service.max_price) {
      return `${service.min_price} - ${service.max_price} ${service.currency}`;
    }
    return `${service.price} ${service.currency}`;
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes} мин`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`;
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.compactCard,
          {
            backgroundColor: selected ? colors.primaryLight : colors.surface,
            borderColor: selected ? colors.primary : 'transparent',
          },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.compactName,
            { color: selected ? colors.primaryDark : colors.text },
          ]}
          numberOfLines={1}
        >
          {service.name_ru || service.name}
        </Text>
        {showPrice && (
          <Text style={[styles.compactPrice, { color: colors.primary }]}>
            {formatPrice()}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: selected ? colors.primaryLight : colors.surface,
          borderColor: selected ? colors.primary : 'transparent',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Text
          style={[
            styles.name,
            { color: selected ? colors.primaryDark : colors.text },
          ]}
        >
          {service.name_ru || service.name}
        </Text>

        {service.description_ru && (
          <Text
            style={[styles.description, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {service.description_ru}
          </Text>
        )}

        <View style={styles.footer}>
          {showPrice && (
            <Text style={[styles.price, { color: colors.primary }]}>
              {formatPrice()}
            </Text>
          )}
          {showDuration && service.duration && (
            <Text style={[styles.duration, { color: colors.textSecondary }]}>
              {formatDuration(service.duration)}
            </Text>
          )}
        </View>

        {service.category && (
          <View style={[styles.categoryBadge, { backgroundColor: colors.border }]}>
            <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
              {service.category}
            </Text>
          </View>
        )}
      </View>

      {selected && (
        <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
          <Text style={styles.checkmarkText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
  },
  duration: {
    fontSize: 14,
  },
  categoryBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    alignSelf: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Compact styles
  compactCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    marginRight: 8,
    marginBottom: 8,
  },
  compactName: {
    fontSize: 14,
    fontWeight: '500',
  },
  compactPrice: {
    fontSize: 12,
    marginTop: 2,
  },
});
