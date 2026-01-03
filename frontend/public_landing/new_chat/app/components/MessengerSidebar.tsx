import { Instagram, Send, MessageCircle, Music } from 'lucide-react';
import { motion } from 'motion/react';

export type MessengerType = 'instagram' | 'telegram' | 'whatsapp' | 'tiktok';

interface MessengerSidebarProps {
  selectedMessenger: MessengerType;
  onSelectMessenger: (messenger: MessengerType) => void;
}

export function MessengerSidebar({ selectedMessenger, onSelectMessenger }: MessengerSidebarProps) {
  const messengers = [
    {
      id: 'instagram' as MessengerType,
      icon: Instagram,
      name: 'Instagram',
      gradient: 'from-purple-500 via-pink-500 to-orange-500',
      bgColor: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500',
    },
    {
      id: 'telegram' as MessengerType,
      icon: Send,
      name: 'Telegram',
      gradient: 'from-blue-400 to-blue-600',
      bgColor: 'bg-[#0088cc]',
    },
    {
      id: 'whatsapp' as MessengerType,
      icon: MessageCircle,
      name: 'WhatsApp',
      gradient: 'from-green-400 to-green-600',
      bgColor: 'bg-[#25D366]',
    },
    {
      id: 'tiktok' as MessengerType,
      icon: Music,
      name: 'TikTok',
      gradient: 'from-black via-pink-500 to-cyan-400',
      bgColor: 'bg-black',
    },
  ];

  return (
    <div className="w-20 bg-gray-900 flex flex-col items-center py-6 gap-6">
      {/* Logo */}
      <div className="size-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-4">
        <span className="text-white font-bold text-lg">M</span>
      </div>

      {/* Messenger Icons */}
      <div className="flex-1 flex flex-col gap-4">
        {messengers.map((messenger) => {
          const Icon = messenger.icon;
          const isSelected = selectedMessenger === messenger.id;

          return (
            <div key={messenger.id} className="relative">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelectMessenger(messenger.id)}
                className={`size-12 rounded-2xl flex items-center justify-center transition-all relative group ${
                  isSelected
                    ? messenger.bgColor
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <Icon
                  className={`size-6 ${
                    isSelected ? 'text-white' : 'text-gray-400 group-hover:text-white'
                  }`}
                />
                
                {/* Selected Indicator */}
                {isSelected && (
                  <motion.div
                    layoutId="selected-messenger"
                    className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.button>

              {/* Tooltip */}
              <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
                {messenger.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Settings */}
      <button className="size-12 rounded-2xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors">
        <svg className="size-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  );
}
