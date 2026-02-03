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
  ArrowLeft,
  FileText,
  Smile,
  Trash2,
  Square,
  Minimize2,
  Maximize2,
  Settings,
  UserPlus,
  Pause,
  Play,
  Monitor,
  Share2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { webrtcService, CallType, ConnectionQuality } from '../../services/webrtc';
import { getDynamicAvatar } from '../../utils/avatarUtils';
import { getPhotoUrl } from '../../utils/photoUtils';
import { api } from '../../services/api';
import AudioPlayer from './AudioPlayer';
import CallQualityIndicator from '../calls/CallQualityIndicator';

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
  last_seen?: string | null;
}

interface VoiceRecorder {
  mediaRecorder: MediaRecorder | null;
  audioChunks: Blob[];
  isRecording: boolean;
  recordingTime: number;
}

export default function InternalChat() {
  useEffect(() => {
    console.log('🚀 [InternalChat] Version: 2026-02-03_v3 (ServiceWorker Fix)');
  }, []);

  const { t, i18n } = useTranslation(['common', 'layouts/mainlayout']);
  const { user: _currentUser } = useAuth();
  // useAuth(); // Removed redundant call if not needed or keeps it if side-effect relevant

  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState<number | null>(null);
  const [showMobileUserList, setShowMobileUserList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false); // Settings modal state
  const [customRingtone, setCustomRingtone] = useState<string | null>(localStorage.getItem('chat_ringtone'));
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteSearchTerm, setInviteSearchTerm] = useState('');

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
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('excellent');
  const [qualityStats, setQualityStats] = useState({ latency: 0, packetLoss: 0 });
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ from: number; type: CallType; callee_status?: string } | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [isCallRecording, setIsCallRecording] = useState(false);
  const [isLocalOnHold, setIsLocalOnHold] = useState(false);
  const [isRemoteOnHold, setIsRemoteOnHold] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isDndEnabled, setIsDndEnabled] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [ringTimeout, setRingTimeout] = useState<NodeJS.Timeout | null>(null);

  const fetchCallLogs = async () => {
    try {
      const data = await api.getCallLogs();
      setCallLogs(data.logs || []);
    } catch (err) {
      console.error('Error fetching call logs:', err);
    }
  };


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const callRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Audio refs and functions removed in favor of WebRTCService



  const currentUserData = JSON.parse(localStorage.getItem('user') || '{}');

  const { search } = useLocation();

  useEffect(() => {
    loadData();

    // Check for auto-answer query param
    const params = new URLSearchParams(search);
    if (params.get('answer') === 'true' && params.get('from')) {
      const fromId = parseInt(params.get('from')!);
      console.log('🚀 [InternalChat] Auto-answering call from:', fromId);

      // We need to wait for users to load before selecting
      const interval = setInterval(() => {
        if (users.length > 0) {
          const caller = users.find(u => u.id === fromId);
          if (caller) {
            setSelectedUser(caller);
            clearInterval(interval);

            // Execute actual accept after a short delay
            setTimeout(async () => {
              try {
                // Clear URL params
                window.history.replaceState({}, '', window.location.pathname);
                await webrtcService.acceptCall();
                setIsInCall(true);
                setCallStartTime(Date.now());
                const callType = params.get('type') as CallType || 'audio';
                setCallType(callType);
                toast.success(t('calls.accepted_automatically', 'Вызов принят автоматически'));
              } catch (err) {
                console.error("Auto-answer failed", err);
              }
            }, 500);
          }
        }
      }, 500);
      setTimeout(() => clearInterval(interval), 5000);
    }
  }, [search]);

  useEffect(() => {
    if (showCallHistory) {
      fetchCallLogs();
    }
  }, [showCallHistory]);

  // Set user online status
  useEffect(() => {
    const setOnlineStatus = async () => {
      try {
        await api.updateStatusOnline();
      } catch (err) {
        console.error('Error updating status to online:', err);
      }
    };

    // Set online immediately when component mounts
    setOnlineStatus();

    // Set online every 30 seconds (heartbeat)
    const heartbeatInterval = setInterval(() => {
      setOnlineStatus();
    }, 30000);

    // Set offline when component unmounts or page is about to unload
    const setOfflineStatus = async () => {
      try {
        await api.updateStatusOffline();
      } catch (err) {
        console.error('Error updating status to offline:', err);
      }
    };

    // Handle page unload/refresh
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliability during page unload
      navigator.sendBeacon('/api/internal-chat/status/offline');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setOfflineStatus();
    };
  }, []);

  // ... (existing useEffects)

  // Initialize WebRTC service
  // Initialize WebRTC service
  useEffect(() => {
    if (currentUserData?.id) {
      // Инициализация безопасна для повторного вызова
      webrtcService.initialize(currentUserData.id).catch(err => {
        console.error('Failed to initialize WebRTC:', err);
      });

      const handleIncomingCall = (fromUserId: number, type: CallType, calleeStatus?: string) => {
        setIncomingCall({ from: fromUserId, type, callee_status: calleeStatus });
        // Если мы уже в созвоне, UI покажет "вторую линию" (Call Waiting)
      };

      const handleHold = () => {
        setIsRemoteOnHold(true);
        toast.info(t('calls.user_on_hold', 'Собеседник поставил звонок на удержание'));
      };

      const handleResume = () => {
        setIsRemoteOnHold(false);
        toast.info(t('calls.user_resumed', 'Собеседник вернулся в звонок'));
      };

      const handleUserStatusChange = (userId: number, isOnline: boolean, lastSeen: string | null) => {
        setUsers(prevUsers => prevUsers.map(u => {
          if (u.id === userId) {
            return { ...u, is_online: isOnline, last_seen: lastSeen || null };
          }
          return u;
        }));
      };

      const handleQualityChange = (quality: ConnectionQuality, stats: any) => {
        setConnectionQuality(quality);
        setQualityStats(stats);
      };

      const handleCallAccepted = () => {
        webrtcService.stopRingtone(); // Stop ringing
        setIsCalling(false);
        setIsInCall(true);
        setIsLocalOnHold(false);
        setIsRemoteOnHold(false);
        setCallStartTime(Date.now());
        toast.success(t('calls.call_accepted', 'Звонок принят'));
      };

      const handleCallRejected = (reason?: string) => {
        webrtcService.stopRingtone();
        setIsCalling(false);
        if (reason === 'busy') {
          toast.error(t('calls.user_busy', 'Пользователь занят'));
        } else {
          setIsInCall(false);
          setIncomingCall(null);
          toast.error(t('calls.call_rejected', 'Звонок отклонен'));
        }
      };

      const handleRemoteStream = (stream: MediaStream) => {
        console.log('📺 Received remote stream in InternalChat');
        // Always attach to audio ref first to ensure sound works regardless of video call or audio call
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream;
          // Ensure it plays
          remoteAudioRef.current.play().catch(e => {
            if (e.name !== 'AbortError') console.error("Audio auto-play failed", e);
          });
        }

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          remoteVideoRef.current.play().catch(e => {
            if (e.name !== 'AbortError') console.error("Remote video play failed", e);
          });
        }
      };

      const handleCallEnded = () => {
        webrtcService.stopRingtone();
        setIsCalling(false);
        handleCallEndedByRemote();
      };

      const handleError = (error: string) => {
        toast.error(error);
      };

      // Add listeners
      webrtcService.addEventListener('incomingCall', handleIncomingCall);
      webrtcService.addEventListener('userStatus', handleUserStatusChange);
      webrtcService.addEventListener('qualityChange', handleQualityChange);
      webrtcService.addEventListener('callAccepted', handleCallAccepted);
      webrtcService.addEventListener('callRejected', handleCallRejected);
      webrtcService.addEventListener('remoteStream', handleRemoteStream);
      webrtcService.addEventListener('callEnded', handleCallEnded);
      webrtcService.addEventListener('hold', handleHold);
      webrtcService.addEventListener('resume', handleResume);
      webrtcService.addEventListener('error', handleError);

      return () => {
        webrtcService.stopRingtone();
        // Remove listeners
        webrtcService.removeEventListener('incomingCall', handleIncomingCall);
        webrtcService.removeEventListener('userStatus', handleUserStatusChange);
        webrtcService.removeEventListener('qualityChange', handleQualityChange);
        webrtcService.removeEventListener('callAccepted', handleCallAccepted);
        webrtcService.removeEventListener('callRejected', handleCallRejected);
        webrtcService.removeEventListener('remoteStream', handleRemoteStream);
        webrtcService.removeEventListener('callEnded', handleCallEnded);
        webrtcService.removeEventListener('error', handleError);

        // DO NOT disconnect here anymore to keep socket alive for global status
        // webrtcService.disconnect();
      };
    }
  }, [currentUserData?.id]);



  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getInternalChatUsers(i18n.language);
      let loadedUsers = (data.users || []) as User[];

      // Fetch online users status
      try {
        const onlineData = await api.getOnlineUsers();
        const onlineUserIds = (onlineData.online_users || []) as number[];

        loadedUsers = loadedUsers.map((u: User) => ({
          ...u,
          is_online: onlineUserIds.includes(u.id)
        }));
      } catch (err) {
        console.error('Error fetching online users:', err);
      }

      // De-duplication safeguarding: Ensure users are unique by ID
      const uniqueUsersMap = new Map<number, User>();
      loadedUsers.forEach(user => {
        if (!uniqueUsersMap.has(user.id)) {
          uniqueUsersMap.set(user.id, user);
        }
      });

      const uniqueUsers = Array.from(uniqueUsersMap.values());
      setUsers(uniqueUsers);

    } catch (err: any) {
      console.error('Error loading users:', err);
      // Construct a detailed error message for mobile debugging
      let debugInfo = '';
      if (err instanceof Error) {
        debugInfo = `${err.name}: ${err.message}`;
        if (err.stack) debugInfo += `\nStack: ${err.stack}`;
      } else if (typeof err === 'object') {
        try {
          debugInfo = JSON.stringify(err, null, 2);
        } catch (e) {
          debugInfo = String(err);
        }
      } else {
        debugInfo = String(err);
      }

      // Append request info if available (e.g. from fetch failure)
      debugInfo += `\nTime: ${new Date().toISOString()}`;
      debugInfo += `\nURL: /api/internal-chat/users`;

      const userFriendlyMessage = t('common:error_loading_data', 'Ошибка загрузки данных');
      setError(`${userFriendlyMessage}\n\nTECHNICAL DETAILS:\n${debugInfo}`);

      toast.error(t('common:error_loading_data', 'Ошибка загрузки данных'));
    } finally {
      setLoading(false);
    }
  };

  const loadMessagesWithUser = async (userId: number) => {
    try {
      setLoading(true);
      const data = await api.getInternalChatMessages(userId);
      setMessages(data.messages || []);
      setLoading(false);

      // Использование setTimeout чтобы дождаться рендеринга сообщений
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      console.error('Error loading messages:', err);
      toast.error(t('common:error_loading_messages', 'Ошибка загрузки сообщений'));
      setLoading(false);
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
        finalMessage = `${t('chat.reply_to', 'Ответ на:')} "${quotedText}"\n\n${textToSend}`;
      }

      await api.sendInternalChatMessage(selectedUser.id, fileUrl || finalMessage, messageType);

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

      toast.success(t('common:sent', 'Sent'));
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
          const { file_url } = await api.uploadFile(file);
          const fileType = file.type.startsWith('image/') ? 'image' :
            file.type.startsWith('video/') ? 'video' : 'file';

          await handleSendMessage('', fileType, file_url);
          toast.success(`${file.name}`);
        } catch (err) {
          console.error(err);
          toast.error(`${t('common:error', 'Error')}: ${file.name}`);
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
          const { file_url } = await api.uploadFile(file);
          await handleSendMessage(file.name, 'file', file_url);
          toast.success(`✅ ${file.name}`);
        } catch (err) {
          console.error(err);
          toast.error(`${t('common:error', 'Ошибка')}: ${file.name}`);
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
        if (event.data && event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // If cancelled, just clean up and don't send
        if (isCancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        // Determine extension based on mimeType
        const ext = mimeType.includes('mp4') ? 'm4a' : 'webm';

        const audioBlob = new Blob(audioChunks, { type: mimeType });

        if (audioBlob.size === 0) {
          console.error("Empty audio blob recorded");
          toast.error(t('chat.voice_error', 'Ошибка записи: пустой файл'));
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        const file = new File([audioBlob], `voice-${Date.now()}.${ext}`, { type: mimeType });

        try {
          setIsUploadingFile(true);
          const { file_url } = await api.uploadFile(file);
          await handleSendMessage(t('chat.voice_message', 'Голосовое сообщение'), 'voice', file_url);
          toast.success(t('chat.voice_sent', 'Голосовое сообщение отправлено'));
        } catch (err) {
          console.error(err);
          toast.error(t('chat.voice_error', 'Ошибка отправки голосового'));
        } finally {
          setIsUploadingFile(false);
          stream.getTracks().forEach(track => track.stop());
        }
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

      toast.info(t('chat.recording_started', 'Запись началась'));
    } catch (err) {
      console.error('Error starting recording:', err);
      toast.error(t('common:no_mic_access', 'Нет доступа к микрофону'));
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      await webrtcService.stopScreenShare();
      setIsScreenSharing(false);
    } else {
      const stream = await webrtcService.startScreenShare();
      if (stream) setIsScreenSharing(true);
    }
  };

  const handleTransfer = (userId: number) => {
    if (selectedUser) {
      webrtcService.transferCall(userId, selectedUser.id);
      setIsTransferModalOpen(false);
      endCall();
      toast.success(t('calls.transfer_initiated', 'Перевод звонка инициирован'));
    }
  };

  const toggleDnd = async () => {
    const newState = !isDndEnabled;
    await webrtcService.toggleDND(newState);
    setIsDndEnabled(newState);
    toast.info(newState ? t('calls.dnd_on', 'Режим "Не беспокоить" включен') : t('calls.dnd_off', 'Режим "Не беспокоить" выключен'));
  };

  const handleSwitchDevice = async (kind: 'audioinput' | 'videoinput', deviceId: string) => {
    await webrtcService.switchDevice(kind, deviceId);
    toast.success(t('calls.device_switched', 'Устройство переключено'));
  };

  // Auto-voicemail logic (Missed call after 30s)
  useEffect(() => {
    if (incomingCall && !callStartTime) {
      const timeout = setTimeout(() => {
        webrtcService.rejectCall('missed');
        setIncomingCall(null);
        toast.info(t('calls.missed_auto', 'Звонок пропущен (авто-отклонение)'));
      }, 30000); // 30 seconds
      setRingTimeout(timeout as any);
    } else if (callStartTime && ringTimeout) {
      clearTimeout(ringTimeout as any);
      setRingTimeout(null);
    }
    return () => { if (ringTimeout) clearTimeout(ringTimeout as any); };
  }, [incomingCall, callStartTime]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const logs = await webrtcService.getCallLogs();
        setCallLogs(logs);

        const devices = await webrtcService.enumerateDevices();
        setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
        setVideoDevices(devices.filter(d => d.kind === 'videoinput'));
      } catch (e) {
        console.error("Error loading chat initial data:", e);
      }
    };
    loadInitialData();
  }, []);

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
      toast.info(t('chat.recording_cancelled', 'Запись отменена'));
    }
  };

  // Ensure local video is attached when call starts and video element appears
  useEffect(() => {
    if (isInCall && localVideoRef.current) {
      const localStream = webrtcService.getLocalStream();
      if (localStream) {
        if (localVideoRef.current.srcObject !== localStream) {
          localVideoRef.current.srcObject = localStream;
        }
        localVideoRef.current.play().catch(e => {
          if (e.name !== 'AbortError') console.error("Local video play failed", e);
        });
      }
    }
  }, [isInCall, callType, isMinimized]); // Re-run if view changes (minimized/maximized)

  const startCallRecording = () => {
    const remoteStream = webrtcService.getRemoteStream();
    const localStream = webrtcService.getLocalStream();

    if (!remoteStream && !localStream) {
      toast.error(t('calls.no_streams', 'Нет потоков для записи'));
      return;
    }

    try {
      // Create a mixed stream if possible (requires Web Audio API mostly, but for simplicity let's record remote)
      // Ideally we want to record both.
      // Simple approach: Record remote stream which is the most important.
      // Better approach: Create a canvas or audio context to mix? Too complex for now.
      // Let's record the remote stream.

      // If we want audio from both, we can mix audio tracks.
      const tracks = [];
      if (remoteStream) tracks.push(...remoteStream.getTracks());
      if (localStream) {
        // Add local audio track
        const localAudio = localStream.getAudioTracks()[0];
        if (localAudio) tracks.push(localAudio);
      }

      const mixedStream = new MediaStream(tracks);
      const recorder = new MediaRecorder(mixedStream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `call_recording_${new Date().toISOString()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(t('calls.recording_saved', 'Запись звонка сохранена'));
      };

      recorder.start();
      callRecorderRef.current = recorder;
      setIsCallRecording(true);
      toast.info(t('calls.recording_started_toast', 'Запись звонка началась'));
    } catch (e) {
      console.error('Recording failed:', e);
      toast.error(t('calls.failed_to_record', 'Не удалось начать запись'));
    }
  };

  const stopCallRecording = () => {
    if (callRecorderRef.current && callRecorderRef.current.state !== 'inactive') {
      callRecorderRef.current.stop();
      setIsCallRecording(false);
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
      setIsCalling(true);
      await webrtcService.startCall(selectedUser.id, type);
      webrtcService.playRingtone('outgoing');
    } catch (err) {
      console.error('Call failed:', err);
      setIsCalling(false);
      toast.error(t('calls.error_media', 'Ошибка доступа к медиа-устройствам'));
    }
  };

  const handleAcceptCall = async () => {
    try {
      // Set the selected user to the caller to avoid UI crashes and ensure correct chat context
      if (incomingCall?.from) {
        const caller = users.find(u => u.id === incomingCall.from);
        if (caller) {
          setSelectedUser(caller);
        }
      }

      await webrtcService.acceptCall();
      setIsInCall(true);
      setCallStartTime(Date.now());
      setCallType(incomingCall?.type || 'audio');
      setIncomingCall(null);

      // Local video will be attached by useEffect
    } catch (err) {
      console.error('Error accepting call:', err);
      toast.error(t('calls.error_accepting', 'Ошибка при приёме звонка'));
    }
  };

  const handleRejectCall = () => {
    webrtcService.rejectCall();
    webrtcService.stopRingtone(); // Ensure sound stops
    setIncomingCall(null);
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleCallEndedByRemote = () => {
    stopCallRecording(); // Stop recording if active
    setIsInCall(false);
    setCallType(null);
    setIncomingCall(null);
    setIsMicMuted(false);
    setIsVideoOff(false);
    setIsMinimized(false);
    webrtcService.playRingtone('end');

    if (callStartTime && selectedUser) {
      const duration = Date.now() - callStartTime;
      const durationText = formatDuration(duration);
      handleSendMessage(`${t('calls.ended', 'Звонок завершен')}. ${t('calls.duration', 'Длительность')}: ${durationText}`, 'text');
      setCallStartTime(null);
    }

    toast.info(t('calls.call_ended', 'Звонок завершен'));
  };

  const endCall = () => {
    webrtcService.endCall();
    handleCallEndedByRemote();
  };

  const toggleHold = () => {
    if (isLocalOnHold) {
      webrtcService.resumeCall();
      setIsLocalOnHold(false);
    } else {
      webrtcService.holdCall();
      setIsLocalOnHold(true);
    }
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

  const handleInviteUser = async (userId: number) => {
    try {
      const inviteMsg = `${t('calls.invite_message', 'Приглашаю вас присоединиться к звонку')}! 📞`;
      await api.sendInternalChatMessage(userId, inviteMsg, 'text');
      toast.success(t('calls.invite_sent', 'Приглашение отправлено'));
      setIsInviteModalOpen(false);
    } catch (err) {
      console.error('Error sending invite:', err);
      toast.error(t('calls.invite_error', 'Ошибка при отправке приглашения'));
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
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
          <p className="text-foreground font-medium text-center">{t('common:error_loading', 'Ошибка загрузки')}</p>
          <div className="bg-muted/50 p-4 rounded-lg w-full max-w-lg overflow-x-auto">
            <pre className="text-xs text-red-500 font-mono whitespace-pre-wrap break-all">
              {error}
            </pre>
          </div>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              loadData();
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            {t('common:try_again', 'Попробовать снова')}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-2xl">
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
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-pink-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-lg">
                {users.find(u => u.id === incomingCall.from)?.full_name.charAt(0).toUpperCase()}
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                {users.find(u => u.id === incomingCall.from)?.full_name}
              </h3>
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                {incomingCall.type === 'video' ? <Video className="w-5 h-5 text-blue-500" /> : <Phone className="w-5 h-5 text-blue-500" />}
                <span>{incomingCall.type === 'video' ? t('calls.video_call', 'Видеозвонок') : t('calls.audio_call', 'Аудиозвонок')}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleRejectCall}
                className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
              >
                <PhoneOff className="w-5 h-5" />
                {t('calls.reject', 'Отклонить')}
              </button>
              <button
                onClick={handleAcceptCall}
                className="flex-1 py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Phone className="w-5 h-5" />
                {t('calls.accept', 'Принять')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Overlay or Minimized View */}
      {isInCall && (
        <>
          {/* Persist audio across view modes */}
          <audio ref={remoteAudioRef} autoPlay />

          {isMinimized ? (
            // Minimized View (PiP)
            <div className="fixed bottom-4 right-4 z-50 w-72 bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden animate-in slide-in-from-bottom-4">
              <div className="relative aspect-video bg-gray-800">
                {callType === 'video' ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-pink-600">
                    <span className="text-4xl font-bold text-white">
                      {selectedUser?.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {/* Controls Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => setIsMinimized(false)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white">
                    <Maximize2 className="w-5 h-5" />
                  </button>
                  <button onClick={endCall} className="p-2 bg-red-500 hover:bg-red-600 rounded-full text-white">
                    <PhoneOff className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-3 flex justify-between items-center bg-gray-900">
                <span className="text-white font-medium truncat text-sm">{selectedUser?.full_name}</span>
                <div className="flex gap-2">
                  {isMicMuted && <MicOff className="w-4 h-4 text-red-400" />}
                </div>
              </div>
            </div>
          ) : (
            // Full Screen View
            <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col items-center justify-center">
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-full transition-colors"
                >
                  <Minimize2 className="w-6 h-6" />
                </button>
              </div>

              <div className="text-white text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">{selectedUser?.full_name}</h2>
                <p className="text-gray-300 flex items-center justify-center gap-2">
                  {callType === 'video' ? t('calls.video_call', 'Видеозвонок') : t('calls.audio_call', 'Аудиозвонок')}
                  {callStartTime && (
                    <span className="text-sm bg-gray-800 px-2 py-1 rounded-full font-mono">
                      {formatDuration(Date.now() - (callStartTime || 0))}
                    </span>
                  )}
                </p>
              </div>

              {/* Invisible audio element for handling audio in both video and audio calls */}
              <audio ref={remoteAudioRef} autoPlay />

              {callType === 'video' ? (
                <div className="relative w-full max-w-4xl aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className={`w-full h-full object-cover transition-filter duration-300 ${isRemoteOnHold ? 'blur-xl grayscale' : ''}`}
                  />
                  {isRemoteOnHold && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/60 px-6 py-3 rounded-full backdrop-blur-md border border-white/10 flex items-center gap-3">
                        <Pause className="w-6 h-6 text-white animate-pulse" />
                        <span className="text-white font-medium">{t('calls.user_on_hold_status', 'Звонок на удержании')}</span>
                      </div>
                    </div>
                  )}

                  {incomingCall && incomingCall.from !== selectedUser?.id && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] bg-blue-600/90 backdrop-blur-md border border-white/20 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 flex items-center gap-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                          <Phone className="w-5 h-5 text-white animate-bounce" />
                        </div>
                        <div>
                          <p className="text-white text-xs opacity-80">{t('calls.second_line', 'Вторая линия')}</p>
                          <p className="text-white font-bold">{users.find(u => u.id === incomingCall.from)?.full_name || t('calls.incoming', 'Входящий')}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            webrtcService.rejectCall('busy');
                            setIncomingCall(null);
                          }}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors"
                        >
                          {t('calls.reject', 'Отклонить')}
                        </button>
                        <button
                          onClick={async () => {
                            // End current, answer new
                            webrtcService.endCall();
                            const caller = users.find(u => u.id === incomingCall.from);
                            if (caller) {
                              setSelectedUser(caller);
                              setTimeout(() => webrtcService.acceptCall(), 500);
                            }
                            setIncomingCall(null);
                          }}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium transition-colors"
                        >
                          {t('calls.switch_calls', 'Переключить')}
                        </button>
                      </div>
                    </div>
                  )}
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`absolute bottom-4 right-4 w-48 aspect-video bg-gray-800 rounded-xl object-cover border-2 border-white/20 shadow-lg transition-all ${isVideoOff || isLocalOnHold ? 'hidden' : ''
                      }`}
                  />
                  {(isVideoOff || isLocalOnHold) && (
                    <div className="absolute bottom-4 right-4 w-48 aspect-video bg-gray-800 rounded-xl flex items-center justify-center border-2 border-white/20 shadow-lg">
                      <VideoOff className="w-12 h-12 text-white/50" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <div className="w-40 h-40 bg-gradient-to-br from-blue-500 to-pink-600 rounded-full flex items-center justify-center text-white text-6xl font-bold shadow-2xl animate-pulse">
                    {selectedUser?.full_name.charAt(0).toUpperCase()}
                  </div>
                  {isRemoteOnHold && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 mt-12 w-max bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm border border-white/5">
                      <span className="text-white text-sm">{t('calls.on_hold', 'На удержании')}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8 md:mt-12 flex flex-wrap justify-center gap-3 md:gap-6 px-4">
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={toggleMic}
                    className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-white transition-all shadow-lg hover:scale-110 ${isMicMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                  >
                    {isMicMuted ? <MicOff className="w-5 h-5 md:w-6 md:h-6" /> : <Mic className="w-5 h-5 md:w-6 md:h-6" />}
                  </button>
                  <span className="text-[10px] md:text-xs text-gray-400 font-medium">{t('calls.mic', 'Микрофон')}</span>
                </div>

                {callType === 'video' && (
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={toggleVideo}
                      className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-white transition-all shadow-lg hover:scale-110 ${isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                    >
                      {isVideoOff ? <VideoOff className="w-5 h-5 md:w-6 md:h-6" /> : <Video className="w-5 h-5 md:w-6 md:h-6" />}
                    </button>
                    <span className="text-[10px] md:text-xs text-gray-400 font-medium">{t('calls.video', 'Видео')}</span>
                  </div>
                )}

                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={toggleHold}
                    className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-white transition-all shadow-lg hover:scale-110 ${isLocalOnHold ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                  >
                    {isLocalOnHold ? <Play className="w-5 h-5 md:w-6 md:h-6" /> : <Pause className="w-5 h-5 md:w-6 md:h-6" />}
                  </button>
                  <span className="text-[10px] md:text-xs text-gray-400 font-medium">{isLocalOnHold ? t('calls.resume', 'Продолжить') : t('calls.hold', 'Удержать')}</span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={isCallRecording ? stopCallRecording : startCallRecording}
                    className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-white transition-all shadow-lg hover:scale-110 ${isCallRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-700 hover:bg-gray-600'}`}
                  >
                    <Square className={`w-5 h-5 md:w-6 md:h-6 ${isCallRecording ? 'fill-current' : ''}`} />
                  </button>
                  <span className="text-[10px] md:text-xs text-gray-400 font-medium">{t('calls.record', 'Запись')}</span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="w-14 h-14 md:w-16 md:h-16 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white transition-all shadow-lg hover:scale-110"
                  >
                    <UserPlus className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                  <span className="text-[10px] md:text-xs text-gray-400 font-medium">{t('calls.invite', 'Пригласить')}</span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={toggleScreenShare}
                    className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-white transition-all shadow-lg hover:scale-110 ${isScreenSharing ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'}`}
                  >
                    <Monitor className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                  <span className="text-[10px] md:text-xs text-gray-400 font-medium">{t('calls.screen_share', 'Экран')}</span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => setIsTransferModalOpen(true)}
                    className="w-14 h-14 md:w-16 md:h-16 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white transition-all shadow-lg hover:scale-110"
                  >
                    <Share2 className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                  <span className="text-[10px] md:text-xs text-gray-400 font-medium">{t('calls.transfer', 'Перевод')}</span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="relative group">
                    <button
                      className="w-14 h-14 md:w-16 md:h-16 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white transition-all shadow-lg hover:scale-110"
                    >
                      <Settings className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 rounded-xl shadow-2xl p-4 hidden group-hover:block z-[70] min-w-[200px] border border-white/10">
                      <p className="text-white text-xs font-bold mb-2 uppercase opacity-50">{t('calls.mic', 'Микрофон')}</p>
                      {audioDevices.map(d => (
                        <button key={d.deviceId} onClick={() => handleSwitchDevice('audioinput', d.deviceId)} className="w-full text-left text-white text-xs py-2 px-3 hover:bg-white/10 rounded-lg truncate">
                          {d.label}
                        </button>
                      ))}
                      <div className="h-px bg-white/10 my-2" />
                      <p className="text-white text-xs font-bold mb-2 uppercase opacity-50">{t('calls.camera', 'Камера')}</p>
                      {videoDevices.map(d => (
                        <button key={d.deviceId} onClick={() => handleSwitchDevice('videoinput', d.deviceId)} className="w-full text-left text-white text-xs py-2 px-3 hover:bg-white/10 rounded-lg truncate">
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] md:text-xs text-gray-400 font-medium">{t('calls.settings', 'Настройки')}</span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={endCall}
                    className="w-16 h-16 md:w-20 md:h-20 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-all shadow-xl hover:scale-110"
                  >
                    <PhoneOff className="w-7 h-7 md:w-8 md:h-8" />
                  </button>
                  <span className="text-[10px] md:text-xs text-red-400 font-bold">{t('calls.end', 'Завершить')}</span>
                </div>
              </div>
            </div>
          )
          }
        </>
      )}

      {/* Users List */}
      <div className={`
        ${selectedUser && !showMobileUserList ? 'hidden md:flex' : 'flex'}
        flex-col w-full md:w-80 border-r border-border bg-card
      `}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-primary" />
              {t('layouts/mainlayout:menu.internal_chat', 'Внутренняя связь')}
            </h2>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-accent rounded-full text-muted-foreground hover:text-foreground transition-colors"
              title={t('settings.audio_settings', 'Настройки звука')}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('common:search', 'Поиск...')}
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
                className={`w-full p-4 flex items-center gap-3 border-b border-border hover:bg-accent transition-colors ${selectedUser?.id === user.id ? 'bg-accent' : ''
                  }`}
              >
                <div className="relative w-12 h-12 flex-shrink-0">
                  <div className="w-full h-full rounded-full overflow-hidden shadow-lg">
                    <img
                      src={getUserAvatar(user) || undefined}
                      alt={user.full_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Online Status Indicator - Only if online */}
                  {user.is_online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white bg-green-500" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-gray-900 truncate pr-2">
                      {user.full_name || user.username}
                      {user.id === currentUserData.id && ` (${t('common:you', 'Вы')})`}
                    </span>
                  </div>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    {user.is_online ? (
                      <span className="flex items-center gap-1.5 text-green-600 font-medium">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        {t('status.online', 'В сети')}
                      </span>
                    ) : (
                      <span className="truncate max-w-[180px]">
                        {user.last_seen
                          ? `${t('status.last_seen', 'Был(а)')} ${new Date(user.last_seen).toLocaleDateString('ru-RU')} ${new Date(user.last_seen).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
                          : ''}
                      </span>
                    )}
                  </div>
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
            <div className="p-4 bg-gradient-to-r from-blue-600 via-pink-600 to-orange-500 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  onClick={() => setShowMobileUserList(true)}
                  className="md:hidden p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg flex-shrink-0 ring-2 ring-white/30">
                  <img
                    src={getUserAvatar(selectedUser) || undefined}
                    alt={selectedUser.full_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white truncate text-sm">
                    {selectedUser.full_name}
                  </p>
                  <div className="text-xs text-white/90 truncate flex items-center gap-2">
                    {selectedUser.is_online ? (
                      <>
                        <span className="w-2 h-2 bg-green-400 rounded-full inline-block animate-pulse"></span>
                        <span className="font-medium">{t('status.online', 'В сети')}</span>
                      </>
                    ) : (
                      <span>
                        {selectedUser.last_seen
                          ? `${t('status.last_seen', 'Был(а)')} ${new Date(selectedUser.last_seen).toLocaleDateString('ru-RU')} ${new Date(selectedUser.last_seen).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
                          : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                  title={t('calls.invite', 'Пригласить сотрудников')}
                >
                  <UserPlus className="w-5 h-5" />
                </button>

                <button
                  onClick={toggleDnd}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${isDndEnabled ? 'bg-red-500/20 text-red-100 border-red-500/50' : 'bg-white/10 text-white border-white/20'}`}
                >
                  <div className={`w-2 h-2 rounded-full ${isDndEnabled ? 'bg-red-500' : 'bg-green-400 animate-pulse'}`} />
                  {isDndEnabled ? t('calls.dnd_on_short', 'DND') : t('calls.available', 'Online')}
                </button>

                <div className="h-6 w-px bg-white/20 mx-2" />

                <button
                  onClick={() => startCall('audio')}
                  disabled={isInCall}
                  className="p-2 text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                  title={t('calls.audio_call', 'Аудиозвонок')}
                >
                  <Phone className="w-5 h-5" />
                </button>
                <button
                  onClick={() => startCall('video')}
                  disabled={isInCall}
                  className="p-2 text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                  title={t('calls.video_call', 'Видеозвонок')}
                >
                  <Video className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setShowCallHistory(true)}
                  className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                  title={t('calls.history', 'История звонков')}
                >
                  <Clock className="w-5 h-5" />
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
                          className={`rounded-2xl px-4 py-2 shadow-sm ${isOwn
                            ? 'bg-gradient-to-r from-blue-500 to-pink-600 text-white'
                            : 'bg-muted text-foreground'
                            }`}
                        >
                          {/* Reply Preview */}
                          {msg.message.includes(t('chat.reply_to', 'Ответ на:')) && (
                            <div className="border-l-2 border-current/20 bg-current/5 px-2.5 py-1.5 mb-2 rounded">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <Reply className="w-3 h-3 flex-shrink-0 opacity-70" />
                                <p className="text-xs font-bold opacity-90">{t('chat.reply_to', 'Ответ на:')}</p>
                              </div>
                              <p className="text-xs opacity-80 line-clamp-2">
                                {msg.message.split('\n\n')[0].replace(t('chat.reply_to', 'Ответ на:'), '').replace('"', '').replace('"', '')}
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
                              <span className="text-sm">{t('chat.open_file', 'Открыть файл')}</span>
                            </a>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {msg.message.includes(t('chat.reply_to', 'Ответ на:'))
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
                      <div className={`flex items-center self-center opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? 'order-first' : 'order-last'
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
                            <div className={`absolute bottom-full mb-2 flex items-center gap-0.5 bg-card rounded-full shadow-xl border border-border p-1 z-50 ${isOwn ? 'right-0' : 'left-0'
                              }`}>
                              <button
                                onClick={() => {
                                  setReplyToMessage(msg);
                                  toast.info(t('chat.write_reply', 'Напишите ответ'));
                                  setActiveActionMenuId(null);
                                }}
                                className="p-2 hover:bg-accent rounded-full transition-all"
                                title={t('chat.reply', 'Ответить')}
                              >
                                <Reply className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(msg.message);
                                  toast.success(t('chat.text_copied', 'Текст скопирован'));
                                  setActiveActionMenuId(null);
                                }}
                                className="p-2 hover:bg-accent rounded-full transition-all"
                                title={t('common:copy', 'Копировать')}
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
                        {t('chat.reply_to_user', 'Ответ на {{name}}', { name: replyToMessage.sender_name })}
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
                            className="w-1 bg-gradient-to-t from-blue-500 to-pink-600 rounded-full transition-all"
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
                      <span className="text-sm font-medium">{t('common:cancel', 'Отменить')}</span>
                    </button>

                    <button
                      onClick={stopVoiceRecording}
                      className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-pink-600 text-white rounded-full transition-all hover:scale-105 shadow-lg"
                    >
                      <Square className="w-5 h-5 fill-white" />
                      <span className="text-sm font-medium">{t('common:send', 'Отправить')}</span>
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
                    title={t('chat.attach_image', 'Прикрепить изображение')}
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>

                  {/* File Upload */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingFile}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-all"
                    title={t('chat.attach_file', 'Прикрепить файл')}
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
                            onEmojiClick={onEmojiClick}
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
                      className="p-3 bg-gradient-to-r from-blue-500 to-pink-600 text-white rounded-full transition-all hover:scale-110 disabled:opacity-50"
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
                      title={t('chat.voice_message', 'Голосовое сообщение')}
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

      {/* Incoming Call Modal is now handled globally in MainLayout */}


      {/* Call Quality Indicator - shown during active call */}
      {
        isInCall && (
          <div className="fixed top-4 right-4 z-50">
            <CallQualityIndicator
              quality={connectionQuality}
              latency={Math.round(qualityStats.latency)}
              packetLoss={Math.round(qualityStats.packetLoss * 10) / 10}
            />
          </div>
        )
      }
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl shadow-2xl border border-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Settings className="w-6 h-6 text-primary" />
                {t('settings.audio_settings', 'Настройки звука')}
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-muted rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">{t('settings.ringtone', 'Мелодия звонка')}</label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 2 * 1024 * 1024) {
                        toast.error(t('settings.file_too_large', 'Файл слишком большой (макс 2MB)'));
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        const result = evt.target?.result as string;
                        setCustomRingtone(result);
                        localStorage.setItem('chat_ringtone', result);
                        toast.success(t('settings.ringtone_saved', 'Мелодия сохранена'));

                        // Preview
                        const audio = new Audio(result);
                        audio.play();
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-sm text-slate-500
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-full file:border-0
                              file:text-sm file:font-semibold
                              file:bg-violet-50 file:text-violet-700
                              hover:file:bg-violet-100"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {t('settings.ringtone_hint', 'Загрузите свой файл (mp3, wav). Макс 2MB.')}
                </p>
              </div>

              {customRingtone && (
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate">{t('settings.custom_ringtone_set', 'Установлена пользовательская мелодия')}</p>
                  </div>
                  <button
                    onClick={() => {
                      setCustomRingtone(null);
                      localStorage.removeItem('chat_ringtone');
                      toast.success(t('settings.ringtone_reset', 'Сброшено на стандартную'));
                    }}
                    className="text-sm text-red-500 hover:text-red-600 font-medium"
                  >
                    {t('common:reset', 'Сбросить')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl shadow-2xl border border-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-primary" />
                {t('calls.invite_to_call', 'Пригласить в звонок')}
              </h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-2 hover:bg-muted rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('common:search', 'Поиск по имени...')}
                value={inviteSearchTerm}
                onChange={(e) => setInviteSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {users
                .filter(u =>
                  u.id !== currentUserData?.id &&
                  u.id !== selectedUser?.id &&
                  (u.full_name.toLowerCase().includes(inviteSearchTerm.toLowerCase()) ||
                    u.username.toLowerCase().includes(inviteSearchTerm.toLowerCase()))
                )
                .map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleInviteUser(u.id)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-accent rounded-xl transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      <img
                        src={getUserAvatar(u) || undefined}
                        alt={u.full_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{u.full_name}</p>
                      <p className="text-xs text-muted-foreground">{u.role}</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${u.is_online ? 'bg-green-500' : 'bg-gray-400'}`} />
                  </button>
                ))
              }
            </div>
          </div>
        </div>
      )}
      {/* Transfer Call Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-2xl shadow-2xl border border-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Share2 className="w-6 h-6 text-primary" />
                {t('calls.transfer_call', 'Перевести звонок')}
              </h3>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="p-2 hover:bg-muted rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 text-sm text-muted-foreground">
              {t('calls.transfer_hint', 'Выберите сотрудника, на которого хотите перевести текущий разговор')}
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {users
                .filter(u => u.is_online && u.id !== currentUserData?.id && u.id !== selectedUser?.id)
                .map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleTransfer(u.id)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-accent rounded-xl transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      <img
                        src={getUserAvatar(u) || undefined}
                        alt={u.full_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{u.full_name}</p>
                      <p className="text-xs text-muted-foreground">{u.role}</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </button>
                ))
              }
              {users.filter(u => u.is_online && u.id !== currentUserData?.id && u.id !== selectedUser?.id).length === 0 && (
                <div className="text-center py-8 text-muted-foreground italic text-sm">
                  {t('calls.no_online_staff', 'Нет сотрудников в сети для перевода')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Outgoing Call Overlay (Calling State) */}
      {isCalling && (
        <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-xl z-[60] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="relative mb-12">
            <div className="w-40 h-40 bg-gradient-to-br from-blue-500 to-pink-600 rounded-full flex items-center justify-center text-white text-6xl font-bold shadow-2xl animate-pulse">
              {selectedUser?.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -inset-4 border-2 border-white/20 rounded-full animate-ping opacity-20"></div>
          </div>

          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-2">{selectedUser?.full_name}</h2>
            <p className="text-blue-400 font-medium animate-pulse">
              {t('calls.calling_status', 'Вызов...')}
            </p>
          </div>

          <div className="flex flex-col items-center gap-6">
            <button
              onClick={endCall}
              className="w-20 h-20 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95"
            >
              <PhoneOff className="w-10 h-10" />
            </button>
            <span className="text-white/60 font-medium uppercase tracking-widest text-xs">
              {t('calls.cancel_call', 'Отменить')}
            </span>
          </div>
        </div>
      )}

      {/* Call History Side Sheet */}
      {showCallHistory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-xl p-6 rounded-2xl shadow-2xl border border-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Clock className="w-6 h-6 text-primary" />
                {t('calls.call_history', 'История звонков')}
              </h3>
              <button
                onClick={() => setShowCallHistory(false)}
                className="p-2 hover:bg-muted rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto space-y-3 pr-2">
              {callLogs.map((log) => (
                <div key={log.id} className="p-4 bg-muted/30 rounded-2xl border border-border/50 flex items-center justify-between transition-all hover:bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${log.status === 'completed' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                      {log.direction === 'in' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                    </div>
                    <div>
                      <p className="font-bold text-sm">
                        {log.direction === 'in' ? log.caller_name : log.callee_name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                        <span>{new Date(log.created_at).toLocaleString('ru-RU')}</span>
                        <span>•</span>
                        <span className={log.status === 'completed' ? 'text-green-500' : 'text-red-500'}>
                          {t(`calls.status_${log.status}`, log.status) as any}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono bg-muted px-2 py-1 rounded-lg">
                      {Math.floor(log.duration / 60)}:{(log.duration % 60).toString().padStart(2, '0')}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold opacity-50">
                      {t(`calls.${log.type}`, log.type) as any}
                    </p>
                  </div>
                </div>
              ))}
              {callLogs.length === 0 && (
                <div className="text-center py-20 opacity-50">
                  <Phone className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>{t('calls.no_history', 'История звонков пуста')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* (Adding logic to show history could be a dedicated tab, let's add a toggle-able overlay) */}

    </div >
  );
}

