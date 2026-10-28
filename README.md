# Open Fretboard

A free and open-source guitar fretboard visualizer. No ads, no tracking, no
subscriptions — every feature is available to everyone.

It runs in any modern browser and installs as an app (PWA) on Android, iPhone
and desktop, working offline after the first visit.

## Features

- **Scales and modes** — 22 scales (major, minor, pentatonics, blues, the seven
  modes, harmonic/melodic minor, diminished, whole tone…) on the whole neck.
- **Chords** — 25 chord types with playable voicings generated for the current
  tuning, browsable up the neck, plus a view with every chord tone.
- **CAGED** — the five shapes for major and minor chords, one at a time or all
  together, with the scale or pentatonic around each shape.
- **Chord finder** — tap notes on the neck (one per string) and get the chord
  name, including inversions such as `C/E`.
- **Sound** — tap any note, strum a voicing or play a scale. The plucked-string
  sound is synthesized (Karplus–Strong), so no audio samples are shipped.
- **Instruments and setup** — 14 tunings (standard, drop, open, DADGAD,
  7-string, 4/5-string bass, ukulele, cavaquinho), capo, 12–24 frets,
  horizontal or vertical neck, left-handed mode.
- Labels as note names or intervals, colored by scale degree.
- English and Brazilian Portuguese.

## Development

Requires Node.js 22 or newer.

```bash
npm install
npm run dev      # local server with hot reload
npm test         # music theory unit tests
npm run build    # type-check and build the PWA into dist/
```

Project layout:

| Path | What it holds |
|---|---|
| `src/theory/` | Music theory: tunings, scale/chord catalog, voicing search, CAGED, chord finder (on top of [Tonal](https://github.com/tonaljs/tonal)) |
| `src/board.ts` | Turns the current mode and settings into what the neck draws |
| `src/components/Fretboard.tsx` | The SVG neck |
| `src/audio/pluck.ts` | Karplus–Strong plucked-string synth (Web Audio) |
| `src/i18n.ts` | Interface strings |

Chord voicings are not copied from a chord book: they are searched for the
current tuning (every combination of chord tones a four-finger hand can fret
within four frets, with the root in the bass) and ranked.

To regenerate the app icons after editing `public/logo.svg`, run
`npm run icons`.

## Publishing

`.github/workflows/pages.yml` runs the tests, builds and deploys to GitHub
Pages on every push to `main` (enable Pages with "GitHub Actions" as the
source in the repository settings).

## License

[GPL-3.0-or-later](LICENSE). You may use, study, share and modify it; versions
you distribute must stay free under the same license.
