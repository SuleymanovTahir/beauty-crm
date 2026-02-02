import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Employee } from '../../types';
import { Colors } from '../../constants/colors';

interface MasterCardProps {
  master: Employee;
  selected?: boolean;
  onPress?: () => void;
  showRating?: boolean;
  showSpecialization?: boolean;
  compact?: boolean;
}

export function MasterCard({
  master,
  selected = false,
  onPress,
  showRating = true,
  showSpecialization = true,
  compact = false,
}: MasterCardProps) {
  const colors = Colors.light;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
        {master.photo_url ? (
          <Image source={{ uri: master.photo_url }} style={styles.compactAvatar} />
        ) : (
          <View style={[styles.compactAvatarPlaceholder, { backgroundColor: colors.primary }]}>
            <Text style={styles.compactAvatarText}>
              {getInitials(master.full_name)}
            </Text>
          </View>
        )}
        <Text
          style={[
            styles.compactName,
            { color: selected ? colors.primaryDark : colors.text },
          ]}
          numberOfLines={1}
        >
          {master.full_name}
        </Text>
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
      {master.photo_url ? (
        <Image source={{ uri: master.photo_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{getInitials(master.full_name)}</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text
          style={[
            styles.name,
            { color: selected ? colors.primaryDark : colors.text },
          ]}
        >
          {master.full_name}
        </Text>

        {master.position && (
          <Text style={[styles.position, { color: colors.textSecondary }]}>
            {master.position}
          </Text>
        )}

        {showSpecialization && master.specialization && (
          <Text style={[styles.specialization, { color: colors.textSecondary }]}>
            {master.specialization}
          </Text>
        )}

        {master.years_of_experience && (
          <Text style={[styles.experience, { color: colors.textSecondary }]}>
            Опыт: {master.years_of_experience} лет
          </Text>
        )}

        {showRating && master.rating && (
          <View style={styles.ratingRow}>
            <Text style={styles.ratingStar}>⭐</Text>
            <Text style={[styles.ratingValue, { color: colors.text }]}>
              {master.rating.toFixed(1)}
            </Text>
            {master.reviews_count !== undefined && (
              <Text style={[styles.reviewsCount, { color: colors.textSecondary }]}>
                ({master.reviews_count} отзывов)
              </Text>
            )}
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
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  position: {
    fontSize: 14,
    marginTop: 2,
  },
  specialization: {
    fontSize: 14,
    marginTop: 2,
  },
  experience: {
    fontSize: 12,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingStar: {
    fontSize: 14,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  reviewsCount: {
    fontSize: 12,
    marginLeft: 4,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Compact styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    marginRight: 8,
    marginBottom: 8,
  },
  compactAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  compactAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  compactAvatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  compactName: {
    fontSize: 14,
    fontWeight: '500',
  },
});
