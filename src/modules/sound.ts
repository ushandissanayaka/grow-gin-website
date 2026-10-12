import { $, storage } from './utils';

/**
 * Background music.
 *
 * Browsers (iOS Safari especially) only allow audio to start inside a user
 * gesture, so playback begins on the age-gate "Yes" tap, or — for returning
 * visitors — on their first tap/click/key press. Everything is routed through
 * a Web Audio gain node so fades also work on iOS, where `audio.volume` is
 * read-only.
 *
 * Two built-in tracks, both synthesised live (0 KB download, no licensing):
 * Bach's Prelude in C (default) and a calm generative lounge pad. To use a real track instead, put an mp3 in /public/audio/
 * and set `data-src="/audio/your-track.mp3"` on #soundToggle.
 */

const KEY = 'grow-sound';
const VOLUME = 0.9;

type Source = { start(ctx: AudioContext, out: AudioNode): void; stop(): void };

/* ---------------- generative ambient lounge ---------------- */
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

// Calm, slow progression: Cmaj9 · Am(add9) · Fmaj9 · Gsus(add6)
// `bass` is the root (kept above ~100 Hz so phone speakers can play it).
const CHORDS = [
  { bass: 48, notes: [55, 59, 62, 64] },
  { bass: 45, notes: [52, 57, 59, 60] },
  { bass: 41, notes: [53, 57, 60, 64] },
  { bass: 43, notes: [55, 60, 62, 64] },
];
// C major pentatonic — every bell note fits every chord, nothing clashes
const BELLS = [72, 74, 76, 79, 81, 84];
const BAR = 12; // seconds per chord — slow and unhurried

function makeImpulse(ctx: AudioContext, seconds = 5, decay = 3) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function generativeSource(): Source {
  let timer = 0;
  let nextBar = 0;
  let bar = 0;
  let nextBell = 0;
  let lastBell = -1;
  const live = new Set<AudioScheduledSourceNode>();

  const track = <T extends AudioScheduledSourceNode>(node: T): T => {
    live.add(node);
    node.onended = () => live.delete(node);
    return node;
  };

  return {
    start(ctx, out) {
      // long, soft hall reverb
      const reverb = ctx.createConvolver();
      reverb.buffer = makeImpulse(ctx);
      const wet = ctx.createGain();
      wet.gain.value = 0.7;
      reverb.connect(wet).connect(out);

      // dark, warm tone with a very slow "breathing" sweep
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 750;
      filter.Q.value = 0.5;
      const lfo = track(ctx.createOscillator());
      const lfoDepth = ctx.createGain();
      lfo.frequency.value = 0.03;
      lfoDepth.gain.value = 250;
      lfo.connect(lfoDepth).connect(filter.frequency);
      lfo.start();
      filter.connect(out);
      filter.connect(reverb);

      // pad voice: sine + triangle, slow swell in and out
      const pad = (freq: number, t: number, len: number, level: number) => {
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(level, t + 4);
        env.gain.setValueAtTime(level, t + len - 1);
        env.gain.linearRampToValueAtTime(0, t + len + 5);
        env.connect(filter);
        (['sine', 'triangle'] as OscillatorType[]).forEach((type, i) => {
          const o = track(ctx.createOscillator());
          o.type = type;
          o.frequency.value = freq;
          o.detune.value = i ? 5 : -5;
          o.connect(env);
          o.start(t);
          o.stop(t + len + 5.1);
        });
      };

      const bass = (freq: number, t: number, len: number) => {
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.09, t + 3);
        env.gain.setValueAtTime(0.09, t + len - 1);
        env.gain.linearRampToValueAtTime(0, t + len + 3);
        env.connect(filter);
        const o = track(ctx.createOscillator());
        o.type = 'sine';
        o.frequency.value = freq;
        o.connect(env);
        o.start(t);
        o.stop(t + len + 3.1);
      };

      // gentle bell, mostly heard through the reverb
      const bell = (freq: number, t: number) => {
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.028, t + 0.08);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 4.5);
        const dry = ctx.createGain();
        dry.gain.value = 0.4;
        env.connect(reverb);
        env.connect(dry).connect(out);
        const o = track(ctx.createOscillator());
        o.type = 'sine';
        o.frequency.value = freq;
        const o2 = track(ctx.createOscillator());
        o2.type = 'sine';
        o2.frequency.value = freq * 2;
        const g2 = ctx.createGain();
        g2.gain.value = 0.12;
        o.connect(env);
        o2.connect(g2).connect(env);
        [o, o2].forEach((n) => { n.start(t); n.stop(t + 4.6); });
      };

      nextBar = ctx.currentTime + 0.1;
      nextBell = nextBar + 5;

      // look-ahead scheduler
      const schedule = () => {
        const horizon = ctx.currentTime + 1.5;
        while (nextBar < horizon) {
          const chord = CHORDS[bar % CHORDS.length];
          chord.notes.forEach((n) => pad(midi(n), nextBar, BAR, 0.03));
          bass(midi(chord.bass), nextBar, BAR);
          nextBar += BAR;
          bar++;
        }
        while (nextBell < horizon) {
          // small melodic steps instead of random jumps
          const step = lastBell < 0 ? 2 : lastBell + (Math.random() < 0.5 ? -1 : 1);
          lastBell = Math.max(0, Math.min(BELLS.length - 1, step));
          bell(midi(BELLS[lastBell]), nextBell);
          nextBell += 3.5 + Math.random() * 4.5;
        }
      };
      schedule();
      timer = window.setInterval(schedule, 400);
    },
    stop() {
      clearInterval(timer);
      live.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } });
      live.clear();
    },
  };
}

/* ---------------- classical: J.S. Bach, Prelude in C major, BWV 846 ----------------
 * Public-domain composition (1722), performed live by a small piano-like
 * additive synth — no recording, no licence needed. Bars 1–19 loop seamlessly
 * (bar 19 resolves back to C major, exactly where bar 1 starts).
 * Each bar = the 5 notes below played as: 1 2 3 4 5 3 4 5, twice.
 */
const PRELUDE = [
  [60, 64, 67, 72, 76], [60, 62, 69, 74, 77], [59, 62, 67, 74, 77], [60, 64, 67, 72, 76],
  [60, 64, 69, 76, 81], [60, 62, 66, 69, 74], [59, 62, 67, 74, 79], [59, 60, 64, 67, 72],
  [57, 60, 64, 67, 72], [50, 57, 62, 66, 72], [55, 59, 62, 67, 71], [55, 58, 64, 67, 73],
  [53, 57, 62, 69, 74], [53, 56, 62, 65, 71], [52, 55, 60, 67, 72], [52, 53, 57, 60, 65],
  [50, 53, 57, 60, 65], [43, 50, 55, 59, 65], [48, 52, 55, 60, 64],
];
const FIGURE = [0, 1, 2, 3, 4, 2, 3, 4];
const SIXTEENTH = 0.28; // ≈ 54 bpm — slow and calm

function classicalSource(): Source {
  let timer = 0;
  let nextTime = 0;
  let bar = 0;
  const live = new Set<AudioScheduledSourceNode>();

  return {
    start(ctx, out) {
      const reverb = ctx.createConvolver();
      reverb.buffer = makeImpulse(ctx, 3.6, 2.8);
      const wet = ctx.createGain();
      wet.gain.value = 0.45;
      reverb.connect(wet).connect(out);

      const tone = ctx.createBiquadFilter(); // soften the synth's edge
      tone.type = 'lowpass';
      tone.frequency.value = 2400;
      tone.connect(out);
      tone.connect(reverb);

      // piano-ish voice: a few harmonics, fast attack, natural decay
      const piano = (note: number, t: number, hold: number, vel: number) => {
        const f = midi(note);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(vel, t + 0.006);
        env.gain.setTargetAtTime(vel * 0.3, t + 0.01, 0.5);
        env.gain.setTargetAtTime(0, t + hold, 0.3);
        env.connect(tone);
        [[1, 1], [2, 0.32], [3, 0.1], [4, 0.04]].forEach(([n, amp]) => {
          const o = ctx.createOscillator();
          o.frequency.value = f * n * (1 + 0.0003 * n * n); // slight string inharmonicity
          const g = ctx.createGain();
          g.gain.value = amp;
          o.connect(g).connect(env);
          o.start(t);
          o.stop(t + hold + 1.6);
          live.add(o);
          o.onended = () => live.delete(o);
        });
      };

      nextTime = ctx.currentTime + 0.15;
      const schedule = () => {
        const horizon = ctx.currentTime + 1.5;
        while (nextTime < horizon) {
          const notes = PRELUDE[bar % PRELUDE.length];
          for (let half = 0; half < 2; half++) {
            FIGURE.forEach((idx, i) => {
              const t = nextTime + (half * 8 + i) * SIXTEENTH;
              const human = 0.9 + Math.random() * 0.2;
              if (i === 0) piano(notes[0], t, 8 * SIXTEENTH, 0.13 * human); // held bass
              else if (i === 1) piano(notes[1], t, 7 * SIXTEENTH, 0.1 * human); // held tenor
              else piano(notes[idx], t, 1.1, (i === 2 ? 0.085 : 0.072) * human);
            });
          }
          nextTime += 16 * SIXTEENTH;
          bar++;
          if (bar % PRELUDE.length === 0) nextTime += 2.5; // breathe before the loop
        }
      };
      schedule();
      timer = window.setInterval(schedule, 400);
    },
    stop() {
      clearInterval(timer);
      live.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } });
      live.clear();
    },
  };
}

/* ---------------- file source (optional) ---------------- */
function fileSource(src: string): Source {
  const audio = new Audio(src);
  audio.loop = true;
  audio.preload = 'auto';
  audio.crossOrigin = 'anonymous';
  let node: MediaElementAudioSourceNode | null = null;
  return {
    start(ctx, out) {
      node ??= ctx.createMediaElementSource(audio);
      node.connect(out);
      audio.play().catch(() => { /* blocked or missing file */ });
    },
    stop() {
      audio.pause();
    },
  };
}

/* ---------------- controller ---------------- */
const TRACK_KEY = 'grow-track';
const TRACKS = {
  classical: { label: 'Bach', title: 'J.S. Bach — Prelude in C', make: classicalSource },
  lounge: { label: 'Lounge', title: 'Calm lounge ambience', make: generativeSource },
} as const;
type TrackId = keyof typeof TRACKS;

export function initSound() {
  const btn = $<HTMLButtonElement>('#soundToggle');
  const trackBtn = $<HTMLButtonElement>('#trackToggle');
  if (!btn) return { unlock() {}, armFirstInteraction() {} };

  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let current: { source: Source; gain: GainNode } | null = null;
  let playing = false;
  let stopTimer = 0;
  let track: TrackId = storage.get(TRACK_KEY) === 'lounge' ? 'lounge' : 'classical';

  const render = () => {
    btn.classList.toggle('is-playing', playing);
    btn.setAttribute('aria-pressed', String(playing));
    btn.setAttribute('aria-label', playing ? 'Mute music' : 'Play music');
    if (trackBtn) {
      const next = track === 'classical' ? 'lounge' : 'classical';
      trackBtn.querySelector('.track__name')!.textContent = TRACKS[track].label;
      trackBtn.title = `${TRACKS[track].title} — switch to ${TRACKS[next].label}`;
      trackBtn.setAttribute('aria-label', `Now playing ${TRACKS[track].title}. Switch to ${TRACKS[next].label}`);
    }
  };

  const ramp = (param: AudioParam, to: number, secs: number) => {
    const now = ctx!.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(to, now + secs);
  };

  /** Starts the selected track on its own gain so tracks can crossfade. */
  const startTrack = () => {
    const gain = ctx!.createGain();
    gain.gain.value = 0;
    gain.connect(master!);
    const source = btn.dataset.src ? fileSource(btn.dataset.src) : TRACKS[track].make();
    source.start(ctx!, gain);
    ramp(gain.gain, 1, 1.8);
    current = { source, gain };
  };

  const retire = (old: { source: Source; gain: GainNode }, secs: number) => {
    ramp(old.gain.gain, 0, secs);
    setTimeout(() => { old.source.stop(); old.gain.disconnect(); }, secs * 1000 + 100);
  };

  const play = async () => {
    clearTimeout(stopTimer);
    if (!ctx) {
      // let iOS play Web Audio even with the ring/silent switch on
      const nav = navigator as Navigator & { audioSession?: { type: string } };
      if (nav.audioSession) nav.audioSession.type = 'playback';
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
    }
    await ctx.resume();
    if (!current) startTrack();
    ramp(master!.gain, VOLUME, 2.5);
    playing = true;
    render();
  };

  const pause = (remember = true) => {
    if (!ctx || !master || !playing) return;
    ramp(master.gain, 0, 0.8);
    playing = false;
    render();
    if (remember) storage.set(KEY, 'off');
    stopTimer = window.setTimeout(() => {
      current?.source.stop();
      current?.gain.disconnect();
      current = null;
      ctx?.suspend();
    }, 900);
  };

  btn.addEventListener('click', () => {
    if (playing) pause();
    else {
      storage.set(KEY, 'on');
      play();
    }
  });

  trackBtn?.addEventListener('click', () => {
    track = track === 'classical' ? 'lounge' : 'classical';
    storage.set(TRACK_KEY, track);
    render();
    if (playing && current) {
      retire(current, 1.5); // crossfade old → new
      startTrack();
    } else {
      storage.set(KEY, 'on');
      play();
    }
  });

  // pause when the tab is hidden / phone locked, resume when back
  let resumeOnShow = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      resumeOnShow = playing;
      pause(false);
    } else if (resumeOnShow) {
      play();
    }
  });

  render();

  return {
    /** Call from inside a user gesture (age-gate "Yes"). */
    unlock() {
      if (storage.get(KEY) !== 'off') play();
    },
    /** Returning visitors: start on their first interaction. */
    armFirstInteraction() {
      if (storage.get(KEY) === 'off') return;
      const events = ['pointerup', 'keydown'] as const;
      const once = (e: Event) => {
        if ((e.target as HTMLElement).closest?.('.sound-dock')) return cleanup();
        cleanup();
        if (!playing) play();
      };
      const cleanup = () => events.forEach((t) => window.removeEventListener(t, once, true));
      events.forEach((t) => window.addEventListener(t, once, true));
    },
  };
}
