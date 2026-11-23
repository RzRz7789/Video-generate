import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import type {
  AspectRatio,
  GeneratedProject,
  MusicMood,
  SceneItem,
} from '../types/studio';

export interface CanvasDimensions {
  width: number;
  height: number;
}

export function getDimensionsForRatio(
  ratio: AspectRatio,
  quality: 'hd' | 'fhd' = 'fhd'
): CanvasDimensions {
  if (quality === 'hd') {
    switch (ratio) {
      case '9:16':
        return { width: 720, height: 1280 };
      case '4:5':
        return { width: 720, height: 900 };
      case '1:1':
        return { width: 720, height: 720 };
      case '16:9':
        return { width: 1280, height: 720 };
    }
  }
  switch (ratio) {
    case '9:16':
      return { width: 1080, height: 1920 };
    case '4:5':
      return { width: 1080, height: 1350 };
    case '1:1':
      return { width: 1080, height: 1080 };
    case '16:9':
      return { width: 1920, height: 1080 };
  }
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Gagal memuat gambar: ${src}`));
    img.src = src;
  });
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 5
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
      if (lines.length >= maxLines - 1) {
        // Append remaining words and let ellipsis handle overflow if needed
        const rest = words.slice(i + 1).join(' ');
        if (rest) {
          current = `${current} ${rest}`;
        }
        break;
      }
    }
  }
  lines.push(current);
  return lines.slice(0, maxLines);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
}

export function renderSceneFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: SceneItem,
  sceneIndex: number,
  totalScenes: number,
  sceneProgress: number,
  imageMap: Map<number, HTMLImageElement>
) {
  const p = Math.min(1, Math.max(0, sceneProgress));
  const enterEase = easeOutCubic(Math.min(1, p / 0.16));

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // 1. Background (Photo with Ken Burns OR Editorial Gradient Canvas)
  const photo = scene.photoIndex >= 0 ? imageMap.get(scene.photoIndex) : undefined;
  const bgHex = scene.bgColor || '#141518';
  const accentHex = scene.accentColor || '#2563EB';

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, width, height);

  if (photo && photo.naturalWidth > 0 && photo.naturalHeight > 0) {
    const imgAspect = photo.naturalWidth / photo.naturalHeight;
    const canvasAspect = width / height;

    let baseDrawW = width;
    let baseDrawH = height;
    if (imgAspect > canvasAspect) {
      baseDrawH = height;
      baseDrawW = height * imgAspect;
    } else {
      baseDrawW = width;
      baseDrawH = width / imgAspect;
    }

    let scale = 1.04;
    let offsetX = 0;
    let offsetY = 0;

    switch (scene.motionEffect) {
      case 'zoom-in':
        scale = 1.0 + p * 0.1;
        break;
      case 'zoom-out':
        scale = 1.1 - p * 0.1;
        break;
      case 'pan-left':
        scale = 1.1;
        offsetX = (0.5 - p) * width * 0.06;
        break;
      case 'pan-right':
        scale = 1.1;
        offsetX = (p - 0.5) * width * 0.06;
        break;
      case 'static-editorial':
      default:
        scale = 1.02;
        break;
    }

    const drawW = baseDrawW * scale;
    const drawH = baseDrawH * scale;
    const drawX = (width - drawW) / 2 + offsetX;
    const drawY = (height - drawH) / 2 + offsetY;

    ctx.drawImage(photo, drawX, drawY, drawW, drawH);

    // Measured contrast scrim
    if (scene.layoutStyle === 'editorial-center' || scene.layoutStyle === 'bold-quote') {
      const radial = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.1,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.72
      );
      radial.addColorStop(0, 'rgba(10, 11, 14, 0.56)');
      radial.addColorStop(1, 'rgba(10, 11, 14, 0.82)');
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, width, height);
    } else if (scene.layoutStyle === 'split-caption') {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, 'rgba(10, 11, 14, 0.55)');
      grad.addColorStop(0.45, 'rgba(10, 11, 14, 0.25)');
      grad.addColorStop(1, 'rgba(10, 11, 14, 0.88)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else {
      const grad = ctx.createLinearGradient(0, height * 0.25, 0, height);
      grad.addColorStop(0, 'rgba(10, 11, 14, 0.12)');
      grad.addColorStop(0.48, 'rgba(10, 11, 14, 0.45)');
      grad.addColorStop(1, 'rgba(10, 11, 14, 0.90)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  } else {
    // Rich typographic background for text-only scenes
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, bgHex);
    grad.addColorStop(1, '#090A0D');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle architectural grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = Math.max(1, width * 0.0012);
    const step = width / 6;
    for (let x = step; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Subtle ambient glow circle using accentColor
    const glow = ctx.createRadialGradient(
      width * 0.82,
      height * 0.22,
      10,
      width * 0.82,
      height * 0.22,
      width * 0.65
    );
    glow.addColorStop(0, `${accentHex}33`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Top Progress Segments (clean hairline bars)
  const padX = Math.round(width * 0.075);
  const topY = Math.round(height * 0.042);
  const segGap = Math.round(width * 0.012);
  const segTotalW = width - padX * 2 - segGap * Math.max(0, totalScenes - 1);
  const segW = segTotalW / Math.max(1, totalScenes);
  const barH = Math.max(3, Math.round(height * 0.0032));

  for (let i = 0; i < totalScenes; i++) {
    const sx = padX + i * (segW + segGap);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
    ctx.fillRect(sx, topY, segW, barH);

    if (i < sceneIndex) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(sx, topY, segW, barH);
    } else if (i === sceneIndex) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(sx, topY, segW * p, barH);
    }
  }

  // 3. Typography & Layout Composition
  const isPortrait = height > width;
  const isWide = width > height;
  const headlineSize = isWide
    ? Math.round(height * 0.068)
    : isPortrait
      ? Math.round(width * 0.068)
      : Math.round(width * 0.062);
  const subtitleSize = Math.round(headlineSize * 0.48);
  const kickerSize = Math.round(headlineSize * 0.34);

  const maxTextW = width - padX * 2;
  const slideUpOffset = (1 - enterEase) * (height * 0.025);
  ctx.globalAlpha = 0.15 + enterEase * 0.85;

  ctx.font = `700 ${headlineSize}px "Bricolage Grotesque", "Plus Jakarta Sans", sans-serif`;
  const headlineLines = wrapLines(ctx, scene.headline || '', maxTextW, 4);

  ctx.font = `400 ${subtitleSize}px "Plus Jakarta Sans", sans-serif`;
  const subtitleLines = wrapLines(ctx, scene.subtitle || '', maxTextW, 4);

  const headlineLineH = Math.round(headlineSize * 1.15);
  const subtitleLineH = Math.round(subtitleSize * 1.42);

  const drawTextBlock = (
    startX: number,
    startY: number,
    align: CanvasTextAlign,
    showAccentBar: boolean
  ) => {
    ctx.textAlign = align;
    ctx.textBaseline = 'top';

    let cursorY = startY + slideUpOffset;

    if (showAccentBar) {
      ctx.fillStyle = accentHex;
      const barW = Math.round(width * 0.07);
      const barX =
        align === 'center'
          ? startX - barW / 2
          : align === 'right'
            ? startX - barW
            : startX;
      ctx.fillRect(barX, cursorY, barW, Math.max(4, Math.round(height * 0.004)));
      cursorY += Math.round(headlineSize * 0.35);
    }

    // Scene Role Kicker (unboxed clean editorial text)
    ctx.font = `600 ${kickerSize}px "JetBrains Mono", monospace`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    const kickerText = `${String(sceneIndex + 1).padStart(2, '0')} / ${String(totalScenes).padStart(2, '0')}  ·  ${scene.role}`;
    ctx.fillText(kickerText, startX, cursorY);
    cursorY += Math.round(kickerSize * 1.85);

    // Headline
    ctx.font = `700 ${headlineSize}px "Bricolage Grotesque", "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    headlineLines.forEach((line) => {
      ctx.fillText(line, startX, cursorY);
      cursorY += headlineLineH;
    });

    cursorY += Math.round(headlineSize * 0.32);

    // Subtitle
    ctx.font = `400 ${subtitleSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = 'rgba(244, 244, 246, 0.88)';
    subtitleLines.forEach((line) => {
      ctx.fillText(line, startX, cursorY);
      cursorY += subtitleLineH;
    });
  };

  const blockHeight =
    Math.round(headlineSize * 0.35) +
    Math.round(kickerSize * 1.85) +
    headlineLines.length * headlineLineH +
    Math.round(headlineSize * 0.32) +
    subtitleLines.length * subtitleLineH;

  switch (scene.layoutStyle) {
    case 'editorial-center':
    case 'bold-quote': {
      const centerY = Math.max(topY + barH + 40, (height - blockHeight) * 0.48);
      drawTextBlock(width / 2, centerY, 'center', true);
      break;
    }
    case 'split-caption': {
      // Kicker & headline near top-left, subtitle anchored cleanly at lower-left
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      let topCursor = topY + Math.round(height * 0.05) + slideUpOffset;

      ctx.fillStyle = accentHex;
      ctx.fillRect(padX, topCursor, Math.round(width * 0.08), Math.max(4, Math.round(height * 0.004)));
      topCursor += Math.round(headlineSize * 0.35);

      ctx.font = `600 ${kickerSize}px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText(
        `${String(sceneIndex + 1).padStart(2, '0')} / ${String(totalScenes).padStart(2, '0')}  ·  ${scene.role}`,
        padX,
        topCursor
      );
      topCursor += Math.round(kickerSize * 1.85);

      ctx.font = `700 ${headlineSize}px "Bricolage Grotesque", "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#FFFFFF';
      headlineLines.forEach((line) => {
        ctx.fillText(line, padX, topCursor);
        topCursor += headlineLineH;
      });

      const bottomY = height - Math.round(height * 0.08) - subtitleLines.length * subtitleLineH;
      ctx.font = `400 ${subtitleSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = 'rgba(244, 244, 246, 0.92)';
      let subCursor = bottomY;
      subtitleLines.forEach((line) => {
        ctx.fillText(line, padX, subCursor);
        subCursor += subtitleLineH;
      });
      break;
    }
    case 'minimal-corner': {
      const bottomStart = height - Math.round(height * 0.08) - blockHeight;
      drawTextBlock(padX, bottomStart, 'left', false);
      break;
    }
    case 'cinematic-bottom':
    default: {
      const bottomStart = height - Math.round(height * 0.085) - blockHeight;
      drawTextBlock(padX, bottomStart, 'left', true);
      break;
    }
  }

  ctx.restore();
}

export async function exportSceneToPng(
  scene: SceneItem,
  sceneIndex: number,
  totalScenes: number,
  aspectRatio: AspectRatio,
  imageMap: Map<number, HTMLImageElement>,
  filename: string
) {
  const { width, height } = getDimensionsForRatio(aspectRatio, 'fhd');
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Kanvas tidak tersedia.');

  renderSceneFrame(ctx, width, height, scene, sceneIndex, totalScenes, 0.65, imageMap);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png', 1.0)
  );
  if (!blob) throw new Error('Gagal membuat file gambar PNG.');

  triggerDownload(blob, filename);
}

export function exportProjectToSrt(project: GeneratedProject) {
  let cursor = 0;
  const formatSrtTime = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = Math.floor(sec % 60);
    const ms = Math.round((sec - Math.floor(sec)) * 1000);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(
      secs
    ).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  };

  const lines = project.scenes.map((scene, idx) => {
    const start = cursor;
    const end = cursor + scene.durationSeconds;
    cursor = end;
    const text = scene.narration || `${scene.headline}\n${scene.subtitle}`;
    return `${idx + 1}\n${formatSrtTime(start)} --> ${formatSrtTime(end)}\n${text}\n`;
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const slug = project.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'reka-studio';
  triggerDownload(blob, `${slug}-subtitle.srt`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function getAmbientChords(mood: MusicMood): number[][] {
  switch (mood) {
    case 'lofi-pulse':
      return [
        [220.0, 261.63, 329.63, 392.0],
        [174.61, 220.0, 261.63, 329.63],
        [196.0, 246.94, 293.66, 349.23],
        [164.81, 196.0, 246.94, 293.66],
      ];
    case 'editorial-piano':
      return [
        [261.63, 329.63, 392.0],
        [220.0, 261.63, 329.63],
        [174.61, 220.0, 261.63],
        [196.0, 246.94, 293.66],
      ];
    case 'minimal-synth':
      return [
        [196.0, 293.66, 392.0],
        [174.61, 261.63, 349.23],
        [220.0, 329.63, 440.0],
        [146.83, 220.0, 293.66],
      ];
    case 'ambient-warm':
    default:
      return [
        [196.0, 246.94, 293.66, 369.99],
        [164.81, 196.0, 246.94, 293.66],
        [220.0, 261.63, 329.63, 392.0],
        [146.83, 220.0, 261.63, 329.63],
      ];
  }
}

async function renderMixedAudioTrack(
  project: GeneratedProject,
  includeMusic: boolean,
  sampleRate = 48000
): Promise<AudioBuffer> {
  const totalDuration = project.scenes.reduce((s, sc) => s + sc.durationSeconds, 0);
  const length = Math.max(1, Math.ceil(totalDuration * sampleRate));
  const offline = new OfflineAudioContext(2, length, sampleRate);

  // Schedule gentle ambient music bed if enabled
  if (includeMusic) {
    const musicGain = offline.createGain();
    musicGain.gain.setValueAtTime(0.08, 0);
    musicGain.connect(offline.destination);

    const chords = getAmbientChords(project.musicMood);
    let step = 0;
    for (let t = 0; t < totalDuration; t += 2.0) {
      const chord = chords[step % chords.length];
      step += 1;
      chord.forEach((freq, idx) => {
        const osc = offline.createOscillator();
        const noteGain = offline.createGain();
        const filter = offline.createBiquadFilter();

        osc.type = project.musicMood === 'minimal-synth' ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.04);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(950, t);

        noteGain.gain.setValueAtTime(0.0001, t);
        noteGain.gain.exponentialRampToValueAtTime(0.18 / chord.length, t + 0.35);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, Math.min(totalDuration, t + 2.2));

        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(musicGain);

        osc.start(t + idx * 0.04);
        osc.stop(Math.min(totalDuration, t + 2.3));
      });
    }
  }

  // Decode and schedule full voiceover track if available, otherwise per-scene clips
  if (project.fullVoiceoverBase64) {
    try {
      const buf = base64ToArrayBuffer(project.fullVoiceoverBase64);
      const decoded = await offline.decodeAudioData(buf);
      const src = offline.createBufferSource();
      src.buffer = decoded;
      src.connect(offline.destination);
      src.start(0);
    } catch {
      // Ignore faulty audio clip so export succeeds cleanly
    }
  } else {
    let sceneStart = 0;
    for (const scene of project.scenes) {
      if (scene.audioBase64) {
        try {
          const buf = base64ToArrayBuffer(scene.audioBase64);
          const decoded = await offline.decodeAudioData(buf);
          const src = offline.createBufferSource();
          src.buffer = decoded;
          src.connect(offline.destination);
          src.start(sceneStart);
        } catch {
          // Ignore single faulty audio clip so export succeeds cleanly
        }
      }
      sceneStart += scene.durationSeconds;
    }
  }

  return offline.startRendering();
}

export interface ExportVideoOptions {
  project: GeneratedProject;
  imageMap: Map<number, HTMLImageElement>;
  format: 'mp4' | 'webm';
  includeMusic: boolean;
  onProgress: (percent: number, statusText: string) => void;
  abortSignal?: AbortSignal;
}

export async function exportProjectVideo(options: ExportVideoOptions): Promise<void> {
  const { project, imageMap, format, includeMusic, onProgress, abortSignal } = options;

  const slug =
    project.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'reka-studio';

  if (format === 'mp4') {
    const webCodecsAvailable =
      typeof VideoEncoder !== 'undefined' &&
      typeof AudioEncoder !== 'undefined' &&
      typeof VideoFrame !== 'undefined' &&
      typeof AudioData !== 'undefined';

    if (webCodecsAvailable) {
      const mp4Success = await tryExportMp4WithWebCodecs({
        project,
        imageMap,
        includeMusic,
        slug,
        onProgress,
        abortSignal,
      });
      if (mp4Success) return;
    }

    // Fallback: Check native MediaRecorder video/mp4 support
    const nativeMp4Mime = ['video/mp4;codecs=avc1', 'video/mp4'].find((m) =>
      typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)
    );
    if (nativeMp4Mime) {
      await exportWithMediaRecorder({
        project,
        imageMap,
        includeMusic,
        mimeType: nativeMp4Mime,
        filename: `${slug}.mp4`,
        onProgress,
        abortSignal,
      });
      return;
    }

    throw new Error(
      'Peramban ini belum mendukung enkoding MP4 langsung. Silakan pilih format WebM (.webm) yang tersedia di sebelah tombol MP4.'
    );
  }

  // WebM Export via MediaRecorder
  const webmMime =
    ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(
      (m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)
    ) || '';

  if (!webmMime) {
    throw new Error('Peramban tidak mendukung perekaman video WebM.');
  }

  await exportWithMediaRecorder({
    project,
    imageMap,
    includeMusic,
    mimeType: webmMime,
    filename: `${slug}.webm`,
    onProgress,
    abortSignal,
  });
}

async function tryExportMp4WithWebCodecs(params: {
  project: GeneratedProject;
  imageMap: Map<number, HTMLImageElement>;
  includeMusic: boolean;
  slug: string;
  onProgress: (percent: number, statusText: string) => void;
  abortSignal?: AbortSignal;
}): Promise<boolean> {
  const { project, imageMap, includeMusic, slug, onProgress, abortSignal } = params;

  try {
    // Try FHD first, then HD (720p) if H.264 encoder profile requires lower level
    const candidates = [
      { dims: getDimensionsForRatio(project.aspectRatio, 'fhd'), bitrate: 5_000_000 },
      { dims: getDimensionsForRatio(project.aspectRatio, 'hd'), bitrate: 3_000_000 },
    ];
    const codecs = ['avc1.4d002a', 'avc1.640028', 'avc1.42001f'];

    let chosenVideoConfig: VideoEncoderConfig | null = null;
    for (const c of candidates) {
      for (const codec of codecs) {
        const cfg: VideoEncoderConfig = {
          codec,
          width: c.dims.width,
          height: c.dims.height,
          bitrate: c.bitrate,
          framerate: 30,
        };
        const res = await VideoEncoder.isConfigSupported(cfg);
        if (res.supported) {
          chosenVideoConfig = cfg;
          break;
        }
      }
      if (chosenVideoConfig) break;
    }

    if (!chosenVideoConfig) return false;

    // Probe audio codec (AAC preferred for universal MP4, fallback Opus)
    let audioCodecType: 'aac' | 'opus' = 'aac';
    let audioEncoderConfig: AudioEncoderConfig = {
      codec: 'mp4a.40.2',
      numberOfChannels: 2,
      sampleRate: 48000,
      bitrate: 128_000,
    };
    const aacSupport = await AudioEncoder.isConfigSupported(audioEncoderConfig);
    if (!aacSupport.supported) {
      const opusConfig: AudioEncoderConfig = {
        codec: 'opus',
        numberOfChannels: 2,
        sampleRate: 48000,
        bitrate: 128_000,
      };
      const opusSupport = await AudioEncoder.isConfigSupported(opusConfig);
      if (!opusSupport.supported) return false;
      audioCodecType = 'opus';
      audioEncoderConfig = opusConfig;
    }

    onProgress(4, 'Menyiapkan trek audio & narasi...');
    const mixedAudio = await renderMixedAudioTrack(project, includeMusic, 48000);

    const width = chosenVideoConfig.width;
    const height = chosenVideoConfig.height;
    const fps = 30;
    const totalDuration = project.scenes.reduce((s, sc) => s + sc.durationSeconds, 0);
    const totalFrames = Math.max(1, Math.round(totalDuration * fps));

    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: {
        codec: 'avc',
        width,
        height,
        frameRate: fps,
      },
      audio: {
        codec: audioCodecType,
        numberOfChannels: 2,
        sampleRate: 48000,
      },
      fastStart: 'in-memory',
    });

    let encoderError: Error | null = null;

    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (err) => {
        encoderError = err instanceof Error ? err : new Error(String(err));
      },
    });
    videoEncoder.configure(chosenVideoConfig);

    const audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: (err) => {
        encoderError = err instanceof Error ? err : new Error(String(err));
      },
    });
    audioEncoder.configure(audioEncoderConfig);

    // Encode audio in 1024-sample or 4800-sample chunks
    const left = mixedAudio.getChannelData(0);
    const right =
      mixedAudio.numberOfChannels > 1 ? mixedAudio.getChannelData(1) : left;
    const chunkSamples = 4800; // 100ms chunks
    for (let offset = 0; offset < mixedAudio.length; offset += chunkSamples) {
      if (abortSignal?.aborted) throw new Error('Ekspor dibatalkan.');
      const count = Math.min(chunkSamples, mixedAudio.length - offset);
      const planar = new Float32Array(count * 2);
      planar.set(left.subarray(offset, offset + count), 0);
      planar.set(right.subarray(offset, offset + count), count);

      const timestampUs = Math.round((offset / 48000) * 1_000_000);
      const audioData = new AudioData({
        format: 'f32-planar',
        sampleRate: 48000,
        numberOfFrames: count,
        numberOfChannels: 2,
        timestamp: timestampUs,
        data: planar,
      });
      audioEncoder.encode(audioData);
      audioData.close();
    }

    // Prepare canvas for frame-by-frame rendering
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Kanvas tidak tersedia.');

    const frameDurationUs = Math.round(1_000_000 / fps);

    // Build scene time ranges
    const sceneBounds: Array<{ start: number; end: number; scene: SceneItem; index: number }> =
      [];
    let cursor = 0;
    project.scenes.forEach((sc, idx) => {
      sceneBounds.push({
        start: cursor,
        end: cursor + sc.durationSeconds,
        scene: sc,
        index: idx,
      });
      cursor += sc.durationSeconds;
    });

    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      if (abortSignal?.aborted) {
        videoEncoder.close();
        audioEncoder.close();
        throw new Error('Ekspor dibatalkan.');
      }
      if (encoderError) throw encoderError;

      const t = frameIdx / fps;
      const active =
        sceneBounds.find((b) => t >= b.start && t < b.end) ||
        sceneBounds[sceneBounds.length - 1];
      const sceneProgress =
        (t - active.start) / Math.max(0.1, active.end - active.start);

      renderSceneFrame(
        ctx,
        width,
        height,
        active.scene,
        active.index,
        project.scenes.length,
        sceneProgress,
        imageMap
      );

      const timestampUs = frameIdx * frameDurationUs;
      const videoFrame = new VideoFrame(canvas, {
        timestamp: timestampUs,
        duration: frameDurationUs,
      });
      const isKeyFrame = frameIdx % (fps * 2) === 0;
      videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
      videoFrame.close();

      // Backpressure control & UI yield every 10 frames
      if (videoEncoder.encodeQueueSize > 12 || frameIdx % 10 === 0) {
        const pct = Math.min(96, Math.round(8 + (frameIdx / totalFrames) * 88));
        onProgress(
          pct,
          `Merender MP4 (${Math.round(t)}d / ${Math.round(totalDuration)}d)...`
        );
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    onProgress(97, 'Menyelesaikan file MP4...');
    await videoEncoder.flush();
    await audioEncoder.flush();
    videoEncoder.close();
    audioEncoder.close();

    muxer.finalize();
    const mp4Buffer = muxer.target.buffer;
    const blob = new Blob([mp4Buffer], { type: 'video/mp4' });
    triggerDownload(blob, `${slug}.mp4`);
    onProgress(100, 'Unduhan MP4 selesai.');
    return true;
  } catch (err) {
    if (err instanceof Error && err.message === 'Ekspor dibatalkan.') {
      throw err;
    }
    console.warn('WebCodecs MP4 failed, attempting fallback:', err);
    return false;
  }
}

async function exportWithMediaRecorder(params: {
  project: GeneratedProject;
  imageMap: Map<number, HTMLImageElement>;
  includeMusic: boolean;
  mimeType: string;
  filename: string;
  onProgress: (percent: number, statusText: string) => void;
  abortSignal?: AbortSignal;
}) {
  const { project, imageMap, includeMusic, mimeType, filename, onProgress, abortSignal } =
    params;

  const { width, height } = getDimensionsForRatio(project.aspectRatio, 'hd');
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Kanvas tidak tersedia.');

  onProgress(3, 'Menyiapkan trek audio...');
  const mixedAudio = await renderMixedAudioTrack(project, includeMusic, 48000);

  const audioCtx = new AudioContext({ sampleRate: 48000 });
  const audioDest = audioCtx.createMediaStreamDestination();
  const audioSrc = audioCtx.createBufferSource();
  audioSrc.buffer = mixedAudio;
  audioSrc.connect(audioDest);

  const canvasStream = canvas.captureStream(30);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioDest.stream.getAudioTracks(),
  ]);

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 3_500_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const totalDuration = project.scenes.reduce((s, sc) => s + sc.durationSeconds, 0);
  const sceneBounds: Array<{ start: number; end: number; scene: SceneItem; index: number }> =
    [];
  let cursor = 0;
  project.scenes.forEach((sc, idx) => {
    sceneBounds.push({
      start: cursor,
      end: cursor + sc.durationSeconds,
      scene: sc,
      index: idx,
    });
    cursor += sc.durationSeconds;
  });

  await new Promise<void>((resolve, reject) => {
    let rafId = 0;
    const startTime = performance.now();

    const cleanup = () => {
      cancelAnimationFrame(rafId);
      audioCtx.close().catch(() => {});
    };

    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        if (recorder.state !== 'inactive') recorder.stop();
        cleanup();
        reject(new Error('Ekspor dibatalkan.'));
      });
    }

    recorder.onstop = () => {
      cleanup();
      const blob = new Blob(chunks, { type: mimeType });
      triggerDownload(blob, filename);
      onProgress(100, 'Unduhan video selesai.');
      resolve();
    };

    recorder.onerror = () => {
      cleanup();
      reject(new Error('Terjadi kesalahan saat merekam video.'));
    };

    recorder.start(250);
    audioSrc.start(0);

    const tick = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed >= totalDuration) {
        renderSceneFrame(
          ctx,
          width,
          height,
          sceneBounds[sceneBounds.length - 1].scene,
          sceneBounds.length - 1,
          project.scenes.length,
          1,
          imageMap
        );
        if (recorder.state !== 'inactive') recorder.stop();
        return;
      }

      const active =
        sceneBounds.find((b) => elapsed >= b.start && elapsed < b.end) ||
        sceneBounds[sceneBounds.length - 1];
      const sceneProgress =
        (elapsed - active.start) / Math.max(0.1, active.end - active.start);

      renderSceneFrame(
        ctx,
        width,
        height,
        active.scene,
        active.index,
        project.scenes.length,
        sceneProgress,
        imageMap
      );

      const pct = Math.min(98, Math.round(5 + (elapsed / totalDuration) * 93));
      onProgress(
        pct,
        `Merekam real-time (${Math.floor(elapsed)}d / ${Math.round(totalDuration)}d)...`
      );
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
  });
}
