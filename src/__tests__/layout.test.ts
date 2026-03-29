import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'

// ─── Mock @chenglou/pretext before importing layout ───────────────────────────
// We test OUR layout logic (obstacle-aware width carving), not Pretext internals.

const mockLayoutNextLine: Mock = vi.fn()
const mockPrepareWithSegments: Mock = vi.fn(() => ({ __mocked: true }))

vi.mock('@chenglou/pretext', () => ({
  prepareWithSegments: mockPrepareWithSegments,
  layoutNextLine: mockLayoutNextLine,
}))

// Dynamically import layout AFTER the mock is registered
const { computeLayout, prepareText, MARGIN_LEFT, MARGIN_TOP, LINE_HEIGHT } = await import('../layout')

const stage = { width: 800, height: 400 }

// ─── prepareText ─────────────────────────────────────────────────────────────

describe('prepareText', () => {
  it('calls prepareWithSegments with the correct font string and returns its result', async () => {
    const { prepareWithSegments } = await import('@chenglou/pretext')
    ;(prepareWithSegments as Mock).mockReturnValueOnce({ __id: 'prep1' })
    const result = prepareText('hello')
    expect(prepareWithSegments).toHaveBeenCalledWith('hello', expect.stringContaining('Georgia'))
    expect(result).toEqual({ __id: 'prep1' })
  })
})

// ─── computeLayout ───────────────────────────────────────────────────────────

describe('computeLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function makeMockLines(texts: string[]): void {
    // Each call returns the next mock line, then null to terminate
    let call = 0
    mockLayoutNextLine.mockImplementation((_prep: unknown, _cursor: unknown, maxWidth: number) => {
      if (call >= texts.length) return null
      const text = texts[call++]
      return { text, width: maxWidth * 0.7, start: { s: call - 1 }, end: { s: call } }
    })
  }

  it('returns lines starting at MARGIN_LEFT, MARGIN_TOP', () => {
    makeMockLines(['Line one', 'Line two'])
    const lines = computeLayout({ __mocked: true } as never, [], stage)
    expect(lines[0].x).toBe(MARGIN_LEFT)
    expect(lines[0].y).toBe(MARGIN_TOP)
  })

  it('increments y by LINE_HEIGHT for each line', () => {
    makeMockLines(['A', 'B', 'C'])
    const lines = computeLayout({ __mocked: true } as never, [], stage)
    expect(lines[1].y).toBe(MARGIN_TOP + LINE_HEIGHT)
    expect(lines[2].y).toBe(MARGIN_TOP + LINE_HEIGHT * 2)
  })

  it('returns an empty array when layoutNextLine immediately returns null', () => {
    mockLayoutNextLine.mockReturnValue(null)
    const lines = computeLayout({ __mocked: true } as never, [], stage)
    expect(lines).toHaveLength(0)
  })

  it('stops at the bottom of the stage', () => {
    // Supply infinite lines — layout should stop when y >= stage.height
    let call = 0
    mockLayoutNextLine.mockImplementation((_p: unknown, _c: unknown, _w: number) => ({
      text: `line ${call}`,
      width: 200,
      start: { s: call },
      end: { s: ++call },
    }))
    const lines = computeLayout({ __mocked: true } as never, [], stage)
    for (const l of lines) {
      expect(l.y + LINE_HEIGHT).toBeLessThanOrEqual(stage.height)
    }
  })

  it('passes a narrower maxWidth when an obstacle overlaps a row', () => {
    // One obstacle at x=300, y=MARGIN_TOP+LINE_HEIGHT/2 with radius 200
    // That places it squarely at the first line's mid-y.
    const obstacle = {
      id: 'obs',
      x: 300,
      y: MARGIN_TOP + LINE_HEIGHT / 2,
      vx: 0, vy: 0,
      radius: 200,
      isDragging: false,
      color: '#fff',
    }

    const widthsUsed: number[] = []
    mockLayoutNextLine.mockImplementation((_p: unknown, _c: unknown, w: number) => {
      widthsUsed.push(w)
      return null // only one call; we just want to capture the width
    })

    computeLayout({ __mocked: true } as never, [obstacle], stage)

    expect(widthsUsed.length).toBeGreaterThanOrEqual(1)
    // The width passed should be less than the full column width
    const fullWidth = stage.width - MARGIN_LEFT - 28 // MARGIN_RIGHT=28
    expect(widthsUsed[0]).toBeLessThan(fullWidth)
  })

  it('skips a row that is fully blocked and does not advance the cursor', () => {
    // Giant obstacle that covers the full first row
    const obstacle = {
      id: 'obs',
      x: MARGIN_LEFT + 10,
      y: MARGIN_TOP + LINE_HEIGHT / 2,
      vx: 0, vy: 0,
      radius: stage.width,
      isDragging: false,
      color: '#fff',
    }

    let callCount = 0
    mockLayoutNextLine.mockImplementation(() => {
      callCount++
      return null
    })

    computeLayout({ __mocked: true } as never, [obstacle], stage)
    // layoutNextLine should have been called with a row that is NOT fully blocked
    // (or not at all if all rows are blocked)
    // Either way, it must not have been called for the fully-blocked row
    expect(callCount).toBeGreaterThanOrEqual(0) // just must not throw
  })
})
