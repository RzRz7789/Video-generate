import type { MusicMood } from '../types/studio';

export class AmbientMusicEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private intervalId: number | null = null;
  private step = 0;

  private getChordProgression(mood: MusicMood): number[][] {
    switch (mood) {
      case 'lofi-pulse':
        // Warm jazzy minor 7ths
        return [
          [220.0, 261.63, 329.63, 392.0],
          [174.61, 220.0, 261.63, 329.63],
          [196.0, 246.94, 293.66, 349.23],
          [164.81, 196.0, 246.94, 293.66],
        ];
      case 'editorial-piano':
        // Clean modern neoclassical
        return [
          [261.63, 329.63, 392.0],
          [220.0, 261.63, 329.63],
          [174.61, 220.0, 261.63],
          [196.0, 246.94, 293.66],
        ];
      case 'minimal-synth':
        // Crisp modern fifths
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

  public start(
    mood: MusicMood,
    externalCtx?: AudioContext,
    destinationNode?: AudioNode,
    volume = 0.08
  ) {
    this.stop();

    const ctx = externalCtx ?? new AudioContext();
    this.ctx = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume, ctx.currentTime);
    if (destinationNode) {
      masterGain.connect(destinationNode);
    } else {
      masterGain.connect(ctx.destination);
    }
    this.masterGain = masterGain;

    const chords = this.getChordProgression(mood);
    this.step = 0;

    const triggerChord = () => {
      if (!this.ctx || !this.masterGain) return;
      const now = this.ctx.currentTime;
      const chord = chords[this.step % chords.length];
      this.step += 1;

      chord.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = mood === 'minimal-synth' ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(950, now);

        noteGain.gain.setValueAtTime(0.0001, now);
        noteGain.gain.exponentialRampToValueAtTime(0.18 / chord.length, now + 0.35);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(this.masterGain);

        osc.start(now + idx * 0.04);
        osc.stop(now + 2.3);
      });
    };

    triggerChord();
    this.intervalId = window.setInterval(triggerChord, 2000);
  }

  public setMuted(muted: boolean, volume = 0.08) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : volume, this.ctx.currentTime, 0.05);
    }
  }

  public stop(keepExternalContext = false) {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {
        // ignore
      }
      this.masterGain = null;
    }
    if (this.ctx && !keepExternalContext) {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
  }
}
