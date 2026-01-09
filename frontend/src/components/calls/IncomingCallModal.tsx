// Модальное окно для входящих звонков
import React, { useEffect, useState } from 'react';
import { Phone, PhoneOff, Video, Mic } from 'lucide-react';
import { Button } from '../ui/button';
import { getDynamicAvatar } from '../../utils/avatarUtils';

interface IncomingCallModalProps {
  callerName: string;
  callerId: number;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallModal({
  callerName,
  callerId,
  callType,
  onAccept,
  onReject
}: IncomingCallModalProps) {
  const [ringing, setRinging] = useState(true);

  useEffect(() => {
    // Воспроизведение звука звонка
    const audio = new Audio('/sounds/incoming-call.mp3');
    audio.loop = true;
    audio.play().catch(() => console.log('Audio playback failed'));

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in slide-in-from-bottom-4 duration-300">
        {/* Caller Info */}
        <div className="text-center mb-8">
          <div className={`w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center ${ringing ? 'animate-pulse' : ''}`}>
            <img
              src={getDynamicAvatar(callerId.toString(), callerName)}
              alt={callerName}
              className="w-24 h-24 rounded-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `<span class="text-3xl font-bold text-white">${callerName.charAt(0).toUpperCase()}</span>`;
                }
              }}
            />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {callerName}
          </h2>

          <div className="flex items-center justify-center gap-2 text-gray-600">
            {callType === 'video' ? (
              <>
                <Video className="w-5 h-5" />
                <span>Видеозвонок</span>
              </>
            ) : (
              <>
                <Phone className="w-5 h-5" />
                <span>Аудиозвонок</span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            onClick={onReject}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white py-6 rounded-xl text-lg font-semibold shadow-lg"
          >
            <PhoneOff className="w-6 h-6 mr-2" />
            Отклонить
          </Button>

          <Button
            onClick={onAccept}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-6 rounded-xl text-lg font-semibold shadow-lg animate-pulse"
          >
            <Phone className="w-6 h-6 mr-2" />
            Принять
          </Button>
        </div>
      </div>
    </div>
  );
}
