/**
 * The cafe's sound, made in the browser with the Web Audio API: no audio files.
 * Off until the founder turns it on (browsers only allow sound after a tap anyway).
 */
export class CafeSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private rain: GainNode | null = null;
  private noise: AudioBuffer | null = null;

  get on() {
    return !!this.ctx && this.ctx.state === "running";
  }

  start(raining: boolean) {
    if (!this.ctx) this.build();
    void this.ctx!.resume();
    this.master!.gain.setTargetAtTime(0.9, this.ctx!.currentTime, 0.4);
    this.setRain(raining);
  }

  stop() {
    if (!this.ctx) return;
    this.master!.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    window.setTimeout(() => void this.ctx?.suspend(), 600);
  }

  setRain(on: boolean) {
    if (this.ctx && this.rain) this.rain.gain.setTargetAtTime(on ? 0.12 : 0, this.ctx.currentTime, 0.8);
  }

  private build() {
    const ctx = new AudioContext();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.master = master;

    // Two seconds of white noise, reused by every texture below.
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;

    // Room tone: deep, soft rumble.
    this.loop(400, "lowpass", 0.05, 0.7);
    // Murmur of conversation: voice-band noise that swells and fades.
    const murmur = this.loop(520, "bandpass", 0.035, 1.6);
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.23;
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain).connect(murmur.gain);
    lfo.start();
    // Rain, for Bengaluru evenings.
    this.rain = this.loop(1800, "highpass", 0, 0.6);
  }

  private loop(freq: number, type: BiquadFilterType, level: number, q: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = level;
    src.connect(f).connect(g).connect(this.master!);
    src.start();
    return g;
  }

  private tone(freq: number, at: number, dur: number, level: number, type: OscillatorType = "sine") {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(level, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(this.master!);
    o.start(at);
    o.stop(at + dur + 0.05);
  }

  /** The bell over the door. */
  chime() {
    if (!this.on) return;
    const t = this.ctx!.currentTime;
    this.tone(1318.5, t, 1.4, 0.12);
    this.tone(1760, t + 0.12, 1.6, 0.1);
    this.tone(2637, t + 0.12, 0.8, 0.03);
  }

  /** A cup set down on a saucer. */
  clink() {
    if (!this.on) return;
    const t = this.ctx!.currentTime;
    this.tone(2400 + Math.random() * 600, t, 0.25, 0.05, "triangle");
  }

  /** The espresso machine's steam wand. */
  hiss() {
    if (!this.on) return;
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 3500;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.07, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    src.connect(f).connect(g).connect(this.master!);
    src.start(t);
    src.stop(t + 1.7);
  }

  /** Footsteps on the wooden floor. */
  step() {
    if (!this.on) return;
    const t = this.ctx!.currentTime;
    this.tone(90 + Math.random() * 30, t, 0.12, 0.08, "triangle");
  }
}
