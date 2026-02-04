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
  public onIncomingCall: ((fromUserId: number, type: CallType, calleeStatus?: string, callerName?: string, callerPhoto?: string) => void) | null = null;
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
  private isConnecting: boolean = false;

  // Audio handling
  private audioContext: AudioContext | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private ringtoneAudio: HTMLAudioElement | null = null;
  private previewAudio: HTMLAudioElement | null = null;
  private static DEFAULT_RINGTONE = '/audio/ringtones/default_classic.mp3';
  private currentRingtoneUrl: string = localStorage.getItem('webrtc_ringtone_url') || WebRTCService.DEFAULT_RINGTONE;
  private currentRingtoneStartTime: number = Number(localStorage.getItem('webrtc_ringtone_start_time') || '0');
  private currentRingtoneEndTime: number | null = localStorage.getItem('webrtc_ringtone_end_time') ? Number(localStorage.getItem('webrtc_ringtone_end_time')) : null;
  private ringtoneVolume: number = Number(localStorage.getItem('webrtc_ringtone_volume') || '0.5');
  private isRinging: boolean = false;
  private isCallActive: boolean = false;
  private isDndEnabled: boolean = false;

  // Public getters for state sync
  public getRemoteUserId() { return this.remoteUserId; }
  public setRemoteUserId(id: number) { this.remoteUserId = id; }
  public getCallType() { return this.callType; }
  public setCallType(type: CallType) { this.callType = type; }

  /**
   * Status check
   */
  isInCall(): boolean {
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
   * Resume AudioContext on user gesture to comply with browser autoplay policies
   */
  public async resumeAudioContext(): Promise<void> {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
          console.log('🔊 [WebRTC] AudioContext created');
        }
      }

      if (this.audioContext && (this.audioContext.state === 'suspended' || this.audioContext.state === 'interrupted')) {
        await this.audioContext.resume();
        console.log('🔊 [WebRTC] AudioContext resumed');
      }

      // "Warm up" the audio context with a near-silent burst to unblock autoplay
      if (this.audioContext && this.audioContext.state === 'running') {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.001, this.audioContext.currentTime);
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.01);
      }
    } catch (err) {
      console.error('❌ [WebRTC] Failed to initialize/resume AudioContext:', err);
    }
  }

  /**
   * Emit an event to all subscribers and callback properties
   */
  private emit(event: string, ...args: any[]): void {
    console.debug(`📢 [WebRTC:Emit] Event: ${event}`, args);
    // Call callback properties for backwards compatibility
    switch (event) {
      case 'incomingCall':
        if (this.onIncomingCall) this.onIncomingCall(args[0], args[1], args[2], args[3], args[4]);
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

    if (this.ringtoneAudio) {
      this.ringtoneAudio.pause();
      this.ringtoneAudio.currentTime = 0;
      this.ringtoneAudio = null;
    }

    if (this.previewAudio) {
      this.previewAudio.pause();
      this.previewAudio.currentTime = 0;
      this.previewAudio = null;
    }

    // Resume context if it was suspended to avoid "interrupted" errors later
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => { });
    }
  }

  setRingtone(url: string | null | undefined, startTime: number = 0, endTime: number | null = null) {
    const finalUrl = url || WebRTCService.DEFAULT_RINGTONE;
    this.currentRingtoneUrl = finalUrl;
    this.currentRingtoneStartTime = startTime;
    this.currentRingtoneEndTime = endTime;
    localStorage.setItem('webrtc_ringtone_url', finalUrl);
    localStorage.setItem('webrtc_ringtone_start_time', startTime.toString());
    if (endTime !== null) {
      localStorage.setItem('webrtc_ringtone_end_time', endTime.toString());
    } else {
      localStorage.removeItem('webrtc_ringtone_end_time');
    }
    console.log(`🎵 [Ringtone] Set to: ${finalUrl}, Start: ${startTime}, End: ${endTime}`);
  }

  setDnd(enabled: boolean) {
    this.isDndEnabled = enabled;
  }

  getDnd() {
    return this.isDndEnabled;
  }

  /**
   * Play a short preview of a ringtone
   */
  public async playPreview(url: string, onEnd?: () => void, startTime: number = 0, endTime?: number | null): Promise<void> {
    try {
      // If same URL is playing, stop it
      if (this.previewAudio && this.previewAudio.src === url && !this.previewAudio.paused) {
        this.stopRingtone();
        if (onEnd) onEnd();
        return;
      }

      this.stopRingtone();
      await this.resumeAudioContext();

      const audioUrl = url;
      this.previewAudio = new Audio(audioUrl);
      this.previewAudio.volume = this.ringtoneVolume;

      this.previewAudio.onloadedmetadata = () => {
        if (this.previewAudio) {
          this.previewAudio.currentTime = startTime;
        }
      };

      this.previewAudio.ontimeupdate = () => {
        if (this.previewAudio) {
          const currentTime = this.previewAudio.currentTime;
          this.emit('previewProgress', { url, currentTime });

          if (endTime && currentTime >= endTime) {
            this.previewAudio.pause();
            this.previewAudio = null;
            if (onEnd) onEnd();
          }
        }
      };

      this.previewAudio.onended = () => {
        this.previewAudio = null;
        if (onEnd) onEnd();
      };

      await this.previewAudio.play();
    } catch (e) {
      console.warn("Ringtone preview failed:", e);
      if (onEnd) onEnd();
    }
  }

  public isPreviewPlaying(url: string): boolean {
    if (!this.previewAudio) return false;
    // Handle cases where src might have host vs relative
    const currentSrc = this.previewAudio.src;
    return !this.previewAudio.paused && (currentSrc === url || currentSrc.endsWith(url));
  }

  getRingtone() {
    return this.currentRingtoneUrl;
  }

  setVolume(volume: number) {
    this.ringtoneVolume = volume;
    localStorage.setItem('webrtc_ringtone_volume', volume.toString());
    if (this.ringtoneAudio) {
      this.ringtoneAudio.volume = volume;
    }
    if (this.previewAudio) {
      this.previewAudio.volume = volume;
    }
  }

  getVolume() {
    return this.ringtoneVolume;
  }

  /**
   * Play ringtone sounds
   */
  async playRingtone(type: 'incoming' | 'outgoing' | 'end'): Promise<void> {
    try {
      console.log(`🎵 [WebRTC:Ringtone] playRingtone called: type=${type}, isRinging=${this.isRinging}`);

      if (this.isRinging && type !== 'end') {
        console.log('🎵 [WebRTC:Ringtone] Already ringing, skipping...');
        return;
      }

      // Ensure AudioContext is ready (critical for browser autoplay policies)
      await this.resumeAudioContext();
      const ctx = this.audioContext;

      if (type === 'incoming' && this.currentRingtoneUrl) {
        console.log('🔔 [WebRTC:Ringtone] Playing incoming custom ringtone:', this.currentRingtoneUrl);
        this.stopRingtone();

        try {
          this.ringtoneAudio = new Audio(this.currentRingtoneUrl);
          this.ringtoneAudio.loop = true;
          this.ringtoneAudio.volume = this.ringtoneVolume;

          const startTime = this.currentRingtoneStartTime;
          const endTime = this.currentRingtoneEndTime;

          this.ringtoneAudio.onloadedmetadata = () => {
            if (this.ringtoneAudio) {
              console.log(`🎵 [WebRTC:Ringtone] Metadata loaded, setting start time to ${startTime}s`);
              this.ringtoneAudio.currentTime = startTime;
            }
          };

          if (endTime) {
            this.ringtoneAudio.ontimeupdate = () => {
              if (this.ringtoneAudio && this.ringtoneAudio.currentTime >= endTime) {
                console.debug(`🎵 [WebRTC:Ringtone] End time ${endTime}s reached, looping to ${startTime}s`);
                this.ringtoneAudio.currentTime = startTime;
              }
            };
          }

          this.isRinging = true;
          await this.ringtoneAudio.play();
          console.log('🎵 [WebRTC:Ringtone] Custom ringtone started playing');
          return;
        } catch (e) {
          console.warn("⚠️ [WebRTC:Ringtone] Failed to play custom ringtone, falling back to oscillators:", e);
          this.isRinging = false; // Reset so fallback can set it
          // Continue to oscillator fallback
        }
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        console.error('❌ [WebRTC:Ringtone] AudioContext not supported');
        return;
      }

      if (!ctx) {
        console.error('❌ [WebRTC:Ringtone] AudioContext still not available after resume');
        return;
      }

      this.stopRingtone();
      console.log(`🎵 [WebRTC:Ringtone] Playing fallback/pattern for type: ${type}`);

      if (type === 'incoming') {
        this.isRinging = true;
        const playRingPattern = (startTime: number) => {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          const modGain = ctx.createGain();
          osc1.type = 'square'; osc1.frequency.setValueAtTime(600, startTime);
          osc2.type = 'square'; osc2.frequency.setValueAtTime(25, startTime);
          modGain.gain.value = 100;
          osc2.connect(modGain);
          modGain.connect(osc1.frequency);
          const vol = this.ringtoneVolume * 0.4; // Scale down slightly as oscillators are loud
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(vol, startTime + 0.1);
          gain.gain.setValueAtTime(vol, startTime + 1.8);
          gain.gain.linearRampToValueAtTime(0, startTime + 2.0);
          osc1.connect(gain); gain.connect(ctx.destination);
          osc1.start(startTime); osc2.start(startTime);
          osc1.stop(startTime + 2.0); osc2.stop(startTime + 2.0);
          this.activeOscillators.push(osc1, osc2);
        };
        for (let i = 0; i < 20; i++) playRingPattern(ctx.currentTime + i * 3);
      } else if (type === 'outgoing') {
        this.isRinging = true;
        const playOutgoingPattern = (startTime: number) => {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.type = 'sine'; o.frequency.setValueAtTime(425, startTime);
          const vol = this.ringtoneVolume * 0.15;
          g.gain.setValueAtTime(0, startTime);
          g.gain.linearRampToValueAtTime(vol, startTime + 0.1);
          g.gain.setValueAtTime(vol, startTime + 1.5);
          g.gain.linearRampToValueAtTime(0, startTime + 1.6);
          o.connect(g); g.connect(ctx.destination);
          o.start(startTime); o.stop(startTime + 1.7);
          this.activeOscillators.push(o);
        };
        for (let i = 0; i < 12; i++) playOutgoingPattern(ctx.currentTime + i * 6);
      } else if (type === 'end') {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) { console.error('Audio playback failed', e); }
  }

  async initialize(userId: number): Promise<void> {
    // Skip if already initialized or connecting
    if (this.currentUserId === userId && this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      console.log('🔌 [WebRTC] Already initialized or connecting, skipping...');
      return;
    }

    if (this.isConnecting) {
      console.log('🔌 [WebRTC] Already in process of connecting, skipping...');
      return;
    }

    console.log(`🔌 [WebRTC] Initializing for user ${userId}`);
    this.currentUserId = userId;
    this.isConnecting = true;
    try {
      await this.connectWebSocket();
    } finally {
      this.isConnecting = false;
    }
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
        try {
          const data = JSON.parse(event.data);
          console.debug('📩 [WebRTC:WS] Message received:', data);
          this.handleSignal(data);
        } catch (e) {
          console.error('❌ [WebRTC:WS] Failed to parse message:', event.data, e);
        }
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
        console.info(`� [Call-IN] 1. Signal received from ${data.from}`);
        console.info(`   - Name: ${data.caller_name}`);
        console.info(`   - Photo: ${data.caller_photo ? 'Yes' : 'No'}`);
        console.info(`   - Type: ${data.call_type}`);

        this.remoteUserId = data.from;
        this.callType = data.call_type;
        const dndActive = data.dnd_active || this.isDndEnabled;

        // Pass caller details to event
        this.emit('incomingCall', data.from, data.call_type, data.callee_status, data.caller_name, data.caller_photo, dndActive);

        if (!dndActive) {
          console.info(`🎵 [Call-IN] 2. Triggering ringtone`);
          this.playRingtone('incoming');
        } else {
          console.info(`🔇 [Call-IN] 2. DND active, skipping audible ringtone`);
        }
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
      console.info('🚀 [Call-OUT] 4. Sending call signal to server');
      this.sendSignal({
        type: 'call',
        from: this.currentUserId,
        to: toUserId,
        call_type: callType
      });

      console.info(`📞 [Call-OUT] 5. Call signal sent to user ${toUserId} (${callType})`);
    } catch (error) {
      console.error('❌ [Call-OUT] Failed:', error);
      this.emit('error', 'Не удалось получить доступ к камере/микрофону');
      this.cleanup();
    }
  }

  /**
   * Принять входящий звонок
   */
  async acceptCall(): Promise<void> {
    console.info('🚀 [WebRTC:Accept] 1. Starting acceptCall sequence');
    console.info(`   - Current User: ${this.currentUserId}`);
    console.info(`   - Remote User: ${this.remoteUserId}`);
    console.info(`   - Call Type: ${this.callType}`);

    if (!this.remoteUserId) {
      console.warn('⚠️ [WebRTC:Accept] Remote user ID is missing! Attempting to recover...');
    }

    try {
      // Получаем доступ к камере/микрофону
      console.info('📸 [WebRTC:Accept] 2. Requesting media devices');
      await this.getMediaDevices(this.callType);

      // Создаем peer connection
      console.info('🔌 [WebRTC:Accept] 3. Creating PeerConnection');
      this.createPeerConnection();

      // Отправляем подтверждение
      console.info('📤 [WebRTC:Accept] 4. Sending accept-call signal');
      this.sendSignal({
        type: 'accept-call',
        from: this.currentUserId,
        to: this.remoteUserId
      });

      // Вызываем событие локально
      this.isCallActive = true;
      this.startTime = Date.now();
      this.emit('callAccepted');

      console.info('✅ [WebRTC:Accept] 5. Call accepted successfully');
    } catch (error) {
      console.error('❌ [WebRTC:Accept] Failed:', error);
      this.emit('error', 'Не удалось получить доступ к камере/микрофону');
      this.cleanup();
      throw error;
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
    const data = await response.json();
    return data.logs ?? [];
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
      console.info(`📸 [WebRTC:Media] Requesting getUserMedia with constraints:`, constraints);
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.info('✅ [WebRTC:Media] Local stream obtained successfully');
      this.localStream.getTracks().forEach(t => {
        console.debug(`   - Track: ${t.kind}, ID: ${t.id}, Enabled: ${t.enabled}`);
      });
    } catch (error) {
      console.error('❌ [WebRTC:Media] Failed to get media devices:', error);
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
      console.info('📺 [WebRTC:Remote] Remote track received:', event.track.kind);
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        console.info(`   - Stream ID: ${this.remoteStream.id}, Tracks: ${this.remoteStream.getTracks().length}`);
        this.emit('remoteStream', this.remoteStream);
      } else {
        console.warn('⚠️ [WebRTC:Remote] No stream attached to track event');
      }
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
      const state = this.peerConnection?.connectionState;
      console.info(`🌐 [WebRTC:PC] Connection state changed: ${state}`);

      if (state === 'connected') {
        this.startQualityMonitoring();
      }

      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        console.warn(`🛑 [WebRTC:PC] Connection lost or closed (state: ${state})`);
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
