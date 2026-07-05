"use client";

import { Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ModuleAudioSegment = {
  label: string;
  src: string;
};

type ModuleAudioPlayerProps = {
  moduleTitle: string;
  segments: ModuleAudioSegment[];
};

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function ModuleAudioPlayer({
  moduleTitle,
  segments,
}: ModuleAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const shouldAutoPlayRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const activeSegment = segments[activeIndex];
  const activeSrc = activeSegment?.src;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    if (!activeSrc) return;
    setCurrentTime(0);
    setDuration(0);
    if (shouldAutoPlayRef.current) {
      shouldAutoPlayRef.current = false;
      void audioRef.current?.play();
    }
  }, [activeSrc]);

  if (!activeSegment) return null;

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  }

  function restart() {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    setCurrentTime(0);
    if (!audio.paused) {
      void audio.play();
    }
  }

  function handleEnded() {
    if (activeIndex < segments.length - 1) {
      shouldAutoPlayRef.current = true;
      setActiveIndex((index) => index + 1);
      return;
    }

    setIsPlaying(false);
  }

  return (
    <section className="module-audio-player" aria-label="Audio del modulo">
      {/* biome-ignore lint/a11y/useMediaCaption: The visible module page is the transcript for this static narration. */}
      <audio
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
        onEnded={handleEnded}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={(event) =>
          setCurrentTime(event.currentTarget.currentTime)
        }
        preload="metadata"
        ref={audioRef}
        src={activeSegment.src}
      />

      <div className="module-audio-player__header">
        <div>
          <p>
            <Volume2 aria-hidden="true" size={16} />
            Escuchar modulo
          </p>
          <h2>{moduleTitle}</h2>
        </div>
        <span>{activeSegment.label}</span>
      </div>

      <div className="module-audio-player__controls">
        <button
          aria-label={isPlaying ? "Pausar audio" : "Reproducir audio"}
          onClick={togglePlayback}
          type="button"
        >
          {isPlaying ? (
            <Pause aria-hidden="true" size={20} />
          ) : (
            <Play aria-hidden="true" size={20} />
          )}
        </button>
        <button aria-label="Reiniciar audio" onClick={restart} type="button">
          <RotateCcw aria-hidden="true" size={18} />
        </button>
        <div className="module-audio-player__timeline">
          <div className="module-audio-player__bar">
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="module-audio-player__time">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {segments.length > 1 ? (
        <fieldset className="module-audio-player__parts">
          <legend>Partes de audio</legend>
          {segments.map((segment, index) => (
            <button
              aria-current={index === activeIndex ? "true" : undefined}
              key={segment.src}
              onClick={() => {
                shouldAutoPlayRef.current = isPlaying;
                setActiveIndex(index);
              }}
              type="button"
            >
              {index + 1}
            </button>
          ))}
        </fieldset>
      ) : null}
    </section>
  );
}
