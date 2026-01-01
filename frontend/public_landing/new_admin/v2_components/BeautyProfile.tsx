import { Sparkles, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useTranslation } from 'react-i18next';

export function BeautyProfile() {
  const { t } = useTranslation(['account/beauty-profile', 'common']);

  // Mock data
  const beautyMetrics = [
    { category: t('category_face'), score: 85, color: '#FF6B9D' },
    { category: t('category_hair'), score: 92, color: '#6B4C9A' },
    { category: t('category_nails'), score: 78, color: '#FF9EBB' },
    { category: t('category_body'), score: 88, color: '#4CC9F0' },
  ];

  const nextProcedures = [
    { service: 'Чистка лица', daysLeft: 14, recommended: false },
    { service: 'Маникюр', daysLeft: 3, recommended: true },
  ];

  const getConditionText = (score: number) => {
    if (score >= 90) return t('condition_excellent');
    if (score >= 80) return t('condition_great');
    if (score >= 70) return t('condition_good');
    return t('condition_needs_attention');
  };

  const overallScore = Math.round(
    beautyMetrics.reduce((sum, m) => sum + m.score, 0) / beautyMetrics.length
  );

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Beauty Score */}
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-500" />
            {t('beauty_score')}
          </CardTitle>
          <CardDescription>{t('overall_assessment')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-8 border-purple-200 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-purple-600">{overallScore}</div>
                  <div className="text-sm text-muted-foreground">{t('out_of_100')}</div>
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

            <div className="flex-1 space-y-2">
              <div className="text-xl font-semibold">{t('excellent_condition')}</div>
              <p className="text-sm text-muted-foreground">
                {t('keep_going')}
              </p>
              <div className="flex gap-2 mt-4">
                <Badge className="bg-green-500">{t('active_care')}</Badge>
                <Badge className="bg-blue-500">{t('regular_visits')}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Детальные метрики */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">{t('detailed_assessment')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {beautyMetrics.map((metric) => (
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
                  {getConditionText(metric.score)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Календарь процедур */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Calendar className="w-6 h-6" />
          {t('procedures_calendar')}
        </h2>
        <Card>
          <CardHeader>
            <CardDescription>
              {t('next_procedures_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {nextProcedures.map((procedure, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-lg border ${procedure.recommended
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
                        <span className="text-orange-600">{t('recommended_soon')}</span>
                      ) : (
                        t('in_days', { days: procedure.daysLeft })
                      )}
                    </div>
                  </div>
                </div>

                {procedure.recommended && (
                  <Button size="sm">
                    {t('book_button')}
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
            {t('recommendations_title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                1
              </div>
              <div>
                <div className="font-semibold">{t('rec_1_title')}</div>
                <p className="text-sm text-muted-foreground">
                  {t('rec_1_desc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                2
              </div>
              <div>
                <div className="font-semibold">{t('rec_2_title')}</div>
                <p className="text-sm text-muted-foreground">
                  {t('rec_2_desc')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                3
              </div>
              <div>
                <div className="font-semibold">{t('rec_3_title')}</div>
                <p className="text-sm text-muted-foreground">
                  {t('rec_3_desc')}
                </p>
              </div>
            </div>
          </div>

          <Button className="w-full">
            {t('view_all_recommendations')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
