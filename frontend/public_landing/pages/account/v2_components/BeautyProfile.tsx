
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
    <div className="space-y-6 pb-8">
      <div>
        <h1>Бьюти-профиль</h1>
        <p className="text-muted-foreground">Анализ состояния и рекомендации</p>
      </div>

      {/* Beauty Score */}
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-500" />
            Beauty Score
          </CardTitle>
          <CardDescription>Общая оценка вашего состояния</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-8 border-purple-200 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-purple-600">{overallScore}</div>
                  <div className="text-sm text-muted-foreground">из 100</div>
                </div>
              </div>
              <div
                className="absolute inset-0 rounded-full border-8 border-purple-500"
                style={{
                  clipPath: `polygon(50 % 50 %, 50 % 0 %, ${50 + 50 * Math.cos((overallScore / 100) * 2 * Math.PI - Math.PI / 2)
                    } % ${50 + 50 * Math.sin((overallScore / 100) * 2 * Math.PI - Math.PI / 2)} %, 50 % 50 %)`,
                }}
              />
            </div>

            <div className="flex-1 space-y-2">
              <div className="text-xl font-semibold">Отличное состояние!</div>
              <p className="text-sm text-muted-foreground">
                Вы регулярно следите за собой. Продолжайте в том же духе!
              </p>
              <div className="flex gap-2 mt-4">
                <Badge className="bg-green-500">Активный уход</Badge>
                <Badge className="bg-blue-500">Регулярные визиты</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Детальные метрики */}
      <div className="space-y-4">
        <h2>Детальная оценка</h2>
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
                  {metric.score >= 90 && 'Превосходное состояние'}
                  {metric.score >= 80 && metric.score < 90 && 'Отличное состояние'}
                  {metric.score >= 70 && metric.score < 80 && 'Хорошее состояние'}
                  {metric.score < 70 && 'Требует внимания'}
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
