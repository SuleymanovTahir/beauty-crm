import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  MessageSquare,
  Eye,
  Plus,
  Loader,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../services/api";

interface Client {
  id: string;
  instagram_id: string;
  username: string;
  phone: string;
  name: string;
  display_name: string;
  first_contact: string;
  last_contact: string;
  total_messages: number;
  status: string;
  lifetime_value: number;
  profile_pic: string | null;
  notes: string;
  is_pinned: number;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  new: { label: "Новый", color: "bg-green-100 text-green-800" },
  contacted: { label: "Связались", color: "bg-blue-100 text-blue-800" },
  interested: {
    label: "Заинтересован",
    color: "bg-yellow-100 text-yellow-800",
  },
  lead: { label: "Лид", color: "bg-orange-100 text-orange-800" },
  customer: { label: "Клиент", color: "bg-purple-100 text-purple-800" },
  vip: { label: "VIP", color: "bg-pink-100 text-pink-800" },
  inactive: { label: "Неактивен", color: "bg-gray-100 text-gray-800" },
  blocked: { label: "Заблокирован", color: "bg-red-100 text-red-800" },
};

export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Загрузить клиентов при монтировании
  useEffect(() => {
    loadClients();
  }, []);

  // Фильтровать клиентов при изменении поиска
  useEffect(() => {
    const filtered = clients.filter(
      (client) =>
        client.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.includes(searchTerm) ||
        client.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredClients(filtered);
  }, [searchTerm, clients]);

  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getClients();

      const clientsArray = data.clients || (Array.isArray(data) ? data : []);
      setClients(clientsArray);

      if (clientsArray.length === 0) {
        toast.info("Клиентов не найдено");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Ошибка загрузки клиентов";
      setError(message);
      toast.error(`Ошибка: ${message}`);
      console.error("Error loading clients:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadClients();
    setRefreshing(false);
    toast.success("Данные обновлены");
  };

  const stats = {
    total: clients.length,
    vip: clients.filter((c) => c.status === "vip").length,
    new: clients.filter((c) => c.status === "new").length,
    active: clients.filter((c) => c.total_messages > 0).length,
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-gray-600">Загрузка клиентов...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Ошибка загрузки</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <Button
                onClick={loadClients}
                className="mt-4 bg-red-600 hover:bg-red-700"
              >
                Попробовать еще раз
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-pink-600" />
            База клиентов
          </h1>
          <p className="text-gray-600">{filteredClients.length} клиентов</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Обновить
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">Всего клиентов</p>
          <h3 className="text-3xl text-gray-900">{stats.total}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">VIP клиентов</p>
          <h3 className="text-3xl text-purple-600">{stats.vip}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">Новых клиентов</p>
          <h3 className="text-3xl text-green-600">{stats.new}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">Активных</p>
          <h3 className="text-3xl text-blue-600">{stats.active}</h3>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Поиск по имени, телефону..."
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
        {filteredClients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm text-gray-600">
                    Клиент
                  </th>
                  <th className="px-6 py-4 text-left text-sm text-gray-600">
                    Контакты
                  </th>
                  <th className="px-6 py-4 text-left text-sm text-gray-600">
                    Сообщений
                  </th>
                  <th className="px-6 py-4 text-left text-sm text-gray-600">
                    LTV
                  </th>
                  <th className="px-6 py-4 text-left text-sm text-gray-600">
                    Последний контакт
                  </th>
                  <th className="px-6 py-4 text-left text-sm text-gray-600">
                    Статус
                  </th>
                  <th className="px-6 py-4 text-left text-sm text-gray-600">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white">
                          {client.name
                            ? client.name.charAt(0).toUpperCase()
                            : "?"}
                        </div>
                        <div>
                          <p className="text-sm text-gray-900 font-medium">
                            {client.display_name}
                          </p>
                          {client.username && (
                            <p className="text-xs text-gray-500">
                              @{client.username}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">
                        {client.phone || "-"}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {client.total_messages}
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600 font-medium">
                      {client.lifetime_value} AED
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(client.last_contact).toLocaleDateString(
                        "ru-RU"
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        className={
                          statusConfig[
                            client.status as keyof typeof statusConfig
                          ]?.color || "bg-gray-100 text-gray-800"
                        }
                      >
                        {statusConfig[
                          client.status as keyof typeof statusConfig
                        ]?.label || client.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate(`/admin/clients/${client.id}`)
                          }
                          title="Просмотр информации о клиенте"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600"
                          onClick={() =>
                            navigate(`/admin/chat?client_id=${client.id}`)
                          }
                          title="Написать сообщение"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center text-gray-500">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p>Клиенты не найдены</p>
          </div>
        )}
      </div>
    </div>
  );
}
