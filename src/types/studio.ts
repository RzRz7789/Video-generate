export type AspectRatio = '9:16' | '4:5' | '1:1' | '16:9';

export type SocialPlatform =
  | 'Instagram Reels'
  | 'TikTok'
  | 'YouTube Shorts'
  | 'LinkedIn Video'
  | 'Instagram Carousel';

export type ContentTone =
  | 'Editorial Mewah'
  | 'Enerjik & Viral'
  | 'Edukatif Profesional'
  | 'Storytelling Hangat'
  | 'Minimalis Modern';

export type VoiceCharacter = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export type MotionEffect =
  | 'zoom-in'
  | 'zoom-out'
  | 'pan-left'
  | 'pan-right'
  | 'static-editorial';

export type LayoutStyle =
  | 'cinematic-bottom'
  | 'editorial-center'
  | 'split-caption'
  | 'bold-quote'
  | 'minimal-corner';

export type MusicMood =
  | 'ambient-warm'
  | 'lofi-pulse'
  | 'editorial-piano'
  | 'minimal-synth';

export type SceneRole =
  | 'Hook'
  | 'Konteks'
  | 'Isi Utama'
  | 'Sorotan'
  | 'Penutup CTA';

export interface UploadedPhoto {
  id: string;
  name: string;
  previewUrl: string;
  mimeType: string;
  base64Data: string;
}

export interface SceneItem {
  id: string;
  order: number;
  durationSeconds: number;
  role: SceneRole;
  headline: string;
  subtitle: string;
  narration: string;
  photoIndex: number;
  motionEffect: MotionEffect;
  layoutStyle: LayoutStyle;
  bgColor: string;
  accentColor: string;
  visualNote: string;
  audioBase64?: string;
  audioMimeType?: string;
  audioDurationSeconds?: number;
}

export interface GeneratedProject {
  id: string;
  title: string;
  conceptSummary: string;
  platform: SocialPlatform;
  aspectRatio: AspectRatio;
  tone: ContentTone;
  language: 'id' | 'en';
  musicMood: MusicMood;
  voiceCharacter: VoiceCharacter;
  hookOptions: string[];
  caption: string;
  hashtags: string[];
  scenes: SceneItem[];
  photos: UploadedPhoto[];
  fullVoiceoverBase64?: string;
  fullVoiceoverMimeType?: string;
  createdAt: string;
}

export interface PresetTemplate {
  id: string;
  title: string;
  category: string;
  durationLabel: string;
  aspectRatio: AspectRatio;
  platform: SocialPlatform;
  tone: ContentTone;
  coverImage: string;
  inputText: string;
  durationSeconds: number;
  project: Omit<GeneratedProject, 'id' | 'createdAt'>;
}
