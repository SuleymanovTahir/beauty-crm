// Модальное окно для исходящих звонков
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { Button } from '../ui/button';
import { getDynamicAvatar } from '../../utils/avatarUtils';
import { getPhotoUrl } from '../../utils/photoUtils';

interface OutgoingCallModalProps {
  calleeName: string;
  calleeId: number;
  calleePhoto?: string;
  callType: 'audio' | 'video';
  onCancel: () => void;
}

export default function OutgoingCallModal({
  calleeName,
  calleeId,
  calleePhoto,
  callType,
  onCancel
}: OutgoingCallModalProps) {
  const { t } = useTranslation(['common']);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const avatarUrl = calleePhoto
    ? getPhotoUrl(calleePhoto)
    : getDynamicAvatar(calleeId.toString(), calleeName);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in slide-in-from-bottom-4 duration-300">
        {/* Callee Info */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center animate-pulse">
            {calleePhoto ? (
              <img
                src={avatarUrl || undefined}
                alt={calleeName}
                className="w-24 h-24 rounded-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <span className="text-3xl font-bold text-white">
                {calleeName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {calleeName}
          </h2>

          <div className="flex items-center justify-center gap-2 text-gray-600 mb-4">
            {callType === 'video' ? (
              <>
                <Video className="w-5 h-5" />
                <span>{t('calls.video_call', 'Видеозвонок')}</span>
              </>
            ) : (
              <>
                <Phone className="w-5 h-5" />
                <span>{t('calls.audio_call', 'Аудиозвонок')}</span>
              </>
            )}
          </div>

          <p className="text-gray-500 animate-pulse">
            {t('calls.calling', 'Вызов')}{dots}
          </p>
        </div>

        {/* Cancel Button */}
        <Button
          onClick={onCancel}
          className="w-full bg-red-500 hover:bg-red-600 text-white py-6 rounded-xl text-lg font-semibold shadow-lg transition-all hover:scale-105"
        >
          <PhoneOff className="w-6 h-6 mr-2" />
          {t('calls.cancel', 'Отменить')}
        </Button>
      </div>
    </div>
  );
}
