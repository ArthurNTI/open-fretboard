// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Entry point: mounts the app.
 *
 * Author: Arthur (ArthurNTI) · Created: 2026-10-28
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
