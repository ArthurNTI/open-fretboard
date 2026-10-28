// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Instrument tunings, listed from the lowest-pitched (thickest) string to the
 * highest, the same order every other module uses for string indexes.
 *
 * Author: Arthur (ArthurNTI) · Created: 2026-10-28
 */
import { Note } from 'tonal'

export interface Tuning {
  id: string
  en: string
  pt: string
  notes: string[]
}

export const TUNINGS: Tuning[] = [
  { id: 'standard', en: 'Standard', pt: 'Padrão', notes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  { id: 'half-down', en: 'Half step down', pt: 'Meio tom abaixo', notes: ['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4'] },
  { id: 'd-standard', en: 'D standard', pt: 'Um tom abaixo', notes: ['D2', 'G2', 'C3', 'F3', 'A3', 'D4'] },
  { id: 'drop-d', en: 'Drop D', pt: 'Drop D', notes: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  { id: 'drop-c', en: 'Drop C', pt: 'Drop C', notes: ['C2', 'G2', 'C3', 'F3', 'A3', 'D4'] },
  { id: 'dadgad', en: 'DADGAD', pt: 'DADGAD', notes: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'] },
  { id: 'open-g', en: 'Open G', pt: 'Sol aberto (Open G)', notes: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'] },
  { id: 'open-d', en: 'Open D', pt: 'Ré aberto (Open D)', notes: ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'] },
  { id: 'open-e', en: 'Open E', pt: 'Mi aberto (Open E)', notes: ['E2', 'B2', 'E3', 'G#3', 'B3', 'E4'] },
  { id: 'seven', en: '7-string', pt: '7 cordas', notes: ['B1', 'E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  { id: 'bass4', en: 'Bass (4 strings)', pt: 'Baixo (4 cordas)', notes: ['E1', 'A1', 'D2', 'G2'] },
  { id: 'bass5', en: 'Bass (5 strings)', pt: 'Baixo (5 cordas)', notes: ['B0', 'E1', 'A1', 'D2', 'G2'] },
  { id: 'ukulele', en: 'Ukulele (GCEA)', pt: 'Ukulele (GCEA)', notes: ['G4', 'C4', 'E4', 'A4'] },
  { id: 'cavaquinho', en: 'Cavaquinho (DGBD)', pt: 'Cavaquinho (DGBD)', notes: ['D4', 'G4', 'B4', 'D5'] },
]

export function findTuning(id: string): Tuning {
  return TUNINGS.find((t) => t.id === id) ?? TUNINGS[0]
}

/** Open-string MIDI numbers, lowest string first. */
export function tuningMidi(t: Tuning): number[] {
  return t.notes.map((n) => Note.midi(n) ?? 0)
}
