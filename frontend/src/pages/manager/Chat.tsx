// frontend/src/pages/manager/Chat.tsx - УЛУЧШЕННАЯ ВЕРСИЯ БЕЗ ПРЫЖКОВ
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
  StickyNote,
  Info,
  Eye,
  FileText,
  Check,
  Clock
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');

  // ✅ ИСПРАВЛЕНО: Разделяем первичную загрузку и фоновые обновления
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isRefreshingMessages, setIsRefreshingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showNotes, setShowNotes] = useState(false);
  const [showClientInfo, setShowClientInfo] = useState(false);
  const [notes, setNotes] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // ✅ НОВОЕ: Состояние для редактирования информации о клиенте
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [editedClientName, setEditedClientName] = useState('');
  const [editedClientPhone, setEditedClientPhone] = useState('');
  const [isSavingClient, setIsSavingClient] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const clientIdFromUrl = searchParams.get('client_id');

    if (clientIdFromUrl) {
      localStorage.setItem('selectedClientId', clientIdFromUrl);
    }
  }, [location.search]);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (clients.length > 0) {
      const selectedClientId = localStorage.getItem('selectedClientId');

      if (selectedClientId) {
        const client = clients.find(c => c.id === selectedClientId);
        if (client) {
          setSelectedClient(client);
          loadMessages(selectedClientId, true);
          localStorage.removeItem('selectedClientId');
        }
      }
    }
  }, [clients]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ✅ УЛУЧШЕННОЕ АВТООБНОВЛЕНИЕ: без прыжков
  useEffect(() => {
    if (!selectedClient) return;

    const interval = setInterval(() => {
      loadMessages(selectedClient.id, false); // silent refresh
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedClient]);

  const loadClients = async () => {
    try {
      setInitialLoading(true);
      setError(null);
      const data = await api.getClients();

      const clientsArray = data.clients || (Array.isArray(data) ? data : []);
      setClients(clientsArray);

      if (clientsArray.length > 0 && !selectedClient) {
        setSelectedClient(clientsArray[0]);
        loadMessages(clientsArray[0].id, true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки клиентов';
      setError(message);
      toast.error(`Ошибка: ${message}`);
    } finally {
      setInitialLoading(false);
    }
  };

  // ✅ УЛУЧШЕННАЯ ЗАГРУЗКА СООБЩЕНИЙ: с параметром isInitial
  const loadMessages = async (clientId: string, isInitial: boolean = false) => {
    try {
      if (isInitial) {
        setLoadingMessages(true);
      } else {
        setIsRefreshingMessages(true);
      }

      const data = await api.getChatMessages(clientId, 50);
      const messagesArray = data.messages || (Array.isArray(data) ? data : []);
      setMessages(messagesArray);
    } catch (err) {
      // Показываем ошибку только при первичной загрузке
      if (isInitial) {
        const message = err instanceof Error ? err.message : 'Ошибка загрузки сообщений';
        toast.error(`Ошибка: ${message}`);
      }
    } finally {
      if (isInitial) {
        setLoadingMessages(false);
      } else {
        setIsRefreshingMessages(false);
      }
    }
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    loadMessages(client.id, true);
    setShowNotes(false);
    setShowClientInfo(false);
    setIsEditingClient(false);

    // ✅ НОВОЕ: Инициализируем поля для редактирования
    setEditedClientName(client.name || '');
    setEditedClientPhone(client.phone || '');
  };

  // ✅ НОВОЕ: Функция сохранения информации о клиенте
  const handleSaveClientInfo = async () => {
    if (!selectedClient) return;

    try {
      setIsSavingClient(true);

      await api.updateClient(selectedClient.id, {
        name: editedClientName.trim() || null,
        phone: editedClientPhone.trim() || null,
      });

      // Обновляем локальное состояние
      setClients(clients.map(c =>
        c.id === selectedClient.id
          ? {
            ...c,
            name: editedClientName.trim() || '',
            phone: editedClientPhone.trim() || '',
            display_name: editedClientName.trim() || c.username || c.id.substring(0, 15) + '...'
          }
          : c
      ));

      setSelectedClient({
        ...selectedClient,
        name: editedClientName.trim() || '',
        phone: editedClientPhone.trim() || '',
        display_name: editedClientName.trim() || selectedClient.username || selectedClient.id.substring(0, 15) + '...'
      });

      setIsEditingClient(false);
      toast.success('Информация обновлена');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Ошибка сохранения';
      toast.error(`Ошибка: ${errorMsg}`);
    } finally {
      setIsSavingClient(false);
    }
  };

  // ✅ НОВОЕ: Функция отмены редактирования
  const handleCancelEdit = () => {
    if (!selectedClient) return;
    setEditedClientName(selectedClient.name || '');
    setEditedClientPhone(selectedClient.phone || '');
    setIsEditingClient(false);
  };

  const handleSendMessage = async () => {
    if ((!message.trim() && attachedFiles.length === 0) || !selectedClient) return;

    try {
      // ✅ УЛУЧШЕНО: Загрузка и отправка файлов
      if (attachedFiles.length > 0) {
        setIsUploadingFile(true);
        
        for (const file of attachedFiles) {
          try {
            // 1. Загружаем файл на сервер (нужен endpoint для загрузки)
            const formData = new FormData();
            formData.append('file', file);
            
            const uploadResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
              method: 'POST',
              credentials: 'include',
              body: formData,
            });
            
            if (!uploadResponse.ok) {
              throw new Error('Ошибка загрузки файла');
            }
            
            const { file_url } = await uploadResponse.json();
            
            // 2. Отправляем файл через Instagram API
            const fileType = file.type.startsWith('image/') ? 'image' : 'file';
            
            await api.sendFile(selectedClient.id, file_url, fileType);
            
            toast.success(`Файл "${file.name}" отправлен`);
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Ошибка';
            toast.error(`Не удалось отправить "${file.name}": ${errorMsg}`);
          }
        }
        
        setIsUploadingFile(false);
      }

      if (message.trim()) {
        await api.sendMessage(selectedClient.id, message);
        
        const newMessage: Message = {
          id: Date.now(),
          message: message,
          sender: 'bot',
          timestamp: new Date().toISOString(),
          type: 'text'
        };
        
        setMessages([...messages, newMessage]);
      }

      setMessage('');
      setAttachedFiles([]);
      toast.success('Сообщение отправлено');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Ошибка отправки';
      toast.error(`Ошибка: ${errorMsg}`);
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {

      const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
          const files = Array.from(e.target.files);
          setAttachedFiles([...attachedFiles, ...files]);
          toast.success(`${files.length} ${files.length === 1 ? 'файл добавлен' : 'файла добавлено'}`);
        }
      };

      const handleRemoveFile = (index: number) => {
        setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
        toast.info('Файл удален');
      };

      const handleSaveNotes = () => {
        toast.success('Заметки сохранены');
        setShowNotes(false);
      };

      const filteredClients = clients.filter(client =>
        client.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.includes(searchTerm)
      );

      const canSend = message.trim().length > 0 || attachedFiles.length > 0;

      // ✅ ПОКАЗЫВАЕМ СПИННЕР ТОЛЬКО ПРИ ПЕРВИЧНОЙ ЗАГРУЗКЕ
      if (initialLoading) {
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
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg text-gray-900 flex items-center gap-2 font-semibold">
                    <MessageCircle className="w-5 h-5" />
                    Чаты ({clients.length})
                  </h3>
                  {/* ✅ ИНДИКАТОР ОБНОВЛЕНИЯ */}
                  {isRefreshingMessages && (
                    <Loader className="w-4 h-4 text-pink-600 animate-spin" />
                  )}
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

              <div className="flex-1 overflow-y-auto">
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => handleSelectClient(client)}
                      className={`p-4 cursor-pointer border-b border-gray-100 hover:bg-gray-50 transition-colors ${selectedClient?.id === client.id ? 'bg-pink-50' : ''
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white flex-shrink-0 font-medium text-sm">
                          {client.display_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-900 font-mono truncate" title={selectedClient.username || selectedClient.id}>
                            {selectedClient.username ? `@${selectedClient.username}` : selectedClient.id}
                          </p>
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
                      {/* ✅ НОВОЕ: Показываем фото профиля если есть */}
                      {selectedClient.profile_pic ? (
                        <img
                          src={selectedClient.profile_pic}
                          alt={selectedClient.display_name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md"
                          onError={(e) => {
                            // Fallback если изображение не загрузилось
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                          {selectedClient.display_name.charAt(0).toUpperCase()}
                        </div>
                      )}
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
                        onClick={() => {
                          setShowClientInfo(!showClientInfo);
                          if (!showClientInfo) {
                            // Инициализируем поля при открытии
                            setEditedClientName(selectedClient.name || '');
                            setEditedClientPhone(selectedClient.phone || '');
                            setIsEditingClient(false);
                          }
                        }}
                        title="Информация о клиенте"
                      >
                        <Info className="w-4 h-4" />
                      </Button>
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
                          className={`max-w-md px-4 py-3 rounded-2xl ${msg.sender === 'bot'
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

                {/* Client Info Panel - УЛУЧШЕННЫЙ ДИЗАЙН */}
                {showClientInfo && (
                  <div className="border-t border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden">
                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <Info className="w-4 h-4 text-white" />
                          </div>
                          <h4 className="text-sm text-gray-900 font-semibold">Информация о клиенте</h4>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setShowClientInfo(false);
                            setIsEditingClient(false);
                            handleCancelEdit();
                          }}
                          className="h-8 w-8 p-0 hover:bg-white/50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Avatar & ID */}
                      <div className="flex items-center gap-3 mb-4 p-3 bg-white rounded-lg shadow-sm">
                        <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                          {selectedClient.display_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-0.5">Instagram ID</p>
                          <p className="text-xs text-gray-900 font-mono truncate" title={selectedClient.id}>
                            {selectedClient.id}
                          </p>
                        </div>
                      </div>

                      {/* Editable Fields */}
                      <div className="space-y-3">
                        {/* Name Field */}
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <label className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-2">
                            <span>👤</span> Имя клиента
                          </label>
                          {isEditingClient ? (
                            <Input
                              value={editedClientName}
                              onChange={(e) => setEditedClientName(e.target.value)}
                              placeholder="Введите имя..."
                              className="text-sm"
                            />
                          ) : (
                            <p className="text-sm text-gray-900 font-medium">
                              {selectedClient.name || (
                                <span className="text-gray-400 italic">Не указано</span>
                              )}
                            </p>
                          )}
                        </div>

                        {/* Phone Field */}
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <label className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-2">
                            <Phone className="w-3 h-3" /> Телефон
                          </label>
                          {isEditingClient ? (
                            <Input
                              value={editedClientPhone}
                              onChange={(e) => setEditedClientPhone(e.target.value)}
                              placeholder="+971 XX XXX XXXX"
                              className="text-sm"
                            />
                          ) : (
                            <p className="text-sm text-gray-900 font-medium">
                              {selectedClient.phone || (
                                <span className="text-gray-400 italic">Не указан</span>
                              )}
                            </p>
                          )}
                        </div>

                        {/* Instagram Username */}
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <label className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-2">
                            <Instagram className="w-3 h-3" /> Instagram
                          </label>
                          {selectedClient.username ? (
                            <a
                              href={`https://instagram.com/${selectedClient.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-pink-600 hover:text-pink-700 font-medium flex items-center gap-1 hover:underline"
                            >
                              @{selectedClient.username}
                              <span className="text-gray-400">↗</span>
                            </a>
                          ) : (
                            <p className="text-sm text-gray-400 italic">Не указан</p>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <p className="text-xs text-gray-500 mb-1">Сообщений</p>
                            <p className="text-lg font-bold text-gray-900">{selectedClient.total_messages}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <p className="text-xs text-gray-500 mb-1">Статус</p>
                            <Badge className="bg-pink-600 text-xs">{selectedClient.status}</Badge>
                          </div>
                        </div>

                        {/* Last Contact */}
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <label className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-2">
                            <Clock className="w-3 h-3" /> Последний контакт
                          </label>
                          <p className="text-sm text-gray-900">
                            {new Date(selectedClient.last_contact).toLocaleString('ru-RU')}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 space-y-2">
                        {isEditingClient ? (
                          <div className="flex gap-2">
                            <Button
                              onClick={handleSaveClientInfo}
                              disabled={isSavingClient}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-md"
                              size="sm"
                            >
                              {isSavingClient ? (
                                <>
                                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                                  Сохранение...
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4 mr-2" />
                                  Сохранить
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={handleCancelEdit}
                              disabled={isSavingClient}
                              variant="outline"
                              size="sm"
                              className="px-4"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => setIsEditingClient(true)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                            size="sm"
                          >
                            <span className="mr-2">✏️</span>
                            Редактировать
                          </Button>
                        )}

                        <Button
                          onClick={() => navigate(`/manager/clients/${selectedClient.id}`)}
                          variant="outline"
                          className="w-full shadow-sm"
                          size="sm"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Полный профиль
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes Panel - УЛУЧШЕННЫЙ ДИЗАЙН */}
                {showNotes && (
                  <div className="border-t border-gray-200 bg-gradient-to-br from-yellow-50 to-amber-50">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-lg flex items-center justify-center">
                            <StickyNote className="w-4 h-4 text-white" />
                          </div>
                          <h4 className="text-sm text-gray-900 font-semibold">Заметки о клиенте</h4>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowNotes(false)}
                          className="h-8 w-8 p-0 hover:bg-white/50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Введите заметки о клиенте..."
                        className="min-h-[100px] mb-3 bg-white shadow-sm"
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveNotes}
                        className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white shadow-md"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Сохранить заметки
                      </Button>
                    </div>
                  </div>
                )}

                {/* Attached Files */}
                {attachedFiles.length > 0 && (
                  <div className="border-t border-gray-200 p-3 bg-gray-100 space-y-2">
                    <p className="text-xs font-semibold text-gray-700">
                      Прикрепленные файлы ({attachedFiles.length}):
                    </p>
                    <div className="space-y-1">
                      {attachedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span className="text-xs text-gray-700 truncate">{file.name}</span>
                            <span className="text-xs text-gray-500 flex-shrink-0">({(file.size / 1024).toFixed(1)}KB)</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveFile(index)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
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
                            if (canSend) {
                              handleSendMessage();
                            }
                          }
                        }}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                        multiple
                        onChange={handleFileSelect}
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
                        disabled={!canSend}
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