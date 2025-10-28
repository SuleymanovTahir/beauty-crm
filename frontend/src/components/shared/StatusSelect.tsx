import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface StatusConfig {
  label: string;
  color: string;
}

interface StatusSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Record<string, StatusConfig>;
  allowAdd?: boolean;
  onAddStatus?: (key: string, label: string, color: string) => void;
}

const COLOR_OPTIONS = [
  { name: 'Зелёный', value: 'bg-green-100 text-green-800' },
  { name: 'Синий', value: 'bg-blue-100 text-blue-800' },
  { name: 'Жёлтый', value: 'bg-yellow-100 text-yellow-800' },
  { name: 'Оранжевый', value: 'bg-orange-100 text-orange-800' },
  { name: 'Красный', value: 'bg-red-100 text-red-800' },
  { name: 'Фиолетовый', value: 'bg-purple-100 text-purple-800' },
  { name: 'Розовый', value: 'bg-pink-100 text-pink-800' },
  { name: 'Серый', value: 'bg-gray-100 text-gray-800' },
];

export function StatusSelect({ value, onChange, options, allowAdd, onAddStatus }: StatusSelectProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newStatusKey, setNewStatusKey] = useState('');
  const [newStatusLabel, setNewStatusLabel] = useState('');
  const [newStatusColor, setNewStatusColor] = useState(COLOR_OPTIONS[0].value);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddStatus = async () => {
    if (!newStatusKey.trim() || !newStatusLabel.trim() || !onAddStatus) return;

    const key = newStatusKey.trim().toLowerCase().replace(/\s+/g, '_');

    if (options[key]) {
      alert('Статус с таким ключом уже существует');
      return;
    }

    setIsAdding(true);
    try {
      await onAddStatus(key, newStatusLabel.trim(), newStatusColor);
      setShowAddDialog(false);
      setNewStatusKey('');
      setNewStatusLabel('');
      setNewStatusColor(COLOR_OPTIONS[0].value);
      onChange(key);
    } catch (err) {
      console.error('Error adding status:', err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <select
          value={value}
          onChange={(e) => {
            if (e.target.value === '__add_new__') {
              setShowAddDialog(true);
            } else {
              onChange(e.target.value);
            }
          }}
          className={`text-sm font-medium border-0 ${options[value]?.color || 'bg-gray-100 text-gray-800'}`}
          style={{
            minWidth: '120px',
            paddingLeft: '0.75rem',      // ✅ 12px слева
            paddingRight: '2.5rem',       // ✅ 40px справа для стрелки
            paddingTop: '0.375rem',       // ✅ 6px сверху
            paddingBottom: '0.375rem',    // ✅ 6px снизу
            borderRadius: '9999px',       // ✅ rounded-full
            cursor: 'pointer',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='%23374151' d='M4 6l4 4 4-4z'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.75rem center',  // ✅ Стрелка на 12px от правого края
            backgroundSize: '16px 16px',
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none'
          }}
        >
          {Object.entries(options).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
          {allowAdd && <option value="__add_new__">+ Добавить статус</option>}
        </select>

        {allowAdd && (
          <button
            onClick={() => setShowAddDialog(true)}
            style={{
              padding: '0.25rem 0.5rem',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.75rem',
              color: '#6b7280'
            }}
            title="Добавить новый статус"
          >
            <Plus style={{ width: '14px', height: '14px' }} />
          </button>
        )}
      </div>

      {/* Add Status Dialog */}
      {showAddDialog && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '1rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            {/* Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111' }}>
                Добавить статус
              </h3>
              <button
                onClick={() => setShowAddDialog(false)}
                disabled={isAdding}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: isAdding ? 'not-allowed' : 'pointer',
                  color: '#6b7280',
                  fontSize: '1.5rem',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Ключ (на английском) *
                </label>
                <input
                  type="text"
                  value={newStatusKey}
                  onChange={(e) => setNewStatusKey(e.target.value)}
                  placeholder="new_status"
                  disabled={isAdding}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Используется в системе (lowercase, без пробелов)
                </p>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Название *
                </label>
                <input
                  type="text"
                  value={newStatusLabel}
                  onChange={(e) => setNewStatusLabel(e.target.value)}
                  placeholder="Новый статус"
                  disabled={isAdding}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.75rem'
                }}>
                  Цвет *
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                  gap: '0.75rem'
                }}>
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setNewStatusColor(color.value)}
                      disabled={isAdding}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: newStatusColor === color.value ? '3px solid #ec4899' : '2px solid #e5e7eb',
                        cursor: isAdding ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        transition: 'all 0.2s',
                        backgroundColor: newStatusColor === color.value ? '#fdf2f8' : '#fff'
                      }}
                      className={color.value}
                    >
                      {color.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {newStatusLabel && (
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Предпросмотр:
                  </p>
                  <span
                    className={newStatusColor}
                    style={{
                      display: 'inline-block',
                      padding: '0.375rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
                    {newStatusLabel}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowAddDialog(false)}
                disabled={isAdding}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontWeight: '500',
                  color: '#374151',
                  cursor: isAdding ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Отмена
              </button>
              <button
                onClick={handleAddStatus}
                disabled={isAdding || !newStatusKey.trim() || !newStatusLabel.trim()}
                style={{
                  padding: '0.625rem 1.5rem',
                  backgroundColor: '#ec4899',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: '#fff',
                  fontWeight: '500',
                  cursor: (isAdding || !newStatusKey.trim() || !newStatusLabel.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (isAdding || !newStatusKey.trim() || !newStatusLabel.trim()) ? 0.5 : 1,
                  fontSize: '0.875rem'
                }}
              >
                {isAdding ? 'Добавление...' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}