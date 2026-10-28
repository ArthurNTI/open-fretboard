// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Music theory checks: labels, voicing search, CAGED layout and the chord
 * finder, against shapes every guitarist knows.
 *
 * Author: Arthur (ArthurNTI) · Created: 2026-10-28
 */
import { describe, expect, it } from 'vitest'
import { cagedPositions, isStandardLike } from './caged'
import { CHORDS } from './catalog'
import { detectChords, detectedTones, prettyChordName } from './detect'
import { intervalLabel, mod12 } from './notes'
import { TUNINGS, findTuning, tuningMidi } from './tunings'
import { chordTones, formatFrets, generateVoicings } from './voicings'

const standard = tuningMidi(findTuning('standard'))
const shapes = (root: string, type: string, tuning = standard): string[] =>
  generateVoicings(tuning, chordTones(root, type), { maxFret: 22 }).map((v) => formatFrets(v.frets))

describe('interval labels', () => {
  it('uses guitarist shorthand', () => {
    expect(['1P', '3m', '3M', '4A', '5d', '7m', '7d', '8P'].map((i) => intervalLabel(i))).toEqual([
      'R', 'b3', '3', '#4', 'b5', 'b7', 'bb7', 'R',
    ])
    expect(intervalLabel('9M', true)).toBe('9')
    expect(intervalLabel('9M')).toBe('2')
  })
})

describe('voicings', () => {
  it('finds the classic open and barre shapes', () => {
    expect(shapes('C', 'M')).toEqual(expect.arrayContaining(['x32010', 'x35553', '8-10-10-9-8-8']))
    expect(shapes('G', 'M')).toContain('320003')
    expect(shapes('E', 'M')).toContain('022100')
    expect(shapes('F', 'M')).toContain('133211')
    expect(shapes('A', 'm')).toContain('x02210')
    expect(shapes('D', 'M')).toContain('xx0232')
  })

  it('keeps the root in the bass and every required tone', () => {
    for (const kind of CHORDS) {
      const tones = chordTones('A', kind.id)
      for (const v of generateVoicings(standard, tones, { maxFret: 15 })) {
        const sounding = v.frets.flatMap((f, s) => (f === null ? [] : [standard[s] + f]))
        expect(mod12(Math.min(...sounding))).toBe(tones.root)
        const present = new Set(sounding.map(mod12))
        for (const c of tones.required) expect(present.has(c)).toBe(true)
      }
    }
  })

  it('has something playable for every chord type in the picker', () => {
    for (const kind of CHORDS) expect(shapes('C', kind.id).length, kind.id).toBeGreaterThan(0)
  })

  it('works on re-entrant ukulele tuning', () => {
    expect(shapes('C', 'M', tuningMidi(findTuning('ukulele')))).toContain('0003')
  })

  it('every tuning yields major voicings', () => {
    for (const t of TUNINGS) expect(shapes('G', 'M', tuningMidi(t)).length, t.id).toBeGreaterThan(0)
  })
})

describe('CAGED', () => {
  it('orders C major as C-A-G-E-D up the neck', () => {
    const pos = cagedPositions(standard, 0, 'major', 15)
    expect(pos.map((p) => `${p.shape}${p.from}-${p.to}`)).toEqual(['C0-3', 'A3-5', 'G5-8', 'E8-10', 'D10-13', 'C12-15'])
    expect(formatFrets(pos[0].frets)).toBe('x32010')
  })

  it('builds minor shapes', () => {
    const pos = cagedPositions(standard, 9, 'minor', 12) // A minor
    expect(pos.map((p) => formatFrets(p.frets))).toContain('x02210')
    expect(pos.map((p) => formatFrets(p.frets))).toContain('577555')
  })

  it('accepts lowered standard tunings only', () => {
    expect(isStandardLike(standard)).toBe(true)
    expect(isStandardLike(tuningMidi(findTuning('d-standard')))).toBe(true)
    expect(isStandardLike(tuningMidi(findTuning('drop-d')))).toBe(false)
  })
})

describe('chord finder', () => {
  it('names common chords first', () => {
    expect(detectChords(['C', 'E', 'G', 'C', 'E']).map(prettyChordName)[0]).toBe('C')
    expect(detectChords(['E', 'C', 'G']).map(prettyChordName)[0]).toBe('C/E')
    expect(detectChords(['A', 'E', 'G', 'C', 'E'])[0]).toBe('Am7')
    expect(detectChords(['C'])).toEqual([])
  })

  it('returns root-position tones for slash chords', () => {
    expect(detectedTones('CM/E')).toEqual({ tonic: 'C', notes: ['C', 'E', 'G'], intervals: ['1P', '3M', '5P'] })
  })
})
