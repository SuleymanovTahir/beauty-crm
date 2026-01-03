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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Наш менеджер скоро ответит вам! 💜',
      time: '18:38',
      isOwn: true,
    },
    {
      id: '2',
      text: 'Наш менеджер скоро ответит вам! 💜',
      time: '21:37',
      isOwn: true,
    },
  ]);

  const [chats] = useState<Chat[]>([
    {
      id: '1',
      name: 'Tahir',
      username: '@Tahir',
      avatar: '',
      lastMessage: '11 сообщений',
      time: '02 янв.',
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
    setMessages([...messages, newMessage]);
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
    <div className={`h-screen flex ${
      selectedMessenger === 'tiktok' ? 'bg-black' :
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
          <div className={`flex-1 overflow-y-auto p-4 ${
            selectedMessenger === 'telegram' ? 'bg-[#e7eef3]' :
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
