import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Client } from '../../types';
import { Colors } from '../../constants/colors';

interface ClientCardProps {
  client: Client;
  onPress?: () => void;
  onCall?: () => void;
  onMessage?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

export function ClientCard({
  client,
  onPress,
  onCall,
  onMessage,
  showActions = true,
  compact = false,
}: ClientCardProps) {
  const colors = Colors.light;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return '';
    // Simple formatting for Russian numbers
    if (phone.startsWith('+7') && phone.length === 12) {
      return `${phone.slice(0, 2)} (${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8, 10)}-${phone.slice(10)}`;
    }
    return phone;
  };

  const getLoyaltyBadge = () => {
    if (!client.loyalty_points) return null;

    let tier = 'Бронза';
    let tierColor = '#CD7F32';

    if (client.loyalty_points >= 1000) {
      tier = 'Золото';
      tierColor = '#FFD700';
    } else if (client.loyalty_points >= 500) {
      tier = 'Серебро';
      tierColor = '#C0C0C0';
    }

    return (
      <View style={[styles.loyaltyBadge, { backgroundColor: tierColor + '20' }]}>
        <Text style={[styles.loyaltyText, { color: tierColor }]}>{tier}</Text>
      </View>
    );
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactCard, { backgroundColor: colors.surface }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.compactAvatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.compactAvatarText}>
            {getInitials(client.full_name)}
          </Text>
        </View>
        <View style={styles.compactContent}>
          <Text style={[styles.compactName, { color: colors.text }]} numberOfLines={1}>
            {client.full_name}
          </Text>
          {client.phone && (
            <Text style={[styles.compactPhone, { color: colors.textSecondary }]}>
              {formatPhone(client.phone)}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
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
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{getInitials(client.full_name)}</Text>
        </View>
        <View style={styles.headerContent}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {client.full_name}
            </Text>
            {getLoyaltyBadge()}
          </View>
          {client.phone && (
            <Text style={[styles.phone, { color: colors.textSecondary }]}>
              {formatPhone(client.phone)}
            </Text>
          )}
          {client.email && (
            <Text style={[styles.email, { color: colors.textSecondary }]}>
              {client.email}
            </Text>
          )}
        </View>
      </View>

      {/* Stats row */}
      <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {client.total_visits || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            визитов
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {client.loyalty_points || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            баллов
          </Text>
        </View>
        {client.last_visit && (
          <>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {new Date(client.last_visit).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                посл. визит
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Actions */}
      {showActions && (onCall || onMessage) && (
        <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
          {onCall && client.phone && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.success + '15' }]}
              onPress={onCall}
              activeOpacity={0.7}
            >
              <Ionicons name="call" size={18} color={colors.success} />
              <Text style={[styles.actionText, { color: colors.success }]}>
                Позвонить
              </Text>
            </TouchableOpacity>
          )}
          {onMessage && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
              onPress={onMessage}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble" size={18} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>
                Написать
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Notes */}
      {client.notes && (
        <View style={[styles.notesSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>
            Заметки:
          </Text>
          <Text style={[styles.notesText, { color: colors.text }]} numberOfLines={2}>
            {client.notes}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    padding: 16,
  },
  avatar: {
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
  headerContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  loyaltyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  loyaltyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  phone: {
    fontSize: 14,
    marginTop: 2,
  },
  email: {
    fontSize: 13,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    marginVertical: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  notesSection: {
    padding: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  notesLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Compact styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  compactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  compactContent: {
    flex: 1,
    marginLeft: 12,
  },
  compactName: {
    fontSize: 15,
    fontWeight: '500',
  },
  compactPhone: {
    fontSize: 13,
    marginTop: 2,
  },
});
