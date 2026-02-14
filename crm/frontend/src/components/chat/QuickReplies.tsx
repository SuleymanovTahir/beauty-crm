import { Zap, Heart, Check, Phone, ThumbsUp, MessageSquare, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface QuickRepliesProps {
  onSelect: (text: string) => void;
}

export default function QuickReplies({ onSelect }: QuickRepliesProps) {
  const { t } = useTranslation('common');

  const QUICK_REPLIES = [
    { id: '1', text: t('quick_reply_thanks'), icon: <Heart className="w-4 h-4 text-pink-500" /> },
    { id: '2', text: t('quick_reply_booked'), icon: <Check className="w-4 h-4 text-green-500" /> },
    { id: '3', text: t('quick_reply_call_later'), icon: <Phone className="w-4 h-4 text-blue-500" /> },
    { id: '4', text: t('quick_reply_yes'), icon: <ThumbsUp className="w-4 h-4 text-blue-600" /> },
    { id: '5', text: t('quick_reply_no'), icon: <MessageSquare className="w-4 h-4 text-gray-500" /> },
    { id: '6', text: t('quick_reply_clarify'), icon: <Clock className="w-4 h-4 text-yellow-500" /> }
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-pink-600 rounded-lg flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <p className="font-semibold text-gray-700 text-sm">{t('quick_replies_title')}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {QUICK_REPLIES.map((reply) => (
          <button
            key={reply.id}
            onClick={() => onSelect(reply.text)}
            className="bg-white border-2 border-blue-200 hover:border-blue-400 rounded-xl p-2.5 text-left transition-all hover:shadow-md group"
          >
            <div className="flex items-center gap-2">
              <span className="group-hover:scale-110 transition-transform">{reply.icon}</span>
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 truncate">
                {reply.text}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
