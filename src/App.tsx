// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * App shell: mode tabs, per-mode controls, settings and the neck. All state
 * lives here and is remembered in localStorage between visits.
 *
 * Author: Arthur (ArthurNTI) · Created: 2026-10-28
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { playMidi, playSequence, strum } from './audio/pluck'
import { cagedBoard, chordBoard, finderBoard, scaleBoard, type LabelMode, type Overlay, type Tone } from './board'
import { Fretboard } from './components/Fretboard'
import { STRINGS, detectLang, type Lang, type Strings } from './i18n'
import { CAGED_ORDER, type CagedShape, type Quality } from './theory/caged'
import { CHORDS, SCALES, findChordKind } from './theory/catalog'
import { prettyChordName } from './theory/detect'
import { ROOTS, degreeColor, intervalLabel, textColorOn } from './theory/notes'
import { TUNINGS, findTuning, tuningMidi } from './theory/tunings'
import { formatFrets } from './theory/voicings'

type Mode = 'scales' | 'chords' | 'caged' | 'finder'
type Layout = 'auto' | 'horizontal' | 'vertical'

interface State {
  lang: Lang
  mode: Mode
  tuningId: string
  capo: number
  frets: number
  layout: Layout
  leftHanded: boolean
  labels: LabelMode
  sound: boolean
  root: string
  scale: string
  chord: string
  chordView: 'voicings' | 'tones'
  voicing: number
  quality: Quality
  shape: CagedShape | 'all'
  overlay: Overlay
  picked: (number | null)[]
}

const STORAGE_KEY = 'open-fretboard:v1'
const FRET_CHOICES = [12, 15, 17, 19, 20, 21, 22, 24]

const DEFAULTS: State = {
  lang: detectLang(),
  mode: 'scales',
  tuningId: 'standard',
  capo: 0,
  frets: 22,
  layout: 'auto',
  leftHanded: false,
  labels: 'notes',
  sound: true,
  root: 'A',
  scale: 'minor pentatonic',
  chord: 'M',
  chordView: 'voicings',
  voicing: 0,
  quality: 'major',
  shape: 'all',
  overlay: 'none',
  picked: [],
}

function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<State>) }
  } catch {
    // Private mode or blocked storage: start from the defaults.
  }
  return DEFAULTS
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const update = (): void => setMatches(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [query])
  return matches
}

export function App() {
  const [st, setSt] = useState<State>(loadState)
  const set = useCallback(<K extends keyof State>(key: K, value: State[K]) => setSt((prev) => ({ ...prev, [key]: value })), [])
  const patch = useCallback((p: Partial<State>) => setSt((prev) => ({ ...prev, ...p })), [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(st))
    } catch {
      // Not saving is fine; the app still works for this visit.
    }
  }, [st])
  useEffect(() => {
    document.documentElement.lang = st.lang === 'pt' ? 'pt-BR' : 'en'
  }, [st.lang])

  const t = STRINGS[st.lang]
  const tuning = findTuning(st.tuningId)
  const midi = useMemo(() => tuningMidi(tuning), [tuning])
  const neck = useMemo(() => ({ tuning: midi, capo: st.capo, frets: st.frets }), [midi, st.capo, st.frets])
  const narrow = useMediaQuery('(max-width: 720px)')
  const vertical = st.layout === 'vertical' || (st.layout === 'auto' && narrow)

  const result = useMemo(() => {
    switch (st.mode) {
      case 'scales':
        return { kind: 'scales' as const, ...scaleBoard(neck, st.root, st.scale, st.labels) }
      case 'chords':
        return { kind: 'chords' as const, ...chordBoard(neck, st.root, st.chord, st.labels, st.chordView === 'voicings', st.voicing) }
      case 'caged':
        return { kind: 'caged' as const, ...cagedBoard(neck, st.root, st.quality, st.shape, st.overlay, st.labels) }
      case 'finder':
        return { kind: 'finder' as const, ...finderBoard(neck, st.picked, st.labels) }
    }
  }, [neck, st.mode, st.root, st.scale, st.chord, st.chordView, st.voicing, st.quality, st.shape, st.overlay, st.picked, st.labels])

  const play = (m: number): void => {
    if (st.sound) playMidi(m)
  }

  const onTap = (s: number, f: number): void => {
    if (f < st.capo) return
    if (st.mode === 'finder') {
      const removing = st.picked[s] === f
      setSt((prev) => {
        const picked = midi.map((_, i) => prev.picked[i] ?? null)
        picked[s] = picked[s] === f ? null : f
        return { ...prev, picked }
      })
      if (removing) return
    }
    play(midi[s] + f)
  }

  const rootPicker = (
    <Field label={t.root}>
      <Segmented
        className="roots"
        label={t.root}
        value={st.root}
        options={ROOTS.map((r) => ({ value: r, label: r }))}
        onChange={(root) => patch({ root, voicing: 0 })}
      />
    </Field>
  )

  return (
    <div className="app">
      <header className="top">
        <Logo />
        <div className="brand">
          <h1>Open Fretboard</h1>
          <p>{t.tagline}</p>
        </div>
      </header>

      <nav className="modes" aria-label="Modes">
        {(
          [
            ['scales', t.modeScales],
            ['chords', t.modeChords],
            ['caged', t.modeCaged],
            ['finder', t.modeFinder],
          ] as const
        ).map(([mode, label]) => (
          <button key={mode} type="button" className={st.mode === mode ? 'active' : ''} onClick={() => set('mode', mode)}>
            {label}
          </button>
        ))}
      </nav>

      <Settings st={st} t={t} set={set} patch={patch} />

      <section className="controls">
        {st.mode !== 'finder' && rootPicker}

        {st.mode === 'scales' && (
          <Field label={t.scale}>
            <select value={st.scale} onChange={(e) => set('scale', e.target.value)}>
              {SCALES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s[st.lang]}
                </option>
              ))}
            </select>
          </Field>
        )}

        {st.mode === 'chords' && (
          <>
            <Field label={t.chord}>
              <select value={st.chord} onChange={(e) => patch({ chord: e.target.value, voicing: 0 })}>
                {CHORDS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {`${st.root}${c.suffix} · ${c[st.lang]}`}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t.show}>
              <Segmented
                label={t.show}
                value={st.chordView}
                options={[
                  { value: 'voicings', label: t.voicings },
                  { value: 'tones', label: t.allTones },
                ]}
                onChange={(v) => set('chordView', v)}
              />
            </Field>
          </>
        )}

        {st.mode === 'caged' && (
          <>
            <Field label={t.quality}>
              <Segmented
                label={t.quality}
                value={st.quality}
                options={[
                  { value: 'major', label: t.major },
                  { value: 'minor', label: t.minor },
                ]}
                onChange={(v) => set('quality', v)}
              />
            </Field>
            <Field label={t.shape}>
              <Segmented
                label={t.shape}
                value={st.shape}
                options={[{ value: 'all' as const, label: t.allShapes }, ...CAGED_ORDER.map((s) => ({ value: s, label: s }))]}
                onChange={(v) => set('shape', v)}
              />
            </Field>
            <Field label={t.overlay}>
              <Segmented
                label={t.overlay}
                value={st.overlay}
                options={[
                  { value: 'none', label: t.overlayNone },
                  { value: 'scale', label: t.overlayScale },
                  { value: 'pentatonic', label: t.overlayPentatonic },
                ]}
                onChange={(v) => set('overlay', v)}
              />
            </Field>
          </>
        )}

        <Field label={t.labels}>
          <Segmented
            label={t.labels}
            value={st.labels}
            options={[
              { value: 'notes', label: t.labelNotes },
              { value: 'intervals', label: t.labelIntervals },
            ]}
            onChange={(v) => set('labels', v)}
          />
        </Field>
      </section>

      <section className="info" aria-live="polite">
        {result.kind === 'scales' && (
          <div className="headline">
            <span className="symbol">
              {st.root} {SCALES.find((s) => s.id === st.scale)?.[st.lang]}
            </span>
            <button
              type="button"
              className="btn primary"
              onClick={() => st.sound && playSequence([...result.tones.map((x) => x.midi), result.tones[0].midi + 12])}
            >
              ▶ {t.play}
            </button>
          </div>
        )}

        {result.kind === 'chords' && (
          <>
            <div className="headline">
              <span className="symbol">{st.root + findChordKind(st.chord).suffix}</span>
              {result.current && (
                <div className="voicing-nav">
                  <button type="button" className="btn" aria-label={t.previous} onClick={() => set('voicing', st.voicing - 1)}>
                    ‹
                  </button>
                  <span>
                    {t.voicing} {mod(st.voicing, result.voicings.length) + 1} {t.of} {result.voicings.length} ·{' '}
                    {result.current.frets.some((f) => f === st.capo) ? t.open : `${t.fret} ${result.current.position}`}{' '}
                    <code className="frets-code">
                      {formatFrets(result.current.frets.map((f) => (f === null ? null : f - st.capo)))}
                    </code>
                  </span>
                  <button type="button" className="btn" aria-label={t.next} onClick={() => set('voicing', st.voicing + 1)}>
                    ›
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() =>
                      st.sound && strum(result.current!.frets.flatMap((f, s) => (f === null ? [] : [midi[s] + f])))
                    }
                  >
                    ▶ {t.strum}
                  </button>
                </div>
              )}
            </div>
            {st.chordView === 'voicings' && result.voicings.length === 0 && <p className="notice">{t.noVoicing}</p>}
          </>
        )}

        {result.kind === 'caged' && !result.supported && <p className="notice">{t.cagedNeedsStandard}</p>}
        {result.kind === 'caged' && result.supported && (
          <div className="headline">
            <span className="symbol">
              {st.root}
              {st.quality === 'minor' ? 'm' : ''}
            </span>
          </div>
        )}

        {result.kind === 'finder' && (
          <>
            <div className="headline">
              <span className="symbol">
                {result.names.length > 0 ? prettyChordName(result.names[0]) : result.midis.length > 0 ? '?' : '—'}
              </span>
              <button type="button" className="btn" onClick={() => set('picked', [])}>
                {t.clear}
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={result.midis.length === 0}
                onClick={() => st.sound && strum(result.midis)}
              >
                ▶ {t.strum}
              </button>
            </div>
            {result.names.length > 1 && (
              <p className="aka">
                {t.alsoKnownAs}: {result.names.slice(1).map(prettyChordName).join(' · ')}
              </p>
            )}
            <p className="hint">{result.midis.length >= 2 && result.names.length === 0 ? t.finderNone : t.finderHint}</p>
          </>
        )}

        <ToneChips tones={result.tones} compound={result.kind === 'chords' || result.kind === 'finder'} onPlay={play} />
      </section>

      <section className={vertical ? 'board board-vertical' : 'board'}>
        <div className="scroller">
          <Fretboard
            view={result.board}
            tuning={midi}
            frets={st.frets}
            capo={st.capo}
            vertical={vertical}
            leftHanded={st.leftHanded}
            ariaLabel={t.neckLabel}
            onTap={onTap}
          />
        </div>
      </section>

      <footer className="foot">
        <p>{t.footer}</p>
      </footer>
    </div>
  )
}

const mod = (n: number, m: number): number => ((n % m) + m) % m

function Settings({
  st,
  t,
  set,
  patch,
}: {
  st: State
  t: Strings
  set: <K extends keyof State>(key: K, value: State[K]) => void
  patch: (p: Partial<State>) => void
}) {
  return (
    <details className="settings">
      <summary>
        {t.settings} · {findTuning(st.tuningId)[st.lang]}
        {st.capo > 0 ? ` · ${t.capo} ${st.capo}` : ''}
      </summary>
      <div className="settings-grid">
        <Field label={t.instrument}>
          <select value={st.tuningId} onChange={(e) => patch({ tuningId: e.target.value, picked: [], voicing: 0 })}>
            {TUNINGS.map((x) => (
              <option key={x.id} value={x.id}>
                {`${x[st.lang]} (${x.notes.map((n) => n.replace(/\d/g, '')).join(' ')})`}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.capo}>
          <select value={st.capo} onChange={(e) => patch({ capo: Number(e.target.value), voicing: 0 })}>
            {Array.from({ length: 13 }, (_, i) => (
              <option key={i} value={i}>
                {i === 0 ? t.noCapo : i}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.frets}>
          <select value={st.frets} onChange={(e) => patch({ frets: Number(e.target.value), voicing: 0 })}>
            {FRET_CHOICES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.layout}>
          <Segmented
            label={t.layout}
            value={st.layout}
            options={[
              { value: 'auto', label: t.layoutAuto },
              { value: 'horizontal', label: t.layoutHorizontal },
              { value: 'vertical', label: t.layoutVertical },
            ]}
            onChange={(v) => set('layout', v)}
          />
        </Field>
        <Field label={t.language}>
          <Segmented
            label={t.language}
            value={st.lang}
            options={[
              { value: 'en', label: 'English' },
              { value: 'pt', label: 'Português' },
            ]}
            onChange={(v) => set('lang', v)}
          />
        </Field>
        <label className="check">
          <input type="checkbox" checked={st.leftHanded} onChange={(e) => set('leftHanded', e.target.checked)} />
          {t.leftHanded}
        </label>
        <label className="check">
          <input type="checkbox" checked={st.sound} onChange={(e) => set('sound', e.target.checked)} />
          {t.sound}
        </label>
      </div>
    </details>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <span>{label}</span>
      {children}
    </div>
  )
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={className ? `segmented ${className}` : 'segmented'} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function ToneChips({ tones, compound, onPlay }: { tones: Tone[]; compound: boolean; onPlay: (midi: number) => void }) {
  if (tones.length === 0) return null
  return (
    <div className="tones">
      {tones.map((tone, i) => {
        const color = tone.interval ? degreeColor(tone.interval) : '#6b7280'
        return (
          <button
            key={i}
            type="button"
            className="tone"
            style={{ background: color, color: textColorOn(color) }}
            onClick={() => onPlay(tone.midi)}
          >
            <strong>{tone.name}</strong>
            {tone.interval && <span>{intervalLabel(tone.interval, compound)}</span>}
          </button>
        )
      })}
    </div>
  )
}

function Logo() {
  return (
    <svg className="logo" viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="11" fill="#3a291c" />
      {[12, 20, 28, 36].map((y) => (
        <line key={y} x1="6" x2="42" y1={y} y2={y} stroke="#d9d2c3" strokeWidth="1.4" />
      ))}
      {[17, 31].map((x) => (
        <line key={x} x1={x} x2={x} y1="8" y2="40" stroke="#b9b4ab" strokeWidth="2" />
      ))}
      <rect x="5" y="8" width="3" height="32" fill="#ece6d6" />
      <circle cx="24" cy="12" r="4.5" fill="#e5484d" />
      <circle cx="37" cy="20" r="4.5" fill="#f5c400" />
      <circle cx="24" cy="36" r="4.5" fill="#0091ff" />
    </svg>
  )
}
