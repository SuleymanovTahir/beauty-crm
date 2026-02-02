// /frontend/src/components/PositionSelector.tsx
import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Check, ChevronDown } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { api } from '../services/api';
import { toast } from 'sonner';

interface Position {
  id: number;
  name: string;
  name?: string;
  name?: string;
  description?: string;
  is_active: number;
}

interface PositionSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function PositionSelector({ value, onChange, disabled, placeholder = 'Выберите должность' }: PositionSelectorProps) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPositionName, setNewPositionName] = useState('');
  const [creating, setCreating] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPositions();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCreateForm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadPositions = async () => {
    try {
      setLoading(true);
      const response = await api.getPositions();
      setPositions(response.positions || []);
    } catch (error) {
      console.error('Error loading positions:', error);
      toast.error('Ошибка загрузки должностей');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePosition = async () => {
    if (!newPositionName.trim()) {
      toast.error('Введите название должности');
      return;
    }

    try {
      setCreating(true);
      await api.createPosition({
        name: newPositionName.trim(),
        sort_order: positions.length
      });

      toast.success('Должность создана');
      await loadPositions();
      onChange(newPositionName.trim());
      setNewPositionName('');
      setShowCreateForm(false);
      setIsOpen(false);
    } catch (error) {
      console.error('Error creating position:', error);
      toast.error('Ошибка создания должности');
    } finally {
      setCreating(false);
    }
  };

  const filteredPositions = positions.filter(pos =>
    pos.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Проверяем есть ли точное совпадение с существующими должностями
  const exactMatch = positions.find(pos =>
    pos.name.toLowerCase() === searchTerm.toLowerCase()
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setSearchTerm(value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-10"
        />
        <ChevronDown
          className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden flex flex-col">
          {/* Поиск */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Поиск должности..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                autoFocus
              />
            </div>
          </div>

          {/* Список должностей */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Загрузка...
              </div>
            ) : filteredPositions.length > 0 ? (
              <div className="py-1">
                {filteredPositions.map((position) => (
                  <button
                    key={position.id}
                    onClick={() => {
                      onChange(position.name);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center justify-between group"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {position.name}
                      </p>
                      {position.description && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {position.description}
                        </p>
                      )}
                    </div>
                    {value === position.name && (
                      <Check className="w-4 h-4 text-pink-600 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-gray-500">
                Должности не найдены
              </div>
            )}
          </div>

          {/* Создание новой должности */}
          {showCreateForm ? (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newPositionName}
                  onChange={(e) => setNewPositionName(e.target.value)}
                  placeholder="Название новой должности"
                  className="flex-1 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreatePosition();
                    } else if (e.key === 'Escape') {
                      setShowCreateForm(false);
                      setNewPositionName('');
                    }
                  }}
                  autoFocus
                  disabled={creating}
                />
                <Button
                  size="sm"
                  onClick={handleCreatePosition}
                  disabled={creating || !newPositionName.trim()}
                  className="bg-pink-600 hover:bg-pink-700"
                >
                  {creating ? 'Создание...' : 'Создать'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewPositionName('');
                  }}
                  disabled={creating}
                >
                  Отмена
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                if (searchTerm && !exactMatch) {
                  setNewPositionName(searchTerm);
                }
                setShowCreateForm(true);
              }}
              className="w-full px-4 py-3 text-left border-t border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-2 text-pink-600 hover:text-pink-700"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">
                {searchTerm && !exactMatch
                  ? `Создать должность "${searchTerm}"`
                  : 'Создать новую должность'}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
