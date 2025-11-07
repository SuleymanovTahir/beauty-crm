import { Zap } from 'lucide-react';

interface QuickRepliesProps {
  onSelect: (text: string) => void;
}

const QUICK_REPLIES = [
  { id: '1', text: 'Спасибо!', icon: '💖' },
  { id: '2', text: 'Записал вас', icon: '✅' },
  { id: '3', text: 'Перезвоню позже', icon: '📞' },
  { id: '4', text: 'Да, конечно', icon: '👍' },
  { id: '5', text: 'Нет, к сожалению', icon: '🙏' },
  { id: '6', text: 'Уточню и сообщу', icon: '⏱️' }
];

export default function QuickReplies({ onSelect }: QuickRepliesProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <p className="font-semibold text-gray-700 text-sm">Быстрые ответы</p>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {QUICK_REPLIES.map((reply) => (
          <button
            key={reply.id}
            onClick={() => onSelect(reply.text)}
            className="bg-white border-2 border-purple-200 hover:border-purple-400 rounded-xl p-2.5 text-left transition-all hover:shadow-md group"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg group-hover:scale-110 transition-transform">{reply.icon}</span>
              <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700 truncate">
                {reply.text}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
