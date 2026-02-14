import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Download, Volume1 } from 'lucide-react';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

interface AudioPlayerProps {
    url: string;
    className?: string;
    autoPlay?: boolean;
    initialExpanded?: boolean;
}

export function AudioPlayer({ url, className = '', autoPlay = false, initialExpanded = false }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isExpanded, setIsExpanded] = useState(initialExpanded || autoPlay);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => setDuration(audio.duration);
        const handleEnded = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('ended', handleEnded);

        if (autoPlay) {
            audio.play().catch(err => console.log('Autoplay blocked:', err));
        }

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
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
            setIsExpanded(true);
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (value: number[]) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = value[0];
        setCurrentTime(value[0]);
    };

    const handleVolumeChange = (value: number[]) => {
        const audio = audioRef.current;
        if (!audio) return;
        const newVolume = value[0];
        audio.volume = newVolume;
        setVolume(newVolume);
        setIsMuted(newVolume === 0);
    };

    const toggleMute = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isMuted) {
            audio.volume = volume || 0.5;
            setIsMuted(false);
        } else {
            audio.volume = 0;
            setIsMuted(true);
        }
    };

    const formatTime = (seconds: number) => {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`relative ${className}`}>
            <audio ref={audioRef} src={url} preload="metadata" />

            {!isExpanded && !isPlaying ? (
                <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full w-8 h-8 bg-pink-50 text-pink-600 border-pink-100 hover:bg-pink-100 hover:scale-105 transition-all shadow-sm"
                    onClick={() => { setIsExpanded(true); togglePlay(); }}
                >
                    <Play className="w-3.5 h-3.5 ml-0.5" />
                </Button>
            ) : (
                <div className="flex items-center gap-3 bg-white border border-gray-100 shadow-lg rounded-full p-1.5 px-3 pr-4 transition-all animate-in fade-in zoom-in-95 duration-200">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-pink-50 text-pink-600 hover:bg-pink-100 flex-shrink-0"
                        onClick={togglePlay}
                    >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                    </Button>

                    <div className="flex-1 flex items-center gap-2 min-w-[180px]">
                        <span className="text-[10px] text-gray-400 w-8 text-right tabular-nums font-medium">{formatTime(currentTime)}</span>
                        <Slider
                            value={[currentTime]}
                            max={duration || 100}
                            step={0.1}
                            onValueChange={handleSeek}
                            className="flex-1 min-w-[80px]"
                        />
                        <span className="text-[10px] text-gray-400 w-8 tabular-nums font-medium">{formatTime(duration)}</span>
                    </div>

                    <div className="flex items-center gap-1">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full hover:bg-gray-100 flex-shrink-0 text-gray-500"
                                >
                                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : volume < 0.5 ? <Volume1 className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent side="top" className="w-12 p-3 pb-4 h-48 flex flex-col items-center gap-3">
                                <Slider
                                    orientation="vertical"
                                    value={[isMuted ? 0 : volume]}
                                    max={1}
                                    step={0.01}
                                    onValueChange={handleVolumeChange}
                                    className="h-full"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full hover:bg-gray-100 shrink-0"
                                    onClick={toggleMute}
                                >
                                    {isMuted ? <VolumeX className="w-4 h-4 text-pink-600" /> : <Volume2 className="w-4 h-4" />}
                                </Button>
                            </PopoverContent>
                        </Popover>

                        <a href={url} download target="_blank" rel="noreferrer">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full hover:bg-gray-100 flex-shrink-0 text-gray-500"
                            >
                                <Download className="w-4 h-4" />
                            </Button>
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
