import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CaptionExportSection } from './components/CaptionExportSection';
import { InputPanel } from './components/InputPanel';
import { PresetGallery } from './components/PresetGallery';
import { SceneTimelineEditor } from './components/SceneTimelineEditor';
import { TopBar } from './components/TopBar';
import { VideoPreviewStage } from './components/VideoPreviewStage';
import { PRESET_TEMPLATES } from './data/presets';
import type {
  AspectRatio,
  ContentTone,
  GeneratedProject,
  PresetTemplate,
  SceneItem,
  SocialPlatform,
  UploadedPhoto,
  VoiceCharacter,
} from './types/studio';
import { AmbientMusicEngine } from './utils/ambientAudio';
import {
  exportProjectToSrt,
  exportProjectVideo,
  exportSceneToPng,
  loadImageElement,
} from './utils/canvasRenderer';
import { processUploadedFile, urlToUploadedPhoto } from './utils/imageHelper';

function createInitialProject(): GeneratedProject {
  const firstPreset = PRESET_TEMPLATES[0];
  return {
    ...firstPreset.project,
    id: `proj-${Date.now()}`,
    createdAt: new Date().toISOString(),
    scenes: firstPreset.project.scenes.map((s) => ({ ...s })),
    photos: firstPreset.project.photos.map((p) => ({ ...p })),
  };
}

export default function App() {
  const initialPreset = PRESET_TEMPLATES[0];

  // Input form state
  const [inputMode, setInputMode] = useState<'photo-text' | 'text-only'>('photo-text');
  const [inputText, setInputText] = useState<string>(initialPreset.inputText);
  const [photos, setPhotos] = useState<UploadedPhoto[]>(
    initialPreset.project.photos.map((p) => ({ ...p }))
  );
  const [durationSeconds, setDurationSeconds] = useState<number>(
    initialPreset.durationSeconds
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    initialPreset.aspectRatio
  );
  const [platform, setPlatform] = useState<SocialPlatform>(initialPreset.platform);
  const [tone, setTone] = useState<ContentTone>(initialPreset.tone);
  const [language, setLanguage] = useState<'id' | 'en'>('id');
  const [autoVoiceover, setAutoVoiceover] = useState<boolean>(false);
  const [voiceCharacter, setVoiceCharacter] = useState<VoiceCharacter>('Kore');

  // Active project state
  const [project, setProject] = useState<GeneratedProject>(createInitialProject);
  const [activePresetId, setActivePresetId] = useState<string | null>(initialPreset.id);

  // Generation & voiceover loading state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState<boolean>(false);
  const [generatingSceneId, setGeneratingSceneId] = useState<string | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [voiceMuted, setVoiceMuted] = useState<boolean>(false);
  const [musicEnabled, setMusicEnabled] = useState<boolean>(true);

  // Export state
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [exportError, setExportError] = useState<string | null>(null);
  const exportAbortRef = useRef<AbortController | null>(null);

  // Preloaded images for Canvas renderer
  const [imageMap, setImageMap] = useState<Map<number, HTMLImageElement>>(new Map());

  // Audio playback refs
  const ambientRef = useRef<AmbientMusicEngine | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastTriggeredSceneRef = useRef<string | null>(null);

  const totalDuration = useMemo(
    () => project.scenes.reduce((sum, s) => sum + s.durationSeconds, 0),
    [project.scenes]
  );

  const activeSceneIndex = useMemo(() => {
    let cursor = 0;
    for (let i = 0; i < project.scenes.length; i++) {
      const end = cursor + project.scenes[i].durationSeconds;
      if (currentTime < end || i === project.scenes.length - 1) {
        return i;
      }
      cursor = end;
    }
    return 0;
  }, [currentTime, project.scenes]);

  // Preload project photos whenever project.photos changes
  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      const map = new Map<number, HTMLImageElement>();
      await Promise.all(
        project.photos.map(async (photo, idx) => {
          try {
            const img = await loadImageElement(photo.previewUrl);
            if (!cancelled) map.set(idx, img);
          } catch {
            // Skip unreadable image gracefully
          }
        })
      );
      if (!cancelled) setImageMap(map);
    }
    loadAll();
    return () => {
      cancelled = true;
    };
  }, [project.photos]);

  const stopVoiceAudio = useCallback(() => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.src = '';
      activeAudioRef.current = null;
    }
    lastTriggeredSceneRef.current = null;
  }, []);

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) {
      ambientRef.current?.stop();
      stopVoiceAudio();
      return;
    }

    if (musicEnabled) {
      if (!ambientRef.current) {
        ambientRef.current = new AmbientMusicEngine();
      }
      ambientRef.current.start(project.musicMood);
    }

    let rafId = 0;
    let lastTimestamp = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTimestamp) / 1000);
      lastTimestamp = now;

      setCurrentTime((prev) => {
        const next = prev + dt;
        if (next >= totalDuration) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      ambientRef.current?.stop();
      stopVoiceAudio();
    };
  }, [isPlaying, musicEnabled, project.musicMood, stopVoiceAudio, totalDuration]);

  // Trigger voiceover playback (full continuous track OR per-scene clips)
  useEffect(() => {
    if (!isPlaying || voiceMuted) {
      stopVoiceAudio();
      return;
    }

    if (project.fullVoiceoverBase64) {
      if (!activeAudioRef.current) {
        const audio = new Audio(
          `data:${project.fullVoiceoverMimeType || 'audio/wav'};base64,${project.fullVoiceoverBase64}`
        );
        audio.currentTime = currentTime;
        activeAudioRef.current = audio;
        audio.play().catch(() => {});
      } else if (Math.abs(activeAudioRef.current.currentTime - currentTime) > 0.6) {
        activeAudioRef.current.currentTime = currentTime;
      }
      return;
    }

    const scene = project.scenes[activeSceneIndex];
    if (!scene) return;

    if (lastTriggeredSceneRef.current === scene.id) return;
    lastTriggeredSceneRef.current = scene.id;

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }

    if (scene.audioBase64) {
      const audio = new Audio(
        `data:${scene.audioMimeType || 'audio/wav'};base64,${scene.audioBase64}`
      );
      activeAudioRef.current = audio;
      audio.play().catch(() => {});
    }
  }, [
    activeSceneIndex,
    currentTime,
    isPlaying,
    project.fullVoiceoverBase64,
    project.fullVoiceoverMimeType,
    project.scenes,
    stopVoiceAudio,
    voiceMuted,
  ]);

  const handleToggleMusic = () => {
    setMusicEnabled((prev) => {
      const next = !prev;
      if (isPlaying) {
        if (next) {
          if (!ambientRef.current) ambientRef.current = new AmbientMusicEngine();
          ambientRef.current.start(project.musicMood);
        } else {
          ambientRef.current?.stop();
        }
      }
      return next;
    });
  };

  const handleJumpTo = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleAddPhotos = async (files: FileList) => {
    setGenerationError(null);
    const remaining = Math.max(0, 8 - photos.length);
    const slice = Array.from(files).slice(0, remaining);
    try {
      const processed = await Promise.all(slice.map(processUploadedFile));
      setPhotos((prev) => [...prev, ...processed]);
    } catch (err) {
      setGenerationError(
        err instanceof Error ? err.message : 'Gagal memproses foto yang diunggah.'
      );
    }
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const requestVoiceover = async (
    scenesToVoice: SceneItem[],
    voice: VoiceCharacter,
    toneLabel: ContentTone,
    mode: 'combined' | 'single'
  ) => {
    const resp = await fetch('/api/generate-voiceover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenes: scenesToVoice.map((s) => ({ id: s.id, narration: s.narration })),
        voiceName: voice,
        toneStyle: `${toneLabel}, natural Indonesian social media presenter`,
        mode,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.error || 'Gagal membuat voiceover AI.');
    }
    return data as {
      mode: 'combined' | 'single';
      fullAudioBase64?: string;
      mimeType?: string;
      audioClips?: Array<{
        sceneId: string;
        audioBase64: string;
        mimeType: string;
      }>;
    };
  };

  const handleGenerate = async () => {
    setGenerationError(null);
    setExportError(null);
    setIsPlaying(false);
    setCurrentTime(0);

    const activePhotos = inputMode === 'photo-text' ? photos : [];
    if (!inputText.trim() && activePhotos.length === 0) {
      setGenerationError(
        'Tuliskan deskripsi/topik atau unggah minimal 1 foto sebelum membuat konten.'
      );
      return;
    }

    setIsGenerating(true);
    setGenerationStep('Menganalisis materi & menyusun skrip...');

    try {
      // Ensure preset photos without base64Data get encoded cleanly
      const preparedPhotos = await Promise.all(
        activePhotos.map(async (p) => {
          if (p.base64Data) return p;
          return urlToUploadedPhoto(p.previewUrl, p.name);
        })
      );

      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputText,
          photos: preparedPhotos.map((p) => ({
            mimeType: p.mimeType,
            base64Data: p.base64Data,
          })),
          durationSeconds,
          aspectRatio,
          platform,
          tone,
          language,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal menghasilkan konten.');
      }

      let generatedScenes: SceneItem[] = data.scenes || [];
      let fullVoiceoverBase64: string | undefined;
      let fullVoiceoverMimeType: string | undefined;

      if (autoVoiceover && generatedScenes.length > 0) {
        setGenerationStep('Merekam narasi suara AI...');
        try {
          const voiceRes = await requestVoiceover(
            generatedScenes,
            voiceCharacter,
            tone,
            'combined'
          );
          if (voiceRes.fullAudioBase64) {
            fullVoiceoverBase64 = voiceRes.fullAudioBase64;
            fullVoiceoverMimeType = voiceRes.mimeType || 'audio/wav';
          } else if (voiceRes.audioClips?.length) {
            const clipMap = new Map(voiceRes.audioClips.map((c) => [c.sceneId, c]));
            generatedScenes = generatedScenes.map((s) => {
              const clip = clipMap.get(s.id);
              return clip && clip.audioBase64
                ? { ...s, audioBase64: clip.audioBase64, audioMimeType: clip.mimeType }
                : s;
            });
          }
        } catch (ttsErr) {
          setGenerationError(
            ttsErr instanceof Error
              ? `Konten berhasil dibuat, namun voiceover belum tersedia: ${ttsErr.message}`
              : 'Konten berhasil dibuat, namun voiceover gagal dimuat.'
          );
        }
      }

      setProject({
        id: `proj-${Date.now()}`,
        title: data.title || 'Proyek Konten Baru',
        conceptSummary: data.conceptSummary || '',
        platform,
        aspectRatio,
        tone,
        language,
        musicMood: data.musicMood || 'ambient-warm',
        voiceCharacter,
        hookOptions: Array.isArray(data.hookOptions) ? data.hookOptions : [],
        caption: data.caption || '',
        hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
        scenes: generatedScenes,
        photos: preparedPhotos,
        fullVoiceoverBase64,
        fullVoiceoverMimeType,
        createdAt: new Date().toISOString(),
      });
      setActivePresetId(null);
      setCurrentTime(0);
    } catch (err) {
      setGenerationError(
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan saat memproses konten.'
      );
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const handleGenerateAllVoiceover = async () => {
    setGenerationError(null);
    setIsGeneratingVoice(true);
    setGeneratingSceneId(null);
    try {
      const voiceRes = await requestVoiceover(
        project.scenes,
        voiceCharacter,
        project.tone,
        'combined'
      );
      if (voiceRes.fullAudioBase64) {
        setProject((prev) => ({
          ...prev,
          voiceCharacter,
          fullVoiceoverBase64: voiceRes.fullAudioBase64,
          fullVoiceoverMimeType: voiceRes.mimeType || 'audio/wav',
        }));
      } else if (voiceRes.audioClips?.length) {
        const clipMap = new Map(voiceRes.audioClips.map((c) => [c.sceneId, c]));
        setProject((prev) => ({
          ...prev,
          voiceCharacter,
          fullVoiceoverBase64: undefined,
          scenes: prev.scenes.map((s) => {
            const clip = clipMap.get(s.id);
            return clip && clip.audioBase64
              ? { ...s, audioBase64: clip.audioBase64, audioMimeType: clip.mimeType }
              : s;
          }),
        }));
      }
    } catch (err) {
      setGenerationError(
        err instanceof Error ? err.message : 'Gagal membuat voiceover AI.'
      );
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const handleGenerateSingleVoiceover = async (sceneId: string) => {
    const target = project.scenes.find((s) => s.id === sceneId);
    if (!target) return;
    setGenerationError(null);
    setIsGeneratingVoice(true);
    setGeneratingSceneId(sceneId);
    try {
      const voiceRes = await requestVoiceover(
        [target],
        voiceCharacter,
        project.tone,
        'single'
      );
      const clip = voiceRes.audioClips?.[0];
      if (clip && clip.audioBase64) {
        setProject((prev) => ({
          ...prev,
          fullVoiceoverBase64: undefined,
          scenes: prev.scenes.map((s) =>
            s.id === sceneId
              ? { ...s, audioBase64: clip.audioBase64, audioMimeType: clip.mimeType }
              : s
          ),
        }));
      }
    } catch (err) {
      setGenerationError(
        err instanceof Error ? err.message : 'Gagal membuat voiceover adegan.'
      );
    } finally {
      setIsGeneratingVoice(false);
      setGeneratingSceneId(null);
    }
  };

  const handleUploadCustomAudio = async (file: File) => {
    setGenerationError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Gagal membaca file audio.'));
        reader.readAsDataURL(file);
      });
      const [header, base64] = dataUrl.split(',');
      const mimeMatch = header?.match(/data:([^;]+);base64/);
      const mimeType = mimeMatch?.[1] || file.type || 'audio/mpeg';
      stopVoiceAudio();
      setProject((prev) => ({
        ...prev,
        fullVoiceoverBase64: base64 || '',
        fullVoiceoverMimeType: mimeType,
      }));
    } catch (err) {
      setGenerationError(
        err instanceof Error ? err.message : 'Gagal memuat file audio narasi.'
      );
    }
  };

  const handleSelectScene = (index: number) => {
    let cursor = 0;
    for (let i = 0; i < index; i++) {
      cursor += project.scenes[i]?.durationSeconds || 0;
    }
    setCurrentTime(cursor);
  };

  const handleUpdateScene = (sceneId: string, patch: Partial<SceneItem>) => {
    setProject((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)),
    }));
  };

  const handleMoveScene = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= project.scenes.length) return;
    setProject((prev) => {
      const copy = [...prev.scenes];
      const [item] = copy.splice(index, 1);
      copy.splice(targetIdx, 0, item);
      return {
        ...prev,
        scenes: copy.map((s, i) => ({ ...s, order: i + 1 })),
      };
    });
  };

  const handleAddScene = () => {
    const last = project.scenes[project.scenes.length - 1];
    const newScene: SceneItem = {
      id: `scene-${Date.now()}`,
      order: project.scenes.length + 1,
      durationSeconds: 10,
      role: 'Isi Utama',
      headline: 'Poin tambahan untuk memperkaya ceritamu.',
      subtitle: 'Sunting teks ini atau sesuaikan durasi agar total video makin panjang.',
      narration:
        'Tambahkan detail lanjutan di sini agar audiens mendapatkan pemahaman yang lebih menyeluruh.',
      photoIndex: project.photos.length > 0 ? 0 : -1,
      motionEffect: 'zoom-in',
      layoutStyle: 'cinematic-bottom',
      bgColor: last?.bgColor || '#141518',
      accentColor: last?.accentColor || '#2563EB',
      visualNote: 'Adegan tambahan.',
    };
    setProject((prev) => ({
      ...prev,
      scenes: [...prev.scenes, newScene],
    }));
  };

  const handleDeleteScene = (sceneId: string) => {
    setProject((prev) => ({
      ...prev,
      scenes: prev.scenes
        .filter((s) => s.id !== sceneId)
        .map((s, idx) => ({ ...s, order: idx + 1 })),
    }));
    setCurrentTime(0);
  };

  const handleLoadPreset = (preset: PresetTemplate) => {
    setIsPlaying(false);
    setCurrentTime(0);
    setGenerationError(null);
    setExportError(null);

    setInputMode('photo-text');
    setInputText(preset.inputText);
    setDurationSeconds(preset.durationSeconds);
    setAspectRatio(preset.aspectRatio);
    setPlatform(preset.platform);
    setTone(preset.tone);
    setPhotos(preset.project.photos.map((p) => ({ ...p })));
    setVoiceCharacter(preset.project.voiceCharacter);

    setProject({
      ...preset.project,
      id: `proj-${Date.now()}`,
      createdAt: new Date().toISOString(),
      scenes: preset.project.scenes.map((s) => ({ ...s })),
      photos: preset.project.photos.map((p) => ({ ...p })),
    });
    setActivePresetId(preset.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExportVideo = async (format: 'mp4' | 'webm') => {
    setIsPlaying(false);
    setExportError(null);
    setIsExporting(true);
    setExportProgress(1);
    setExportStatus(
      format === 'mp4' ? 'Menyiapkan render MP4...' : 'Menyiapkan render WebM...'
    );

    const controller = new AbortController();
    exportAbortRef.current = controller;

    try {
      await exportProjectVideo({
        project,
        imageMap,
        format,
        includeMusic: musicEnabled,
        abortSignal: controller.signal,
        onProgress: (pct, status) => {
          setExportProgress(pct);
          setExportStatus(status);
        },
      });
    } catch (err) {
      if (err instanceof Error && err.message !== 'Ekspor dibatalkan.') {
        setExportError(err.message);
      }
    } finally {
      setIsExporting(false);
      exportAbortRef.current = null;
    }
  };

  const handleCancelExport = () => {
    exportAbortRef.current?.abort();
  };

  const handleDownloadSlidePng = async (sceneIndex: number) => {
    const scene = project.scenes[sceneIndex];
    if (!scene) return;
    try {
      await exportSceneToPng(
        scene,
        sceneIndex,
        project.scenes.length,
        project.aspectRatio,
        imageMap,
        `slide-${String(sceneIndex + 1).padStart(2, '0')}.png`
      );
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Gagal mengunduh slide.');
    }
  };

  const handleExportAllPngs = async () => {
    setExportError(null);
    for (let i = 0; i < project.scenes.length; i++) {
      await handleDownloadSlidePng(i);
      await new Promise((r) => setTimeout(r, 150));
    }
  };

  return (
    <div id="studio-top" className="min-h-screen flex flex-col bg-[#F6F6F4] text-[#121316]">
      <TopBar
        onJumpTo={handleJumpTo}
        onExportPrimary={() => {
          handleJumpTo('studio-export');
          handleExportVideo('mp4');
        }}
        isExporting={isExporting}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Compact Studio Intro */}
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-zinc-200 pb-6">
          <div className="max-w-2xl">
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-zinc-950 tracking-tight text-balance leading-[1.12]">
              Ubah teks dan foto menjadi konten media sosial siap tayang.
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 mt-2.5 leading-relaxed">
              Susun naskah adegan, narasi suara AI, tipografi kinetik, dan unduh langsung sebagai video MP4, WebM, atau slide carousel berdurasi 1 menit hingga 3 menit.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 font-mono tabular-nums shrink-0">
            <span>9:16 · 4:5 · 1:1 · 16:9</span>
            <span aria-hidden="true">·</span>
            <span>30d – 180d+</span>
            <span aria-hidden="true">·</span>
            <span>Ekspor MP4 &amp; PNG</span>
          </div>
        </section>

        {generationError && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-xs font-medium"
          >
            {generationError}
          </div>
        )}

        {/* Primary 2-Column Studio Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 lg:sticky lg:top-22">
            <InputPanel
              inputMode={inputMode}
              onChangeInputMode={setInputMode}
              inputText={inputText}
              onChangeInputText={setInputText}
              photos={photos}
              onAddPhotos={handleAddPhotos}
              onRemovePhoto={handleRemovePhoto}
              durationSeconds={durationSeconds}
              onChangeDuration={setDurationSeconds}
              aspectRatio={aspectRatio}
              onChangeAspectRatio={(r) => {
                setAspectRatio(r);
                setProject((prev) => ({ ...prev, aspectRatio: r }));
              }}
              platform={platform}
              onChangePlatform={(p) => {
                setPlatform(p);
                setProject((prev) => ({ ...prev, platform: p }));
              }}
              tone={tone}
              onChangeTone={(t) => {
                setTone(t);
                setProject((prev) => ({ ...prev, tone: t }));
              }}
              language={language}
              onChangeLanguage={setLanguage}
              autoVoiceover={autoVoiceover}
              onChangeAutoVoiceover={setAutoVoiceover}
              voiceCharacter={voiceCharacter}
              onChangeVoiceCharacter={setVoiceCharacter}
              isGenerating={isGenerating}
              generationStep={generationStep}
              onGenerate={handleGenerate}
            />
          </div>

          <div className="lg:col-span-8 flex flex-col gap-6">
            <VideoPreviewStage
              project={project}
              imageMap={imageMap}
              currentTime={currentTime}
              totalDuration={totalDuration}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying((p) => !p)}
              onRestart={() => {
                setCurrentTime(0);
                setIsPlaying(true);
              }}
              onSeek={(t) => {
                lastTriggeredSceneRef.current = null;
                setCurrentTime(Math.max(0, Math.min(totalDuration, t)));
              }}
              voiceMuted={voiceMuted}
              onToggleVoiceMute={() => setVoiceMuted((m) => !m)}
              musicEnabled={musicEnabled}
              onToggleMusic={handleToggleMusic}
              activeSceneIndex={activeSceneIndex}
            />

            <SceneTimelineEditor
              project={project}
              activeSceneIndex={activeSceneIndex}
              onSelectScene={handleSelectScene}
              onUpdateScene={handleUpdateScene}
              onMoveScene={handleMoveScene}
              onAddScene={handleAddScene}
              onDeleteScene={handleDeleteScene}
              onGenerateAllVoiceover={handleGenerateAllVoiceover}
              onGenerateSingleVoiceover={handleGenerateSingleVoiceover}
              onUploadCustomAudio={handleUploadCustomAudio}
              onDownloadSlidePng={handleDownloadSlidePng}
              isGeneratingVoice={isGeneratingVoice}
              generatingSceneId={generatingSceneId}
            />

            <CaptionExportSection
              project={project}
              onUpdateCaption={(cap) =>
                setProject((prev) => ({ ...prev, caption: cap }))
              }
              onApplyHook={(hook) => {
                if (project.scenes[0]) {
                  handleUpdateScene(project.scenes[0].id, { headline: hook });
                  setCurrentTime(0);
                }
              }}
              onExportVideo={handleExportVideo}
              onCancelExport={handleCancelExport}
              onExportAllPngs={handleExportAllPngs}
              onExportSrt={() => exportProjectToSrt(project)}
              isExporting={isExporting}
              exportProgress={exportProgress}
              exportStatus={exportStatus}
              exportError={exportError}
            />
          </div>
        </div>

        {/* Preset Showcase */}
        <PresetGallery
          presets={PRESET_TEMPLATES}
          activePresetId={activePresetId}
          onLoadPreset={handleLoadPreset}
        />
      </main>

      <footer className="border-t border-zinc-200 bg-white mt-12">
        <div className="max-w-[1440px] mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-500">
          <span>Reka Studio · Gratis digunakan tanpa watermark &amp; tanpa batas ekspor</span>
          <span>Mendukung ekspor MP4, WebM, Slide PNG, dan Subtitle SRT</span>
        </div>
      </footer>
    </div>
  );
}
