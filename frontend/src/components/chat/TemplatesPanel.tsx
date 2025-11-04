import React, { useState } from 'react';
import { FileText, X, Search, Clock, Star } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';

interface Template {
  id: string;
  title: string;
  content: string;
  category?: string;
  usageCount?: number;
  date?: string;
  time?: string;
}

interface TemplatesPanelProps {
  onSelect: (content: string) => void;
  onClose: () => void;
}

const MOCK_TEMPLATES: Template[] = [
  {
    id: '1',
    title: 'Приветствие',
    content: 'Здравствуйте! Спасибо, что обратились к нам. Чем могу помочь?',
    category: 'greeting',
    usageCount: 145
  },
  {
    id: '2',
    title: 'Подтверждение записи',
    content: 'Ваша запись подтверждена на {{date}} в {{time}}. Ждем вас!',
    category: 'booking',
    usageCount: 98
  },
  {
    id: '3',
    title: 'Напоминание',
    content: 'Напоминаем о записи завтра в {{time}}. Будем рады видеть вас!',
    category: 'reminder',
    usageCount: 87
  },
  {
    id: '4',
    title: 'Благодарность',
    content: 'Спасибо за визит! Будем рады видеть вас снова 💖',
    category: 'thanks',
    usageCount: 156
  },
  {
    id: '5',
    title: 'Информация о услугах',
    content: 'У нас есть следующие услуги:\n• Маникюр\n• Педикюр\n• Наращивание\n\nЧто вас интересует?',
    category: 'info',
    usageCount: 73
  }
];

export default function TemplatesPanel({ onSelect, onClose }: TemplatesPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [templates] = useState<Template[]>(MOCK_TEMPLATES);

  const filteredTemplates = templates.filter(template =>
    template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      greeting: 'from-blue-100 to-cyan-100 border-blue-300 text-blue-700',
      booking: 'from-purple-100 to-pink-100 border-purple-300 text-purple-700',
      reminder: 'from-amber-100 to-yellow-100 border-amber-300 text-amber-700',
      thanks: 'from-pink-100 to-rose-100 border-pink-300 text-pink-700',
      info: 'from-green-100 to-emerald-100 border-green-300 text-green-700'
    };
    return colors[category || ''] || 'from-gray-100 to-gray-200 border-gray-300 text-gray-700';
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'greeting':
        return '👋';
      case 'booking':
        return '📅';
      case 'reminder':
        return '⏰';
      case 'thanks':
        return '💖';
      case 'info':
        return 'ℹ️';
      default:
        return '📝';
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 via-white to-pink-50 rounded-2xl border-2 border-purple-300 shadow-xl overflow-hidden animate-in slide-in-from-top duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-bold text-white text-lg">Шаблоны сообщений</h3>
        </div>
        <button
          onClick={onClose}
          className="h-9 w-9 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b-2 border-purple-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Поиск шаблонов..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-2 border-purple-200 focus:border-purple-400 rounded-xl bg-white"
          />
        </div>
      </div>

      {/* Templates List */}
      <ScrollArea className="h-[400px]">
        <div className="p-4 space-y-3">
          {filteredTemplates.length > 0 ? (
            filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => onSelect(template.content)}
                className={`w-full text-left p-4 rounded-xl border-2 bg-gradient-to-r ${getCategoryColor(
                  template.category
                )} hover:shadow-lg transition-all duration-200 group`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getCategoryIcon(template.category)}</span>
                    <h4 className="font-bold text-sm group-hover:scale-105 transition-transform">
                      {template.title}
                    </h4>
                    {template.date && (
                      <span className="text-xs opacity-70">📅 {template.date} {template.time}</span>
                    )}
                  </div>
                  {template.usageCount !== undefined && (
                    <div className="flex items-center gap-1 text-xs opacity-70">
                      <Clock className="w-3 h-3" />
                      {template.usageCount}
                    </div>
                  )}
                </div>
                <p className="text-xs opacity-80 line-clamp-2 leading-relaxed">
                  {template.content}
                </p>
                <div className="mt-2 pt-2 border-t border-current opacity-30">
                  <p className="text-xs font-semibold">Нажмите для вставки</p>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">Шаблоны не найдены</p>
              <p className="text-sm text-gray-400 mt-1">Попробуйте другой поисковый запрос</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 bg-purple-100/30 border-t-2 border-purple-200">
        <div className="bg-white/60 backdrop-blur rounded-xl p-3 border border-purple-200">
          <p className="text-xs text-purple-800 flex items-center gap-1.5">
            <Star className="w-4 h-4 flex-shrink-0 text-purple-600" />
            Совет: используйте {{ date }} и {{ time }} для подстановки данных
          </p>
        </div>
      </div>
    </div>
  );
}
