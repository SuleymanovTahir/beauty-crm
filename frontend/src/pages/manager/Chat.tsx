import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
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
  Reply,
  Forward,
  Copy,
  Heart,
  HelpCircle,
  Smartphone,
} from 'lucide-react';
import { WhatsAppIcon, TelegramIcon, TikTokIcon, InstagramIcon } from '../../components/icons/SocialIcons';
import { Button } from '../../components/ui/button';
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
import { useChatWebSocket } from '../../hooks/useChatWebSocket';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';

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

const ClientItem = React.memo(({ client, isSelected, onClick, t, language, selectionBg, avatarGradient }: { client: Client, isSelected: boolean, onClick: () => void, t: any, language: string, selectionBg?: string, avatarGradient?: string }) => (
  <button
    onClick={onClick}
    className={`
      w-full p-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left
      ${isSelected ? (selectionBg || 'bg-blue-100/50') : ''}
    `}
  >
    <div className="relative flex-shrink-0">
      {client.profile_pic && client.profile_pic.trim() !== '' ? (
        <img
          src={client.profile_pic}
          alt={client.display_name}
          className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-md"
          crossOrigin="anonymous"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
      ) : null}
      <div className={`w-10 h-10 rounded-full ${avatarGradient || 'bg-gradient-to-br from-blue-500 to-pink-500'} flex items-center justify-center text-white text-xs font-semibold ${client.profile_pic && client.profile_pic.trim() !== '' ? 'hidden' : ''
        }`}>
        {client.display_name.charAt(0).toUpperCase()}
      </div>
      {client.source && (
        <div className={`absolute -bottom-1 -right-1 size-5 rounded-full flex items-center justify-center shadow-lg z-10 border-2 border-white dark:border-gray-800 ${client.source.toLowerCase() === 'instagram' ? 'bg-white' :
          client.source.toLowerCase() === 'telegram' ? 'bg-white' :
            client.source.toLowerCase() === 'whatsapp' ? 'bg-white' :
              'bg-white'
          }`}>
          {client.source.toLowerCase() === 'instagram' && <InstagramIcon size={14} colorful={true} />}
          {client.source.toLowerCase() === 'telegram' && <TelegramIcon size={14} colorful={true} />}
          {client.source.toLowerCase() === 'whatsapp' && <WhatsAppIcon size={14} colorful={true} />}
          {client.source.toLowerCase() === 'tiktok' && <TikTokIcon size={14} colorful={true} />}
        </div>
      )}
      {(client.unread_count || 0) > 0 && (
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
          {(client.unread_count || 0) > 9 ? '9+' : client.unread_count}
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{client.display_name}</span>
        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
          {new Date(client.last_contact).toLocaleDateString(language, { day: '2-digit', month: 'short' })}
        </span>
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1 block">{client.phone || t('chat:no_phone')}</span>
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-400">{client.total_messages} {t('chat:messages')}</span>
      </div>
    </div>
  </button>
));

export default function Chat() {
  const location = useLocation();
  const { t, i18n } = useTranslation(['manager/chat', 'common']);
  const { user: currentUser } = useAuth();
  const userPermissions = usePermissions(currentUser?.role || 'employee');

  // Messenger-specific color themes
  const messengerStyles: Record<string, {
    aiButton: string;
    sendButton: string;
    avatarGradient: string;
    selectionBg: string;
    botSuggestionBg: string;
    botSuggestionText: string;
    botSuggestionBorder: string;
    headerBg: string;
    headerText: string;
    headerBorder: string;
    messagesAreaBg: string;
    inputAreaBg: string;
    inputAreaBorder: string;
  }> = {
    instagram: {
      aiButton: 'bg-[#A855F7] hover:bg-[#9333EA]',
      sendButton: 'bg-gradient-to-r from-blue-500 to-pink-500',
      avatarGradient: 'bg-gradient-to-br from-blue-500 to-pink-500',
      selectionBg: 'bg-blue-100/50 dark:bg-blue-900/10',
      botSuggestionBg: 'bg-blue-50',
      botSuggestionText: 'text-blue-700',
      botSuggestionBorder: 'border-blue-100',
      headerBg: 'bg-gradient-to-r from-blue-600 via-pink-600 to-orange-500',
      headerText: 'text-white',
      headerBorder: 'border-blue-400',
      messagesAreaBg: 'bg-white',
      inputAreaBg: 'bg-white',
      inputAreaBorder: 'border-gray-200'
    },
    telegram: {
      aiButton: 'bg-[#0088cc] hover:bg-[#0077b3]',
      sendButton: 'bg-[#0088cc]',
      avatarGradient: 'bg-[#0088cc]',
      selectionBg: 'bg-blue-100/50 dark:bg-blue-900/10',
      botSuggestionBg: 'bg-blue-50',
      botSuggestionText: 'text-blue-700',
      botSuggestionBorder: 'border-blue-100',
      headerBg: 'bg-white',
      headerText: 'text-gray-900',
      headerBorder: 'border-gray-200',
      messagesAreaBg: 'bg-[#eff1f5]',
      inputAreaBg: 'bg-white',
      inputAreaBorder: 'border-gray-200'
    },
    whatsapp: {
      aiButton: 'bg-[#25D366] hover:bg-[#20bd5a]',
      sendButton: 'bg-[#25D366]',
      avatarGradient: 'bg-[#25D366]',
      selectionBg: 'bg-green-100/50 dark:bg-green-900/10',
      botSuggestionBg: 'bg-green-50',
      botSuggestionText: 'text-green-700',
      botSuggestionBorder: 'border-green-100',
      headerBg: 'bg-[#f0f2f5]',
      headerText: 'text-gray-900',
      headerBorder: 'border-[#d1d7db]',
      messagesAreaBg: 'bg-[#e5ddd5]',
      inputAreaBg: 'bg-[#f0f2f5]',
      inputAreaBorder: 'border-gray-200'
    },
    tiktok: {
      aiButton: 'bg-[#fe2c55] hover:bg-[#e61e4d]',
      sendButton: 'bg-gradient-to-r from-[#fe2c55] to-[#25f4ee]',
      avatarGradient: 'bg-gradient-to-br from-[#fe2c55] to-[#25f4ee]',
      selectionBg: 'bg-gray-100/50 dark:bg-gray-800/10',
      botSuggestionBg: 'bg-gray-50',
      botSuggestionText: 'text-gray-700',
      botSuggestionBorder: 'border-gray-100',
      headerBg: 'bg-black',
      headerText: 'text-white',
      headerBorder: 'border-[#2a2a2a]',
      messagesAreaBg: 'bg-black',
      inputAreaBg: 'bg-black',
      inputAreaBorder: 'border-[#2a2a2a]'
    }
  };

  const [message, setMessage] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [botMode, setBotMode] = useState<'manual' | 'assistant' | 'autopilot'>('assistant');
  const [botSuggestion, setBotSuggestion] = useState<string | null>(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [forwardSearchTerm, setForwardSearchTerm] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [showClientInfo, setShowClientInfo] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | number | null>(null);

  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const lastProcessedMessageId = useRef<string | number | null>(null);
  const isFetchingSuggestion = useRef(false);
  const [showAskBotModal, setShowAskBotModal] = useState(false);
  const [botQuestion, setBotQuestion] = useState('');

  // Close message action menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setActiveActionMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);
  const [botContext, setBotContext] = useState('');
  const [showAIButtons, setShowAIButtons] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage(prev => prev + emojiData.emoji);
  };

  const [isSelectingMessages, setIsSelectingMessages] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string | number>>(new Set());
  const [isAskingBot, setIsAskingBot] = useState(false);
  const [currentMessenger, setCurrentMessenger] = useState<string>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('messenger') || 'instagram';
  });

  // React Query для списка клиентов
  const {
    data: clientsResponse,
    isLoading: isLoadingClients,
    error: clientsError,
  } = useQuery({
    queryKey: ['clients', currentMessenger],
    queryFn: async () => {
      const data = await api.getClients(currentMessenger);
      const clientsArray = data.clients || (Array.isArray(data) ? data : []);

      // Параллельно получаем unread count для каждого
      return Promise.all(
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
    },
    staleTime: 60 * 1000,
  });

  const [clients, setClients] = useState<Client[]>([]);

  // Синхронизируем локальный стейт с React Query (для WS обновлений)
  useEffect(() => {
    if (clientsResponse) {
      setClients(clientsResponse);
    }
  }, [clientsResponse]);

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // React Query для сообщений выбранного клиента
  const {
    data: messagesResponse,
    isLoading: isLoadingMessagesQuery,
  } = useQuery({
    queryKey: ['messages', selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      const data = await api.getChatMessages(selectedClient.id, 50, currentMessenger);
      return (data && typeof data === 'object' && 'messages' in data)
        ? data.messages
        : (Array.isArray(data) ? data : []);
    },
    enabled: !!selectedClient?.id,
    staleTime: 30 * 1000,
  });

  const [messages, setMessages] = useState<Message[]>([]);

  // Синхронизируем сообщения
  useEffect(() => {
    if (messagesResponse) {
      setMessages(messagesResponse);
    }
  }, [messagesResponse]);

  const [isTyping, setIsTyping] = useState(false);
  const shouldAutoScroll = true;

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const clientIdFromUrl = searchParams.get('client_id');
    const messengerFromUrl = searchParams.get('messenger') || 'instagram';

    // Only update if it actually changed to avoid loop
    if (messengerFromUrl !== currentMessenger) {
      setCurrentMessenger(messengerFromUrl);
      setSelectedClient(null);
      setMessages([]);
    }

    if (clientIdFromUrl) {
      localStorage.setItem('selectedClientId', clientIdFromUrl);
    }
  }, [location.search]);



  useEffect(() => {
    if (clients && clients.length > 0) {
      const selectedClientId = localStorage.getItem('selectedClientId');

      if (selectedClientId) {
        const client = clients.find(c => c.id === selectedClientId);
        if (client) {
          setSelectedClient(client);
          localStorage.removeItem('selectedClientId');
        }
      }
    }
  }, [clients]);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  const queryClient = useQueryClient();

  // Hook для WebSocket
  useChatWebSocket({
    userId: currentUser?.id || null,
    onNewMessage: (clientId, newMessage) => {
      console.log('📬 WS: New message received:', clientId, newMessage);

      // Самый простой способ обновить интерфейс - инвалидировать кэш для сообщений этого клиента
      queryClient.invalidateQueries({ queryKey: ['messages', clientId] });

      // Если клиент в списке есть, обновляем его данные (последнее сообщение, время)
      setClients(prev => prev.map(c =>
        c.id === clientId
          ? {
            ...c,
            last_contact: new Date().toISOString(),
            total_messages: (c.total_messages || 0) + 1,
            unread_count: selectedClient?.id === clientId ? (c.unread_count || 0) : (c.unread_count || 0) + 1
          }
          : c
      ));

      // Если сейчас открыт этот клиент, добавляем сообщение в список напрямую для мгновенности
      if (selectedClient?.id === clientId) {
        setMessages(prev => {
          // Проверка на дубликаты (по id или тексту если id нет)
          const isDuplicate = prev.some(m =>
            (m.id && m.id === newMessage.id) ||
            (m.message === newMessage.message && m.timestamp === newMessage.timestamp)
          );
          if (isDuplicate) return prev;
          return [...prev, newMessage];
        });
      }
    },
    onTyping: (clientId, isTyping) => {
      if (selectedClient?.id === clientId) {
        setIsTyping(isTyping);
      }
    }
  });


  useEffect(() => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldAutoScroll]);

  // Удалён setInterval polling

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
      console.log('Обнаружено новое сообщение от клиента:', lastMsg.id);

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


  const handleSelectClient = async (client: Client) => {
    setSelectedClient(client);
    setBotMode((client as any).bot_mode || 'assistant');
    // loadMessages(client.id); // React Query подхватит изменение selectedClient.id автоматически
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

        toast.info(t('chat:bot_suggestion_title', { count: response.unread_count }), {
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
      console.log('Обнаружена команда бота - НЕ отправляем клиенту!');

      let fullText = cleanMessage
        .replace(/#бот\s*помоги#?/gi, '')
        .replace(/#помоги#?/gi, '')
        .replace(/бот\s*помоги/gi, '')
        .replace(/помоги\s*бот/gi, '')
        .replace(/#bot#?/gi, '')
        .replace(/#help#?/gi, '')
        .trim();

      if (!fullText) {
        toast.error(t('chat:error_empty_question'), {
          description: t('chat:example_question'),
          duration: 5000
        });
        return;
      }

      const lines = fullText.split('\n').filter(l => l.trim());
      const question = lines[0].trim();
      const context = lines.slice(1).join('\n').trim();

      try {
        const loadingId = toast.loading(t('chat:analyzing'));
        const response = await api.askBotAdvice(question, context);
        toast.dismiss(loadingId);

        toast.success(t('chat:ai_advice_title'), {
          description: response.advice,
          duration: 30000,
          action: {
            label: t('common:copy'),
            onClick: () => {
              navigator.clipboard.writeText(response.advice);
              toast.success(t('common:copied'));
            }
          }
        });

        setMessage('');
        return;
      } catch (err) {
        console.error('Ошибка:', err);
        toast.error(t('chat:error_advice'), {
          description: err instanceof Error ? err.message : t('common:error_occurred')
        });
        return;
      }
    }

    console.log('Отправка сообщения клиенту');

    try {
      if (attachedFiles.length > 0) {

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

            toast.success(file.name);
          } catch (err) {
            console.error(err);
            toast.error(`${t('common:error')}: ${file.name}`);
          }
        }

        setAttachedFiles([]);
      }

      if (message.trim()) {
        let finalMessage = message;

        // Если это ответ на сообщение
        if (replyToMessage) {
          const quotedText = replyToMessage.message.length > 50
            ? replyToMessage.message.substring(0, 50) + '...'
            : replyToMessage.message;
          finalMessage = `${t('chat:reply_to')}: "${quotedText}"\n\n${message}`;
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
        setReplyToMessage(null);  // ДОБАВЛЕНО
        toast.success(t('chat:sent'));
      }

      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['messages', selectedClient.id] }), 1000);
    } catch (err) {
      console.error(err);
      toast.error(t('chat:error_sending'));
    }
  };

  const handleAskBot = async () => {
    if (!botQuestion.trim()) {
      toast.error(t('chat:enter_question'));
      return;
    }

    try {
      setIsAskingBot(true);

      const recentMessages = selectedMessageIds.size > 0
        ? messages.filter(m => selectedMessageIds.has(m.id!))
          .map(msg => {
            const sender = msg.sender === 'client' ? t('chat:client') : t('chat:manager');
            return `${sender}: ${msg.message}`;
          })
          .join('\n')
        : messages.slice(-5).map(msg => {
          const sender = msg.sender === 'client' ? t('chat:client', 'Client') : t('chat:manager', 'Manager');
          return `${sender}: ${msg.message}`;
        }).join('\n');

      const fullContext = botContext.trim()
        ? `${recentMessages}\n\n${t('chat:additional_context')}:\n${botContext}`
        : recentMessages;

      const response = await api.askBotAdvice(botQuestion, fullContext);

      toast.success(t('chat:ai_advice_title'), {
        description: response.advice,
        duration: 60000,
        action: {
          label: 'Копировать',
          onClick: () => {
            navigator.clipboard.writeText(response.advice);
            toast.success(t('common:copied'));
          }
        }
      });

      setShowAskBotModal(false);
      setBotQuestion('');
      setBotContext('');
      setShowAIButtons(false);

    } catch (err) {
      console.error('Error asking bot:', err);
      toast.error(t('chat:error_getting_advice'), {
        description: err instanceof Error ? err.message : t('common:unknown_error')
      });
    } finally {
      setIsAskingBot(false);
    }
  };


  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setAttachedFiles([...attachedFiles, ...files]);
      toast.success(t('chat:images_added', { count: files.length }));
    }
  };

  const handleProhibitedAction = (action: string) => {
    toast.error(`Системой ${currentMessenger} пока запрещено ${action}`);
  };

  const handleFileSelect = () => {
    // Временно отключено по просьбе пользователя
    handleProhibitedAction('прикреплять файлы');
    /* 
    Не удалять - логика прикрепления файлов
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setAttachedFiles([...attachedFiles, ...files]);
      toast.success(t('chat:files_added', { count: files.length }));
    }
    */
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
    toast.info(t('chat:file_removed'));
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = (client.display_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.phone || '').includes(searchTerm);
    const matchesMessenger = client.source ? client.source === currentMessenger : true; // Fallback to all if source is missing
    return matchesSearch && matchesMessenger;
  });


  // Check permissions
  if (!userPermissions.canViewAllClients) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-50 via-white to-pink-50">
        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] shadow-2xl border border-white p-12 max-w-md w-full text-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-25"></div>
            <Shield className="w-12 h-12 text-red-500 relative z-10" />
          </div>

          <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">
            {t('common:access_denied')}
          </h2>

          <p className="text-gray-600 leading-relaxed mb-8">
            {t('chat:no_permission_msg')}
          </p>

          <button
            onClick={() => window.history.back()}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-lg hover:shadow-black/20"
          >
            {t('common:go_back')}
          </button>
        </div>
      </div>
    );
  }

  if (isLoadingClients) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-50 via-white to-pink-50">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-pink-400 rounded-3xl blur-xl opacity-20 animate-pulse"></div>
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl border border-white relative z-10">
              <Loader className="w-10 h-10 text-blue-600 animate-spin" strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-gray-900 font-black text-lg tracking-tight">{t('chat:loading_chats')}</p>
            <p className="text-gray-400 text-sm font-medium">{t('chat:please_wait')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (clientsError) {
    return (
      <div className="p-4 md:p-8">
        <div className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-red-900 font-bold text-lg">{t('chat:error_loading')}</p>
              <p className="text-red-700 mt-2">{(clientsError as Error).message}</p>
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['clients'] })}
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
    <div className={`h-screen flex p-0 md:p-4 messenger-${currentMessenger}`}>
      <div className="rounded-none md:rounded-3xl shadow-2xl border border-gray-200/50 h-full w-full flex overflow-hidden">
        {/* Clients List */}
        <div className={`
          ${selectedClient ? 'hidden md:flex' : 'flex'}
          flex-col w-full md:w-64 border-r border-gray-200 bg-white
        `}>
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xl font-bold text-gray-900 capitalize flex items-center gap-2">
                {currentMessenger === 'instagram' && <InstagramIcon size={32} colorful={true} />}
                {currentMessenger === 'telegram' && <TelegramIcon size={32} colorful={true} />}
                {currentMessenger === 'whatsapp' && <WhatsAppIcon size={32} colorful={true} />}
                {currentMessenger === 'tiktok' && <TikTokIcon size={32} colorful={true} />}
                <span className="ml-1 uppercase">{currentMessenger}</span>
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('common:search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-[#F1F5F9] border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredClients.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {filteredClients.map((client, index) => (
                  <ClientItem
                    key={client.id || index}
                    client={client}
                    isSelected={selectedClient?.id === client.id}
                    onClick={() => handleSelectClient(client)}
                    t={t}
                    language={i18n.language}
                    selectionBg={messengerStyles[currentMessenger]?.selectionBg || messengerStyles.instagram.selectionBg}
                    avatarGradient={messengerStyles[currentMessenger]?.avatarGradient || messengerStyles.instagram.avatarGradient}
                  />
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
          <div className="flex-1 flex min-w-0">
            {/* Main Chat Column */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Chat Header */}
              <div
                className="p-2 md:p-3 chat-header flex-shrink-0"
              >
                <div className="flex items-center justify-between gap-2">
                  {/* Left: Avatar & Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={handleBackToList}
                      className={`md:hidden p-2 -ml-2 rounded-full transition-colors ${(currentMessenger === 'instagram' || currentMessenger === 'tiktok') ? 'hover:bg-white/10 text-white' : 'hover:bg-black/5 text-gray-700'
                        }`}
                    >
                      <ArrowLeft className="w-5 h-5" />
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
                        <div className={`size-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${messengerStyles[currentMessenger]?.avatarGradient || messengerStyles.instagram.avatarGradient}`}>
                          {selectedClient.display_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`font-bold truncate text-sm leading-tight ${(currentMessenger === 'instagram' || currentMessenger === 'tiktok') ? 'text-white' : 'text-gray-900'
                        }`}>{selectedClient.display_name}</p>
                      <p className={`text-[11px] truncate mt-0.5 ${(currentMessenger === 'instagram' || currentMessenger === 'tiktok') ? 'text-white/70' : 'text-gray-500'
                        }`}>
                        {selectedClient.username ? `@${selectedClient.username}` : 'Online'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setShowAIButtons(!showAIButtons)}
                      className={`h-8 px-4 text-white rounded-full flex items-center gap-1.5 transition-all active:scale-95 shadow-sm ${messengerStyles[currentMessenger]?.aiButton || messengerStyles.instagram.aiButton}`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-bold tracking-wider">AI</span>
                    </button>

                    <button
                      onClick={() => setShowMobileMenu(!showMobileMenu)}
                      className={`p-2 rounded-full transition-colors ${(currentMessenger === 'instagram' || currentMessenger === 'tiktok') ? 'text-white/70 hover:bg-white/10' : 'text-gray-500 hover:bg-black/5'
                        }`}
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {showMobileMenu && (
                      <>
                        <div className="fixed inset-0 z-40"
                          onClick={() => setShowMobileMenu(false)}
                        />
                        <div className="absolute right-0 top-11 w-52 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 z-50 text-gray-900">
                          <button
                            onClick={() => {
                              setShowClientInfo(!showClientInfo);
                              setShowTemplates(false);
                              setShowNotes(false);
                              setShowMobileMenu(false);
                            }}
                            className="w-full px-4 py-2.5 text-left hover:bg-gradient-to-r hover:from-pink-50 hover:to-blue-50 flex items-center gap-2 transition-colors text-sm text-gray-900"
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
                            className="w-full px-4 py-2.5 text-left hover:bg-gradient-to-r hover:from-pink-50 hover:to-blue-50 flex items-center gap-2 transition-colors text-sm text-gray-900"
                          >
                            <FileText className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">{t('chat:templates')}</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowNotes(!showNotes);
                              setShowClientInfo(false);
                              setShowTemplates(false);
                              setShowMobileMenu(false);
                            }}
                            className="w-full px-4 py-2.5 text-left hover:bg-gradient-to-r hover:from-pink-50 hover:to-blue-50 flex items-center gap-2 transition-colors text-sm text-gray-900"
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
                  <p className="text-sm font-medium text-blue-900 mb-1 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-blue-500" />
                    {t('chat:selection_mode_title')}
                  </p>
                  <p className="text-xs text-blue-700">
                    {t('chat:selection_mode_desc')}
                  </p>
                </div>
              )}

              {/* Messages Area */}
              <div
                className="flex-1 overflow-y-auto p-4 space-y-3 chat-messages-area"
              >
                {isLoadingMessagesQuery ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl">
                        <Loader className="w-6 h-6 text-white animate-spin" />
                      </div>
                      <p className="text-gray-500 font-medium text-sm">{t('chat:loading')}</p>
                    </div>
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((msg, index) => (
                    <div
                      key={msg.id || index}
                      ref={(el) => { messageRefs.current[index] = el; }}
                      className={`flex items-start gap-4 h-auto relative group ${(msg.sender === 'bot' || msg.sender === 'manager') ? 'flex-row-reverse' : 'flex-row'} mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300`}
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
                          {msg.message.includes(t('chat:reply_to')) && (
                            <div className="border-l-2 border-current/20 bg-current/5 px-2.5 py-1.5 mb-2 rounded">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <Reply className="w-3 h-3 flex-shrink-0 opacity-70" />
                                <p className="text-xs font-bold opacity-90">
                                  {t('chat:reply_to_client', { name: selectedClient?.display_name })}
                                </p>
                              </div>
                              <p className="text-xs opacity-80 line-clamp-2">
                                {msg.message.split('\n\n')[0].replace(`${t('chat:reply_to')}: "`, '').replace('"', '')}
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
                                <p className="text-sm flex items-center gap-1">
                                  <ImageIcon className="w-4 h-4" />
                                  {t('chat:image_not_available')}
                                </p>
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
                                className="flex items-center gap-2 hover:underline text-inherit"
                              >
                                <FileText className="w-5 h-5" />
                                <span className="text-sm font-medium">{t('chat:open_file')}</span>
                              </a>
                              <div className="mt-2 opacity-70">
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
                              {msg.message.includes(t('chat:reply_to')) ? (
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

                      {/* Actions Menu (Three Dots) - Anchored inside the flex flow for maximum reliability */}
                      <div
                        className={`flex items-center self-center transition-all duration-300 opacity-0 group-hover:opacity-100 z-50 ${(msg.sender === 'bot' || msg.sender === 'manager')
                          ? 'order-first mr-1 translate-x-1'
                          : 'order-last ml-1 -translate-x-1'
                          }`}
                      >
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveActionMenuId(activeActionMenuId === (msg.id || index) ? null : (msg.id || index));
                            }}
                            className="p-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-full shadow-lg border border-gray-100 dark:border-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all scale-90 hover:scale-110 active:scale-95"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Pill Menu (Shown on Click) */}
                          {activeActionMenuId === (msg.id || index) && (
                            <div
                              className={`absolute bottom-full mb-3 flex items-center gap-0.5 bg-white/98 dark:bg-gray-800/98 backdrop-blur-xl rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-gray-100 dark:border-gray-700 p-1 animate-in zoom-in-95 slide-in-from-bottom-2 duration-200 z-[120] ${(msg.sender === 'bot' || msg.sender === 'manager') ? 'right-0' : 'left-0'
                                }`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  setReplyToMessage(msg);
                                  toast.info(t('chat:type_reply'));
                                  setActiveActionMenuId(null);
                                }}
                                className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition-all"
                                title={t('common:reply')}
                              >
                                <Reply className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(msg.message);
                                  toast.success(t('common:copied'));
                                  setActiveActionMenuId(null);
                                }}
                                className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition-all"
                                title={t('common:copy')}
                              >
                                <Copy className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setForwardMessage(msg);
                                  setShowForwardModal(true);
                                  setActiveActionMenuId(null);
                                }}
                                className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition-all"
                                title={t('common:forward')}
                              >
                                <Forward className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setActiveActionMenuId(null)}
                                className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-gray-500 hover:text-red-500 dark:hover:text-red-400 rounded-full transition-all"
                                title={t('common:like')}
                              >
                                <Heart className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
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
                {isTyping && (
                  <div className="flex items-start gap-4 flex-row mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2 flex items-center gap-1 shadow-sm border border-gray-200/50">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies */}
              {showQuickReplies && selectedClient && (
                <div className="border-t border-gray-200 bg-gradient-to-r from-blue-50 to-pink-50 p-3 flex-shrink-0">
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
                <div className="border-t border-gray-200 p-3 bg-gradient-to-r from-blue-50 to-blue-50 flex-shrink-0">
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
                            <Video className="w-8 h-8 text-blue-600" />
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
                <div className="px-4 py-3 bg-white/80 backdrop-blur-md border-t border-blue-100 animate-in slide-in-from-bottom duration-300">
                  <div className="flex gap-2">
                    {botMode === 'assistant' && (
                      <button
                        onClick={() => fetchBotSuggestion(selectedClient.id)}
                        disabled={isLoadingSuggestion}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-pink-500 text-white rounded-xl font-bold text-xs hover:from-blue-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
                      >
                        {isLoadingSuggestion ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        <span>{t('chat:auto_hint')}</span>
                      </button>
                    )}
                    <button
                      onClick={() => setIsSelectingMessages(true)}
                      className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-xs hover:bg-black transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{t('chat:ask_ai')}</span>
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

              {/* Chat Input Capsule */}
              <div
                className="p-4 md:p-6 chat-input-area flex-shrink-0"
              >
                {/* Reply Preview */}
                {replyToMessage && (
                  <div className="mb-3 max-w-xl mx-auto">
                    <div className="bg-white/80 backdrop-blur border-l-4 border-blue-500 rounded-2xl p-3 flex items-start gap-3 shadow-lg animate-in slide-in-from-bottom-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                          <span className="text-xs font-bold text-gray-700">
                            {t('chat:reply_to')} {replyToMessage.sender === 'client' ? selectedClient?.display_name : t('chat:your_message')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate italic">
                          "{replyToMessage.message.substring(0, 100)}{replyToMessage.message.length > 100 ? '...' : ''}"
                        </p>
                      </div>
                      <button
                        onClick={() => setReplyToMessage(null)}
                        className="flex-shrink-0 w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="max-w-5xl mx-auto flex items-center gap-3 bg-[#F1F5F9] p-1.5 rounded-[28px] shadow-inner relative group/input">
                  {/* Image Attachment (Allowed) */}
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="p-3 bg-white text-gray-500 hover:text-blue-600 rounded-2xl transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-md border border-gray-100"
                    title={t('chat:attach_image')}
                  >
                    <ImageIcon className="w-6 h-6" strokeWidth={2.2} />
                  </button>

                  <input
                    type="file"
                    ref={imageInputRef}
                    onChange={handleImageSelect}
                    className="hidden"
                    multiple
                    accept="image/*"
                  />

                  {/* File Attachment */}
                  {/* 
                  <button
                    onClick={() => handleProhibitedAction('прикреплять файлы')}
                    className="p-3 text-gray-500 hover:bg-white hover:text-blue-600 rounded-full transition-all duration-300 hover:scale-110 hover:shadow-md"
                     title={t('chat:attach_file', 'Прикрепить файл')}
                  >
                    <Paperclip className="w-6 h-6" />
                  </button>
                  */}

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                  />

                  <div className="flex-1 relative flex items-center">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t('chat:message_placeholder')}
                      className="w-full bg-transparent border-none py-3 px-2 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-0"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSendMessage();
                        }
                      }}
                    />

                    {/* Emoji Button */}
                    <div className="relative" ref={emojiPickerRef}>
                      <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <span className="text-xl grayscale group-hover/input:grayscale-0 transition-all">😊</span>
                      </button>

                      {showEmojiPicker && (
                        <div ref={emojiPickerRef} className="absolute bottom-full right-0 mb-4 z-50">
                          <EmojiPicker
                            onEmojiClick={handleEmojiClick}
                            width={350}
                            height={400}
                            previewConfig={{ showPreview: false }}
                            searchDisabled={false}
                            skinTonesDisabled={false}
                            lazyLoadEmojis={true}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Send or Voice Button */}
                  <div className="flex items-center">
                    <button
                      onClick={handleSendMessage}
                      disabled={!message.trim()}
                      className={`w-12 h-12 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center shadow-lg hover:shadow-xl ${!message.trim() ? 'opacity-50 grayscale cursor-not-allowed' : ''} ${messengerStyles[currentMessenger]?.sendButton || messengerStyles.instagram.sendButton}`}
                    >
                      <Send className="w-5 h-5 text-white" fill="currentColor" />
                    </button>
                    {/* Voice message temporarily disabled
                    {message.trim() ? (
                      <button
                        onClick={handleSendMessage}
                        className="p-3 bg-gradient-to-r from-blue-500 to-pink-500 text-white rounded-full transition-all duration-300 hover:scale-110 hover:shadow-lg active:scale-95 flex items-center justify-center"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleProhibitedAction(t('chat:send_voice', 'send voice messages'))}
                        className="p-3 text-gray-500 hover:bg-white hover:text-blue-600 rounded-full transition-all duration-300"
                        title="Голосовое сообщение"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </button>
                    )} 
                    */}
                  </div>
                </div>

                {botSuggestion && (
                  <div className="max-w-5xl mx-auto mt-4 relative animate-in slide-in-from-top-4">
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 pr-12 shadow-sm">
                      <p className="text-sm text-blue-900 font-medium flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-blue-500" />
                        {t('chat:bot_advice_title')}
                      </p>
                      <p className="text-sm text-blue-700 mt-1">{botSuggestion}</p>
                      <button
                        onClick={() => {
                          setBotSuggestion(null);
                          setMessage('');
                        }}
                        className="absolute top-4 right-4 text-blue-400 hover:text-blue-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar for Panels */}
            {selectedClient && (showClientInfo || showTemplates || showNotes) && (
              <div className="w-full md:w-96 border-l border-gray-200 overflow-y-auto flex-shrink-0 bg-white text-gray-900 shadow-xl z-20">
                {showClientInfo && (
                  <div className="p-4 text-gray-900">
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
          <div className="flex-1 hidden md:flex items-center justify-center bg-gradient-to-br from-gray-50 to-pink-50 empty-chat-area">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-pink-100 to-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
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
                    {t('chat:ask_ai_consultant')}
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-blue-500" />
                    {t('chat:your_question')} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={botQuestion}
                    onChange={(e) => setBotQuestion(e.target.value)}
                    placeholder={t('chat:ask_bot_placeholder')}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl resize-none focus:border-blue-500 focus:outline-none text-sm"
                    rows={3}
                    autoFocus
                  />
                </div>

                {/* Контекст (опционально) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-gray-500" />
                    {t('chat:additional_context')}
                  </label>
                  <textarea
                    value={botContext}
                    onChange={(e) => setBotContext(e.target.value)}
                    placeholder={t('chat:context_example')}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl resize-none focus:border-blue-500 focus:outline-none text-sm"
                    rows={2}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('chat:context_hint')}
                  </p>
                </div>

                {/* Подсказки */}
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                  <p className="text-xs font-semibold text-blue-900 mb-2">{t('chat:question_examples')}</p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• {t('chat:example_1')}</li>
                    <li>• {t('chat:example_2')}</li>
                    <li>• {t('chat:example_3')}</li>
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
                  {t('common:cancel')}
                </button>
                <button
                  onClick={handleAskBot}
                  disabled={isAskingBot || !botQuestion.trim()}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium text-sm hover:from-blue-600 hover:to-indigo-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAskingBot ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>{t('chat:thinking')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{t('chat:get_advice')}</span>
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
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-pink-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">{t('common:forward', 'Forward')}</h3>
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
                    placeholder={t('common:search', 'Search...')}
                    value={forwardSearchTerm}
                    onChange={(e) => setForwardSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
              </div>

              {/* Clients List */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase px-3 mb-2">{t('chat:recommended')}</p>
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
                            await api.sendMessage(client.id, `${t('chat:forwarded')}:\n\n${forwardMessage.message}`);
                            toast.success(`${t('chat:sent_to')} ${client.display_name}`);
                            setShowForwardModal(false);
                            setForwardMessage(null);
                            setForwardSearchTerm('');
                          } catch (err) {
                            toast.error(t('chat:error_forward'));
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
                          <div className={`w-10 h-10 rounded-full ${messengerStyles[currentMessenger]?.avatarGradient || 'bg-gradient-to-br from-blue-500 to-pink-500'} flex items-center justify-center text-white font-semibold text-sm`}>
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
                  {t('common:send')}
                </button>
              </div>
            </div>
          </div>
        )
      }
      {/* Messenger Sidebar (Desktop) */}
      <div className="hidden md:flex flex-col gap-4 p-4 border-r border-gray-100 bg-gray-50/50">
        {['instagram', 'telegram', 'whatsapp', 'tiktok'].map((m) => (
          <motion.button
            key={m}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentMessenger(m)}
            className={`
              relative group p-4 rounded-2xl transition-all duration-500 flex items-center justify-center
              ${currentMessenger === m
                ? 'bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl shadow-black/20 scale-105'
                : 'bg-white hover:bg-gray-50 shadow-sm border border-gray-100'
              }
            `}
          >
            <div className={`
              absolute inset-0 bg-gradient-to-br rounded-2xl opacity-0 transition-opacity duration-500
              ${m === 'instagram' ? 'from-purple-500/10 to-pink-500/10' :
                m === 'telegram' ? 'from-blue-500/10 to-indigo-500/10' :
                  m === 'whatsapp' ? 'from-green-500/10 to-emerald-500/10' :
                    'from-gray-500/10 to-black/10'}
              group-hover:opacity-100
            `} />

            {m === 'instagram' && <InstagramIcon size={24} colorful={currentMessenger === m} />}
            {m === 'telegram' && <TelegramIcon size={24} colorful={currentMessenger === m} />}
            {m === 'whatsapp' && <WhatsAppIcon size={24} colorful={currentMessenger === m} />}
            {m === 'tiktok' && <TikTokIcon size={24} colorful={currentMessenger === m} />}

            {currentMessenger === m && (
              <motion.div
                layoutId="messenger-active"
                className="absolute -left-1 w-1 h-8 bg-pink-500 rounded-full"
              />
            )}
          </motion.button>
        ))}
      </div>
    </div >
  );
}
