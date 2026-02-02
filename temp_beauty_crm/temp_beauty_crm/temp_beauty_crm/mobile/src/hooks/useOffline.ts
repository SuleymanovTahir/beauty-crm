import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PendingAction {
  id: string;
  type: 'CREATE_BOOKING' | 'CANCEL_BOOKING' | 'UPDATE_PROFILE';
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

interface UseOfflineReturn {
  isOnline: boolean;
  isConnected: boolean;
  pendingActions: PendingAction[];
  addPendingAction: (action: Omit<PendingAction, 'id' | 'timestamp' | 'retryCount'>) => Promise<void>;
  syncPendingActions: () => Promise<void>;
  clearPendingActions: () => Promise<void>;
}

const PENDING_ACTIONS_KEY = '@beauty_crm_pending_actions';
const MAX_RETRY_COUNT = 3;

// Simple UUID generator
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useOffline(): UseOfflineReturn {
  const [isOnline, setIsOnline] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);

  // Load pending actions on mount
  useEffect(() => {
    loadPendingActions();
  }, []);

  // Subscribe to network state changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasOffline = !isOnline;
      const nowOnline = state.isConnected ?? true;

      setIsOnline(nowOnline);
      setIsConnected(state.isInternetReachable ?? true);

      // Sync when coming back online
      if (wasOffline && nowOnline) {
        syncPendingActions();
      }
    });

    return () => unsubscribe();
  }, [isOnline]);

  const loadPendingActions = async () => {
    try {
      const stored = await AsyncStorage.getItem(PENDING_ACTIONS_KEY);
      if (stored) {
        setPendingActions(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading pending actions:', error);
    }
  };

  const savePendingActions = async (actions: PendingAction[]) => {
    try {
      await AsyncStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(actions));
      setPendingActions(actions);
    } catch (error) {
      console.error('Error saving pending actions:', error);
    }
  };

  const addPendingAction = useCallback(
    async (action: Omit<PendingAction, 'id' | 'timestamp' | 'retryCount'>) => {
      const newAction: PendingAction = {
        ...action,
        id: generateId(),
        timestamp: Date.now(),
        retryCount: 0,
      };

      const updated = [...pendingActions, newAction];
      await savePendingActions(updated);
    },
    [pendingActions]
  );

  const removePendingAction = async (actionId: string) => {
    const updated = pendingActions.filter((a) => a.id !== actionId);
    await savePendingActions(updated);
  };

  const updatePendingAction = async (actionId: string, updates: Partial<PendingAction>) => {
    const updated = pendingActions.map((a) =>
      a.id === actionId ? { ...a, ...updates } : a
    );
    await savePendingActions(updated);
  };

  const syncPendingActions = useCallback(async () => {
    if (!isOnline || pendingActions.length === 0) return;

    console.log(`Syncing ${pendingActions.length} pending actions...`);

    for (const action of pendingActions) {
      try {
        await executeAction(action);
        await removePendingAction(action.id);
        console.log(`Action ${action.id} synced successfully`);
      } catch (error) {
        console.error(`Error syncing action ${action.id}:`, error);

        if (action.retryCount >= MAX_RETRY_COUNT) {
          // Remove action after max retries
          await removePendingAction(action.id);
          console.log(`Action ${action.id} removed after max retries`);
        } else {
          // Increment retry count
          await updatePendingAction(action.id, {
            retryCount: action.retryCount + 1,
          });
        }
      }
    }
  }, [isOnline, pendingActions]);

  const clearPendingActions = async () => {
    await AsyncStorage.removeItem(PENDING_ACTIONS_KEY);
    setPendingActions([]);
  };

  return {
    isOnline,
    isConnected,
    pendingActions,
    addPendingAction,
    syncPendingActions,
    clearPendingActions,
  };
}

async function executeAction(action: PendingAction): Promise<void> {
  const { default: apiClient } = await import('../api/client');

  switch (action.type) {
    case 'CREATE_BOOKING':
      await apiClient.post('/api/client/bookings', action.data);
      break;

    case 'CANCEL_BOOKING':
      await apiClient.post(`/api/client/bookings/${action.data.booking_id}/cancel`);
      break;

    case 'UPDATE_PROFILE':
      await apiClient.post('/api/client/profile', action.data);
      break;

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

// Export singleton for network status
let networkStatus = {
  isOnline: true,
  isConnected: true,
};

NetInfo.addEventListener((state) => {
  networkStatus = {
    isOnline: state.isConnected ?? true,
    isConnected: state.isInternetReachable ?? true,
  };
});

export function getNetworkStatus() {
  return networkStatus;
}
