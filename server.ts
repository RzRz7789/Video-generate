import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '30mb' }));

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY belum terkonfigurasi. Silakan periksa panel Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
    httpOptions: {
      apiVersion: 'v1beta',
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('502') ||
    msg.includes('504') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT')
  );
}

function isQuotaError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err || '');
  return raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED') || raw.includes('Quota exceeded');
}

function formatApiError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err || '');
  if (isQuotaError(err)) {
    if (raw.includes('flash-lite-tts') || raw.includes('limit: 10')) {
      return 'Kuota gratis Voiceover AI (10 permintaan/hari pada Free Tier) telah tercapai untuk hari ini. Anda tetap bisa menyunting teks, mengunggah audio narasi sendiri (.mp3/.wav), dan mengekspor video MP4 dengan musik latar secara gratis.';
    }
    return 'Batas kuota gratis API Gemini sementara tercapai. Silakan tunggu sekitar 1 menit lalu coba lagi, atau sunting adegan & ekspor MP4 langsung dari editor.';
  }
  if (raw.includes('503') || raw.includes('UNAVAILABLE')) {
    return 'Server AI sedang padat sementara waktu. Silakan coba klik ulang beberapa detik lagi.';
  }
  if (raw.includes('403') || raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID')) {
    return 'API key tidak valid atau tidak memiliki izin. Silakan periksa Settings > Secrets.';
  }
  return raw || fallback;
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries && isTransientError(err)) {
        const delayMs = 900 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        throw err;
      }
    }
  }
  throw lastError;
}

function normalizeSceneDurations(
  scenes: Array<{
    durationSeconds: number;
    [key: string]: unknown;
  }>,
  targetDuration: number
) {
  if (!scenes.length) return scenes;

  const clamped = scenes.map((s) => ({
    ...s,
    durationSeconds: Math.max(3, Math.min(25, Math.round(Number(s.durationSeconds) || 6))),
  }));

  let currentTotal = clamped.reduce((sum, s) => sum + s.durationSeconds, 0);
  let diff = targetDuration - currentTotal;

  // Adjust scenes evenly to match targetDuration accurately
  let idx = 0;
  let guard = 0;
  while (diff !== 0 && guard < 200) {
    const scene = clamped[idx % clamped.length];
    if (diff > 0 && scene.durationSeconds < 25) {
      scene.durationSeconds += 1;
      diff -= 1;
    } else if (diff < 0 && scene.durationSeconds > 3) {
      scene.durationSeconds -= 1;
      diff += 1;
    }
    idx += 1;
    guard += 1;
  }

  return clamped;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.post('/api/generate-content', async (req, res) => {
  try {
    const {
      inputText = '',
      photos = [],
      durationSeconds = 60,
      aspectRatio = '9:16',
      platform = 'Instagram Reels',
      tone = 'Editorial Mewah',
      language = 'id',
    } = req.body ?? {};

    const cleanText = String(inputText).trim();
    const safePhotos = Array.isArray(photos) ? photos.slice(0, 8) : [];

    if (!cleanText && safePhotos.length === 0) {
      return res.status(400).json({
        error: 'Masukkan teks ide/naskah atau unggah minimal satu foto untuk memulai.',
      });
    }

    const clampedDuration = Math.max(15, Math.min(300, Number(durationSeconds) || 60));
    const recommendedScenes =
      clampedDuration <= 30
        ? 5
        : clampedDuration <= 60
          ? 7
          : clampedDuration <= 90
            ? 9
            : clampedDuration <= 120
              ? 11
              : 14;

    const ai = getGeminiClient();

    const parts: Array<
      | { text: string }
      | { inlineData: { mimeType: string; data: string } }
    > = [];

    safePhotos.forEach((photo: { mimeType?: string; base64Data?: string }, index: number) => {
      if (photo?.base64Data && photo?.mimeType) {
        parts.push({
          inlineData: {
            mimeType: photo.mimeType,
            data: photo.base64Data,
          },
        });
        parts.push({
          text: `[Foto #${index}] Gunakan indeks ${index} pada photoIndex jika adegan menampilkan foto ini.`,
        });
      }
    });

    const langInstruction =
      language === 'en'
        ? 'Write all headlines, subtitles, narration, hooks, caption, and hashtags in crisp, natural English.'
        : 'Tulis semua headline, subtitle, narasi voiceover, hook, caption, dan hashtag dalam Bahasa Indonesia yang natural, persuasif, dan profesional (hindari kata kaku seperti terjemahan mesin).';

    const photoInstruction =
      safePhotos.length > 0
        ? `Tersedia ${safePhotos.length} foto terlampir (indeks 0 sampai ${safePhotos.length - 1}). Analisis detail visual tiap foto (subjek, warna, suasana, produk) dan distribusikan photoIndex secara cerdas ke seluruh adegan agar selaras dengan narasi. Setiap adegan WAJIB memakai photoIndex antara 0 hingga ${safePhotos.length - 1}.`
        : 'Tidak ada foto yang diunggah (Mode Teks Saja). Setel photoIndex = -1 untuk semua adegan, dan rancang palet bgColor (warna latar gelap/terang editorial elegan, kontras tinggi) serta accentColor yang kohesif dan bervariasi halus antar adegan agar video tipografi kinetik tampak seperti produksi agensi kreatif.';

    const prompt = `Kamu adalah Direktur Kreatif & Produser Konten Media Sosial senior.
Tugasmu mengubah materi input pengguna menjadi rancangan konten video/slide media sosial yang menarik, terstruktur, dan siap produksi.

SPESIFIKASI PROYEK:
- Target Platform: ${platform}
- Rasio Aspek: ${aspectRatio}
- Target Durasi Total: TEPAT ${clampedDuration} detik (jumlah seluruh durationSeconds adegan HARUS sama dengan ${clampedDuration})
- Jumlah Adegan Disarankan: ${recommendedScenes} adegan (minimal 4, maksimal 16 adegan; durasi tiap adegan 4–15 detik)
- Gaya & Nada: ${tone}
- Bahasa Output: ${langInstruction}

ARAHAN VISUAL:
${photoInstruction}

TEKS / BRIEF PENGGUNA:
${cleanText || 'Buat konten storytelling visual profesional berdasarkan foto-foto yang dilampirkan.'}

ATURAN KUALITAS KONTEN:
1. Adegan 1 (Hook, 3–5 detik): Harus langsung memancing rasa ingin tahu di 3 detik pertama.
2. Adegan Tengah (Konteks, Isi Utama, Sorotan): Bangun ritme cerita yang logis, padat nilai, dan memanjakan mata.
3. Adegan Terakhir (Penutup CTA): Ajakan bertindak yang relevan (save, share, komentar, atau kunjungi tautan) tanpa terkesan memaksa.
4. Panjang teks di layar:
   - headline: 3–8 kata kuat (mudah terbaca cepat di layar ponsel).
   - subtitle: 6–15 kata pendukung yang memperjelas nilai adegan.
   - narration: Kalimat voiceover alami dengan tempo bicara ~2.2 kata per detik sesuai durationSeconds adegan tersebut (misal 8 detik ≈ 16–20 kata).
5. Variasikan layoutStyle ('cinematic-bottom', 'editorial-center', 'split-caption', 'bold-quote', 'minimal-corner') dan motionEffect ('zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'static-editorial') agar video terasa dinamis.`;

    parts.push({ text: prompt });

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              conceptSummary: { type: Type.STRING },
              musicMood: {
                type: Type.STRING,
                enum: ['ambient-warm', 'lofi-pulse', 'editorial-piano', 'minimal-synth'],
              },
              hookOptions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              caption: { type: Type.STRING },
              hashtags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              scenes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    order: { type: Type.INTEGER },
                    durationSeconds: { type: Type.INTEGER },
                    role: {
                      type: Type.STRING,
                      enum: ['Hook', 'Konteks', 'Isi Utama', 'Sorotan', 'Penutup CTA'],
                    },
                    headline: { type: Type.STRING },
                    subtitle: { type: Type.STRING },
                    narration: { type: Type.STRING },
                    photoIndex: { type: Type.INTEGER },
                    motionEffect: {
                      type: Type.STRING,
                      enum: [
                        'zoom-in',
                        'zoom-out',
                        'pan-left',
                        'pan-right',
                        'static-editorial',
                      ],
                    },
                    layoutStyle: {
                      type: Type.STRING,
                      enum: [
                        'cinematic-bottom',
                        'editorial-center',
                        'split-caption',
                        'bold-quote',
                        'minimal-corner',
                      ],
                    },
                    bgColor: { type: Type.STRING },
                    accentColor: { type: Type.STRING },
                    visualNote: { type: Type.STRING },
                  },
                  required: [
                    'order',
                    'durationSeconds',
                    'role',
                    'headline',
                    'subtitle',
                    'narration',
                    'photoIndex',
                    'motionEffect',
                    'layoutStyle',
                    'bgColor',
                    'accentColor',
                    'visualNote',
                  ],
                },
              },
            },
            required: [
              'title',
              'conceptSummary',
              'musicMood',
              'hookOptions',
              'caption',
              'hashtags',
              'scenes',
            ],
          },
        },
      })
    );

    const rawJson = (response.text ?? '{}').trim();
    const parsed = JSON.parse(rawJson);

    const normalizedScenes = normalizeSceneDurations(
      Array.isArray(parsed.scenes) ? parsed.scenes : [],
      clampedDuration
    ).map((s: Record<string, unknown>, idx: number) => ({
      ...s,
      id: `scene-${Date.now()}-${idx + 1}`,
      order: idx + 1,
      photoIndex:
        safePhotos.length > 0
          ? Math.max(0, Math.min(safePhotos.length - 1, Number(s.photoIndex) || 0))
          : -1,
    }));

    return res.json({
      ...parsed,
      scenes: normalizedScenes,
    });
  } catch (error: unknown) {
    console.error('Error generating content:', error);
    const status = isQuotaError(error) ? 429 : 500;
    return res.status(status).json({
      error: formatApiError(error, 'Gagal menghasilkan konten dari AI. Silakan coba lagi.'),
    });
  }
});

app.post('/api/generate-voiceover', async (req, res) => {
  try {
    const {
      scenes = [],
      voiceName = 'Kore',
      toneStyle = 'Natural, engaging Indonesian content creator with clear pacing',
      mode,
    } = req.body ?? {};

    if (!Array.isArray(scenes) || scenes.length === 0) {
      return res.status(400).json({ error: 'Tidak ada adegan untuk dibuatkan voiceover.' });
    }

    const ai = getGeminiClient();
    const validVoices = new Set(['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr']);
    const chosenVoice = validVoices.has(voiceName) ? voiceName : 'Kore';
    const effectiveMode = mode === 'single' || scenes.length === 1 ? 'single' : 'combined';

    if (effectiveMode === 'combined') {
      const combinedText = scenes
        .map((s: { narration?: string }) => String(s.narration || '').trim())
        .filter(Boolean)
        .join(' ... ');

      if (!combinedText) {
        return res.status(400).json({ error: 'Naskah narasi masih kosong.' });
      }

      // Single TTS request for the entire script to conserve Free Tier daily quota
      const ttsResponse = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: combinedText,
                  speechMetadata: {
                    style: String(toneStyle),
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: chosenVoice },
              },
            },
          },
        })
      );

      const fullAudioBase64 =
        ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? '';

      return res.json({
        mode: 'combined',
        fullAudioBase64,
        mimeType: 'audio/wav',
        audioClips: [],
      });
    }

    // Single-scene voiceover
    const target = scenes[0] as { id: string; narration: string };
    const text = String(target.narration || '').trim();
    if (!text) {
      return res.json({
        mode: 'single',
        audioClips: [{ sceneId: target.id, audioBase64: '', mimeType: 'audio/wav' }],
      });
    }

    const ttsResponse = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text,
                speechMetadata: {
                  style: String(toneStyle),
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: chosenVoice },
            },
          },
        },
      })
    );

    const base64Audio =
      ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? '';

    return res.json({
      mode: 'single',
      audioClips: [
        {
          sceneId: target.id,
          audioBase64: base64Audio,
          mimeType: 'audio/wav',
        },
      ],
    });
  } catch (error: unknown) {
    console.error('Error generating voiceover:', error);
    const status = isQuotaError(error) ? 429 : 500;
    return res.status(status).json({
      error: formatApiError(
        error,
        'Gagal menghasilkan voiceover AI. Periksa pengaturan API key atau coba lagi.'
      ),
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Reka Studio server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
