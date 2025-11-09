// frontend/src/pages/manager/Chat.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  MessageCircle,
  Search,
  Paperclip,
  Send,
  Loader,
  AlertCircle,
  X,
  StickyNote,
  Info,
  FileText,
  ArrowLeft,
  MoreVertical,
  Sparkles,
  Image as ImageIcon,
  Video,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import TemplatesPanel from '../../components/chat/TemplatesPanel';
import QuickReplies from '../../components/chat/QuickReplies';
import MessageSearch from '../../components/chat/MessageSearch';
import InfoPanel from '../../components/chat/InfoPanel';
import NotesPanel from '../../components/chat/NotesPanel';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  notes?: string;
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
  const { t } = useTranslation(['manager/Chat', 'common']);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [botMode, setBotMode] = useState<'manual' | 'assistant' | 'autopilot'>('assistant');
  const [botSuggestion, setBotSuggestion] = useState<string | null>(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showNotes, setShowNotes] = useState(false);
  const [showClientInfo, setShowClientInfo] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const lastProcessedMessageId = useRef<string | number | null>(null);
  const isFetchingSuggestion = useRef(false);

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

  useEffect(() => {
    if (!selectedClient || botMode !== 'assistant' || messages.length === 0) return;
    if (isFetchingSuggestion.current) return; // Защита от дублирования

    const lastMsg = messages[messages.length - 1];

    // Проверяем: это НОВОЕ сообщение от КЛИЕНТА?
    if (
      lastMsg.sender === 'client' &&
      lastMsg.id &&
      lastMsg.id !== lastProcessedMessageId.current
    ) {
      console.log('🆕 Обнаружено новое сообщение от клиента:', lastMsg.id);

      lastProcessedMessageId.current = lastMsg.id;
      isFetchingSuggestion.current = true;

      setTimeout(() => {
        fetchBotSuggestion(selectedClient.id).finally(() => {
          isFetchingSuggestion.current = false;
        });
      }, 1000);
    }
  }, [messages, selectedClient, botMode]);

  // ✅ ДОБАВЛЕНО: Сброс при смене клиента
  useEffect(() => {
    lastProcessedMessageId.current = null;
    isFetchingSuggestion.current = false;
  }, [selectedClient]);


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
      const message = err instanceof Error ? err.message : t('chat:error_loading_clients');
      setError(message);
      toast.error(t('chat:error') + (message ? ': ' + message : ''));
    } finally {
      setInitialLoading(false);
    }
  };

  const loadMessages = async (clientId: string, isInitial: boolean = false) => {
    try {
      if (isInitial) {
        setLoadingMessages(true);
      }

      const data = await api.getChatMessages(clientId, 50);
      const messagesArray = (data && typeof data === 'object' && 'messages' in data)
        ? data.messages
        : (Array.isArray(data) ? data : []);

      if (!isInitial && JSON.stringify(messagesArray) === JSON.stringify(messages)) {
        return;
      }

      setMessages(messagesArray as Message[]);

    } catch (err) {
      if (isInitial) {
        const message = err instanceof Error ? err.message : t('chat:error_loading_messages');
        toast.error(t('chat:error') + (message ? ': ' + message : ''));
      }
    } finally {
      if (isInitial) {
        setLoadingMessages(false);
      }
    }
  };

  const handleSelectClient = async (client: Client) => {
    setSelectedClient(client);
    setBotMode((client as any).bot_mode || 'assistant');
    loadMessages(client.id, true);
    loadMessages(client.id, true);
    setShowNotes(false);
    setShowClientInfo(false);
    setShowTemplates(false);
    setShowMobileMenu(false);

    try {
      await api.getClient(client.id);
    } catch (err) {
      console.error('Error loading notes:', err instanceof Error ? err.message : err);
    }
  };

  const handleBackToList = () => {
    setSelectedClient(null);
    setShowNotes(false);
    setShowClientInfo(false);
    setShowTemplates(false);
    setShowMessageSearch(false);
    setShowMobileMenu(false);
  };

  const fetchBotSuggestion = async (clientId: string) => {
    if (botMode !== 'assistant') return;

    try {
      setIsLoadingSuggestion(true);
      const response = await api.getBotSuggestion(clientId);

      if (response.success) {
        setBotSuggestion(response.suggestion);
        setMessage(response.suggestion); // Подставляем в textarea

        toast.info(`🤖 Бот предлагает ответ (${response.unread_count} сообщ.)`, {
          description: response.suggestion.substring(0, 100) + '...',
          duration: 5000
        });
      }
    } catch (err) {
      console.error('Error fetching bot suggestion:', err);
    } finally {
      setIsLoadingSuggestion(false);
    }
  };


  const handleSendMessage = async () => {
    if ((!message.trim() && attachedFiles.length === 0) || !selectedClient) return;

    const cleanMessage = message.trim();

    // ✅ ШАБЛОН 1: Проверка команды бота (ПРИОРИТЕТ №1)
    const lowerMessage = cleanMessage.toLowerCase();
    const isBotHelp =
      lowerMessage.includes('#помоги') ||
      lowerMessage.includes('#бот помоги') ||
      lowerMessage.includes('бот помоги') ||
      lowerMessage.includes('помоги бот') ||
      lowerMessage.includes('#bot') ||
      lowerMessage.includes('#help');

    console.log('🔍 Проверка команды:', { original: cleanMessage, isBotHelp });

    if (isBotHelp) {
      console.log('✅ Обнаружена команда бота - НЕ отправляем клиенту!');

      // Удаляем ВСЕ варианты команды
      let fullText = cleanMessage
        .replace(/#бот\s*помоги#?/gi, '')
        .replace(/#помоги#?/gi, '')
        .replace(/бот\s*помоги/gi, '')
        .replace(/помоги\s*бот/gi, '')
        .replace(/#bot#?/gi, '')
        .replace(/#help#?/gi, '')
        .trim();

      if (!fullText) {
        toast.error('❌ Напишите вопрос после команды', {
          description: 'Пример: #помоги клиент жалуется на цену',
          duration: 5000
        });
        return;
      }

      const lines = fullText.split('\n').filter(l => l.trim());
      const question = lines[0].trim();
      const context = lines.slice(1).join('\n').trim();

      try {
        const loadingId = toast.loading('🤖 Бот анализирует ситуацию...');
        const response = await api.askBotAdvice(question, context);
        toast.dismiss(loadingId);

        toast.success('💡 Совет от AI-бота', {
          description: response.advice,
          duration: 30000,
          action: {
            label: '📋 Копировать',
            onClick: () => {
              navigator.clipboard.writeText(response.advice);
              toast.success('✅ Скопировано!');
            }
          }
        });

        setMessage('');
        return; // ⚠️ НЕ продолжаем отправку клиенту
      } catch (err) {
        console.error('❌ Ошибка:', err);
        toast.error('❌ Ошибка получения совета', {
          description: err instanceof Error ? err.message : 'Неизвестная ошибка'
        });
        return; // ⚠️ Даже при ошибке НЕ отправляем клиенту
      }
    }

    // ✅ ШАБЛОН 2: Обычная отправка клиенту (только если НЕ команда бота)
    console.log('📤 Отправка сообщения клиенту');

    try {
      // Отправка файлов
      if (attachedFiles.length > 0) {
        setIsUploadingFile(true);

        for (const file of attachedFiles) {
          try {
            const formData = new FormData();
            formData.append('file', file);

            const uploadResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
              method: 'POST',
              credentials: 'include',
              body: formData,
            });

            if (!uploadResponse.ok) throw new Error('Upload failed');

            const { file_url } = await uploadResponse.json();
            const fileType = file.type.startsWith('image/') ? 'image' :
              file.type.startsWith('video/') ? 'video' :
                file.type.startsWith('audio/') ? 'audio' : 'file';

            await api.sendFile(selectedClient.id, file_url, fileType);

            setMessages(prev => [...prev, {
              id: Date.now() + Math.random(),
              message: file_url,
              sender: 'manager',
              timestamp: new Date().toISOString(),
              type: fileType
            }]);

            toast.success(`✅ ${file.name}`);
          } catch (err) {
            console.error(err);
            toast.error(`❌ Ошибка: ${file.name}`);
          }
        }

        setAttachedFiles([]);
        setIsUploadingFile(false);
      }

      // Отправка текста
      if (message.trim()) {
        await api.sendMessage(selectedClient.id, message);

        setMessages(prev => [...prev, {
          id: Date.now(),
          message: message,
          sender: 'manager',
          timestamp: new Date().toISOString(),
          type: 'text'
        }]);

        setMessage('');
        toast.success('✅ Отправлено');
      }

      setTimeout(() => loadMessages(selectedClient.id, false), 1000);
    } catch (err) {
      console.error(err);
      toast.error('❌ Ошибка отправки');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setAttachedFiles([...attachedFiles, ...files]);
      toast.success(t('chat:files_added', { count: files.length }));
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
    toast.info(t('chat:file_removed'));
  };

  const filteredClients = clients.filter(client =>
    (client.display_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.phone || '').includes(searchTerm)
  );

  const canSend = message.trim().length > 0 || attachedFiles.length > 0;

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
            <Loader className="w-8 h-8 text-white animate-spin" />
          </div>
          <p className="text-gray-600 font-medium">{t('chat:loading_chats')}</p>
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
              <p className="text-red-900 font-bold text-lg">{t('chat:error_loading')}</p>
              <p className="text-red-700 mt-2">{error}</p>
              <Button
                onClick={loadClients}
                className="mt-4 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-lg"
              >
                {t('chat:try_again')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-pink-50 flex p-0 md:p-4">
      <div className="bg-white rounded-none md:rounded-3xl shadow-2xl border border-gray-200/50 h-full w-full flex overflow-hidden">
        {/* Clients List */}
        <div className={`
          ${selectedClient ? 'hidden md:flex' : 'flex'}
          flex-col w-full md:w-96 border-r border-gray-200
        `}>
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-900">{t('chat:chats')} ({clients.length})</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('chat:search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
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
                      w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left
                      ${selectedClient?.id === client.id ? 'bg-purple-50' : ''}
                    `}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold">
                        {client.display_name.charAt(0).toUpperCase()}
                      </div>
                      {client.unread_count && client.unread_count > 0 && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
                          {client.unread_count > 9 ? '9+' : client.unread_count}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 truncate">{client.display_name}</span>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {new Date(client.last_contact).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 truncate mb-1 block">{client.phone || t('chat:no_phone')}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">{client.total_messages} {t('chat:messages')}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-3">
                  <MessageCircle className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium text-sm">{t('chat:no_clients_found')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        {selectedClient ? (
          <div className="flex-1 flex bg-white min-w-0">
            {/* Main Chat Column */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Chat Header */}
              <div className="p-3 md:p-4 border-b border-gray-200/50 bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 flex-shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={handleBackToList}
                    className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/50 transition-colors flex-shrink-0"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-700" />
                  </button>
                  {botMode === 'assistant' && isLoadingSuggestion && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 rounded-full">
                      <Loader className="w-3 h-3 text-purple-600 animate-spin" />
                      <span className="text-xs font-medium text-purple-700">Бот думает...</span>
                    </div>
                  )}

                  {botMode === 'assistant' && botSuggestion && !isLoadingSuggestion && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 rounded-full">
                      <Sparkles className="w-3 h-3 text-purple-600" />
                      <span className="text-xs font-medium text-purple-700">Предложение бота</span>
                    </div>
                  )}

                  {botMode === 'autopilot' && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-full">
                      <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-green-400">
                        {/* Simple autopilot icon replacement */}
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 8 8">
                          <circle cx="4" cy="4" r="4" />
                        </svg>
                      </span>
                      <span className="text-xs font-medium text-green-700">Автопилот</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {selectedClient.profile_pic && selectedClient.profile_pic.trim() !== '' ? (
                      <img
                        src={selectedClient.profile_pic}
                        alt={selectedClient.display_name}
                        className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-lg flex-shrink-0"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={`w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0 ${selectedClient.profile_pic && selectedClient.profile_pic.trim() !== '' ? 'hidden' : ''
                      }`}>
                      {selectedClient.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 truncate text-sm">{selectedClient.display_name}</p>
                      <p className="text-xs text-gray-600 truncate">
                        {selectedClient.username && `@${selectedClient.username}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowMessageSearch(!showMessageSearch)}
                      className={`h-9 w-9 p-0 rounded-xl border-2 ${showMessageSearch ? 'bg-yellow-100 border-yellow-400 text-yellow-700' : 'hover:bg-white'
                        }`}
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                    <div className="relative">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                        className="h-9 w-9 p-0 rounded-xl border-2 hover:bg-white"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                      {showMobileMenu && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowMobileMenu(false)}
                          />
                          <div className="absolute right-0 top-11 w-52 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 z-50">
                            <button
                              onClick={() => {
                                setShowClientInfo(!showClientInfo);
                                setShowTemplates(false);
                                setShowNotes(false);
                                setShowMobileMenu(false);
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 flex items-center gap-2 transition-colors text-sm"
                            >
                              <Info className="w-4 h-4 text-blue-600" />
                              <span className="font-medium">{t('chat:information')}</span>
                            </button>
                            <button
                              onClick={() => {
                                setShowTemplates(!showTemplates);
                                setShowClientInfo(false);
                                setShowNotes(false);
                                setShowMobileMenu(false);
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 flex items-center gap-2 transition-colors text-sm"
                            >
                              <FileText className="w-4 h-4 text-purple-600" />
                              <span className="font-medium">{t('chat:templates')}</span>
                            </button>
                            <button
                              onClick={() => {
                                setShowNotes(!showNotes);
                                setShowClientInfo(false);
                                setShowTemplates(false);
                                setShowMobileMenu(false);
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 flex items-center gap-2 transition-colors text-sm"
                            >
                              <StickyNote className="w-4 h-4 text-yellow-600" />
                              <span className="font-medium">{t('chat:notes')}</span>
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
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-white to-gray-50/30">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                        <Loader className="w-6 h-6 text-white animate-spin" />
                      </div>
                      <p className="text-gray-500 font-medium text-sm">{t('chat:loading')}</p>
                    </div>
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((msg, index) => (
                    <div
                      key={msg.id}
                      ref={(el) => { messageRefs.current[index] = el; }}
                      className={`flex ${(msg.sender === 'bot' || msg.sender === 'manager') ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                    >
                      <div
                        className={`rounded-2xl shadow-md overflow-hidden max-w-xs sm:max-w-sm md:max-w-md ${(msg.sender === 'bot' || msg.sender === 'manager')
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
                              alt={t('chat:image')}
                              loading="lazy"
                              className="w-full h-auto max-h-72 object-cover cursor-pointer hover:opacity-90 transition-opacity rounded-t-2xl"
                              onClick={() => window.open(msg.message, '_blank')}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling;
                                if (fallback) (fallback as HTMLElement).style.display = 'flex';
                              }}
                            />
                            <div
                              style={{ display: 'none' }}
                              className={`px-4 py-6 flex flex-col items-center justify-center min-h-[140px] ${(msg.sender === 'bot' || msg.sender === 'manager') ? 'text-pink-100' : 'text-gray-500'
                                }`}
                            >
                              <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                              <p className="text-sm">📷 {t('chat:image_not_available')}</p>
                            </div>
                            <div className={`px-4 py-2 ${(msg.sender === 'bot' || msg.sender === 'manager') ? 'text-pink-100' : 'text-gray-600'}`}>
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
                              className="w-full h-auto rounded-t-2xl max-h-72"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <div className={`px-4 py-2 ${(msg.sender === 'bot' || msg.sender === 'manager') ? 'text-pink-100' : 'text-gray-600'}`}>
                              <p className="text-xs">
                                {new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        ) : msg.type === 'audio' ? (
                          <div className="px-4 py-3 min-w-[240px]">
                            <audio
                              src={msg.message}
                              controls
                              className="w-full"
                            />
                            <div className={`mt-2 ${(msg.sender === 'bot' || msg.sender === 'manager') ? 'text-pink-100' : 'text-gray-600'}`}>
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
                            <a href={msg.message}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2 hover:underline ${(msg.sender === 'bot' || msg.sender === 'manager') ? 'text-pink-100' : 'text-blue-600'
                                }`}
                            >
                              <FileText className="w-5 h-5" />
                              <span className="text-sm font-medium">Открыть файл</span>
                            </a>
                            <div className={`mt-2 ${(msg.sender === 'bot' || msg.sender === 'manager') ? 'text-pink-100' : 'text-gray-600'}`}>
                              <p className="text-xs">
                                {new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="px-4 py-3">
                            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                            <p className={`text-xs mt-2 ${(msg.sender === 'bot' || msg.sender === 'manager') ? 'text-pink-100' : 'text-gray-500'
                              }`}>
                              {new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <MessageCircle className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium text-sm">{t('chat:no_messages')}</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies */}
              {showQuickReplies && selectedClient && (
                <div className="border-t border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 p-3 flex-shrink-0">
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
                <div className="border-t border-gray-200 p-3 bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <Paperclip className="w-3.5 h-3.5" />
                      {t('chat:files')} ({attachedFiles.length})
                    </p>
                    <button
                      onClick={() => {
                        setAttachedFiles([]);
                        toast.info(t('chat:files_cleared'));
                      }}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      {t('chat:clear')}
                    </button>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {attachedFiles.map((file, index) => (
                      <div key={index} className="relative flex-shrink-0 group">
                        <div className="w-20 h-20 bg-white rounded-xl border-2 border-gray-200 overflow-hidden flex items-center justify-center shadow-sm">
                          {file.type.startsWith('image/') ? (
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          ) : file.type.startsWith('video/') ? (
                            <Video className="w-8 h-8 text-purple-600" />
                          ) : (
                            <FileText className="w-8 h-8 text-gray-400" />
                          )}
                        </div>

                        <p className="text-xs text-gray-600 mt-1 w-20 truncate text-center" title={file.name}>
                          {file.name}
                        </p>

                        <button
                          onClick={() => handleRemoveFile(index)}
                          className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* ✅ ДОБАВЛЕНО: Кнопка запроса подсказки (только для assistant mode) */}
              {selectedClient && botMode === 'assistant' && (
                <div className="px-3 py-2 bg-white border-t border-gray-200">
                  <button
                    onClick={() => fetchBotSuggestion(selectedClient.id)}
                    disabled={isLoadingSuggestion}
                    className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium text-sm hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingSuggestion ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Бот думает...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>✨ Получить подсказку от AI</span>
                      </>
                    )}
                  </button>
                </div>
              )}
              {/* Chat Input */}
              <div className="p-3 border-t border-gray-200 bg-white flex-shrink-0">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <div className="relative">
                      <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={t('chat:message')}
                        className="resize-none border-2 border-gray-200 rounded-xl text-sm"
                        rows={2}
                        disabled={isUploadingFile}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (canSend && !isUploadingFile) {
                              handleSendMessage();
                            }
                          }
                        }}
                      />

                      {/* ✅ ДОБАВЬ КНОПКУ СБРОСА ВНУТРЬ КОНТЕЙНЕРА: */}
                      {botSuggestion && (
                        <button
                          onClick={() => {
                            setBotSuggestion(null);
                            setMessage('');
                            toast.info('Предложение бота сброшено');
                          }}
                          className="absolute top-2 right-2 text-xs text-purple-600 hover:text-purple-700 font-medium bg-white px-2 py-1 rounded shadow-sm"
                        >
                          ✕ Сбросить
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*,video/*,audio/*"
                      multiple
                      onChange={handleFileSelect}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingFile}
                      className="h-10 w-10 p-0 rounded-xl"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={handleSendMessage}
                      className="bg-gradient-to-r from-pink-500 to-purple-600 h-10 w-10 p-0 rounded-xl"
                      disabled={!canSend || isUploadingFile}
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

            {/* Right Sidebar for Panels */}
            {(showClientInfo || showTemplates || showNotes) && (
              <div className="w-full md:w-96 border-l border-gray-200 overflow-y-auto flex-shrink-0">
                {showClientInfo && selectedClient && (
                  <div className="p-4">
                    <InfoPanel
                      client={selectedClient}
                      onClose={() => setShowClientInfo(false)}
                      onUpdate={async (data) => {
                        await api.updateClient(selectedClient.id, data);
                        setClients(clients.map(c =>
                          c.id === selectedClient.id
                            ? {
                              ...c,
                              name: data.name || c.name,
                              phone: data.phone || c.phone,
                              status: data.status || c.status,
                              display_name: data.name || c.username || c.display_name
                            }
                            : c
                        ));
                        setSelectedClient({
                          ...selectedClient,
                          name: data.name,
                          phone: data.phone,
                          status: data.status || selectedClient.status,
                          display_name: data.name || selectedClient.username || selectedClient.display_name
                        });
                        toast.success(t('chat:information_updated'));
                      }}
                    />
                  </div>
                )}

                {showTemplates && (
                  <div className="p-4">
                    <TemplatesPanel
                      onSelect={(content) => {
                        setMessage(content);
                        setShowTemplates(false);
                      }}
                      onClose={() => setShowTemplates(false)}
                    />
                  </div>
                )}

                {showNotes && selectedClient && (
                  <div className="p-4">
                    <NotesPanel
                      clientId={selectedClient.id}
                      onClose={() => setShowNotes(false)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 hidden md:flex items-center justify-center bg-gradient-to-br from-gray-50 to-pink-50">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-pink-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                <MessageCircle className="w-12 h-12 text-pink-600" />
              </div>
              <p className="text-lg font-bold text-gray-700">{t('chat:select_chat')}</p>
              <p className="text-sm text-gray-500 mt-1">{t('chat:select_dialog_from_list')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}