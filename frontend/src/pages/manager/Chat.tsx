import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, 
  Search, 
  Phone, 
  Instagram, 
  Paperclip,
  Send,
  Loader,
  AlertCircle,
  X,
  StickyNote
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { useSearchParams, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../../services/api';

interface Client {
  id: string;
  name: string;
  username: string;
  phone: string;
  display_name: string;
  last_contact: string;
  total_messages: number;
  status: string;
}

interface Message {
  id?: string | number;
  message: string;
  sender: string;
  timestamp: string;
  type?: string;
}

export default function Chat() {
  const location = useLocation();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ✅ ИСПРАВЛЕНО: Получить client_id из URL параметра
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const clientIdFromUrl = searchParams.get('client_id');  // ← ВАЖНО: client_id, не client!
    
    console.log('📍 URL параметр client_id:', clientIdFromUrl);
    
    if (clientIdFromUrl) {
      // Если параметр есть, сохраняем его для использования после загрузки клиентов
      localStorage.setItem('selectedClientId', clientIdFromUrl);
    }
  }, [location.search]);

  // Загрузить клиентов при монтировании
  useEffect(() => {
    console.log('👥 Загружаю клиентов...');
    loadClients();
  }, []);

  // Выбрать клиента из URL параметра после загрузки клиентов
  useEffect(() => {
    if (clients.length > 0) {
      const selectedClientId = localStorage.getItem('selectedClientId');
      console.log('🔍 Ищу клиента с ID:', selectedClientId);
      
      if (selectedClientId) {
        const client = clients.find(c => c.id === selectedClientId);
        if (client) {
          console.log('✅ Найден клиент:', client.display_name);
          setSelectedClient(client);
          loadMessages(selectedClientId);
          localStorage.removeItem('selectedClientId');
        } else {
          console.log('❌ Клиент с ID не найден:', selectedClientId);
        }
      }
    }
  }, [clients]);

  // Скроллить к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getClients();
      
      const clientsArray = data.clients || (Array.isArray(data) ? data : []);
      console.log('📦 Загружено клиентов:', clientsArray.length);
      setClients(clientsArray);
      
      // Выбрать первого клиента если нет в URL
      if (clientsArray.length > 0 && !selectedClient) {
        setSelectedClient(clientsArray[0]);
        loadMessages(clientsArray[0].id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки клиентов';
      setError(message);
      toast.error(`Ошибка: ${message}`);
      console.error('Error loading clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (clientId: string) => {
    try {
      setLoadingMessages(true);
      console.log('💬 Загружаю сообщения для клиента:', clientId);
      const data = await api.getChatMessages(clientId, 50);
      
      const messagesArray = data.messages || (Array.isArray(data) ? data : []);
      console.log('📨 Загружено сообщений:', messagesArray.length);
      setMessages(messagesArray);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки сообщений';
      toast.error(`Ошибка: ${message}`);
      console.error('Error loading messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSelectClient = (client: Client) => {
    console.log('👤 Выбран клиент:', client.display_name);
    setSelectedClient(client);
    loadMessages(client.id);
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedClient) return;

    try {
      console.log('📤 Отправляю сообщение клиенту:', selectedClient.display_name);
      await api.sendMessage(selectedClient.id, message);
      
      // Добавить сообщение в локальный список
      const newMessage: Message = {
        id: Date.now(),
        message: message,
        sender: 'bot',
        timestamp: new Date().toISOString(),
        type: 'text'
      };
      
      setMessages([...messages, newMessage]);
      setMessage('');
      toast.success('Сообщение отправлено');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Ошибка отправки';
      toast.error(`Ошибка: ${errorMsg}`);
      console.error('Error sending message:', err);
    }
  };

  const handleSaveNotes = () => {
    console.log('💾 Сохраняю заметки для клиента:', selectedClient?.display_name);
    toast.success('Заметки сохранены');
    setShowNotes(false);
  };

  const filteredClients = clients.filter(client =>
    client.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-gray-600">Загрузка чатов...</p>
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
              <Button onClick={loadClients} className="mt-4 bg-red-600 hover:bg-red-700">
                Попробовать еще раз
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex overflow-hidden">
        {/* Clients List */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg text-gray-900 flex items-center gap-2 font-semibold">
                <MessageCircle className="w-5 h-5" />
                Чаты ({clients.length})
              </h3>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Поиск..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Clients */}
          <div className="flex-1 overflow-y-auto">
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => handleSelectClient(client)}
                  className={`p-4 cursor-pointer border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedClient?.id === client.id ? 'bg-pink-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white flex-shrink-0 font-medium text-sm">
                      {client.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate font-medium">{client.display_name}</p>
                      <p className="text-xs text-gray-600 truncate">{client.phone}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {client.total_messages} сообщений
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">Клиентов не найдено</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        {selectedClient ? (
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                    {selectedClient.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm text-gray-900 font-medium">{selectedClient.display_name}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      {selectedClient.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {selectedClient.phone}
                        </span>
                      )}
                      {selectedClient.username && (
                        <a 
                          href={`https://instagram.com/${selectedClient.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-pink-600 hover:underline flex items-center gap-1"
                        >
                          <Instagram className="w-3 h-3" />
                          @{selectedClient.username}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowNotes(!showNotes)}
                    title="Заметки"
                  >
                    <StickyNote className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader className="w-6 h-6 text-pink-600 animate-spin" />
                </div>
              ) : messages.length > 0 ? (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'bot' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-md px-4 py-3 rounded-2xl ${
                        msg.sender === 'bot'
                          ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <p className={`text-xs mt-1 ${msg.sender === 'bot' ? 'text-pink-100' : 'text-gray-500'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p>Нет сообщений</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Notes Panel */}
            {showNotes && (
              <div className="border-t border-gray-200 p-4 bg-yellow-50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm text-gray-900 font-medium">Заметки о клиенте</h4>
                  <Button size="sm" variant="ghost" onClick={() => setShowNotes(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Введите заметки..."
                  className="min-h-[80px] mb-2"
                />
                <Button size="sm" onClick={handleSaveNotes} className="bg-pink-600 hover:bg-pink-700">
                  Сохранить заметки
                </Button>
              </div>
            )}

            {/* Chat Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Введите сообщение..."
                    className="resize-none"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*,application/pdf"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    title="Прикрепить файл"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    className="bg-gradient-to-r from-pink-500 to-purple-600"
                    disabled={!message.trim()}
                    title="Отправить"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p>Выберите клиента для начала чата</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}