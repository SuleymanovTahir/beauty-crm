// frontend/src/components/chat/BotModeSelector.tsx
import { Bot, User, Sparkles } from 'lucide-react';

interface BotModeSelectorProps {
  currentMode: 'manual' | 'assistant' | 'autopilot';
  onChange: (mode: 'manual' | 'assistant' | 'autopilot') => void;
}

export default function BotModeSelector({ currentMode, onChange }: BotModeSelectorProps) {
  const modes = [
    {
      id: 'manual' as const,
      icon: User,
      label: 'Менеджер',
      description: 'Вы отвечаете сами',
      color: 'blue'
    },
    {
      id: 'assistant' as const,
      icon: Sparkles,
      label: 'Ассистент',
      description: 'Бот подсказывает',
      color: 'purple'
    },
    {
      id: 'autopilot' as const,
      icon: Bot,
      label: 'Автопилот',
      description: 'Бот отвечает сам',
      color: 'green'
    }
  ];

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
        🤖 Режим бота
      </p>
      <div className="grid grid-cols-1 gap-2">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode === mode.id;
          
          return (
            <button
              key={mode.id}
              onClick={() => onChange(mode.id)}
              className={`
                relative flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left
                ${isActive 
                  ? `border-${mode.color}-500 bg-${mode.color}-50` 
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
              `}
            >
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                ${isActive ? `bg-${mode.color}-500` : 'bg-gray-100'}
              `}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-600'}`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-semibold text-sm ${isActive ? `text-${mode.color}-900` : 'text-gray-900'}`}>
                    {mode.label}
                  </span>
                  {isActive && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-${mode.color}-500 text-white`}>
                      ✓
                    </span>
                  )}
                </div>
                <p className={`text-xs ${isActive ? `text-${mode.color}-700` : 'text-gray-500'}`}>
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