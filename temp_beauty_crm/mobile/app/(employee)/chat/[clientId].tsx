import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../src/constants/colors';
import { useWebSocket } from '../../../src/hooks/useWebSocket';
import { useAuthStore } from '../../../src/store/authStore';
import { MessageBubble, ChatInput } from '../../../src/components/chat';
import { apiClient } from '../../../src/api/client';

interface Message {
  id: string;
  type: 'chat' | 'notification' | 'status';
  content: string;
  sender_id?: number;
  sender_name?: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

interface ClientInfo {
  id: number;
  full_name: string;
  phone?: string;
}

export default function ChatScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const colors = Colors.light;
  const flatListRef = useRef<FlatList>(null);

  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [historyMessages, setHistoryMessages] = useState<Message[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const user = useAuthStore((state) => state.user);

  const { isConnected, messages: wsMessages, sendMessage } = useWebSocket(
    `/ws/chat?client_id=${clientId}`
  );

  // Combine history and real-time messages
  const allMessages = [...historyMessages, ...wsMessages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Fetch client info
  useEffect(() => {
    const fetchClientInfo = async () => {
      try {
        const response = await apiClient.get<ClientInfo>(`/api/clients/${clientId}`);
        setClientInfo(response.data);
      } catch (error) {
        console.error('Error fetching client info:', error);
        // Demo data
        setClientInfo({
          id: parseInt(clientId || '0'),
          full_name: 'Клиент',
        });
      }
    };

    if (clientId) {
      fetchClientInfo();
    }
  }, [clientId]);

  // Fetch message history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await apiClient.get<Message[]>(
          `/api/employee/chats/${clientId}/messages`
        );
        setHistoryMessages(response.data);
      } catch (error) {
        console.error('Error fetching message history:', error);
        // Demo messages
        setHistoryMessages([
          {
            id: '1',
            type: 'chat',
            content: 'Добрый день! Хотела уточнить по записи на завтра.',
            sender_id: parseInt(clientId || '0'),
            sender_name: 'Клиент',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: '2',
            type: 'chat',
            content: 'Здравствуйте! Да, конечно, ваша запись на 14:00. Подтверждаю!',
            sender_id: user?.id,
            timestamp: new Date(Date.now() - 3500000).toISOString(),
          },
          {
            id: '3',
            type: 'chat',
            content: 'Отлично, спасибо!',
            sender_id: parseInt(clientId || '0'),
            sender_name: 'Клиент',
            timestamp: new Date(Date.now() - 3400000).toISOString(),
          },
        ]);
      } finally {
        setLoadingHistory(false);
      }
    };

    if (clientId) {
      fetchHistory();
    }
  }, [clientId, user?.id]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (allMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [allMessages.length]);

  const handleSend = useCallback(
    (content: string) => {
      sendMessage(content, clientId);

      // Optimistically add message to history
      const newMessage: Message = {
        id: Date.now().toString(),
        type: 'chat',
        content,
        sender_id: user?.id,
        timestamp: new Date().toISOString(),
      };
      setHistoryMessages((prev) => [...prev, newMessage]);
    },
    [sendMessage, clientId, user?.id]
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.sender_id === user?.id;

    return (
      <MessageBubble
        content={item.content}
        timestamp={item.timestamp}
        isOwn={isOwn}
        senderName={!isOwn ? item.sender_name : undefined}
      />
    );
  };

  const renderDateSeparator = (date: string) => (
    <View style={styles.dateSeparator}>
      <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
      <Text style={[styles.dateText, { color: colors.textSecondary }]}>{date}</Text>
      <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <TouchableOpacity
              style={styles.headerTitle}
              onPress={() => {
                if (clientId) {
                  router.push(`/(employee)/clients/${clientId}`);
                }
              }}
            >
              <View style={[styles.headerAvatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.headerAvatarText}>
                  {clientInfo ? getInitials(clientInfo.full_name) : '??'}
                </Text>
              </View>
              <View style={styles.headerInfo}>
                <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
                  {clientInfo?.full_name || 'Загрузка...'}
                </Text>
                <Text style={[styles.headerStatus, { color: isConnected ? colors.success : colors.textSecondary }]}>
                  {isConnected ? 'В сети' : 'Не в сети'}
                </Text>
              </View>
            </TouchableOpacity>
          ),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      {loadingHistory ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={allMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Начните диалог с клиентом
              </Text>
            </View>
          )}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }}
        />
      )}

      <ChatInput
        onSend={handleSend}
        disabled={!isConnected}
        placeholder={isConnected ? 'Введите сообщение...' : 'Подключение...'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerInfo: {
    marginLeft: 10,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerStatus: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingVertical: 16,
    flexGrow: 1,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  dateLine: {
    flex: 1,
    height: 1,
  },
  dateText: {
    fontSize: 12,
    marginHorizontal: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },
});
