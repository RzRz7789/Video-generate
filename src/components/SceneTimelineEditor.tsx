import React, { useRef } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Download,
  Loader2,
  Mic,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import type {
  GeneratedProject,
  LayoutStyle,
  MotionEffect,
  SceneItem,
} from '../types/studio';
import { formatTimecode } from '../utils/imageHelper';

interface SceneTimelineEditorProps {
  project: GeneratedProject;
  activeSceneIndex: number;
  onSelectScene: (index: number) => void;
  onUpdateScene: (sceneId: string, patch: Partial<SceneItem>) => void;
  onMoveScene: (index: number, direction: 'up' | 'down') => void;
  onAddScene: () => void;
  onDeleteScene: (sceneId: string) => void;
  onGenerateAllVoiceover: () => void;
  onGenerateSingleVoiceover: (sceneId: string) => void;
  onUploadCustomAudio: (file: File) => void;
  onDownloadSlidePng: (sceneIndex: number) => void;
  isGeneratingVoice: boolean;
  generatingSceneId: string | null;
}

const MOTION_OPTIONS: Array<{ value: MotionEffect; label: string }> = [
  { value: 'zoom-in', label: 'Zoom Masuk Halus' },
  { value: 'zoom-out', label: 'Zoom Keluar Halus' },
  { value: 'pan-left', label: 'Geser Kiri' },
  { value: 'pan-right', label: 'Geser Kanan' },
  { value: 'static-editorial', label: 'Statis Editorial' },
];

const LAYOUT_OPTIONS: Array<{ value: LayoutStyle; label: string }> = [
  { value: 'cinematic-bottom', label: 'Teks Bawah Sinematik' },
  { value: 'editorial-center', label: 'Tengah Editorial' },
  { value: 'split-caption', label: 'Atas & Bawah Terpisah' },
  { value: 'bold-quote', label: 'Kutipan Tipografi Besar' },
  { value: 'minimal-corner', label: 'Sudut Minimalis' },
];

export const SceneTimelineEditor: React.FC<SceneTimelineEditorProps> = ({
  project,
  activeSceneIndex,
  onSelectScene,
  onUpdateScene,
  onMoveScene,
  onAddScene,
  onDeleteScene,
  onGenerateAllVoiceover,
  onGenerateSingleVoiceover,
  onUploadCustomAudio,
  onDownloadSlidePng,
  isGeneratingVoice,
  generatingSceneId,
}) => {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const totalDuration = project.scenes.reduce((sum, s) => sum + s.durationSeconds, 0);
  const voiceCount = project.scenes.filter((s) => Boolean(s.audioBase64)).length;
  const hasFullVoiceover = Boolean(project.fullVoiceoverBase64);

  return (
    <section
      id="studio-timeline"
      className="bg-white border border-zinc-200 rounded-xl p-5 flex flex-col gap-5"
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-100">
        <div>
          <h2 className="font-display text-lg font-semibold text-zinc-950 tracking-tight">
            02. Editor Adegan &amp; Narasi
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 mt-1">
            <span className="font-mono tabular-nums">
              Total Durasi: {formatTimecode(totalDuration)} ({totalDuration} detik)
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {project.scenes.length} Adegan
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {hasFullVoiceover
                ? 'Audio narasi penuh siap'
                : `Voiceover: ${voiceCount}/${project.scenes.length} siap`}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onUploadCustomAudio(file);
                e.target.value = '';
              }
            }}
          />

          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            className="px-3 py-2 rounded-lg border border-zinc-200 hover:border-zinc-400 bg-white text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah Audio</span>
          </button>

          <button
            type="button"
            onClick={onGenerateAllVoiceover}
            disabled={isGeneratingVoice}
            className="px-3.5 py-2 rounded-lg border border-zinc-200 hover:border-[#2563EB] bg-white text-zinc-800 hover:text-[#2563EB] text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
          >
            {isGeneratingVoice && !generatingSceneId ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Mic className="w-3.5 h-3.5" />
            )}
            <span>
              {isGeneratingVoice && !generatingSceneId
                ? 'Membuat Suara...'
                : 'Buat Voiceover AI'}
            </span>
          </button>

          <button
            type="button"
            onClick={onAddScene}
            className="px-3.5 py-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Adegan</span>
          </button>
        </div>
      </div>

      {/* Scene Cards List */}
      <div className="flex flex-col gap-3">
        {project.scenes.map((scene, idx) => {
          const isActive = idx === activeSceneIndex;
          const isThisVoiceLoading = generatingSceneId === scene.id;

          return (
            <div
              key={scene.id}
              onClick={() => onSelectScene(idx)}
              className={`rounded-xl border p-4 transition-colors cursor-pointer ${
                isActive
                  ? 'border-[#2563EB] bg-blue-50/20'
                  : 'border-zinc-200 bg-white hover:border-zinc-300'
              }`}
            >
              {/* Top Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono tabular-nums font-semibold text-zinc-900">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span aria-hidden="true" className="text-zinc-300">
                    /
                  </span>
                  <span className="font-medium text-zinc-700">{scene.role}</span>
                  <span aria-hidden="true" className="text-zinc-300">
                    ·
                  </span>
                  <span className="font-mono tabular-nums text-zinc-500">
                    {scene.audioBase64 ? 'Audio TTS siap' : 'Tanpa audio TTS'}
                  </span>
                </div>

                <div
                  className="flex items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Duration Stepper */}
                  <div className="flex items-center border border-zinc-200 rounded-md bg-white">
                    <button
                      type="button"
                      aria-label="Kurangi durasi 1 detik"
                      onClick={() =>
                        onUpdateScene(scene.id, {
                          durationSeconds: Math.max(3, scene.durationSeconds - 1),
                        })
                      }
                      className="px-2 py-1 text-xs font-mono text-zinc-600 hover:text-zinc-950 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-2 py-1 text-xs font-mono tabular-nums font-medium text-zinc-900 border-x border-zinc-200">
                      {scene.durationSeconds}d
                    </span>
                    <button
                      type="button"
                      aria-label="Tambah durasi 1 detik"
                      onClick={() =>
                        onUpdateScene(scene.id, {
                          durationSeconds: Math.min(30, scene.durationSeconds + 1),
                        })
                      }
                      className="px-2 py-1 text-xs font-mono text-zinc-600 hover:text-zinc-950 cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    aria-label="Buat voiceover adegan ini"
                    title="Buat atau perbarui voiceover AI adegan ini"
                    disabled={isGeneratingVoice}
                    onClick={() => onGenerateSingleVoiceover(scene.id)}
                    className="p-1.5 rounded-md border border-zinc-200 hover:border-[#2563EB] text-zinc-600 hover:text-[#2563EB] bg-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isThisVoiceLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Mic className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    aria-label="Unduh slide sebagai PNG"
                    title="Unduh adegan ini sebagai gambar slide PNG"
                    onClick={() => onDownloadSlidePng(idx)}
                    className="p-1.5 rounded-md border border-zinc-200 hover:border-zinc-400 text-zinc-600 hover:text-zinc-950 bg-white transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    aria-label="Pindah adegan ke atas"
                    disabled={idx === 0}
                    onClick={() => onMoveScene(idx, 'up')}
                    className="p-1.5 rounded-md border border-zinc-200 text-zinc-500 hover:text-zinc-900 disabled:opacity-30 bg-white cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    aria-label="Pindah adegan ke bawah"
                    disabled={idx === project.scenes.length - 1}
                    onClick={() => onMoveScene(idx, 'down')}
                    className="p-1.5 rounded-md border border-zinc-200 text-zinc-500 hover:text-zinc-900 disabled:opacity-30 bg-white cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  {project.scenes.length > 2 && (
                    <button
                      type="button"
                      aria-label="Hapus adegan"
                      onClick={() => onDeleteScene(scene.id)}
                      className="p-1.5 rounded-md border border-zinc-200 text-zinc-400 hover:text-red-600 hover:border-red-200 bg-white transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Editable Fields */}
              <div
                className="grid grid-cols-1 md:grid-cols-2 gap-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-zinc-500">
                    Judul di Layar
                  </label>
                  <input
                    type="text"
                    value={scene.headline}
                    onChange={(e) =>
                      onUpdateScene(scene.id, { headline: e.target.value })
                    }
                    className="text-sm font-semibold text-zinc-950 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#2563EB] focus:bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-zinc-500">
                    Subjudul di Layar
                  </label>
                  <input
                    type="text"
                    value={scene.subtitle}
                    onChange={(e) =>
                      onUpdateScene(scene.id, { subtitle: e.target.value })
                    }
                    className="text-xs text-zinc-800 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2563EB] focus:bg-white"
                  />
                </div>

                <div className="md:col-span-2 flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-zinc-500">
                    Naskah Voiceover / Subtitle
                  </label>
                  <textarea
                    rows={2}
                    value={scene.narration}
                    onChange={(e) =>
                      onUpdateScene(scene.id, { narration: e.target.value })
                    }
                    className="text-xs text-zinc-800 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2563EB] focus:bg-white resize-none"
                  />
                </div>

                {/* Visual Controls */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-zinc-500">
                      Latar Visual
                    </label>
                    <select
                      value={scene.photoIndex}
                      onChange={(e) =>
                        onUpdateScene(scene.id, { photoIndex: Number(e.target.value) })
                      }
                      className="text-xs text-zinc-800 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#2563EB]"
                    >
                      <option value={-1}>Tipografi Tanpa Foto</option>
                      {project.photos.map((p, pIdx) => (
                        <option key={p.id} value={pIdx}>
                          Foto #{pIdx + 1} · {p.name.slice(0, 18)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-zinc-500">
                      Tata Letak Teks
                    </label>
                    <select
                      value={scene.layoutStyle}
                      onChange={(e) =>
                        onUpdateScene(scene.id, {
                          layoutStyle: e.target.value as LayoutStyle,
                        })
                      }
                      className="text-xs text-zinc-800 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#2563EB]"
                    >
                      {LAYOUT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-zinc-500">
                      Gerakan Kamera
                    </label>
                    <select
                      value={scene.motionEffect}
                      onChange={(e) =>
                        onUpdateScene(scene.id, {
                          motionEffect: e.target.value as MotionEffect,
                        })
                      }
                      className="text-xs text-zinc-800 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#2563EB]"
                    >
                      {MOTION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
