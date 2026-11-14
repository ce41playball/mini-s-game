// Synthesized Web Audio API engine for French Patisserie SFX & gentle waltz BGM

const PENTATONIC_FREQS = [
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
  880.0,  // A5
  1046.5, // C6
  1174.66, // D6
  1318.51, // E6
  1567.98, // G6
];

// Gentle 3/4 French waltz arpeggio progression (Cmaj7 -> Am7 -> Fmaj7 -> G7)
const WALTZ_MEASURES: number[][] = [
  [261.63, 329.63, 392.0, 493.88, 392.0, 329.63], // Cmaj7
  [220.0, 261.63, 329.63, 392.0, 329.63, 261.63], // Am7
  [174.61, 220.0, 261.63, 329.63, 261.63, 220.0], // Fmaj7
  [196.0, 246.94, 293.66, 349.23, 293.66, 246.94], // G7
];

export class PatisserieAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private isMuted = false;
  private bgmInterval: number | null = null;
  private bgmStep = 0;
  private bgmActive = false;

  public unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.75;
      this.masterGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.2;
      this.bgmGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.75, this.ctx.currentTime, 0.04);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setBgmPlaying(playing: boolean): void {
    if (playing === this.bgmActive) return;
    this.bgmActive = playing;

    if (playing) {
      this.unlock();
      if (this.bgmInterval !== null) {
        window.clearInterval(this.bgmInterval);
      }
      // 160ms per eighth-note step -> cozy waltz tempo (~125 BPM in 3/4)
      this.bgmInterval = window.setInterval(() => {
        this.playWaltzStep();
      }, 210);
    } else {
      if (this.bgmInterval !== null) {
        window.clearInterval(this.bgmInterval);
        this.bgmInterval = null;
      }
    }
  }

  public dispose(): void {
    this.setBgmPlaying(false);
    if (this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close();
      this.ctx = null;
    }
  }

  private playWaltzStep(): void {
    if (!this.ctx || !this.bgmGain || this.isMuted || this.ctx.state !== 'running') {
      return;
    }

    const measureIndex = Math.floor(this.bgmStep / 6) % WALTZ_MEASURES.length;
    const noteIndex = this.bgmStep % 6;
    const freq = WALTZ_MEASURES[measureIndex][noteIndex];
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();

    osc.type = noteIndex === 0 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, now);

    const peak = noteIndex === 0 ? 0.24 : 0.14;
    noteGain.gain.setValueAtTime(0.0001, now);
    noteGain.gain.exponentialRampToValueAtTime(peak, now + 0.02);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);

    osc.connect(noteGain);
    noteGain.connect(this.bgmGain);
    osc.start(now);
    osc.stop(now + 0.38);

    this.bgmStep = (this.bgmStep + 1) % (WALTZ_MEASURES.length * 6);
  }

  public playRelease(): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.09);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playPlace(combo: number): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Soft spongy landing thud
    const thudOsc = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(155, now);
    thudOsc.frequency.exponentialRampToValueAtTime(68, now + 0.11);

    thudGain.gain.setValueAtTime(0.24, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    thudOsc.connect(thudGain);
    thudGain.connect(this.masterGain);
    thudOsc.start(now);
    thudOsc.stop(now + 0.13);

    // Ascending pentatonic chime for Perfect streaks
    if (combo > 0) {
      const freqIndex = Math.min(combo - 1, PENTATONIC_FREQS.length - 1);
      const chimeFreq = PENTATONIC_FREQS[freqIndex];

      const bell = this.ctx.createOscillator();
      const bellGain = this.ctx.createGain();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(chimeFreq, now);

      bellGain.gain.setValueAtTime(0.001, now);
      bellGain.gain.exponentialRampToValueAtTime(0.24, now + 0.015);
      bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

      bell.connect(bellGain);
      bellGain.connect(this.masterGain);
      bell.start(now);
      bell.stop(now + 0.36);

      // Subtle harmonic shimmer on 3+ combo
      if (combo >= 3) {
        const overtone = this.ctx.createOscillator();
        const overtoneGain = this.ctx.createGain();
        overtone.type = 'triangle';
        overtone.frequency.setValueAtTime(chimeFreq * 1.5, now + 0.03);

        overtoneGain.gain.setValueAtTime(0.001, now + 0.03);
        overtoneGain.gain.exponentialRampToValueAtTime(0.11, now + 0.05);
        overtoneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

        overtone.connect(overtoneGain);
        overtoneGain.connect(this.masterGain);
        overtone.start(now + 0.03);
        overtone.stop(now + 0.34);
      }
    }
  }

  public playSlice(): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Soft spongy landing thud
    const thud = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(140, now);
    thud.frequency.exponentialRampToValueAtTime(62, now + 0.1);
    thudGain.gain.setValueAtTime(0.2, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    thud.connect(thudGain);
    thudGain.connect(this.masterGain);
    thud.start(now);
    thud.stop(now + 0.12);

    // Crisp pastry slice swish
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.09);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.Q.value = 1.6;

    const sliceGain = this.ctx.createGain();
    sliceGain.gain.setValueAtTime(0.18, now);
    sliceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    noise.connect(filter);
    filter.connect(sliceGain);
    sliceGain.connect(this.masterGain);
    noise.start(now);
  }

  public playUnlock(): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const start = now + idx * 0.065;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.37);
    });
  }

  public playGameOver(): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [392.0, 349.23, 329.63, 261.63];

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const start = now + idx * 0.11;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.36);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.38);
    });
  }
}
