// Where the backend lives. Resolution order:
//   1. localStorage override (editable in the Connections tab)
//   2. VITE_API_BASE baked in at build time (the GitHub Pages build points
//      at http://localhost:8787 — the backend running on your own machine)
//   3. '' — same origin (dev proxy, or the backend serving the built app)
const KEY = 'dashboard.apiBase'

function normalize(url) {
  return (url || '').trim().replace(/\/+$/, '')
}

export function getApiBase() {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored !== null) return normalize(stored)
  } catch {
    // localStorage can be unavailable (private mode) — fall through
  }
  return normalize(import.meta.env.VITE_API_BASE || '')
}

export function setApiBase(url) {
  try {
    const clean = normalize(url)
    if (clean) localStorage.setItem(KEY, clean)
    else localStorage.removeItem(KEY)
  } catch {
    // ignore — the override just won't persist
  }
}

export function apiUrl(path) {
  return `${getApiBase()}${path}`
}

// All backend calls go through here so the session cookie is sent — including
// cross-origin (credentials: 'include'), which the login flow relies on when
// the frontend (e.g. GitHub Pages) lives on a different origin than the backend.
export function apiFetch(path, options = {}) {
  return fetch(apiUrl(path), {
    credentials: 'include',
    ...options,
    headers: { accept: 'application/json', ...(options.headers || {}) },
  })
}
