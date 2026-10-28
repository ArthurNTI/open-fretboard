// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Pitch helpers shared by every mode: chroma math, plain note names and
 * interval labels/colors.
 *
 * Author: Arthur (ArthurNTI) · Created: 2026-10-28
 */
import { Interval, Note } from 'tonal'

/** Root choices, spelled the way guitarists usually read them. */
export const ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const
export type Root = (typeof ROOTS)[number]

export const mod12 = (n: number): number => ((n % 12) + 12) % 12

export function chromaOf(note: string): number {
  const c = Note.chroma(note)
  return Number.isNaN(c) ? 0 : c
}

/** Pitch-class name for a chroma or MIDI number when no key context exists. */
export function plainName(chromaOrMidi: number): string {
  return ROOTS[mod12(chromaOrMidi)]
}

/**
 * Short interval label: "R", "b3", "#4", "bb7"... Chords pass compound=true
 * so tensions read as 9/11/13 instead of 2/4/6.
 */
export function intervalLabel(ivl: string, compound = false): string {
  const i = Interval.get(ivl)
  if (i.empty) return ivl
  const num = compound ? i.num : ((i.simple - 1) % 7) + 1
  if (num === 1 && i.alt === 0) return 'R'
  const acc = i.alt > 0 ? '#'.repeat(i.alt) : 'b'.repeat(-i.alt)
  return acc + num
}

// One color per scale degree (1..7), so a 3rd is always yellow, a 5th blue...
const DEGREE_COLORS = ['#e5484d', '#f76b15', '#f5c400', '#30a46c', '#0091ff', '#8e4ec6', '#d6409f']
const LIGHT_FILLS = new Set(['#f5c400'])

export function degreeColor(ivl: string): string {
  const i = Interval.get(ivl)
  return i.empty ? '#6b7280' : DEGREE_COLORS[(i.simple - 1) % 7]
}

export function textColorOn(fill: string): string {
  return LIGHT_FILLS.has(fill) ? '#1a1a1a' : '#ffffff'
}

export function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}
