// /frontend/src/components/chat/QuickReplies.tsx
import { Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface QuickRepliesProps {
  onSelect: (text: string) => void;
}

export default function QuickReplies({ onSelect }: QuickRepliesProps) {
  const { t } = useTranslation('common');

  const QUICK_REPLIES = [
    { id: '1', text: t('quick_reply_thanks'), icon: '💖' },
    { id: '2', text: t('quick_reply_booked'), icon: '✅' },
    { id: '3', text: t('quick_reply_call_later'), icon: '📞' },
    { id: '4', text: t('quick_reply_yes'), icon: '👍' },
    { id: '5', text: t('quick_reply_no'), icon: '🙏' },
    { id: '6', text: t('quick_reply_clarify'), icon: '⏱️' }
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <p className="font-semibold text-gray-700 text-sm">{t('quick_replies_title')}</p>
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
