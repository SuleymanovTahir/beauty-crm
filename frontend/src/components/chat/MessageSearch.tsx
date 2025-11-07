import React, { useState, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useTranslation } from 'react-i18next';

interface Message {
  id?: string | number;
  message: string;
  sender: string;
  timestamp: string;
  type?: string;
}

interface MessageSearchProps {
  messages: Message[];
  onJumpToMessage: (index: number) => void;
  onClose: () => void;
}

export default function MessageSearch({ messages, onJumpToMessage, onClose }: MessageSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useTranslation(['components/chat/MessageSearch', 'common']);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [matches, setMatches] = useState<number[]>([]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setMatches([]);
      setCurrentMatch(0);
      return;
    }

    const foundMatches: number[] = [];
    messages.forEach((msg, index) => {
      if (msg.message && msg.message.toLowerCase().includes(searchTerm.toLowerCase())) {  // ✅ ПРОВЕРКА msg.message
        foundMatches.push(index);
      }
    });

    setMatches(foundMatches);
    if (foundMatches.length > 0) {
      setCurrentMatch(0);
      setTimeout(() => onJumpToMessage(foundMatches[0]), 100);  // ✅ ДОБАВЛЕНА ЗАДЕРЖКА
    }
  }, [searchTerm, messages]);

  const handleNext = () => {
    if (matches.length === 0) return;
    const nextIndex = (currentMatch + 1) % matches.length;
    setCurrentMatch(nextIndex);
    setTimeout(() => onJumpToMessage(matches[nextIndex]), 50);  // ✅ ДОБАВЛЕНА ЗАДЕРЖКА
  };
  
  const handlePrevious = () => {
    if (matches.length === 0) return;
    const prevIndex = currentMatch === 0 ? matches.length - 1 : currentMatch - 1;
    setCurrentMatch(prevIndex);
    setTimeout(() => onJumpToMessage(matches[prevIndex]), 50);  // ✅ ДОБАВЛЕНА ЗАДЕРЖКА
  };

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-b-2 border-yellow-300 p-3 shadow-lg animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-600" />
          <Input
            type="text"
            placeholder="Поиск в сообщениях..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 border-2 border-yellow-300 focus:border-yellow-500 bg-white rounded-xl h-10"
            autoFocus
          />
        </div>

        {matches.length > 0 && (
          <div className="flex items-center gap-1 bg-white rounded-xl px-3 py-2 border-2 border-yellow-300">
            <span className="text-sm font-semibold text-yellow-800 whitespace-nowrap">
              {currentMatch + 1} из {matches.length}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button
            onClick={handlePrevious}
            disabled={matches.length === 0}
            size="sm"
            variant="outline"
            className="h-10 w-10 p-0 border-2 border-yellow-300 hover:bg-yellow-100 rounded-xl disabled:opacity-50"
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleNext}
            disabled={matches.length === 0}
            size="sm"
            variant="outline"
            className="h-10 w-10 p-0 border-2 border-yellow-300 hover:bg-yellow-100 rounded-xl disabled:opacity-50"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>

        <button
          onClick={onClose}
          className="h-10 w-10 hover:bg-yellow-100 rounded-xl flex items-center justify-center transition-colors border-2 border-yellow-300"
        >
          <X className="w-5 h-5 text-yellow-700" />
        </button>
      </div>

      {searchTerm && matches.length === 0 && (
        <p className="text-sm text-yellow-700 mt-2 px-1">Ничего не найдено</p>
      )}
    </div>
  );
}
