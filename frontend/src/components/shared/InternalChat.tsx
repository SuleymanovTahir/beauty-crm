import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Loader,
  MessageCircle,
  Search,
  Paperclip,
  Image as ImageIcon,
  Video,
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  VideoOff,
  X,
  MoreVertical,
  Reply,
  Copy,
  Forward,
  ArrowLeft,
  FileText,
  Smile,
  Trash2,
  Square,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { webrtcService, CallType } from '../../services/webrtc';
import { getDynamicAvatar } from '../../utils/avatarUtils';
import { getPhotoUrl } from '../../utils/photoUtils';
import AudioPlayer from './AudioPlayer';
import IncomingCallModal from '../calls/IncomingCallModal';
import CallQualityIndicator, { ConnectionQuality } from '../calls/CallQualityIndicator';

interface Message {
  id: number;
  from_user_id: number;
  to_user_id: number;
  message: string;
  is_read: boolean;
  created_at: string;
  sender_name: string;
  recipient_name: string;
  type?: 'text' | 'image' | 'video' | 'audio' | 'voice' | 'file';
}

interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
  email?: string;
  photo?: string;
  photo_url?: string;
  is_online?: boolean;
  last_seen?: string;
}

interface VoiceRecorder {
  mediaRecorder: MediaRecorder | null;
  audioChunks: Blob[];
  isRecording: boolean;
  recordingTime: number;
}

export default function InternalChat() {
  const { t } = useTranslation(['common', 'layouts/mainlayout']);
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState<number | null>(null);
  const [showMobileUserList, setShowMobileUserList] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Voice recording state
  const [voiceRecorder, setVoiceRecorder] = useState<VoiceRecorder>({
    mediaRecorder: null,
    audioChunks: [],
    isRecording: false,
    recordingTime: 0,
  });

  // Video/Audio call state
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState<CallType | null>(null);
  const [incomingCallFrom, setIncomingCallFrom] = useState<number | null>(null);
  const [incomingCallType, setIncomingCallType] = useState<CallType | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('good');
  const [qualityStats, setQualityStats] = useState({ latency: 0, packetLoss: 0 });
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ from: number; type: CallType } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentUserData = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadMessagesWithUser(selectedUser.id);
      const interval = setInterval(() => loadMessagesWithUser(selectedUser.id), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize WebRTC service
  useEffect(() => {
    if (currentUserData?.id) {
      webrtcService.initialize(currentUserData.id).catch(err => {
        console.error('Failed to initialize WebRTC:', err);
        // Don't show error to user, WebRTC is optional
      });

      // Set up WebRTC callbacks
      webrtcService.onIncomingCall = (fromUserId: number, type: CallType) => {
        const caller = users.find(u => u.id === fromUserId);
        if (caller) {
          setIncomingCallFrom(fromUserId);
          setIncomingCallType(type);
          setIncomingCall({ from: fromUserId, type });
        }
      };

      webrtcService.onQualityChange = (quality, stats) => {
        setConnectionQuality(quality);
        setQualityStats(stats);
      };

      webrtcService.onCallAccepted = () => {
        setIsInCall(true);
        toast.success('✅ Звонок принят');
      };

      webrtcService.onCallRejected = () => {
        setIsInCall(false);
        setIncomingCall(null);
        toast.error('❌ Звонок отклонен');
      };

      webrtcService.onRemoteStream = (stream: MediaStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      };

      webrtcService.onCallEnded = () => {
        setIsInCall(false);
        setCallType(null);
        setIncomingCall(null);
        setIsMicMuted(false);
        setIsVideoOff(false);
        toast.info('📞 Звонок завершен');
      };

      webrtcService.onError = (error: string) => {
        toast.error(error);
      };

      return () => {
        webrtcService.disconnect();
      };
    }
  }, [currentUserData?.id, users]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/internal-chat/users', { credentials: 'include' });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setUsers(data.users || []);
    } catch (err) {
      console.error('Error loading users:', err);
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(errorMessage);
      toast.error(t('common:error_loading_data', 'Ошибка загрузки данных'));
    } finally {
      setLoading(false);
    }
  };

  const loadMessagesWithUser = async (userId: number) => {
    try {
      const response = await fetch(`/api/internal-chat/messages?with_user_id=${userId}`, {
        credentials: 'include'
      });
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const handleSendMessage = async (messageText?: string, messageType: Message['type'] = 'text', fileUrl?: string) => {
    const textToSend = messageText || newMessage;

    if ((!textToSend.trim() && !fileUrl) || !selectedUser) {
      toast.error(t('common:select_user_first', 'Выберите пользователя'));
      return;
    }

    try {
      setSending(true);

      let finalMessage = textToSend;

      // Add reply prefix if replying
      if (replyToMessage && !fileUrl) {
        const quotedText = replyToMessage.message.length > 50
          ? replyToMessage.message.substring(0, 50) + '...'
          : replyToMessage.message;
        finalMessage = `↩️ Ответ на: "${quotedText}"\n\n${textToSend}`;
      }

      const response = await fetch('/api/internal-chat/send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: fileUrl || finalMessage,
          to_user_id: selectedUser.id,
          type: messageType // Добавляем тип сообщения
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Add message to local state immediately
      const newMsg: Message = {
        id: Date.now(),
        from_user_id: currentUserData.id,
        to_user_id: selectedUser.id,
        message: fileUrl || finalMessage,
        is_read: false,
        created_at: new Date().toISOString(),
        sender_name: currentUserData.full_name || currentUserData.username,
        recipient_name: selectedUser.full_name,
        type: messageType
      };

      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      setReplyToMessage(null);
      setAttachedFiles([]);

      toast.success('✅ Отправлено');
      await loadMessagesWithUser(selectedUser.id);
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error(t('common:error_sending_message', 'Ошибка отправки сообщения'));
    } finally {
      setSending(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && selectedUser) {
      const files = Array.from(e.target.files);

      for (const file of files) {
        try {
          setIsUploadingFile(true);
          const formData = new FormData();
          formData.append('file', file);

          const uploadResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });

          if (!uploadResponse.ok) throw new Error('Upload failed');

          const { file_url } = await uploadResponse.json();
          const fileType = file.type.startsWith('image/') ? 'image' :
            file.type.startsWith('video/') ? 'video' : 'file';

          await handleSendMessage('', fileType, file_url);
          toast.success(`✅ ${file.name}`);
        } catch (err) {
          console.error(err);
          toast.error(`❌ Ошибка: ${file.name}`);
        }
      }

      setIsUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && selectedUser) {
      const files = Array.from(e.target.files);

      for (const file of files) {
        try {
          setIsUploadingFile(true);
          const formData = new FormData();
          formData.append('file', file);

          const uploadResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });

          if (!uploadResponse.ok) throw new Error('Upload failed');

          const { file_url } = await uploadResponse.json();
          await handleSendMessage(file.name, 'file', file_url);
          toast.success(`✅ ${file.name}`);
        } catch (err) {
          console.error(err);
          toast.error(`❌ Ошибка: ${file.name}`);
        }
      }

      setIsUploadingFile(false);
      e.target.value = '';
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];
      let isCancelled = false; // Flag to track if recording was cancelled

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        // If cancelled, just clean up and don't send
        if (isCancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const file = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });

        try {
          setIsUploadingFile(true);
          const formData = new FormData();
          formData.append('file', file);

          const uploadResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });

          if (!uploadResponse.ok) throw new Error('Upload failed');

          const { file_url } = await uploadResponse.json();
          await handleSendMessage('Голосовое сообщение', 'voice', file_url);
          toast.success('✅ Голосовое сообщение отправлено');
        } catch (err) {
          console.error(err);
          toast.error('❌ Ошибка отправки голосового');
        } finally {
          setIsUploadingFile(false);
        }

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();

      const intervalId = setInterval(() => {
        setVoiceRecorder(prev => ({
          ...prev,
          recordingTime: prev.recordingTime + 1
        }));
      }, 1000);

      recordingIntervalRef.current = intervalId;

      setVoiceRecorder({
        mediaRecorder,
        audioChunks,
        isRecording: true,
        recordingTime: 0
      });

      // Store cancel function that sets the flag
      (mediaRecorder as any)._cancelRecording = () => {
        isCancelled = true;
      };

      toast.info('🎤 Запись началась');
    } catch (err) {
      console.error('Error starting recording:', err);
      toast.error('❌ Нет доступа к микрофону');
    }
  };

  const stopVoiceRecording = () => {
    if (voiceRecorder.mediaRecorder && voiceRecorder.isRecording) {
      voiceRecorder.mediaRecorder.stop();
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      setVoiceRecorder({
        mediaRecorder: null,
        audioChunks: [],
        isRecording: false,
        recordingTime: 0
      });
    }
  };

  const cancelVoiceRecording = () => {
    if (voiceRecorder.mediaRecorder && voiceRecorder.isRecording) {
      // Set cancel flag before stopping
      if ((voiceRecorder.mediaRecorder as any)._cancelRecording) {
        (voiceRecorder.mediaRecorder as any)._cancelRecording();
      }

      voiceRecorder.mediaRecorder.stop();
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      // Clear audio chunks to prevent sending
      setVoiceRecorder({
        mediaRecorder: null,
        audioChunks: [],
        isRecording: false,
        recordingTime: 0
      });
      toast.info('🚫 Запись отменена');
    }
  };

  const getUserAvatar = (user: User) => {
    // If user has photo, use it
    if (user.photo) {
      return getPhotoUrl(user.photo);
    }
    // Otherwise use dynamic avatar
    return getDynamicAvatar(user.full_name || user.username, 'warm');
  };

  const startCall = async (type: CallType) => {
    if (!selectedUser) return;

    try {
      setCallType(type);
      await webrtcService.startCall(selectedUser.id, type);

      // Set local video stream
      const localStream = webrtcService.getLocalStream();
      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
      }

      toast.success(`📞 Звоним ${selectedUser.full_name}...`);
    } catch (err) {
      console.error('Error starting call:', err);
      toast.error('❌ Ошибка при начале звонка');
    }
  };

  const acceptCall = async () => {
    try {
      await webrtcService.acceptCall();
      setCallType(incomingCall?.type || 'audio');
      setIncomingCall(null);

      // Set local video stream
      const localStream = webrtcService.getLocalStream();
      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
      }
    } catch (err) {
      console.error('Error accepting call:', err);
      toast.error('❌ Ошибка при приёме звонка');
    }
  };

  const rejectCall = () => {
    webrtcService.rejectCall();
    setIncomingCall(null);
    setIncomingCallFrom(null);
    setIncomingCallType(null);
  };

  const handleAcceptCall = acceptCall;
  const handleRejectCall = rejectCall;

  const endCall = () => {
    webrtcService.endCall();
    setIsInCall(false);
    setCallType(null);
    setIsMicMuted(false);
    setIsVideoOff(false);
  };

  const toggleMic = () => {
    const localStream = webrtcService.getLocalStream();
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    const localStream = webrtcService.getLocalStream();
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getImageUrl = (msg: Message) => {
    if (msg.message.startsWith('http')) {
      return msg.message;
    }
    return `${import.meta.env.VITE_API_URL}${msg.message}`;
  };

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center shadow-2xl">
            <X className="w-8 h-8 text-white" />
          </div>
          <p className="text-foreground font-medium">Ошибка загрузки</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              loadData();
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-2xl">
            <Loader className="w-8 h-8 text-white animate-spin" />
          </div>
          <p className="text-muted-foreground font-medium">
            {t('common:loading', 'Загрузка')}...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-background">
      {/* Incoming Call Modal */}
      {incomingCall && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-border">
            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-lg">
                {users.find(u => u.id === incomingCall.from)?.full_name.charAt(0).toUpperCase()}
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                {users.find(u => u.id === incomingCall.from)?.full_name}
              </h3>
              <p className="text-muted-foreground">
                {incomingCall.type === 'video' ? '📹 Видеозвонок' : '📞 Аудиозвонок'}
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={rejectCall}
                className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
              >
                <PhoneOff className="w-5 h-5" />
                Отклонить
              </button>
              <button
                onClick={acceptCall}
                className="flex-1 py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Phone className="w-5 h-5" />
                Принять
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Overlay */}
      {isInCall && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
          <div className="text-white text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">{selectedUser?.full_name}</h2>
            <p className="text-gray-300">{callType === 'video' ? 'Видеозвонок' : 'Аудиозвонок'}</p>
          </div>

          {callType === 'video' ? (
            <div className="relative w-full max-w-4xl aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`absolute bottom-4 right-4 w-48 aspect-video bg-gray-800 rounded-lg object-cover border-2 border-white shadow-lg ${
                  isVideoOff ? 'hidden' : ''
                }`}
              />
              {isVideoOff && (
                <div className="absolute bottom-4 right-4 w-48 aspect-video bg-gray-800 rounded-lg flex items-center justify-center border-2 border-white shadow-lg">
                  <VideoOff className="w-12 h-12 text-white" />
                </div>
              )}
            </div>
          ) : (
            <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-5xl font-bold shadow-2xl">
              {selectedUser?.full_name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="mt-8 flex gap-4">
            <button
              onClick={toggleMic}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-all shadow-lg ${
                isMicMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title={isMicMuted ? 'Включить микрофон' : 'Выключить микрофон'}
            >
              {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {callType === 'video' && (
              <button
                onClick={toggleVideo}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-all shadow-lg ${
                  isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title={isVideoOff ? 'Включить видео' : 'Выключить видео'}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
            )}

            <button
              onClick={endCall}
              className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-all shadow-lg scale-110"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className={`
        ${selectedUser && !showMobileUserList ? 'hidden md:flex' : 'flex'}
        flex-col w-full md:w-80 border-r border-border bg-card
      `}>
        <div className="p-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-primary" />
            {t('layouts/mainlayout:menu.internal_chat', 'Внутренняя связь')}
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              {t('common:no_users_available', 'Нет доступных пользователей')}
            </div>
          ) : (
            filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => {
                  setSelectedUser(user);
                  setShowMobileUserList(false);
                }}
                className={`w-full p-4 flex items-center gap-3 border-b border-border hover:bg-accent transition-colors ${
                  selectedUser?.id === user.id ? 'bg-accent' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg flex-shrink-0">
                  <img
                    src={getUserAvatar(user)}
                    alt={user.full_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.full_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedUser ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg text-foreground font-medium">
                {t('common:select_user_to_chat', 'Выберите пользователя для начала чата')}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {t('common:choose_from_list', 'Выберите сотрудника из списка слева')}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  onClick={() => setShowMobileUserList(true)}
                  className="md:hidden p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg flex-shrink-0 ring-2 ring-white/30">
                  <img
                    src={getUserAvatar(selectedUser)}
                    alt={selectedUser.full_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white truncate text-sm">
                    {selectedUser.full_name}
                  </p>
                  <p className="text-xs text-white/70 truncate capitalize">
                    {selectedUser.role}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => startCall('audio')}
                  disabled={isInCall}
                  className="p-2 text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                  title="Аудиозвонок"
                >
                  <Phone className="w-5 h-5" />
                </button>
                <button
                  onClick={() => startCall('video')}
                  disabled={isInCall}
                  className="p-2 text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                  title="Видеозвонок"
                >
                  <Video className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">

              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground mt-20">
                  <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p>{t('common:no_messages_yet', 'Нет сообщений')}</p>
                  <p className="text-sm">
                    {t('common:start_conversation', 'Начните разговор')}
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.from_user_id === currentUserData.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-2 group ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <div className={`relative max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
                        {!isOwn && (
                          <p className="text-xs text-muted-foreground mb-1 ml-2">
                            {msg.sender_name}
                          </p>
                        )}

                        <div
                          className={`rounded-2xl px-4 py-2 shadow-sm ${
                            isOwn
                              ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          {/* Reply Preview */}
                          {msg.message.includes('↩️ Ответ на:') && (
                            <div className="border-l-2 border-current/20 bg-current/5 px-2.5 py-1.5 mb-2 rounded">
                              <p className="text-xs opacity-80 line-clamp-2">
                                {msg.message.split('\n\n')[0].replace('↩️ Ответ на: "', '').replace('"', '')}
                              </p>
                            </div>
                          )}

                          {msg.type === 'image' ? (
                            <img
                              src={getImageUrl(msg)}
                              alt="Image"
                              className="max-w-full rounded-lg cursor-pointer hover:opacity-90"
                              onClick={() => window.open(getImageUrl(msg), '_blank')}
                            />
                          ) : msg.type === 'video' ? (
                            <video
                              src={getImageUrl(msg)}
                              controls
                              className="max-w-full rounded-lg"
                            />
                          ) : msg.type === 'voice' || msg.type === 'audio' ? (
                            <div className="min-w-[280px]">
                              <AudioPlayer src={getImageUrl(msg)} />
                            </div>
                          ) : msg.type === 'file' ? (
                            <a
                              href={getImageUrl(msg)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 hover:underline"
                            >
                              <FileText className="w-5 h-5" />
                              <span className="text-sm">Открыть файл</span>
                            </a>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {msg.message.includes('↩️ Ответ на:')
                                ? msg.message.split('\n\n')[1] || msg.message
                                : msg.message
                              }
                            </p>
                          )}
                        </div>

                        <div className={`mt-1 flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <p className="text-[10px] text-muted-foreground px-2">
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>

                      {/* Actions Menu */}
                      <div className={`flex items-center self-center opacity-0 group-hover:opacity-100 transition-opacity ${
                        isOwn ? 'order-first' : 'order-last'
                      }`}>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveActionMenuId(activeActionMenuId === msg.id ? null : msg.id);
                            }}
                            className="p-2 bg-card rounded-full shadow-lg border border-border hover:bg-accent transition-all"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeActionMenuId === msg.id && (
                            <div className={`absolute bottom-full mb-2 flex items-center gap-0.5 bg-card rounded-full shadow-xl border border-border p-1 z-50 ${
                              isOwn ? 'right-0' : 'left-0'
                            }`}>
                              <button
                                onClick={() => {
                                  setReplyToMessage(msg);
                                  toast.info('💬 Напишите ответ');
                                  setActiveActionMenuId(null);
                                }}
                                className="p-2 hover:bg-accent rounded-full transition-all"
                                title="Ответить"
                              >
                                <Reply className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(msg.message);
                                  toast.success('📋 Текст скопирован');
                                  setActiveActionMenuId(null);
                                }}
                                className="p-2 hover:bg-accent rounded-full transition-all"
                                title="Копировать"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Preview */}
            {replyToMessage && (
              <div className="px-4 py-2 bg-accent">
                <div className="flex items-start gap-3 max-w-xl">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Reply className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-xs font-bold text-foreground">
                        Ответ на {replyToMessage.sender_name}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate italic">
                      "{replyToMessage.message.substring(0, 100)}"
                    </p>
                  </div>
                  <button
                    onClick={() => setReplyToMessage(null)}
                    className="p-1 hover:bg-background rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 bg-card border-t border-border">
              {voiceRecorder.isRecording ? (
                /* WhatsApp-style Voice Recording UI */
                <div className="bg-background rounded-[28px] border border-border p-3">
                  <div className="flex items-center gap-3 mb-3">
                    {/* Recording Animation */}
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-foreground">
                        {Math.floor(voiceRecorder.recordingTime / 60)}:{(voiceRecorder.recordingTime % 60).toString().padStart(2, '0')}
                      </span>

                      {/* Animated Voice Waveform */}
                      <div className="flex items-center gap-1 ml-2">
                        {[...Array(20)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1 bg-gradient-to-t from-purple-500 to-pink-600 rounded-full transition-all"
                            style={{
                              height: `${Math.random() * 24 + 8}px`,
                              animation: `pulse ${Math.random() * 0.5 + 0.5}s ease-in-out infinite`,
                              animationDelay: `${i * 0.05}s`
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={cancelVoiceRecording}
                      className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-full transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                      <span className="text-sm font-medium">Отменить</span>
                    </button>

                    <button
                      onClick={stopVoiceRecording}
                      className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-full transition-all hover:scale-105 shadow-lg"
                    >
                      <Square className="w-5 h-5 fill-white" />
                      <span className="text-sm font-medium">Отправить</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal Message Input */
                <div className="flex items-center gap-2 bg-background p-2 rounded-[28px] border border-border">
                  {/* Image Upload */}
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isUploadingFile}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-all"
                    title="Прикрепить изображение"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>

                  {/* File Upload */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingFile}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-all"
                    title="Прикрепить файл"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>

                  <input
                    type="file"
                    ref={imageInputRef}
                    onChange={handleImageSelect}
                    className="hidden"
                    multiple
                    accept="image/*,video/*"
                  />

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                  />

                  {/* Message Input */}
                  <div className="flex-1 relative flex items-center">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={t('common:type_message', 'Введите сообщение...')}
                      disabled={sending || isUploadingFile}
                      className="w-full bg-transparent border-none py-2 px-2 text-sm focus:ring-0"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />

                    {/* Emoji Picker */}
                    <div className="relative" ref={emojiPickerRef}>
                      <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-2 text-muted-foreground hover:text-foreground"
                      >
                        <Smile className="w-5 h-5" />
                      </button>

                      {showEmojiPicker && (
                        <div className="absolute bottom-full right-0 mb-2 z-50">
                          <EmojiPicker
                            onEmojiClick={handleEmojiClick}
                            width={350}
                            height={400}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Send or Voice Button */}
                  {newMessage.trim() ? (
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={sending || isUploadingFile}
                      className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-full transition-all hover:scale-110 disabled:opacity-50"
                    >
                      {sending || isUploadingFile ? (
                        <Loader className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={startVoiceRecording}
                      className="p-3 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-all"
                      title="Голосовое сообщение"
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Incoming Call Modal */}
      {incomingCallFrom && incomingCallType && (
        <IncomingCallModal
          callerName={users.find(u => u.id === incomingCallFrom)?.full_name || 'Unknown'}
          callerId={incomingCallFrom}
          callType={incomingCallType}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {/* Call Quality Indicator - shown during active call */}
      {isInCall && (
        <div className="fixed top-4 right-4 z-50">
          <CallQualityIndicator
            quality={connectionQuality}
            latency={Math.round(qualityStats.latency)}
            packetLoss={Math.round(qualityStats.packetLoss * 10) / 10}
          />
        </div>
      )}
    </div>
  );
}
