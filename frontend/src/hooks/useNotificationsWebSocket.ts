/**
 * Hook для работы с WebSocket уведомлений
 * Заменяет HTTP polling для real-time обновлений
 */
import { useEffect, useRef, useState, useCallback } from 'react';

interface NotificationMessage {
  type: 'notification' | 'unread_count' | 'connected' | 'pong' | 'error';
  data?: any;
  count?: number;
  message?: string;
  timestamp?: string;
}

interface UseNotificationsWebSocketOptions {
  userId: number | null;
  onNotification?: (data: any) => void;
  onUnreadCountUpdate?: (count: number) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export const useNotificationsWebSocket = ({
  userId,
  onNotification,
  onUnreadCountUpdate,
  onConnected,
  onDisconnected,
  autoReconnect = true,
  reconnectInterval = 5000
}: UseNotificationsWebSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!userId || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const port = window.location.port || (protocol === 'wss:' ? '443' : '80');
    const wsUrl = `${protocol}//${window.location.hostname}${port !== '443' && port !== '80' ? ':' + port : ''}/api/ws/notifications`;

    console.log('🔔 [Notifications WS] Connecting to:', wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('🔔 [Notifications WS] Connected');

      // Отправляем аутентификацию
      ws.send(JSON.stringify({
        type: 'auth',
        user_id: userId
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message: NotificationMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'connected':
            console.log('🔔 [Notifications WS] Authenticated');
            setIsConnected(true);
            onConnected?.();

            // Запрашиваем текущее количество непрочитанных
            ws.send(JSON.stringify({ type: 'request_count' }));

            // Начинаем ping каждые 30 секунд для поддержания соединения
            if (pingIntervalRef.current) {
              clearInterval(pingIntervalRef.current);
            }
            pingIntervalRef.current = setInterval(() => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ping' }));
              }
            }, 30000);
            break;

          case 'notification':
            console.log('🔔 [Notifications WS] New notification:', message.data);
            onNotification?.(message.data);
            break;

          case 'unread_count':
            console.log('🔔 [Notifications WS] Unread count update:', message.count);
            if (typeof message.count === 'number') {
              setUnreadCount(message.count);
              onUnreadCountUpdate?.(message.count);
            }
            break;

          case 'pong':
            // Ответ на ping - соединение живо
            break;

          case 'error':
            console.error('🔔 [Notifications WS] Error:', message.message);
            break;

          default:
            console.warn('🔔 [Notifications WS] Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('🔔 [Notifications WS] Error parsing message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('🔔 [Notifications WS] Error:', error);
    };

    ws.onclose = () => {
      console.log('🔔 [Notifications WS] Disconnected');
      setIsConnected(false);
      onDisconnected?.();

      // Очищаем ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      // Автоматическое переподключение
      if (autoReconnect && userId) {
        console.log(`🔔 [Notifications WS] Reconnecting in ${reconnectInterval}ms...`);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    };

    wsRef.current = ws;
  }, [userId, onNotification, onUnreadCountUpdate, onConnected, onDisconnected, autoReconnect, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const requestUnreadCount = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'request_count' }));
    }
  }, []);

  useEffect(() => {
    if (userId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [userId, connect, disconnect]);

  return {
    isConnected,
    unreadCount,
    requestUnreadCount,
    disconnect
  };
};
