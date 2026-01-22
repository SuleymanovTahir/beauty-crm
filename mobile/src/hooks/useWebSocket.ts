import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { WS_URL } from '../constants/config';
import { useAuthStore } from '../store/authStore';

interface Message {
  id: string;
  type: 'chat' | 'notification' | 'status';
  content: string;
  sender_id?: number;
  sender_name?: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  messages: Message[];
  sendMessage: (content: string, recipientId?: string) => void;
  clearMessages: () => void;
}

type WebSocketEventHandler = (message: Message) => void;

export function useWebSocket(
  endpoint: string = '/ws/chat',
  onMessage?: WebSocketEventHandler
): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const connect = useCallback(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const wsUrl = `${WS_URL}${endpoint}?token=${token}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: Message = JSON.parse(event.data);

          setMessages((prev) => [...prev, message]);

          if (onMessage) {
            onMessage(message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  }, [endpoint, token, isAuthenticated, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Reconnect when app comes to foreground
        if (!isConnected && isAuthenticated) {
          connect();
        }
      } else if (nextAppState === 'background') {
        // Optionally disconnect when app goes to background
        // disconnect();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isConnected, isAuthenticated, connect]);

  // Connect on mount if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, connect, disconnect]);

  const sendMessage = useCallback(
    (content: string, recipientId?: string) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const message = {
          type: 'chat',
          content,
          recipient_id: recipientId,
          timestamp: new Date().toISOString(),
        };

        wsRef.current.send(JSON.stringify(message));
      } else {
        console.warn('WebSocket is not connected');
      }
    },
    []
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    isConnected,
    messages,
    sendMessage,
    clearMessages,
  };
}

// Hook for notifications WebSocket
export function useNotificationsWebSocket(
  onNotification?: (notification: Message) => void
): { isConnected: boolean; notifications: Message[] } {
  const { isConnected, messages } = useWebSocket('/ws/notifications', onNotification);

  return {
    isConnected,
    notifications: messages.filter((m) => m.type === 'notification'),
  };
}
