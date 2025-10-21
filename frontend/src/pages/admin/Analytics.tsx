import React, { useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, RefreshCw, Download } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Mock data
const bookingsTrendData = [
  { name: 'Пн', записи: 12 },
  { name: 'Вт', записи: 19 },
  { name: 'Ср', записи: 15 },
  { name: 'Чт', записи: 22 },
  { name: 'Пт', записи: 28 },
  { name: 'Сб', записи: 35 },
  { name: 'Вс', записи: 30 },
];

const servicesData = [
  { name: 'Перманентный макияж', value: 35, color: '#ec4899' },
  { name: 'Маникюр', value: 25, color: '#8b5cf6' },
  { name: 'Массаж', value: 20, color: '#06b6d4' },
  { name: 'Наращивание ресниц', value: 12, color: '#f59e0b' },
  { name: 'Стрижка', value: 8, color: '#10b981' },
];

const statusData = [
  { name: 'Ожидает', записи: 15 },
  { name: 'Подтверждена', записи: 28 },
  { name: 'Завершена', записи: 42 },
  { name: 'Отменена', записи: 8 },
];

const revenueData = [
  { name: 'Неделя 1', доход: 12500 },
  { name: 'Неделя 2', доход: 15200 },
  { name: 'Неделя 3', доход: 14800 },
  { name: 'Неделя 4', доход: 18300 },
];

const topServices = [
  { name: 'Перманентный макияж бровей', count: 45, revenue: 36000 },
  { name: 'Маникюр + педикюр', count: 38, revenue: 13300 },
  { name: 'Массаж лица', count: 32, revenue: 14400 },
  { name: 'Наращивание ресниц', count: 28, revenue: 14000 },
  { name: 'Окрашивание волос', count: 24, revenue: 12000 },
];

export default function Analytics() {
  const [period, setPeriod] = useState('month');
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    setShowCustomDates(value === 'custom');
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-pink-600" />
          Аналитика и отчеты
        </h1>
        <p className="text-gray-600">Детальный анализ работы салона</p>
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
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full md:w-[180px]"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full md:w-[180px]"
              />
            </>
          )}
          
          <Button variant="outline" className="md:ml-auto">
            <RefreshCw className="w-4 h-4 mr-2" />
            Обновить
          </Button>
          
          <Select defaultValue="csv">
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="Формат" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
          
          <Button className="bg-pink-600 hover:bg-pink-700">
            <Download className="w-4 h-4 mr-2" />
            Скачать
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-3xl text-gray-900 mb-2">68.5%</h3>
          <p className="text-gray-600 text-sm mb-2">Конверсия</p>
          <div className="flex items-center gap-1 text-green-600 text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>+5.2%</span>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-3xl text-gray-900 mb-2">12 мин</h3>
          <p className="text-gray-600 text-sm mb-2">Время ответа</p>
          <div className="flex items-center gap-1 text-green-600 text-sm">
            <TrendingDown className="w-4 h-4" />
            <span>-3 мин</span>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-3xl text-gray-900 mb-2">60,800 AED</h3>
          <p className="text-gray-600 text-sm mb-2">Доход за период</p>
          <div className="flex items-center gap-1 text-green-600 text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>+12.3%</span>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-3xl text-gray-900 mb-2">420 AED</h3>
          <p className="text-gray-600 text-sm mb-2">Средний чек</p>
          <div className="flex items-center gap-1 text-green-600 text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>+8.1%</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Bookings Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl text-gray-900 mb-6">Динамика записей</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={bookingsTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="записи" stroke="#ec4899" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Services Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl text-gray-900 mb-6">Распределение услуг</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={servicesData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => entry.name}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {servicesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Status Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl text-gray-900 mb-6">Статусы записей</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="записи" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl text-gray-900 mb-6">Динамика дохода</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="доход" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Services Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl text-gray-900">Топ услуг</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Название</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Количество</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Доход</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topServices.map((service, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{service.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{service.count}</td>
                  <td className="px-6 py-4 text-sm text-green-600">{service.revenue} AED</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
