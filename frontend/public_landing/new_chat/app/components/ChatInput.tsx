import { useState } from 'react';
import { Paperclip, Send, Image as ImageIcon, Mic, Smile } from 'lucide-react';
import { motion } from 'motion/react';
import { MessengerType } from './MessengerSidebar';
import { messengerThemes } from './messengerThemes';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  messengerType: MessengerType;
}

export function ChatInput({ onSendMessage, messengerType }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const theme = messengerThemes[messengerType];

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`p-4 border-t ${
      messengerType === 'telegram' ? 'bg-white border-gray-200' :
      messengerType === 'whatsapp' ? 'bg-[#f0f2f5] border-gray-300' :
      messengerType === 'tiktok' ? 'bg-black border-gray-800' :
      'bg-white border-gray-200'
    }`}>
      <div className="flex items-end gap-2">
        {/* Attachments */}
        <div className="flex gap-1 pb-2">
          <button className={`p-2 rounded-full transition-colors ${
            messengerType === 'tiktok' ? 'hover:bg-gray-900' : 'hover:bg-gray-100'
          }`}>
            <ImageIcon className={`size-5 ${
              messengerType === 'tiktok' ? 'text-white' : 'text-gray-600'
            }`} />
          </button>
          <button className={`p-2 rounded-full transition-colors ${
            messengerType === 'tiktok' ? 'hover:bg-gray-900' : 'hover:bg-gray-100'
          }`}>
            <Paperclip className={`size-5 ${
              messengerType === 'tiktok' ? 'text-white' : 'text-gray-600'
            }`} />
          </button>
        </div>

        {/* Message Input */}
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Сообщение..."
            className={`w-full px-4 py-3 pr-12 rounded-3xl resize-none focus:outline-none focus:ring-2 transition-all max-h-32 ${
              messengerType === 'telegram' ? 'bg-gray-100 focus:ring-blue-500' :
              messengerType === 'whatsapp' ? 'bg-white focus:ring-green-500' :
              messengerType === 'tiktok' ? 'bg-gray-900 text-white placeholder:text-gray-500 focus:ring-pink-500' :
              'bg-gray-100 focus:ring-purple-500'
            }`}
            rows={1}
            style={{
              minHeight: '44px',
              height: 'auto',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 128) + 'px';
            }}
          />
          <button className={`absolute right-3 bottom-3 p-1.5 rounded-full transition-colors ${
            messengerType === 'tiktok' ? 'hover:bg-gray-800' : 'hover:bg-gray-200'
          }`}>
            <Smile className={`size-5 ${
              messengerType === 'tiktok' ? 'text-white' : 'text-gray-600'
            }`} />
          </button>
        </div>

        {/* Send/Voice Button */}
        {message.trim() ? (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={handleSend}
            className={`size-11 rounded-full bg-gradient-to-br ${theme.buttonGradient} flex items-center justify-center hover:shadow-lg transition-all mb-1`}
          >
            <Send className="size-5 text-white fill-white" />
          </motion.button>
        ) : (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`size-11 rounded-full flex items-center justify-center transition-colors mb-1 ${
              messengerType === 'tiktok' ? 'hover:bg-gray-900' : 'hover:bg-gray-100'
            }`}
          >
            <Mic className={`size-5 ${
              messengerType === 'tiktok' ? 'text-white' : 'text-gray-600'
            }`} />
          </motion.button>
        )}
      </div>
    </div>
  );
}