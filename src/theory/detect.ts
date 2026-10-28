// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Chord finder: names the chord formed by the notes picked on the neck.
 * Tonal.js does the matching; we only re-rank so everyday chords ("C/E")
 * come before exotic readings of the same notes ("Em#5").
 *
 * Author: Arthur (ArthurNTI) · Created: 2026-10-28
 */
import { Chord } from 'tonal'
import { CHORDS } from './catalog'

const COMMON = new Set(CHORDS.map((c) => c.id))

/** Pitch classes ordered from the bass up; returns Tonal chord names, best first. */
export function detectChords(pitchClasses: string[]): string[] {
  const unique = pitchClasses.filter((pc, i) => pitchClasses.indexOf(pc) === i)
  if (unique.length < 2) return []
  const rank = (name: string): number => {
    const c = Chord.get(name)
    const common = c.aliases.some((a) => COMMON.has(a))
    return (common ? 0 : 2) + (c.bass ? 1 : 0)
  }
  const ranked = Chord.detect(unique)
    .map((name, i) => ({ name, i, r: rank(name) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
  // Exotic readings are only worth showing when nothing everyday fits.
  const common = ranked.filter((x) => x.r < 2)
  return (common.length > 0 ? common : ranked).map((x) => x.name)
}

/** Tonal writes a major triad as "CM"; guitarists write "C". */
export function prettyChordName(name: string): string {
  return name.replace(/^([A-G][#b]*)M(?=\/|$)/, '$1')
}

/** Root-position tones of a detected chord, ignoring any slash bass. */
export function detectedTones(name: string): { tonic: string; notes: string[]; intervals: string[] } | null {
  const c = Chord.get(name)
  if (c.empty || !c.tonic) return null
  const root = Chord.getChord(c.aliases[0], c.tonic)
  return { tonic: c.tonic, notes: root.notes, intervals: root.intervals }
}
