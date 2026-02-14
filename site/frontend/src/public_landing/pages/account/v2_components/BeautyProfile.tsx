import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, TrendingUp, Calendar, AlertCircle, Loader2, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@site/api/client';
import { toast } from 'sonner';
import { formatWhatsAppUrlWithText } from '../../../utils/urlUtils';
import { useSalonSettings } from '../../../hooks/useSalonSettings';

export function BeautyProfile() {
  const { t } = useTranslation(['account', 'common']);
  const navigate = useNavigate();
  const { phone: salonPhone } = useSalonSettings();
  const [loading, setLoading] = useState(true);
  const [beautyData, setBeautyData] = useState<any>(null);

  useEffect(() => {
    loadBeautyMetrics();
  }, []);

  const loadBeautyMetrics = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getClientBeautyMetrics();
      if (data.success) {
        setBeautyData(data);
      }
    } catch (error) {
      console.error('Error loading beauty metrics:', error);
      toast.error(t('common:error_loading_data'));
    } finally {
      setLoading(false);
    }
  };

  const requestConsultation = () => {
    const phone = salonPhone;
    const message = t('beauty.consultation_message', 'Здравствуйте! Я хотел(а) бы получить консультацию по уходу за красотой. Меня интересуют рекомендации по процедурам.');
    window.open(formatWhatsAppUrlWithText(phone, message), '_blank');
    toast.success(t('beauty.consultation_requested', 'Запрос на консультацию отправлен'));
  };

  const viewAllRecommendations = () => {
    const phone = salonPhone;
    const message = t('beauty.recommendations_message', 'Здравствуйте! Я хотел(а) бы получить полный список персональных рекомендаций по уходу.');
    window.open(formatWhatsAppUrlWithText(phone, message), '_blank');
    toast.success(t('beauty.recommendations_requested', 'Запрос отправлен'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  const beautyMetrics = beautyData?.metrics || [];
  const nextProcedures = beautyData?.recommended_procedures || [];

  const overallScore = beautyMetrics.length > 0
    ? Math.round(beautyMetrics.reduce((sum: number, m: any) => sum + m.score, 0) / beautyMetrics.length)
    : 0;

  // Определяем статус на основе score
  const getStatusInfo = (score: number) => {
    if (score >= 90) {
      return {
        title: t('beauty.excellent_condition', 'Превосходное состояние!'),
        message: t('beauty.excellent_message', 'Вы регулярно следите за собой. Продолжайте в том же духе!'),
        badges: [
          { text: t('beauty.active_care', 'Активный уход'), color: 'bg-green-500' },
          { text: t('beauty.regular_visits', 'Регулярные визиты'), color: 'bg-blue-500' }
        ]
      };
    } else if (score >= 70) {
      return {
        title: t('beauty.good_condition', 'Хорошее состояние'),
        message: t('beauty.good_message', 'Вы на правильном пути! Рекомендуем поддерживать регулярность процедур.'),
        badges: [
          { text: t('beauty.good_care', 'Хороший уход'), color: 'bg-blue-500' }
        ]
      };
    } else if (score >= 40) {
      return {
        title: t('beauty.needs_attention', 'Требует внимания'),
        message: t('beauty.needs_attention_message', 'Рекомендуем уделить больше времени уходу за собой.'),
        badges: [
          { text: t('beauty.improvement_needed', 'Есть над чем работать'), color: 'bg-yellow-500' }
        ]
      };
    } else {
      return {
        title: t('beauty.start_caring', 'Начните заботиться о себе!'),
        message: t('beauty.start_caring_message', 'Запишитесь на процедуры и начните свой путь к красоте.'),
        badges: [
          { text: t('beauty.new_client', 'Новый клиент'), color: 'bg-gray-500' }
        ]
      };
    }
  };

  const statusInfo = getStatusInfo(overallScore);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1>{t('beauty.title', 'Рекомендации по уходу')}</h1>
          <p className="text-muted-foreground">{t('beauty.subtitle', 'Анализ состояния и рекомендации')}</p>
        </div>
        <Button onClick={requestConsultation} className="gap-2 w-full sm:w-auto">
          <MessageCircle className="w-4 h-4" />
          {t('beauty.get_consultation', 'Получить консультацию')}
        </Button>
      </div>

      {/* Beauty Score */}
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-500" />
            {t('beauty.beauty_score', 'Бьюти-Скор')}
          </CardTitle>
          <CardDescription>{t('beauty.overall_assessment', 'Общая оценка вашего состояния')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 lg:gap-8">
            <div className="relative">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-8 border-purple-200 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-purple-600">{overallScore}</div>
                  <div className="text-sm text-muted-foreground">{t('beauty.out_of_100', 'из 100')}</div>
                </div>
              </div>
              <div
                className="absolute inset-0 rounded-full border-8 border-purple-500"
                style={{
                  clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.cos((overallScore / 100) * 2 * Math.PI - Math.PI / 2)
                    }% ${50 + 50 * Math.sin((overallScore / 100) * 2 * Math.PI - Math.PI / 2)}%, 50% 50%)`,
                }}
              />
            </div>

            <div className="w-full flex-1 space-y-2 min-w-0">
              <div className="text-xl font-semibold">{statusInfo.title}</div>
              <p className="text-sm text-muted-foreground break-words">
                {statusInfo.message}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {statusInfo.badges.map((badge, index) => (
                  <Badge key={index} className={badge.color}>{badge.text}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Детальные метрики */}
      <div className="space-y-4">
        <h2>{t('beauty.detailed_assessment', 'Детальная оценка')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {beautyMetrics.map((metric: any) => (
            <Card key={metric.category}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  {metric.category}
                  <span className="text-2xl font-bold" style={{ color: metric.color }}>
                    {metric.score}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress
                  value={metric.score}
                  className="h-3"
                  style={{
                    '--progress-background': metric.color
                  } as any}
                />
                <div className="mt-2 text-sm text-muted-foreground">
                  {metric.score >= 90 && t('beauty.excellent_state', 'Превосходное состояние')}
                  {metric.score >= 80 && metric.score < 90 && t('beauty.great_state', 'Отличное состояние')}
                  {metric.score >= 70 && metric.score < 80 && t('beauty.good_state', 'Хорошее состояние')}
                  {metric.score < 70 && t('beauty.needs_attention', 'Требует внимания')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Календарь процедур */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          {t('beauty.procedure_calendar', 'Календарь процедур')}
        </h2>
        <Card>
          <CardHeader>
            <CardDescription>
              {t('beauty.recommended_time', 'Рекомендованное время для следующих процедур')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {nextProcedures.map((procedure: any, index: number) => (
              <div
                key={index}
                className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-lg border ${procedure.recommended
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-gray-50 border-gray-200'
                  }`}
              >
                <div className="flex items-center gap-3">
                  {procedure.recommended && (
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                  )}
                  <div>
                    <div className="font-semibold">{procedure.service}</div>
                    <div className="text-sm text-muted-foreground">
                      {procedure.recommended ? (
                        <span className="text-orange-600">{t('beauty.recommended_soon', 'Рекомендуется в ближайшее время')}</span>
                      ) : (
                        `${t('beauty.in', 'Через')} ${procedure.days_left} ${t('beauty.days', 'дней')}`
                      )}
                    </div>
                  </div>
                </div>

                {procedure.recommended && (
                  <Button size="sm" className="w-full sm:w-auto" onClick={() => navigate('/new-booking', { state: { service: procedure.service } })}>
                    {t('beauty.book', 'Записаться')}
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Рекомендации */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            {t('beauty.personal_recommendations', 'Персональные рекомендации')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                1
              </div>
              <div>
                <div className="font-semibold">{t('beauty.rec1_title', 'Поддерживайте регулярность')}</div>
                <p className="text-sm text-muted-foreground">
                  {t('beauty.rec1_text', 'Запланируйте следующий визит для маникюра в течение недели')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                2
              </div>
              <div>
                <div className="font-semibold">{t('beauty.rec2_title', 'Попробуйте комплексный уход')}</div>
                <p className="text-sm text-muted-foreground">
                  {t('beauty.rec2_text', 'Сочетание чистки лица и массажа улучшит общее состояние кожи')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                3
              </div>
              <div>
                <div className="font-semibold">{t('beauty.rec3_title', 'Воспользуйтесь акциями')}</div>
                <p className="text-sm text-muted-foreground">
                  {t('beauty.rec3_text', 'Зимний уход для лица со скидкой 30% - отличная возможность')}
                </p>
              </div>
            </div>
          </div>

          <Button className="w-full" onClick={viewAllRecommendations}>
            {t('beauty.view_all_recommendations', 'Посмотреть все рекомендации')}
          </Button>
        </CardContent>
      </Card>

      {/* История изменений */}
      <Card>
        <CardHeader>
          <CardTitle>{t('beauty.dynamics', 'Динамика показателей')}</CardTitle>
          <CardDescription>{t('beauty.dynamics_period', 'Изменения за последние 3 месяца')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {beautyMetrics.map((metric: any) => {
              const change = metric.change || 0;
              return (
                <div key={metric.category} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-sm break-words">{metric.category}</span>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Progress value={metric.score} className="h-2 w-full sm:w-32" />
                    <Badge
                      variant={change > 0 ? 'default' : change < 0 ? 'destructive' : 'secondary'}
                      className="w-16 justify-center"
                    >
                      {change > 0 ? '+' : ''}{change}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
