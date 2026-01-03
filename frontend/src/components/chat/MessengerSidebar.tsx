import React from 'react';
import { Instagram, Send, MessageCircle, Music } from 'lucide-react';

export type MessengerType = 'instagram' | 'telegram' | 'whatsapp' | 'tiktok';

interface MessengerSidebarProps {
    selectedMessenger: MessengerType;
    onSelectMessenger: (messenger: MessengerType) => void;
}

export default function MessengerSidebar({ selectedMessenger, onSelectMessenger }: MessengerSidebarProps) {
    const messengers = [
        {
            id: 'instagram' as MessengerType,
            icon: Instagram,
            name: 'Instagram',
            bgColor: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500',
            hoverBg: 'hover:from-purple-600 hover:via-pink-600 hover:to-orange-600',
        },
        {
            id: 'telegram' as MessengerType,
            icon: Send,
            name: 'Telegram',
            bgColor: 'bg-[#0088cc]',
            hoverBg: 'hover:bg-[#006ba1]',
        },
        {
            id: 'whatsapp' as MessengerType,
            icon: MessageCircle,
            name: 'WhatsApp',
            bgColor: 'bg-[#25D366]',
            hoverBg: 'hover:bg-[#1da851]',
        },
        {
            id: 'tiktok' as MessengerType,
            icon: Music,
            name: 'TikTok',
            bgColor: 'bg-black',
            hoverBg: 'hover:bg-gray-900',
        },
    ];

    return (
        <div className="w-20 bg-gray-900 flex flex-col items-center py-6 gap-6 flex-shrink-0">
            {/* Logo */}
            <div className="size-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-4 shadow-lg">
                <span className="text-white font-bold text-lg">M</span>
            </div>

            {/* Messenger Icons */}
            <div className="flex-1 flex flex-col gap-4">
                {messengers.map((messenger) => {
                    const Icon = messenger.icon;
                    const isSelected = selectedMessenger === messenger.id;

                    return (
                        <div key={messenger.id} className="relative group">
                            <button
                                onClick={() => onSelectMessenger(messenger.id)}
                                className={`
                  size-12 rounded-2xl flex items-center justify-center transition-all relative
                  ${isSelected
                                        ? messenger.bgColor
                                        : 'bg-gray-800 hover:bg-gray-700'
                                    }
                  ${!isSelected && messenger.hoverBg}
                  transform hover:scale-110 active:scale-95
                `}
                            >
                                <Icon
                                    className={`size-6 ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-white'
                                        }`}
                                />

                                {/* Selected Indicator */}
                                {isSelected && (
                                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                                )}
                            </button>

                            {/* Tooltip */}
                            <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                                {messenger.name}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
