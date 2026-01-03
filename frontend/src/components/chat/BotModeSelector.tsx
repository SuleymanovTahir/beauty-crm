// /frontend/src/components/chat/BotModeSelector.tsx
import { Bot, User, Sparkles, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BotModeSelectorProps {
  currentMode: 'manual' | 'assistant' | 'autopilot';
  onChange: (mode: 'manual' | 'assistant' | 'autopilot') => void;
}

export default function BotModeSelector({ currentMode, onChange }: BotModeSelectorProps) {
  const { t } = useTranslation(['common', 'components']);

  const modes = [
    {
      id: 'manual' as const,
      icon: User,
      label: t('bot_mode_manual', 'Вручную') || 'Вручную',
      description: t('bot_mode_manual_desc', 'Бот отключен') || 'Бот отключен',
      colorClass: 'blue'
    },
    {
      id: 'assistant' as const,
      icon: Sparkles,
      label: t('bot_mode_assistant', 'Ассистент') || 'Ассистент',
      description: t('bot_mode_assistant_desc', 'Бот помогает') || 'Бот помогает',
      colorClass: 'purple'
    },
    {
      id: 'autopilot' as const,
      icon: Bot,
      label: t('bot_mode_autopilot', 'Автопилот') || 'Автопилот',
      description: t('bot_mode_autopilot_desc', 'Бот сам') || 'Бот сам',
      colorClass: 'green'
    }
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Bot className="w-4 h-4 text-indigo-600" />
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          {t('bot_mode_title', 'Режим работы бота') || 'Режим работы бота'}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode === mode.id;

          const activeStyles = {
            manual: 'border-blue-500 bg-blue-50/30',
            assistant: 'border-purple-500 bg-purple-50/30',
            autopilot: 'border-green-500 bg-green-50/30'
          };

          const iconStyles = {
            manual: isActive ? 'text-blue-600 bg-white' : 'text-gray-400 bg-gray-50',
            assistant: isActive ? 'text-purple-600 bg-white' : 'text-gray-400 bg-gray-50',
            autopilot: isActive ? 'text-green-600 bg-white' : 'text-gray-400 bg-gray-50'
          };

          return (
            <button
              key={mode.id}
              onClick={() => onChange(mode.id)}
              className={`
                group relative flex items-center gap-3 p-2 rounded-xl border transition-all duration-200 text-left
                ${isActive
                  ? activeStyles[mode.id]
                  : 'border-gray-100 bg-white hover:border-gray-200'
                }
              `}
            >
              <div className={`
                w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all shadow-sm
                ${iconStyles[mode.id]}
              `}>
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`font-bold text-sm leading-tight ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                    {mode.label}
                  </span>
                  {isActive && <CheckCircle2 className="w-4 h-4 text-current" />}
                </div>
                <p className="text-[10px] text-gray-400 truncate mt-0.5">
                  {mode.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}