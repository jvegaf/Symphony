import { useEffect, useRef } from "react";

import type { Track } from "../../types/library";
import { useAudioPlayer } from "../../hooks/useAudioPlayer";
import { Toast } from "../Toast";

interface PlayerSectionProps {
  track: Track | null;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const PlayerSection = ({ track }: PlayerSectionProps) => {
  const { play, pause, resume, stop, seek, isPlaying, position, duration, error, state } = useAudioPlayer();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handlePlayPause = async () => {
    if (!track) return;

    try {
      if (isPlaying) {
        await pause();
      } else if (state === "paused") {
        await resume();
      } else {
        await play(track.path);
      }
    } catch (error) {
      console.error("Error al controlar reproducción:", error);
    }
  };

  // Dibujar barra de progreso simple
  useEffect(() => {
    if (!canvasRef.current || !track) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (width === 0 || height === 0) return;

    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.clearRect(0, 0, width, height);

    const centerY = height / 2;
    const totalDuration = duration || track.duration;
    const progressRatio = totalDuration > 0 ? position / totalDuration : 0;
    const progressWidth = width * progressRatio;

    // Barra de fondo
    ctx.fillStyle = "#9ca3af";
    ctx.fillRect(0, centerY - 3, width, 6);

    // Barra de progreso
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(0, centerY - 3, progressWidth, 6);
  }, [position, duration, track]);

  // Click en canvas para seek
  const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !track || !duration) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickPercent = x / rect.width;
    const newTime = clickPercent * duration;

    console.log("🎯 Seeking to:", newTime);
    try {
      await seek(newTime);
      console.log("✅ Seek instantáneo completado");
    } catch (error) {
      console.error("❌ Error en seek:", error);
    }
  };

  if (!track) {
    return (
      <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-500">
          <div className="text-center">
            <span className="material-icons text-4xl mb-2">library_music</span>
            <p className="text-sm">Selecciona una pista para reproducir</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
      {/* Error Toast */}
      {error && (
        <Toast
          message={error}
          type="error"
          duration={5000}
          onClose={() => {
            /* Error will be cleared on next action */
          }}
        />
      )}

      {/* Track Info */}
      <div className="flex items-start">
        {/* Album Art */}
        <div className="w-16 h-16 rounded mr-4 bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
          <span className="material-icons text-3xl text-gray-400">album</span>
        </div>

        {/* Track Details */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {track.title}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">{track.artist}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
          <button 
            type="button"
            onClick={handlePlayPause}
            className="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <span className="material-icons">
              {isPlaying ? "pause" : "play_arrow"}
            </span>
          </button>
          <button 
            type="button"
            onClick={() => stop()}
            className="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <span className="material-icons">stop</span>
          </button>
          <button 
            type="button"
            className="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
          >
            <span className="material-icons">info_outline</span>
          </button>
        </div>
      </div>

      {/* Tags */}
      <div className="mt-3 flex space-x-2 text-xs">
        {track.bpm && (
          <div className="bg-gray-200 dark:bg-gray-800 rounded px-2 py-1">
            {track.bpm}BPM
          </div>
        )}
        {track.key && (
          <div className="bg-primary/20 text-primary border border-primary/50 rounded px-2 py-1">
            {track.key}
          </div>
        )}
        {track.year && (
          <div className="bg-gray-200 dark:bg-gray-800 rounded px-2 py-1">
            {track.year}
          </div>
        )}
        {track.genre && (
          <div className="bg-gray-200 dark:bg-gray-800 rounded px-2 py-1">
            {track.genre}
          </div>
        )}
      </div>

      {/* Canvas de progreso */}
      <div className="mt-3">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{ display: "block" }}
          className="w-full h-16 bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-700 cursor-pointer hover:border-blue-500 transition-colors"
        />
        <div className="text-center text-xs text-green-600 dark:text-green-400 mt-1">
          ✨ HTMLAudioElement - Seeking instantáneo
        </div>
      </div>

      {/* Time */}
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span className="font-mono font-bold text-blue-600">{formatDuration(position)}</span>
        <span className="font-mono">{formatDuration(duration > 0 ? duration : track.duration)}</span>
      </div>

      {/* Cue Points */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex space-x-2">
          <button 
            type="button"
            className="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 rounded text-sm flex items-center"
          >
            Cues
            <span className="material-icons text-base ml-1">arrow_drop_down</span>
          </button>
          {[1, 2, 3, 4].map((i) => (
            <button
              key={i}
              type="button"
              className="bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 w-20 py-1 rounded text-sm"
            >
              <span className="material-icons text-base">add</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
