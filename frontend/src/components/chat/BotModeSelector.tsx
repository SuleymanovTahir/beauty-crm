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
      description: t('bot_mode_manual_desc', 'Бот отключен, вы общаетесь лично') || 'Бот отключен, вы общаетесь лично',
      colorClass: 'blue'
    },
    {
      id: 'assistant' as const,
      icon: Sparkles,
      label: t('bot_mode_assistant', 'Ассистент') || 'Ассистент',
      description: t('bot_mode_assistant_desc', 'Бот помогает менеджеру, предлагая ответы') || 'Бот помогает менеджеру, предлагая ответы',
      colorClass: 'purple'
    },
    {
      id: 'autopilot' as const,
      icon: Bot,
      label: t('bot_mode_autopilot', 'Автопилот') || 'Автопилот',
      description: t('bot_mode_autopilot_desc', 'Бот общается с клиентом полностью сам') || 'Бот общается с клиентом полностью сам',
      colorClass: 'green'
    }
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1 px-1">
        <Bot className="w-4 h-4 text-indigo-600" />
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          {t('bot_mode_title', 'Режим работы бота') || 'Режим работы бота'}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode === mode.id;

          // Define explicit styles to avoid purging
          const activeStyles = {
            manual: 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/20',
            assistant: 'border-purple-500 bg-purple-50/50 ring-1 ring-purple-500/20',
            autopilot: 'border-green-500 bg-green-50/50 ring-1 ring-green-500/20'
          };

          const iconStyles = {
            manual: isActive ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600',
            assistant: isActive ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-600',
            autopilot: isActive ? 'bg-green-500 text-white' : 'bg-green-100 text-green-600'
          };

          const labelStyles = {
            manual: isActive ? 'text-blue-900' : 'text-gray-900',
            assistant: isActive ? 'text-purple-900' : 'text-gray-900',
            autopilot: isActive ? 'text-green-900' : 'text-gray-900'
          };

          return (
            <button
              key={mode.id}
              onClick={() => onChange(mode.id)}
              className={`
                group relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 text-left
                ${isActive
                  ? activeStyles[mode.id]
                  : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-md'
                }
              `}
            >
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105
                ${iconStyles[mode.id]}
              `}>
                <Icon className="w-6 h-6" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`font-bold text-sm sm:text-base leading-tight ${labelStyles[mode.id]}`}>
                    {mode.label}
                  </span>
                  {isActive && (
                    <CheckCircle2 className={`w-5 h-5 ${mode.id === 'manual' ? 'text-blue-500' :
                        mode.id === 'assistant' ? 'text-purple-500' : 'text-green-500'
                      }`} />
                  )}
                </div>
                <p className={`text-xs sm:text-sm leading-relaxed ${isActive ? 'text-gray-700' : 'text-gray-500'}`}>
                  {mode.description}
                </p>
              </div>

              {isActive && (
                <div className="absolute -top-1 -right-1">
                  <span className="relative flex h-3 w-3">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${mode.id === 'manual' ? 'bg-blue-400' :
                        mode.id === 'assistant' ? 'bg-purple-400' : 'bg-green-400'
                      }`}></span>
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${mode.id === 'manual' ? 'bg-blue-500' :
                        mode.id === 'assistant' ? 'bg-purple-500' : 'bg-green-500'
                      }`}></span>
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}