// /frontend/src/pages/manager/Messages.tsx
// frontend/src/pages/manager/Messages.tsx - УЛУЧШЕННАЯ ВЕРСИЯ БЕЗ ПРЫЖКОВ
import { useState, useEffect } from "react";
import {
  MessageSquare,
  Search,
  Filter,
  Star,
  Archive,
  Trash2,
  Check,
  CheckCheck,
  Clock,
  Loader,
  AlertCircle,
  ArchiveRestore,
  Shield,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { Checkbox } from "../../components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../services/api";
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../utils/permissions';

interface ClientMessage {
  id: string;
  name: string;
  display_name: string;
  avatar: string;
  phone: string;
  last_contact: string;
  total_messages: number;
  status: string;
  is_pinned: number;
}

interface ExtendedMessage extends ClientMessage {
  starred: boolean;
  unread: boolean;
  archived: boolean;
  profile_pic?: string;
}

const categories = [
  { value: "all", label: "Все сообщения" },
  { value: "new", label: "Новые" },
  { value: "active", label: "Активные" },
  { value: "archived", label: "Архив" },
];

const statuses = [
  { value: "all", label: "Все" },
  { value: "new", label: "Новые клиенты" },
  { value: "interested", label: "Заинтересованные" },
  { value: "customer", label: "Клиенты" },
  { value: "vip", label: "VIP" },
];

export default function Messages() {
  const navigate = useNavigate();
  useTranslation(['manager/Messages', 'common']);
  const { user: currentUser } = useAuth();
  const userPermissions = usePermissions(currentUser?.role || 'employee');
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<ExtendedMessage[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);

  // ✅ ИСПРАВЛЕНО: Разделяем первичную загрузку и фоновые обновления
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<{ id: string; name: string } | null>(null);

  // ✅ ПЕРВИЧНАЯ ЗАГРУЗКА
  useEffect(() => {
    loadMessages(true);
  }, []);

  // ✅ АВТООБНОВЛЕНИЕ КАЖДЫЕ 10 СЕКУНД (без прыжков)
  useEffect(() => {
    const interval = setInterval(() => {
      loadMessages(false); // silent refresh
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const filtered = messages.filter((msg) => {
      const matchesSearch =
        msg.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.phone.includes(searchTerm);

      const matchesCategory =
        (categoryFilter === "all" && !msg.archived) ||
        (categoryFilter === "new" && msg.unread && !msg.archived) ||
        (categoryFilter === "active" && msg.total_messages > 0 && !msg.archived) ||
        (categoryFilter === "archived" && msg.archived);

      const matchesStatus =
        statusFilter === "all" || msg.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
    setFilteredMessages(filtered);
  }, [searchTerm, categoryFilter, statusFilter, messages]);

  // ✅ УЛУЧШЕННАЯ ЗАГРУЗКА: с параметром isInitial
  const loadMessages = async (isInitial: boolean = false) => {
    try {
      if (isInitial) {
        setInitialLoading(true);
      } else {
        setIsRefreshing(true);
      }

      setError(null);

      const data = await api.getClients();
      const clientsArray = data.clients || (Array.isArray(data) ? data : []);

      const extendedMessages: ExtendedMessage[] = clientsArray.map(
        (client: any) => ({
          id: client.id,
          name: client.name,
          display_name: client.display_name,
          avatar: (client.display_name || client.name || "?")
            .charAt(0)
            .toUpperCase(),
          phone: client.phone || "-",
          last_contact: client.last_contact,
          total_messages: client.total_messages,
          status: client.status,
          is_pinned: client.is_pinned,
          profile_pic: client.profile_pic,
          starred: client.is_pinned === 1,
          unread: client.total_messages > 0,
          archived: localStorage.getItem(`archived_${client.id}`) === "true",
        })
      );

      setMessages(extendedMessages);

      if (isInitial && extendedMessages.length === 0) {
        toast.info("Сообщений не найдено");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Ошибка загрузки сообщений";
      setError(message);

      // Показываем тост только при первой загрузке
      if (isInitial) {
        toast.error(`Ошибка: ${message}`);
      }
      console.error("Error loading messages:", err);
    } finally {
      if (isInitial) {
        setInitialLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  };

  const handleToggleStar = (id: string) => {
    setMessages(
      messages.map((msg) =>
        msg.id === id ? { ...msg, starred: !msg.starred } : msg
      )
    );
  };

  const handleToggleSelect = (id: string) => {
    setSelectedMessages((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedMessages.length === filteredMessages.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(filteredMessages.map((m) => m.id));
    }
  };

  const handleMarkAsRead = () => {
    setMessages(
      messages.map((msg) =>
        selectedMessages.includes(msg.id) ? { ...msg, unread: false } : msg
      )
    );
    setSelectedMessages([]);
    toast.success("Сообщения помечены как прочитанные");
  };

  const handleArchive = () => {
    setMessages(
      messages.map((msg) => {
        if (selectedMessages.includes(msg.id)) {
          localStorage.setItem(`archived_${msg.id}`, "true");
          return { ...msg, archived: true };
        }
        return msg;
      })
    );
    setSelectedMessages([]);
    toast.success("Сообщения перемещены в архив");
  };

  const handleRestoreFromArchive = (id: string) => {
    localStorage.removeItem(`archived_${id}`);
    setMessages(
      messages.map((msg) =>
        msg.id === id ? { ...msg, archived: false } : msg
      )
    );
    toast.success("Восстановлено из архива");
  };

  const handleOpenDeleteDialog = (id: string, name: string) => {
    setMessageToDelete({ id, name });
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (!messageToDelete) return;

    setMessages(messages.filter((msg) => msg.id !== messageToDelete.id));
    localStorage.removeItem(`archived_${messageToDelete.id}`);
    toast.success("Удалено безвозвратно");
    setShowDeleteDialog(false);
    setMessageToDelete(null);
  };

  const unreadCount = messages.filter((m) => m.unread && !m.archived).length;
  const starredCount = messages.filter((m) => m.starred).length;
  const archivedCount = messages.filter((m) => m.archived).length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "new":
        return <Clock className="w-4 h-4 text-blue-600" />;
      case "interested":
        return <Check className="w-4 h-4 text-yellow-600" />;
      case "customer":
        return <CheckCheck className="w-4 h-4 text-green-600" />;
      case "vip":
        return <Star className="w-4 h-4 text-pink-600" />;
      default:
        return null;
    }
  };

  // Check permissions
  if (!userPermissions.canViewAllClients) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 max-w-md text-center">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Доступ запрещен</h2>
          <p className="text-gray-600">
            У вас нет прав для просмотра клиентских сообщений. Обратитесь к администратору.
          </p>
        </div>
      </div>
    );
  }

  // ✅ ПОКАЗЫВАЕМ СПИННЕР ТОЛЬКО ПРИ ПЕРВИЧНОЙ ЗАГРУЗКЕ
  if (initialLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-gray-600">Загрузка сообщений...</p>
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
                onClick={() => loadMessages(true)}
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
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl text-gray-900 flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-pink-600" />
              Сообщения
              {unreadCount > 0 && (
                <Badge className="bg-pink-600 text-white">{unreadCount}</Badge>
              )}
            </h1>
            {/* ✅ ИНДИКАТОР ФОНОВОГО ОБНОВЛЕНИЯ */}
            {isRefreshing && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader className="w-4 h-4 animate-spin" />
                <span>Обновление...</span>
              </div>
            )}
          </div>

          {/* ✅ КНОПКА РУЧНОГО ОБНОВЛЕНИЯ */}
          <Button
            onClick={() => loadMessages(false)}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            className="gap-2"
          >
            <Clock className="w-4 h-4" />
            Обновить
          </Button>
        </div>
        <p className="text-gray-600 mt-2">История общения с клиентами</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">Всего клиентов</p>
              <h3 className="text-3xl text-gray-900">{messages.length}</h3>
            </div>
            <MessageSquare className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">Активные</p>
              <h3 className="text-3xl text-blue-600">
                {messages.filter((m) => m.total_messages > 0 && !m.archived).length}
              </h3>
            </div>
            <Clock className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">Закреплённые</p>
              <h3 className="text-3xl text-yellow-600">{starredCount}</h3>
            </div>
            <Star className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">В архиве</p>
              <h3 className="text-3xl text-orange-600">{archivedCount}</h3>
            </div>
            <Archive className="w-8 h-8 text-orange-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">Всего сообщений</p>
              <h3 className="text-3xl text-green-600">
                {messages.reduce((sum, m) => sum + m.total_messages, 0)}
              </h3>
            </div>
            <Check className="w-8 h-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Поиск по имени или телефону..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Actions Bar */}
      {selectedMessages.length > 0 && (
        <div className="bg-pink-50 border border-pink-200 p-4 rounded-xl mb-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Выбрано: {selectedMessages.length}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleMarkAsRead}>
                <Check className="w-4 h-4 mr-2" />
                Прочитано
              </Button>
              <Button size="sm" variant="outline" onClick={handleArchive}>
                <Archive className="w-4 h-4 mr-2" />
                Архив
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Messages List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Table Header */}
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center gap-4">
          <Checkbox
            checked={
              selectedMessages.length === filteredMessages.length &&
              filteredMessages.length > 0
            }
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm text-gray-600">Выбрать все</span>
        </div>

        {/* Messages */}
        <div className="divide-y divide-gray-200">
          {filteredMessages.length > 0 ? (
            filteredMessages.map((message) => (
              <div
                key={message.id}
                className={`px-6 py-4 hover:bg-gray-50 transition-colors ${message.unread ? "bg-blue-50" : message.archived ? "bg-gray-50 opacity-75" : ""
                  }`}
              >
                <div className="flex items-start gap-4">
                  {!message.archived ? (
                    <>
                      <Checkbox
                        checked={selectedMessages.includes(message.id)}
                        onCheckedChange={() => handleToggleSelect(message.id)}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      />

                      <button
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleToggleStar(message.id);
                        }}
                        className="mt-1"
                      >
                        <Star
                          className={`w-5 h-5 ${message.starred
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300 hover:text-yellow-400"
                            }`}
                        />
                      </button>
                    </>
                  ) : (
                    <div className="w-10" />
                  )}

                  <div className="relative flex-shrink-0">
                    {message.profile_pic ? (
                      <>
                        <img
                          src={message.profile_pic || ''}
                          alt={`${message.display_name} profile picture`}
                          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div
                          className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium hidden"
                        >
                          {message.avatar}
                        </div>
                      </>
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                        {message.avatar}
                      </div>
                    )}
                  </div>

                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      if (!message.archived) {
                        navigate(`/crm/chat?client_id=${message.id}`);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm ${message.unread
                            ? "text-gray-900 font-medium"
                            : "text-gray-700"
                            }`}
                        >
                          {message.display_name}
                        </p>
                        {getStatusIcon(message.status)}
                        {message.archived && (
                          <Badge className="bg-orange-100 text-orange-800 text-xs">
                            В архиве
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(message.last_contact).toLocaleDateString(
                          "ru-RU"
                        )}
                      </span>
                    </div>
                    <p
                      className={`text-sm ${message.unread ? "text-gray-900" : "text-gray-600"
                        }`}
                    >
                      {message.phone}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {message.total_messages} сообщений
                    </p>
                  </div>

                  {message.archived && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestoreFromArchive(message.id)}
                        className="text-blue-600 hover:bg-blue-50"
                        title="Восстановить из архива"
                      >
                        <ArchiveRestore className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDeleteDialog(message.id, message.display_name)}
                        className="text-red-600 hover:bg-red-50"
                        title="Удалить безвозвратно"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Сообщения не найдены</p>
            </div>
          )}
        </div>
      </div>

      {/* Диалог удаления */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-red-900">
                  Удалить сообщение?
                </h3>
              </div>
            </div>

            <div className="px-6 py-6">
              <p className="text-gray-700 mb-4">
                Вы собираетесь удалить сообщение с клиентом <span className="font-bold">"{messageToDelete?.name}"</span>.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 font-semibold mb-2">
                  ⚠️ Внимание:
                </p>
                <ul className="text-sm text-yellow-800 space-y-1 ml-4">
                  <li>✗ Это действие необратимо</li>
                  <li>✗ Будет удалена вся история сообщений</li>
                  <li>✗ Данные не смогут быть восстановлены</li>
                </ul>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end rounded-b-2xl">
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setMessageToDelete(null);
                }}
                className="px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-200 transition"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}