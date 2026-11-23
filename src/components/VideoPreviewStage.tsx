import React, { useEffect, useMemo, useRef } from 'react';
import {
  Music,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { GeneratedProject } from '../types/studio';
import { getDimensionsForRatio, renderSceneFrame } from '../utils/canvasRenderer';
import { formatTimecode } from '../utils/imageHelper';

interface VideoPreviewStageProps {
  project: GeneratedProject;
  imageMap: Map<number, HTMLImageElement>;
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onSeek: (timeSeconds: number) => void;
  voiceMuted: boolean;
  onToggleVoiceMute: () => void;
  musicEnabled: boolean;
  onToggleMusic: () => void;
  activeSceneIndex: number;
}

export const VideoPreviewStage: React.FC<VideoPreviewStageProps> = ({
  project,
  imageMap,
  currentTime,
  totalDuration,
  isPlaying,
  onTogglePlay,
  onRestart,
  onSeek,
  voiceMuted,
  onToggleVoiceMute,
  musicEnabled,
  onToggleMusic,
  activeSceneIndex,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const dims = useMemo(
    () => getDimensionsForRatio(project.aspectRatio, 'hd'),
    [project.aspectRatio]
  );

  const sceneBounds = useMemo(() => {
    let cursor = 0;
    return project.scenes.map((scene, index) => {
      const start = cursor;
      const end = cursor + scene.durationSeconds;
      cursor = end;
      return { start, end, scene, index };
    });
  }, [project.scenes]);

  const activeBound = useMemo(() => {
    return (
      sceneBounds.find((b) => currentTime >= b.start && currentTime < b.end) ||
      sceneBounds[sceneBounds.length - 1]
    );
  }, [sceneBounds, currentTime]);

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas || !activeBound) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const progress =
        (currentTime - activeBound.start) /
        Math.max(0.1, activeBound.end - activeBound.start);

      renderSceneFrame(
        ctx,
        dims.width,
        dims.height,
        activeBound.scene,
        activeBound.index,
        project.scenes.length,
        progress,
        imageMap
      );
    };

    draw();
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(draw).catch(() => {});
    }
  }, [activeBound, currentTime, dims.height, dims.width, imageMap, project.scenes.length]);

  const stageAspectStyle = useMemo(() => {
    switch (project.aspectRatio) {
      case '9:16':
        return 'aspect-[9/16] max-h-[540px] w-auto';
      case '4:5':
        return 'aspect-[4/5] max-h-[540px] w-auto';
      case '1:1':
        return 'aspect-square max-h-[500px] w-auto';
      case '16:9':
      default:
        return 'aspect-video w-full max-w-[720px]';
    }
  }, [project.aspectRatio]);

  const activeScene = project.scenes[activeSceneIndex] || project.scenes[0];

  return (
    <section className="bg-white border border-zinc-200 rounded-xl p-5 flex flex-col gap-4">
      {/* Header Metadata Line (Zero-Pill Clean Text) */}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold text-zinc-950 tracking-tight truncate">
            {project.title}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 mt-1">
            <span>{project.platform}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{project.aspectRatio}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {formatTimecode(totalDuration)} ({project.scenes.length} Adegan)
            </span>
            <span aria-hidden="true">·</span>
            <span>{project.tone}</span>
          </div>
        </div>
      </div>

      {/* Cinema Viewport */}
      <div className="bg-[#0B0C0F] rounded-xl p-4 sm:p-6 flex items-center justify-center min-h-[380px]">
        <div
          className={`relative ${stageAspectStyle} rounded-lg overflow-hidden shadow-2xl border border-white/10 bg-black mx-auto`}
        >
          <canvas
            ref={canvasRef}
            width={dims.width}
            height={dims.height}
            onClick={onTogglePlay}
            className="w-full h-full object-contain block cursor-pointer"
          />
        </div>
      </div>

      {/* Transport & Timeline Scrubber */}
      <div className="flex flex-col gap-3">
        {/* Interactive Multi-Segment Scrubber */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono tabular-nums text-zinc-600 w-12">
            {formatTimecode(currentTime)}
          </span>

          <div className="relative flex-1 h-7 flex items-center">
            <input
              type="range"
              aria-label="Garis waktu pratinjau video"
              min={0}
              max={Math.max(1, totalDuration)}
              step={0.05}
              value={Math.min(currentTime, totalDuration)}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="w-full accent-[#2563EB] cursor-pointer"
            />
          </div>

          <span className="text-xs font-mono tabular-nums text-zinc-500 w-12 text-right">
            {formatTimecode(totalDuration)}
          </span>
        </div>

        {/* Scene Jump Strips */}
        <div className="flex items-center gap-1">
          {sceneBounds.map((b) => {
            const pct = (b.scene.durationSeconds / Math.max(1, totalDuration)) * 100;
            const isActive = b.index === activeSceneIndex;
            return (
              <button
                key={b.scene.id}
                type="button"
                title={`Adegan ${b.index + 1}: ${b.scene.headline} (${b.scene.durationSeconds}d)`}
                onClick={() => onSeek(b.start)}
                style={{ width: `${pct}%` }}
                className={`h-2 rounded-xs transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#2563EB]'
                    : currentTime > b.end
                      ? 'bg-zinc-400'
                      : 'bg-zinc-200 hover:bg-zinc-300'
                }`}
              />
            );
          })}
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePlay}
              className="px-4 py-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Jeda</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Putar Pratinjau</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onRestart}
              aria-label="Ulangi dari awal"
              className="p-2 rounded-lg border border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleVoiceMute}
              className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                voiceMuted
                  ? 'border-zinc-200 text-zinc-400 bg-zinc-50'
                  : 'border-zinc-200 text-zinc-800 bg-white hover:border-zinc-300'
              }`}
            >
              {voiceMuted ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
              <span>{voiceMuted ? 'Suara Mati' : 'Narasi Aktif'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleMusic}
              className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                musicEnabled
                  ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                  : 'border-zinc-200 text-zinc-500 bg-white hover:border-zinc-300'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>{musicEnabled ? 'Musik Latar' : 'Tanpa Musik'}</span>
            </button>
          </div>
        </div>

        {/* Active Narration Subtitles Strip */}
        {activeScene && (
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg px-4 py-3 text-xs text-zinc-700 leading-relaxed">
            <span className="font-mono font-semibold text-zinc-500 mr-2">
              Adegan {activeSceneIndex + 1}/{project.scenes.length} · {activeScene.role}:
            </span>
            <span>{activeScene.narration}</span>
          </div>
        )}
      </div>
    </section>
  );
};
