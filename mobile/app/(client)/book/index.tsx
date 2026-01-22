import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { servicesApi } from '../../../src/api/services';
import { Service, ServiceCategory } from '../../../src/types';
import { Colors } from '../../../src/constants/colors';

export default function SelectServiceScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);

  const colors = Colors.light;

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await servicesApi.getAll('ru');
        setServices(data.filter((s) => s.is_active));
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const categories = [...new Set(services.map((s) => s.category).filter((c): c is ServiceCategory => !!c))];

  const filteredServices = selectedCategory
    ? services.filter((s) => s.category === selectedCategory)
    : services;

  const handleSelectService = (service: Service) => {
    router.push({
      pathname: '/(client)/book/master',
      params: { serviceKey: service.key, serviceName: service.name },
    });
  };

  const formatPrice = (service: Service) => {
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

  const renderCategory = ({ item }: { item: ServiceCategory }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        {
          backgroundColor: selectedCategory === item ? colors.primary : colors.surface,
        },
      ]}
      onPress={() => setSelectedCategory(selectedCategory === item ? null : item)}
    >
      <Text
        style={[
          styles.categoryText,
          { color: selectedCategory === item ? '#FFFFFF' : colors.text },
        ]}
      >
        {item}
      </Text>
    </TouchableOpacity>
  );

  const renderService = ({ item }: { item: Service }) => (
    <TouchableOpacity
      style={[styles.serviceCard, { backgroundColor: colors.surface }]}
      onPress={() => handleSelectService(item)}
    >
      <View style={styles.serviceInfo}>
        <Text style={[styles.serviceName, { color: colors.text }]}>
          {item.name_ru || item.name}
        </Text>
        {item.description_ru && (
          <Text
            style={[styles.serviceDescription, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.description_ru}
          </Text>
        )}
        <View style={styles.serviceDetails}>
          <Text style={[styles.servicePrice, { color: colors.primary }]}>
            {formatPrice(item)}
          </Text>
          {item.duration && (
            <Text style={[styles.serviceDuration, { color: colors.textSecondary }]}>
              {formatDuration(item.duration)}
            </Text>
          )}
        </View>
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
        <Text style={[styles.title, { color: colors.text }]}>Выберите услугу</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Шаг 1 из 4
        </Text>
      </View>

      {categories.length > 0 && (
        <FlatList
          horizontal
          data={categories}
          renderItem={renderCategory}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      )}

      <FlatList
        data={filteredServices}
        renderItem={renderService}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.servicesList}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Услуги не найдены
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
  categoriesList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  servicesList: {
    padding: 16,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  serviceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '600',
  },
  serviceDuration: {
    fontSize: 14,
  },
  arrow: {
    fontSize: 24,
    marginLeft: 12,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 40,
  },
});
