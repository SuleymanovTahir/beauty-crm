import { useState, useEffect, useRef } from 'react';
import { Send, Users, Loader, MessageCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { useTranslation } from 'react-i18next';

interface Message {
  id: number;
  sender_id: number;
  recipient_id: number | null;
  message: string;
  is_group: boolean;
  is_read: boolean;
  created_at: string;
  sender_name: string;
  recipient_name: string | null;
}

interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
}

export default function InternalChat() {
  const { t } = useTranslation('common');
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [messagesData, usersData] = await Promise.all([
        fetch('/api/internal-chat/messages', { credentials: 'include' }).then(r => r.json()),
        fetch('/api/internal-chat/users', { credentials: 'include' }).then(r => r.json())
      ]);

      setMessages(messagesData.messages || []);
      setUsers(usersData.users || []);
    } catch (err) {
      console.error('Error loading data:', err);
      toast.error(t('error_loading_data'));
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const data = await fetch('/api/internal-chat/messages', {
        credentials: 'include'
      }).then(r => r.json());
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    try {
      setSending(true);

      await fetch('/api/internal-chat/send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage,
          recipient_id: selectedUser?.id || null,
          is_group: !selectedUser
        })
      });

      setNewMessage('');
      await loadMessages();
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error(t('error_sending_message'));
    } finally {
      setSending(false);
    }
  };

  const filteredMessages = selectedUser
    ? messages.filter(m =>
      (m.sender_id === currentUser.id && m.recipient_id === selectedUser.id) ||
      (m.sender_id === selectedUser.id && m.recipient_id === currentUser.id)
    )
    : messages.filter(m => m.is_group);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <Loader className="w-8 h-8 text-pink-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Список пользователей */}
      <aside className="w-80 bg-white border-r border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-pink-600" />
            {t('internal_chat')}
          </h2>
        </div>

        <div className="overflow-y-auto h-[calc(100vh-88px)]">
          {/* Общий чат */}
          <button
            onClick={() => setSelectedUser(null)}
            className={`w-full p-4 flex items-center gap-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${!selectedUser ? 'bg-pink-50' : ''
              }`}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-gray-900">{t('group_chat')}</p>
              <p className="text-xs text-gray-500">{t('all_employees')}</p>
            </div>
          </button>

          {/* Список пользователей */}
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className={`w-full p-4 flex items-center gap-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${selectedUser?.id === user.id ? 'bg-pink-50' : ''
                }`}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user.full_name.charAt(0)}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Область сообщений */}
      <main className="flex-1 flex flex-col">
        {/* Заголовок */}
        <div className="p-6 bg-white border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedUser ? selectedUser.full_name : t('group_chat')}
          </h3>
          <p className="text-sm text-gray-500">
            {selectedUser ? t('private_chat_with', { name: selectedUser.full_name }) : t('all_employees')}
          </p>
        </div>

        {/* Сообщения */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredMessages.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p>{t('no_messages_yet')}</p>
              <p className="text-sm">{t('start_conversation')}</p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isOwn = msg.sender_id === currentUser.id;

              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
                    {!isOwn && (
                      <p className="text-xs text-gray-500 mb-1 ml-2">{msg.sender_name}</p>
                    )}
                    <div className={`rounded-2xl px-4 py-2 ${isOwn
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                      }`}>
                      <p className="text-sm">{msg.message}</p>
                      <p className={`text-xs mt-1 ${isOwn ? 'text-pink-100' : 'text-gray-500'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Форма отправки */}
        <form onSubmit={handleSendMessage} className="p-6 bg-white border-t border-gray-200">
          <div className="flex gap-3">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={t('type_message')}
              disabled={sending}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="bg-gradient-to-r from-pink-500 to-purple-600"
            >
              {sending ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}