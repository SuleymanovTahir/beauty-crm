import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useOffline } from '../../hooks/useOffline';
import { Colors } from '../../constants/colors';

interface OfflineIndicatorProps {
  showWhenOnline?: boolean;
}

export function OfflineIndicator({ showWhenOnline = false }: OfflineIndicatorProps) {
  const { isOnline, isConnected, pendingActions } = useOffline();
  const colors = Colors.light;

  // Don't show if online and showWhenOnline is false
  if (isOnline && isConnected && !showWhenOnline) {
    return null;
  }

  const hasPendingActions = pendingActions.length > 0;

  if (isOnline && isConnected && !hasPendingActions) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isOnline
            ? hasPendingActions
              ? colors.warning
              : colors.success
            : colors.error,
        },
      ]}
    >
      <Text style={styles.text}>
        {!isOnline
          ? 'Нет подключения к интернету'
          : !isConnected
          ? 'Ограниченное подключение'
          : hasPendingActions
          ? `Синхронизация (${pendingActions.length})...`
          : 'Подключено'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
