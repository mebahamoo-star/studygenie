/**
 * useSound
 * --------
 * Sound hook for page transitions — zero external libraries.
 * Uses Web Audio API to synthesise a soft whoosh / paper-flutter.
 *
 * Rules:
 * - No autoplay: first sound fires on first user gesture only.
 * - Mute state persisted in localStorage.
 * - Respects document.hidden (tab not visible → silent).
 * - Lazy initialisation: AudioContext created on first play call.
 */
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "sg-sound-muted";

function readMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeMuted(v: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(v));
    window.dispatchEvent(new Event("sg-sound-change"));
  } catch {
    /* ignore */
  }
}

/** Synthesise a soft whoosh using Web Audio API. */
function playWhoosh(
  ctx: AudioContext,
  pitch: number, // 1.0 = forward, 0.75 = backward
  volume: number, // 0–1
) {
  const bufferSize = ctx.sampleRate * 0.35; // 350 ms
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // White noise source
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.4;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // Band-pass filter to shape it into a soft whoosh
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(600 * pitch, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(
    1200 * pitch,
    ctx.currentTime + 0.25,
  );
  filter.Q.value = 0.8;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume * 0.18, ctx.currentTime + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  source.start(ctx.currentTime);
  source.stop(ctx.currentTime + 0.4);
}

/** Tiny positive chime for success interactions. */
function playChime(ctx: AudioContext, volume: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);

  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume * 0.12, ctx.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
}

export interface UseSoundReturn {
  muted: boolean;
  toggleMute: () => void;
  playForward: () => void;
  playBackward: () => void;
  playSuccess: () => void;
}

export function useSound(): UseSoundReturn {
  const [muted, setMuted] = useState<boolean>(readMuted);
  const ctxRef = useRef<AudioContext | null>(null);
  const unlockedRef = useRef(false);

  // Lazily create AudioContext on first play (browser autoplay policy).
  const getCtx = useCallback((): AudioContext | null => {
    if (typeof AudioContext === "undefined" && typeof (window as any).webkitAudioContext === "undefined") {
      return null;
    }
    if (!ctxRef.current) {
      const AC =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      ctxRef.current = new AC() as AudioContext;
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume().catch(() => {});
    }
    return ctxRef.current;
  }, []);

  const canPlay = useCallback(() => {
    if (muted) return false;
    if (typeof document !== "undefined" && document.hidden) return false;
    return true;
  }, [muted]);

  const playForward = useCallback(() => {
    if (!canPlay()) return;
    const ctx = getCtx();
    if (ctx) playWhoosh(ctx, 1.0, 1);
  }, [canPlay, getCtx]);

  const playBackward = useCallback(() => {
    if (!canPlay()) return;
    const ctx = getCtx();
    if (ctx) playWhoosh(ctx, 0.75, 0.9);
  }, [canPlay, getCtx]);

  const playSuccess = useCallback(() => {
    if (!canPlay()) return;
    const ctx = getCtx();
    if (ctx) playChime(ctx, 1);
  }, [canPlay, getCtx]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      writeMuted(next);
      return next;
    });
  }, []);

  // Synchronize across multiple sound hooks / toggles
  useEffect(() => {
    const handler = () => {
      setMuted(readMuted());
    };
    window.addEventListener("sg-sound-change", handler);
    return () => window.removeEventListener("sg-sound-change", handler);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  return { muted, toggleMute, playForward, playBackward, playSuccess };
}
