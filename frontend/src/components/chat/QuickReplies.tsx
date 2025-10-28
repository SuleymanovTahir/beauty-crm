import React from 'react';
import { Zap } from 'lucide-react';

interface QuickRepliesProps {
  onSelect: (text: string) => void;
}

const defaultReplies = [
  '👋 Здравствуйте!',
  '📅 Когда вам удобно?',
  '✅ Отлично!',
  '🎉 Спасибо за обращение!',
  '⏰ Свяжусь с вами позже',
  '💎 Посмотрите наши услуги',
  '📞 Могу я вам перезвонить?',
  '🌟 Рады вас видеть!'
];

export default function QuickReplies({ onSelect }: QuickRepliesProps) {
  return (
    <div className="border-t bg-gradient-to-r from-blue-50 to-purple-50 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-4 h-4 text-purple-600" />
        <p className="text-xs font-semibold text-gray-700">Быстрые ответы</p>
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-transparent">
        {defaultReplies.map((reply, index) => (
          <button
            key={index}
            onClick={() => onSelect(reply)}
            className="px-3 py-1.5 bg-white hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100 rounded-full text-sm whitespace-nowrap transition-all hover:scale-105 border border-purple-200 hover:border-purple-300 shadow-sm"
          >
            {reply}
          </button>
        ))}
      </div>
    </div>
  );
}