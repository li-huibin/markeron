const STORAGE_KEY = 'markeron-toolbar-position'
/** Legacy standalone window position (physical pixels). */
const WINDOW_STORAGE_KEY_V1 = 'markeron-toolbar-window-position'
/** Standalone window position (logical pixels). */
const WINDOW_STORAGE_KEY_V2 = 'markeron-toolbar-window-position-v2'

export type ToolbarCoordSpace = 'logical' | 'physical'

export interface ToolbarPosition {
  left: number
  top: number
  coordSpace?: ToolbarCoordSpace
}

function storageKey(forStandaloneWindow: boolean): string {
  return forStandaloneWindow ? WINDOW_STORAGE_KEY_V2 : STORAGE_KEY
}

function parseStoredPosition(raw: string): ToolbarPosition | null {
  try {
    const parsed = JSON.parse(raw) as ToolbarPosition
    if (typeof parsed.left !== 'number' || typeof parsed.top !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

/** Convert legacy physical screen coords to logical (WebView / Tauri LogicalPosition). */
export function migratePhysicalToLogical(position: ToolbarPosition, scaleFactor: number): ToolbarPosition {
  if (position.coordSpace === 'logical') return position
  const scale = scaleFactor > 0 ? scaleFactor : 1
  return {
    left: position.left / scale,
    top: position.top / scale,
    coordSpace: 'logical',
  }
}

export function loadToolbarPosition(forStandaloneWindow = false): ToolbarPosition | null {
  try {
    if (forStandaloneWindow) {
      const v2Raw = localStorage.getItem(WINDOW_STORAGE_KEY_V2)
      if (v2Raw) {
        const parsed = parseStoredPosition(v2Raw)
        if (parsed) return { ...parsed, coordSpace: parsed.coordSpace ?? 'logical' }
      }

      const v1Raw = localStorage.getItem(WINDOW_STORAGE_KEY_V1)
      if (!v1Raw) return null
      const legacy = parseStoredPosition(v1Raw)
      if (!legacy) return null
      return { ...legacy, coordSpace: legacy.coordSpace ?? 'physical' }
    }

    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return parseStoredPosition(raw)
  } catch {
    return null
  }
}

export function saveToolbarPosition(left: number, top: number, forStandaloneWindow = false): void {
  try {
    if (forStandaloneWindow) {
      const payload: ToolbarPosition = { left, top, coordSpace: 'logical' }
      localStorage.setItem(WINDOW_STORAGE_KEY_V2, JSON.stringify(payload))
      localStorage.removeItem(WINDOW_STORAGE_KEY_V1)
      return
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ left, top }))
  } catch {
    // ignore quota / private mode
  }
}
