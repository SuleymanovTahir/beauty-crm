import React from 'react';
import { LayoutDashboard, MessageSquare, Users, TrendingUp, MessageCircle, Filter, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

export default function ManagerDashboard() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2">Панель менеджера</h1>
        <p className="text-gray-600">Управление клиентами и сообщениями</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link to="/manager/messages" className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <MessageSquare className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl text-gray-900 mb-1">42</h3>
              <p className="text-gray-600 text-sm">Новых сообщений</p>
            </div>
            <Badge className="bg-blue-100 text-blue-800">+12</Badge>
          </div>
        </Link>

        <Link to="/manager/clients" className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl text-gray-900 mb-1">128</h3>
              <p className="text-gray-600 text-sm">Активных клиентов</p>
            </div>
            <Badge className="bg-green-100 text-green-800">+8</Badge>
          </div>
        </Link>

        <Link to="/manager/funnel" className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl text-gray-900 mb-1">+18%</h3>
              <p className="text-gray-600 text-sm">Рост конверсии</p>
            </div>
            <Badge className="bg-purple-100 text-purple-800">Хорошо</Badge>
          </div>
        </Link>

        <Link to="/manager/analytics" className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
            <LayoutDashboard className="w-6 h-6 text-pink-600" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl text-gray-900 mb-1">94%</h3>
              <p className="text-gray-600 text-sm">Удовлетворенность</p>
            </div>
            <Badge className="bg-pink-100 text-pink-800">Отлично</Badge>
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl text-gray-900 mb-4">Быстрые действия</h2>
          <div className="space-y-3">
            <Link to="/manager/messages">
              <Button className="w-full justify-between bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Просмотреть сообщения
                </span>
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            
            <Link to="/manager/chat">
              <Button className="w-full justify-between bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700">
                <span className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Открыть чат
                </span>
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>

            <Link to="/manager/funnel">
              <Button className="w-full justify-between bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700">
                <span className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Воронка продаж
                </span>
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>

            <Link to="/manager/clients">
              <Button className="w-full justify-between bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700">
                <span className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  База клиентов
                </span>
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl text-gray-900 mb-4">Последняя активность</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">Новое сообщение от Анны Ивановой</p>
                <p className="text-xs text-gray-500 mt-1">5 минут назад</p>
              </div>
            </div>

            <div className="flex items-start gap-3 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">Добавлен новый клиент</p>
                <p className="text-xs text-gray-500 mt-1">20 минут назад</p>
              </div>
            </div>

            <div className="flex items-start gap-3 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">Конверсия увеличилась на 5%</p>
                <p className="text-xs text-gray-500 mt-1">1 час назад</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-4 h-4 text-pink-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">15 активных диалогов в чате</p>
                <p className="text-xs text-gray-500 mt-1">2 часа назад</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
        <h2 className="text-xl mb-2">💡 Совет дня</h2>
        <p className="text-pink-50">
          Используйте воронку продаж для анализа конверсии на каждом этапе. Это поможет выявить узкие места и улучшить результаты.
        </p>
        <Link to="/manager/funnel">
          <Button variant="outline" className="mt-4 bg-white text-pink-600 hover:bg-pink-50">
            Перейти к воронке
          </Button>
        </Link>
      </div>
    </div>
  );
}
