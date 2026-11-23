import React, { useRef } from 'react';
import { ImagePlus, Loader2, Trash2, Upload, Volume2 } from 'lucide-react';
import type {
  AspectRatio,
  ContentTone,
  SocialPlatform,
  UploadedPhoto,
  VoiceCharacter,
} from '../types/studio';

interface InputPanelProps {
  inputMode: 'photo-text' | 'text-only';
  onChangeInputMode: (mode: 'photo-text' | 'text-only') => void;
  inputText: string;
  onChangeInputText: (val: string) => void;
  photos: UploadedPhoto[];
  onAddPhotos: (files: FileList) => void;
  onRemovePhoto: (id: string) => void;
  durationSeconds: number;
  onChangeDuration: (sec: number) => void;
  aspectRatio: AspectRatio;
  onChangeAspectRatio: (ratio: AspectRatio) => void;
  platform: SocialPlatform;
  onChangePlatform: (platform: SocialPlatform) => void;
  tone: ContentTone;
  onChangeTone: (tone: ContentTone) => void;
  language: 'id' | 'en';
  onChangeLanguage: (lang: 'id' | 'en') => void;
  autoVoiceover: boolean;
  onChangeAutoVoiceover: (val: boolean) => void;
  voiceCharacter: VoiceCharacter;
  onChangeVoiceCharacter: (v: VoiceCharacter) => void;
  isGenerating: boolean;
  generationStep: string;
  onGenerate: () => void;
}

const DURATION_PRESETS = [
  { value: 30, label: '30d' },
  { value: 45, label: '45d' },
  { value: 60, label: '1 Menit' },
  { value: 90, label: '1,5 Menit' },
  { value: 120, label: '2 Menit' },
  { value: 180, label: '3 Menit' },
];

const ASPECT_RATIOS: Array<{ value: AspectRatio; label: string }> = [
  { value: '9:16', label: '9:16 Reels' },
  { value: '4:5', label: '4:5 Feed' },
  { value: '1:1', label: '1:1 Square' },
  { value: '16:9', label: '16:9 Wide' },
];

const PLATFORMS: SocialPlatform[] = [
  'Instagram Reels',
  'TikTok',
  'YouTube Shorts',
  'LinkedIn Video',
  'Instagram Carousel',
];

const TONES: ContentTone[] = [
  'Editorial Mewah',
  'Enerjik & Viral',
  'Edukatif Profesional',
  'Storytelling Hangat',
  'Minimalis Modern',
];

const VOICES: Array<{ id: VoiceCharacter; label: string }> = [
  { id: 'Kore', label: 'Kore · Hangat & Jelas' },
  { id: 'Puck', label: 'Puck · Enerjik & Ringan' },
  { id: 'Charon', label: 'Charon · Tegas & Profesional' },
  { id: 'Fenrir', label: 'Fenrir · Berat & Sinematik' },
  { id: 'Zephyr', label: 'Zephyr · Lembut & Editorial' },
];

export const InputPanel: React.FC<InputPanelProps> = ({
  inputMode,
  onChangeInputMode,
  inputText,
  onChangeInputText,
  photos,
  onAddPhotos,
  onRemovePhoto,
  durationSeconds,
  onChangeDuration,
  aspectRatio,
  onChangeAspectRatio,
  platform,
  onChangePlatform,
  tone,
  onChangeTone,
  language,
  onChangeLanguage,
  autoVoiceover,
  onChangeAutoVoiceover,
  voiceCharacter,
  onChangeVoiceCharacter,
  isGenerating,
  generationStep,
  onGenerate,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddPhotos(e.dataTransfer.files);
    }
  };

  return (
    <aside
      id="studio-input"
      className="bg-white border border-zinc-200 rounded-xl p-5 flex flex-col gap-5"
    >
      <div>
        <h2 className="font-display text-lg font-semibold text-zinc-950 tracking-tight">
          01. Materi &amp; Pengaturan
        </h2>
        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
          Unggah foto atau tulis ide konten untuk disusun otomatis menjadi adegan video dan naskah.
        </p>
      </div>

      {/* Mode Switcher */}
      <div
        role="tablist"
        aria-label="Mode materi input"
        className="grid grid-cols-2 gap-1 p-1 bg-zinc-100 rounded-lg"
      >
        <button
          type="button"
          role="tab"
          aria-selected={inputMode === 'photo-text'}
          onClick={() => onChangeInputMode('photo-text')}
          className={`py-2 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            inputMode === 'photo-text'
              ? 'bg-white text-zinc-950 shadow-xs'
              : 'text-zinc-600 hover:text-zinc-950'
          }`}
        >
          Foto &amp; Teks
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={inputMode === 'text-only'}
          onClick={() => onChangeInputMode('text-only')}
          className={`py-2 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
            inputMode === 'text-only'
              ? 'bg-white text-zinc-950 shadow-xs'
              : 'text-zinc-600 hover:text-zinc-950'
          }`}
        >
          Teks Saja
        </button>
      </div>

      {/* Photo Upload Zone */}
      {inputMode === 'photo-text' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-800">
              Foto Produk atau Momen
            </span>
            <span className="text-xs font-mono tabular-nums text-zinc-500">
              {photos.length} / 8 foto
            </span>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className="border border-dashed border-zinc-300 hover:border-[#2563EB] bg-zinc-50/70 hover:bg-blue-50/30 rounded-lg p-4 text-center transition-colors cursor-pointer"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onAddPhotos(e.target.files);
                  e.target.value = '';
                }
              }}
            />
            <div className="flex flex-col items-center gap-1.5">
              <Upload className="w-4 h-4 text-zinc-500" />
              <span className="text-xs font-medium text-zinc-800">
                Pilih atau seret foto ke sini
              </span>
              <span className="text-[11px] text-zinc-500">
                JPG, PNG, WebP · Maksimal 8 foto
              </span>
            </div>
          </div>

          {photos.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {photos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className="relative group aspect-square rounded-md overflow-hidden border border-zinc-200 bg-zinc-100"
                >
                  <img
                    src={photo.previewUrl}
                    alt={photo.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 text-[10px] font-mono tabular-nums bg-black/70 text-white rounded">
                    #{idx + 1}
                  </span>
                  <button
                    type="button"
                    aria-label={`Hapus foto ${photo.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemovePhoto(photo.id);
                    }}
                    className="absolute top-1 right-1 w-6 h-6 rounded bg-black/75 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {photos.length < 8 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Tambah foto lagi"
                  className="aspect-square rounded-md border border-dashed border-zinc-300 hover:border-[#2563EB] flex items-center justify-center text-zinc-400 hover:text-[#2563EB] transition-colors cursor-pointer"
                >
                  <ImagePlus className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Brief / Text Prompt */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="brief-textarea" className="text-xs font-semibold text-zinc-800">
          {inputMode === 'text-only'
            ? 'Topik, Artikel, atau Naskah Mentah'
            : 'Cerita, Keunggulan Produk, atau Arahan'}
        </label>
        <textarea
          id="brief-textarea"
          rows={4}
          value={inputText}
          onChange={(e) => onChangeInputText(e.target.value)}
          placeholder={
            inputMode === 'text-only'
              ? 'Contoh: 5 kesalahan finansial anak muda usia 20-an dan cara memperbaikinya dalam 60 detik...'
              : 'Contoh: Jelaskan keunikan produk ini, suasana pemakaian, dan ajakan mengunjungi toko kami...'
          }
          className="w-full text-sm text-zinc-900 placeholder:text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#2563EB] focus:bg-white transition-colors resize-y"
        />
      </div>

      {/* Duration Control (15s to 180s+) */}
      <div className="flex flex-col gap-2.5 pt-1 border-t border-zinc-100">
        <div className="flex items-center justify-between">
          <label htmlFor="duration-range" className="text-xs font-semibold text-zinc-800">
            Target Durasi Konten
          </label>
          <span className="text-xs font-mono tabular-nums font-semibold text-[#2563EB]">
            {durationSeconds} detik ({(durationSeconds / 60).toFixed(1)} mnt)
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {DURATION_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChangeDuration(preset.value)}
              className={`py-1.5 px-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                durationSeconds === preset.value
                  ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <input
          id="duration-range"
          type="range"
          min={15}
          max={180}
          step={5}
          value={durationSeconds}
          onChange={(e) => onChangeDuration(Number(e.target.value))}
          className="w-full accent-[#2563EB] cursor-pointer"
        />
        <div className="flex justify-between text-[11px] font-mono tabular-nums text-zinc-400">
          <span>15d</span>
          <span>60d (1 mnt)</span>
          <span>120d (2 mnt)</span>
          <span>180d (3 mnt)</span>
        </div>
      </div>

      {/* Aspect Ratio */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-zinc-800">Rasio Layar</span>
        <div className="grid grid-cols-2 gap-1.5">
          {ASPECT_RATIOS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => onChangeAspectRatio(r.value)}
              className={`py-2 px-2.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                aspectRatio === r.value
                  ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Platform, Tone & Language */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="platform-select" className="text-xs font-semibold text-zinc-800">
            Platform Tujuan
          </label>
          <select
            id="platform-select"
            value={platform}
            onChange={(e) => onChangePlatform(e.target.value as SocialPlatform)}
            className="text-xs font-medium text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2563EB]"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="tone-select" className="text-xs font-semibold text-zinc-800">
              Gaya Konten
            </label>
            <select
              id="tone-select"
              value={tone}
              onChange={(e) => onChangeTone(e.target.value as ContentTone)}
              className="text-xs font-medium text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-[#2563EB]"
            >
              {TONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="lang-select" className="text-xs font-semibold text-zinc-800">
              Bahasa
            </label>
            <select
              id="lang-select"
              value={language}
              onChange={(e) => onChangeLanguage(e.target.value as 'id' | 'en')}
              className="text-xs font-medium text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-[#2563EB]"
            >
              <option value="id">Indonesia</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>

      {/* Voiceover Configuration */}
      <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="flex items-center gap-2 text-xs font-semibold text-zinc-800">
            <Volume2 className="w-3.5 h-3.5 text-zinc-500" />
            Buat Voiceover AI Otomatis
          </span>
          <input
            type="checkbox"
            checked={autoVoiceover}
            onChange={(e) => onChangeAutoVoiceover(e.target.checked)}
            className="w-4 h-4 accent-[#2563EB] cursor-pointer"
          />
        </label>

        {autoVoiceover && (
          <select
            aria-label="Pilih karakter suara narator"
            value={voiceCharacter}
            onChange={(e) => onChangeVoiceCharacter(e.target.value as VoiceCharacter)}
            className="text-xs font-medium text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2563EB]"
          >
            {VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Primary Generate Button */}
      <button
        type="button"
        onClick={onGenerate}
        disabled={isGenerating}
        className="w-full py-3 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
      >
        {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
        <span>{isGenerating ? generationStep || 'Menyusun Konten...' : 'Buat Konten Otomatis'}</span>
      </button>
    </aside>
  );
};
