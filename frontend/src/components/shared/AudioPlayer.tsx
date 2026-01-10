// Красивый аудио плеер для голосовых сообщений
import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  className?: string;
}

export default function AudioPlayer({ src, className = '' }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Extract waveform data from audio
  useEffect(() => {
    const extractWaveform = async () => {
      try {
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const rawData = audioBuffer.getChannelData(0);
        const samples = 30; // Number of bars in waveform
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData: number[] = [];

        for (let i = 0; i < samples; i++) {
          const blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[blockStart + j]);
          }
          filteredData.push(sum / blockSize);
        }

        // Normalize to 0-100 range
        const multiplier = Math.max(...filteredData);
        const normalized = filteredData.map(n => (n / multiplier) * 100);
        setWaveformData(normalized);

        audioContext.close();
      } catch (error) {
        console.error('Error extracting waveform:', error);
        // Fallback to random data if extraction fails
        setWaveformData(Array.from({ length: 30 }, () => Math.random() * 100));
      }
    };

    extractWaveform();
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * audio.duration;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-pink-600 text-white flex items-center justify-center hover:scale-110 transition-transform"
      >
        {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
      </button>

      {/* Waveform / Progress Bar */}
      <div className="flex-1 flex flex-col gap-1">
        <div
          onClick={handleSeek}
          className="h-8 bg-gray-100 dark:bg-gray-800 rounded-full cursor-pointer overflow-hidden relative"
        >
          {/* Progress */}
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-pink-600 transition-all"
            style={{ width: `${progress}%` }}
          />

          {/* Real waveform bars */}
          <div className="absolute inset-0 flex items-center justify-around px-2">
            {waveformData.length > 0 ? (
              waveformData.map((height, i) => {
                const isPast = (i / waveformData.length) * 100 < progress;
                // Map height from 0-100 to 20-80 for visual consistency
                const visualHeight = 20 + (height * 0.6);
                return (
                  <div
                    key={i}
                    className={`w-0.5 rounded-full transition-all ${
                      isPast
                        ? 'bg-white'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    style={{ height: `${visualHeight}%` }}
                  />
                );
              })
            ) : (
              // Loading skeleton
              [...Array(30)].map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"
                  style={{ height: '40%' }}
                />
              ))
            )}
          </div>
        </div>

        {/* Time */}
        <div className="flex justify-between text-xs text-gray-500 px-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
