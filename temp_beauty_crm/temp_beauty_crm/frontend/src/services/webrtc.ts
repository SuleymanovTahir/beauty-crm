/**
 * WebRTC Service для видео/аудио звонков
 * Управляет peer connections и сигнализацией через WebSocket
 */

export interface CallUser {
  id: number;
  full_name: string;
}

export type CallType = 'audio' | 'video';

interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

const DEFAULT_CONFIG: WebRTCConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

export class WebRTCService {
  private ws: WebSocket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private currentUserId: number | null = null;
  private remoteUserId: number | null = null;
  private callType: CallType = 'audio';

  // Callback properties (for component compatibility)
  public onIncomingCall: ((fromUserId: number, type: CallType) => void) | null = null;
  public onCallAccepted: (() => void) | null = null;
  public onCallRejected: (() => void) | null = null;
  public onCallEnded: (() => void) | null = null;
  public onRemoteStream: ((stream: MediaStream) => void) | null = null;
  public onError: ((error: string) => void) | null = null;

  // Event listeners storage
  private listeners: Record<string, Function[]> = {};

  // Internal state
  private iceCandidatesQueue: RTCIceCandidateInit[] = [];
  private isRemoteDescriptionSet: boolean = false;

  // Media control state
  private isAudioEnabled: boolean = true;
  private isVideoEnabled: boolean = true;
  private qualityCheckInterval: any = null;

  // Audio handling
  private audioContext: AudioContext | null = null;
  private activeOscillators: any[] = [];
  private isRinging: boolean = false;

  /**
   * Subscribe to an event
   */
  addEventListener(event: string, callback: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Unsubscribe from an event
   */
  removeEventListener(event: string, callback: Function): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  /**
   * Emit an event to all subscribers and callback properties
   */
  private emit(event: string, ...args: any[]): void {
    // Call callback properties for backwards compatibility
    switch (event) {
      case 'incomingCall':
        if (this.onIncomingCall) this.onIncomingCall(args[0], args[1]);
        break;
      case 'callAccepted':
        if (this.onCallAccepted) this.onCallAccepted();
        break;
      case 'callRejected':
        if (this.onCallRejected) this.onCallRejected();
        break;
      case 'callEnded':
        if (this.onCallEnded) this.onCallEnded();
        break;
      case 'remoteStream':
        if (this.onRemoteStream) this.onRemoteStream(args[0]);
        break;
      case 'error':
        if (this.onError) this.onError(args[0]);
        break;
    }

    // Also call event listeners
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => {
        try {
          cb(...args);
        } catch (err) {
          console.error(`Error in listener for event ${event}:`, err);
        }
      });
    }
  }

  /**
   * Stop all playing ringtones/sounds
   */
  stopRingtone(): void {
    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) { /* ignore */ }
    });
    this.activeOscillators = [];
    this.isRinging = false;
  }

  /**
   * Play ringtone sounds
   */
  playRingtone(type: 'incoming' | 'outgoing' | 'end'): void {
    try {
      // Don't play if already ringing (prevent overlap)
      if (this.isRinging && type !== 'end') return;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      const ctx = this.audioContext;

      // Resume context if suspended
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      this.stopRingtone(); // Stop previous sounds

      if (type === 'incoming') {
        this.isRinging = true;
        // Rhythmic ringing loop
        const startBeep = (time: number) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.frequency.value = 800;
          g.gain.setValueAtTime(0.1, time);
          g.gain.linearRampToValueAtTime(0, time + 1);
          o.start(time);
          o.stop(time + 1);
          this.activeOscillators.push(o);
        };

        // Schedule 15 seconds of ringing
        for (let i = 0; i < 15; i++) {
          startBeep(ctx.currentTime + i * 2);
        }

      } else if (type === 'outgoing') {
        this.isRinging = true;
        // Dial tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.value = 440;
        gain.gain.value = 0.05;

        // Pulse it
        const lfo = ctx.createOscillator();
        lfo.type = 'square';
        lfo.frequency.value = 0.5;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 500;

        osc.start();
        this.activeOscillators.push(osc);

        // Stop dialing after 30s timeout
        setTimeout(() => {
          if (this.isRinging) this.stopRingtone();
        }, 30000);

      } else if (type === 'end') {
        // Disconnect tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.value = 300;
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.error('Audio playback failed', e);
    }
  }

  /**
   * Инициализация WebRTC сервиса
   */
  async initialize(userId: number): Promise<void> {
    // Skip if already initialized with the same user and WebSocket is open
    if (this.currentUserId === userId && this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('🔌 [WebRTC] Already initialized and connected, skipping...');
      return;
    }

    this.currentUserId = userId;
    await this.connectWebSocket();
  }

  /**
   * Подключение к WebSocket серверу для сигнализации
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Используем wss:// для HTTPS (Secure WebSocket) для безопасности
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const port = window.location.port || (protocol === 'wss:' ? '443' : '80');
      const wsUrl = `${protocol}//${window.location.hostname}${port !== '443' && port !== '80' ? ':' + port : ''}/api/webrtc/signal`;
      console.log(`🔌 [WebRTC] Connecting to WebSocket: ${wsUrl}`);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebRTC WebSocket connected');
        // Регистрируем пользователя
        this.sendSignal({
          type: 'register',
          user_id: this.currentUserId
        });
        resolve();
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleSignal(data);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', 'Ошибка подключения к серверу звонков');
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.cleanup();
      };
    });
  }

  /**
   * Обработка сигналов от сервера
   */
  private async handleSignal(data: any): Promise<void> {
    switch (data.type) {
      case 'registered':
        console.log('Registered for WebRTC:', data.user_id);
        break;

      case 'incoming-call':
        console.log('📞 Incoming call from:', data.from);
        this.remoteUserId = data.from;
        this.callType = data.call_type;
        this.emit('incomingCall', data.from, data.call_type);
        break;

      case 'call-accepted':
        console.log('Call accepted by:', data.from);
        this.emit('callAccepted');
        await this.createOffer();
        break;

      case 'call-rejected':
        console.log('Call rejected by:', data.from);
        this.emit('callRejected');
        this.cleanup();
        break;

      case 'offer':
        console.log('📩 Received offer from:', data.from);
        await this.handleOffer(data.sdp);
        break;

      case 'answer':
        console.log('📩 Received answer from:', data.from);
        await this.handleAnswer(data.sdp);
        break;

      case 'ice-candidate':
        console.log('🧊 Received ICE candidate');
        await this.handleIceCandidate(data.candidate);
        break;

      case 'hangup':
        console.log('📴 Call ended by remote user');
        this.emit('callEnded');
        this.cleanup();
        break;

      case 'error':
        console.error('Server error:', data.message);
        this.emit('error', data.message);
        break;

      case 'user_status':
        console.log(`👤 User ${data.user_id} is ${data.status}`);
        this.emit('userStatus', data.user_id, data.status === 'online', data.last_seen || data.timestamp);
        break;
    }
  }

  /**
   * Отправка сигнала на сервер
   */
  private sendSignal(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  /**
   * Начать звонок
   */
  async startCall(toUserId: number, callType: CallType = 'audio'): Promise<void> {
    try {
      this.remoteUserId = toUserId;
      this.callType = callType;

      // Получаем доступ к камере/микрофону
      await this.getMediaDevices(callType);

      // Создаем peer connection
      this.createPeerConnection();

      // Отправляем сигнал о звонке
      this.sendSignal({
        type: 'call',
        from: this.currentUserId,
        to: toUserId,
        call_type: callType
      });

      console.log(`📞 Calling user ${toUserId} (${callType})`);
    } catch (error) {
      console.error('Error starting call:', error);
      this.emit('error', 'Не удалось получить доступ к камере/микрофону');
      this.cleanup();
    }
  }

  /**
   * Принять входящий звонок
   */
  async acceptCall(): Promise<void> {
    try {
      // Получаем доступ к камере/микрофону
      await this.getMediaDevices(this.callType);

      // Создаем peer connection
      this.createPeerConnection();

      // Отправляем подтверждение
      this.sendSignal({
        type: 'accept-call',
        from: this.currentUserId,
        to: this.remoteUserId
      });

      // Вызываем событие локально
      this.emit('callAccepted');

      console.log('Call accepted');
    } catch (error) {
      console.error('Error accepting call:', error);
      this.emit('error', 'Не удалось получить доступ к камере/микрофону');
      this.cleanup();
    }
  }

  /**
   * Отклонить входящий звонок
   */
  rejectCall(): void {
    this.sendSignal({
      type: 'reject-call',
      from: this.currentUserId,
      to: this.remoteUserId
    });
    this.cleanup();
  }

  /**
   * Завершить звонок
   */
  endCall(): void {
    if (this.remoteUserId) {
      console.log(`Ending call with user ${this.remoteUserId}`);
      this.sendSignal({
        type: 'hangup',
        from: this.currentUserId,
        to: this.remoteUserId
      });
    } else {
      console.warn('Attempted to end call but remoteUserId is null');
    }
    this.cleanup();
  }

  /**
   * Получить доступ к медиа-устройствам
   */
  /**
   * Получить доступ к медиа-устройствам
   */
  private async getMediaDevices(callType: CallType): Promise<void> {
    // Stop any existing stream first to ensure camera/mic are released
    if (this.localStream) {
      console.log('Stopping existing local stream tracks...');
      this.localStream.getTracks().forEach(track => track.stop());
    }

    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: callType === 'video' ? {
        width: { ideal: 1280 },
        height: { ideal: 720 }
      } : false
    };

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('🎥 Local stream obtained per constraints');
    } catch (error) {
      console.error('Failed to get media devices:', error);
      throw error;
    }
  }

  /**
   * Создать peer connection
   */
  private createPeerConnection(): void {
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    this.peerConnection = new RTCPeerConnection(DEFAULT_CONFIG);
    // WebRTC connection is encrypted by default (DTLS-SRTP)

    // Добавляем локальный stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }

    // Обработка удаленного stream
    this.peerConnection.ontrack = (event) => {
      console.log('📺 Remote track received');
      this.remoteStream = event.streams[0];
      this.emit('remoteStream', this.remoteStream);
    };

    // Обработка ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({
          type: 'ice-candidate',
          from: this.currentUserId,
          to: this.remoteUserId,
          candidate: event.candidate
        });
      }
    };

    // Обработка изменения состояния соединения
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection?.connectionState);

      if (this.peerConnection?.connectionState === 'connected') {
        this.startQualityMonitoring();
      }

      if (this.peerConnection?.connectionState === 'disconnected' ||
        this.peerConnection?.connectionState === 'failed') {
        this.emit('callEnded');
        this.cleanup();
      }
    };

    console.log('🔗 Peer connection created');
  }

  /**
   * Создать и отправить offer
   */
  private async createOffer(): Promise<void> {
    if (!this.peerConnection) return;

    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      this.sendSignal({
        type: 'offer',
        from: this.currentUserId,
        to: this.remoteUserId,
        sdp: offer
      });

      console.log('📤 Offer sent');
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }

  /**
   * Обработать полученный offer
   */
  private async handleOffer(sdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      this.sendSignal({
        type: 'answer',
        from: this.currentUserId,
        to: this.remoteUserId,
        sdp: answer
      });

      console.log('📤 Answer sent');
      this.processIceQueue();
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  /**
   * Обработать полученный answer
   */
  private async handleAnswer(sdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      this.isRemoteDescriptionSet = true;
      console.log('Answer applied');
      this.processIceQueue();
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  /**
   * Обработать ICE candidate
   */
  private async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) return;

    if (!this.peerConnection.remoteDescription && !this.isRemoteDescriptionSet) {
      console.log('🧊 Queuing ICE candidate (remote description not set)');
      this.iceCandidatesQueue.push(candidate);
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('🧊 ICE candidate added');
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  private async processIceQueue(): Promise<void> {
    if (!this.peerConnection || this.iceCandidatesQueue.length === 0) return;

    console.log(`Processing ${this.iceCandidatesQueue.length} queued ICE candidates`);
    for (const candidate of this.iceCandidatesQueue) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error processing queued ICE candidate:', error);
      }
    }
    this.iceCandidatesQueue = [];
  }

  /**
   * Получить локальный stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Получить удаленный stream
   */
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  /**
   * Переключить микрофон (вкл/выкл)
   */
  toggleAudio(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        this.isAudioEnabled = !this.isAudioEnabled;
        audioTrack.enabled = this.isAudioEnabled;
        console.log(`🎤 Audio ${this.isAudioEnabled ? 'enabled' : 'disabled'}`);
        return this.isAudioEnabled;
      }
    }
    return false;
  }

  /**
   * Переключить камеру (вкл/выкл)
   */
  toggleVideo(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        this.isVideoEnabled = !this.isVideoEnabled;
        videoTrack.enabled = this.isVideoEnabled;
        console.log(`📹 Video ${this.isVideoEnabled ? 'enabled' : 'disabled'}`);
        return this.isVideoEnabled;
      }
    }
    return false;
  }

  /**
   * Получить статус микрофона
   */
  isAudioActive(): boolean {
    return this.isAudioEnabled;
  }

  /**
   * Получить статус камеры
   */
  isVideoActive(): boolean {
    return this.isVideoEnabled;
  }

  /**
   * Начать мониторинг качества соединения
   */
  private startQualityMonitoring(): void {
    if (!this.peerConnection) return;

    this.qualityCheckInterval = setInterval(async () => {
      if (!this.peerConnection) {
        this.stopQualityMonitoring();
        return;
      }

      try {
        const stats = await this.peerConnection.getStats();
        let packetLoss = 0;
        let latency = 0;
        let quality: 'excellent' | 'good' | 'poor' | 'disconnected' = 'good';

        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            packetLoss = report.packetsLost / (report.packetsReceived + report.packetsLost) * 100 || 0;
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            latency = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0;
          }
        });

        if (latency < 100 && packetLoss < 2) {
          quality = 'excellent';
        } else if (latency < 200 && packetLoss < 5) {
          quality = 'good';
        } else if (latency < 500 && packetLoss < 10) {
          quality = 'poor';
        } else {
          quality = 'poor';
        }

        this.emit('qualityChange', quality, { latency, packetLoss });
      } catch (error) {
        console.error('Error getting stats:', error);
      }
    }, 2000);
  }

  /**
   * Остановить мониторинг качества
   */
  private stopQualityMonitoring(): void {
    if (this.qualityCheckInterval) {
      clearInterval(this.qualityCheckInterval);
      this.qualityCheckInterval = null;
    }
  }

  /**
   * Очистка ресурсов
   */
  private cleanup(): void {
    console.log('🧹 Cleaning up WebRTC resources');
    this.stopRingtone();
    this.stopQualityMonitoring();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.remoteUserId = null;
    this.isAudioEnabled = true;
    this.isVideoEnabled = true;
    this.iceCandidatesQueue = [];
    this.isRemoteDescriptionSet = false;
  }

  /**
   * Отключение от WebSocket
   */
  disconnect(): void {
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Singleton instance
export const webrtcService = new WebRTCService();
