import React, { useState } from 'react';
import { Filter, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, RefreshCw, Download } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';

// Данные воронки
const funnelStages = [
  {
    stage: 'Посетители',
    description: 'Первичные посетители сайта/соцсетей',
    count: 1500,
    rate: 100,
    color: 'bg-blue-500',
    losses: 0
  },
  {
    stage: 'Вовлечённые',
    description: 'Проявили интерес (лайк, комментарий, просмотр)',
    count: 850,
    rate: 56.7,
    color: 'bg-cyan-500',
    losses: 650
  },
  {
    stage: 'Начали запись',
    description: 'Открыли форму записи',
    count: 420,
    rate: 49.4,
    color: 'bg-green-500',
    losses: 430
  },
  {
    stage: 'Записались',
    description: 'Завершили бронирование',
    count: 280,
    rate: 66.7,
    color: 'bg-amber-500',
    losses: 140
  },
  {
    stage: 'Посетили',
    description: 'Пришли на процедуру',
    count: 245,
    rate: 87.5,
    color: 'bg-pink-500',
    losses: 35
  }
];

const conversionMetrics = [
  { label: 'Посетитель → Вовлечённый', value: '56.7%', status: 'good' },
  { label: 'Вовлечённый → Начал запись', value: '49.4%', status: 'medium' },
  { label: 'Начал запись → Записался', value: '66.7%', status: 'good' },
  { label: 'Записался → Посетил', value: '87.5%', status: 'excellent' },
];

const recommendations = [
  {
    title: 'Увеличить вовлечённость',
    description: 'Потеря 650 потенциальных клиентов на этапе вовлечения',
    suggestion: 'Улучшите контент в соцсетях, добавьте отзывы и примеры работ',
    priority: 'high'
  },
  {
    title: 'Оптимизировать форму записи',
    description: '51% посетителей уходят не завершив запись',
    suggestion: 'Упростите форму записи, добавьте автозаполнение',
    priority: 'high'
  },
  {
    title: 'Снизить no-show',
    description: '35 клиентов (12.5%) не пришли на запись',
    suggestion: 'Добавьте напоминания за 24 часа и за 2 часа до визита',
    priority: 'medium'
  }
];

const stageDetails = [
  { stage: 'Посетители', count: 1500, conversion: '100%', losses: 0, status: 'excellent' },
  { stage: 'Вовлечённые', count: 850, conversion: '56.7%', losses: 650, status: 'medium' },
  { stage: 'Начали запись', count: 420, conversion: '49.4%', losses: 430, status: 'medium' },
  { stage: 'Записались', count: 280, conversion: '66.7%', losses: 140, status: 'good' },
  { stage: 'Посетили', count: 245, conversion: '87.5%', losses: 35, status: 'excellent' },
];

export default function Funnel() {
  const [period, setPeriod] = useState('month');
  const [showCustomDates, setShowCustomDates] = useState(false);

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    setShowCustomDates(value === 'custom');
  };

  const getStatusBadge = (status: string) => {
    const config = {
      excellent: { label: 'Отлично', className: 'bg-green-100 text-green-800' },
      good: { label: 'Хорошо', className: 'bg-blue-100 text-blue-800' },
      medium: { label: 'Норма', className: 'bg-yellow-100 text-yellow-800' },
      low: { label: 'Низко', className: 'bg-red-100 text-red-800' },
    };
    return config[status as keyof typeof config] || config.medium;
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <Filter className="w-8 h-8 text-pink-600" />
          Воронка продаж
        </h1>
        <p className="text-gray-600">Анализ этапов взаимодействия с клиентами</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Период" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Неделя</SelectItem>
              <SelectItem value="2weeks">2 недели</SelectItem>
              <SelectItem value="month">Месяц</SelectItem>
              <SelectItem value="3months">3 месяца</SelectItem>
              <SelectItem value="custom">Свой период</SelectItem>
            </SelectContent>
          </Select>
          
          {showCustomDates && (
            <>
              <Input type="date" className="w-full md:w-[180px]" />
              <Input type="date" className="w-full md:w-[180px]" />
            </>
          )}
          
          <Button variant="outline" className="md:ml-auto">
            <RefreshCw className="w-4 h-4 mr-2" />
            Обновить
          </Button>
          
          <Button className="bg-pink-600 hover:bg-pink-700">
            <Download className="w-4 h-4 mr-2" />
            Экспорт
          </Button>
        </div>
      </div>

      {/* Conversion Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {conversionMetrics.map((metric, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <p className="text-gray-600 text-sm mb-2">{metric.label}</p>
            <div className="flex items-center justify-between">
              <h3 className="text-3xl text-gray-900">{metric.value}</h3>
              {metric.status === 'excellent' && <TrendingUp className="w-6 h-6 text-green-600" />}
              {metric.status === 'good' && <TrendingUp className="w-6 h-6 text-blue-600" />}
              {metric.status === 'medium' && <TrendingDown className="w-6 h-6 text-yellow-600" />}
            </div>
          </div>
        ))}
      </div>

      {/* Funnel Visualization */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
        <h2 className="text-2xl text-gray-900 mb-6 flex items-center gap-2">
          <Filter className="w-6 h-6 text-pink-600" />
          Воронка продаж
        </h2>
        
        <div className="space-y-4">
          {funnelStages.map((stage, index) => (
            <div key={index} className="relative">
              <div className="flex items-center gap-4">
                {/* Funnel Bar */}
                <div className="flex-1">
                  <div 
                    className={`${stage.color} text-white p-6 rounded-lg transition-all hover:shadow-lg cursor-pointer`}
                    style={{ 
                      width: `${stage.rate}%`,
                      minWidth: '200px'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg mb-1">{stage.stage}</h3>
                        <p className="text-sm opacity-90">{stage.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl">{stage.count}</p>
                        <p className="text-sm opacity-90">{stage.rate.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Losses */}
              {stage.losses > 0 && (
                <div className="mt-2 ml-4 flex items-center gap-2 text-red-600 text-sm">
                  <TrendingDown className="w-4 h-4" />
                  <span>Потери: {stage.losses} клиентов</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Key Metrics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl text-gray-900 mb-6">Ключевые метрики</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Общая конверсия</p>
                  <p className="text-2xl text-gray-900">16.3%</p>
                </div>
              </div>
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">Общие потери</p>
                  <p className="text-2xl text-gray-900">1,255</p>
                </div>
              </div>
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Успешных визитов</p>
                  <p className="text-2xl text-gray-900">245</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl text-gray-900 mb-6">Рекомендации</h2>
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg border-l-4 ${
                  rec.priority === 'high' 
                    ? 'border-red-500 bg-red-50' 
                    : 'border-yellow-500 bg-yellow-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                    rec.priority === 'high' ? 'text-red-600' : 'text-yellow-600'
                  }`} />
                  <div className="flex-1">
                    <h3 className="text-sm text-gray-900 mb-1">{rec.title}</h3>
                    <p className="text-xs text-gray-600 mb-2">{rec.description}</p>
                    <p className="text-xs text-gray-700 italic">{rec.suggestion}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stage Details Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl text-gray-900">Детализация по этапам</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Этап</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Количество</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Конверсия</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Потери</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stageDetails.map((stage, index) => {
                const statusConfig = getStatusBadge(stage.status);
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{stage.stage}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{stage.count}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{stage.conversion}</td>
                    <td className="px-6 py-4 text-sm text-red-600">{stage.losses}</td>
                    <td className="px-6 py-4">
                      <Badge className={statusConfig.className}>
                        {statusConfig.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
