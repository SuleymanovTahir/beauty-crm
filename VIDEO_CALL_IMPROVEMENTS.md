# Улучшения видеозвонков

## ✅ Реализованные функции

### 1. Модальное окно для входящих звонков
**Файл:** `frontend/src/components/calls/IncomingCallModal.tsx`

Красивое модальное окно с:
- Аватаром звонящего
- Информацией о типе звонка (аудио/видео)
- Анимацией пульсации
- Кнопками "Принять" и "Отклонить"
- Звуком входящего звонка (требуется файл `/sounds/incoming-call.mp3`)

**Использование:**
```tsx
import IncomingCallModal from './components/calls/IncomingCallModal';

<IncomingCallModal
  callerName="Иван Иванов"
  callerId={123}
  callType="video"
  onAccept={() => webrtcService.acceptCall()}
  onReject={() => webrtcService.rejectCall()}
/>
```

### 2. Индикатор качества соединения
**Файл:** `frontend/src/components/calls/CallQualityIndicator.tsx`

Показывает качество соединения в реальном времени:
- Визуальный индикатор (полоски сигнала)
- Текстовая оценка (Отличное/Хорошее/Плохое/Нет связи)
- Задержка в миллисекундах
- Потеря пакетов в процентах

**Использование:**
```tsx
import CallQualityIndicator from './components/calls/CallQualityIndicator';

<CallQualityIndicator
  quality="excellent"
  latency={45}
  packetLoss={0.5}
/>
```

### 3. Управление камерой и микрофоном
**Файл:** `frontend/src/services/webrtc.ts`

Новые методы в WebRTCService:
- `toggleAudio()` - включить/выключить микрофон
- `toggleVideo()` - включить/выключить камеру
- `isAudioActive()` - проверить состояние микрофона
- `isVideoActive()` - проверить состояние камеры

**Использование:**
```typescript
// Переключить микрофон
const isAudioOn = webrtcService.toggleAudio();

// Переключить камеру
const isVideoOn = webrtcService.toggleVideo();

// Проверить состояние
if (webrtcService.isAudioActive()) {
  console.log('Микрофон включен');
}
```

### 4. Автоматический мониторинг качества
**Файл:** `frontend/src/services/webrtc.ts`

Автоматически отслеживает качество соединения каждые 2 секунды:
- Измеряет задержку (latency)
- Измеряет потерю пакетов (packet loss)
- Определяет общее качество (excellent/good/poor/disconnected)

**Callback для получения уведомлений:**
```typescript
webrtcService.onQualityChange = (quality, stats) => {
  console.log(`Quality: ${quality}`);
  console.log(`Latency: ${stats.latency}ms`);
  console.log(`Packet Loss: ${stats.packetLoss}%`);
};
```

## 📋 Функции в планах (не реализованы)

### 5. Запись звонков
**Статус:** Требуется реализация на backend

Необходимо:
- API endpoint для сохранения записи
- MediaRecorder на frontend
- Конвертация и сжатие видео
- Хранилище для записей

### 6. Демонстрация экрана
**Статус:** Частично готово (WebRTC поддерживает)

Необходимо добавить:
```typescript
async shareScreen() {
  const screenStream = await navigator.mediaDevices.getDisplayMedia({
    video: { cursor: 'always' },
    audio: false
  });
  // Заменить видео трек на screen share
}
```

### 7. Групповые звонки
**Статус:** Требуется SFU сервер

Необходимо:
- Внедрение SFU сервера (например, mediasoup или Janus)
- Обновление сигнализации для множественных участников
- UI для множественных видео потоков
- Управление полосой пропускания

## 🔧 Интеграция в InternalChat

Для использования новых компонентов в InternalChat:

```tsx
// В InternalChat.tsx добавить состояния:
const [incomingCallFrom, setIncomingCallFrom] = useState<number | null>(null);
const [callQuality, setCallQuality] = useState<'excellent' | 'good' | 'poor' | 'disconnected'>('good');
const [qualityStats, setQualityStats] = useState({ latency: 0, packetLoss: 0 });

// Установить callbacks WebRTC:
useEffect(() => {
  webrtcService.onIncomingCall = (from, callType) => {
    setIncomingCallFrom(from);
    setCallType(callType);
  };

  webrtcService.onQualityChange = (quality, stats) => {
    setCallQuality(quality);
    setQualityStats(stats);
  };
}, []);

// В JSX добавить компоненты:
{incomingCallFrom && (
  <IncomingCallModal
    callerName={getUserName(incomingCallFrom)}
    callerId={incomingCallFrom}
    callType={callType}
    onAccept={handleAcceptCall}
    onReject={handleRejectCall}
  />
)}

{isInCall && (
  <CallQualityIndicator
    quality={callQuality}
    latency={qualityStats.latency}
    packetLoss={qualityStats.packetLoss}
  />
)}
```

## 📝 Примечания

1. **Файл звонка**: Требуется добавить аудио файл `/public/sounds/incoming-call.mp3`
2. **Производительность**: Мониторинг качества работает каждые 2 секунды, можно изменить интервал
3. **STUN/TURN серверы**: Для работы за NAT нужны TURN серверы
4. **Браузерная совместимость**: Проверено в Chrome/Edge, Safari может требовать дополнительных разрешений

## 🎨 UI компоненты

Все компоненты используют Tailwind CSS и соответствуют дизайн-системе приложения:
- Градиенты: `from-pink-500 to-purple-600`
- Анимации: `animate-pulse`, `animate-in`
- Тени: `shadow-lg`, `shadow-2xl`
- Закругления: `rounded-xl`, `rounded-full`
