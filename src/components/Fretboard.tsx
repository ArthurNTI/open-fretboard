// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * The neck, drawn as SVG. Geometry is computed along the neck (frets) and
 * across it (strings), then mapped to x/y for the horizontal or vertical
 * layout and mirrored for left-handed players.
 *
 * Author: Arthur (ArthurNTI) · Created: 2026-10-28
 */
import { useEffect, useMemo, useRef } from 'react'
import { fretKey, type BoardView, type Marker } from '../board'
import { plainName, textColorOn } from '../theory/notes'

interface Props {
  view: BoardView
  /** Open-string MIDI numbers, lowest string first. */
  tuning: number[]
  frets: number
  capo: number
  vertical: boolean
  leftHanded: boolean
  ariaLabel: string
  onTap: (string: number, fret: number) => void
}

const STRING_GAP = 30
// Real frets shrink by 2^(-1/12) ≈ 0.944 each; a gentler ratio keeps the
// high frets wide enough to tap.
const FRET_RATIO = 0.97
const NAME_W = 22 // string names before the nut
const OPEN_W = 36 // open-string column
const EDGE = 34 // margin across the neck for fret numbers and CAGED labels
const END = 10
const INLAYS = [3, 5, 7, 9, 15, 17, 19, 21]
const DOUBLE_INLAYS = [12, 24]
const DOT_R = 11.5

export function Fretboard({ view, tuning, frets, capo, vertical, leftHanded, ariaLabel, onTap }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const n = tuning.length

  const geo = useMemo(() => {
    const first = vertical ? 46 : 64
    const wires = [NAME_W + OPEN_W] // wires[f]: position of fret wire f along the neck (0 = nut)
    for (let f = 1; f <= frets; f++) wires.push(wires[f - 1] + first * FRET_RATIO ** (f - 1))
    return { wires, along: wires[frets] + END, across: EDGE * 2 + (n - 1) * STRING_GAP }
  }, [frets, n, vertical])

  useEffect(() => {
    if (view.focusFret === undefined) return
    svgRef.current
      ?.querySelector(`[data-fret="${view.focusFret}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [view.focusFret, vertical])

  const fretCenter = (f: number): number =>
    f === 0 ? NAME_W + OPEN_W / 2 : (geo.wires[f - 1] + geo.wires[f]) / 2
  const stringPos = (s: number): number => EDGE + (vertical ? s : n - 1 - s) * STRING_GAP

  // Neck coordinates -> SVG coordinates.
  const pt = (a: number, c: number): { x: number; y: number } => {
    if (vertical) return { x: leftHanded ? geo.across - c : c, y: a }
    return { x: leftHanded ? geo.along - a : a, y: c }
  }
  const box = (a1: number, a2: number, c1: number, c2: number) => {
    const p = pt(a1, c1)
    const q = pt(a2, c2)
    return { x: Math.min(p.x, q.x), y: Math.min(p.y, q.y), width: Math.abs(q.x - p.x), height: Math.abs(q.y - p.y) }
  }
  const line = (a1: number, a2: number, c1: number, c2: number) => {
    const p = pt(a1, c1)
    const q = pt(a2, c2)
    return { x1: p.x, y1: p.y, x2: q.x, y2: q.y }
  }

  // With every CAGED shape lit, the overlapping bands need to stay light.
  const allActive = view.regions?.every((r) => r.active) ?? false
  const nut = geo.wires[0]
  const neckEnd = geo.wires[frets]
  const top = EDGE - 12
  const bottom = geo.across - EDGE + 12
  const far = geo.across - 9 // fret numbers, clear of the dots on the edge string
  const near = 10 // CAGED labels
  const width = vertical ? geo.across : geo.along
  const height = vertical ? geo.along : geo.across

  const markers = [...view.markers.entries()].map(([key, m]) => {
    const [s, f] = key.split(':').map(Number)
    return { s, f, m }
  })
  // Draw faint and ghost dots first so solid ones stay on top.
  const order: Record<Marker['style'], number> = { faint: 0, ghost: 1, solid: 2 }
  markers.sort((a, b) => order[a.m.style] - order[b.m.style])

  return (
    <svg
      ref={svgRef}
      className={vertical ? 'neck neck-vertical' : 'neck neck-horizontal'}
      viewBox={`0 0 ${width} ${height}`}
      style={vertical ? undefined : { minWidth: `${Math.round(geo.along * 0.85)}px` }}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id="wood" x1="0" y1="0" x2={vertical ? 1 : 0} y2={vertical ? 0 : 1}>
          <stop offset="0" stopColor="#4a3424" />
          <stop offset="0.5" stopColor="#3a291c" />
          <stop offset="1" stopColor="#2f2117" />
        </linearGradient>
      </defs>

      <rect {...box(nut, neckEnd, top, bottom)} fill="url(#wood)" rx={3} />

      {view.regions?.map((r, i) => {
        const a1 = r.from === 0 ? NAME_W + 4 : geo.wires[r.from - 1]
        const a2 = geo.wires[Math.min(r.to, frets)]
        const label = pt((a1 + a2) / 2, near)
        return (
          <g key={`${r.label}${r.from}-${i}`}>
            <rect {...box(a1, a2, top, bottom)} fill={r.color} opacity={r.active ? (allActive ? 0.13 : 0.26) : 0.06} />
            <rect {...box(a1 + 2, a2 - 2, near - 4, near + 4)} fill={r.color} opacity={r.active ? 0.9 : 0.3} rx={3} />
            <text x={label.x} y={label.y} className="region-label" opacity={r.active ? 1 : 0.5}>
              {r.label}
            </text>
          </g>
        )
      })}

      {INLAYS.filter((f) => f <= frets).map((f) => {
        const p = pt(fretCenter(f), geo.across / 2)
        return <circle key={f} cx={p.x} cy={p.y} r={5} className="inlay" />
      })}
      {DOUBLE_INLAYS.filter((f) => f <= frets).flatMap((f) =>
        [0.27, 0.73].map((k) => {
          const p = pt(fretCenter(f), EDGE + (n - 1) * STRING_GAP * k)
          return <circle key={`${f}-${k}`} cx={p.x} cy={p.y} r={5} className="inlay" />
        }),
      )}

      {geo.wires.slice(1).map((a, i) => (
        <line key={i} {...line(a, a, top, bottom)} className="fret-wire" />
      ))}
      <line {...line(nut, nut, top, bottom)} className="nut" />

      {capo > 0 && capo <= frets && (
        <g>
          <rect {...box(NAME_W, geo.wires[capo - 1], top, bottom)} className="behind-capo" />
          <rect {...box(geo.wires[capo] - 10, geo.wires[capo] - 3, top - 4, bottom + 4)} className="capo" rx={3} />
        </g>
      )}

      {tuning.map((open, s) => {
        const c = stringPos(s)
        const name = pt(NAME_W / 2, c)
        return (
          <g key={s}>
            <line
              {...line(NAME_W + OPEN_W * 0.25, neckEnd, c, c)}
              className="string"
              strokeWidth={0.8 + (n - 1 - s) * (1.4 / Math.max(1, n - 1))}
            />
            <text x={name.x} y={name.y} className="string-name">
              {plainName(open + capo)}
            </text>
          </g>
        )
      })}

      {Array.from({ length: frets }, (_, i) => i + 1).map((f) => {
        const p = pt(fretCenter(f), far)
        const strong = INLAYS.includes(f) || DOUBLE_INLAYS.includes(f)
        return (
          <text key={f} x={p.x} y={p.y} className={strong ? 'fret-number strong' : 'fret-number'}>
            {f}
          </text>
        )
      })}

      {view.muted?.map((m, s) => {
        if (!m) return null
        const p = pt(fretCenter(0), stringPos(s))
        return (
          <text key={s} x={p.x} y={p.y} className="muted-x">
            ×
          </text>
        )
      })}

      {markers.map(({ s, f, m }) => {
        const p = pt(fretCenter(f), stringPos(s))
        const r = m.style === 'faint' ? DOT_R * 0.78 : DOT_R
        const small = m.label.length > 2
        return (
          <g key={fretKey(s, f)} className={`dot dot-${m.style}`}>
            {m.root && m.style !== 'faint' && (
              <circle cx={p.x} cy={p.y} r={r + 3} fill="none" stroke={m.color} strokeWidth={1.6} />
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={r}
              fill={m.style === 'ghost' ? 'rgba(0,0,0,0.35)' : m.color}
              fillOpacity={m.style === 'faint' ? 0.45 : 1}
              stroke={m.style === 'ghost' ? m.color : 'rgba(255,255,255,0.85)'}
              strokeWidth={m.style === 'faint' ? 0 : 1.4}
            />
            <text
              x={p.x}
              y={p.y}
              fontSize={(small ? 8.5 : 10.5) * (m.style === 'faint' ? 0.85 : 1)}
              fill={m.style === 'solid' ? textColorOn(m.color) : m.style === 'ghost' ? m.color : '#ffffff'}
            >
              {m.label}
            </text>
          </g>
        )
      })}

      {tuning.map((_, s) =>
        Array.from({ length: frets + 1 }, (_, f) => {
          const a1 = f === 0 ? NAME_W : geo.wires[f - 1]
          const a2 = geo.wires[f]
          const c = stringPos(s)
          return (
            <rect
              key={`${s}:${f}`}
              {...box(a1, a2, c - STRING_GAP / 2, c + STRING_GAP / 2)}
              data-fret={f}
              className="hit"
              onClick={() => onTap(s, f)}
            />
          )
        }),
      )}
    </svg>
  )
}
