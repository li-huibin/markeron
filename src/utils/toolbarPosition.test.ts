import { describe, expect, it } from 'vitest'
import {
  clampToolbarWindowPosition,
  migratePhysicalToLogical,
  overlayClientToScreenLogical,
  toolbarPopupScreenPosition,
} from './toolbarPosition'

describe('overlayClientToScreenLogical', () => {
  it('adds monitor origin to overlay client coords (multi-monitor above primary)', () => {
    const monitor = { left: -283.3333333333333, top: -1440, width: 2560, height: 1440 }
    expect(overlayClientToScreenLogical(1310, 494, monitor)).toEqual({
      x: 1026.6666666666667,
      y: -946,
    })
  })
})

describe('toolbarPopupScreenPosition', () => {
  it('centers popup on pointer in screen logical space', () => {
    const monitor = { left: -283.3333333333333, top: -1440, width: 2560, height: 1440 }
    const pos = toolbarPopupScreenPosition(1310, 494, 272, 500, monitor)
    expect(pos.left).toBeCloseTo(890.6666666666667, 4)
    expect(pos.top).toBe(-1196)
  })

  it('falls back to viewport clamping when monitor bounds are unknown', () => {
    expect(toolbarPopupScreenPosition(400, 300, 272, 500, null, { width: 1920, height: 1080 })).toEqual({
      left: 264,
      top: 50,
    })
  })
})

describe('clampToolbarWindowPosition', () => {
  const monitor = { left: 0, top: 0, width: 1920, height: 1080 }

  it('keeps position inside monitor', () => {
    expect(clampToolbarWindowPosition(100, 200, 272, 400, monitor)).toEqual({ left: 100, top: 200 })
  })

  it('clamps panel dragged past right edge', () => {
    expect(clampToolbarWindowPosition(2000, 200, 272, 400, monitor).left).toBe(1920 - 272 - 8)
  })

  it('clamps panel dragged past bottom edge', () => {
    expect(clampToolbarWindowPosition(100, 900, 272, 400, monitor).top).toBe(1080 - 400 - 8)
  })
})

describe('migratePhysicalToLogical', () => {
  it('passes through logical coords unchanged', () => {
    const input = { left: 120, top: 80, coordSpace: 'logical' as const }
    expect(migratePhysicalToLogical(input, 1.25)).toEqual(input)
  })

  it('converts physical coords using scale factor', () => {
    expect(migratePhysicalToLogical({ left: 1250, top: 500, coordSpace: 'physical' }, 1.25)).toEqual({
      left: 1000,
      top: 400,
      coordSpace: 'logical',
    })
  })

  it('treats missing coordSpace as physical (legacy v1)', () => {
    expect(migratePhysicalToLogical({ left: 1500, top: 600 }, 1.5)).toEqual({
      left: 1000,
      top: 400,
      coordSpace: 'logical',
    })
  })

  it('falls back to scale 1 when scale factor is invalid', () => {
    expect(migratePhysicalToLogical({ left: 200, top: 100, coordSpace: 'physical' }, 0)).toEqual({
      left: 200,
      top: 100,
      coordSpace: 'logical',
    })
  })
})
