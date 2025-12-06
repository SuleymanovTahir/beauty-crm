// /frontend/src/components/shared/StatusSelect.tsx
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  showAllOption?: boolean;
  variant?: 'default' | 'filter' | 'table';
}

const getColorOptions = (t: any) => [
  { name: t('components:color_green'), value: 'bg-green-100 text-green-800' },
  { name: t('components:color_blue'), value: 'bg-blue-100 text-blue-800' },
  { name: t('components:color_yellow'), value: 'bg-yellow-100 text-yellow-800' },
  { name: t('components:color_orange'), value: 'bg-orange-100 text-orange-800' },
  { name: t('components:color_red'), value: 'bg-red-100 text-red-800' },
  { name: t('components:color_purple'), value: 'bg-purple-100 text-purple-800' },
  { name: t('components:color_pink'), value: 'bg-pink-100 text-pink-800' },
  { name: t('components:color_gray'), value: 'bg-gray-100 text-gray-800' },
];

export function StatusSelect({ value, onChange, options, allowAdd, onAddStatus, showAllOption, variant = 'default' }: StatusSelectProps) {
  const { t } = useTranslation(['components', 'common']);
  const COLOR_OPTIONS = getColorOptions(t);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newStatusKey, setNewStatusKey] = useState('');
  const [newStatusLabel, setNewStatusLabel] = useState('');
  const [newStatusColor, setNewStatusColor] = useState(COLOR_OPTIONS[0].value);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddStatus = () => {
    if (onAddStatus && newStatusKey && newStatusLabel) {
      setIsAdding(true);
      onAddStatus(newStatusKey, newStatusLabel, newStatusColor);
      setIsAdding(false);
      setShowAddDialog(false);
      setNewStatusKey('');
      setNewStatusLabel('');
      setNewStatusColor(COLOR_OPTIONS[0].value);
    }
  };

  // Helper to determine styles based on variant
  const getStyles = () => {
    if (variant === 'filter' || variant === 'table') {
      return {
        className: '',
        style: {
          padding: '0.5rem 2.5rem 0.5rem 0.75rem',
          border: '1px solid #d1d5db',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          minWidth: variant === 'table' ? '120px' : '140px',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='%236b7280' d='M4 6l4 4 4-4z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.75rem center',
          backgroundSize: '16px 16px',
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none'
        } as any
      };
    }

    // Default 'badge' style
    return {
      className: `text-xs font-medium border-0 ${options[value]?.color || 'bg-gray-100 text-gray-800'}`,
      style: {
        minWidth: '100px',
        paddingLeft: '0.5rem',
        paddingRight: '2rem',
        paddingTop: '0.25rem',
        paddingBottom: '0.25rem',
        borderRadius: '9999px',
        cursor: 'pointer',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16'%3E%3Cpath fill='%23374151' d='M4 6l4 4 4-4z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.5rem center',
        backgroundSize: '12px 12px',
        appearance: 'none',
        WebkitAppearance: 'none',
        MozAppearance: 'none'
      }
    };
  };

  const styles = getStyles();

  // ... (handleAddStatus function)

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
          className={styles.className}
          style={styles.style}
        >
          {showAllOption && <option value="all">{t('all_statuses')}</option>}
          {Object.entries(options).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
          {allowAdd && <option value="__add_new__">+ {t('add_status')}</option>}
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
            title={t('add_new_status')}
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
                {t('add_status')}
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
                  {t('status_key_label')}
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
                  {t('status_key_hint')}
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
                  {t('status_name_label')}
                </label>
                <input
                  type="text"
                  value={newStatusLabel}
                  onChange={(e) => setNewStatusLabel(e.target.value)}
                  placeholder={t('new_status_placeholder')}
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
                  {t('status_color_label')}
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
                    {t('preview')}:
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
                {t('common:cancel')}
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
                {isAdding ? t('adding') : t('add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}