// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Playable chord voicings for any tuning. Instead of a hand-made chord
 * database, voicings are searched: for every hand position, try each
 * combination of chord tones (or a muted string) per string, keep the ones a
 * four-finger hand can actually fret, and rank them.
 *
 * Author: Arthur (ArthurNTI) · Created: 2026-10-28
 */
import { Chord, Interval } from 'tonal'
import { chromaOf, mod12 } from './notes'

export interface ChordTones {
  notes: string[]
  intervals: string[]
  chromas: number[]
  /** Chromas a voicing must contain; the rest may be left out. */
  required: number[]
  root: number
}

export interface Voicing {
  /** Fret per string, lowest string first; null = muted. */
  frets: (number | null)[]
  /** Lowest fretted fret (0 when only open strings are played). */
  position: number
  score: number
}

export interface VoicingOptions {
  /** Highest usable fret. */
  maxFret: number
  /** Frets one hand position covers. */
  span?: number
  /** Open strings are only mixed in while the hand starts at or below this fret. */
  openUntil?: number
  /** How many voicings to keep per hand position. */
  perPosition?: number
}

export function chordTones(root: string, type: string): ChordTones {
  const c = Chord.getChord(type, root)
  // On six strings, extended chords usually drop the 5th (and the 9th under
  // an 11th or 13th); requiring every tone would leave nothing playable.
  const optional = new Set<string>()
  if (c.intervals.length >= 4) optional.add('5P')
  if (c.intervals.some((ivl) => Interval.get(ivl).num >= 11)) optional.add('9M')
  const chromas = c.notes.map(chromaOf)
  const required = c.intervals.flatMap((ivl, i) => (optional.has(ivl) ? [] : [chromas[i]]))
  return { notes: c.notes, intervals: c.intervals, chromas, required, root: chromaOf(root) }
}

export function generateVoicings(tuning: number[], tones: ChordTones, opts: VoicingOptions): Voicing[] {
  const span = opts.span ?? 4
  const openUntil = opts.openUntil ?? 1
  const perPosition = opts.perPosition ?? 2
  const allowed = new Set(tones.chromas)
  const found = new Map<string, Voicing>()
  const current: (number | null)[] = tuning.map(() => null)

  for (let base = 1; base <= opts.maxFret; base++) {
    const top = Math.min(base + span - 1, opts.maxFret)
    const choices = tuning.map((open) => {
      const list: (number | null)[] = [null]
      if (base <= openUntil && allowed.has(mod12(open))) list.push(0)
      for (let f = base; f <= top; f++) if (allowed.has(mod12(open + f))) list.push(f)
      return list
    })
    const walk = (s: number): void => {
      if (s === tuning.length) {
        const v = evaluate(current, tuning, tones)
        const key = current.join(',')
        if (v && !found.has(key)) found.set(key, v)
        return
      }
      for (const f of choices[s]) {
        current[s] = f
        walk(s + 1)
      }
    }
    walk(0)
  }

  // Thin three-string fragments only matter when nothing fuller exists.
  const strings = (v: Voicing): number => v.frets.filter((f) => f !== null).length
  const fullest = Math.max(0, ...[...found.values()].map(strings))
  const minStrings = Math.min(4, fullest)

  // Keep the best few per hand position, then list them up the neck.
  const byPosition = new Map<number, Voicing[]>()
  for (const v of found.values()) {
    if (strings(v) < minStrings) continue
    const list = byPosition.get(v.position) ?? []
    list.push(v)
    byPosition.set(v.position, list)
  }
  return [...byPosition.keys()]
    .sort((a, b) => a - b)
    .flatMap((p) => byPosition.get(p)!.sort((a, b) => a.score - b.score).slice(0, perPosition))
}

function evaluate(frets: (number | null)[], tuning: number[], tones: ChordTones): Voicing | null {
  const played: number[] = []
  frets.forEach((f, s) => {
    if (f !== null) played.push(s)
  })
  if (played.length < Math.min(3, tones.chromas.length)) return null

  const pitch = (s: number): number => tuning[s] + frets[s]!
  // Root in the bass: the lowest sounding note, which on re-entrant tunings
  // (ukulele) is not always the lowest string.
  const bass = played.reduce((lo, s) => (pitch(s) < pitch(lo) ? s : lo), played[0])
  if (mod12(pitch(bass)) !== tones.root) return null

  const present = new Set(played.map((s) => mod12(pitch(s))))
  if (!tones.required.every((c) => present.has(c))) return null

  const first = played[0]
  const last = played[played.length - 1]
  let innerMutes = 0
  for (let s = first; s <= last; s++) if (frets[s] === null) innerMutes++
  if (innerMutes > 1) return null

  const fretted = played.filter((s) => frets[s]! > 0)
  let fingers = 0
  let stretch = 0
  let position = 0
  if (fretted.length > 0) {
    const values = fretted.map((s) => frets[s]!)
    position = Math.min(...values)
    stretch = Math.max(...values) - position
    const atLowest = fretted.filter((s) => frets[s] === position)
    const barre = atLowest.length > 1
    if (barre) {
      // The index finger lies flat across, so no open string can ring under it.
      const from = atLowest[0]
      const to = atLowest[atLowest.length - 1]
      for (let s = from; s <= to; s++) if (frets[s] === 0) return null
    }
    fingers = (barre ? 1 : atLowest.length) + fretted.length - atLowest.length
    if (fingers > 4) return null
  }

  const omitted = tones.chromas.filter((c) => !present.has(c)).length
  const score = -played.length * 2 + innerMutes * 3 + fingers * 0.5 + stretch * 0.4 + omitted * 1.5
  return { frets: [...frets], position, score }
}

/** "x32010", or "8-10-10-9-8-8" once a fret needs two digits. */
export function formatFrets(frets: (number | null)[]): string {
  const parts = frets.map((f) => (f === null ? 'x' : String(f)))
  return frets.some((f) => f !== null && f > 9) ? parts.join('-') : parts.join('')
}
