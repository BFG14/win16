import { useState, useRef, useEffect } from 'react';
import { Window } from './Windows';
import { Play, Pause, SkipBack, SkipForward, Volume2, Loader2, List, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, UseQueryResult } from '@tanstack/react-query';

interface Track {
  title: string;
  artist: string;
  url: string;
}

export function MusicPlayer() {
  const [currentSong, setCurrentSong] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  const fetchTracks = async (): Promise<Track[]> => {
    const response = await fetch('/api/tracks');
    if (!response.ok) throw new Error('Failed to load tracks');
    return response.json();
  };

  const query: UseQueryResult<Track[], Error> = useQuery({
    queryKey: ['tracks'],
    queryFn: fetchTracks
  });

  const tracks: Track[] = query.data || [];
  const isLoading = query.isLoading;

  // Handle query error
  useEffect(() => {
    if (query.error) {
      toast({
        title: 'Error loading tracks',
        description: query.error.message,
        variant: 'destructive'
      });
    }
  }, [query.error, toast]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current && tracks.length > 0) {
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch(error => {
          console.error('Error playing audio:', error);
          toast({
            title: 'Error playing audio',
            description: `Could not play ${tracks[currentSong]?.title}`,
            variant: 'destructive'
          });
          setIsPlaying(false);
        });
      }
    }
  }, [currentSong, tracks, toast]);

  useEffect(() => {
    if (tracks.length > 0 && currentSong < tracks.length) {
      const currentTrack = tracks[currentSong];
      if (!currentTrack) return;
      
      const text = `${currentTrack.artist} - ${currentTrack.title}`;
      const textWidth = text.length * 8;
      const containerWidth = 256;

      if (textWidth > containerWidth) {
        setScrollPosition(0);
        const interval = setInterval(() => {
          setScrollPosition(prev => {
            if (prev <= -(textWidth + 40)) return 0;
            return prev - 1;
          });
        }, 50);

        return () => clearInterval(interval);
      } else {
        setScrollPosition(0);
      }
    }
  }, [currentSong, tracks]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(error => {
          console.error('Error playing audio:', error);
          if (tracks.length > 0 && currentSong < tracks.length) {
            toast({
              title: 'Error playing audio',
              description: `Could not play ${tracks[currentSong]?.title}`,
              variant: 'destructive'
            });
          }
        });
        setIsPlaying(true);
      }
    }
  };

  const prevSong = () => {
    if (tracks.length > 0) {
      setCurrentSong((prev) => (prev - 1 + tracks.length) % tracks.length);
    }
  };

  const nextSong = () => {
    if (tracks.length > 0) {
      setCurrentSong((prev) => (prev + 1) % tracks.length);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleEnded = () => {
    nextSong();
    setIsPlaying(true);
  };

  const formatTime = (time: number) => {
    if (!isFinite(time) || time === 0) {
      return "0:00";
    }
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const playTrack = (index: number) => {
    setCurrentSong(index);
    setIsPlaying(true);
  };

  // Safely access track at current index
  const currentTrack = tracks.length > 0 && currentSong < tracks.length 
    ? tracks[currentSong] 
    : null;

  return (
  <Window title="player" windowId="music" defaultPosition={{ x: 75, y: 5 }}>
      <div className="w-64 space-y-4 p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : tracks.length > 0 ? (
          <>
            <audio
              ref={audioRef}
              src={currentTrack?.url}
              onEnded={handleEnded}
              onTimeUpdate={handleTimeUpdate}
              onError={(e) => {
                console.error('Audio error:', e);
                toast({
                  title: 'Error loading audio',
                  description: `Could not load ${currentTrack?.title}`,
                  variant: 'destructive'
                });
              }}
            />

            <div className="text-center font-bold h-6 overflow-hidden whitespace-nowrap">
              <div
                className="inline-block"
                style={{ transform: `translateX(${scrollPosition}px)` }}
              >
                {currentTrack?.artist} - {currentTrack?.title}
                {currentTrack?.artist && currentTrack?.title && 
                  ((currentTrack.artist.length + currentTrack.title.length) * 8 > 256) && (
                  <>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    {currentTrack.artist} - {currentTrack.title}
                  </>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="progress-bar">
                <div 
                  className="progress-bar-fill"
                  style={{ width: `${(currentTime / (duration || 1)) * 100 || 0}%` }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>


            <div className="flex justify-center space-x-4">
              <button className="cs-button" onClick={prevSong}>
                <SkipBack className="w-4 h-4" />
              </button>
              <button className="cs-button" onClick={togglePlay}>
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button className="cs-button" onClick={nextSong}>
                <SkipForward className="w-4 h-4" />
              </button>
              <button 
                className={`cs-button ${showPlaylist ? 'border-cs-text' : ''}`} 
                onClick={() => setShowPlaylist(!showPlaylist)}
              >
                {showPlaylist ? <X className="w-4 h-4" /> : <List className="w-4 h-4" />}
              </button>
            </div>

            {/* Volume control */}
            <div className="flex items-center space-x-2">
              <Volume2 className="w-4 h-4" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => {
                  const newVolume = parseFloat(e.target.value);
                  if (audioRef.current) {
                    audioRef.current.volume = newVolume;
                  }
                  setVolume(newVolume);
                }}
              />
            </div>

            {showPlaylist && (
              <div className="border border-cs-border mt-2">
                <div className="max-h-48 overflow-y-auto">
                  {tracks.map((track, index) => (
                    <button
                      key={index}
                      onClick={() => playTrack(index)}
                      className={`w-full text-left p-2 hover:bg-cs-hover
                        ${currentSong === index ? 'border border-cs-text' : 'border-transparent border'}`}
                    >
                      <div className="truncate text-sm">
                        {track.artist} - {track.title}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            No tracks available in /assets/music
          </div>
        )}
      </div>
    </Window>
  );
}
