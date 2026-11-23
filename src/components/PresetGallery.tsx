import React, { useState } from 'react';
import { Play } from 'lucide-react';
import type { PresetTemplate } from '../types/studio';

interface PresetGalleryProps {
  presets: PresetTemplate[];
  activePresetId: string | null;
  onLoadPreset: (preset: PresetTemplate) => void;
}

export const PresetGallery: React.FC<PresetGalleryProps> = ({
  presets,
  activePresetId,
  onLoadPreset,
}) => {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  return (
    <section id="studio-presets" className="pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-2xl font-bold text-zinc-950 tracking-tight">
            Templat Studio Siap Pakai
          </h2>
          <p className="text-sm text-zinc-600 mt-1">
            Muat salah satu contoh proyek 60–90 detik di bawah ini untuk melihat alur adegan, naskah, dan ekspor MP4 secara langsung.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {presets.map((preset) => {
          const isCurrent = activePresetId === preset.id;
          const imgFailed = failedImages[preset.id];

          return (
            <article
              key={preset.id}
              className={`group bg-white rounded-xl border overflow-hidden flex flex-col transition-colors ${
                isCurrent ? 'border-[#2563EB]' : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="relative aspect-[4/3] bg-zinc-900 overflow-hidden">
                {!imgFailed ? (
                  <img
                    src={preset.coverImage}
                    alt={preset.title}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setFailedImages((prev) => ({ ...prev, [preset.id]: true }))
                    }
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center p-4 text-center">
                    <span className="font-display text-sm font-semibold text-white">
                      {preset.title}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-white/90 font-mono tabular-nums">
                  <span>{preset.aspectRatio}</span>
                  <span>{preset.durationLabel}</span>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                <div>
                  <div className="text-[11px] text-zinc-500">
                    {preset.category} · {preset.platform}
                  </div>
                  <h3 className="font-display text-base font-semibold text-zinc-950 mt-1 leading-snug">
                    {preset.title}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => onLoadPreset(preset)}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    isCurrent
                      ? 'bg-blue-50 text-[#2563EB] border border-blue-200'
                      : 'bg-zinc-950 hover:bg-zinc-800 text-white'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isCurrent ? 'Sedang Dibuka' : 'Buka di Studio'}</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
