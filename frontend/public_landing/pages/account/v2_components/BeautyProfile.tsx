
import { Sparkles, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
// import { beautyMetrics as mockMetrics } from '../data/mockData';

export function BeautyProfile({ metrics }: any) {
  // Map metrics prop to beautyMetrics structure
  const beautyMetrics = metrics || [];
  const nextProcedures: any[] = [];
  // If metrics is empty, UI handles it or shows empty

  const overallScore = beautyMetrics.length > 0 ? Math.round(
    beautyMetrics.reduce((sum: any, m: any) => sum + m.score, 0) / beautyMetrics.length
  ) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent inline-block">
          Бьюти-профиль
        </h1>
        <p className="text-muted-foreground mt-1 text-lg">Анализ состояния и персональные рекомендации</p>
      </div>

      {/* Beauty Score */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white shadow-2xl p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <div className="relative w-40 h-40 flex-shrink-0">
            {/* Circular Progress Background */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="8"
                className="text-white/10"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="transparent"
                stroke="url(#gradient)"
                strokeWidth="8"
                strokeDasharray={440}
                strokeDashoffset={440 - (440 * overallScore) / 100}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#f472b6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-white">{overallScore}</span>
              <span className="text-xs text-purple-200 uppercase tracking-wider">из 100</span>
            </div>
          </div>

          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <h2 className="text-2xl font-bold">Ваш Бьюти-индекс</h2>
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md">
                <Sparkles className="w-3 h-3 mr-1 text-yellow-300" />
                {overallScore >= 80 ? 'Превосходно' : overallScore >= 60 ? 'Хорошо' : 'Требует внимания'}
              </Badge>
            </div>
            <p className="text-indigo-100 text-lg">
              Вы на правильном пути! Ваш системный подход к уходу дает отличные результаты.
            </p>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-2">
              <div className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-sm">💧 Увлажнение</div>
              <div className="px-3 py-1 rounded-full bg-pink-500/20 border border-pink-400/30 text-pink-200 text-sm">✨ Сияние</div>
              <div className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-sm">🛡️ Защита</div>
            </div>
          </div>
        </div>
      </div>

      {/* Детальные метрики */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900 border-b pb-2">Детальный анализ</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {beautyMetrics.map((metric) => (
            <Card key={metric.category} className="group border-gray-100 hover:shadow-lg transition-all duration-300 hover:border-purple-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="group-hover:text-purple-700 transition-colors">{metric.category}</span>
                  <span className="text-2xl font-bold transition-transform group-hover:scale-110 duration-300" style={{ color: metric.color }}>
                    {metric.score}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                    style={{ width: `${metric.score}%`, backgroundColor: metric.color }}
                  >
                    <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]" />
                  </div>
                </div>
                <div className="mt-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {metric.score >= 90 && 'Идеальное состояние'}
                    {metric.score >= 80 && metric.score < 90 && 'Отличный результат'}
                    {metric.score >= 70 && metric.score < 80 && 'Норма'}
                    {metric.score < 70 && 'Рекомендуется уход'}
                  </span>
                  <span className="font-medium text-gray-900">{metric.score}/100</span>
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
          Календарь процедур
        </h2>
        <Card>
          <CardHeader>
            <CardDescription>
              Рекомендованное время для следующих процедур
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {nextProcedures.map((procedure, index) => (
              <div
                key={index}
                className={`flex items - center justify - between p - 4 rounded - lg border ${procedure.recommended
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-gray-50 border-gray-200'
                  } `}
              >
                <div className="flex items-center gap-3">
                  {procedure.recommended && (
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                  )}
                  <div>
                    <div className="font-semibold">{procedure.service}</div>
                    <div className="text-sm text-muted-foreground">
                      {procedure.recommended ? (
                        <span className="text-orange-600">Рекомендуется в ближайшее время</span>
                      ) : (
                        `Через ${procedure.daysLeft} дней`
                      )}
                    </div>
                  </div>
                </div>

                {procedure.recommended && (
                  <Button size="sm">
                    Записаться
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
            Персональные рекомендации
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                1
              </div>
              <div>
                <div className="font-semibold">Поддерживайте регулярность</div>
                <p className="text-sm text-muted-foreground">
                  Запланируйте следующий визит для маникюра в течение недели
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                2
              </div>
              <div>
                <div className="font-semibold">Попробуйте комплексный уход</div>
                <p className="text-sm text-muted-foreground">
                  Сочетание чистки лица и массажа улучшит общее состояние кожи
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                3
              </div>
              <div>
                <div className="font-semibold">Воспользуйтесь акциями</div>
                <p className="text-sm text-muted-foreground">
                  Зимний уход для лица со скидкой 30% - отличная возможность
                </p>
              </div>
            </div>
          </div>

          <Button className="w-full">
            Посмотреть все рекомендации
          </Button>
        </CardContent>
      </Card>

      {/* История изменений */}
      <Card>
        <CardHeader>
          <CardTitle>Динамика показателей</CardTitle>
          <CardDescription>Изменения за последние 3 месяца</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {beautyMetrics.map((metric) => {
              const change = Math.floor(Math.random() * 10) - 3; // Mock
              return (
                <div key={metric.category} className="flex items-center justify-between">
                  <span className="text-sm">{metric.category}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={metric.score} className="w-32 h-2" />
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
