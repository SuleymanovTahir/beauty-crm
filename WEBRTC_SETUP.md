# 📞 Настройка WebRTC аудио/видео звонков для Internal Chat

## ✅ Что уже сделано:

1. **Backend WebSocket сервер** (`backend/api/webrtc_signaling.py`)
   - Обработка WebRTC сигнализации
   - Обмен SDP предложениями и ICE кандидатами
   - Управление активными соединениями

2. **Frontend WebRTC сервис** (`frontend/src/services/webrtc.ts`)
   - Управление peer-to-peer соединениями
   - Обработка медиа-потоков
   - Интеграция с компонентом InternalChat

3. **Компонент InternalChat** обновлен с:
   - UI для аудио/видео звонков
   - Кнопки начала звонка в хедере
   - Fullscreen overlay для видеозвонков
   - Обработка входящих/исходящих звонков

## 🚀 Быстрый старт:

### Шаг 1: Backend уже настроен ✅

WebRTC router автоматически зарегистрирован в `main.py`

### Шаг 2: Обновить InternalChat компонент для использования WebRTC

Замените текущий InternalChat этим улучшенным вариантом:

**Файл:** `frontend/src/components/shared/InternalChat.tsx`

Добавьте в начало файла:

```typescript
import { webrtcService, CallType } from '../../services/webrtc';
```

Добавьте в компонент `InternalChat`:

```typescript
// В начале компонента
useEffect(() => {
  if (currentUserData?.id) {
    // Инициализируем WebRTC
    webrtcService.initialize(currentUserData.id).catch(err => {
      console.error('Failed to initialize WebRTC:', err);
    });

    // Обработка входящего звонка
    webrtcService.onIncomingCall = (fromUserId: number, callType: CallType) => {
      const caller = users.find(u => u.id === fromUserId);
      if (caller) {
        const confirmed = window.confirm(
          `📞 ${caller.full_name} звонит (${callType === 'video' ? 'видео' : 'аудио'}). Принять?`
        );

        if (confirmed) {
          setSelectedUser(caller);
          setCallType(callType);
          webrtcService.acceptCall();
        } else {
          webrtcService.rejectCall();
        }
      }
    };

    // Обработка принятого звонка
    webrtcService.onCallAccepted = () => {
      setIsInCall(true);
      toast.success('✅ Звонок начат');
    };

    // Обработка отклоненного звонка
    webrtcService.onCallRejected = () => {
      toast.error('❌ Звонок отклонен');
      setIsInCall(false);
    };

    // Обработка удаленного потока
    webrtcService.onRemoteStream = (stream: MediaStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    };

    // Обработка завершения звонка
    webrtcService.onCallEnded = () => {
      toast.info('📞 Звонок завершен');
      setIsInCall(false);
      setCallType(null);
    };

    // Обработка ошибок
    webrtcService.onError = (error: string) => {
      toast.error(error);
    };

    return () => {
      webrtcService.disconnect();
    };
  }
}, [currentUserData, users]);

// Обновляем локальное видео при изменении потока
useEffect(() => {
  if (isInCall && localVideoRef.current) {
    const localStream = webrtcService.getLocalStream();
    if (localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }
}, [isInCall]);
```

Замените функции `startCall` и `endCall`:

```typescript
const startCall = async (type: 'audio' | 'video') => {
  if (!selectedUser) return;

  try {
    setCallType(type);
    await webrtcService.startCall(selectedUser.id, type);
    setIsInCall(true);
  } catch (err) {
    console.error('Error starting call:', err);
    toast.error('❌ Ошибка начала звонка');
  }
};

const endCall = () => {
  webrtcService.endCall();
  setIsInCall(false);
  setCallType(null);
};
```

## 🧪 Тестирование:

### 1. Запустите backend:
```bash
cd backend
python main.py
```

### 2. Запустите frontend:
```bash
cd frontend
npm run dev
```

### 3. Откройте 2 вкладки браузера:
- **Вкладка 1:** Войдите как Пользователь 1
- **Вкладка 2:** Войдите как Пользователь 2

### 4. Проверьте звонки:
1. Откройте Internal Chat в обеих вкладках
2. В первой вкладке выберите Пользователя 2
3. Нажмите кнопку 📞 (аудио) или 📹 (видео)
4. Во второй вкладке должно появиться уведомление о входящем звонке
5. Примите звонок
6. Проверьте аудио/видео связь

## 🌐 Production настройки:

### STUN/TURN серверы

Для production рекомендуется использовать собственный TURN сервер (для прохождения через NAT/firewall).

**Обновите** `frontend/src/services/webrtc.ts`:

```typescript
const DEFAULT_CONFIG: WebRTCConfig = {
  iceServers: [
    // Google STUN servers (бесплатно)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },

    // Ваш TURN сервер (для production)
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'username',
      credential: 'password'
    }
  ]
};
```

### Установка TURN сервера (coturn):

```bash
# Ubuntu/Debian
sudo apt-get install coturn

# Конфигурация
sudo nano /etc/turnserver.conf
```

Минимальная конфигурация:
```
listening-port=3478
fingerprint
lt-cred-mech
user=username:password
realm=yourdomain.com
```

## 📋 Возможные проблемы:

### 1. WebSocket не подключается
**Решение:** Проверьте, что backend запущен и порт 8000 открыт

### 2. Нет доступа к камере/микрофону
**Решение:** Разрешите доступ в браузере. В Chrome: Settings → Privacy → Site Settings → Camera/Microphone

### 3. Не работает через NAT/firewall
**Решение:** Настройте TURN сервер (см. выше)

### 4. Только аудио работает
**Решение:** Убедитесь, что камера не используется другим приложением

## 🔒 Безопасность:

1. **HTTPS обязателен для production** - WebRTC требует безопасное соединение
2. **Аутентификация** - уже реализована через session cookies
3. **Шифрование** - WebRTC автоматически использует DTLS/SRTP

## 📊 Мониторинг:

Проверить онлайн пользователей:
```
GET http://localhost:8000/api/webrtc/online-users
```

Ответ:
```json
{
  "online_users": [1, 5, 12],
  "count": 3
}
```

## ✨ Дополнительные возможности:

### Screen Sharing (демонстрация экрана):

Добавьте в `webrtc.ts`:

```typescript
async startScreenShare(): Promise<void> {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false
    });

    // Заменяем видео трек
    const videoTrack = screenStream.getVideoTracks()[0];
    const sender = this.peerConnection
      ?.getSenders()
      .find(s => s.track?.kind === 'video');

    if (sender) {
      sender.replaceTrack(videoTrack);
    }
  } catch (error) {
    console.error('Screen share error:', error);
  }
}
```

### Запись звонков:

Используйте MediaRecorder API для записи:

```typescript
const recorder = new MediaRecorder(remoteStream);
recorder.start();
// ... сохранение chunks
```

## 🎯 Следующие шаги:

- [ ] Добавить красивое модальное окно для входящих звонков
- [ ] Добавить индикатор качества соединения
- [ ] Добавить возможность отключения камеры/микрофона во время звонка
- [ ] Добавить запись звонков
- [ ] Добавить демонстрацию экрана
- [ ] Добавить групповые звонки (потребуется SFU сервер)

---

**Готово!** 🎉 Теперь у вас полноценная система видео/аудио звонков для Internal Chat!
