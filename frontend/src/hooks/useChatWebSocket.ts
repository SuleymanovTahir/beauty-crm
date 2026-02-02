/**
 * Hook для работы с WebSocket чата
 * Заменяет HTTP polling для real-time сообщений в Chat.tsx
 */
import { useEffect, useRef, useState, useCallback } from 'react';

interface ChatWSMessage {
    type: 'new_message' | 'typing' | 'connected' | 'pong' | 'error';
    client_id?: string;
    message?: any;
    is_typing?: boolean;
    timestamp?: string;
}

interface UseChatWebSocketOptions {
    userId: number | null;
    onNewMessage?: (clientId: string, message: any) => void;
    onTyping?: (clientId: string, isTyping: boolean) => void;
    onConnected?: () => void;
    onDisconnected?: () => void;
    autoReconnect?: boolean;
    reconnectInterval?: number;
}

export const useChatWebSocket = ({
    userId,
    onNewMessage,
    onTyping,
    onConnected,
    onDisconnected,
    autoReconnect = true,
    reconnectInterval = 5000
}: UseChatWebSocketOptions) => {
    // Store callbacks in refs to avoid reconnection on re-renders
    const onNewMessageRef = useRef(onNewMessage);
    const onTypingRef = useRef(onTyping);
    const onConnectedRef = useRef(onConnected);
    const onDisconnectedRef = useRef(onDisconnected);

    // Update refs when props change
    useEffect(() => {
        onNewMessageRef.current = onNewMessage;
        onTypingRef.current = onTyping;
        onConnectedRef.current = onConnected;
        onDisconnectedRef.current = onDisconnected;
    }, [onNewMessage, onTyping, onConnected, onDisconnected]);

    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const connect = useCallback(() => {
        if (!userId || wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        // Предполагаем, что бэкенд проксируется через /api или мы на том же домене
        const wsUrl = `${protocol}//${host}/api/ws/chat`;

        console.log('💬 [Chat WS] Connecting to:', wsUrl);

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('💬 [Chat WS] Connected');

            // Отправляем аутентификацию
            ws.send(JSON.stringify({
                type: 'auth',
                user_id: userId
            }));
        };

        ws.onmessage = (event) => {
            try {
                const data: ChatWSMessage = JSON.parse(event.data);

                switch (data.type) {
                    case 'connected':
                        console.log('💬 [Chat WS] Authenticated');
                        setIsConnected(true);
                        if (onConnectedRef.current) onConnectedRef.current();

                        // Начинаем ping для поддержания соединения
                        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
                        pingIntervalRef.current = setInterval(() => {
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({ type: 'ping' }));
                            }
                        }, 30000);
                        break;

                    case 'new_message':
                        console.log('💬 [Chat WS] New message for client:', data.client_id);
                        if (data.client_id && data.message) {
                            if (onNewMessageRef.current) onNewMessageRef.current(data.client_id, data.message);
                        }
                        break;

                    case 'typing':
                        if (data.client_id) {
                            if (onTypingRef.current) onTypingRef.current(data.client_id, !!data.is_typing);
                        }
                        break;

                    case 'pong':
                        break;

                    case 'error':
                        console.error('💬 [Chat WS] Error:', data.message);
                        break;

                    default:
                        console.warn('💬 [Chat WS] Unknown message type:', data.type);
                }
            } catch (error) {
                console.error('💬 [Chat WS] Error parsing message:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('💬 [Chat WS] Error:', error);
        };

        ws.onclose = () => {
            console.log('💬 [Chat WS] Disconnected');
            setIsConnected(false);
            if (onDisconnectedRef.current) onDisconnectedRef.current();

            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = null;
            }

            if (autoReconnect && userId) {
                reconnectTimeoutRef.current = setTimeout(() => {
                    connect();
                }, reconnectInterval);
            }
        };

        wsRef.current = ws;
    }, [userId, autoReconnect, reconnectInterval]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (userId) {
            connect();
        }
        return () => disconnect();
    }, [userId, connect, disconnect]);

    return { isConnected, disconnect };
};
