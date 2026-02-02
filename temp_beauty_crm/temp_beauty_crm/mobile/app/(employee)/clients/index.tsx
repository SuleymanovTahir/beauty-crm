import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '../../../src/api/client';
import { Client } from '../../../src/types';
import { Colors } from '../../../src/constants/colors';

interface ClientsResponse {
  clients: Client[];
}

export default function ClientsListScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const colors = Colors.light;

  const fetchClients = async () => {
    try {
      const response = await apiClient.get<ClientsResponse>('/api/clients');
      setClients(response.data.clients || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClients();
  };

  const filteredClients = clients.filter((client) => {
    const searchLower = search.toLowerCase();
    return (
      client.name?.toLowerCase().includes(searchLower) ||
      client.phone?.includes(search) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.username?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'vip':
        return colors.warning;
      case 'customer':
        return colors.success;
      case 'lead':
      case 'interested':
        return colors.info;
      case 'inactive':
      case 'blocked':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const renderClient = ({ item }: { item: Client }) => (
    <TouchableOpacity
      style={[styles.clientCard, { backgroundColor: colors.surface }]}
      onPress={() =>
        router.push({
          pathname: '/(employee)/clients/[id]',
          params: { id: item.instagram_id },
        })
      }
    >
      {item.profile_pic ? (
        <Image source={{ uri: item.profile_pic }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {item.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
      )}

      <View style={styles.clientInfo}>
        <View style={styles.nameRow}>
          <Text style={[styles.clientName, { color: colors.text }]}>
            {item.name || item.username || 'Без имени'}
          </Text>
          {item.is_pinned && <Text style={styles.pinnedIcon}>📌</Text>}
        </View>

        {item.phone && (
          <Text style={[styles.clientPhone, { color: colors.textSecondary }]}>
            {item.phone}
          </Text>
        )}

        <View style={styles.statsRow}>
          <Text style={[styles.clientStat, { color: colors.textSecondary }]}>
            {item.total_visits} посещ.
          </Text>
          <Text style={[styles.clientStat, { color: colors.textSecondary }]}>
            •
          </Text>
          <Text style={[styles.clientStat, { color: colors.textSecondary }]}>
            {item.total_spend?.toLocaleString() || 0} ₽
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.statusDot,
          { backgroundColor: getStatusColor(item.status) },
        ]}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Поиск по имени, телефону..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={[styles.clearButton, { color: colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Clients List */}
      <FlatList
        data={filteredClients}
        renderItem={renderClient}
        keyExtractor={(item, index) => item.id?.toString() || item.instagram_id || index.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {search ? 'Клиенты не найдены' : 'Нет клиентов'}
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  clearButton: {
    fontSize: 16,
    padding: 4,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  clientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
  },
  pinnedIcon: {
    marginLeft: 4,
    fontSize: 12,
  },
  clientPhone: {
    fontSize: 14,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  clientStat: {
    fontSize: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
  },
});
