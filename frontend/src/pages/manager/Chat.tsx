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
  FileText,
  Check,
  User,
  ArrowLeft,
  MoreVertical,
  Image as ImageIcon,
  Video,
  ChevronDown
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import MessageTemplates from '../../components/chat/MessageTemplates';
import QuickReplies from '../../components/chat/QuickReplies';
import MessageSearch from '../../components/chat/MessageSearch';
import { StatusSelect } from '../../components/shared/StatusSelect';
import { useClientStatuses } from '../../hooks/useStatuses';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner@2.0.3';
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
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const [notes, setNotes] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const [isEditingClient, setIsEditingClient] = useState(false);
  const [editedClientName, setEditedClientName] = useState('');
  const [editedClientPhone, setEditedClientPhone] = useState('');
  const [isSavingClient, setIsSavingClient] = useState(false);
  const { statuses: statusConfig, addStatus: handleAddStatus } = useClientStatuses();

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

      if (!isInitial && JSON.stringify(messagesArray) === JSON.stringify(messages)) {
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
    setShowMobileMenu(false);

    setEditedClientName(client.name || '');
    setEditedClientPhone(client.phone || '');
  };

  const handleBackToList = () => {
    setSelectedClient(null);
    setShowNotes(false);
    setShowClientInfo(false);
    setShowTemplates(false);
    setShowMessageSearch(false);
    setShowMobileMenu(false);
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
      if (attachedFiles.length > 0) {
        setIsUploadingFile(true);
        let allFilesSent = true;

        for (const file of attachedFiles) {
          try {
            const formData = new FormData();
            formData.append('file', file);

            const uploadResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
              method: 'POST',
              credentials: 'include',
              body: formData,
              signal: AbortSignal.timeout(120000)
            });

            if (!uploadResponse.ok) {
              const errorText = await uploadResponse.text();
              console.error('Upload error:', errorText);
              throw new Error(`Ошибка загрузки: ${uploadResponse.status}`);
            }

            const uploadResult = await uploadResponse.json();

            if (!uploadResult.file_url) {
              throw new Error('Не получен URL файла');
            }

            const { file_url } = uploadResult;

            const fileType = file.type.startsWith('image/') ? 'image' :
              file.type.startsWith('video/') ? 'video' :
                file.type.startsWith('audio/') ? 'audio' : 'file';

            const sendResult = await api.sendFile(selectedClient.id, file_url, fileType);

            if (sendResult.error) {
              throw new Error(sendResult.error);
            }

            const newFileMessage: Message = {
              id: Date.now() + Math.random(),
              message: file_url,
              sender: 'manager',
              timestamp: new Date().toISOString(),
              type: fileType
            };

            setMessages(prev => [...prev, newFileMessage]);

            toast.success(`Файл "${file.name}" отправлен`);
          } catch (err) {
            allFilesSent = false;
            const errorMsg = err instanceof Error ? err.message : 'Ошибка';
            console.error('File send error:', err);

            if (errorMsg.includes('timeout') || errorMsg.includes('aborted')) {
              toast.error(`⏱️ Время загрузки истекло для "${file.name}"`);
            } else if (errorMsg.includes('403')) {
              toast.error(`🔒 Доступ запрещен для "${file.name}"`);
            } else if (errorMsg.includes('Instagram cannot access')) {
              toast.error(`🚫 Instagram не может получить доступ к файлу с localhost.`);
            } else {
              toast.error(`❌ Не удалось отправить "${file.name}": ${errorMsg}`);
            }
          }
        }

        if (allFilesSent) {
          setAttachedFiles([]);
        }

        setIsUploadingFile(false);
      }

      if (message.trim()) {
        await api.sendMessage(selectedClient.id, message);

        const newMessage: Message = {
          id: Date.now(),
          message: message,
          sender: 'manager',
          timestamp: new Date().toISOString(),
          type: 'text'
        };

        setMessages(prev => [...prev, newMessage]);
        setMessage('');
        toast.success('Сообщение отправлено');
      }

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
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
            <Loader className="w-8 h-8 text-white animate-spin" />
          </div>
          <p className="text-gray-600 font-medium">Загрузка чатов...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <div className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-red-900 font-bold text-lg">Ошибка загрузки</p>
              <p className="text-red-700 mt-2">{error}</p>
              <Button 
                onClick={loadClients} 
                className="mt-4 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-lg"
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
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-pink-50 p-0 md:p-4 flex">
      <div className="bg-white rounded-none md:rounded-3xl shadow-2xl border border-gray-200/50 h-full w-full flex overflow-hidden">
        {/* Clients List */}
        <div className={`
          w-full md:w-96 border-r border-gray-200/50 flex flex-col bg-gradient-to-b from-white to-gray-50/50
          ${selectedClient ? 'hidden md:flex' : 'flex'}
        `}>
          <div className="p-4 md:p-6 border-b border-gray-200/50 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Чаты</h3>
                  <p className="text-xs text-gray-500">{clients.length} диалогов</p>
                </div>
              </div>
              {isRefreshingMessages && (
                <Loader className="w-5 h-5 text-pink-600 animate-spin" />
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Поиск клиента..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 h-12 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredClients.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => handleSelectClient(client)}
                    className={`
                      w-full p-4 hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 
                      transition-all text-left relative group
                      ${selectedClient?.id === client.id ? 'bg-gradient-to-r from-pink-100 to-purple-100 border-l-4 border-l-pink-600' : ''}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative flex-shrink-0">
                        {client.profile_pic && client.profile_pic.trim() !== '' ? (
                          <img
                            src={client.profile_pic}
                            alt={client.display_name}
                            className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md"
                            crossOrigin="anonymous"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-14 h-14 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-md ${
                            client.profile_pic && client.profile_pic.trim() !== '' ? 'hidden' : ''
                          }`}
                          style={{ display: client.profile_pic && client.profile_pic.trim() !== '' ? 'none' : 'flex' }}
                        >
                          {client.display_name.charAt(0).toUpperCase()}
                        </div>
                        {client.unread_count && client.unread_count > 0 && (
                          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
                            {client.unread_count}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-gray-900 truncate">{client.display_name}</p>
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                            {new Date(client.last_contact).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">{client.phone || 'Нет телефона'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">{client.total_messages} сообщений</span>
                          {client.status && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              statusConfig[client.status]?.color || 'bg-gray-100 text-gray-600'
                            }`}>
                              {statusConfig[client.status]?.label || client.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mb-4">
                  <MessageCircle className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">Клиентов не найдено</p>
                <p className="text-sm text-gray-400 mt-1">Попробуйте изменить критерии поиска</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        {selectedClient ? (
          <div className="flex-1 flex flex-col bg-white">
            {/* Chat Header */}
            <div className="p-4 md:p-5 border-b border-gray-200/50 bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={handleBackToList}
                  className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/50 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-700" />
                </button>

                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {selectedClient.profile_pic && selectedClient.profile_pic.trim() !== '' ? (
                    <img
                      src={selectedClient.profile_pic}
                      alt={selectedClient.display_name}
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-lg flex-shrink-0"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={`w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0 ${
                    selectedClient.profile_pic && selectedClient.profile_pic.trim() !== '' ? 'hidden' : ''
                  }`}>
                    {selectedClient.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 truncate">{selectedClient.display_name}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      {selectedClient.phone && (
                        <span className="hidden sm:flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {selectedClient.phone}
                        </span>
                      )}
                      {selectedClient.username && (
                        <a
                          href={`https://instagram.com/${selectedClient.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-pink-600 hover:text-pink-700 flex items-center gap-1 truncate font-medium"
                        >
                          <Instagram className="w-3 h-3 flex-shrink-0" />
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
                    onClick={() => setShowMessageSearch(!showMessageSearch)}
                    className={`h-10 w-10 p-0 rounded-xl border-2 ${
                      showMessageSearch ? 'bg-yellow-100 border-yellow-400 text-yellow-700' : 'hover:bg-white'
                    }`}
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                  <div className="relative">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowMobileMenu(!showMobileMenu)}
                      className="h-10 w-10 p-0 rounded-xl border-2 hover:bg-white"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                    {showMobileMenu && (
                      <>
                        <div 
                          className="fixed inset-0 z-40"
                          onClick={() => setShowMobileMenu(false)}
                        />
                        <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 z-50">
                          <button
                            onClick={() => {
                              setShowClientInfo(!showClientInfo);
                              setShowTemplates(false);
                              setShowNotes(false);
                              setShowMobileMenu(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 flex items-center gap-3 transition-colors"
                          >
                            <Info className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">Информация</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowTemplates(!showTemplates);
                              setShowClientInfo(false);
                              setShowNotes(false);
                              setShowMobileMenu(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 flex items-center gap-3 transition-colors"
                          >
                            <FileText className="w-4 h-4 text-purple-600" />
                            <span className="font-medium">Шаблоны</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowNotes(!showNotes);
                              setShowClientInfo(false);
                              setShowTemplates(false);
                              setShowMobileMenu(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 flex items-center gap-3 transition-colors"
                          >
                            <StickyNote className="w-4 h-4 text-yellow-600" />
                            <span className="font-medium">Заметки</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Search Panel */}
            {showMessageSearch && (
              <MessageSearch
                messages={messages}
                onJumpToMessage={(index) => {
                  messageRefs.current[index]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                  });
                }}
                onClose={() => setShowMessageSearch(false)}
              />
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-gradient-to-b from-white to-gray-50/30">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                      <Loader className="w-7 h-7 text-white animate-spin" />
                    </div>
                    <p className="text-gray-500 font-medium">Загрузка сообщений...</p>
                  </div>
                </div>
              ) : messages.length > 0 ? (
                messages.map((msg, index) => (
                  <div
                    key={msg.id}
                    ref={(el) => messageRefs.current[index] = el}
                    className={`flex ${(msg.sender === 'bot' || msg.sender === 'manager') ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                  >
                    <div
                      className={`rounded-3xl shadow-lg overflow-hidden max-w-sm md:max-w-md ${
                        (msg.sender === 'bot' || msg.sender === 'manager')
                          ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white'
                          : 'bg-white text-gray-900 border-2 border-gray-200'
                      }`}
                    >
                      {msg.type === 'image' ? (
                        <div className="relative group">
                          <img
                            src={(() => {
                              if (msg.message.startsWith('http')) {
                                if (msg.message.includes('zrok.io')) {
                                  const url = new URL(msg.message);
                                  const filePath = url.pathname;
                                  return `${import.meta.env.VITE_API_URL}${filePath}`;
                                }
                                return msg.message;
                              }
                              return `${import.meta.env.VITE_API_URL}${msg.message}`;
                            })()}
                            alt="Изображение"
                            loading="lazy"
                            className="w-full h-auto max-h-96 object-cover cursor-pointer hover:scale-105 transition-transform rounded-t-3xl"
                            onClick={() => window.open(msg.message, '_blank')}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling;
                              if (fallback) (fallback as HTMLElement).style.display = 'flex';
                            }}
                          />
                          <div
                            style={{ display: 'none' }}
                            className={`px-6 py-8 flex flex-col items-center justify-center min-h-[180px] ${
                              (msg.sender === 'bot' || msg.sender === 'manager') ? 'text-pink-100' : 'text-gray-500'
                            }`}
                          >
                            <ImageIcon className="w-16 h-16 mb-3 opacity-50" />
                            <p className="font-medium">📷 Изображение недоступно</p>
                          </div>
                          <div className={`px-5 py-3 ${(msg.sender === 'bot' || msg.sender === 'manager') ? 'text-pink-100' : 'text-gray-600'}`}>
                            <p className="text-xs font-medium">
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
                            className="w-full h-auto rounded-t-3xl max-h-96"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling;
                              if (fallback) (fallback as HTMLElement).style.display = 'flex';
                            }}
                          />
                          <div className={`px-5 py-3 ${(msg.sender === 'bot' || msg.sender === 'manager') ? 'text-pink-100' : 'text-gray-600'}`}>
                            <p className="text-xs font-medium">
                              {new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      ) : msg.type === 'audio' ? (
                        <div className="px-5 py-4 min-w-[280px]">
                          <audio
                            src={msg.message}
                            controls
                            className="w-full"
                          />
                          <div className={`mt-3 ${(msg.sender === 'bot' || msg.sender === 'manager') ? 'text-pink-100' : 'text-gray-600'}`}>
                            <p className="text-xs font-medium">
                              {new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      ) : msg.type === 'file' ? (
                        <div className="px-5 py-4 min-w-[240px]">
                          <a
                            href={msg.message}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-3 hover:underline group ${
                              (msg.sender === 'bot' || msg.sender === 'manager') ? 'text-pink-100' : 'text-blue-600'
                            }`}
                          >
                            <FileText className="w-6 h-6 group-hover:scale-110 transition-transform" />
                            <span className="font-medium">Открыть файл</span>
                          </a>
                          <div className={`mt-3 ${(msg.sender === 'bot' || msg.sender === 'manager') ? 'text-pink-100' : 'text-gray-600'}`}>
                            <p className="text-xs font-medium">
                              {new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="px-5 py-4 max-w-md">
                          <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                          <div className="flex items-center justify-between mt-2">
                            <p className={`text-xs font-medium ${
                              (msg.sender === 'bot' || msg.sender === 'manager') ? 'text-pink-100' : 'text-gray-500'
                            }`}>
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
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-10 h-10 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">Нет сообщений</p>
                    <p className="text-sm text-gray-400 mt-1">Начните диалог с клиентом</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Client Info Panel */}
            {showClientInfo && selectedClient && (
              <div className="border-t border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4 md:p-6 max-h-[500px] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    Информация о клиенте
                  </h3>
                  <button
                    onClick={() => {
                      setShowClientInfo(false);
                      setIsEditingClient(false);
                      handleCancelEdit();
                    }}
                    className="h-10 w-10 hover:bg-gray-100 rounded-xl flex items-center justify-center transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-4 mb-6 p-5 bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl border-2 border-pink-100">
                  {selectedClient.profile_pic ? (
                    <img
                      src={selectedClient.profile_pic}
                      alt={selectedClient.display_name}
                      className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-xl"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-xl">
                      {selectedClient.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-xl font-bold text-gray-900">{selectedClient.display_name}</p>
                    <p className="text-sm text-gray-500 mt-1">ID: {selectedClient.id.substring(0, 12)}...</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="border-2 border-gray-200 rounded-2xl p-4 bg-white shadow-sm">
                    <label className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
                      <span className="text-lg">👤</span> Имя клиента
                    </label>
                    {isEditingClient ? (
                      <input
                        type="text"
                        value={editedClientName}
                        onChange={(e) => setEditedClientName(e.target.value)}
                        placeholder="Введите имя..."
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium px-2">
                        {selectedClient.name || (
                          <span className="text-gray-400 italic">Не указано</span>
                        )}
                      </p>
                    )}
                  </div>

                  <div className="border-2 border-gray-200 rounded-2xl p-4 bg-white shadow-sm">
                    <label className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
                      <Phone className="w-4 h-4" />
                      Телефон
                    </label>
                    {isEditingClient ? (
                      <input
                        type="text"
                        value={editedClientPhone}
                        onChange={(e) => setEditedClientPhone(e.target.value)}
                        placeholder="+971 XX XXX XXXX"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium px-2">
                        {selectedClient.phone || (
                          <span className="text-gray-400 italic">Не указан</span>
                        )}
                      </p>
                    )}
                  </div>

                  <div className="border-2 border-purple-200 rounded-2xl p-4 bg-gradient-to-r from-purple-50 to-pink-50 shadow-sm">
                    <label className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
                      <Instagram className="w-4 h-4 text-pink-600" />
                      Instagram
                    </label>
                    {selectedClient.username ? (
                      <a
                        href={`https://instagram.com/${selectedClient.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-pink-600 hover:text-pink-700 font-bold text-base transition-colors group px-2"
                      >
                        <span>@{selectedClient.username}</span>
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ) : (
                      <p className="text-gray-400 italic px-2">Не указан</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="border-2 border-blue-200 rounded-2xl p-4 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-sm">
                      <p className="text-sm text-gray-600 mb-2 font-medium">Сообщений</p>
                      <p className="text-3xl font-bold text-blue-600">{selectedClient.total_messages}</p>
                    </div>
                    <div className="border-2 border-green-200 rounded-2xl p-4 bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm">
                      <p className="text-sm text-gray-600 mb-2 font-medium">Статус</p>
                      {isEditingClient ? (
                        <StatusSelect
                          value={selectedClient.status}
                          onChange={async (newStatus) => {
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
                          options={statusConfig}
                          allowAdd={true}
                          onAddStatus={handleAddStatus}
                        />
                      ) : (
                        <span className={`inline-block px-3 py-1 font-semibold rounded-xl ${
                          statusConfig[selectedClient.status]?.color || 'bg-green-600 text-white'
                        }`}>
                          {statusConfig[selectedClient.status]?.label || selectedClient.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border-2 border-gray-200 rounded-2xl p-4 bg-white shadow-sm">
                    <label className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Последний контакт
                    </label>
                    <p className="text-gray-900 font-medium px-2">
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

                <div className="mt-6 space-y-3">
                  {isEditingClient ? (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveClientInfo}
                        disabled={isSavingClient}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isSavingClient ? (
                          <>
                            <Loader className="w-5 h-5 animate-spin" />
                            Сохранение...
                          </>
                        ) : (
                          <>
                            <Check className="w-5 h-5" />
                            Сохранить
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isSavingClient}
                        className="px-4 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditingClient(true)}
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="w-full border-2 border-gray-300 hover:bg-gray-50 font-bold py-3 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="border-t border-gray-200 bg-gradient-to-br from-white to-purple-50 p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    Шаблоны сообщений
                  </h3>
                  <button
                    onClick={() => setShowTemplates(false)}
                    className="h-10 w-10 hover:bg-white rounded-xl flex items-center justify-center transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
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
                <div className="p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                        <StickyNote className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-gray-900 font-bold">Заметки о клиенте</h4>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowNotes(false)}
                      className="h-10 w-10 p-0 hover:bg-white/50 rounded-xl"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Введите заметки о клиенте..."
                    className="min-h-[120px] mb-3 bg-white shadow-sm border-2 border-yellow-200 rounded-xl focus:ring-2 focus:ring-yellow-500"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveNotes}
                    className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white shadow-lg rounded-xl py-3 font-bold"
                  >
                    <Check className="w-5 h-5 mr-2" />
                    Сохранить заметки
                  </Button>
                </div>
              </div>
            )}

            {/* Quick Replies */}
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
              <div className="border-t border-gray-200 p-4 bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    Прикрепленные файлы ({attachedFiles.length})
                  </p>
                  <button
                    onClick={() => {
                      setAttachedFiles([]);
                      toast.info('Файлы очищены');
                    }}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Очистить все
                  </button>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2">
                  {attachedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="relative flex-shrink-0 group"
                    >
                      <div className="w-24 h-24 bg-white rounded-2xl border-2 border-gray-200 overflow-hidden flex items-center justify-center shadow-md">
                        {file.type.startsWith('image/') ? (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : file.type.startsWith('video/') ? (
                          <div className="flex flex-col items-center justify-center">
                            <Video className="w-10 h-10 text-purple-600" />
                            <span className="text-xs text-gray-500 mt-1 font-medium">Видео</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <FileText className="w-10 h-10 text-gray-400" />
                            <span className="text-xs text-gray-500 mt-1 font-medium">Файл</span>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-gray-600 mt-2 w-24 truncate text-center font-medium" title={file.name}>
                        {file.name}
                      </p>

                      <p className="text-xs text-gray-500 text-center">
                        {(file.size / 1024).toFixed(0)}KB
                      </p>

                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition opacity-0 group-hover:opacity-100"
                        title="Удалить"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Input */}
            <div className="p-4 md:p-5 border-t border-gray-200 bg-white">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Введите сообщение или / для быстрых ответов..."
                    className="resize-none border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    rows={2}
                    disabled={isUploadingFile}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        const canSendNow = message.trim().length > 0 || attachedFiles.length > 0;
                        if (canSendNow && !isUploadingFile) {
                          handleSendMessage();
                        }
                      } else if (e.key === '/' && !showQuickReplies && message.trim() === '') {
                        setShowQuickReplies(true);
                        setShowTemplates(false);
                        setShowNotes(false);
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
                    className="h-11 w-11 p-0 rounded-xl border-2 border-gray-200 hover:bg-gradient-to-br hover:from-purple-50 hover:to-pink-50"
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 h-11 w-11 p-0 rounded-xl shadow-lg hover:shadow-xl"
                    disabled={!canSend || isUploadingFile}
                    title={isUploadingFile ? "Загрузка файла..." : "Отправить"}
                  >
                    {isUploadingFile ? (
                      <Loader className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 hidden md:flex items-center justify-center text-gray-500 px-8 bg-gradient-to-br from-gray-50 to-pink-50">
            <div className="text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-pink-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <MessageCircle className="w-16 h-16 text-pink-600" />
              </div>
              <p className="text-xl font-bold text-gray-700 mb-2">Выберите клиента для начала чата</p>
              <p className="text-gray-500">Выберите диалог из списка с��ева</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
