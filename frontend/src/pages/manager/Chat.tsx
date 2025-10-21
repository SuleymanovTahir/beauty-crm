import React, { useState, useRef } from 'react';
import { 
  MessageCircle, 
  Search, 
  Phone, 
  Instagram, 
  Paperclip, 
  Image as ImageIcon, 
  FileText, 
  MapPin, 
  Smile, 
  Send,
  Mic,
  StickyNote,
  Pin,
  X
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner@2.0.3';

// Mock data
const mockClients = [
  {
    id: 1,
    name: 'Анна Иванова',
    avatar: 'А',
    phone: '+971 50 123 4567',
    instagram: '@anna_ivanova',
    lastMessage: 'Спасибо, записалась!',
    time: '10:30',
    unread: 2,
    online: true
  },
  {
    id: 2,
    name: 'Мария Петрова',
    avatar: 'М',
    phone: '+971 50 234 5678',
    instagram: '@maria_p',
    lastMessage: 'Какие у вас цены на маникюр?',
    time: 'Вчера',
    unread: 0,
    online: false
  },
  {
    id: 3,
    name: 'Елена Сидорова',
    avatar: 'Е',
    phone: '+971 50 345 6789',
    instagram: '@elena_sid',
    lastMessage: 'Можно перенести запись?',
    time: '2 дня назад',
    unread: 1,
    online: false
  },
];

const mockMessages = [
  {
    id: 1,
    clientId: 1,
    type: 'client',
    text: 'Здравствуйте! Хочу записаться на перманентный макияж бровей',
    time: '10:15',
    read: true
  },
  {
    id: 2,
    clientId: 1,
    type: 'bot',
    text: 'Здравствуйте! Конечно, будем рады видеть вас. У нас есть свободные слоты на эту неделю. Когда вам удобно?',
    time: '10:16',
    read: true
  },
  {
    id: 3,
    clientId: 1,
    type: 'client',
    text: 'В пятницу после 14:00 было бы идеально',
    time: '10:18',
    read: true
  },
  {
    id: 4,
    clientId: 1,
    type: 'bot',
    text: 'Отлично! Записала вас на пятницу в 15:00. Процедура занимает около 2-3 часов. Нужна ли вам консультация перед процедурой?',
    time: '10:20',
    read: true
  },
  {
    id: 5,
    clientId: 1,
    type: 'client',
    text: 'Спасибо, записалась!',
    time: '10:30',
    read: false
  },
];

export default function Chat() {
  const [selectedClient, setSelectedClient] = useState(mockClients[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(mockMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredClients = mockClients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  );

  const clientMessages = messages.filter(m => m.clientId === selectedClient.id);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    const newMessage = {
      id: messages.length + 1,
      clientId: selectedClient.id,
      type: 'bot' as const,
      text: message,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      read: false
    };
    
    setMessages([...messages, newMessage]);
    setMessage('');
    toast.success('Сообщение отправлено');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        toast.success('Файл прикреплен');
      } else {
        toast.success('Документ прикреплен');
      }
    }
  };

  const handlePinClient = () => {
    toast.success('Клиент закреплен');
  };

  const handleSaveNotes = () => {
    toast.success('Заметки сохранены');
    setShowNotes(false);
  };

  return (
    <div className="h-[calc(100vh-2rem)] p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex overflow-hidden">
        {/* Clients List */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg text-gray-900 flex items-center gap-2">
                Чаты
                {mockClients.filter(c => c.unread > 0).length > 0 && (
                  <Badge className="bg-pink-600 text-white">
                    {mockClients.reduce((sum, c) => sum + c.unread, 0)}
                  </Badge>
                )}
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
            {filteredClients.map((client) => (
              <div
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className={`p-4 cursor-pointer border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  selectedClient.id === client.id ? 'bg-pink-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white">
                      {client.avatar}
                    </div>
                    {client.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-gray-900 truncate">{client.name}</p>
                      <span className="text-xs text-gray-500">{client.time}</span>
                    </div>
                    <p className="text-xs text-gray-600 truncate mb-1">{client.lastMessage}</p>
                    <a 
                      href={`https://instagram.com/${client.instagram.substring(1)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-pink-600 hover:underline flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Instagram className="w-3 h-3" />
                      {client.instagram}
                    </a>
                  </div>
                  {client.unread > 0 && (
                    <Badge className="bg-pink-600 text-white text-xs">
                      {client.unread}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white">
                  {selectedClient.avatar}
                </div>
                <div>
                  <p className="text-sm text-gray-900">{selectedClient.name}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {selectedClient.phone}
                    </span>
                    <a 
                      href={`https://instagram.com/${selectedClient.instagram.substring(1)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-600 hover:underline flex items-center gap-1"
                    >
                      <Instagram className="w-3 h-3" />
                      {selectedClient.instagram}
                    </a>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handlePinClient}>
                  <Pin className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowNotes(!showNotes)}
                >
                  <StickyNote className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {isTyping && (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span>{selectedClient.name} печатает...</span>
              </div>
            )}

            {clientMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'bot' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-md px-4 py-3 rounded-2xl ${
                    msg.type === 'bot'
                      ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                  <p className={`text-xs mt-1 ${msg.type === 'bot' ? 'text-pink-100' : 'text-gray-500'}`}>
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Notes Panel */}
          {showNotes && (
            <div className="border-t border-gray-200 p-4 bg-yellow-50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm text-gray-900">Заметки о клиенте</h4>
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

          {/* Image Preview */}
          {imagePreview && (
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Прикрепленное изображение</p>
                <Button size="sm" variant="ghost" onClick={() => setImagePreview(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg" />
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
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,application/pdf,.doc,.docx"
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
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    title="Прикрепить изображение"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    title="Отправить локацию"
                  >
                    <MapPin className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    title="Смайлики"
                  >
                    <Smile className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    title="Голосовое сообщение"
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 flex-1"
                    disabled={!message.trim()}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Отправить
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
