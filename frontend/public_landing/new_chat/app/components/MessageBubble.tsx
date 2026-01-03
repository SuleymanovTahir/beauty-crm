import { useState } from 'react';
import { Reply, Copy, CornerUpRight, MoreVertical, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MessengerType } from './MessengerSidebar';
import { messengerThemes } from './messengerThemes';

interface Message {
  id: string;
  text: string;
  time: string;
  isOwn: boolean;
  liked?: boolean;
}

interface MessageBubbleProps {
  message: Message;
  onReply: (messageId: string) => void;
  onCopy: (messageId: string) => void;
  onForward: (messageId: string) => void;
  onLike: (messageId: string) => void;
  messengerType: MessengerType;
}

export function MessageBubble({ message, onReply, onCopy, onForward, onLike, messengerType }: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const theme = messengerThemes[messengerType];

  const handleLongPress = () => {
    setShowQuickActions(true);
  };

  return (
    <div
      className={`flex items-end gap-2 mb-2 group ${message.isOwn ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowQuickActions(false);
      }}
    >
      {/* Quick Actions (Instagram style) */}
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: 0.2 }}
            className={`absolute ${message.isOwn ? 'right-20' : 'left-20'} flex gap-2 rounded-full shadow-lg px-3 py-2 border z-10 ${
              messengerType === 'tiktok' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            <button
              onClick={() => {
                onReply(message.id);
                setShowQuickActions(false);
              }}
              className={`p-2 rounded-full transition-colors ${
                messengerType === 'tiktok' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              }`}
              title="Ответить"
            >
              <Reply className={`size-5 ${
                messengerType === 'tiktok' ? 'text-white' : 'text-gray-700'
              }`} />
            </button>
            <button
              onClick={() => {
                onCopy(message.id);
                setShowQuickActions(false);
              }}
              className={`p-2 rounded-full transition-colors ${
                messengerType === 'tiktok' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              }`}
              title="Копировать"
            >
              <Copy className={`size-5 ${
                messengerType === 'tiktok' ? 'text-white' : 'text-gray-700'
              }`} />
            </button>
            <button
              onClick={() => {
                onForward(message.id);
                setShowQuickActions(false);
              }}
              className={`p-2 rounded-full transition-colors ${
                messengerType === 'tiktok' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              }`}
              title="Переслать"
            >
              <CornerUpRight className={`size-5 ${
                messengerType === 'tiktok' ? 'text-white' : 'text-gray-700'
              }`} />
            </button>
            <button
              onClick={() => {
                onLike(message.id);
                setShowQuickActions(false);
              }}
              className={`p-2 rounded-full transition-colors ${
                messengerType === 'tiktok' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              }`}
              title="Нравится"
            >
              <Heart className={`size-5 ${message.liked ? 'fill-red-500 text-red-500' : messengerType === 'tiktok' ? 'text-white' : 'text-gray-700'}`} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover Actions */}
      <AnimatePresence>
        {showActions && !showQuickActions && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            onClick={handleLongPress}
            className={`p-1.5 rounded-full transition-colors ${
              messengerType === 'tiktok' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            }`}
          >
            <MoreVertical className={`size-4 ${
              messengerType === 'tiktok' ? 'text-gray-400' : 'text-gray-600'
            }`} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Message Bubble */}
      <motion.div
        layout
        className="relative max-w-[65%]"
        onDoubleClick={() => onLike(message.id)}
      >
        <div
          className={`px-4 py-2.5 rounded-3xl ${
            message.isOwn
              ? messengerType === 'telegram' ? 'bg-[#0088cc] text-white' :
                messengerType === 'whatsapp' ? 'bg-[#DCF8C6] text-gray-900' :
                messengerType === 'tiktok' ? 'bg-gradient-to-r from-pink-500 to-cyan-400 text-white' :
                theme.ownMessageBg + ' text-white'
              : messengerType === 'telegram' ? 'bg-white text-gray-900' :
                messengerType === 'whatsapp' ? 'bg-white text-gray-900' :
                messengerType === 'tiktok' ? 'bg-gray-800 text-white' :
                'bg-gray-100 text-gray-900'
          }`}
        >
          <p className="text-sm leading-relaxed">{message.text}</p>
        </div>
        
        {/* Time */}
        <div className={`mt-1 px-2 ${message.isOwn ? 'text-right' : 'text-left'}`}>
          <span className={`text-xs ${
            messengerType === 'tiktok' ? 'text-gray-500' : 'text-gray-500'
          }`}>{message.time}</span>
        </div>

        {/* Like indicator */}
        {message.liked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`absolute -bottom-2 ${message.isOwn ? '-left-2' : '-right-2'} size-6 rounded-full flex items-center justify-center shadow-md ${
              messengerType === 'tiktok' ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
            }`}
          >
            <Heart className="size-3.5 fill-red-500 text-red-500" />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}