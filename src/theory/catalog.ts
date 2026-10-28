// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Curated scale and chord lists shown in the pickers. The ids are Tonal.js
 * names, so Scale.get(`${root} ${id}`) and Chord.getChord(id, root) work.
 *
 * Author: Arthur (ArthurNTI) · Created: 2026-10-28
 */

export interface Named {
  id: string
  en: string
  pt: string
}

export interface ChordKind extends Named {
  /** What goes after the root in the chord symbol ("" for a major triad). */
  suffix: string
}

export const SCALES: Named[] = [
  { id: 'major', en: 'Major (Ionian)', pt: 'Maior (jônio)' },
  { id: 'minor', en: 'Natural minor (Aeolian)', pt: 'Menor natural (eólio)' },
  { id: 'major pentatonic', en: 'Major pentatonic', pt: 'Pentatônica maior' },
  { id: 'minor pentatonic', en: 'Minor pentatonic', pt: 'Pentatônica menor' },
  { id: 'blues', en: 'Blues (minor)', pt: 'Blues (menor)' },
  { id: 'major blues', en: 'Major blues', pt: 'Blues maior' },
  { id: 'dorian', en: 'Dorian', pt: 'Dórico' },
  { id: 'phrygian', en: 'Phrygian', pt: 'Frígio' },
  { id: 'lydian', en: 'Lydian', pt: 'Lídio' },
  { id: 'mixolydian', en: 'Mixolydian', pt: 'Mixolídio' },
  { id: 'locrian', en: 'Locrian', pt: 'Lócrio' },
  { id: 'harmonic minor', en: 'Harmonic minor', pt: 'Menor harmônica' },
  { id: 'melodic minor', en: 'Melodic minor', pt: 'Menor melódica' },
  { id: 'phrygian dominant', en: 'Phrygian dominant', pt: 'Frígio dominante' },
  { id: 'lydian dominant', en: 'Lydian dominant', pt: 'Lídio dominante' },
  { id: 'altered', en: 'Altered (super Locrian)', pt: 'Alterada (superlócria)' },
  { id: 'hungarian minor', en: 'Hungarian minor', pt: 'Menor húngara' },
  { id: 'whole tone', en: 'Whole tone', pt: 'Tons inteiros' },
  { id: 'diminished', en: 'Diminished (whole-half)', pt: 'Diminuta (tom-semitom)' },
  { id: 'half-whole diminished', en: 'Diminished (half-whole)', pt: 'Diminuta (semitom-tom)' },
  { id: 'bebop', en: 'Bebop dominant', pt: 'Bebop dominante' },
  { id: 'chromatic', en: 'Chromatic', pt: 'Cromática' },
]

export const CHORDS: ChordKind[] = [
  { id: 'M', suffix: '', en: 'Major', pt: 'Maior' },
  { id: 'm', suffix: 'm', en: 'Minor', pt: 'Menor' },
  { id: '5', suffix: '5', en: 'Power chord', pt: 'Power chord (quinta)' },
  { id: '7', suffix: '7', en: 'Dominant 7th', pt: 'Sétima' },
  { id: 'maj7', suffix: 'maj7', en: 'Major 7th', pt: 'Sétima maior' },
  { id: 'm7', suffix: 'm7', en: 'Minor 7th', pt: 'Menor com sétima' },
  { id: 'mMaj7', suffix: 'm(maj7)', en: 'Minor-major 7th', pt: 'Menor com sétima maior' },
  { id: 'm7b5', suffix: 'm7(b5)', en: 'Half-diminished', pt: 'Meio-diminuto' },
  { id: 'dim', suffix: 'dim', en: 'Diminished', pt: 'Diminuto' },
  { id: 'dim7', suffix: 'dim7', en: 'Diminished 7th', pt: 'Diminuto com sétima' },
  { id: 'aug', suffix: 'aug', en: 'Augmented', pt: 'Aumentado' },
  { id: 'sus2', suffix: 'sus2', en: 'Suspended 2nd', pt: 'Suspenso com 2ª' },
  { id: 'sus4', suffix: 'sus4', en: 'Suspended 4th', pt: 'Suspenso com 4ª' },
  { id: '7sus4', suffix: '7sus4', en: 'Dominant 7th sus4', pt: 'Sétima sus4' },
  { id: '6', suffix: '6', en: 'Major 6th', pt: 'Sexta' },
  { id: 'm6', suffix: 'm6', en: 'Minor 6th', pt: 'Menor com sexta' },
  { id: '6/9', suffix: '6/9', en: '6/9', pt: 'Sexta e nona' },
  { id: 'add9', suffix: 'add9', en: 'Added 9th', pt: 'Com nona adicionada' },
  { id: '9', suffix: '9', en: 'Dominant 9th', pt: 'Nona' },
  { id: 'maj9', suffix: 'maj9', en: 'Major 9th', pt: 'Sétima maior com nona' },
  { id: 'm9', suffix: 'm9', en: 'Minor 9th', pt: 'Menor com nona' },
  { id: '7b9', suffix: '7(b9)', en: 'Dominant 7th flat 9', pt: 'Sétima com nona menor' },
  { id: '7#9', suffix: '7(#9)', en: 'Dominant 7th sharp 9', pt: 'Sétima com nona aumentada' },
  { id: '11', suffix: '11', en: 'Dominant 11th', pt: 'Décima primeira' },
  { id: '13', suffix: '13', en: 'Dominant 13th', pt: 'Décima terceira' },
]

export function findChordKind(id: string): ChordKind {
  return CHORDS.find((c) => c.id === id) ?? CHORDS[0]
}
