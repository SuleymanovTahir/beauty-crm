import { useState } from 'react';
import { MessengerSidebar, MessengerType } from './components/MessengerSidebar';
import { ChatSidebar } from './components/ChatSidebar';
import { ChatHeader } from './components/ChatHeader';
import { MessageBubble } from './components/MessageBubble';
import { ChatInput } from './components/ChatInput';
import { InfoPanel } from './components/InfoPanel';
import { AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';

interface Message {
  id: string;
  text: string;
  time: string;
  isOwn: boolean;
  liked?: boolean;
}

interface Chat {
  id: string;
  name: string;
  username: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  phone: string;
}

export default function App() {
  const [selectedMessenger, setSelectedMessenger] = useState<MessengerType>('instagram');
  const [selectedChatId, setSelectedChatId] = useState<string | null>('1');
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [messengerMessages, setMessengerMessages] = useState<Record<MessengerType, Message[]>>({
    instagram: [
      { id: 'i1', text: 'Привет! Какая цена на маникюр?', time: '10:00', isOwn: false },
      { id: 'i2', text: 'Здравствуйте! Маникюр с покрытием от 2000р ✨', time: '10:05', isOwn: true },
    ],
    telegram: [
      { id: 't1', text: 'Запишите меня на завтра на 15:00', time: '11:20', isOwn: false },
      { id: 't2', text: 'Проверяю свободные окошки... Да, есть место! Ждем вас 🌸', time: '11:25', isOwn: true },
    ],
    whatsapp: [
      { id: 'w1', text: 'Добрый день! Хочу уточнить адрес салона', time: '09:15', isOwn: false },
      { id: 'w2', text: 'Добрый день! Мы находимся на ул. Примерная, 15 📍', time: '09:20', isOwn: true },
    ],
    tiktok: [
      { id: 'tk1', text: 'Классное видео! Сколько стоит такая укладка?', time: '14:40', isOwn: false },
      { id: 'tk2', text: 'Спасибо! Такая укладка стоит 3500р 💜', time: '14:45', isOwn: true },
    ]
  });

  const messages = messengerMessages[selectedMessenger] || [];

  const [chats] = useState<Chat[]>([
    {
      id: '1',
      name: 'Tahir',
      username: '@Tahir',
      avatar: '',
      lastMessage: 'Записаться на завтра',
      time: '12:00',
      unread: 0,
      phone: '+77056054308',
    },
  ]);

  const selectedChat = chats.find(chat => chat.id === selectedChatId);

  const handleSendMessage = (text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
    };
    setMessengerMessages({
      ...messengerMessages,
      [selectedMessenger]: [...(messengerMessages[selectedMessenger] || []), newMessage]
    });
  };

  const handleReply = (messageId: string) => {
    toast.success('Ответить на сообщение');
  };

  const handleCopy = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      navigator.clipboard.writeText(message.text);
      toast.success('Текст скопирован');
    }
  };

  const handleForward = (messageId: string) => {
    toast.success('Переслать сообщение');
  };

  const handleLike = (messageId: string) => {
    setMessages(messages.map(m =>
      m.id === messageId ? { ...m, liked: !m.liked } : m
    ));
  };

  return (
    <div className={`h-screen flex ${selectedMessenger === 'tiktok' ? 'bg-black' :
      selectedMessenger === 'whatsapp' ? 'bg-[#f0f2f5]' :
        'bg-gray-50'
      }`}>
      <Toaster />

      {/* Messenger Sidebar */}
      <MessengerSidebar
        selectedMessenger={selectedMessenger}
        onSelectMessenger={setSelectedMessenger}
      />

      {/* Chat Sidebar */}
      <ChatSidebar
        chats={chats}
        selectedChatId={selectedChatId}
        onSelectChat={setSelectedChatId}
        messengerType={selectedMessenger}
      />

      {/* Main Chat Area */}
      {selectedChat && (
        <div className="flex-1 flex flex-col">
          <ChatHeader
            name={selectedChat.name}
            username={selectedChat.username}
            onInfo={() => setShowInfoPanel(true)}
            onMute={() => toast.success('Уведомления отключены')}
            onReport={() => toast.success('Жалоба отправлена')}
            onAIClick={() => toast.success('AI-помощник активирован ✨')}
            messengerType={selectedMessenger}
          />

          {/* Messages */}
          <div className={`flex-1 overflow-y-auto p-4 ${selectedMessenger === 'telegram' ? 'bg-[#e7eef3]' :
            selectedMessenger === 'whatsapp' ? 'bg-[#e5ddd5]' :
              selectedMessenger === 'tiktok' ? 'bg-black' :
                'bg-white'
            }`}>
            <div className="max-w-4xl mx-auto space-y-1">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onReply={handleReply}
                  onCopy={handleCopy}
                  onForward={handleForward}
                  onLike={handleLike}
                  messengerType={selectedMessenger}
                />
              ))}
            </div>
          </div>

          {/* Input */}
          <ChatInput
            onSendMessage={handleSendMessage}
            messengerType={selectedMessenger}
          />
        </div>
      )}

      {/* Info Panel */}
      <AnimatePresence>
        {showInfoPanel && selectedChat && (
          <InfoPanel
            name={selectedChat.name}
            username={selectedChat.username}
            phone={selectedChat.phone}
            onClose={() => setShowInfoPanel(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
