import { useState } from 'react';
import { Search, MoreVertical, Phone, Video, Info, Flag, Bell, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MessengerType } from './MessengerSidebar';
import { messengerThemes } from './messengerThemes';

interface ChatHeaderProps {
  name: string;
  username: string;
  onInfo: () => void;
  onMute: () => void;
  onReport: () => void;
  onAIClick: () => void;
  messengerType: MessengerType;
}

export function ChatHeader({ name, username, onInfo, onMute, onReport, onAIClick, messengerType }: ChatHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const theme = messengerThemes[messengerType];

  return (
    <div className={`h-16 border-b flex items-center justify-between px-4 relative ${
      messengerType === 'telegram' ? 'bg-white border-gray-200' :
      messengerType === 'whatsapp' ? 'bg-[#f0f2f5] border-gray-300' :
      messengerType === 'tiktok' ? 'bg-black border-gray-800' :
      'bg-white border-gray-200'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`size-10 rounded-full bg-gradient-to-br ${theme.gradient} flex items-center justify-center`}>
          <span className="text-white font-semibold">{name[0]}</span>
        </div>
        <div>
          <h3 className={`font-semibold text-sm ${
            messengerType === 'tiktok' ? 'text-white' : ''
          }`}>{name}</h3>
          <p className={`text-xs ${
            messengerType === 'tiktok' ? 'text-gray-400' : 'text-gray-500'
          }`}>{username}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* AI Assistant Button */}
        <button 
          onClick={onAIClick}
          className={`relative px-4 py-2 rounded-full bg-gradient-to-r ${theme.buttonGradient} hover:${theme.hoverButtonGradient} transition-all group overflow-hidden`}
        >
          <div className="absolute inset-0 bg-white/20 group-hover:bg-white/30 transition-colors" />
          <div className="relative flex items-center gap-2">
            <Sparkles className="size-4 text-white" />
            <span className="text-white font-medium text-sm">AI</span>
          </div>
        </button>

        <button className={`p-2 rounded-full transition-colors ${
          messengerType === 'tiktok' ? 'hover:bg-gray-900' : 'hover:bg-gray-100'
        }`}>
          <Phone className={`size-5 ${
            messengerType === 'tiktok' ? 'text-white' : 'text-gray-700'
          }`} />
        </button>
        <button className={`p-2 rounded-full transition-colors ${
          messengerType === 'tiktok' ? 'hover:bg-gray-900' : 'hover:bg-gray-100'
        }`}>
          <Video className={`size-5 ${
            messengerType === 'tiktok' ? 'text-white' : 'text-gray-700'
          }`} />
        </button>
        <button 
          className={`p-2 rounded-full transition-colors ${
            messengerType === 'tiktok' ? 'hover:bg-gray-900' : 'hover:bg-gray-100'
          }`}
          onClick={() => setShowMenu(!showMenu)}
        >
          <MoreVertical className={`size-5 ${
            messengerType === 'tiktok' ? 'text-white' : 'text-gray-700'
          }`} />
        </button>
      </div>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className={`absolute top-14 right-4 w-64 rounded-xl shadow-xl border overflow-hidden z-20 ${
                messengerType === 'tiktok' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
              }`}
            >
              <button
                onClick={() => {
                  onInfo();
                  setShowMenu(false);
                }}
                className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-left ${
                  messengerType === 'tiktok' ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                }`}
              >
                <Info className={`size-5 ${
                  messengerType === 'telegram' ? 'text-blue-600' :
                  messengerType === 'whatsapp' ? 'text-green-600' :
                  messengerType === 'tiktok' ? 'text-pink-500' :
                  'text-blue-600'
                }`} />
                <span className={`text-sm ${
                  messengerType === 'tiktok' ? 'text-white' : ''
                }`}>Информация</span>
              </button>
              
              <button
                onClick={() => {
                  onMute();
                  setShowMenu(false);
                }}
                className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-left border-t ${
                  messengerType === 'tiktok' ? 'hover:bg-gray-800 border-gray-800' : 'hover:bg-gray-50 border-gray-100'
                }`}
              >
                <Bell className={`size-5 ${
                  messengerType === 'telegram' ? 'text-blue-600' :
                  messengerType === 'whatsapp' ? 'text-green-600' :
                  messengerType === 'tiktok' ? 'text-cyan-400' :
                  'text-purple-600'
                }`} />
                <span className={`text-sm ${
                  messengerType === 'tiktok' ? 'text-white' : ''
                }`}>Отключить уведомления</span>
              </button>

              <button
                onClick={() => {
                  onReport();
                  setShowMenu(false);
                }}
                className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-left border-t ${
                  messengerType === 'tiktok' ? 'hover:bg-gray-800 border-gray-800' : 'hover:bg-gray-50 border-gray-100'
                }`}
              >
                <Flag className="size-5 text-red-600" />
                <span className="text-sm text-red-600">Пожаловаться</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}