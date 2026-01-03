import React from 'react';
import { WhatsAppIcon, TelegramIcon, TikTokIcon, InstagramIcon } from '../icons/SocialIcons';

export type MessengerType = 'instagram' | 'telegram' | 'whatsapp' | 'tiktok';

interface MessengerSidebarProps {
    selectedMessenger: MessengerType;
    onSelectMessenger: (messenger: MessengerType) => void;
}

export default function MessengerSidebar({ selectedMessenger, onSelectMessenger }: MessengerSidebarProps) {
    const messengers = [
        {
            id: 'instagram' as MessengerType,
            icon: InstagramIcon,
            name: 'Instagram',
            bgColor: 'bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045]',
            hoverBg: 'hover:opacity-90',
        },
        {
            id: 'whatsapp' as MessengerType,
            icon: WhatsAppIcon,
            name: 'WhatsApp',
            bgColor: 'bg-[#25D366]',
            hoverBg: 'hover:bg-[#1da851]',
        },
        {
            id: 'telegram' as MessengerType,
            icon: TelegramIcon,
            name: 'Telegram',
            bgColor: 'bg-[#0088cc]',
            hoverBg: 'hover:bg-[#006ba1]',
        },
        {
            id: 'tiktok' as MessengerType,
            icon: TikTokIcon,
            name: 'TikTok',
            bgColor: 'bg-black',
            hoverBg: 'hover:bg-gray-900',
        },
    ];

    return (
        <div className="w-10 bg-gray-900 flex flex-col items-center py-6 gap-6 flex-shrink-0 border-r border-white/5">
            {/* Logo */}
            <div className="size-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-4 shadow-lg">
                <span className="text-white font-bold text-base">B</span>
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
                  size-8 rounded-xl flex items-center justify-center transition-all relative
                  ${isSelected
                                        ? messenger.bgColor
                                        : 'bg-gray-800/50 hover:bg-gray-800'
                                    }
                  ${!isSelected && messenger.hoverBg}
                  transform hover:scale-110 active:scale-95 shadow-md
                `}
                            >
                                <Icon
                                    className={`${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-white'
                                        }`}
                                    size={20}
                                    colorful={false}
                                />

                                {/* Selected Indicator */}
                                {isSelected && (
                                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                                )}
                            </button>

                            {/* Tooltip */}
                            <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-gray-700">
                                {messenger.name}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
