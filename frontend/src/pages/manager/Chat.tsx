// /frontend/src/pages/manager/Chat.tsx
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
  Shield,
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
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../utils/permissions';
import MessengerSidebar, { MessengerType } from '../../components/chat/MessengerSidebar';

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
  source?: string;
  telegram_id?: string;
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
  const { user: currentUser } = useAuth();
  const userPermissions = usePermissions(currentUser?.role || 'employee');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [botMode, setBotMode] = useState<'manual' | 'assistant' | 'autopilot'>('assistant');
  const [botSuggestion, setBotSuggestion] = useState<string | null>(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [forwardSearchTerm, setForwardSearchTerm] = useState('');
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
  const [showAskBotModal, setShowAskBotModal] = useState(false);
  const [botQuestion, setBotQuestion] = useState('');
  const [botContext, setBotContext] = useState('');
  const [showAIButtons, setShowAIButtons] = useState(false);
  const [isSelectingMessages, setIsSelectingMessages] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string | number>>(new Set());
  const [isAskingBot, setIsAskingBot] = useState(false);
  const [currentMessenger, setCurrentMessenger] = useState<string>('instagram');

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const clientIdFromUrl = searchParams.get('client_id');
    const messengerFromUrl = searchParams.get('messenger') || 'instagram';

    setCurrentMessenger(messengerFromUrl);

    if (clientIdFromUrl) {
      localStorage.setItem('selectedClientId', clientIdFromUrl);
    }
  }, [location.search]);

  useEffect(() => {
    loadClients();
  }, [currentMessenger]);

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

  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  useEffect(() => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldAutoScroll]);

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
    if (isFetchingSuggestion.current) return;

    const lastMsg = messages[messages.length - 1];

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

  useEffect(() => {
    lastProcessedMessageId.current = null;
    isFetchingSuggestion.current = false;
  }, [selectedClient]);

  const loadClients = async () => {
    try {
      setInitialLoading(true);
      setError(null);
      const data = await api.getClients(currentMessenger);

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

      const data = await api.getChatMessages(clientId, 50, currentMessenger);
      const messagesArray = (data && typeof data === 'object' && 'messages' in data)
        ? data.messages
        : (Array.isArray(data) ? data : []);

      if (!isInitial && JSON.stringify(messagesArray) === JSON.stringify(messages)) {
        return;
      }

      const hasNewClientMessages = !isInitial && messagesArray.length > messages.length &&
        messagesArray[messagesArray.length - 1]?.sender === 'client';

      setShouldAutoScroll(isInitial || hasNewClientMessages);

      setMessages(messagesArray as Message[]);

    } catch (err) {
      console.error('Error loading messages:', err instanceof Error ? err.message : err);
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
        setMessage(response.suggestion);

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

  const getImageUrl = (msg: Message) => {
    if (msg.message.startsWith('http')) {
      if (msg.message.includes('zrok.io')) {
        try {
          const url = new URL(msg.message);
          const filePath = url.pathname;
          return `${import.meta.env.VITE_API_URL}${filePath}`;
        } catch (e) {
          return msg.message;
        }
      }
      return msg.message;
    }
    return `${import.meta.env.VITE_API_URL}${msg.message}`;
  };

  const handleSendMessage = async () => {
    if ((!message.trim() && attachedFiles.length === 0) || !selectedClient) return;

    const cleanMessage = message.trim();

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
        return;
      } catch (err) {
        console.error('❌ Ошибка:', err);
        toast.error('❌ Ошибка получения совета', {
          description: err instanceof Error ? err.message : 'Неизвестная ошибка'
        });
        return;
      }
    }

    console.log('📤 Отправка сообщения клиенту');

    try {
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

      if (message.trim()) {
        let finalMessage = message;

        // Если это ответ на сообщение
        if (replyToMessage) {
          const quotedText = replyToMessage.message.length > 50
            ? replyToMessage.message.substring(0, 50) + '...'
            : replyToMessage.message;
          finalMessage = `↩️ Ответ на: "${quotedText}"\n\n${message}`;
        }

        await api.sendMessage(selectedClient.id, finalMessage);

        setMessages(prev => [...prev, {
          id: Date.now(),
          message: finalMessage,
          sender: 'manager',
          timestamp: new Date().toISOString(),
          type: 'text'
        }]);

        setMessage('');
        setReplyToMessage(null);  // ✅ ДОБАВЛЕНО
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

  const handleAskBot = async () => {
    if (!botQuestion.trim()) {
      toast.error('❌ Введите вопрос');
      return;
    }

    try {
      setIsAskingBot(true);

      const recentMessages = messages.slice(-5).map(msg => {
        const sender = msg.sender === 'client' ? 'Клиент' : 'Менеджер';
        return `${sender}: ${msg.message}`;
      }).join('\n');

      const fullContext = botContext.trim()
        ? `${recentMessages}\n\nДополнительно:\n${botContext}`
        : recentMessages;

      const response = await api.askBotAdvice(botQuestion, fullContext);

      toast.success('💡 Совет от AI-бота', {
        description: response.advice,
        duration: 60000,
        action: {
          label: '📋 Копировать',
          onClick: () => {
            navigator.clipboard.writeText(response.advice);
            toast.success('✅ Скопировано!');
          }
        }
      });

      setShowAskBotModal(false);
      setBotQuestion('');
      setBotContext('');
      setShowAIButtons(false);

    } catch (err) {
      console.error('❌ Ошибка:', err);
      toast.error('❌ Ошибка получения совета', {
        description: err instanceof Error ? err.message : 'Неизвестная ошибка'
      });
    } finally {
      setIsAskingBot(false);
    }
  };

  const handleAskBotWithSelectedMessages = async () => {
    if (selectedMessageIds.size === 0) {
      toast.error('❌ Выберите хотя бы одно сообщение');
      return;
    }

    try {
      setIsAskingBot(true);

      const selectedMessages = messages
        .filter(msg => msg.id && selectedMessageIds.has(msg.id))
        .map(msg => {
          const sender = msg.sender === 'client' ? 'Клиент' : 'Менеджер';
          return `${sender}: ${msg.message}`;
        })
        .join('\n');

      if (!selectedMessages) {
        toast.error('❌ Не удалось собрать выбранные сообщения');
        return;
      }

      const question = "Проанализируй эти сообщения и дай совет как лучше ответить клиенту";
      const response = await api.askBotAdvice(question, selectedMessages);

      toast.success('💡 Совет от AI-бота', {
        description: response.advice,
        duration: 60000,
        action: {
          label: '📋 Копировать',
          onClick: () => {
            navigator.clipboard.writeText(response.advice);
            toast.success('✅ Скопировано!');
          }
        }
      });

      setIsSelectingMessages(false);
      setSelectedMessageIds(new Set());
      setShowAIButtons(false);

    } catch (err) {
      console.error('❌ Ошибка:', err);
      toast.error('❌ Ошибка получения совета', {
        description: err instanceof Error ? err.message : 'Неизвестная ошибка'
      });
    } finally {
      setIsAskingBot(false);
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

  // Check permissions
  if (!userPermissions.canViewAllClients) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 max-w-md text-center">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Доступ запрещен</h2>
          <p className="text-gray-600">
            У вас нет прав для просмотра чата с клиентами. Обратитесь к администратору.
          </p>
        </div>
      </div>
    );
  }

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
    <div className={`h-screen bg-gradient-to-br from-gray-50 via-white to-pink-50 flex p-0 md:p-4 messenger-${currentMessenger}`}>
      <div className="bg-white rounded-none md:rounded-3xl shadow-2xl border border-gray-200/50 h-full w-full flex overflow-hidden">
        {/* Clients List */}
        <div className={`
          ${selectedClient ? 'hidden md:flex' : 'flex'}
          flex-col w-full md:w-96 border-r border-gray-200
        `}>
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xl font-bold text-gray-900 capitalize">
                {currentMessenger} ({clients.length})
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-[#F1F5F9] border-none rounded-xl text-sm focus:ring-2 focus:ring-purple-500 transition-all"
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
                      {client.profile_pic && client.profile_pic.trim() !== '' ? (
                        <img
                          src={client.profile_pic}
                          alt={client.display_name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold ${client.profile_pic && client.profile_pic.trim() !== '' ? 'hidden' : ''
                        }`}>
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
              <div className="p-3 md:p-4 border-b border-gray-200/50 chat-header flex-shrink-0 transition-colors duration-300">
                <div className="flex items-center justify-between gap-2">
                  {/* Left: Avatar & Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={handleBackToList}
                      className="md:hidden p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <div className="relative">
                      {selectedClient.profile_pic && selectedClient.profile_pic.trim() !== '' ? (
                        <img
                          src={selectedClient.profile_pic}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="size-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                          {selectedClient.display_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate text-sm leading-tight">{selectedClient.display_name}</p>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        {selectedClient.username ? `@${selectedClient.username}` : 'Online'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setShowAIButtons(!showAIButtons)}
                      className="h-8 px-4 bg-[#A855F7] text-white rounded-full flex items-center gap-1.5 hover:bg-[#9333EA] transition-all active:scale-95 shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-bold tracking-wider">AI</span>
                    </button>

                    <button className="p-2 text-gray-500 hover:bg-black/5 rounded-full transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </button>

                    <button className="p-2 text-gray-500 hover:bg-black/5 rounded-full transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>

                    <button
                      onClick={() => setShowMobileMenu(!showMobileMenu)}
                      className="p-2 text-gray-500 hover:bg-black/5 rounded-full transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {showMobileMenu && (
                      <>
                        <div className="fixed inset-0 z-40"
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

              {/* Подсказка для режима выделения */}
              {isSelectingMessages && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 mx-4 mb-3">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    📱 Режим выделения сообщений
                  </p>
                  <p className="text-xs text-blue-700">
                    Нажимайте на кружки рядом с сообщениями чтобы выбрать их.
                    Бот проанализирует только выбранные сообщения.
                  </p>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-messages-area transition-colors duration-300">
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
                      className={`flex items-start gap-2 ${(msg.sender === 'bot' || msg.sender === 'manager') ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                    >
                      {/* Чекбокс для режима выделения */}
                      {isSelectingMessages && msg.id && (
                        <button
                          onClick={() => {
                            const newSelected = new Set(selectedMessageIds);
                            if (newSelected.has(msg.id!)) {
                              newSelected.delete(msg.id!);
                            } else {
                              newSelected.add(msg.id!);
                            }
                            setSelectedMessageIds(newSelected);
                          }}
                          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedMessageIds.has(msg.id!)
                            ? 'bg-blue-500 border-blue-500'
                            : 'bg-white border-gray-300 hover:border-blue-400'
                            } ${(msg.sender === 'bot' || msg.sender === 'manager') ? 'order-2' : 'order-1'}`}
                        >
                          {selectedMessageIds.has(msg.id!) && (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      )}

                      <div className="relative group">
                        <div
                          className={`message-bubble ${msg.id && selectedMessageIds.has(msg.id) ? 'ring-2 ring-blue-500' : ''
                            } ${(msg.sender === 'bot' || msg.sender === 'manager')
                              ? 'message-own'
                              : 'message-other'
                            }`}
                        >
                          {/* Reply Preview */}
                          {msg.message.includes('↩️ Ответ на:') && (
                            <div className={`border-l-2 ${(msg.sender === 'bot' || msg.sender === 'manager') ? 'border-pink-200/50 bg-pink-400/10' : 'border-blue-400/50 bg-blue-500/10'} px-2.5 py-1.5 mb-2`}>
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <svg className={`w-3 h-3 flex-shrink-0 ${(msg.sender === 'bot' || msg.sender === 'manager') ? 'text-pink-200' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                                <p className={`text-xs font-bold ${(msg.sender === 'bot' || msg.sender === 'manager') ? 'text-pink-100' : 'text-blue-900'}`}>
                                  Вы ответили {selectedClient?.display_name}
                                </p>
                              </div>
                              <p className={`text-xs ${(msg.sender === 'bot' || msg.sender === 'manager') ? 'text-pink-100/90' : 'text-blue-800'} line-clamp-2`}>
                                {msg.message.split('\n\n')[0].replace('↩️ Ответ на: "', '').replace('"', '')}
                              </p>
                            </div>
                          )}

                          {msg.type === 'image' ? (
                            <div className="relative group">
                              <img
                                src={getImageUrl(msg)}
                                alt={`Image from ${msg.sender === 'client' ? selectedClient?.display_name : 'manager'}`}
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
                            <div className="px-4 py-2">
                              {msg.message.includes('↩️ Ответ на:') ? (
                                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed text-inherit">
                                  {msg.message.split('\n\n')[1] || msg.message}
                                </p>
                              ) : (
                                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed text-inherit">{msg.message}</p>
                              )}
                            </div>
                          )}
                        </div>
                        {/* Time below bubble */}
                        <div className={`mt-1 flex ${(msg.sender === 'bot' || msg.sender === 'manager') ? 'justify-end' : 'justify-start'}`}>
                          <p className="text-[10px] text-gray-400 font-medium px-2">
                            {new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Кнопки действий при наведении */}
                      <div
                        className={`absolute ${(msg.sender === 'bot' || msg.sender === 'manager') ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col gap-1 bg-white/95 backdrop-blur-sm rounded-full shadow-2xl border border-gray-200 p-1`}
                      >
                        {/* Ответить - только на сообщения клиента */}
                        {msg.sender === 'client' && (
                          <button
                            onClick={() => {
                              setReplyToMessage(msg);
                              toast.info('💬 Ответ на сообщение');
                            }}
                            className="w-10 h-10 hover:bg-white rounded-xl flex items-center justify-center transition-all hover:scale-110 shadow-sm border border-gray-100"
                            title="Ответить"
                          >
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                          </button>
                        )}


                        {/* Переслать */}
                        <button
                          onClick={() => {
                            setForwardMessage(msg);
                            setShowForwardModal(true);
                          }}
                          className="w-10 h-10 hover:bg-white rounded-xl flex items-center justify-center transition-all hover:scale-110 shadow-sm border border-gray-100"
                          title="Переслать"
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </button>

                        {/* Копировать */}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(msg.message);
                            toast.success('📋 Скопировано!');
                          }}
                          className="w-9 h-9 hover:bg-gray-50 rounded-full flex items-center justify-center transition-all hover:scale-110"
                          title="Копировать"
                        >
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          className="w-9 h-9 hover:bg-gray-50 rounded-full flex items-center justify-center transition-all hover:scale-110"
                          title="Еще"
                        >
                          <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
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

              {/* AI Suggestion Bar (only shown when expanded) */}
              {showAIButtons && selectedClient && (
                <div className="px-4 py-3 bg-white/80 backdrop-blur-md border-t border-purple-100 animate-in slide-in-from-bottom duration-300">
                  <div className="flex gap-2">
                    {botMode === 'assistant' && (
                      <button
                        onClick={() => fetchBotSuggestion(selectedClient.id)}
                        disabled={isLoadingSuggestion}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-xs hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
                      >
                        {isLoadingSuggestion ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        <span>АВТОПОДСКАЗКА</span>
                      </button>
                    )}
                    <button
                      onClick={() => setIsSelectingMessages(true)}
                      className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-xs hover:bg-black transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>СПРОСИТЬ AI</span>
                    </button>
                    <button
                      onClick={() => setShowAIButtons(false)}
                      className="p-2.5 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Chat Input */}
              <div className="p-3 chat-input-area flex-shrink-0">
                {/* Reply Preview */}
                {replyToMessage && (
                  <div className="mb-2 max-w-md">
                    <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-2 flex items-start gap-2 shadow-sm">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <svg className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                          <span className="text-xs font-bold text-blue-900">
                            Ответ на {replyToMessage.sender === 'client' ? selectedClient?.display_name : 'ваше сообщение'}
                          </span>
                        </div>
                        <p className="text-xs text-blue-700 truncate">
                          {replyToMessage.message.substring(0, 60)}{replyToMessage.message.length > 60 ? '...' : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => setReplyToMessage(null)}
                        className="flex-shrink-0 w-5 h-5 rounded-full hover:bg-blue-100 flex items-center justify-center transition-colors"
                      >
                        <X className="w-3.5 h-3.5 text-blue-600" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                    <Paperclip className="w-6 h-6" />
                  </button>

                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Сообщение..."
                      className="w-full h-11 pl-4 pr-10 bg-[#F1F5F9] border-none rounded-full text-sm focus:ring-2 focus:ring-purple-500 transition-all"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSendMessage();
                        }
                      }}
                    />
                    <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>

                  <button
                    onClick={handleSendMessage}
                    className="p-3 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-full transition-colors"
                  >
                    {message.trim() ? (
                      <Send className="w-5 h-5" />
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    )}
                  </button>
                </div>

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

            {/* Right Sidebar for Panels */}
            {(showClientInfo || showTemplates || showNotes) && (
              <div className="w-full md:w-96 border-l border-gray-200 overflow-y-auto flex-shrink-0 bg-white">
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
                              source: data.source || c.source,
                              display_name: data.name || c.username || c.display_name
                            }
                            : c
                        ));
                        setSelectedClient({
                          ...selectedClient,
                          name: data.name,
                          phone: data.phone,
                          status: data.status || selectedClient.status,
                          source: data.source || selectedClient.source,
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
        )
        }
      </div>

      {/* Модальное окно "Спросить AI" */}
      {
        showAskBotModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-blue-600" />
                    🤖 Спросить AI-консультанта
                  </h3>
                  <button
                    onClick={() => {
                      setShowAskBotModal(false);
                      setBotQuestion('');
                      setBotContext('');
                    }}
                    className="w-8 h-8 rounded-lg hover:bg-white/50 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Вопрос */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ❓ Ваш вопрос <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={botQuestion}
                    onChange={(e) => setBotQuestion(e.target.value)}
                    placeholder="Например: Клиент говорит что дорого, как ответить?"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl resize-none focus:border-blue-500 focus:outline-none text-sm"
                    rows={3}
                    autoFocus
                  />
                </div>

                {/* Контекст (опционально) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📝 Дополнительный контекст (опционально)
                  </label>
                  <textarea
                    value={botContext}
                    onChange={(e) => setBotContext(e.target.value)}
                    placeholder="Например: Клиент уже был у нас, но недоволен результатом"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl resize-none focus:border-blue-500 focus:outline-none text-sm"
                    rows={2}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Последние 5 сообщений будут добавлены автоматически
                  </p>
                </div>

                {/* Подсказки */}
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                  <p className="text-xs font-semibold text-blue-900 mb-2">💡 Примеры вопросов:</p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Клиент жалуется на цену, что ответить?</li>
                    <li>• Как убедить записаться прямо сейчас?</li>
                    <li>• Клиент молчит час после моего ответа, что делать?</li>
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-3">
                <button
                  onClick={() => {
                    setShowAskBotModal(false);
                    setBotQuestion('');
                    setBotContext('');
                  }}
                  className="flex-1 px-4 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAskBot}
                  disabled={isAskingBot || !botQuestion.trim()}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium text-sm hover:from-blue-600 hover:to-indigo-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAskingBot ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Думаю...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Получить совет</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Модальное окно "Переслать" */}
      {
        showForwardModal && forwardMessage && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Переслать</h3>
                  <button
                    onClick={() => {
                      setShowForwardModal(false);
                      setForwardMessage(null);
                      setForwardSearchTerm('');
                    }}
                    className="w-8 h-8 rounded-lg hover:bg-white/50 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Поиск..."
                    value={forwardSearchTerm}
                    onChange={(e) => setForwardSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                    autoFocus
                  />
                </div>
              </div>

              {/* Clients List */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase px-3 mb-2">Рекомендуемые</p>
                  {clients
                    .filter(c =>
                      c.id !== selectedClient?.id &&
                      (c.display_name.toLowerCase().includes(forwardSearchTerm.toLowerCase()) ||
                        (c.username || '').toLowerCase().includes(forwardSearchTerm.toLowerCase()))
                    )
                    .slice(0, 10)
                    .map(client => (
                      <button
                        key={client.id}
                        onClick={async () => {
                          try {
                            await api.sendMessage(client.id, `📤 Переслано:\n\n${forwardMessage.message}`);
                            toast.success(`✅ Отправлено ${client.display_name}`);
                            setShowForwardModal(false);
                            setForwardMessage(null);
                            setForwardSearchTerm('');
                          } catch (err) {
                            toast.error('❌ Ошибка пересылки');
                          }
                        }}
                        className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 rounded-xl transition-colors"
                      >
                        {client.profile_pic && client.profile_pic.trim() !== '' ? (
                          <img
                            src={client.profile_pic}
                            alt={client.display_name}
                            className="w-10 h-10 rounded-full object-cover"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
                            {client.display_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-900 text-sm">{client.display_name}</p>
                          <p className="text-xs text-gray-500">@{client.username}</p>
                        </div>
                        <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
                      </button>
                    ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <button
                  disabled
                  className="w-full px-4 py-2.5 bg-gray-300 text-gray-500 rounded-xl font-medium text-sm cursor-not-allowed"
                >
                  Отправить
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div>
);
}
