import { LogicalSize, LogicalPosition } from '@tauri-apps/api/dpi'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { loadToolbarPosition, migratePhysicalToLogical, saveToolbarPosition } from './toolbarPosition'

export async function restoreToolbarWindowPosition(): Promise<void> {
  const saved = loadToolbarPosition(true)
  if (!saved) return
  const win = getCurrentWindow()
  const scale = await win.scaleFactor()
  const logical = migratePhysicalToLogical(saved, scale)
  await win.setPosition(new LogicalPosition(logical.left, logical.top))
  if (saved.coordSpace !== 'logical') {
    saveToolbarPosition(logical.left, logical.top, true)
  }
}

export async function saveToolbarWindowPosition(): Promise<void> {
  const win = getCurrentWindow()
  const [pos, scale] = await Promise.all([win.outerPosition(), win.scaleFactor()])
  const logical = pos.toLogical(scale)
  saveToolbarPosition(logical.x, logical.y, true)
}

export async function fitToolbarWindow(width: number, height: number): Promise<void> {
  if (width <= 0 || height <= 0) return
  const win = getCurrentWindow()
  await win.setSize(new LogicalSize(width, height))
}

/** Measure visible panel height for standalone toolbar window sizing. */
export function measureToolbarPanelHeight(panelEl: HTMLElement): number {
  const surface = panelEl.querySelector('.overlay-panel-surface')
  if (surface instanceof HTMLElement) {
    return Math.ceil(surface.getBoundingClientRect().height)
  }
  return Math.ceil(panelEl.getBoundingClientRect().height)
}
