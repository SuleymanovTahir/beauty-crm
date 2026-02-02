import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../src/components/ui';
import apiClient from '../../../src/api/client';
import { Client } from '../../../src/types';
import { Colors } from '../../../src/constants/colors';

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  const colors = Colors.light;

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const response = await apiClient.get<Client>(`/api/clients/${id}`);
        setClient(response.data);
      } catch (error) {
        console.error('Error fetching client:', error);
        Alert.alert('Ошибка', 'Не удалось загрузить клиента');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchClient();
  }, [id]);

  const handleCall = () => {
    if (client?.phone) {
      Linking.openURL(`tel:${client.phone}`);
    }
  };

  const handleWhatsApp = () => {
    if (client?.phone) {
      const phone = client.phone.replace(/\D/g, '');
      Linking.openURL(`whatsapp://send?phone=${phone}`);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new':
        return 'Новый';
      case 'contacted':
        return 'Связались';
      case 'interested':
        return 'Заинтересован';
      case 'lead':
        return 'Лид';
      case 'booked':
        return 'Записан';
      case 'customer':
        return 'Клиент';
      case 'vip':
        return 'VIP';
      case 'inactive':
        return 'Неактивен';
      case 'blocked':
        return 'Заблокирован';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!client) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          Клиент не найден
        </Text>
        <Button variant="outline" onPress={() => router.back()}>
          Назад
        </Button>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          {client.profile_pic ? (
            <Image source={{ uri: client.profile_pic }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {client.name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <Text style={[styles.clientName, { color: colors.text }]}>
            {client.name || client.username || 'Без имени'}
          </Text>
          <Text style={[styles.clientStatus, { color: colors.primary }]}>
            {getStatusText(client.status)}
          </Text>
        </View>

        {/* Stats */}
        <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {client.total_visits}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Посещений
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {client.total_spend?.toLocaleString() || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Потрачено ₽
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {client.loyalty_points}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Баллов
            </Text>
          </View>
        </View>

        {/* Contact Info */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
            Контакты
          </Text>

          {client.phone && (
            <View style={styles.contactRow}>
              <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>
                Телефон
              </Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>
                {client.phone}
              </Text>
            </View>
          )}

          {client.email && (
            <View style={styles.contactRow}>
              <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>
                Email
              </Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>
                {client.email}
              </Text>
            </View>
          )}

          {client.preferred_messenger && (
            <View style={styles.contactRow}>
              <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>
                Мессенджер
              </Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>
                {client.preferred_messenger}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        {client.phone && (
          <View style={styles.actionsRow}>
            <Button onPress={handleCall} style={styles.actionButton}>
              Позвонить
            </Button>
            <Button
              variant="outline"
              onPress={handleWhatsApp}
              style={styles.actionButton}
            >
              WhatsApp
            </Button>
          </View>
        )}

        {/* Notes */}
        {client.notes && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
              Заметки
            </Text>
            <Text style={[styles.notes, { color: colors.text }]}>
              {client.notes}
            </Text>
          </View>
        )}

        {/* Additional Info */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
            Дополнительно
          </Text>

          {client.birthday && (
            <View style={styles.contactRow}>
              <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>
                День рождения
              </Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>
                {new Date(client.birthday).toLocaleDateString('ru-RU')}
              </Text>
            </View>
          )}

          {client.first_contact && (
            <View style={styles.contactRow}>
              <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>
                Первый контакт
              </Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>
                {new Date(client.first_contact).toLocaleDateString('ru-RU')}
              </Text>
            </View>
          )}

          {client.last_contact && (
            <View style={styles.contactRow}>
              <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>
                Последний контакт
              </Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>
                {new Date(client.last_contact).toLocaleDateString('ru-RU')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 16,
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
  clientName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },
  clientStatus: {
    fontSize: 16,
    marginTop: 4,
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  contactRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  contactLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
  },
  notes: {
    fontSize: 16,
    lineHeight: 24,
  },
});
