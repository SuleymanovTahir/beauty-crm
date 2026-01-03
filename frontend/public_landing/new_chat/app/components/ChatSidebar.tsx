import { Search } from 'lucide-react';
import { Avatar } from './ui/avatar';
import { MessengerType } from './MessengerSidebar';
import { messengerThemes } from './messengerThemes';

interface Chat {
  id: string;
  name: string;
  username: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
}

interface ChatSidebarProps {
  chats: Chat[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  messengerType: MessengerType;
}

export function ChatSidebar({ chats, selectedChatId, onSelectChat, messengerType }: ChatSidebarProps) {
  const theme = messengerThemes[messengerType];
  
  return (
    <div className={`w-[340px] border-r border-gray-200 flex flex-col ${
      messengerType === 'telegram' ? 'bg-white' : 
      messengerType === 'whatsapp' ? 'bg-[#f0f2f5]' : 
      messengerType === 'tiktok' ? 'bg-black' : 
      'bg-white'
    }`}>
      {/* Header */}
      <div className={`p-4 border-b ${
        messengerType === 'tiktok' ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <h2 className={`mb-4 ${messengerType === 'tiktok' ? 'text-white' : ''}`}>
          {theme.name} {chats.length > 0 && `(${chats.length})`}
        </h2>
        
        {/* Search */}
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 size-4 ${
            messengerType === 'tiktok' ? 'text-gray-500' : 'text-gray-400'
          }`} />
          <input
            type="text"
            placeholder="Поиск"
            className={`w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none transition-all ${
              messengerType === 'telegram' ? 'bg-gray-100 focus:ring-2 focus:ring-blue-500' :
              messengerType === 'whatsapp' ? 'bg-white focus:ring-2 focus:ring-green-500' :
              messengerType === 'tiktok' ? 'bg-gray-900 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-pink-500' :
              'bg-gray-100 focus:ring-2 focus:ring-purple-500'
            }`}
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`w-full p-4 flex items-center gap-3 transition-colors ${
              messengerType === 'telegram' && selectedChatId === chat.id ? 'bg-blue-50' :
              messengerType === 'whatsapp' && selectedChatId === chat.id ? 'bg-[#f5f6f6]' :
              messengerType === 'tiktok' && selectedChatId === chat.id ? 'bg-gray-900' :
              selectedChatId === chat.id ? 'bg-gray-100' : ''
            } ${
              messengerType === 'tiktok' ? 'hover:bg-gray-900' :
              messengerType === 'whatsapp' ? 'hover:bg-[#f5f6f6]' :
              'hover:bg-gray-50'
            }`}
          >
            <div className="relative">
              <div className={`size-14 rounded-full bg-gradient-to-br ${theme.gradient} flex items-center justify-center`}>
                <span className="text-white font-semibold text-xl">
                  {chat.name[0]}
                </span>
              </div>
              {chat.unread > 0 && (
                <div className={`absolute -top-1 -right-1 size-5 rounded-full flex items-center justify-center ${
                  messengerType === 'telegram' ? 'bg-blue-500' :
                  messengerType === 'whatsapp' ? 'bg-[#25D366]' :
                  messengerType === 'tiktok' ? 'bg-pink-500' :
                  'bg-red-500'
                }`}>
                  <span className="text-white text-xs">{chat.unread}</span>
                </div>
              )}
            </div>
            
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className={`font-semibold text-sm ${
                  messengerType === 'tiktok' ? 'text-white' : ''
                }`}>{chat.name}</span>
                <span className={`text-xs ${
                  messengerType === 'tiktok' ? 'text-gray-400' : 'text-gray-500'
                }`}>{chat.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <p className={`text-xs ${
                  messengerType === 'tiktok' ? 'text-gray-400' : 'text-gray-600'
                }`}>{chat.username}</p>
              </div>
              <p className={`text-sm truncate ${
                messengerType === 'tiktok' ? 'text-gray-500' : 'text-gray-500'
              }`}>{chat.lastMessage}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}