import React from 'react';

interface TopBarProps {
  onJumpTo: (sectionId: string) => void;
  onExportPrimary: () => void;
  isExporting: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  onJumpTo,
  onExportPrimary,
  isExporting,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#F6F6F4]/95 backdrop-blur-sm border-b border-zinc-200/80">
      <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line brand wordmark */}
        <a
          href="#studio-top"
          onClick={(e) => {
            e.preventDefault();
            onJumpTo('studio-top');
          }}
          className="font-display text-lg font-bold tracking-tight text-zinc-950 whitespace-nowrap shrink-0"
        >
          Reka Studio
        </a>

        {/* Zone 2: 4 concise single-line navigation links */}
        <nav
          aria-label="Navigasi utama"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600"
        >
          <a
            href="#studio-input"
            onClick={(e) => {
              e.preventDefault();
              onJumpTo('studio-input');
            }}
            className="hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0"
          >
            Buat Konten
          </a>
          <a
            href="#studio-timeline"
            onClick={(e) => {
              e.preventDefault();
              onJumpTo('studio-timeline');
            }}
            className="hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0"
          >
            Editor Adegan
          </a>
          <a
            href="#studio-export"
            onClick={(e) => {
              e.preventDefault();
              onJumpTo('studio-export');
            }}
            className="hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0"
          >
            Ekspor &amp; Caption
          </a>
          <a
            href="#studio-presets"
            onClick={(e) => {
              e.preventDefault();
              onJumpTo('studio-presets');
            }}
            className="hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0"
          >
            Templat Siap Pakai
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onExportPrimary}
            disabled={isExporting}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
          >
            {isExporting ? 'Merender MP4...' : 'Unduh MP4'}
          </button>
        </div>
      </div>
    </header>
  );
};
