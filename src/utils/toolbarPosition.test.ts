import { describe, expect, it } from 'vitest'
import { migratePhysicalToLogical } from './toolbarPosition'

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
