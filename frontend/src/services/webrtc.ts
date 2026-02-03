/**
 * WebRTC Service для видео/аудио звонков
 * Управляет peer connections и сигнализацией через WebSocket
 */

export interface CallUser {
  id: number;
  full_name: string;
}

export type CallType = 'audio' | 'video';
export type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'disconnected';



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
  private screenStream: MediaStream | null = null;
  private startTime: number | null = null;

  // Callback properties (for component compatibility)
  public onIncomingCall: ((fromUserId: number, type: CallType, calleeStatus?: string) => void) | null = null;
  public onCallAccepted: (() => void) | null = null;
  public onCallRejected: ((reason?: string) => void) | null = null;
  public onCallEnded: (() => void) | null = null;
  public onRemoteStream: ((stream: MediaStream) => void) | null = null;
  public onHold: ((fromUserId: number) => void) | null = null;
  public onResume: ((fromUserId: number) => void) | null = null;
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
  private isCallActive: boolean = false;

  public get isInCall(): boolean {
    return this.isCallActive;
  }

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
        if (this.onIncomingCall) this.onIncomingCall(args[0], args[1], args[2]);
        break;
      case 'callAccepted':
        this.isCallActive = true;
        if (this.onCallAccepted) this.onCallAccepted();
        break;
      case 'callRejected':
        if (this.onCallRejected) this.onCallRejected(args[0]);
        break;
      case 'callEnded':
        if (this.onCallEnded) this.onCallEnded();
        break;
      case 'remoteStream':
        if (this.onRemoteStream) this.onRemoteStream(args[0]);
        break;
      case 'hold':
        if (this.onHold) this.onHold(args[0]);
        break;
      case 'resume':
        if (this.onResume) this.onResume(args[0]);
        break;
      case 'error':
        if (this.onError) this.onError(args[0]);
        break;
      case 'transferring':
        if (this.listeners['transferring']) {
          this.listeners['transferring'].forEach(cb => cb(args[0], args[1]));
        }
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

    // Resume context if it was suspended to avoid "interrupted" errors later
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => { });
    }
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
        ctx.resume().catch(() => { });
      }

      this.stopRingtone(); // Stop previous sounds

      if (type === 'incoming') {
        this.isRinging = true;

        // Melodic double-tone (European classic ring)
        const playRingPattern = (startTime: number) => {
          const createTone = (freq: number, volume: number) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'triangle'; // Richer sound than sine
            o.frequency.setValueAtTime(freq, startTime);
            o.frequency.exponentialRampToValueAtTime(freq * 1.01, startTime + 1); // Subtle fluctuation

            g.gain.setValueAtTime(0, startTime);
            g.gain.linearRampToValueAtTime(volume, startTime + 0.05);
            g.gain.setValueAtTime(volume, startTime + 1.0);
            g.gain.linearRampToValueAtTime(0, startTime + 1.1);

            o.connect(g);
            g.connect(ctx.destination);
            o.start(startTime);
            o.stop(startTime + 1.2);
            this.activeOscillators.push(o);
          };

          // Harmonic interval (A4 and C#5)
          createTone(440, 0.08);
          createTone(554.37, 0.04);
        };

        // Schedule for 60 seconds
        for (let i = 0; i < 12; i++) {
          playRingPattern(ctx.currentTime + i * 5);
        }
      } else if (type === 'outgoing') {
        this.isRinging = true;

        // Outgoing "tuuu... tuuu..." pattern
        const playOutgoingPattern = (startTime: number) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(425, startTime);

          g.gain.setValueAtTime(0, startTime);
          g.gain.linearRampToValueAtTime(0.08, startTime + 0.1);
          g.gain.setValueAtTime(0.08, startTime + 1.5);
          g.gain.linearRampToValueAtTime(0, startTime + 1.6);

          o.connect(g);
          g.connect(ctx.destination);
          o.start(startTime);
          o.stop(startTime + 1.7);
          this.activeOscillators.push(o);
        };

        // Schedule for 60 seconds
        for (let i = 0; i < 12; i++) {
          playOutgoingPattern(ctx.currentTime + i * 6);
        }

      } else if (type === 'end') {
        // Disconnect tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.setValueAtTime(300, ctx.currentTime);
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
        console.log('📞 Incoming call from:', data.from, 'Type:', data.call_type, 'Remote user status:', data.callee_status);
        this.remoteUserId = data.from;
        this.callType = data.call_type;
        this.emit('incomingCall', data.from, data.call_type, data.callee_status);
        this.playRingtone('incoming');
        break;

      case 'call-accepted':
        console.log('Call accepted by:', data.from);
        this.emit('callAccepted');
        await this.createOffer();
        break;

      case 'call-rejected':
        console.log('Call rejected by:', data.from, 'Reason:', data.reason);
        this.stopRingtone();
        this.emit('callRejected', data.reason);
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
        this.stopRingtone();
        this.emit('callEnded');
        this.cleanup();
        break;

      case 'hold':
        console.log('Call put on hold by:', data.from);
        this.emit('hold', data.from);
        break;

      case 'resume':
        console.log('Call resumed by:', data.from);
        this.emit('resume', data.from);
        break;

      case 'error':
        console.error('Server error:', data.message);
        this.emit('error', data.message);
        break;

      case 'transferring':
        console.log(`⤴️ Transferring to ${data.to} by ${data.by}`);
        this.emit('transferring', data.to, data.by);
        // We might want to end current call and show "connecting to new person"
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
  rejectCall(reason: string = 'rejected'): void {
    this.sendSignal({
      type: 'reject-call',
      from: this.currentUserId,
      to: this.remoteUserId,
      reason: reason
    });
    this.stopRingtone();
    this.cleanup();
  }

  /**
   * Put call on hold
   */
  holdCall(): void {
    if (this.remoteUserId) {
      this.sendSignal({
        type: 'hold',
        from: this.currentUserId,
        to: this.remoteUserId
      });
    }
    // Mute tracks locally
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.enabled = false);
    }
  }

  /**
   * Resume call from hold
   */
  resumeCall(): void {
    if (this.remoteUserId) {
      this.sendSignal({
        type: 'resume',
        from: this.currentUserId,
        to: this.remoteUserId
      });
    }
    // Enable tracks back
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        if (track.kind === 'audio' && this.isAudioEnabled) track.enabled = true;
        if (track.kind === 'video' && this.isVideoEnabled) track.enabled = true;
      });
    }
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
    this.stopRingtone();
    const duration = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
    this.sendSignal({
      type: 'hangup',
      from: this.currentUserId,
      to: this.remoteUserId,
      duration: duration
    });
    this.cleanup();
  }

  /**
   * Screen Sharing
   */
  async startScreenShare(): Promise<MediaStream | null> {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      if (this.peerConnection && this.screenStream) {
        const videoTrack = this.screenStream.getVideoTracks()[0];
        const sender = this.peerConnection.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }

        videoTrack.onended = () => {
          this.stopScreenShare();
        };
      }
      return this.screenStream;
    } catch (error) {
      console.error('Error sharing screen:', error);
      return null;
    }
  }

  async stopScreenShare(): Promise<void> {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }

    // Switch back to camera
    if (this.localStream && this.peerConnection) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      const sender = this.peerConnection.getSenders().find(s => s.track?.kind === 'video');
      if (sender && videoTrack) {
        sender.replaceTrack(videoTrack);
      }
    }
  }

  /**
   * Transfer Call
   */
  transferCall(toUserId: number, partyId: number): void {
    this.sendSignal({
      type: 'transfer',
      from: this.currentUserId,
      to: toUserId,
      party_id: partyId
    });
  }

  /**
   * Device Management
   */
  async enumerateDevices(): Promise<MediaDeviceInfo[]> {
    return await navigator.mediaDevices.enumerateDevices();
  }

  async switchDevice(kind: 'audioinput' | 'videoinput', deviceId: string): Promise<void> {
    if (!this.localStream) return;

    const constraints = {
      audio: kind === 'audioinput' ? { deviceId: { exact: deviceId } } : this.isAudioEnabled,
      video: kind === 'videoinput' ? { deviceId: { exact: deviceId } } : this.isVideoEnabled
    };

    const newStream = await navigator.mediaDevices.getUserMedia(constraints);
    const newTrack = kind === 'audioinput' ? newStream.getAudioTracks()[0] : newStream.getVideoTracks()[0];

    if (this.peerConnection) {
      const sender = this.peerConnection.getSenders().find(s => s.track?.kind === (kind === 'audioinput' ? 'audio' : 'video'));
      if (sender && newTrack) {
        sender.replaceTrack(newTrack);

        // Stop old track
        const oldTrack = kind === 'audioinput' ? this.localStream.getAudioTracks()[0] : this.localStream.getVideoTracks()[0];
        if (oldTrack) oldTrack.stop();

        // Update local stream
        if (kind === 'audioinput') {
          this.localStream.removeTrack(oldTrack);
          this.localStream.addTrack(newTrack);
        } else {
          this.localStream.removeTrack(oldTrack);
          this.localStream.addTrack(newTrack);
        }
      }
    }
  }

  /**
   * DND Mode & Call Logs
   */
  async toggleDND(enabled: boolean): Promise<any> {
    const response = await fetch('/api/internal-chat/status/dnd?dnd=' + enabled, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return await response.json();
  }

  async getCallLogs(): Promise<any[]> {
    const response = await fetch('/api/internal-chat/call-logs');
    return await response.json();
  }

  /**
   * Getters
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }
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
   * Получить удаленный stream
   */

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
    this.isCallActive = false;
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
