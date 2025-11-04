import React, { useState, useEffect } from 'react';
import { FileText, X, Search, Clock, Star, Plus, Trash2, Edit2, Save, Loader } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';
import { api } from '../../services/api';
import { toast } from 'sonner';

interface Template {
  id: string;
  title: string;
  content: string;
  category?: string;
  usageCount?: number;
}

interface TemplatesPanelProps {
  onSelect: (content: string) => void;
  onClose: () => void;
}

export default function TemplatesPanel({ onSelect, onClose }: TemplatesPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await api.getMessageTemplates();
      setTemplates(data.templates || []);
    } catch (err) {
      toast.error('Ошибка загрузки шаблонов');
      console.error('Load templates error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('Заполните название и текст');
      return;
    }

    try {
      await api.createMessageTemplate({
        title: newTitle,
        content: newContent,
        category: newCategory || 'general'
      });

      toast.success('Шаблон создан');
      setNewTitle('');
      setNewContent('');
      setNewCategory('');
      setIsCreating(false);
      loadTemplates();
    } catch (err) {
      toast.error('Ошибка создания шаблона');
      console.error('Create template error:', err);
    }
  };

  const handleUpdate = async (id: string, title?: string, content?: string) => {
    try {
      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;

      await api.updateMessageTemplate(parseInt(id), updateData);
      toast.success('Шаблон обновлен');
      setEditingId(null);
      loadTemplates();
    } catch (err) {
      toast.error('Ошибка обновления');
      console.error('Update template error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот шаблон?')) return;

    try {
      await api.deleteMessageTemplate(parseInt(id));
      toast.success('Шаблон удален');
      loadTemplates();
    } catch (err) {
      toast.error('Ошибка удаления');
      console.error('Delete template error:', err);
    }
  };

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
      info: 'from-green-100 to-emerald-100 border-green-300 text-green-700',
      general: 'from-gray-100 to-gray-200 border-gray-300 text-gray-700'
    };
    return colors[category || 'general'] || 'from-gray-100 to-gray-200 border-gray-300 text-gray-700';
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
      <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 text-purple-600 animate-spin" />
            </div>
          ) : (
            <>
              {/* Кнопка создания */}
              {!isCreating && (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full p-4 mb-3 rounded-xl border-2 border-dashed border-purple-300 hover:border-purple-500 hover:bg-purple-50 transition-all flex items-center justify-center gap-2 text-purple-700 font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  Создать шаблон
                </button>
              )}

              {/* Форма создания */}
              {isCreating && (
                <div className="mb-3 p-4 bg-white rounded-xl border-2 border-purple-300">
                  <Input
                    placeholder="Название шаблона"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="mb-2"
                  />
                  <Textarea
                    placeholder="Текст шаблона"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="mb-2"
                    rows={3}
                  />
                  <Input
                    placeholder="Категория (опционально)"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="mb-3"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleCreate} size="sm" className="flex-1">
                      <Save className="w-4 h-4 mr-2" />
                      Сохранить
                    </Button>
                    <Button
                      onClick={() => {
                        setIsCreating(false);
                        setNewTitle('');
                        setNewContent('');
                        setNewCategory('');
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              )}

              {/* Список шаблонов */}
              {filteredTemplates.length > 0 ? (
                filteredTemplates.map((template) => (
                  <div key={template.id} className="mb-3">
                    {editingId === template.id ? (
                      <div className="p-4 bg-white rounded-xl border-2 border-purple-300">
                        <Input
                          defaultValue={template.title}
                          onBlur={(e) => {
                            if (e.target.value !== template.title) {
                              handleUpdate(template.id, e.target.value, undefined);
                            }
                          }}
                          className="mb-2"
                        />
                        <Textarea
                          defaultValue={template.content}
                          onBlur={(e) => {
                            if (e.target.value !== template.content) {
                              handleUpdate(template.id, undefined, e.target.value);
                            }
                          }}
                          rows={3}
                        />
                        <Button
                          onClick={() => setEditingId(null)}
                          size="sm"
                          variant="outline"
                          className="mt-2"
                        >
                          Готово
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onSelect(template.content)}
                        className={`w-full text-left p-4 rounded-xl border-2 bg-gradient-to-r ${getCategoryColor(
                          template.category
                        )} hover:shadow-lg transition-all duration-200 group relative`}
                      >
                        {/* Кнопки управления */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(template.id);
                            }}
                            className="w-7 h-7 bg-white rounded-lg flex items-center justify-center hover:bg-blue-50"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(template.id);
                            }}
                            className="w-7 h-7 bg-white rounded-lg flex items-center justify-center hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          </button>
                        </div>

                        <div className="flex items-start justify-between mb-2 pr-16">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{getCategoryIcon(template.category)}</span>
                            <h4 className="font-bold text-sm group-hover:scale-105 transition-transform">
                              {template.title}
                            </h4>
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
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">Шаблоны не найдены</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {searchTerm ? 'Попробуйте другой поисковый запрос' : 'Создайте свой первый шаблон'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-purple-100/30 border-t-2 border-purple-200">
        <div className="bg-white/60 backdrop-blur rounded-xl p-3 border border-purple-200">
          <p className="text-xs text-purple-800 flex items-center gap-1.5">
            <Star className="w-4 h-4 flex-shrink-0 text-purple-600" />
            Совет: используйте {`{{ date }}`} и {`{{ time }}`} для подстановки данных
          </p>
        </div>
      </div>
    </div>
  );
}