// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * CAGED system: the five open-chord shapes (C, A, G, E, D) moved up the neck
 * so that together they cover it. Shapes are stored as fret offsets from the
 * root on their root string, so they work for any key.
 *
 * Author: Arthur (ArthurNTI) · Created: 2026-10-28
 */
import { mod12 } from './notes'

export type CagedShape = 'C' | 'A' | 'G' | 'E' | 'D'
export type Quality = 'major' | 'minor'

export const CAGED_ORDER: CagedShape[] = ['C', 'A', 'G', 'E', 'D']

interface Template {
  rootString: number
  /** Offset from the root fret per string (lowest first); null = not played. */
  offsets: (number | null)[]
}

const TEMPLATES: Record<Quality, Record<CagedShape, Template>> = {
  major: {
    C: { rootString: 1, offsets: [null, 0, -1, -3, -2, -3] }, // x32010
    A: { rootString: 1, offsets: [null, 0, 2, 2, 2, 0] }, //     x02220
    G: { rootString: 0, offsets: [0, -1, -3, -3, -3, 0] }, //     320003
    E: { rootString: 0, offsets: [0, 2, 2, 1, 0, 0] }, //         022100
    D: { rootString: 2, offsets: [null, null, 0, 2, 3, 2] }, //   xx0232
  },
  minor: {
    C: { rootString: 1, offsets: [null, 0, -2, -3, -2, 0] }, //  x31013
    A: { rootString: 1, offsets: [null, 0, 2, 2, 1, 0] }, //     x02210
    G: { rootString: 0, offsets: [0, -2, -3, -3, 0, 0] }, //     310033
    E: { rootString: 0, offsets: [0, 2, 2, 0, 0, 0] }, //         022000
    D: { rootString: 2, offsets: [null, null, 0, 2, 3, 1] }, //   xx0231
  },
}

export interface CagedPosition {
  shape: CagedShape
  frets: (number | null)[]
  from: number
  to: number
}

/** CAGED shapes assume the guitar's 4ths-with-a-3rd layout (any pitch). */
export function isStandardLike(tuning: number[]): boolean {
  if (tuning.length !== 6) return false
  return [5, 5, 5, 4, 5].every((step, i) => tuning[i + 1] - tuning[i] === step)
}

/** Every shape instance that fits under maxFret, ordered up the neck. */
export function cagedPositions(tuning: number[], root: number, quality: Quality, maxFret: number): CagedPosition[] {
  const out: CagedPosition[] = []
  for (const shape of CAGED_ORDER) {
    const t = TEMPLATES[quality][shape]
    const used = t.offsets.filter((o): o is number => o !== null)
    let r = mod12(root - tuning[t.rootString])
    if (r + Math.min(...used) < 0) r += 12
    for (; ; r += 12) {
      const from = r + Math.min(...used)
      const to = r + Math.max(...used)
      if (to > maxFret) break
      out.push({ shape, frets: t.offsets.map((o) => (o === null ? null : r + o)), from, to })
    }
  }
  return out.sort((a, b) => a.from - b.from || a.to - b.to)
}
