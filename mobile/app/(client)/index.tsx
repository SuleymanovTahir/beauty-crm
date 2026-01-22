import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/ui';
import { clientPortalApi } from '../../src/api/clientPortal';
import { useAuthStore } from '../../src/store/authStore';
import { ClientDashboard } from '../../src/types';
import { Colors } from '../../src/constants/colors';

export default function ClientDashboardScreen() {
  const [dashboard, setDashboard] = useState<ClientDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const user = useAuthStore((state) => state.user);
  const colors = Colors.light;

  const fetchDashboard = async () => {
    try {
      const data = await clientPortalApi.getDashboard();
      setDashboard(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
            Добро пожаловать,
          </Text>
          <Text style={[styles.userName, { color: colors.text }]}>
            {user?.full_name || 'Гость'}
          </Text>
        </View>

        {/* Quick Book Button */}
        <Button
          onPress={() => router.push('/(client)/book')}
          style={styles.bookButton}
        >
          Записаться на услугу
        </Button>

        {/* Next Booking Card */}
        {dashboard?.next_booking && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Ближайшая запись
            </Text>
            <View style={styles.bookingInfo}>
              <Text style={[styles.serviceName, { color: colors.text }]}>
                {dashboard.next_booking.service_name}
              </Text>
              <Text style={[styles.bookingDate, { color: colors.primary }]}>
                {formatDate(dashboard.next_booking.datetime)}
              </Text>
              {dashboard.next_booking.master && (
                <Text style={[styles.masterName, { color: colors.textSecondary }]}>
                  Мастер: {dashboard.next_booking.master}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.surface }]}
            onPress={() => router.push('/(client)/loyalty')}
          >
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {dashboard?.loyalty_points || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Бонусных баллов
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.surface }]}
            onPress={() => router.push('/(client)/history')}
          >
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {dashboard?.total_visits || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Посещений
            </Text>
          </TouchableOpacity>
        </View>

        {/* Loyalty Level */}
        {dashboard?.loyalty_level && (
          <View style={[styles.card, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.loyaltyTitle, { color: colors.primaryDark }]}>
              Ваш уровень: {dashboard.loyalty_level}
            </Text>
            <Text style={[styles.loyaltySubtitle, { color: colors.primaryDark }]}>
              Общая сумма покупок: {dashboard.total_spend?.toLocaleString()} ₽
            </Text>
          </View>
        )}
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
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 16,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  bookButton: {
    marginBottom: 24,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bookingInfo: {
    gap: 4,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
  },
  bookingDate: {
    fontSize: 16,
    fontWeight: '500',
  },
  masterName: {
    fontSize: 14,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  loyaltyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  loyaltySubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
});
