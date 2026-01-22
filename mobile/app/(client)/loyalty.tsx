import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/ui';
import { clientPortalApi } from '../../src/api/clientPortal';
import { LoyaltyInfo } from '../../src/types';
import { Colors } from '../../src/constants/colors';

export default function LoyaltyScreen() {
  const [loyalty, setLoyalty] = useState<LoyaltyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const colors = Colors.light;

  const fetchLoyalty = async () => {
    try {
      const data = await clientPortalApi.getLoyalty();
      setLoyalty(data);
    } catch (error) {
      console.error('Error fetching loyalty:', error);
      // Mock data
      setLoyalty({
        points: 1250,
        level: 'Серебряный',
        next_level: 'Золотой',
        points_to_next_level: 750,
        benefits: [
          'Скидка 5% на все услуги',
          'Приоритетная запись',
          'Бесплатная консультация',
        ],
        referral_code: 'BEAUTY123',
        referral_bonus: 500,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLoyalty();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLoyalty();
  };

  const handleShareReferral = async () => {
    if (!loyalty?.referral_code) return;

    try {
      await Share.share({
        message: `Приходи в Beauty CRM! Используй мой промокод ${loyalty.referral_code} и получи ${loyalty.referral_bonus} бонусных баллов!`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const progressPercent = loyalty?.points_to_next_level
    ? (loyalty.points / (loyalty.points + loyalty.points_to_next_level)) * 100
    : 100;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Points Card */}
        <View style={[styles.pointsCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.pointsLabel}>Ваши баллы</Text>
          <Text style={styles.pointsValue}>{loyalty?.points || 0}</Text>
          {loyalty?.level && (
            <Text style={styles.levelText}>Уровень: {loyalty.level}</Text>
          )}
        </View>

        {/* Progress to next level */}
        {loyalty?.next_level && (
          <View style={[styles.progressCard, { backgroundColor: colors.surface }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressTitle, { color: colors.text }]}>
                До уровня "{loyalty.next_level}"
              </Text>
              <Text style={[styles.progressPoints, { color: colors.primary }]}>
                {loyalty.points_to_next_level} баллов
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${progressPercent}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Benefits */}
        {loyalty?.benefits && loyalty.benefits.length > 0 && (
          <View style={[styles.benefitsCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Ваши привилегии
            </Text>
            {loyalty.benefits.map((benefit, index) => (
              <View key={index} style={styles.benefitRow}>
                <Text style={styles.benefitIcon}>✓</Text>
                <Text style={[styles.benefitText, { color: colors.text }]}>
                  {benefit}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Referral Program */}
        {loyalty?.referral_code && (
          <View style={[styles.referralCard, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.sectionTitle, { color: colors.primaryDark }]}>
              Приведи друга
            </Text>
            <Text style={[styles.referralDescription, { color: colors.primaryDark }]}>
              Поделитесь промокодом с другом и получите {loyalty.referral_bonus} баллов,
              когда он совершит первую запись!
            </Text>
            <View style={[styles.codeBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.codeText, { color: colors.primary }]}>
                {loyalty.referral_code}
              </Text>
            </View>
            <Button onPress={handleShareReferral} style={styles.shareButton}>
              Поделиться кодом
            </Button>
          </View>
        )}

        {/* How it works */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Как это работает
          </Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoNumber}>1</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Записывайтесь на услуги и оплачивайте их
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoNumber}>2</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Получайте баллы за каждую покупку (1₽ = 1 балл)
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoNumber}>3</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Оплачивайте баллами до 30% стоимости услуг
            </Text>
          </View>
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
  pointsCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  pointsLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  pointsValue: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: 'bold',
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 8,
  },
  progressCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 14,
  },
  progressPoints: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  benefitsCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitIcon: {
    fontSize: 16,
    color: '#4CAF50',
    marginRight: 8,
  },
  benefitText: {
    fontSize: 14,
  },
  referralCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  referralDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  codeBox: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  codeText: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  shareButton: {
    marginTop: 4,
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E91E63',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
