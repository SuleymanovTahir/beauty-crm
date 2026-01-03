import { MessengerType } from './MessengerSidebar';

export const messengerThemes = {
  instagram: {
    name: 'Instagram',
    gradient: 'from-purple-500 via-pink-500 to-orange-500',
    buttonGradient: 'from-purple-500 to-pink-600',
    hoverButtonGradient: 'from-purple-600 to-pink-700',
    ownMessageBg: 'bg-gradient-to-br from-purple-500 to-pink-600',
    otherMessageBg: 'bg-gray-100',
    accentColor: 'purple',
    focusRing: 'focus:ring-purple-500',
  },
  telegram: {
    name: 'Telegram',
    gradient: 'from-blue-400 to-blue-600',
    buttonGradient: 'from-blue-400 to-blue-600',
    hoverButtonGradient: 'from-blue-500 to-blue-700',
    ownMessageBg: 'bg-[#0088cc]',
    otherMessageBg: 'bg-white',
    accentColor: 'blue',
    focusRing: 'focus:ring-blue-500',
  },
  whatsapp: {
    name: 'WhatsApp',
    gradient: 'from-green-400 to-green-600',
    buttonGradient: 'from-green-400 to-green-600',
    hoverButtonGradient: 'from-green-500 to-green-700',
    ownMessageBg: 'bg-[#DCF8C6]',
    otherMessageBg: 'bg-white',
    accentColor: 'green',
    focusRing: 'focus:ring-green-500',
  },
  tiktok: {
    name: 'TikTok',
    gradient: 'from-black via-pink-500 to-cyan-400',
    buttonGradient: 'from-pink-500 to-cyan-400',
    hoverButtonGradient: 'from-pink-600 to-cyan-500',
    ownMessageBg: 'bg-gradient-to-r from-pink-500 to-cyan-400',
    otherMessageBg: 'bg-gray-800',
    accentColor: 'pink',
    focusRing: 'focus:ring-pink-500',
  },
};

export type MessengerTheme = typeof messengerThemes[MessengerType];
