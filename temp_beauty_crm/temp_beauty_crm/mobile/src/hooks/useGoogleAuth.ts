import { useState, useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '../store/authStore';

// Complete auth session for web browser
WebBrowser.maybeCompleteAuthSession();

interface UseGoogleAuthReturn {
  signIn: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

// You need to configure these values in app.json and Google Cloud Console
const GOOGLE_CLIENT_ID_WEB = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_CLIENT_ID_IOS = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
const GOOGLE_CLIENT_ID_ANDROID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';

export function useGoogleAuth(): UseGoogleAuthReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const googleLogin = useAuthStore((state) => state.googleLogin);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_CLIENT_ID_WEB,
    iosClientId: GOOGLE_CLIENT_ID_IOS,
    androidClientId: GOOGLE_CLIENT_ID_ANDROID,
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    handleGoogleResponse();
  }, [response]);

  const handleGoogleResponse = async () => {
    if (response?.type === 'success') {
      setIsLoading(true);
      setError(null);

      try {
        const { authentication } = response;

        if (!authentication?.accessToken) {
          throw new Error('No access token received');
        }

        // Send token to backend for verification via store
        const result = await googleLogin(authentication.accessToken);

        if (!result.success) {
          setError(result.message || 'Ошибка авторизации через Google');
        }
      } catch (err) {
        console.error('Google auth error:', err);
        setError('Ошибка авторизации через Google');
      } finally {
        setIsLoading(false);
      }
    } else if (response?.type === 'error') {
      setError('Отменена авторизация через Google');
    }
  };

  const signIn = async () => {
    setError(null);

    if (!request) {
      setError('Google авторизация не настроена');
      return;
    }

    try {
      await promptAsync();
    } catch (err) {
      console.error('Error prompting Google auth:', err);
      setError('Ошибка запуска авторизации');
    }
  };

  return {
    signIn,
    isLoading,
    error,
  };
}
