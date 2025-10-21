import React, { useState } from 'react';
import { MessageSquare, Search, Filter, Star, Archive, Trash2, Check, CheckCheck, Clock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner@2.0.3';

// Mock data
const mockMessages = [
  {
    id: 1,
    from: 'Анна Иванова',
    avatar: 'А',
    subject: 'Запрос на перманентный макияж',
    preview: 'Здравствуйте! Хотела бы узнать подробнее о процедуре перманентного макияжа бровей...',
    time: '10:30',
    date: 'Сегодня',
    unread: true,
    starred: false,
    category: 'inquiry',
    status: 'new'
  },
  {
    id: 2,
    from: 'Мария Петрова',
    avatar: 'М',
    subject: 'Вопрос по ценам',
    preview: 'Какие у вас цены на маникюр и педикюр? Есть ли какие-то акции?',
    time: '09:15',
    date: 'Сегодня',
    unread: true,
    starred: true,
    category: 'price',
    status: 'new'
  },
  {
    id: 3,
    from: 'Елена Сидорова',
    avatar: 'Е',
    subject: 'Перенос записи',
    preview: 'Добрый день! Не могу прийти в назначенное время, можно ли перенести?',
    time: 'Вчера',
    date: 'Вчера',
    unread: false,
    starred: false,
    category: 'booking',
    status: 'replied'
  },
  {
    id: 4,
    from: 'Ольга Николаева',
    avatar: 'О',
    subject: 'Отзыв о процедуре',
    preview: 'Спасибо огромное! Результатом очень довольна, обязательно приду еще!',
    time: '2 дня назад',
    date: '17.10.2025',
    unread: false,
    starred: true,
    category: 'feedback',
    status: 'archived'
  },
  {
    id: 5,
    from: 'София Козлова',
    avatar: 'С',
    subject: 'Вопрос о противопоказаниях',
    preview: 'У меня чувствительная кожа, есть ли противопоказания для процедуры?',
    time: '3 дня назад',
    date: '16.10.2025',
    unread: false,
    starred: false,
    category: 'inquiry',
    status: 'in_progress'
  },
];

const categories = [
  { value: 'all', label: 'Все сообщения' },
  { value: 'inquiry', label: 'Запросы' },
  { value: 'booking', label: 'Записи' },
  { value: 'price', label: 'Цены' },
  { value: 'feedback', label: 'Отзывы' },
];

const statuses = [
  { value: 'all', label: 'Все' },
  { value: 'new', label: 'Новые' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'replied', label: 'Отвечено' },
  { value: 'archived', label: 'Архив' },
];

export default function Messages() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(mockMessages);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMessages, setSelectedMessages] = useState<number[]>([]);

  const filteredMessages = messages.filter(msg => {
    const matchesSearch = msg.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         msg.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         msg.preview.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || msg.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || msg.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const unreadCount = messages.filter(m => m.unread).length;
  const starredCount = messages.filter(m => m.starred).length;

  const handleToggleStar = (id: number) => {
    setMessages(messages.map(msg => 
      msg.id === id ? { ...msg, starred: !msg.starred } : msg
    ));
  };

  const handleToggleSelect = (id: number) => {
    setSelectedMessages(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedMessages.length === filteredMessages.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(filteredMessages.map(m => m.id));
    }
  };

  const handleMarkAsRead = () => {
    setMessages(messages.map(msg => 
      selectedMessages.includes(msg.id) ? { ...msg, unread: false } : msg
    ));
    setSelectedMessages([]);
    toast.success('Сообщения помечены как прочитанные');
  };

  const handleArchive = () => {
    setMessages(messages.map(msg => 
      selectedMessages.includes(msg.id) ? { ...msg, status: 'archived' } : msg
    ));
    setSelectedMessages([]);
    toast.success('Сообщения перемещены в архив');
  };

  const handleDelete = () => {
    if (confirm('Вы уверены, что хотите удалить выбранные сообщения?')) {
      setMessages(messages.filter(msg => !selectedMessages.includes(msg.id)));
      setSelectedMessages([]);
      toast.success('Сообщения удалены');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'in_progress':
        return <Check className="w-4 h-4 text-yellow-600" />;
      case 'replied':
        return <CheckCheck className="w-4 h-4 text-green-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-pink-600" />
          Сообщения
          {unreadCount > 0 && (
            <Badge className="bg-pink-600 text-white">
              {unreadCount}
            </Badge>
          )}
        </h1>
        <p className="text-gray-600">Входящие сообщения от клиентов</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">Всего сообщений</p>
              <h3 className="text-3xl text-gray-900">{messages.length}</h3>
            </div>
            <MessageSquare className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">Непрочитанные</p>
              <h3 className="text-3xl text-blue-600">{unreadCount}</h3>
            </div>
            <Clock className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">Избранные</p>
              <h3 className="text-3xl text-yellow-600">{starredCount}</h3>
            </div>
            <Star className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">В работе</p>
              <h3 className="text-3xl text-green-600">
                {messages.filter(m => m.status === 'in_progress').length}
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
              placeholder="Поиск по отправителю или содержанию..."
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
              {categories.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map(status => (
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
              <Button size="sm" variant="outline" onClick={handleDelete} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить
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
            checked={selectedMessages.length === filteredMessages.length && filteredMessages.length > 0}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm text-gray-600">Выбрать все</span>
        </div>

        {/* Messages */}
        <div className="divide-y divide-gray-200">
          {filteredMessages.map((message) => (
            <div
              key={message.id}
              className={`px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                message.unread ? 'bg-blue-50' : ''
              }`}
              onClick={() => navigate(`/manager/chat?client=${message.id}`)}
            >
              <div className="flex items-start gap-4">
                <Checkbox
                  checked={selectedMessages.includes(message.id)}
                  onCheckedChange={() => handleToggleSelect(message.id)}
                  onClick={(e) => e.stopPropagation()}
                />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleStar(message.id);
                  }}
                  className="mt-1"
                >
                  <Star
                    className={`w-5 h-5 ${
                      message.starred
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300 hover:text-yellow-400'
                    }`}
                  />
                </button>

                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                  {message.avatar}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${message.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                        {message.from}
                      </p>
                      {getStatusIcon(message.status)}
                    </div>
                    <span className="text-xs text-gray-500">{message.time}</span>
                  </div>
                  <p className={`text-sm mb-1 ${message.unread ? 'text-gray-900' : 'text-gray-600'}`}>
                    {message.subject}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{message.preview}</p>
                </div>
              </div>
            </div>
          ))}

          {filteredMessages.length === 0 && (
            <div className="py-20 text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Сообщения не найдены</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
