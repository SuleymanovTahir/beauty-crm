// /frontend/src/components/chat/NotesPanel.tsx
import { useState, useEffect } from 'react';
import { StickyNote, X, Plus, Trash2, Loader, Edit2, Save, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { useTranslation } from 'react-i18next';

interface Note {
  id: number;
  text: string;
  created_at: string;
  created_by: string;
}

interface NotesPanelProps {
  clientId: string;
  onClose: () => void;
}

export default function NotesPanel({ clientId, onClose }: NotesPanelProps) {
  const { t } = useTranslation('components');
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    loadNotes();
  }, [clientId]);

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const data = await api.getClientNotes(clientId);
      setNotes(data.notes || []);
    } catch (err) {
      toast.error(t('error_loading_notes'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim()) {
      toast.error(t('enter_note_text'));
      return;
    }

    try {
      setIsSaving(true);
      await api.addClientNote(clientId, newNoteText);
      setNewNoteText('');
      await loadNotes();
      toast.success(t('note_added'));
    } catch (err) {
      toast.error(t('error_saving_note'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingText(note.text);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingText('');
  };

  const handleSaveEdit = async (noteId: number) => {
    if (!editingText.trim()) {
      toast.error(t('note_cannot_be_empty'));
      return;
    }

    try {
      await api.updateClientNote(clientId, noteId, editingText);
      setEditingNoteId(null);
      setEditingText('');
      await loadNotes();
      toast.success(t('note_updated'));
    } catch (err) {
      toast.error(t('error_updating_note'));
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!confirm(t('delete_note_confirm'))) return;

    try {
      await api.deleteClientNote(clientId, noteId);
      await loadNotes();
      toast.success(t('note_deleted'));
    } catch (err) {
      toast.error(t('error_deleting_note'));
    }
  };

  return (
    <div className="bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 rounded-2xl border-2 border-yellow-300 shadow-xl overflow-hidden animate-in slide-in-from-top duration-300 max-h-[500px] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 to-amber-600 p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="h-9 w-9 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors text-white"
            title="Назад"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center" title="Заметки по клиенту">
            <StickyNote className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-bold text-white text-lg">Заметки ({notes.length})</h3>
        </div>
        <button
          onClick={onClose}
          className="h-9 w-9 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto flex-1 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-8 h-8 text-yellow-600 animate-spin" />
          </div>
        ) : (
          <>
            {/* Форма добавления */}
            <div className="bg-white rounded-xl border-2 border-yellow-300 p-3">
              <Textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder={t('new_note_placeholder') || 'Введите заметку...'}
                className="min-h-[100px] border-2 border-purple-100 focus:border-purple-300 rounded-xl bg-purple-50/30 mb-3 text-gray-900 placeholder:text-gray-500 font-medium p-3"
                rows={4}
                disabled={isSaving}
              />
              <Button
                onClick={handleAddNote}
                disabled={isSaving || !newNoteText.trim()}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-xl shadow-md font-bold"
                size="sm"
              >
                {isSaving ? (
                  <><Loader className="w-4 h-4 mr-2 animate-spin" />{t('saving')}</>
                ) : (
                  <><Plus className="w-4 h-4 mr-2" />{t('add_note') || 'Добавить заметку'}</>
                )}
              </Button>
            </div>

            {/* Список заметок */}
            {notes.length > 0 ? (
              notes.map((note) => (
                <div key={note.id} className="bg-white rounded-xl border-2 border-yellow-200 p-3 relative group">
                  {editingNoteId === note.id ? (
                    // Режим редактирования
                    <div>
                      <Textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="min-h-[80px] border-2 border-yellow-300 rounded-xl mb-2 text-gray-900"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleSaveEdit(note.id)}
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Save className="w-3.5 h-3.5 mr-1" />
                          {t('save')}
                        </Button>
                        <Button
                          onClick={handleCancelEdit}
                          size="sm"
                          variant="outline"
                        >
                          {t('cancel')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Режим просмотра
                    <>
                      {/* Кнопки управления */}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button
                          onClick={() => handleStartEdit(note)}
                          className="w-5 h-5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-md transition-colors"
                          title="Редактировать"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center shadow-md transition-colors"
                          title="Удалить"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </button>
                      </div>

                      <p className="text-sm text-gray-900 whitespace-pre-wrap mb-2 pr-16">{note.text}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="font-medium">{note.created_by || t('unknown')}</span>
                        <span>{new Date(note.created_at).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <StickyNote className="w-8 h-8 text-yellow-600" />
                </div>
                <p className="text-gray-500 font-medium text-sm">{t('no_notes')}</p>
                <p className="text-xs text-gray-400 mt-1">{t('add_first_note')}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Подсказка */}
      <div className="p-3 bg-yellow-100/50 border-t-2 border-yellow-200 flex-shrink-0">
        <p className="text-xs text-yellow-800 flex items-center gap-1.5">
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          {t('notes_visible_info')}
        </p>
      </div>
    </div>
  );
}