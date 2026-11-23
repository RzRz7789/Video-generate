import React, { useState } from 'react';
import {
  Check,
  Copy,
  FileText,
  Film,
  Images,
  Loader2,
  X,
} from 'lucide-react';
import type { GeneratedProject } from '../types/studio';

interface CaptionExportSectionProps {
  project: GeneratedProject;
  onUpdateCaption: (caption: string) => void;
  onApplyHook: (hookText: string) => void;
  onExportVideo: (format: 'mp4' | 'webm') => void;
  onCancelExport: () => void;
  onExportAllPngs: () => void;
  onExportSrt: () => void;
  isExporting: boolean;
  exportProgress: number;
  exportStatus: string;
  exportError: string | null;
}

export const CaptionExportSection: React.FC<CaptionExportSectionProps> = ({
  project,
  onUpdateCaption,
  onApplyHook,
  onExportVideo,
  onCancelExport,
  onExportAllPngs,
  onExportSrt,
  isExporting,
  exportProgress,
  exportStatus,
  exportError,
}) => {
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedTags, setCopiedTags] = useState(false);

  const handleCopyCaption = async () => {
    const fullText = `${project.caption}\n\n${project.hashtags.join(' ')}`.trim();
    await navigator.clipboard.writeText(fullText);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const handleCopyTags = async () => {
    await navigator.clipboard.writeText(project.hashtags.join(' '));
    setCopiedTags(true);
    setTimeout(() => setCopiedTags(false), 2000);
  };

  return (
    <section
      id="studio-export"
      className="bg-white border border-zinc-200 rounded-xl p-5 flex flex-col gap-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3 pb-4 border-b border-zinc-100">
        <div>
          <h2 className="font-display text-lg font-semibold text-zinc-950 tracking-tight">
            03. Ekspor Video &amp; Paket Publikasi
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Unduh hasil video berformat MP4 atau WebM lengkap dengan animasi dan audio, atau salin caption siap unggah.
          </p>
        </div>
      </div>

      {/* Export Center */}
      <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">
              Unduh File Konten
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Pilih format video MP4 universal untuk Instagram/TikTok/WhatsApp atau WebM, serta paket slide PNG.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isExporting}
              onClick={() => onExportVideo('mp4')}
              className="px-4 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Film className="w-3.5 h-3.5" />
              )}
              <span>Unduh Video MP4 (.mp4)</span>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={() => onExportVideo('webm')}
              className="px-3.5 py-2.5 rounded-lg border border-zinc-200 hover:border-zinc-400 bg-white text-zinc-800 text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Unduh WebM (.webm)</span>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={onExportAllPngs}
              className="px-3.5 py-2.5 rounded-lg border border-zinc-200 hover:border-zinc-400 bg-white text-zinc-800 text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
            >
              <Images className="w-3.5 h-3.5" />
              <span>Unduh Slide Carousel (.png)</span>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={onExportSrt}
              className="px-3.5 py-2.5 rounded-lg border border-zinc-200 hover:border-zinc-400 bg-white text-zinc-800 text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Unduh Subtitle (.srt)</span>
            </button>
          </div>
        </div>

        {/* Export Progress Bar */}
        {isExporting && (
          <div className="bg-white border border-zinc-200 rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-800">{exportStatus}</span>
              <div className="flex items-center gap-3">
                <span className="font-mono tabular-nums font-semibold text-[#2563EB]">
                  {exportProgress}%
                </span>
                <button
                  type="button"
                  onClick={onCancelExport}
                  className="text-zinc-500 hover:text-red-600 flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Batal</span>
                </button>
              </div>
            </div>
            <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#2563EB] transition-all duration-150"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}

        {exportError && (
          <div
            role="alert"
            className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5"
          >
            {exportError}
          </div>
        )}
      </div>

      {/* Hooks & Caption Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hook Variations */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-zinc-800">
            Pilihan Hook Pembuka (3 Detik Pertama)
          </h3>
          <div className="flex flex-col gap-2">
            {project.hookOptions.map((hook, idx) => (
              <div
                key={idx}
                className="border border-zinc-200 rounded-lg p-3 flex items-start justify-between gap-3 bg-white"
              >
                <div className="text-xs text-zinc-800 leading-relaxed">
                  <span className="font-mono text-zinc-400 mr-2">
                    0{idx + 1}.
                  </span>
                  {hook}
                </div>
                <button
                  type="button"
                  onClick={() => onApplyHook(hook)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-[#2563EB] hover:bg-blue-50 border border-blue-200 rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                >
                  Pakai di Adegan 1
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Social Media Caption & Hashtags */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="caption-editor"
              className="text-xs font-semibold text-zinc-800"
            >
              Caption &amp; Hashtag Siap Posting
            </label>
            <button
              type="button"
              onClick={handleCopyCaption}
              className="px-3 py-1.5 rounded-md border border-zinc-200 hover:border-zinc-300 text-xs font-medium text-zinc-700 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {copiedCaption ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Caption Lengkap</span>
                </>
              )}
            </button>
          </div>

          <textarea
            id="caption-editor"
            rows={5}
            value={project.caption}
            onChange={(e) => onUpdateCaption(e.target.value)}
            className="w-full text-xs text-zinc-800 leading-relaxed bg-zinc-50 border border-zinc-200 rounded-lg p-3 focus:outline-none focus:border-[#2563EB] focus:bg-white"
          />

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-xs text-zinc-600 leading-relaxed">
              {project.hashtags.join(' ')}
            </p>
            <button
              type="button"
              onClick={handleCopyTags}
              className="text-xs font-medium text-[#2563EB] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedTags ? 'Hashtag Tersalin' : 'Salin Hashtag'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
