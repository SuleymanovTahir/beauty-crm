// Индикатор качества соединения
import { Wifi, WifiOff } from 'lucide-react';

export type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'disconnected';

interface CallQualityIndicatorProps {
  quality: ConnectionQuality;
  latency?: number;
  packetLoss?: number;
}

export default function CallQualityIndicator({
  quality,
  latency,
  packetLoss
}: CallQualityIndicatorProps) {
  const getQualityColor = () => {
    switch (quality) {
      case 'excellent':
        return 'text-green-500';
      case 'good':
        return 'text-yellow-500';
      case 'poor':
        return 'text-orange-500';
      case 'disconnected':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getQualityText = () => {
    switch (quality) {
      case 'excellent':
        return 'Отличное';
      case 'good':
        return 'Хорошее';
      case 'poor':
        return 'Плохое';
      case 'disconnected':
        return 'Нет связи';
      default:
        return 'Неизвестно';
    }
  };

  const getBars = () => {
    switch (quality) {
      case 'excellent':
        return 4;
      case 'good':
        return 3;
      case 'poor':
        return 2;
      case 'disconnected':
        return 0;
      default:
        return 0;
    }
  };

  return (
    <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-lg px-3 py-2">
      <div className="flex items-center gap-1">
        {quality === 'disconnected' ? (
          <WifiOff className={`w-5 h-5 ${getQualityColor()}`} />
        ) : (
          <Wifi className={`w-5 h-5 ${getQualityColor()}`} />
        )}

        {/* Signal bars */}
        <div className="flex items-end gap-0.5 h-4">
          {[1, 2, 3, 4].map((bar) => (
            <div
              key={bar}
              className={`w-1 rounded-sm transition-all ${
                bar <= getBars() ? getQualityColor().replace('text-', 'bg-') : 'bg-gray-600'
              }`}
              style={{ height: `${bar * 25}%` }}
            />
          ))}
        </div>
      </div>

      <div className="text-white text-sm font-medium">
        {getQualityText()}
      </div>

      {latency !== undefined && (
        <div className="text-white/70 text-xs">
          {latency}ms
        </div>
      )}

      {packetLoss !== undefined && packetLoss > 0 && (
        <div className="text-red-400 text-xs">
          -{packetLoss}%
        </div>
      )}
    </div>
  );
}
