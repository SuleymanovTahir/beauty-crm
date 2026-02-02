// /frontend/src/pages/manager/Funnel.tsx
import { useState, useEffect } from 'react';
import { Filter, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, RefreshCw, Download, Loader, AlertCircle, Shield } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../utils/permissions';

interface FunnelData {
  visitors: number;
  engaged: number;
  started_booking: number;
  booked: number;
  completed: number;
  conversion_rates: {
    visitor_to_engaged: number;
    engaged_to_booking: number;
    booking_to_booked: number;
    booked_to_completed: number;
  };
}

const stageNames = [
  'visitors',
  'engaged',
  'started_booking',
  'booked',
  'completed'
];

const stageColors = [
  'bg-blue-500',
  'bg-cyan-500',
  'bg-green-500',
  'bg-amber-500',
  'bg-pink-500'
];

const stageDescriptions = [
  'visitors_desc',
  'engaged_desc',
  'started_booking_desc',
  'booked_desc',
  'completed_desc'
];

export default function Funnel() {
  const { t } = useTranslation(['manager/funnel', 'common']);
  const { user: currentUser } = useAuth();
  const userPermissions = usePermissions(currentUser?.role || 'employee');
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFunnelData();
  }, [period]);

  const loadFunnelData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getFunnel();
      setFunnel(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки данных';
      setError(message);
      toast.error(`Ошибка: ${message}`);
      console.error('Error loading funnel data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Check permissions
  if (!userPermissions.canViewAnalytics) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 max-w-md text-center">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('common:access_denied')}</h2>
          <p className="text-gray-600">
            {t('funnel:no_permission_msg', 'У вас нет прав для просмотра аналитики. Обратитесь к администратору.')}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-gray-600">{t('funnel:loading')}...</p>
        </div>
      </div>
    );
  }

  if (error || !funnel) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">{t('common:error_loading')}</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <Button onClick={loadFunnelData} className="mt-4 bg-red-600 hover:bg-red-700">
                {t('common:try_again')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stageValues = [
    funnel.visitors,
    funnel.engaged,
    funnel.started_booking,
    funnel.booked,
    funnel.completed
  ];

  const maxValue = Math.max(...stageValues);

  const conversionMetrics = [
    { label: t('funnel:conversion.visitor_to_engaged'), value: funnel.conversion_rates.visitor_to_engaged },
    { label: t('funnel:conversion.engaged_to_booking'), value: funnel.conversion_rates.engaged_to_booking },
    { label: t('funnel:conversion.booking_to_booked'), value: funnel.conversion_rates.booking_to_booked },
    { label: t('funnel:conversion.booked_to_completed'), value: funnel.conversion_rates.booked_to_completed },
  ];

  // Вычисляем потери на каждом этапе
  const losses = [
    0,
    funnel.visitors - funnel.engaged,
    funnel.engaged - funnel.started_booking,
    funnel.started_booking - funnel.booked,
    funnel.booked - funnel.completed
  ];

  // Общая конверсия
  const totalConversion = (funnel.completed / funnel.visitors) * 100;

  // Рекомендации на основе данных
  const recommendations = [];

  if (funnel.conversion_rates.visitor_to_engaged < 60) {
    recommendations.push({
      title: t('funnel:recommendations.increase_engagement.title'),
      description: t('funnel:recommendations.increase_engagement.description', { count: losses[1] }),
      suggestion: t('funnel:recommendations.increase_engagement.suggestion'),
      priority: 'high'
    });
  }

  if (funnel.conversion_rates.engaged_to_booking < 50) {
    recommendations.push({
      title: t('funnel:recommendations.optimize_form.title'),
      description: t('funnel:recommendations.optimize_form.description', { percent: (100 - funnel.conversion_rates.engaged_to_booking).toFixed(1) }),
      suggestion: t('funnel:recommendations.optimize_form.suggestion'),
      priority: 'high'
    });
  }

  if (funnel.conversion_rates.booked_to_completed < 90) {
    recommendations.push({
      title: t('funnel:recommendations.reduce_noshow.title'),
      description: t('funnel:recommendations.reduce_noshow.description', { count: losses[4], percent: ((losses[4] / funnel.booked) * 100).toFixed(1) }),
      suggestion: t('funnel:recommendations.reduce_noshow.suggestion'),
      priority: 'medium'
    });
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <Filter className="w-8 h-8 text-pink-600" />
          {t('funnel:title')}
        </h1>
        <p className="text-gray-600">{t('funnel:subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Период" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t('common:period.week')}</SelectItem>
              <SelectItem value="2weeks">{t('common:period.2weeks')}</SelectItem>
              <SelectItem value="month">{t('common:period.month')}</SelectItem>
              <SelectItem value="3months">{t('common:period.3months')}</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="md:ml-auto" onClick={loadFunnelData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('common:refresh')}
          </Button>

          <Button className="bg-pink-600 hover:bg-pink-700">
            <Download className="w-4 h-4 mr-2" />
            {t('common:export')}
          </Button>
        </div>
      </div>

      {/* Conversion Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {conversionMetrics.map((metric, index) => {
          const isGood = metric.value >= 60;
          const isExcellent = metric.value >= 80;

          return (
            <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <p className="text-gray-600 text-sm mb-2">{metric.label}</p>
              <div className="flex items-center justify-between">
                <h3 className="text-3xl text-gray-900">{metric.value.toFixed(1)}%</h3>
                {isExcellent && <TrendingUp className="w-6 h-6 text-green-600" />}
                {isGood && !isExcellent && <TrendingUp className="w-6 h-6 text-blue-600" />}
                {!isGood && <TrendingDown className="w-6 h-6 text-yellow-600" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Funnel Visualization */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
        <h2 className="text-2xl text-gray-900 mb-6 flex items-center gap-2">
          <Filter className="w-6 h-6 text-pink-600" />
          {t('funnel:funnel_chart')}
        </h2>

        <div className="space-y-4">
          {stageNames.map((stage, index) => {
            const value = stageValues[index];
            const percentage = (value / maxValue) * 100;
            const conversionPercent = (value / funnel.visitors) * 100;

            return (
              <div key={index} className="relative">
                <div className="flex items-center gap-4">
                  {/* Funnel Bar */}
                  <div className="flex-1">
                    <div
                      className={`${stageColors[index]} text-white p-6 rounded-lg transition-all hover:shadow-lg cursor-pointer`}
                      style={{
                        width: `${percentage}%`,
                        minWidth: '200px'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg mb-1">{t(`funnel:stages.${stage}`)}</h3>
                          <p className="text-sm opacity-90">{t(`funnel:stages_desc.${stageDescriptions[index]}`)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl">{value}</p>
                          <p className="text-sm opacity-90">{conversionPercent.toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Losses */}
                {losses[index] > 0 && (
                  <div className="mt-2 ml-4 flex items-center gap-2 text-red-600 text-sm">
                    <TrendingDown className="w-4 h-4" />
                    <span>{t('funnel:losses', { count: losses[index] })}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Key Metrics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl text-gray-900 mb-6">{t('funnel:key_metrics')}</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">{t('funnel:total_conversion')}</p>
                  <p className="text-2xl text-gray-900">{totalConversion.toFixed(1)}%</p>
                </div>
              </div>
              {totalConversion > 15 ? (
                <TrendingUp className="w-6 h-6 text-green-600" />
              ) : (
                <TrendingDown className="w-6 h-6 text-yellow-600" />
              )}
            </div>

            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">{t('funnel:total_losses')}</p>
                  <p className="text-2xl text-gray-900">{funnel.visitors - funnel.completed}</p>
                </div>
              </div>
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">{t('funnel:successful_visits')}</p>
                  <p className="text-2xl text-gray-900">{funnel.completed}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl text-gray-900 mb-6">{t('funnel:recommendations_title')}</h2>
          <div className="space-y-4">
            {recommendations.length > 0 ? (
              recommendations.map((rec, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${rec.priority === 'high'
                    ? 'border-red-500 bg-red-50'
                    : 'border-yellow-500 bg-yellow-50'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${rec.priority === 'high' ? 'text-red-600' : 'text-yellow-600'
                      }`} />
                    <div className="flex-1">
                      <h3 className="text-sm text-gray-900 mb-1">{rec.title}</h3>
                      <p className="text-xs text-gray-600 mb-2">{rec.description}</p>
                      <p className="text-xs text-gray-700 italic">{rec.suggestion}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm text-green-900 font-medium">{t('funnel:all_good')}</h3>
                    <p className="text-xs text-green-700 mt-1">
                      {t('funnel:good_results_desc', 'Your funnel shows good results. Keep it up!')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stage Details Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl text-gray-900">{t('funnel:stage_details')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm text-gray-600">{t('funnel:table.stage')}</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">{t('funnel:table.count')}</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">{t('funnel:table.percentage')}</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">{t('funnel:table.losses')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stageNames.map((stage, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{t(`funnel:stages.${stage}`)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{stageValues[index]}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {((stageValues[index] / funnel.visitors) * 100).toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 text-sm text-red-600">{losses[index]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}