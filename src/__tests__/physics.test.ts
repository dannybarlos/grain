import { describe, it, expect } from 'vitest'
import {
  circleIntervalAtY,
  lineWidthAtY,
  applyDrift,
  repelForce,
} from '../physics'

// ─── circleIntervalAtY ────────────────────────────────────────────────────────

describe('circleIntervalAtY', () => {
  it('returns the correct interval when y is at the circle center', () => {
    const result = circleIntervalAtY(100, 100, 50, 100)
    expect(result).toEqual([50, 150])
  })

  it('returns a narrower interval above the center', () => {
    const result = circleIntervalAtY(100, 100, 50, 125)
    expect(result).not.toBeNull()
    const [x1, x2] = result!
    expect(x2 - x1).toBeCloseTo(2 * Math.sqrt(50 * 50 - 25 * 25), 5)
  })

  it('returns null when y is exactly at the top edge of the circle', () => {
    expect(circleIntervalAtY(100, 100, 50, 50)).toBeNull()
  })

  it('returns null when y is above the circle', () => {
    expect(circleIntervalAtY(100, 100, 50, 49)).toBeNull()
  })

  it('returns null when y is below the circle', () => {
    expect(circleIntervalAtY(100, 100, 50, 151)).toBeNull()
  })

  it('returns null when y is exactly at the bottom edge', () => {
    expect(circleIntervalAtY(100, 100, 50, 150)).toBeNull()
  })

  it('is symmetric: interval is centred on cx', () => {
    const result = circleIntervalAtY(200, 100, 40, 110)
    expect(result).not.toBeNull()
    const [x1, x2] = result!
    expect((x1 + x2) / 2).toBeCloseTo(200, 5)
  })
})

// ─── lineWidthAtY ─────────────────────────────────────────────────────────────

describe('lineWidthAtY', () => {
  const margin = 20
  const stageWidth = 800
  const marginRight = 20

  it('returns full column width when there are no obstacles', () => {
    expect(lineWidthAtY(margin, stageWidth, marginRight, [])).toBe(stageWidth - margin - marginRight)
  })

  it('reduces width when an obstacle overlaps from the right', () => {
    // Obstacle at x=500, blocks [490, 510]
    const w = lineWidthAtY(margin, stageWidth, marginRight, [[490, 510]])
    expect(w).toBe(490 - margin)
  })

  it('ignores an obstacle that is entirely to the left of the margin', () => {
    const w = lineWidthAtY(margin, stageWidth, marginRight, [[0, margin - 1]])
    expect(w).toBe(stageWidth - margin - marginRight)
  })

  it('handles an obstacle that straddles the left margin', () => {
    // [10, 30] straddles margin=20 — available space starts at margin but obstacle
    // right edge (30) is inside the column, so right is reduced to max(10, 20) = 20
    const w = lineWidthAtY(margin, stageWidth, marginRight, [[10, 30]])
    expect(w).toBe(0) // margin=20, right=max(10,20)=20, width=20-20=0
  })

  it('takes the minimum across multiple overlapping obstacles', () => {
    const w = lineWidthAtY(margin, stageWidth, marginRight, [
      [600, 620],
      [400, 420],
    ])
    expect(w).toBe(400 - margin)
  })

  it('returns 0 when an obstacle covers the entire column', () => {
    const w = lineWidthAtY(margin, stageWidth, marginRight, [[margin, stageWidth]])
    expect(w).toBe(0)
  })
})

// ─── applyDrift ───────────────────────────────────────────────────────────────

describe('applyDrift', () => {
  const bounds = { width: 800, height: 600 }

  it('advances position by velocity × dt', () => {
    const { pos } = applyDrift({ x: 100, y: 100 }, { x: 1, y: 2 }, 10, bounds, 5)
    expect(pos.x).toBeCloseTo(105)
    expect(pos.y).toBeCloseTo(110)
  })

  it('does nothing when dt is 0', () => {
    const { pos, vel } = applyDrift({ x: 100, y: 100 }, { x: 5, y: 5 }, 10, bounds, 0)
    expect(pos).toEqual({ x: 100, y: 100 })
    expect(vel).toEqual({ x: 5, y: 5 })
  })

  it('does nothing when dt is negative', () => {
    const { pos } = applyDrift({ x: 100, y: 100 }, { x: 5, y: 5 }, 10, bounds, -1)
    expect(pos).toEqual({ x: 100, y: 100 })
  })

  it('bounces off the left wall', () => {
    const { pos, vel } = applyDrift({ x: 12, y: 100 }, { x: -5, y: 0 }, 10, bounds, 1)
    expect(pos.x).toBe(10) // clamped to radius
    expect(vel.x).toBeGreaterThan(0) // velocity reflected
  })

  it('bounces off the right wall', () => {
    const { pos, vel } = applyDrift({ x: 788, y: 100 }, { x: 5, y: 0 }, 10, bounds, 1)
    expect(pos.x).toBe(790) // bounds.width - radius
    expect(vel.x).toBeLessThan(0)
  })

  it('bounces off the top wall', () => {
    const { pos, vel } = applyDrift({ x: 100, y: 8 }, { x: 0, y: -5 }, 10, bounds, 1)
    expect(pos.y).toBe(10)
    expect(vel.y).toBeGreaterThan(0)
  })

  it('bounces off the bottom wall', () => {
    const { pos, vel } = applyDrift({ x: 100, y: 592 }, { x: 0, y: 5 }, 10, bounds, 1)
    expect(pos.y).toBe(590)
    expect(vel.y).toBeLessThan(0)
  })

  it('bounces in both axes when hitting a corner', () => {
    const { vel } = applyDrift({ x: 8, y: 8 }, { x: -5, y: -5 }, 10, bounds, 1)
    expect(vel.x).toBeGreaterThan(0)
    expect(vel.y).toBeGreaterThan(0)
  })

  it('does not produce NaN', () => {
    const { pos, vel } = applyDrift({ x: 400, y: 300 }, { x: 0.001, y: -0.001 }, 20, bounds, 16)
    expect(isNaN(pos.x)).toBe(false)
    expect(isNaN(pos.y)).toBe(false)
    expect(isNaN(vel.x)).toBe(false)
    expect(isNaN(vel.y)).toBe(false)
  })
})

// ─── repelForce ───────────────────────────────────────────────────────────────

describe('repelForce', () => {
  it('returns zero vector when mouse is outside repel radius', () => {
    const f = repelForce({ x: 0, y: 0 }, { x: 200, y: 0 }, 100, 50)
    expect(f).toEqual({ x: 0, y: 0 })
  })

  it('returns zero vector when mouse is exactly on the radius boundary', () => {
    const f = repelForce({ x: 0, y: 0 }, { x: 100, y: 0 }, 100, 50)
    expect(f).toEqual({ x: 0, y: 0 })
  })

  it('repels along the correct axis', () => {
    const f = repelForce({ x: 50, y: 100 }, { x: 50, y: 50 }, 100, 100)
    // Obstacle is directly below mouse — should be repelled downward (+y)
    expect(f.x).toBeCloseTo(0, 3)
    expect(f.y).toBeGreaterThan(0)
  })

  it('is stronger when mouse is closer', () => {
    const close = repelForce({ x: 10, y: 0 }, { x: 0, y: 0 }, 100, 100)
    const far = repelForce({ x: 80, y: 0 }, { x: 0, y: 0 }, 100, 100)
    expect(close.x).toBeGreaterThan(far.x)
  })

  it('handles the degenerate case where pos === mouse without NaN or throwing', () => {
    const f = repelForce({ x: 50, y: 50 }, { x: 50, y: 50 }, 100, 100)
    expect(isNaN(f.x)).toBe(false)
    expect(isNaN(f.y)).toBe(false)
    // Should push along +x axis
    expect(f.x).toBe(100)
    expect(f.y).toBe(0)
  })

  it('produces no NaN for any plausible input', () => {
    const cases: Array<[number, number, number, number]> = [
      [0, 0, 0, 0],
      [0.001, 0.001, 100, 10],
      [99.999, 0, 100, 10],
    ]
    for (const [dx, dy, r, s] of cases) {
      const f = repelForce({ x: dx, y: dy }, { x: 0, y: 0 }, r, s)
      expect(isNaN(f.x)).toBe(false)
      expect(isNaN(f.y)).toBe(false)
    }
  })
})
