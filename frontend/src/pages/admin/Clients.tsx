import React, { useState } from 'react';
import { Users, Search, MessageSquare, Eye, Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { useNavigate } from 'react-router-dom';

const mockClients = [
  {
    id: 1,
    name: 'Анна Иванова',
    phone: '+971 50 123 4567',
    email: 'anna@example.com',
    instagram: '@anna_ivanova',
    visits: 12,
    ltv: 4800,
    lastVisit: '2025-10-15',
    status: 'vip'
  },
  {
    id: 2,
    name: 'Мария Петрова',
    phone: '+971 50 234 5678',
    email: 'maria@example.com',
    instagram: '@maria_p',
    visits: 6,
    ltv: 2100,
    lastVisit: '2025-10-18',
    status: 'regular'
  },
  {
    id: 3,
    name: 'Елена Сидорова',
    phone: '+971 50 345 6789',
    email: 'elena@example.com',
    instagram: '@elena_sid',
    visits: 3,
    ltv: 1200,
    lastVisit: '2025-10-19',
    status: 'new'
  },
];

export default function Clients() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = mockClients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusConfig = {
    vip: { label: 'VIP', color: 'bg-purple-100 text-purple-800' },
    regular: { label: 'Постоянный', color: 'bg-blue-100 text-blue-800' },
    new: { label: 'Новый', color: 'bg-green-100 text-green-800' },
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <Users className="w-8 h-8 text-pink-600" />
          База клиентов
        </h1>
        <p className="text-gray-600">{filteredClients.length} клиентов</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">Всего клиентов</p>
          <h3 className="text-3xl text-gray-900">{mockClients.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">VIP клиентов</p>
          <h3 className="text-3xl text-purple-600">
            {mockClients.filter(c => c.status === 'vip').length}
          </h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">Новых за месяц</p>
          <h3 className="text-3xl text-green-600">
            {mockClients.filter(c => c.status === 'new').length}
          </h3>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Поиск по имени, телефону или email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button className="bg-pink-600 hover:bg-pink-700">
            <Plus className="w-4 h-4 mr-2" />
            Добавить клиента
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Клиент</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Контакты</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Визиты</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">LTV</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Последний визит</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Статус</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm text-gray-900">{client.name}</p>
                        <p className="text-xs text-gray-500">{client.instagram}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{client.phone}</p>
                    <p className="text-xs text-gray-500">{client.email}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{client.visits}</td>
                  <td className="px-6 py-4 text-sm text-green-600">{client.ltv} AED</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(client.lastVisit).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={statusConfig[client.status as keyof typeof statusConfig].color}>
                      {statusConfig[client.status as keyof typeof statusConfig].label}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-green-600">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
