import { describe, expect, it } from 'vitest'
import { resolveAutoStart } from './autoStart'

describe('autoStart', () => {
  it('defaults to enabled', () => {
    expect(resolveAutoStart()).toBe(true)
  })

  it('reads explicit preference', () => {
    expect(resolveAutoStart({ autoStart: false })).toBe(false)
  })
})
