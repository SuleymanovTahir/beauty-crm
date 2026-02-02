import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { employeesApi } from '../../../src/api/services';
import { Employee } from '../../../src/types';
import { Colors } from '../../../src/constants/colors';

export default function SelectMasterScreen() {
  const { serviceKey, serviceName } = useLocalSearchParams<{
    serviceKey: string;
    serviceName: string;
  }>();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const colors = Colors.light;

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = serviceKey
          ? await employeesApi.getByService(serviceKey)
          : await employeesApi.getAll();
        setEmployees(data.filter((e) => e.is_service_provider));
      } catch (error) {
        console.error('Error fetching employees:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [serviceKey]);

  const handleSelectMaster = (employee: Employee | null) => {
    router.push({
      pathname: '/(client)/book/datetime',
      params: {
        serviceKey: serviceKey!,
        serviceName: serviceName!,
        masterId: employee?.id?.toString() || '',
        masterName: employee?.full_name || 'Любой мастер',
      },
    });
  };

  const renderEmployee = ({ item }: { item: Employee }) => (
    <TouchableOpacity
      style={[styles.employeeCard, { backgroundColor: colors.surface }]}
      onPress={() => handleSelectMaster(item)}
    >
      {item.photo_url ? (
        <Image source={{ uri: item.photo_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {item.full_name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
      )}

      <View style={styles.employeeInfo}>
        <Text style={[styles.employeeName, { color: colors.text }]}>
          {item.full_name}
        </Text>
        {item.position && (
          <Text style={[styles.employeePosition, { color: colors.textSecondary }]}>
            {item.position}
          </Text>
        )}
        {item.specialization && (
          <Text style={[styles.employeeSpec, { color: colors.textSecondary }]}>
            {item.specialization}
          </Text>
        )}
        {item.years_of_experience && (
          <Text style={[styles.employeeExp, { color: colors.textSecondary }]}>
            Опыт: {item.years_of_experience} лет
          </Text>
        )}
        {item.rating && (
          <View style={styles.ratingRow}>
            <Text style={styles.ratingStar}>⭐</Text>
            <Text style={[styles.ratingValue, { color: colors.text }]}>
              {item.rating.toFixed(1)}
            </Text>
            {item.reviews_count && (
              <Text style={[styles.reviewsCount, { color: colors.textSecondary }]}>
                ({item.reviews_count} отзывов)
              </Text>
            )}
          </View>
        )}
      </View>

      <Text style={[styles.arrow, { color: colors.textSecondary }]}>›</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Выберите мастера</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Шаг 2 из 4 • {serviceName}
        </Text>
      </View>

      {/* Any master option */}
      <TouchableOpacity
        style={[styles.anyMasterCard, { backgroundColor: colors.primaryLight }]}
        onPress={() => handleSelectMaster(null)}
      >
        <Text style={[styles.anyMasterText, { color: colors.primaryDark }]}>
          Любой свободный мастер
        </Text>
        <Text style={[styles.arrow, { color: colors.primaryDark }]}>›</Text>
      </TouchableOpacity>

      <FlatList
        data={employees}
        renderItem={renderEmployee}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Мастера не найдены
          </Text>
        }
      />
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
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  anyMasterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  anyMasterText: {
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  employeeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  employeePosition: {
    fontSize: 14,
    marginTop: 2,
  },
  employeeSpec: {
    fontSize: 14,
    marginTop: 2,
  },
  employeeExp: {
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
  arrow: {
    fontSize: 24,
    marginLeft: 8,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 40,
  },
});
