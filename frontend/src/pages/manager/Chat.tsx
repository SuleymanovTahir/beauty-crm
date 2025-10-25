// frontend/src/pages/manager/Chat.tsx - ИСПРАВЛЕННАЯ ВЕРСИЯ
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
  Clock,
  Edit2,
  User
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import MessageReactions from '../../components/chat/MessageReactions';
import MessageTemplates from '../../components/chat/MessageSearch';
import QuickReplies from '../../components/chat/QuickReplies';
import MessageSearch from '../../components/chat/MessageSearch';
import { useLocation, useNavigate } from 'react-router-dom';
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
  profile_pic?: string;
  unread_count?: number;
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

  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isRefreshingMessages, setIsRefreshingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showNotes, setShowNotes] = useState(false);
  const [showClientInfo, setShowClientInfo] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false); // ✅ ИЗМЕНЕНО: по умолчанию скрыты
  const [showSearch, setShowSearch] = useState(false);

  const [notes, setNotes] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const [isEditingClient, setIsEditingClient] = useState(false);
  const [editedClientName, setEditedClientName] = useState('');
  const [editedClientPhone, setEditedClientPhone] = useState('');
  const [isSavingClient, setIsSavingClient] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  useEffect(() => {
    if (!selectedClient) return;

    const interval = setInterval(() => {
      loadMessages(selectedClient.id, false);
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedClient]);

  // ✅ НОВОЕ: Обработка слэша для показа подсказок
  useEffect(() => {
    if (message.startsWith('/')) {
      setShowQuickReplies(true);
    } else {
      setShowQuickReplies(false);
    }
  }, [message]);

  const loadClients = async () => {
    try {
      setInitialLoading(true);
      setError(null);
      const data = await api.getClients();

      const clientsArray = data.clients || (Array.isArray(data) ? data : []);

      const clientsWithUnread = await Promise.all(
        clientsArray.map(async (client: any) => {
          try {
            const unreadData = await api.getClientUnreadCount(client.id);
            return {
              ...client,
              unread_count: unreadData?.unread_count || 0
            };
          } catch {
            return { ...client, unread_count: 0 };
          }
        })
      );

      setClients(clientsWithUnread);

      if (clientsWithUnread.length > 0 && !selectedClient) {
        setSelectedClient(clientsWithUnread[0]);
        loadMessages(clientsWithUnread[0].id, true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки клиентов';
      setError(message);
      toast.error(`Ошибка: ${message}`);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadMessages = async (clientId: string, isInitial: boolean = false) => {
    try {
      if (isInitial) {
        setLoadingMessages(true);
      } else {
        setIsRefreshingMessages(true);
      }

      const data = await api.getChatMessages(clientId, 50);
      const messagesArray = data.messages || (Array.isArray(data) ? data : []);

      // ✅ ДОБАВИТЬ: Проверка изменений
      if (!isInitial && JSON.stringify(messagesArray) === JSON.stringify(messages)) {
        // Нет изменений - не обновляем состояние
        return;
      }

      setMessages(messagesArray);
    } catch (err) {
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
    setShowTemplates(false);
    setIsEditingClient(false);

    setEditedClientName(client.name || '');
    setEditedClientPhone(client.phone || '');
  };

  const handleSaveClientInfo = async () => {
    if (!selectedClient) return;

    try {
      setIsSavingClient(true);

      await api.updateClient(selectedClient.id, {
        name: editedClientName.trim() || null,
        phone: editedClientPhone.trim() || null,
      });

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

  const handleCancelEdit = () => {
    if (!selectedClient) return;
    setEditedClientName(selectedClient.name || '');
    setEditedClientPhone(selectedClient.phone || '');
    setIsEditingClient(false);
  };

  const handleSendMessage = async () => {
    if ((!message.trim() && attachedFiles.length === 0) || !selectedClient) return;

    try {
      // ✅ ИСПРАВЛЕНИЕ: Отправляем файлы ПЕРВЫМИ
      if (attachedFiles.length > 0) {
        setIsUploadingFile(true);

        for (const file of attachedFiles) {
          try {
            // 1. Загружаем файл на сервер
            const formData = new FormData();
            formData.append('file', file);

            const uploadResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
              method: 'POST',
              credentials: 'include',
              body: formData,
            });

            if (!uploadResponse.ok) {
              const errorText = await uploadResponse.text();
              console.error('Upload error:', errorText);
              throw new Error(`Ошибка загрузки: ${uploadResponse.status}`);
            }

            const uploadResult = await uploadResponse.json();
            console.log('Upload result:', uploadResult);

            if (!uploadResult.file_url) {
              throw new Error('Не получен URL файла');
            }

            const { file_url } = uploadResult;

            // 2. Определяем тип файла
            const fileType = file.type.startsWith('image/') ? 'image' :
              file.type.startsWith('video/') ? 'video' :
                file.type.startsWith('audio/') ? 'audio' : 'file';

            console.log('Sending file:', { file_url, fileType });

            // 3. Отправляем через Instagram API
            const sendResult = await api.sendFile(selectedClient.id, file_url, fileType);
            console.log('Send result:', sendResult);

            if (sendResult.error) {
              throw new Error(sendResult.error);
            }

            // ✅ Добавляем сообщение в локальный стейт СРАЗУ
            const newFileMessage: Message = {
              id: Date.now() + Math.random(),
              message: file_url,
              sender: 'bot',
              timestamp: new Date().toISOString(),
              type: fileType
            };

            setMessages(prev => [...prev, newFileMessage]);

            toast.success(`Файл "${file.name}" отправлен`);
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Ошибка';
            console.error('File send error:', err);
            toast.error(`Не удалось отправить "${file.name}": ${errorMsg}`);
          }
        }

        // ✅ ОЧИЩАЕМ attachedFiles СРАЗУ после отправки
        setAttachedFiles([]);
        setIsUploadingFile(false);
      }

      // Отправляем текстовое сообщение (если есть)
      if (message.trim()) {
        console.log('Sending text message:', message);

        await api.sendMessage(selectedClient.id, message);

        const newMessage: Message = {
          id: Date.now(),
          message: message,
          sender: 'bot',
          timestamp: new Date().toISOString(),
          type: 'text'
        };

        setMessages(prev => [...prev, newMessage]);
        setMessage('');
        toast.success('Сообщение отправлено');
      }

      // Обновляем историю через 1 секунду
      setTimeout(() => {
        if (selectedClient) {
          loadMessages(selectedClient.id, false);
        }
      }, 1000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Ошибка отправки';
      console.error('Send error:', err);
      toast.error(`Ошибка: ${errorMsg}`);
    } finally {
      setIsUploadingFile(false);
    }
  };

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
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-pink-600" />
                Чаты ({clients.length})
              </h3>
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
                  className={`p-4 cursor-pointer border-b border-gray-100 hover:bg-gray-50 transition-colors ${selectedClient?.id === client.id ? 'bg-pink-50 border-l-4 border-l-pink-600' : ''
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      {client.profile_pic ? (
                        <img
                          src={client.profile_pic}
                          alt={client.display_name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback') as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className={`avatar-fallback w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm ${client.profile_pic ? 'hidden' : ''
                          }`}
                      >
                        {client.display_name.charAt(0).toUpperCase()}
                      </div>
                      {/* ✅ ИСПРАВЛЕНО: Показываем только если есть непрочитанные */}
                      {client.unread_count && client.unread_count > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                          <span className="text-white text-xs font-bold">{client.unread_count}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{client.display_name}</p>
                      <p className="text-xs text-gray-600 truncate">{client.phone || 'Нет телефона'}</p>
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
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-pink-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedClient.profile_pic ? (
                    <img
                      src={selectedClient.profile_pic}
                      alt={selectedClient.display_name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={`w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-md ${selectedClient.profile_pic ? 'hidden' : ''
                    }`}>
                    {selectedClient.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{selectedClient.display_name}</p>
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
                    onClick={() => setShowSearch(!showSearch)}
                    title="Поиск по сообщениям"
                    className={showSearch ? 'bg-yellow-100 border-yellow-300' : ''}
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                  {/* ✅ ИСПРАВЛЕНО: Кнопка информации */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowClientInfo(!showClientInfo);
                      setShowTemplates(false);
                      setShowNotes(false);
                    }}
                    title="Информация о клиенте"
                    className={showClientInfo ? 'bg-blue-100 border-blue-300' : ''}
                  >
                    <Info className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowTemplates(!showTemplates);
                      setShowClientInfo(false);
                      setShowNotes(false);
                    }}
                    title="Шаблоны сообщений"
                    className={showTemplates ? 'bg-pink-100 border-pink-300' : ''}
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowNotes(!showNotes);
                      setShowClientInfo(false);
                      setShowTemplates(false);
                    }}
                    title="Заметки"
                    className={showNotes ? 'bg-yellow-100 border-yellow-300' : ''}
                  >
                    <StickyNote className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Search Panel */}
            {showSearch && (
              <MessageSearch
                messages={messages}
                onJumpToMessage={(index) => {
                  messageRefs.current[index]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                  });
                }}
                onClose={() => setShowSearch(false)}
              />
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader className="w-6 h-6 text-pink-600 animate-spin" />
                </div>
              ) : messages.length > 0 ? (
                messages.map((msg, index) => (
                  <div
                    key={msg.id}
                    ref={(el) => messageRefs.current[index] = el}
                    className={`flex ${msg.sender === 'bot' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                  >
                    {/* ✅ ИСПРАВЛЕНО: Убран max-w-md, чтобы изображения не ограничивались */}
                    <div
                      className={`rounded-2xl shadow-md overflow-hidden ${msg.sender === 'bot'
                        ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                        }`}
                    >
                      {/* ✅ ИСПРАВЛЕННАЯ ОБРАБОТКА ИЗОБРАЖЕНИЙ */}
                      {msg.type === 'image' ? (
                        <div className="relative">
                          <img
                            src={msg.message}
                            alt="Изображение" loading="lazy"
                            className={`h-auto rounded-t-2xl cursor-pointer hover:scale-105 transition-transform duration-200 ${msg.sender === 'bot'
                              ? 'w-[250px]'  // Исходящие меньше (250px)
                              : 'w-[350px]'  // Входящие больше (350px)
                              }`}

                            // Вариант 2: Одинаковый размер 300px
                            // className="w-[300px] h-auto rounded-t-2xl cursor-pointer hover:scale-105 transition-transform duration-200"

                            // Вариант 3: Маленький 200px
                            // className="w-[200px] h-auto rounded-t-2xl cursor-pointer hover:scale-105 transition-transform duration-200"

                            // Вариант 4: Большой 400px
                            // className="w-[400px] h-auto rounded-t-2xl cursor-pointer hover:scale-105 transition-transform duration-200"

                            onClick={() => window.open(msg.message, '_blank')}
                            onError={(e) => {
                              console.error('❌ Ошибка загрузки изображения:', msg.message);
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling;
                              if (fallback) (fallback as HTMLElement).style.display = 'flex';
                            }}
                          />

                          {/* Fallback при ошибке загрузки */}
                          <div
                            style={{ display: 'none' }}
                            className={`px-4 py-3 text-sm flex flex-col items-center justify-center min-h-[100px] ${msg.sender === 'bot' ? 'text-pink-100' : 'text-gray-500'
                              }`}
                          >
                            <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p>📷 Изображение недоступно</p>
                            <p className="text-xs opacity-75 mt-1 break-all max-w-[200px]">{msg.message.substring(0, 50)}...</p>
                          </div>

                          {/* Иконка увеличения при наведении */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-2">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                            </svg>
                          </div>

                          {/* Время */}
                          <div className={`px-4 py-2 ${msg.sender === 'bot' ? 'text-pink-100' : 'text-gray-600'}`}>
                            <p className="text-xs">
                              {new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      ) : msg.type === 'video' ? (
                        <div className="relative">
                          <video
                            src={msg.message}
                            controls
                            className="w-[400px] h-auto rounded-t-2xl"
                            onError={(e) => {
                              console.error('❌ Ошибка загрузки видео:', msg.message);
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling;
                              if (fallback) (fallback as HTMLElement).style.display = 'flex';
                            }}
                          />
                          <div
                            style={{ display: 'none' }}
                            className={`px-4 py-3 text-sm flex flex-col items-center ${msg.sender === 'bot' ? 'text-pink-100' : 'text-gray-500'
                              }`}
                          >
                            <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <p>🎥 Видео недоступно</p>
                          </div>
                          <div className={`px-4 py-2 ${msg.sender === 'bot' ? 'text-pink-100' : 'text-gray-600'}`}>
                            <p className="text-xs">
                              {new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      ) : msg.type === 'audio' ? (
                        <div className="px-4 py-3 min-w-[250px]">
                          <audio
                            src={msg.message}
                            controls
                            className="w-full"
                            onError={(e) => {
                              console.error('❌ Ошибка загрузки аудио:', msg.message);
                            }}
                          />
                          <div className={`mt-2 ${msg.sender === 'bot' ? 'text-pink-100' : 'text-gray-600'}`}>
                            <p className="text-xs">
                              {new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      ) : msg.type === 'file' ? (
                        <div className="px-4 py-3 min-w-[200px]">
                          <a
                            href={msg.message}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 hover:underline group ${msg.sender === 'bot' ? 'text-pink-100' : 'text-blue-600'
                              }`}
                          >
                            <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span>Открыть файл</span>
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                          <div className={`mt-2 ${msg.sender === 'bot' ? 'text-pink-100' : 'text-gray-600'}`}>
                            <p className="text-xs">
                              {new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      ) : (
                        // Текстовое сообщение
                        <div className="px-4 py-3 max-w-md">
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                          <div className="flex items-center justify-between mt-2">
                            <p className={`text-xs ${msg.sender === 'bot' ? 'text-pink-100' : 'text-gray-500'}`}>
                              {new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      )}
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

            {/* ✅ ИСПРАВЛЕНО: Client Info Panel */}
            {showClientInfo && selectedClient && (
              <div className="border-t border-gray-200 bg-white p-6 max-h-[500px] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <User className="w-5 h-5 text-pink-600" />
                    Информация о клиенте
                  </h3>
                  <button
                    onClick={() => {
                      setShowClientInfo(false);
                      setIsEditingClient(false);
                      handleCancelEdit();
                    }}
                    className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg flex items-center justify-center transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-4 mb-6 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl">
                  {selectedClient.profile_pic ? (
                    <img
                      src={selectedClient.profile_pic}
                      alt={selectedClient.display_name}
                      className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                      {selectedClient.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-xl font-bold text-gray-900">{selectedClient.display_name}</p>
                    <p className="text-sm text-gray-500">ID: {selectedClient.id.substring(0, 12)}...</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* ✅ ИСПРАВЛЕНО: Имя клиента - НАТИВНЫЙ INPUT */}
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <span className="text-lg">👤</span> Имя клиента
                    </label>
                    {isEditingClient ? (
                      <input
                        type="text"
                        value={editedClientName}
                        onChange={(e) => setEditedClientName(e.target.value)}
                        placeholder="Введите имя..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {selectedClient.name || (
                          <span className="text-gray-400 italic">Не указано</span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Телефон */}
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Телефон
                    </label>
                    {isEditingClient ? (
                      <input
                        type="text"
                        value={editedClientPhone}
                        onChange={(e) => setEditedClientPhone(e.target.value)}
                        placeholder="+971 XX XXX XXXX"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {selectedClient.phone || (
                          <span className="text-gray-400 italic">Не указан</span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Instagram */}
                  <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-purple-50 to-pink-50">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <svg className="w-4 h-4 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                      Instagram
                    </label>
                    {selectedClient.username ? (
                      <a
                        href={`https://instagram.com/${selectedClient.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-pink-600 hover:text-pink-700 font-semibold text-base transition-colors group"
                      >
                        <span>@{selectedClient.username}</span>
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ) : (
                      <p className="text-gray-400 italic">Не указан</p>
                    )}
                  </div>

                  {/* Статистика */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                      <p className="text-sm text-gray-600 mb-1">Сообщений</p>
                      <p className="text-2xl font-bold text-blue-600">{selectedClient.total_messages}</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4 bg-green-50">
                      <p className="text-sm text-gray-600 mb-2">Статус</p>
                      {isEditingClient ? (
                        <select
                          value={selectedClient.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            try {
                              await api.updateClientStatus(selectedClient.id, newStatus);
                              setSelectedClient({ ...selectedClient, status: newStatus });
                              setClients(clients.map(c =>
                                c.id === selectedClient.id ? { ...c, status: newStatus } : c
                              ));
                              toast.success('Статус обновлён');
                            } catch (err) {
                              toast.error('Ошибка обновления статуса');
                            }
                          }}
                          className="w-full p-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                        >
                          <option value="new">Новый</option>
                          <option value="contacted">Связались</option>
                          <option value="interested">Заинтересован</option>
                          <option value="lead">Лид</option>
                          <option value="customer">Клиент</option>
                          <option value="vip">VIP</option>
                          <option value="inactive">Неактивен</option>
                        </select>
                      ) : (
                        <span className="inline-block px-3 py-1 bg-green-600 text-white font-semibold rounded-full text-sm">
                          {selectedClient.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Последний контакт */}
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Последний контакт
                    </label>
                    <p className="text-gray-900">
                      {new Date(selectedClient.last_contact).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {/* Кнопки действий */}
                <div className="mt-6 space-y-3">
                  {isEditingClient ? (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveClientInfo}
                        disabled={isSavingClient}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isSavingClient ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Сохранение...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Сохранить
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isSavingClient}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditingClient(true)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Редактировать
                    </button>
                  )}

                  <button
                    onClick={() => {
                      const role = JSON.parse(localStorage.getItem('user') || '{}').role;
                      const prefix = role === 'admin' ? '/admin' : '/manager';
                      navigate(`${prefix}/clients/${selectedClient.id}`);
                    }}
                    className="w-full border border-gray-300 hover:bg-gray-50 font-semibold py-2 px-4 rounded-lg shadow-sm transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Полный профиль
                  </button>
                </div>
              </div>
            )}

            {/* Templates Panel */}
            {showTemplates && (
              <div className="border-t border-gray-200 bg-white p-6">
                <MessageTemplates
                  onSelect={(content) => {
                    setMessage(content);
                    setShowTemplates(false);
                    toast.success('Шаблон вставлен');
                  }}
                />
              </div>
            )}

            {/* Notes Panel */}
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

            {/* ✅ ИСПРАВЛЕНО: Quick Replies показываются только при вводе "/" */}
            {showQuickReplies && selectedClient && (
              <div className="border-t border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 p-3">
                <QuickReplies
                  onSelect={(text) => {
                    setMessage(text);
                    setShowQuickReplies(false);
                  }}
                />
              </div>
            )}

            {/* Attached Files */}
            {attachedFiles.length > 0 && (
              <div className="border-t border-gray-200 p-3 bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                    <Paperclip className="w-3 h-3" />
                    Прикрепленные файлы ({attachedFiles.length})
                  </p>
                  {/* ✅ НОВОЕ: Кнопка "Очистить все" */}
                  <button
                    onClick={() => {
                      setAttachedFiles([]);
                      toast.info('Файлы очищены');
                    }}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Очистить все
                  </button>
                </div>

                {/* ✅ ИСПРАВЛЕНО: Компактное горизонтальное отображение */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {attachedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="relative flex-shrink-0 group"
                    >
                      {/* Превью файла */}
                      <div className="w-20 h-20 bg-white rounded-lg border-2 border-gray-200 overflow-hidden flex items-center justify-center">
                        {file.type.startsWith('image/') ? (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : file.type.startsWith('video/') ? (
                          <div className="flex flex-col items-center justify-center">
                            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs text-gray-500 mt-1">Видео</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <FileText className="w-8 h-8 text-gray-400" />
                            <span className="text-xs text-gray-500 mt-1">Файл</span>
                          </div>
                        )}
                      </div>

                      {/* Название файла */}
                      <p className="text-xs text-gray-600 mt-1 w-20 truncate text-center" title={file.name}>
                        {file.name}
                      </p>

                      {/* Размер */}
                      <p className="text-xs text-gray-500 text-center">
                        {(file.size / 1024).toFixed(0)}KB
                      </p>

                      {/* Кнопка удаления */}
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition opacity-0 group-hover:opacity-100"
                        title="Удалить"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Input - БЕЗ ИЗМЕНЕНИЙ, но убедитесь что disabled правильно работает */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Введите сообщение или / для быстрых ответов..."
                    className="resize-none"
                    rows={2}
                    disabled={isUploadingFile}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        // ✅ ИСПРАВЛЕНО: проверяем canSend без учета attachedFiles
                        const canSendNow = message.trim().length > 0 || attachedFiles.length > 0;
                        if (canSendNow && !isUploadingFile) {
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
                    accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx"
                    multiple
                    onChange={handleFileSelect}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingFile}
                    title="Прикрепить файл"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                    disabled={!canSend || isUploadingFile}
                    title={isUploadingFile ? "Загрузка файла..." : "Отправить"}
                  >
                    {isUploadingFile ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium">Выберите клиента для начала чата</p>
              <p className="text-sm text-gray-400 mt-2">Выберите диалог из списка слева</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}