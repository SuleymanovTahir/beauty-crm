import React, { useState } from 'react';
import { api } from '../../services/api';
import { toast } from 'sonner';

interface MessageReactionsProps {
  messageId: number;
  initialReactions?: { [emoji: string]: number };
  onReactionUpdate?: (reactions: { [emoji: string]: number }) => void;
}

export default function MessageReactions({ 
  messageId, 
  initialReactions = {},
  onReactionUpdate 
}: MessageReactionsProps) {
  const [reactions, setReactions] = useState(initialReactions);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const emojis = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '👏'];
  
  const handleReact = async (emoji: string) => {
    try {
      setLoading(true);
      
      const result = await api.reactToMessage(messageId, emoji);
      
      if (result.success) {
        setReactions(result.reactions);
        onReactionUpdate?.(result.reactions);
        setShowPicker(false);
      }
    } catch (err) {
      toast.error('Ошибка добавления реакции');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="relative inline-block">
      <div className="flex items-center gap-1 mt-1">
        {Object.entries(reactions).map(([emoji, count]) => (
          <button
            key={emoji}
            onClick={() => handleReact(emoji)}
            disabled={loading}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs transition-all hover:scale-110 disabled:opacity-50"
            title={`${count} ${count === 1 ? 'реакция' : 'реакций'}`}
          >
            <span className="text-sm">{emoji}</span>
            {count > 1 && <span className="ml-1 text-gray-600">{count}</span>}
          </button>
        ))}
        
        <button
          onClick={() => setShowPicker(!showPicker)}
          disabled={loading}
          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs transition-all hover:scale-110 disabled:opacity-50"
          title="Добавить реакцию"
        >
          <span className="text-sm">➕</span>
        </button>
      </div>
      
      {showPicker && (
        <div className="absolute bottom-full left-0 mb-2 bg-white shadow-lg rounded-xl p-2 flex gap-1 z-50 border border-gray-200 animate-in fade-in slide-in-from-bottom-2">
          {emojis.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              disabled={loading}
              className="text-2xl hover:scale-125 transition-transform p-1 rounded hover:bg-gray-100 disabled:opacity-50"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}