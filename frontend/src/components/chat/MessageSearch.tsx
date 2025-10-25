import React, { useState, useEffect } from 'react';
import { FileText, Plus, X, Edit2, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

interface Template {
  id: number;
  name: string;
  content: string;
  category: string;
}

interface MessageTemplatesProps {
  onSelect: (content: string) => void;
}

export default function MessageTemplates({ onSelect }: MessageTemplatesProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    category: 'general'
  });
  
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      toast.error('Заполните все поля');
      return;
    }
    
    try {
      setLoading(true);
      await api.createMessageTemplate(formData);
      toast.success('Шаблон создан');
      setShowCreate(false);
      setFormData({ name: '', content: '', category: 'general' });
      loadTemplates();
    } catch (err) {
      toast.error('Ошибка создания шаблона');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdate = async (id: number) => {
    try {
      setLoading(true);
      await api.updateMessageTemplate(id, formData);
      toast.success('Шаблон обновлен');
      setEditingId(null);
      setFormData({ name: '', content: '', category: 'general' });
      loadTemplates();
    } catch (err) {
      toast.error('Ошибка обновления');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async (id: number) => {
    if (!confirm('Удалить этот шаблон?')) return;
    
    try {
      await api.deleteMessageTemplate(id);
      toast.success('Шаблон удален');
      loadTemplates();
    } catch (err) {
      toast.error('Ошибка удаления');
      console.error(err);
    }
  };
  
  const startEdit = (template: Template) => {
    setEditingId(template.id);
    setFormData({
      name: template.name,
      content: template.content,
      category: template.category
    });
    setShowCreate(false);
  };
  
  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', content: '', category: 'general' });
  };
  
  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, Template[]>);
  
  return (
    <div className="border-t bg-white">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold flex items-center gap-2 text-gray-900">
            <FileText className="w-4 h-4 text-pink-600" />
            Шаблоны сообщений
          </h4>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowCreate(!showCreate);
              setEditingId(null);
              if (!showCreate) {
                setFormData({ name: '', content: '', category: 'general' });
              }
            }}
            className="h-8 w-8 p-0"
          >
            {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
        
        {/* Форма создания/редактирования */}
        {(showCreate || editingId) && (
          <div className="mb-4 p-3 bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg space-y-2 border border-pink-200">
            <Input
              placeholder="Название шаблона"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="bg-white"
            />
            <Textarea
              placeholder="Текст шаблона"
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              className="bg-white min-h-[80px]"
              rows={3}
            />
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full px-3 py-2 border rounded bg-white text-sm"
            >
              <option value="general">Общие</option>
              <option value="greetings">Приветствия</option>
              <option value="booking">Запись</option>
              <option value="info">Информация</option>
              <option value="closing">Завершение</option>
              <option value="followup">Followup</option>
            </select>
            <div className="flex gap-2">
              <Button
                onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white"
                size="sm"
              >
                {editingId ? 'Обновить' : 'Создать'}
              </Button>
              {editingId && (
                <Button
                  onClick={cancelEdit}
                  variant="outline"
                  size="sm"
                >
                  Отмена
                </Button>
              )}
            </div>
          </div>
        )}
        
        {/* Список шаблонов по категориям */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {loading && templates.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <div className="animate-spin w-5 h-5 border-2 border-pink-600 border-t-transparent rounded-full mx-auto mb-2"></div>
              Загрузка...
            </div>
          ) : Object.keys(groupedTemplates).length > 0 ? (
            Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
              <div key={category} className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {category === 'general' ? 'Общие' :
                   category === 'greetings' ? 'Приветствия' :
                   category === 'booking' ? 'Запись' :
                   category === 'info' ? 'Информация' :
                   category === 'closing' ? 'Завершение' :
                   category === 'followup' ? 'Followup' : category}
                </p>
                {categoryTemplates.map(template => (
                  <div
                    key={template.id}
                    className="group relative"
                  >
                    <button
                      onClick={() => onSelect(template.content)}
                      className="w-full text-left p-3 border rounded-lg hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 hover:border-pink-300 transition-all"
                    >
                      <p className="font-medium text-sm text-gray-900">{template.name}</p>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{template.content}</p>
                    </button>
                    
                    {/* Кнопки действий */}
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(template);
                        }}
                        className="p-1 bg-blue-100 hover:bg-blue-200 rounded text-blue-600"
                        title="Редактировать"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(template.id);
                        }}
                        className="p-1 bg-red-100 hover:bg-red-200 rounded text-red-600"
                        title="Удалить"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm">Нет шаблонов</p>
              <p className="text-xs mt-1">Создайте первый шаблон</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}