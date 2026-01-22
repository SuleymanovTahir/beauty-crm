import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '../../src/components/ui';
import { useAuthStore } from '../../src/store/authStore';
import { clientPortalApi } from '../../src/api/clientPortal';
import { Client } from '../../src/types';
import { Colors } from '../../src/constants/colors';

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const colors = Colors.light;

  const [profile, setProfile] = useState<Client | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await clientPortalApi.getProfile();
        setProfile(data);
        setName(data.name || '');
        setPhone(data.phone || '');
        setEmail(data.email || '');
      } catch (error) {
        // Use user data as fallback
        setName(user?.full_name || '');
        setPhone(user?.phone || '');
        setEmail(user?.email || '');
      }
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await clientPortalApi.updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
      });
      setEditing(false);
      Alert.alert('Успешно', 'Профиль обновлён');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось обновить профиль');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          {profile?.profile_pic ? (
            <Image source={{ uri: profile.profile_pic }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <Text style={[styles.userName, { color: colors.text }]}>
            {name || 'Гость'}
          </Text>
          {profile?.status && (
            <Text style={[styles.userStatus, { color: colors.textSecondary }]}>
              Клиент
            </Text>
          )}
        </View>

        {/* Profile Form */}
        <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
          {editing ? (
            <>
              <Input
                label="Имя"
                value={name}
                onChangeText={setName}
                placeholder="Ваше имя"
              />
              <Input
                label="Телефон"
                value={phone}
                onChangeText={setPhone}
                placeholder="+7 999 123 45 67"
                keyboardType="phone-pad"
              />
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={styles.buttonRow}>
                <Button
                  variant="outline"
                  onPress={() => setEditing(false)}
                  style={styles.cancelButton}
                >
                  Отмена
                </Button>
                <Button onPress={handleSave} loading={loading} style={styles.saveButton}>
                  Сохранить
                </Button>
              </View>
            </>
          ) : (
            <>
              <ProfileRow label="Имя" value={name || '-'} colors={colors} />
              <ProfileRow label="Телефон" value={phone || '-'} colors={colors} />
              <ProfileRow label="Email" value={email || '-'} colors={colors} />

              <Button
                variant="outline"
                onPress={() => setEditing(true)}
                style={styles.editButton}
              >
                Редактировать профиль
              </Button>
            </>
          )}
        </View>

        {/* Stats */}
        {profile && (
          <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {profile.total_visits || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Посещений
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {profile.loyalty_points || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Баллов
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {profile.discount || 0}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Скидка
              </Text>
            </View>
          </View>
        )}

        {/* Logout */}
        <Button
          variant="ghost"
          onPress={handleLogout}
          style={styles.logoutButton}
          textStyle={{ color: colors.error }}
        >
          Выйти из аккаунта
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={styles.profileRow}>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.text }]}>{value}</Text>
    </View>
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
  userStatus: {
    fontSize: 14,
    marginTop: 4,
  },
  formCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  profileRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  rowLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  rowValue: {
    fontSize: 16,
  },
  editButton: {
    marginTop: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  statsCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
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
  statDivider: {
    width: 1,
  },
  logoutButton: {
    marginTop: 16,
  },
});
