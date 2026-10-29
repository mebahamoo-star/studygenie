/**
 * Celebration Sounds & Audio Utility for StudyGenie
 *
 * Implements Web Audio API synthesizers for 5 distinct celebration sounds:
 * 1. "magic"   - Genie Wish Granted ✨ (Shimmering pentatonic sparkle)
 * 2. "fanfare" - Victory Fanfare 🎺 (Triumphant brass fanfare)
 * 3. "arcade"  - Retro Arcade 🪙 (8-bit level-up / coin jingle)
 * 4. "marimba" - Zen Marimba 🪵 (Warm, peaceful wooden bell chime)
 * 5. "chime"   - Classic Chime 🔔 (Harmonic ascending chords)
 *
 * Also supports HTML5 Audio (/sounds/point-earned.mp3) with seamless fallback.
 */

export type CelebrationSoundType = "magic" | "fanfare" | "arcade" | "marimba" | "chime";

export interface CelebrationSoundOption {
  id: CelebrationSoundType;
  label: string;
  ar: string;
  icon: string;
  description: string;
}

export const celebrationSounds: CelebrationSoundOption[] = [
  {
    id: "magic",
    label: "Genie Magic",
    ar: "سحر الجني ✨",
    icon: "✨",
    description: "Shimmering magical wish-granted sparkle",
  },
  {
    id: "fanfare",
    label: "Victory Fanfare",
    ar: "بوق النصر 🎺",
    icon: "🎺",
    description: "Triumphant multi-chord fanfare",
  },
  {
    id: "arcade",
    label: "Retro Arcade",
    ar: "ألعاب كلاسيكية 🪙",
    icon: "🪙",
    description: "Classic 8-bit level-up coin jingle",
  },
  {
    id: "marimba",
    label: "Zen Marimba",
    ar: "ماريمبا هادئة 🪵",
    icon: "🪵",
    description: "Mellow wooden bell chime",
  },
  {
    id: "chime",
    label: "Classic Chime",
    ar: "رنين كلاسيكي 🔔",
    icon: "🔔",
    description: "Harmonic ascending chords",
  },
];

const SOUND_STORAGE_KEY = "sg-celebration-sound";

export function getSavedCelebrationSound(): CelebrationSoundType {
  if (typeof window === "undefined") return "magic";
  try {
    const saved = localStorage.getItem(SOUND_STORAGE_KEY) as CelebrationSoundType | null;
    if (saved && celebrationSounds.some((s) => s.id === saved)) {
      return saved;
    }
  } catch {}
  return "magic";
}

export function setSavedCelebrationSound(sound: CelebrationSoundType): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, sound);
  } catch {}
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  const ctx = new AudioCtx();
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

/**
 * 1. Genie Magic ✨
 * Fast, sparkling ascending pentatonic shimmer with high fairy-dust overtones.
 */
export function playGenieMagicSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [
    { freq: 587.33, time: 0.00, dur: 0.25, gain: 0.12 }, // D5
    { freq: 739.99, time: 0.05, dur: 0.25, gain: 0.13 }, // F#5
    { freq: 880.00, time: 0.10, dur: 0.28, gain: 0.14 }, // A5
    { freq: 1174.66, time: 0.15, dur: 0.35, gain: 0.16 }, // D6
    { freq: 1479.98, time: 0.20, dur: 0.40, gain: 0.18 }, // F#6
    { freq: 1760.00, time: 0.26, dur: 0.50, gain: 0.20 }, // A6
    { freq: 2349.32, time: 0.32, dur: 0.65, gain: 0.22 }, // D7
    { freq: 3520.00, time: 0.35, dur: 0.45, gain: 0.09 }, // Sparkle shimmer
  ];

  notes.forEach(({ freq, time, dur, gain }) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + time);

    gainNode.gain.setValueAtTime(0.001, now + time);
    gainNode.gain.exponentialRampToValueAtTime(gain, now + time + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + dur);
  });

  setTimeout(() => ctx.close().catch(() => {}), 1200);
}

/**
 * 2. Victory Fanfare 🎺
 * Triumphant brass-like fanfare with staccato prep chords and a grand final chord.
 */
export function playFanfareSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Staccato lead-in notes: G4 -> G4 -> G4 -> C5
  const staccato = [
    { freq: 392.00, time: 0.00, dur: 0.10 }, // G4
    { freq: 392.00, time: 0.12, dur: 0.10 }, // G4
    { freq: 392.00, time: 0.24, dur: 0.10 }, // G4
  ];

  staccato.forEach(({ freq, time, dur }) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + time);

    gainNode.gain.setValueAtTime(0.001, now + time);
    gainNode.gain.exponentialRampToValueAtTime(0.18, now + time + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + dur);
  });

  // Grand finale chord: C4, G4, C5, E5, G5 sustained
  const finaleTime = 0.38;
  const finaleNotes = [261.63, 392.00, 523.25, 659.25, 783.99];

  finaleNotes.forEach((freq) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + finaleTime);

    gainNode.gain.setValueAtTime(0.001, now + finaleTime);
    gainNode.gain.exponentialRampToValueAtTime(0.12, now + finaleTime + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + finaleTime + 0.75);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now + finaleTime);
    osc.stop(now + finaleTime + 0.75);
  });

  setTimeout(() => ctx.close().catch(() => {}), 1400);
}

/**
 * 3. Retro Arcade 🪙
 * Punchy 8-bit style power-up / coin jingle.
 */
export function playArcadeLevelUpSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [
    { freq: 659.25, time: 0.00, dur: 0.08 }, // E5
    { freq: 830.61, time: 0.08, dur: 0.08 }, // G#5
    { freq: 987.77, time: 0.16, dur: 0.08 }, // B5
    { freq: 1318.51, time: 0.24, dur: 0.35 }, // E6
  ];

  notes.forEach(({ freq, time, dur }) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(freq, now + time);

    gainNode.gain.setValueAtTime(0.001, now + time);
    gainNode.gain.exponentialRampToValueAtTime(0.08, now + time + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + dur);
  });

  setTimeout(() => ctx.close().catch(() => {}), 800);
}

/**
 * 4. Zen Marimba 🪵
 * Warm, peaceful acoustic wooden bell tones with organic decay.
 */
export function playMarimbaSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [
    { freq: 369.99, time: 0.00, dur: 0.40 }, // F#4
    { freq: 466.16, time: 0.10, dur: 0.45 }, // A#4
    { freq: 554.37, time: 0.20, dur: 0.50 }, // C#5
    { freq: 739.99, time: 0.30, dur: 0.65 }, // F#5
  ];

  notes.forEach(({ freq, time, dur }) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + time);

    gainNode.gain.setValueAtTime(0.001, now + time);
    gainNode.gain.exponentialRampToValueAtTime(0.20, now + time + 0.008);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + dur);
  });

  setTimeout(() => ctx.close().catch(() => {}), 1100);
}

/**
 * 5. Classic Chime 🔔
 * Harmonic ascending chord with sparkling overtone.
 */
export function playChimeSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const chords = [
    { freq: 523.25, time: 0.0, dur: 0.35, gain: 0.15 },
    { freq: 659.25, time: 0.08, dur: 0.35, gain: 0.16 },
    { freq: 783.99, time: 0.16, dur: 0.40, gain: 0.18 },
    { freq: 1046.50, time: 0.24, dur: 0.65, gain: 0.22 },
    { freq: 2093.00, time: 0.26, dur: 0.45, gain: 0.08 },
  ];

  chords.forEach(({ freq, time, dur, gain }) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + time);

    gainNode.gain.setValueAtTime(0.001, now + time);
    gainNode.gain.exponentialRampToValueAtTime(gain, now + time + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + dur);
  });

  setTimeout(() => ctx.close().catch(() => {}), 1200);
}

/**
 * Plays a celebration sound by its ID type.
 */
export function playCelebrationSound(type?: CelebrationSoundType): void {
  const selected = type || getSavedCelebrationSound();

  switch (selected) {
    case "magic":
      playGenieMagicSound();
      break;
    case "fanfare":
      playFanfareSound();
      break;
    case "arcade":
      playArcadeLevelUpSound();
      break;
    case "marimba":
      playMarimbaSound();
      break;
    case "chime":
    default:
      playChimeSound();
      break;
  }
}

/**
 * Primary point-earned sound trigger.
 * Tries the HTML5 Audio element (/sounds/point-earned.mp3) if provided,
 * and seamlessly falls back to the user's selected celebration sound.
 */
export function playPointEarnedSound(
  target?: HTMLAudioElement | string | null,
  options?: { fallbackToChime?: boolean }
): void {
  if (typeof window === "undefined") return;

  const fallback = options?.fallbackToChime ?? true;

  try {
    let audio: HTMLAudioElement;

    if (target instanceof HTMLAudioElement) {
      audio = target;
    } else if (typeof target === "string") {
      audio = new Audio(target);
    } else {
      audio = new Audio("/sounds/point-earned.mp3");
    }

    audio.currentTime = 0;

    if (fallback) {
      const errorHandler = () => {
        playCelebrationSound();
        audio.removeEventListener("error", errorHandler);
      };
      audio.addEventListener("error", errorHandler, { once: true });
    }

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn("Audio playback prevented or missing file, using celebration synthesizer:", err);
        if (fallback) {
          playCelebrationSound();
        }
      });
    }
  } catch (err) {
    console.warn("Audio error, falling back to celebration sound:", err);
    if (fallback) {
      playCelebrationSound();
    }
  }
}


/**
 * Organic acoustic water drop sound ("bloop" / droplet plop).
 * Synthesized using a sine oscillator with a rapid upward frequency sweep,
 * natural exponential volume decay, and subtle ±12% pitch variance for a realistic droplet feel.
 */
export function playWaterDropSound(options?: { baseFreq?: number; volume?: number }): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const baseFreq = options?.baseFreq || 520;
    const volume = options?.volume || 0.16;

    // Organic random pitch fluctuation (each droplet is uniquely tuned)
    const pitchOffset = Math.random() * 0.24 - 0.12; // -12% to +12%
    const startPitch = baseFreq * (1 + pitchOffset);
    const endPitch = startPitch * 2.85; // sweeps up ~2.85x ("bloop")

    // 1. Primary droplet sine oscillator
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(startPitch, now);
    osc.frequency.exponentialRampToValueAtTime(endPitch, now + 0.08);

    // Fast attack (4ms) and natural exponential decay (160ms)
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    // 2. Secondary subtle water surface tension pop
    const popOsc = ctx.createOscillator();
    const popGain = ctx.createGain();

    popOsc.type = "triangle";
    popOsc.frequency.setValueAtTime(endPitch * 1.25, now);
    popOsc.frequency.exponentialRampToValueAtTime(endPitch * 0.8, now + 0.05);

    popGain.gain.setValueAtTime(0.0001, now);
    popGain.gain.linearRampToValueAtTime(volume * 0.35, now + 0.003);
    popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    // Lowpass filter to keep sound warm and smooth
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(3200, now);

    // Connect audio graph
    osc.connect(gain);
    gain.connect(filter);

    popOsc.connect(popGain);
    popGain.connect(filter);

    filter.connect(ctx.destination);

    // Schedule audio playback
    osc.start(now);
    osc.stop(now + 0.18);

    popOsc.start(now);
    popOsc.stop(now + 0.09);

    setTimeout(() => ctx.close().catch(() => {}), 400);
  } catch (err) {
    console.warn("Could not play water drop sound:", err);
  }
}
