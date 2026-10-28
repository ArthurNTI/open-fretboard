// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Turns the selected mode and settings into what the fretboard draws:
 * note markers, muted strings and CAGED regions. Pure functions, no React.
 *
 * Author: Arthur (ArthurNTI) · Created: 2026-10-28
 */
import { Chord, Interval, Note, Scale } from 'tonal'
import { cagedPositions, isStandardLike, type CagedShape, type Quality } from './theory/caged'
import { detectChords, detectedTones } from './theory/detect'
import { chromaOf, degreeColor, intervalLabel, mod12, plainName } from './theory/notes'
import { chordTones, generateVoicings, type Voicing } from './theory/voicings'

export type LabelMode = 'notes' | 'intervals'
export type Overlay = 'none' | 'scale' | 'pentatonic'

export interface Marker {
  label: string
  color: string
  style: 'solid' | 'faint' | 'ghost'
  root?: boolean
}

export interface Region {
  from: number
  to: number
  label: string
  color: string
  active: boolean
}

export interface BoardView {
  markers: Map<string, Marker>
  /** Strings drawn with an "x" at the nut. */
  muted?: boolean[]
  regions?: Region[]
  /** Fret to scroll into view. */
  focusFret?: number
}

export interface Neck {
  /** Open-string MIDI numbers, lowest string first (capo not applied). */
  tuning: number[]
  capo: number
  frets: number
}

/** A note of the current scale/chord, for the chips under the neck. */
export interface Tone {
  name: string
  interval: string
  midi: number
}

export const SHAPE_COLORS: Record<CagedShape, string> = {
  C: '#e5484d',
  A: '#f76b15',
  G: '#30a46c',
  E: '#0091ff',
  D: '#8e4ec6',
}

export const fretKey = (string: number, fret: number): string => `${string}:${fret}`

interface Spelled {
  name: string
  interval: string
}

/** Calls fn for every playable position; frets behind the capo are skipped. */
function forEachPosition(neck: Neck, fn: (string: number, fret: number, midi: number) => void): void {
  neck.tuning.forEach((open, s) => {
    for (let f = neck.capo; f <= neck.frets; f++) fn(s, f, open + f)
  })
}

function spellingMap(notes: string[], intervals: string[]): Map<number, Spelled> {
  const map = new Map<number, Spelled>()
  notes.forEach((name, i) => {
    const c = chromaOf(name)
    if (!map.has(c)) map.set(c, { name, interval: intervals[i] })
  })
  return map
}

function marker(sp: Spelled, labels: LabelMode, style: Marker['style'], compound: boolean): Marker {
  return {
    label: labels === 'notes' ? sp.name : intervalLabel(sp.interval, compound),
    color: degreeColor(sp.interval),
    style,
    root: Interval.get(sp.interval).chroma === 0,
  }
}

function toneList(root: string, notes: string[], intervals: string[]): Tone[] {
  const base = Note.midi(`${root}3`) ?? 48
  return notes.map((name, i) => ({ name, interval: intervals[i], midi: base + Interval.semitones(intervals[i]) }))
}

const withCapo = (frets: (number | null)[], capo: number): (number | null)[] =>
  frets.map((f) => (f === null ? null : f + capo))

// ---------------------------------------------------------------- scales

export function scaleBoard(neck: Neck, root: string, scale: string, labels: LabelMode): { board: BoardView; tones: Tone[] } {
  const sc = Scale.get(`${root} ${scale}`)
  const spelled = spellingMap(sc.notes, sc.intervals)
  const markers = new Map<string, Marker>()
  forEachPosition(neck, (s, f, midi) => {
    const sp = spelled.get(mod12(midi))
    if (sp) markers.set(fretKey(s, f), marker(sp, labels, 'solid', false))
  })
  return { board: { markers }, tones: toneList(root, sc.notes, sc.intervals) }
}

// ---------------------------------------------------------------- chords

export interface ChordResult {
  board: BoardView
  tones: Tone[]
  /** Voicings with absolute frets (capo applied). */
  voicings: Voicing[]
  current?: Voicing
}

export function chordBoard(
  neck: Neck,
  root: string,
  type: string,
  labels: LabelMode,
  showVoicing: boolean,
  index: number,
): ChordResult {
  const tones = chordTones(root, type)
  const spelled = spellingMap(tones.notes, tones.intervals)
  const shifted = neck.tuning.map((m) => m + neck.capo)
  const voicings = generateVoicings(shifted, tones, { maxFret: neck.frets - neck.capo }).map((v) => ({
    ...v,
    frets: withCapo(v.frets, neck.capo),
    position: v.position + neck.capo,
  }))
  const current = showVoicing && voicings.length > 0 ? voicings[mod(index, voicings.length)] : undefined

  const markers = new Map<string, Marker>()
  forEachPosition(neck, (s, f, midi) => {
    const sp = spelled.get(mod12(midi))
    if (!sp) return
    // A muted string shows its "x" in the open-string slot; keep it clear.
    if (current && current.frets[s] === null && f === neck.capo) return
    const inVoicing = current ? current.frets[s] === f : true
    markers.set(fretKey(s, f), marker(sp, labels, inVoicing ? 'solid' : 'ghost', true))
  })
  const board: BoardView = current
    ? { markers, muted: current.frets.map((f) => f === null), focusFret: current.position }
    : { markers }
  return { board, tones: toneList(root, tones.notes, tones.intervals), voicings, current }
}

const mod = (n: number, m: number): number => ((n % m) + m) % m

// ---------------------------------------------------------------- CAGED

export interface CagedResult {
  board: BoardView
  tones: Tone[]
  supported: boolean
}

export function cagedBoard(
  neck: Neck,
  root: string,
  quality: Quality,
  shape: CagedShape | 'all',
  overlay: Overlay,
  labels: LabelMode,
): CagedResult {
  if (!isStandardLike(neck.tuning)) return { board: { markers: new Map() }, tones: [], supported: false }

  const chord = Chord.getChord(quality === 'major' ? 'M' : 'm', root)
  const chordSpelled = spellingMap(chord.notes, chord.intervals)
  const shifted = neck.tuning.map((m) => m + neck.capo)
  const positions = cagedPositions(shifted, chromaOf(root), quality, neck.frets - neck.capo).map((p) => ({
    ...p,
    frets: withCapo(p.frets, neck.capo),
    from: p.from + neck.capo,
    to: p.to + neck.capo,
  }))
  const active = positions.filter((p) => shape === 'all' || p.shape === shape)
  const markers = new Map<string, Marker>()

  // Scale notes first (faint) so the chord shape drawn after wins.
  if (overlay !== 'none') {
    const sc = Scale.get(`${root} ${quality === 'major' ? 'major' : 'minor'}${overlay === 'pentatonic' ? ' pentatonic' : ''}`)
    const scaleSpelled = spellingMap(sc.notes, sc.intervals)
    forEachPosition(neck, (s, f, midi) => {
      const sp = scaleSpelled.get(mod12(midi))
      const near = shape === 'all' || active.some((p) => f >= p.from - 1 && f <= p.to + 1)
      if (sp && near) markers.set(fretKey(s, f), marker(sp, labels, 'faint', false))
    })
  }
  for (const p of active) {
    p.frets.forEach((f, s) => {
      if (f === null) return
      const sp = chordSpelled.get(mod12(neck.tuning[s] + f))
      if (sp) markers.set(fretKey(s, f), marker(sp, labels, 'solid', false))
    })
  }

  const regions: Region[] = positions.map((p) => ({
    from: p.from,
    to: p.to,
    label: p.shape,
    color: SHAPE_COLORS[p.shape],
    active: shape === 'all' || p.shape === shape,
  }))
  return {
    board: { markers, regions, focusFret: shape === 'all' ? undefined : active[0]?.from },
    tones: toneList(root, chord.notes, chord.intervals),
    supported: true,
  }
}

// ---------------------------------------------------------------- chord finder

export interface FinderResult {
  board: BoardView
  /** Tonal chord names, best first. */
  names: string[]
  tones: Tone[]
  /** Picked notes, lowest pitch first. */
  midis: number[]
}

export function finderBoard(neck: Neck, picked: (number | null)[], labels: LabelMode): FinderResult {
  const notes = neck.tuning.flatMap((open, s) => {
    const f = picked[s]
    return f !== null && f !== undefined && f >= neck.capo && f <= neck.frets ? [{ s, f, midi: open + f }] : []
  })
  const byPitch = [...notes].sort((a, b) => a.midi - b.midi)
  const names = detectChords(byPitch.map((n) => plainName(n.midi)))
  const best = names.length > 0 ? detectedTones(names[0]) : null
  const spelled = best ? spellingMap(best.notes, best.intervals) : undefined

  const markers = new Map<string, Marker>()
  for (const n of notes) {
    const sp = spelled?.get(mod12(n.midi))
    markers.set(
      fretKey(n.s, n.f),
      sp ? marker(sp, labels, 'solid', true) : { label: plainName(n.midi), color: '#6b7280', style: 'solid' },
    )
  }
  const tones = best
    ? toneList(best.tonic, best.notes, best.intervals)
    : byPitch.map((n) => ({ name: plainName(n.midi), interval: '', midi: n.midi }))
  return {
    board: { markers, muted: notes.length > 0 ? neck.tuning.map((_, s) => !notes.some((n) => n.s === s)) : undefined },
    names,
    tones,
    midis: byPitch.map((n) => n.midi),
  }
}
