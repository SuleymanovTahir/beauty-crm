import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  History as HistoryIcon,
  ArrowDownLeft,
  ArrowUpRight,
  Scissors,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
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
  type: 'text' | 'image' | 'video' | 'audio' | 'voice' | 'file' | 'call_log';
  sender_name?: string;
  recipient_name?: string;
  edited?: boolean;
  edited_at?: string;
  deleted_for_sender?: boolean;
  deleted_for_receiver?: boolean;
  reactions?: any[];
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
  const { user } = useAuth();

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
  const [customRingtone, setCustomRingtone] = useState<string | null>(localStorage.getItem('webrtc_ringtone_url'));
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteSearchTerm, setInviteSearchTerm] = useState('');
  const [playingPreviewUrl, setPlayingPreviewUrl] = useState<string | null>(null);
  const [localVolume, setLocalVolume] = useState(webrtcService.getVolume());

  // Voice recording state
  const [voiceRecorder, setVoiceRecorder] = useState<VoiceRecorder>({
    mediaRecorder: null,
    audioChunks: [],
    isRecording: false,
    recordingTime: 0,
  });

  const [ringtones, setRingtones] = useState<any[]>([]);

  const fetchRingtones = useCallback(async () => {
    try {
      const data = await api.getRingtones();
      const apiBaseUrl = import.meta.env.VITE_API_URL || window.location.origin;

      const processed = data.map(r => {
        let fullUrl = r.url;
        // Default ringtones reside in frontend/public/audio, so keep them relative
        if (r.url.startsWith('/audio/')) {
          fullUrl = r.url;
        }
        // Custom uploads reside in backend/static, so prepend API URL
        else if (r.url.startsWith('/static/')) {
          fullUrl = `${apiBaseUrl}${r.url}`;
        }
        // Fallback or absolute URLs
        else if (!r.url.startsWith('http')) {
          fullUrl = `${apiBaseUrl}${r.url}`;
        }

        return { ...r, full_url: fullUrl };
      }).sort((a, b) => {
        // Custom (is_system: false) first, then System (is_system: true)
        if (a.is_system === b.is_system) {
          return a.name.localeCompare(b.name);
        }
        return a.is_system ? 1 : -1;
      });

      console.log('🎵 Loaded ringtones:', processed);
      setRingtones(processed);
    } catch (e) {
      console.error('Failed to fetch ringtones', e);
    }
  }, []);

  const [trimmingRingtoneId, setTrimmingRingtoneId] = useState<number | null>(null);
  const [trimParams, setTrimParams] = useState({ startTime: 0, endTime: 30 }); // Default 30s
  const [totalDuration, setTotalDuration] = useState(30);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const trimmerScrollRef = useRef<HTMLDivElement>(null);
  const trimmerTrackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showSettings) {
      fetchRingtones();
    }
  }, [showSettings, fetchRingtones]);

  // Video/Audio call state removed - handled by MainLayout
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState<CallType | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('excellent');
  const [qualityStats, setQualityStats] = useState({ latency: 0, packetLoss: 0 });
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  // const [incomingCall, setIncomingCall] = useState<{ from: number; type: CallType; callee_status?: string } | null>(null); // Removed - handled by MainLayout
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


  const fetchCallLogs = async () => {
    try {
      const data = await api.getCallLogs();
      setCallLogs(data.logs ?? []);
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



  const currentUserData = user ?? JSON.parse(localStorage.getItem('user') ?? '{}');

  const { search } = useLocation();
  const navigate = useNavigate();
  const hasAutoAnswered = useRef(false);

  // 1. Initial data load - separated to avoid infinite loops
  const loadData = useCallback(async (showLoader = true) => {
    // If a load is already in progress and we're not explicitly forcing a new load, return.
    // Also, if users already exist and we're not forcing a load, don't re-load.
    if (loading && !showLoader) return;
    if (!showLoader && users.length > 0) return; // Avoid unnecessary re-loads if data exists and not forced

    try {
      if (showLoader || users.length === 0) setLoading(true);
      setError(null);

      const data = await api.getInternalChatUsers(i18n.language);
      let loadedUsers = (data.users ?? []) as User[];

      // Fetch online users status
      try {
        const onlineData = await api.getOnlineUsers();
        const onlineUserIds = (onlineData.online_users ?? []) as number[];

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
        } catch {
          debugInfo = 'Unknown object error';
        }
      }
      setError(debugInfo || t('common:error_loading', 'Ошибка загрузки данных'));
    } finally {
      setLoading(false);
    }
  }, [i18n.language]); // Removed users.length and loading to prevent infinite loop

  useEffect(() => {
    loadData(true);
  }, [i18n.language, loadData]); // Added loadData to dependencies as it's a useCallback function

  // 2. Auto-answer logic - separated and made non-blocking
  useEffect(() => {
    const params = new URLSearchParams(search);
    const isAnswer = params.get('answer') === 'true';
    const fromIdStr = params.get('from');

    if (isAnswer && fromIdStr && !hasAutoAnswered.current) {
      hasAutoAnswered.current = true; // Guard against multiple triggers
      const fromId = parseInt(fromIdStr);
      const callTypeFromUrl = (params.get('type') as CallType) ?? 'audio';

      console.log('🚀 [InternalChat:AutoAnswer] 1. URL param detected. Starting auto-answer flow for caller:', fromId);

      // Explicitly set these in the service BEFORE calling acceptCall
      webrtcService.setRemoteUserId(fromId);
      webrtcService.setCallType(callTypeFromUrl);
      setCallType(callTypeFromUrl);

      // PART A: Acceptance - FAST and independent of user list
      const performAcceptance = async () => {
        try {
          console.info('🚀 [InternalChat:AutoAnswer] 2a. Triggering webrtcService.acceptCall()');

          // Clear URL params using navigate to properly update hook state
          // Explicitly use location.pathname to ensure params are stripped
          navigate(location.pathname, { replace: true });

          await webrtcService.acceptCall();
          console.info('✅ [InternalChat:AutoAnswer] 3a. Call acceptance signal sent');
          toast.success(t('calls.accepted_automatically', 'Вызов принят автоматически'));
        } catch (err) {
          console.error("❌ [InternalChat:AutoAnswer] FAILED to auto-answer:", err);
          toast.error(t('calls.error_accepting', 'Ошибка при принятии вызова'));
          hasAutoAnswered.current = false; // Allow retry if failed
        }
      };

      // Slight delay to ensure PeerConnection singleton is ready and listeners are attached
      const acceptanceTimer = setTimeout(performAcceptance, 350); // Increased slightly for listener safety

      // PART B: Selection - UX improvement, wait for user list
      let selectionInterval: NodeJS.Timeout | null = null;
      let selectionAttempts = 0;

      const trySelectUser = () => {
        if (users.length > 0) {
          const caller = users.find(u => u.id === fromId);
          if (caller) {
            console.log('🚀 [InternalChat:AutoAnswer] 2b. Caller found, selecting user:', caller.full_name);
            setSelectedUser(caller);
            return true;
          }
        }
        return false;
      };

      if (!trySelectUser()) {
        selectionInterval = setInterval(() => {
          selectionAttempts++;
          if (trySelectUser()) {
            if (selectionInterval) clearInterval(selectionInterval);
          } else if (selectionAttempts > 10) { // 5 seconds
            console.warn('⚠️ [InternalChat:AutoAnswer] Could not find user in list for selection after timeout');
            if (selectionInterval) clearInterval(selectionInterval);
          }
        }, 500);
      }

      return () => {
        clearTimeout(acceptanceTimer);
        if (selectionInterval) clearInterval(selectionInterval);
      };
    }
  }, [search, users.length > 0]); // Dependency on search and whether users list is loaded

  useEffect(() => {
    if (showCallHistory) {
      fetchCallLogs();
    }
  }, [showCallHistory]);

  // Initial fetch
  useEffect(() => {
    fetchCallLogs();
  }, []);

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

    // Handle page unload/refresh
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliability during page unload
      navigator.sendBeacon('/api/internal-chat/status/offline');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // 3. Initialize WebRTC service and Listeners
  useEffect(() => {
    if (currentUserData?.id) {
      // Инициализация безопасна для повторного вызова
      webrtcService.initialize(currentUserData.id).catch(err => {
        console.error('Failed to initialize WebRTC:', err);
      });

      // Sync initial state from service if already in call
      if (webrtcService.isInCall()) {
        console.log('🔄 [InternalChat] Synchronizing state with ACTIVE call');
        setIsInCall(true);
        setCallType(webrtcService.getCallType());

        const remoteId = webrtcService.getRemoteUserId();
        if (remoteId && !selectedUser && users.length > 0) {
          const caller = users.find(u => u.id === remoteId);
          if (caller) {
            console.log('🔄 [InternalChat] Auto-selecting user from active call:', caller.full_name);
            setSelectedUser(caller);
          }
        }
      }

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
        console.info('☎️ [InternalChat] handleCallAccepted event triggered');
        webrtcService.stopRingtone(); // Stop ringing
        setIsCalling(false);
        setIsInCall(true);
        setIsLocalOnHold(false);
        setIsRemoteOnHold(false);
        setCallStartTime(Date.now());
        toast.success(t('calls.call_accepted', 'Звонок принят'));
      };

      const handleCallRejected = (reason?: string) => {
        console.info('☎️ [InternalChat] handleCallBlocked/Rejected event triggered');
        webrtcService.stopRingtone();
        setIsCalling(false);
        if (reason === 'busy') {
          toast.error(t('calls.user_busy', 'Пользователь занят'));
        } else {
          setIsInCall(false);
          toast.error(t('calls.call_rejected', 'Звонок отклонен'));
        }
      };

      const handleRemoteStream = (stream: MediaStream) => {
        console.log('📺 [InternalChat] handleRemoteStream event triggered');
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
        console.info('☎️ [InternalChat] handleCallEnded event triggered');
        webrtcService.stopRingtone();
        setIsCalling(false);
        handleCallEndedByRemote();
      };

      const handleError = (error: string) => {
        toast.error(error);
      };

      const handleProgress = (data: { url: string, currentTime: number }) => {
        setPreviewCurrentTime(data.currentTime);
      };

      // Redundant safely handled listener for InternalChat specifically
      const handleIncomingCallLocal = (fromId: number, type: CallType, _status: string, name?: string) => {
        console.log('☎️ [InternalChat] Redundant incoming call listener caught event', { fromId, type, name });
        toast.info(`${t('calls.incoming_call', 'Входящий звонок')}: ${name || fromId}`);
      };

      webrtcService.addEventListener('incomingCall', handleIncomingCallLocal);
      webrtcService.addEventListener('userStatus', handleUserStatusChange);
      webrtcService.addEventListener('qualityChange', handleQualityChange);
      webrtcService.addEventListener('callAccepted', handleCallAccepted);
      webrtcService.addEventListener('callRejected', handleCallRejected);
      webrtcService.addEventListener('remoteStream', handleRemoteStream);
      webrtcService.addEventListener('callEnded', handleCallEnded);
      webrtcService.addEventListener('hold', handleHold);
      webrtcService.addEventListener('resume', handleResume);
      webrtcService.addEventListener('error', handleError);
      webrtcService.addEventListener('previewProgress', handleProgress);

      return () => {
        webrtcService.stopRingtone();
        webrtcService.removeEventListener('incomingCall', handleIncomingCallLocal);
        webrtcService.removeEventListener('userStatus', handleUserStatusChange);
        webrtcService.removeEventListener('qualityChange', handleQualityChange);
        webrtcService.removeEventListener('callAccepted', handleCallAccepted);
        webrtcService.removeEventListener('callRejected', handleCallRejected);
        webrtcService.removeEventListener('remoteStream', handleRemoteStream);
        webrtcService.removeEventListener('callEnded', handleCallEnded);
        webrtcService.removeEventListener('error', handleError);
        webrtcService.removeEventListener('previewProgress', handleProgress);
      };
    }
  }, [currentUserData?.id, users.length > 0]); // Dependency on users to sync selectedUser if already in call



  // loadData was moved up and wrapped in useCallback to prevent loops


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
    const textToSend = messageText ?? newMessage;

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
        message: fileUrl ?? finalMessage,
        is_read: false,
        created_at: new Date().toISOString(),
        sender_name: currentUserData?.full_name ?? currentUserData?.username,
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

  const loadCallInitialData = async () => {
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

  useEffect(() => {
    loadCallInitialData();
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
    if (!selectedUser) {
      console.warn('⚠️ [InternalChat:Call] Cannot start call: No user selected');
      return;
    }
    try {
      console.info(`📞 [InternalChat:Call] 1. Initiating ${type.toUpperCase()} call to:`, selectedUser.full_name, `(ID: ${selectedUser.id})`);
      setCallType(type);
      setIsCalling(true);

      console.info('🚀 [InternalChat:Call] 2. Calling webrtcService.startCall()');
      await webrtcService.startCall(selectedUser.id, type);

      console.info('🎵 [InternalChat:Call] 3. Starting outgoing ringtone');
      webrtcService.playRingtone('outgoing');
    } catch (err) {
      console.error('❌ [InternalChat:Call] FAILED to start call:', err);
      setIsCalling(false);
      toast.error(t('calls.error_media', 'Ошибка доступа к медиа-устройствам'));
    }
  };

  /* 
  const handleAcceptCall = async () => {
    try {
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
    } catch (err) {
      console.error('Error accepting call:', err);
      toast.error(t('calls.error_accepting', 'Ошибка при приёме звонка'));
    }
  };
 
  const handleRejectCall = () => {
    webrtcService.rejectCall();
    webrtcService.stopRingtone();
    setIncomingCall(null);
  };
  */

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleCallEndedByRemote = () => {
    console.info('📴 [InternalChat:Call] Call ended by remote party or connection lost');
    stopCallRecording(); // Stop recording if active
    setIsInCall(false);
    setIsCalling(false);
    setCallType(null);
    // setIncomingCall(null); // Managed by MainLayout
    setIsMicMuted(false);
    setIsVideoOff(false);
    setIsMinimized(false);

    console.info('🎵 [InternalChat:Call] Playing end-of-call sound');
    webrtcService.playRingtone('end');

    if (callStartTime && selectedUser) {
      const duration = Date.now() - callStartTime;
      const durationText = formatDuration(duration);
      console.info(`📝 [InternalChat:Call] Call lasted ${durationText}. Sending status message.`);
      handleSendMessage(`${t('calls.ended', 'Звонок завершен')}. ${t('calls.duration', 'Длительность')}: ${durationText}`, 'call_log');
      setCallStartTime(null);
    }

    toast.info(t('calls.call_ended', 'Звонок завершен'));
  };

  const endCall = () => {
    console.info('📴 [InternalChat:Call] Locally terminating call');
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

  if (loading && users.length === 0) {
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
    <div className="h-[calc(100vh-4rem)] w-full flex bg-background overflow-hidden relative">
      {/* Incoming Call Modal is now handled globally in MainLayout */}

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

                  {/* Second line handling removed - handled globally by MainLayout */}
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
            <div className="flex items-center gap-1">
              <button
                onClick={toggleDnd}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all border ${isDndEnabled ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-600 border-green-500/20'}`}
                title={isDndEnabled ? t('calls.dnd_on', 'Не беспокоить') : t('calls.available', 'В сети')}
              >
                <div className={`w-2 h-2 rounded-full ${isDndEnabled ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse'}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{isDndEnabled ? 'DND' : 'Online'}</span>
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-accent rounded-full text-muted-foreground hover:text-foreground transition-colors"
                title={t('settings.audio_settings', 'Настройки звука')}
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
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
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-bold text-sm text-foreground truncate pr-2">
                      {user.full_name ?? user.username}
                      {user.id === currentUserData?.id && ` (${t('common:you', 'Вы')})`}
                    </span>
                  </div>
                  <div className="flex items-center text-[11px] text-muted-foreground min-h-[16px]">
                    {user.is_online ? (
                      <span className="flex items-center gap-1.5 text-green-500 font-bold">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        {t('status.online', 'В сети')}
                        <span className="mx-1 opacity-30 text-muted-foreground font-normal">•</span>
                        <span className="opacity-70 font-normal">
                          {user.role === 'director' ? t('common:director', 'Директор') : t('common:employee', 'Сотрудник')}
                        </span>
                      </span>
                    ) : (
                      <span className="truncate flex items-center gap-1">
                        <Clock className="w-3 h-3 opacity-50" />
                        {user.last_seen
                          ? `${t('status.last_seen', 'Был(а)')} ${new Date(user.last_seen).toLocaleDateString('ru-RU')} ${new Date(user.last_seen).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
                          : t('status.offline', 'Не в сети')}
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
      <div className={`flex-1 flex flex-col min-w-0 ${(!selectedUser || showMobileUserList) ? 'hidden md:flex' : 'flex'}`}>
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
                    src={getUserAvatar(selectedUser) ?? undefined}
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
                {/* Show Call History button when NOT in call */}
                {!isInCall && (
                  <button
                    onClick={() => setShowCallHistory(true)}
                    className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                    title={t('calls.history', 'История звонков')}
                  >
                    <HistoryIcon className="w-5 h-5" />
                  </button>
                )}

                {/* Show Invite/UserPlus ONLY when in call */}
                {isInCall && (
                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                    title={t('calls.invite', 'Пригласить сотрудников')}
                  >
                    <UserPlus className="w-5 h-5" />
                  </button>
                )}
              </div>

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
                                ? (msg.message.split('\n\n')[1] ?? msg.message)
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
      {
        showSettings && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center"
            onClick={() => {
              setShowSettings(false);
              webrtcService.stopRingtone();
              setPlayingPreviewUrl(null);
            }}
          >
            <div
              className="bg-card w-full max-w-md p-6 rounded-2xl shadow-2xl border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Settings className="w-6 h-6 text-primary" />
                  {t('settings.audio_settings', 'Настройки звука')}
                </h3>
                <button
                  onClick={() => {
                    setShowSettings(false);
                    webrtcService.stopRingtone();
                    setPlayingPreviewUrl(null);
                  }}
                  className="p-2 hover:bg-muted rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* DND Toggle - redundant for visibility */}
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border">
                  <div>
                    <p className="font-bold text-sm tracking-tight">{t('calls.dnd_mode', 'Режим "Не беспокоить"')}</p>
                    <p className="text-xs text-muted-foreground">{t('calls.dnd_hint', 'Вы не будете получать уведомления о звонках')}</p>
                  </div>
                  <button
                    onClick={() => {
                      toggleDnd();
                      webrtcService.setDnd(!isDndEnabled);
                    }}
                    className={`w-12 h-6 rounded-full transition-all relative ${isDndEnabled ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-gray-300 dark:bg-gray-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isDndEnabled ? 'left-7 shadow-sm' : 'left-1'}`} />
                  </button>
                </div>

                {/* Ringtone Selection */}
                <div className="space-y-4">
                  <label className="block text-sm font-bold tracking-tight uppercase opacity-50">{t('settings.ringtone', 'Мелодия звонка')}</label>

                  {/* Preset Choices with Scrollbar */}
                  <div className="max-h-72 overflow-y-scroll pr-2">
                    <div className="grid grid-cols-2 gap-3 items-start">
                      {ringtones.map(preset => (
                        <div key={preset.id} className={`relative group overflow-hidden rounded-2xl border transition-all ${trimmingRingtoneId === preset.id ? 'col-span-2 border-primary ring-1 ring-primary/20 shadow-sm' : (customRingtone === preset.full_url ? 'border-primary ring-1 ring-primary/20 shadow-sm' : 'border-border/50 hover:border-primary/30')}`}>
                          <div className="relative flex items-center h-14">
                            <button
                              onClick={() => {
                                webrtcService.setRingtone(preset.full_url, preset.start_time || 0, preset.end_time);
                                setCustomRingtone(preset.full_url);
                                if (preset.full_url) {
                                  setPlayingPreviewUrl(preset.full_url);
                                  webrtcService.playPreview(
                                    preset.full_url,
                                    () => setPlayingPreviewUrl(null),
                                    preset.start_time || 0,
                                    preset.end_time
                                  );
                                } else {
                                  webrtcService.stopRingtone();
                                  setPlayingPreviewUrl(null);
                                }
                              }}
                              className={`flex-1 h-full text-xs font-bold transition-all relative overflow-hidden ${((customRingtone === preset.full_url))
                                ? 'bg-primary/20 text-primary'
                                : 'bg-card hover:bg-muted/50'}`}
                            >
                              <div className="flex items-center w-full h-full pr-28 overflow-hidden text-left pl-4">
                                <div className={`w-full ${preset.name.length > 10 ? (playingPreviewUrl === preset.full_url ? 'animate-marquee whitespace-nowrap' : 'truncate') : 'whitespace-nowrap'}`}>
                                  {preset.name}
                                </div>
                              </div>
                            </button>

                            {/* Controls Container with background to hide scrolling text */}
                            <div className="absolute right-0 top-0 bottom-0 flex items-center gap-1.5 pr-2 pl-4 bg-gradient-to-l from-card via-card to-transparent z-10 group-hover:from-muted/80 group-hover:via-muted/80 transition-all">
                              {/* Trim Button (Only for non-system) */}
                              {!preset.is_system && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (trimmingRingtoneId === preset.id) {
                                      setTrimmingRingtoneId(null);
                                    } else {
                                      // Pre-load audio to get duration
                                      const tempAudio = new Audio(preset.full_url);
                                      tempAudio.addEventListener('loadedmetadata', () => {
                                        const duration = tempAudio.duration;
                                        setTotalDuration(duration);
                                        setTrimmingRingtoneId(preset.id);
                                        setTrimParams({
                                          startTime: preset.start_time || 0,
                                          endTime: preset.end_time || Math.min(duration, 30)
                                        });
                                      });
                                    }
                                  }}
                                  className={`p-1.5 rounded-full transition-all hover:scale-110 ${trimmingRingtoneId === preset.id ? 'bg-primary text-white' : 'text-muted-foreground hover:text-primary'}`}
                                  title={t('settings.trim', 'Обрезать')}
                                >
                                  <Scissors className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Play/Pause Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (playingPreviewUrl === preset.full_url) {
                                    webrtcService.stopRingtone();
                                    setPlayingPreviewUrl(null);
                                  } else {
                                    console.log('▶️ Playing preview:', preset.full_url);
                                    setPlayingPreviewUrl(preset.full_url);
                                    webrtcService.playPreview(
                                      preset.full_url,
                                      () => setPlayingPreviewUrl(null),
                                      preset.start_time || 0,
                                      preset.end_time
                                    );
                                  }
                                }}
                                className={`p-1.5 rounded-full transition-all hover:scale-110 ${playingPreviewUrl === preset.full_url ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}
                                title={playingPreviewUrl === preset.full_url ? t('common:pause', 'Пауза') : t('common:play', 'Прослушать')}
                              >
                                {playingPreviewUrl === preset.full_url ? (
                                  <Pause className="w-3.5 h-3.5 fill-current" />
                                ) : (
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                )}
                              </button>

                              {/* Delete Button (Only for non-system) */}
                              {!preset.is_system && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (playingPreviewUrl === preset.full_url) {
                                      webrtcService.stopRingtone();
                                      setPlayingPreviewUrl(null);
                                    }
                                    try {
                                      await api.deleteRingtone(preset.id);
                                      if (customRingtone === preset.full_url) {
                                        setCustomRingtone(null);
                                        webrtcService.setRingtone('');
                                      }
                                      toast.success(t('settings.ringtone_deleted', 'Мелодия удалена'));
                                      fetchRingtones();
                                    } catch (err) {
                                      toast.error('Failed to delete');
                                    }
                                  }}
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                                  title={t('common:delete', 'Удалить')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Trimming UI Expansion */}
                          {trimmingRingtoneId === preset.id && (
                            <div className="p-4 bg-muted/30 border-t border-border space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                              <div className="flex items-center justify-between text-[10px] font-bold uppercase opacity-50">
                                <span>{t('settings.trim_range', 'Интервал')}</span>
                                <span className="text-primary">{trimParams.startTime.toFixed(1)}s - {trimParams.endTime.toFixed(1)}s</span>
                              </div>

                              <div className="space-y-4">
                                <div className="flex items-center gap-1">
                                  {/* Left Arrow */}
                                  <button
                                    onClick={() => {
                                      if (trimmerScrollRef.current) {
                                        trimmerScrollRef.current.scrollBy({ left: -100, behavior: 'smooth' });
                                      }
                                    }}
                                    className="p-1 text-muted-foreground hover:text-primary transition-colors"
                                  >
                                    <ChevronLeft className="w-4 h-4" />
                                  </button>

                                  <div className="flex-1 relative group py-6 overflow-hidden">
                                    <div
                                      ref={trimmerScrollRef}
                                      className="audio-trimmer-scroll-container hide-scrollbar overflow-x-auto"
                                    >
                                      {/* Visual Track */}
                                      <div
                                        ref={trimmerTrackRef}
                                        className="audio-trimmer-track cursor-pointer select-none bg-black/40"
                                        style={{ minWidth: `${totalDuration * 20}px` }}
                                        onMouseDown={(e) => {
                                          if (trimmerTrackRef.current) {
                                            const rect = trimmerTrackRef.current.getBoundingClientRect();
                                            const x = e.clientX - rect.left;
                                            const percentage = x / rect.width;
                                            const seekTime = Math.max(0, Math.min(totalDuration, percentage * totalDuration));
                                            setPreviewCurrentTime(seekTime);
                                            webrtcService.seekPreview(seekTime);
                                            setIsDraggingPlayhead(true);

                                            if (playingPreviewUrl !== preset.full_url) {
                                              setPlayingPreviewUrl(preset.full_url);
                                              webrtcService.playPreview(preset.full_url, () => setPlayingPreviewUrl(null), seekTime, trimParams.endTime);
                                            }
                                          }
                                        }}
                                        onMouseMove={(e) => {
                                          if (isDraggingPlayhead && trimmerTrackRef.current) {
                                            const rect = trimmerTrackRef.current.getBoundingClientRect();
                                            const x = e.clientX - rect.left;
                                            const percentage = x / rect.width;
                                            const seekTime = Math.max(0, Math.min(60, percentage * 60));
                                            setPreviewCurrentTime(seekTime);
                                            webrtcService.seekPreview(seekTime);
                                          }
                                        }}
                                        onMouseUp={() => setIsDraggingPlayhead(false)}
                                        onMouseLeave={() => setIsDraggingPlayhead(false)}
                                      >
                                        {/* Mock Waveform Bars */}
                                        <div className="absolute inset-0 flex items-center justify-between gap-[2px] px-2 opacity-20 pointer-events-none">
                                          {[...Array(Math.floor(totalDuration * 2))].map((_, i) => (
                                            <div
                                              key={i}
                                              className="waveform-bar"
                                              style={{ height: `${20 + Math.abs(Math.sin(i * 0.5) * 60) + (i % 4 === 0 ? 15 : 0)}%`, width: '3px' }}
                                            />
                                          ))}
                                        </div>

                                        {/* Selection Highlight */}
                                        <div
                                          className="trim-selection pointer-events-none"
                                          style={{
                                            left: `${(trimParams.startTime / totalDuration) * 100}%`,
                                            width: `${((trimParams.endTime - trimParams.startTime) / totalDuration) * 100}%`
                                          }}
                                        />

                                        {/* Playhead Indicator (The Stick) */}
                                        <div
                                          className="absolute top-0 bottom-0 w-[4px] bg-slate-800 shadow-[0_0_10px_rgba(0,0,0,0.4)] z-40 transition-all duration-100 ease-linear pointer-events-none"
                                          style={{ left: `${(previewCurrentTime / totalDuration) * 100}%` }}
                                        >
                                          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary shadow-2xl border-2 border-white pointer-events-auto cursor-grab active:cursor-grabbing hover:scale-125 transition-transform" />
                                        </div>

                                        {/* Start Handle (Range Input) */}
                                        <input
                                          type="range"
                                          min="0"
                                          max={totalDuration}
                                          step="0.1"
                                          value={trimParams.startTime}
                                          onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setTrimParams(prev => ({
                                              ...prev,
                                              startTime: Math.min(val, prev.endTime - 1)
                                            }));
                                          }}
                                          className="dual-range-input z-30"
                                          onClick={(e) => e.stopPropagation()}
                                        />

                                        {/* End Handle (Range Input) */}
                                        <input
                                          type="range"
                                          min="0"
                                          max={totalDuration}
                                          step="0.1"
                                          value={trimParams.endTime}
                                          onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setTrimParams(prev => ({
                                              ...prev,
                                              endTime: Math.max(val, prev.startTime + 1)
                                            }));
                                          }}
                                          className="dual-range-input z-20"
                                          onClick={(e) => e.stopPropagation()}
                                        />

                                        {/* Floating Time Labels */}
                                        <span
                                          className="time-marker"
                                          style={{ left: `${(trimParams.startTime / totalDuration) * 100}%`, transform: 'translateX(-50%)' }}
                                        >
                                          {trimParams.startTime.toFixed(1)}s
                                        </span>
                                        <span
                                          className="time-marker px-2 py-0.5 bg-primary text-white text-[9px] rounded-full shadow-lg font-bold"
                                          style={{ left: `${(trimParams.endTime / totalDuration) * 100}%`, transform: 'translateX(-50%)' }}
                                        >
                                          {trimParams.endTime.toFixed(1)}s
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right Arrow */}
                                  <button
                                    onClick={() => {
                                      if (trimmerScrollRef.current) {
                                        trimmerScrollRef.current.scrollBy({ left: 100, behavior: 'smooth' });
                                      }
                                    }}
                                    className="p-1 text-muted-foreground hover:text-primary transition-colors"
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => {
                                    setPreviewCurrentTime(trimParams.startTime);
                                    webrtcService.playPreview(preset.full_url, () => { }, trimParams.startTime, trimParams.endTime);
                                  }}
                                  className="flex-1 py-1.5 bg-primary/10 text-primary text-[10px] font-bold rounded-lg hover:bg-primary/20 transition-all"
                                >
                                  {t('common:test', 'Тест')}
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      console.log(`💾 Saving trim for ringtone ${preset.id}:`, trimParams);
                                      await api.updateRingtoneTrim(preset.id, trimParams.startTime, trimParams.endTime);

                                      // Crucial: Update the service immediately so the "old" melody doesn't stick
                                      webrtcService.setRingtone(preset.full_url, trimParams.startTime, trimParams.endTime);

                                      toast.success(t('common:saved', 'Сохранено'));
                                      fetchRingtones();
                                      setTrimmingRingtoneId(null);
                                    } catch (e: any) {
                                      console.error('❌ Save trim failed:', e);
                                      toast.error(e.message || 'Save failed');
                                    }
                                  }}
                                  className="flex-1 py-1.5 bg-primary text-white text-[10px] font-bold rounded-lg hover:opacity-90 transition-all"
                                >
                                  {t('common:save', 'Сохранить')}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Volume slider */}
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between items-center text-xs font-bold uppercase opacity-50">
                      <span>{t('settings.volume', 'Громкость')}</span>
                      <span>{Math.round(webrtcService.getVolume() * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={localVolume}
                      onInput={(e) => {
                        const vol = parseFloat((e.target as HTMLInputElement).value);
                        setLocalVolume(vol);
                        webrtcService.setVolume(vol);
                      }}
                      className="w-full accent-primary h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="relative mt-6">
                    <label className="block text-[10px] font-bold uppercase opacity-50 mb-2">{t('settings.upload_custom', 'Загрузить свою')}</label>
                    <div className="flex justify-center mt-2">
                      <label
                        htmlFor="ringtone-upload"
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-secondary/50 hover:bg-secondary rounded-xl cursor-pointer transition-all group w-full"
                      >
                        <Paperclip className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-sm font-medium text-foreground">
                          {t('settings.upload_custom', 'Загрузить свою')}
                        </span>
                      </label>
                    </div>

                    <input
                      type="file"
                      id="ringtone-upload"
                      accept="audio/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            toast.error(t('settings.file_too_large', { max: 10 }));
                            return;
                          }

                          try {
                            const loadingToast = toast.loading(t('common:uploading', 'Загрузка...'));
                            const response = await api.uploadRingtone(file);

                            if (response && response.full_url) {
                              await fetchRingtones();
                              webrtcService.setRingtone(response.full_url);
                              setCustomRingtone(response.full_url);
                              toast.success(t('settings.ringtone_saved', 'Пользовательская мелодия сохранена'));
                            }
                            toast.dismiss(loadingToast);
                          } catch (error) {
                            console.error(error);
                            toast.error(t('settings.save_failed', 'Ошибка загрузки файла'));
                          }

                          // Clear input
                          e.target.value = '';
                        }
                      }}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }
      {/* Invite Modal */}
      {
        isInviteModalOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
            onClick={() => setIsInviteModalOpen(false)}
          >
            <div
              className="bg-card w-full max-w-md p-6 rounded-2xl shadow-2xl border border-border"
              onClick={(e) => e.stopPropagation()}
            >
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
        )
      }
      {/* Transfer Call Modal */}
      {
        isTransferModalOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
            onClick={() => setIsTransferModalOpen(false)}
          >
            <div
              className="bg-card w-full max-w-md p-6 rounded-2xl shadow-2xl border border-border"
              onClick={(e) => e.stopPropagation()}
            >
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
        )
      }

      {/* Outgoing Call Overlay (Calling State) */}
      {
        isCalling && (
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
                onClick={() => {
                  endCall();
                  // Force close overlay immediately
                  setIsCalling(false);
                  setCallType(null);
                  webrtcService.stopRingtone();
                }}
                className="w-20 h-20 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95"
              >
                <PhoneOff className="w-10 h-10" />
              </button>
              <span className="text-white/60 font-medium uppercase tracking-widest text-xs">
                {t('calls.cancel_call', 'Отменить')}
              </span>
            </div>
          </div>
        )
      }

      {/* Call History Side Sheet */}
      {
        showCallHistory && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
            onClick={() => setShowCallHistory(false)}
          >
            <div
              className="bg-card w-full max-w-xl p-6 rounded-2xl shadow-2xl border border-border"
              onClick={(e) => e.stopPropagation()}
            >
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
                {Array.isArray(callLogs) && callLogs.map((log) => (
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
        )
      }
      {/* (Adding logic to show history could be a dedicated tab, let's add a toggle-able overlay) */}

    </div >
  );
}

