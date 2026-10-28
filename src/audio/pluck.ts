// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Plucked-string sound with the Karplus-Strong algorithm: a burst of noise
 * circulating in a short delay line that is averaged on every pass. No
 * samples to license or download; each note is rendered once and cached.
 *
 * Author: Arthur (ArthurNTI) · Created: 2026-10-28
 */
import { midiToFreq } from '../theory/notes'

interface Rendered {
  buffer: AudioBuffer
  /** Playback-rate correction for the integer delay length. */
  rate: number
}

let ctx: AudioContext | null = null
let output: GainNode | null = null
const cache = new Map<number, Rendered>()

function audio(): { ctx: AudioContext; output: GainNode } | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null
  if (!ctx || !output) {
    ctx = new AudioContext()
    output = ctx.createGain()
    output.gain.value = 0.9
    const tone = ctx.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = 5000
    const limiter = ctx.createDynamicsCompressor()
    output.connect(tone).connect(limiter).connect(ctx.destination)
  }
  // Browsers start audio suspended until a user gesture; every call is one.
  if (ctx.state === 'suspended') void ctx.resume()
  return { ctx, output }
}

function render(c: AudioContext, midi: number): Rendered {
  const hit = cache.get(midi)
  if (hit) return hit

  const sr = c.sampleRate
  const freq = midiToFreq(midi)
  // The two-point average adds half a sample of delay to the loop.
  const period = Math.max(2, Math.round(sr / freq - 0.5))
  const rate = (freq * (period + 0.5)) / sr
  // Same ring time (to -60 dB) for every note, like a real string's sustain.
  const ringSeconds = 3.5
  const loss = 10 ** (-3 / (freq * ringSeconds))

  const length = Math.floor(sr * (midi < 52 ? 3 : 2.2))
  const buffer = c.createBuffer(1, length, sr)
  const data = buffer.getChannelData(0)
  const line = new Float32Array(period)

  // Slightly low-passed noise makes a softer, pick-like attack.
  let prev = 0
  let mean = 0
  for (let i = 0; i < period; i++) {
    prev = 0.6 * prev + 0.4 * (Math.random() * 2 - 1)
    line[i] = prev
    mean += prev / period
  }
  for (let i = 0; i < period; i++) line[i] -= mean

  let idx = 0
  let peak = 0
  for (let i = 0; i < length; i++) {
    const next = idx + 1 === period ? 0 : idx + 1
    const y = line[idx]
    data[i] = y
    peak = Math.max(peak, Math.abs(y))
    line[idx] = loss * 0.5 * (y + line[next])
    idx = next
  }

  const fade = Math.floor(sr * 0.25)
  const gain = peak > 0 ? 0.9 / peak : 1
  for (let i = 0; i < length; i++) {
    const tail = i > length - fade ? (length - i) / fade : 1
    data[i] *= gain * tail
  }

  const out = { buffer, rate }
  cache.set(midi, out)
  return out
}

export function playMidi(midi: number, delay = 0, volume = 0.5): void {
  const a = audio()
  if (!a) return
  const { buffer, rate } = render(a.ctx, midi)
  const src = a.ctx.createBufferSource()
  src.buffer = buffer
  src.playbackRate.value = rate
  const g = a.ctx.createGain()
  g.gain.value = volume
  src.connect(g).connect(a.output)
  src.start(a.ctx.currentTime + delay)
}

/** Strums low to high, like a downstroke. */
export function strum(midis: number[], gap = 0.035): void {
  midis.forEach((m, i) => playMidi(m, i * gap, 0.35))
}

/** One note after the other, e.g. to hear a scale. */
export function playSequence(midis: number[], gap = 0.28): void {
  midis.forEach((m, i) => playMidi(m, i * gap, 0.5))
}
