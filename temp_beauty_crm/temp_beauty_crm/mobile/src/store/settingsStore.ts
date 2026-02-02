import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setLanguage, getCurrentLanguage } from '../i18n';

interface SettingsState {
  language: string;
  theme: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
  isLoading: boolean;
}

interface SettingsActions {
  setLanguage: (language: string) => Promise<void>;
  setTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  loadSettings: () => Promise<void>;
}

type SettingsStore = SettingsState & SettingsActions;

const SETTINGS_KEY = '@beauty_crm_settings';

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  language: 'ru',
  theme: 'light',
  notificationsEnabled: true,
  isLoading: true,

  setLanguage: async (language: string) => {
    await setLanguage(language);
    set({ language });
    await saveSettings(get());
  },

  setTheme: async (theme: 'light' | 'dark' | 'system') => {
    set({ theme });
    await saveSettings(get());
  },

  setNotificationsEnabled: async (enabled: boolean) => {
    set({ notificationsEnabled: enabled });
    await saveSettings(get());
  },

  loadSettings: async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        set({
          language: settings.language || 'ru',
          theme: settings.theme || 'light',
          notificationsEnabled: settings.notificationsEnabled ?? true,
        });

        // Apply language
        if (settings.language) {
          await setLanguage(settings.language);
        }
      } else {
        // Use current i18n language
        set({ language: getCurrentLanguage() });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));

async function saveSettings(state: SettingsState): Promise<void> {
  try {
    const settings = {
      language: state.language,
      theme: state.theme,
      notificationsEnabled: state.notificationsEnabled,
    };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}
