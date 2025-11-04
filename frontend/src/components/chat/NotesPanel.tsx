import React from 'react';
import { StickyNote, X, Save, Loader } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';


interface NotesPanelProps {
  notes: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  isLoading?: boolean;
}

export default function NotesPanel({ notes, onChange, onSave, onClose, isLoading = false }: NotesPanelProps) {
  return (
    <div className="bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 rounded-2xl border-2 border-yellow-300 shadow-xl overflow-hidden animate-in slide-in-from-top duration-300 max-h-[500px] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 to-amber-600 p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <StickyNote className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-bold text-white text-lg">Заметки</h3>
        </div>
        <button
          onClick={onClose}
          className="h-9 w-9 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Content - со скроллом */}
      <div className="p-4 overflow-y-auto flex-1">
        <div className="bg-white rounded-xl border-2 border-yellow-300 p-1 shadow-inner">
          <Textarea
            value={notes}
            onChange={(e) => onChange(e.target.value)}
            placeholder="✍️ Введите заметки о клиенте...&#10;&#10;Например:&#10;• Предпочтения&#10;• Особые пожелания&#10;• История взаимодействия"
            className="min-h-[180px] border-0 resize-none focus-visible:ring-0 bg-transparent text-gray-900 placeholder:text-gray-400"
            rows={8}
            disabled={isLoading}
          />
        </div>
        
        <div className="mt-4 bg-yellow-100/50 rounded-xl p-3 border border-yellow-200">
          <p className="text-xs text-yellow-800 flex items-center gap-1.5">
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Заметки видны только вам и другим сотрудникам
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 bg-yellow-100/30 border-t-2 border-yellow-200 flex-shrink-0">
        <Button
          onClick={onSave}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-yellow-600 to-orange-500 hover:from-yellow-700 hover:to-orange-600 text-white rounded-xl shadow-xl font-bold disabled:opacity-50 border-2 border-yellow-800"
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Сохранение...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Сохранить заметки
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
