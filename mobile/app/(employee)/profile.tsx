import { View, Text, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/ui';
import { useAuthStore } from '../../src/store/authStore';
import { Colors } from '../../src/constants/colors';

export default function EmployeeProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const colors = Colors.light;

  const handleLogout = () => {
    Alert.alert('Выход', 'Вы уверены, что хотите выйти?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const getRoleText = (role?: string) => {
    switch (role) {
      case 'director':
        return 'Директор';
      case 'admin':
        return 'Администратор';
      case 'manager':
        return 'Менеджер';
      case 'sales':
        return 'Продажи';
      case 'marketer':
        return 'Маркетолог';
      case 'employee':
        return 'Сотрудник';
      default:
        return role || 'Сотрудник';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          {user?.photo_url ? (
            <Image source={{ uri: user.photo_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <Text style={[styles.userName, { color: colors.text }]}>
            {user?.full_name || 'Сотрудник'}
          </Text>
          <Text style={[styles.userRole, { color: colors.primary }]}>
            {getRoleText(user?.role)}
          </Text>
          {user?.position && (
            <Text style={[styles.userPosition, { color: colors.textSecondary }]}>
              {user.position}
            </Text>
          )}
        </View>

        {/* Profile Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Контактная информация
          </Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              Email
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {user?.email || '-'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              Телефон
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {user?.phone || '-'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              Логин
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {user?.username || '-'}
            </Text>
          </View>
        </View>

        {/* Account Status */}
        <View style={[styles.statusCard, { backgroundColor: colors.surface }]}>
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
              Статус аккаунта
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: user?.is_active
                    ? colors.success + '20'
                    : colors.error + '20',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: user?.is_active ? colors.success : colors.error },
                ]}
              >
                {user?.is_active ? 'Активен' : 'Неактивен'}
              </Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
              Email подтверждён
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: user?.email_verified
                    ? colors.success + '20'
                    : colors.warning + '20',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: user?.email_verified ? colors.success : colors.warning },
                ]}
              >
                {user?.email_verified ? 'Да' : 'Нет'}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            variant="ghost"
            onPress={handleLogout}
            textStyle={{ color: colors.error }}
          >
            Выйти из аккаунта
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },
  userRole: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  userPosition: {
    fontSize: 14,
    marginTop: 4,
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
  },
  statusCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statusLabel: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    marginTop: 16,
  },
});
