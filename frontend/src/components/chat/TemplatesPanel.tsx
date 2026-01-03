// /frontend/src/components/chat/TemplatesPanel.tsx
import { useState, useEffect } from 'react';
import { FileText, X, Search, Clock, Plus, Trash2, Edit2, Save, Loader, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('components');
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
      toast.error(t('error_loading_templates'));
      console.error('Load templates error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error(t('fill_name_and_text'));
      return;
    }

    try {
      await api.createMessageTemplate({
        title: newTitle,
        content: newContent,
        category: newCategory || 'general'
      });

      toast.success(t('template_created'));
      setNewTitle('');
      setNewContent('');
      setNewCategory('');
      setIsCreating(false);
      loadTemplates();
    } catch (err) {
      toast.error(t('error_creating_template'));
      console.error('Create template error:', err);
    }
  };

  const handleUpdate = async (id: string, updateData: { title?: string; content?: string }) => {
    try {
      await api.updateMessageTemplate(parseInt(id), updateData);
      toast.success(t('template_updated'));
      setEditingId(null);
      loadTemplates();
    } catch (err) {
      toast.error(t('error_updating_template'));
      console.error('Update template error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('delete_template_confirm'))) return;

    try {
      await api.deleteMessageTemplate(parseInt(id));
      toast.success(t('template_deleted'));
      loadTemplates();
    } catch (err) {
      toast.error(t('error_deleting_template'));
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
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="h-9 w-9 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors text-white"
            title="Назад"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center" title="Шаблоны ответов">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-bold text-white text-lg">Шаблоны</h3>
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
            placeholder={t('search_templates') || 'Поиск шаблонов...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-2 border-purple-200 focus:border-purple-400 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 font-medium"
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
                  {t('create_template') || 'Создать шаблон'}
                </button>
              )}

              {/* Форма создания */}
              {isCreating && (
                <div className="mb-3 p-4 bg-white rounded-xl border-2 border-purple-300">
                  <Input
                    placeholder={t('template_name') || 'Название шаблона'}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="mb-2 text-gray-900 border-purple-200 placeholder:text-gray-500"
                  />
                  <Textarea
                    placeholder={t('template_text')}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="mb-2 text-gray-900 border-purple-200 placeholder:text-gray-500"
                    rows={3}
                  />
                  <Input
                    placeholder={t('category') || 'Категория'}
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="mb-3 text-gray-900 border-purple-200 placeholder:text-gray-500"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleCreate} size="sm" className="flex-1">
                      <Save className="w-4 h-4 mr-2" />
                      {t('save')}
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
                      {t('cancel')}
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
                          id={`title-${template.id}`}
                          defaultValue={template.title}
                          className="mb-2 text-gray-900 border-purple-200 placeholder:text-gray-500"
                        />
                        <Textarea
                          id={`content-${template.id}`}
                          defaultValue={template.content}
                          rows={3}
                          className="mb-2 text-gray-900 border-purple-200 placeholder:text-gray-500"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              const titleInput = document.getElementById(`title-${template.id}`) as HTMLInputElement;
                              const contentInput = document.getElementById(`content-${template.id}`) as HTMLTextAreaElement;

                              const updateData: any = {};
                              if (titleInput && titleInput.value !== template.title) {
                                updateData.title = titleInput.value;
                              }
                              if (contentInput && contentInput.value !== template.content) {
                                updateData.content = contentInput.value;
                              }

                              if (Object.keys(updateData).length > 0) {
                                handleUpdate(template.id, updateData);
                              } else {
                                setEditingId(null);
                              }
                            }}
                            size="sm"
                            className="flex-1"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {t('save')}
                          </Button>
                          <Button
                            onClick={() => setEditingId(null)}
                            size="sm"
                            variant="outline"
                          >
                            {t('cancel')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`relative w-full text-left p-4 rounded-xl border-2 bg-gradient-to-r ${getCategoryColor(
                          template.category
                        )} hover:shadow-lg transition-all duration-200 group`}
                      >
                        {/* Кнопки управления - ВНУТРИ карточки */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(template.id);
                            }}
                            className="w-5 h-5 bg-white rounded-lg flex items-center justify-center hover:bg-blue-50 shadow-md"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(template.id);
                            }}
                            className="w-5 h-5 bg-white rounded-lg flex items-center justify-center hover:bg-red-50 shadow-md"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          </button>
                        </div>

                        {/* Контент карточки - клик по любой части вставляет шаблон */}
                        <div
                          onClick={() => onSelect(template.content)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-start justify-between mb-2 pr-16">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{getCategoryIcon(template.category)}</span>
                              <h4 className="font-bold text-sm hover:scale-105 transition-transform">
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
                            <p className="text-xs font-semibold">{t('click_to_insert')}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">{t('templates_not_found')}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {searchTerm ? t('try_another_search') : t('create_first_template')}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}