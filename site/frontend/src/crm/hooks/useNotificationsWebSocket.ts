/**
 * Hook для работы с WebSocket уведомлений
 * Заменяет HTTP polling для real-time обновлений
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { buildWebSocketUrl } from '../api/client';

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
  // Store callbacks in refs to avoid reconnection on re-renders
  const onNotificationRef = useRef(onNotification);
  const onUnreadCountUpdateRef = useRef(onUnreadCountUpdate);
  const onConnectedRef = useRef(onConnected);
  const onDisconnectedRef = useRef(onDisconnected);

  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const manualCloseRef = useRef(false);
  const shouldReconnectRef = useRef(true);
  const maxReconnectAttempts = 10;

  // Update refs when props change
  useEffect(() => {
    onNotificationRef.current = onNotification;
    onUnreadCountUpdateRef.current = onUnreadCountUpdate;
    onConnectedRef.current = onConnected;
    onDisconnectedRef.current = onDisconnected;
  }, [onNotification, onUnreadCountUpdate, onConnected, onDisconnected]);

  const connect = useCallback(() => {
    const readyState = wsRef.current?.readyState;
    if (!userId || readyState === WebSocket.OPEN || readyState === WebSocket.CONNECTING) {
      return;
    }

    // Prevent infinite reconnection attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.warn('🔔 [Notifications WS] Max reconnection attempts reached. Stopping.');
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const endpoint = buildWebSocketUrl('/api/ws/notifications');

    console.log(`🔔 [Notifications WS] Connecting to: ${endpoint} (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);

    try {
      manualCloseRef.current = false;
      const ws = new WebSocket(endpoint);
      let connectionTimeout: NodeJS.Timeout;

      // Set connection timeout (10 seconds)
      connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.warn('🔔 [Notifications WS] Connection timeout');
          ws.close(4000, 'connection_timeout');
        }
      }, 10000);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        if (manualCloseRef.current) {
          ws.close(1000, 'manual_disconnect');
          return;
        }
        console.log('🔔 [Notifications WS] Connected');
        reconnectAttemptsRef.current = 0; // Reset on successful connection

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
              if (onConnectedRef.current) onConnectedRef.current();

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
              if (onNotificationRef.current) onNotificationRef.current(message.data);
              break;

            case 'unread_count':
              if (typeof message.count === 'number') {
                setUnreadCount(message.count);
                if (onUnreadCountUpdateRef.current) onUnreadCountUpdateRef.current(message.count);
              }
              break;

            case 'pong':
              // Ответ на ping - соединение живо
              break;

            case 'error':
              console.error('🔔 [Notifications WS] Server error:', message.message);
              break;

            default:
              console.warn('🔔 [Notifications WS] Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('🔔 [Notifications WS] Error parsing message:', error);
        }
      };

      ws.onerror = () => {
        clearTimeout(connectionTimeout);
        if (manualCloseRef.current || !shouldReconnectRef.current) {
          return;
        }
        console.error('🔔 [Notifications WS] Connection error');
        // Do not increment attempts immediately here, wait for onclose
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log(`🔔 [Notifications WS] Disconnected (code: ${event.code}, reason: ${event.reason})`);
        setIsConnected(false);
        if (onDisconnectedRef.current) onDisconnectedRef.current();

        // Очищаем ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        if (wsRef.current === ws) {
          wsRef.current = null;
        }

        if (manualCloseRef.current || !shouldReconnectRef.current) {
          manualCloseRef.current = false;
          return;
        }

        // Автоматическое переподключение с exponential backoff
        if (autoReconnect && userId && reconnectAttemptsRef.current < maxReconnectAttempts && shouldReconnectRef.current) {
          reconnectAttemptsRef.current++;
          // Exponential backoff: 5s, 10s, 20s, 40s, max 60s
          const delay = Math.min(reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1), 60000);
          console.log(`🔔 [Notifications WS] Reconnecting in ${delay}ms... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('🔔 [Notifications WS] Failed to create WebSocket:', error);
      reconnectAttemptsRef.current++;
    }
  }, [userId, autoReconnect, reconnectInterval]); // Removed callback dependencies!

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    manualCloseRef.current = true;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (wsRef.current) {
      const ws = wsRef.current;
      wsRef.current = null;

      if (ws.readyState === WebSocket.CONNECTING) {
        ws.onopen = () => {
          ws.close(1000, 'manual_disconnect');
        };
        return;
      }

      ws.close(1000, 'manual_disconnect');
    }
  }, []);

  const requestUnreadCount = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'request_count' }));
    }
  }, []);

  useEffect(() => {
    if (userId) {
      shouldReconnectRef.current = true;
      connect();
    } else {
      shouldReconnectRef.current = false;
      disconnect();
    }

    return () => {
      shouldReconnectRef.current = false;
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
