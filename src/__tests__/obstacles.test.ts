import { describe, it, expect } from 'vitest'
import {
  createObstacle,
  createDefaultObstacles,
  updateObstacle,
  startDrag,
  dragTo,
  endDrag,
  hitTest,
  replaceById,
} from '../obstacles'

const bounds = { width: 800, height: 600 }
const mouse = { x: -9999, y: -9999 } // off-screen → no repel

// ─── createObstacle ───────────────────────────────────────────────────────────

describe('createObstacle', () => {
  it('sets all fields correctly', () => {
    const o = createObstacle('x', 10, 20, 30, '#ff0000')
    expect(o.id).toBe('x')
    expect(o.x).toBe(10)
    expect(o.y).toBe(20)
    expect(o.radius).toBe(30)
    expect(o.color).toBe('#ff0000')
    expect(o.isDragging).toBe(false)
    expect(o.vx).toBe(0)
    expect(o.vy).toBe(0)
  })

  it('accepts custom velocity', () => {
    const o = createObstacle('x', 0, 0, 10, '#fff', 0.5, -0.3)
    expect(o.vx).toBe(0.5)
    expect(o.vy).toBe(-0.3)
  })
})

// ─── createDefaultObstacles ──────────────────────────────────────────────────

describe('createDefaultObstacles', () => {
  it('returns exactly three obstacles', () => {
    expect(createDefaultObstacles(bounds)).toHaveLength(3)
  })

  it('all obstacles are within bounds', () => {
    for (const o of createDefaultObstacles(bounds)) {
      expect(o.x).toBeGreaterThan(0)
      expect(o.x).toBeLessThan(bounds.width)
      expect(o.y).toBeGreaterThan(0)
      expect(o.y).toBeLessThan(bounds.height)
    }
  })

  it('all obstacles have unique ids', () => {
    const ids = createDefaultObstacles(bounds).map(o => o.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// ─── updateObstacle ──────────────────────────────────────────────────────────

describe('updateObstacle', () => {
  it('moves the obstacle by its velocity', () => {
    const o = createObstacle('x', 100, 100, 10, '#fff', 1, 2)
    const updated = updateObstacle(o, 10, mouse, bounds)
    expect(updated.x).toBeCloseTo(110)
    expect(updated.y).toBeCloseTo(120)
  })

  it('does not move a dragged obstacle', () => {
    const o = { ...createObstacle('x', 100, 100, 10, '#fff', 5, 5), isDragging: true }
    const updated = updateObstacle(o, 100, mouse, bounds)
    expect(updated.x).toBe(100)
    expect(updated.y).toBe(100)
  })

  it('does not mutate the input obstacle', () => {
    const o = createObstacle('x', 100, 100, 10, '#fff', 1, 1)
    const frozen = Object.freeze(o)
    expect(() => updateObstacle(frozen, 10, mouse, bounds)).not.toThrow()
  })

  it('never produces NaN positions', () => {
    const o = createObstacle('x', 400, 300, 20, '#fff', 0.01, 0.01)
    const updated = updateObstacle(o, 16, mouse, bounds)
    expect(isNaN(updated.x)).toBe(false)
    expect(isNaN(updated.y)).toBe(false)
  })
})

// ─── startDrag / dragTo / endDrag ────────────────────────────────────────────

describe('drag lifecycle', () => {
  it('startDrag sets isDragging=true and zeroes velocity', () => {
    const o = createObstacle('x', 100, 100, 10, '#fff', 5, 5)
    const dragging = startDrag(o)
    expect(dragging.isDragging).toBe(true)
    expect(dragging.vx).toBe(0)
    expect(dragging.vy).toBe(0)
  })

  it('dragTo updates position', () => {
    const o = startDrag(createObstacle('x', 100, 100, 10, '#fff'))
    const moved = dragTo(o, 200, 300)
    expect(moved.x).toBe(200)
    expect(moved.y).toBe(300)
  })

  it('endDrag clears isDragging', () => {
    const o = startDrag(createObstacle('x', 100, 100, 10, '#fff'))
    expect(endDrag(o).isDragging).toBe(false)
  })

  it('none of the drag functions mutate the input', () => {
    const o = Object.freeze(createObstacle('x', 100, 100, 10, '#fff', 3, 3))
    expect(() => startDrag(o)).not.toThrow()
    expect(() => dragTo(o, 50, 50)).not.toThrow()
    expect(() => endDrag(o)).not.toThrow()
  })
})

// ─── hitTest ─────────────────────────────────────────────────────────────────

describe('hitTest', () => {
  const obstacles = [
    createObstacle('a', 100, 100, 50, '#f00'),
    createObstacle('b', 300, 300, 50, '#0f0'),
  ]

  it('returns the id of an obstacle when the point is inside', () => {
    expect(hitTest(obstacles, 100, 100)).toBe('a')
  })

  it('returns null when the point is outside all obstacles', () => {
    expect(hitTest(obstacles, 500, 500)).toBeNull()
  })

  it('returns the obstacle id when the point is exactly on the edge (inclusive boundary)', () => {
    // distance from (100,100) to (150,100) = 50 = radius; the edge is included
    expect(hitTest(obstacles, 150, 100)).toBe('a')
  })

  it('returns the last obstacle in array order when two overlap', () => {
    const stacked = [
      createObstacle('a', 100, 100, 50, '#f00'),
      createObstacle('b', 100, 100, 50, '#0f0'), // same position
    ]
    expect(hitTest(stacked, 100, 100)).toBe('b')
  })

  it('returns null for an empty array', () => {
    expect(hitTest([], 0, 0)).toBeNull()
  })
})

// ─── replaceById ─────────────────────────────────────────────────────────────

describe('replaceById', () => {
  it('applies the updater to the matching obstacle', () => {
    const obs = [
      createObstacle('a', 0, 0, 10, '#f00'),
      createObstacle('b', 50, 50, 10, '#0f0'),
    ]
    const result = replaceById(obs, 'b', o => ({ ...o, x: 999 }))
    expect(result.find(o => o.id === 'b')!.x).toBe(999)
    expect(result.find(o => o.id === 'a')!.x).toBe(0) // untouched
  })

  it('returns the same array length', () => {
    const obs = [createObstacle('a', 0, 0, 10, '#f00')]
    expect(replaceById(obs, 'a', o => o)).toHaveLength(1)
  })

  it('does nothing to unmatched ids', () => {
    const obs = [createObstacle('a', 0, 0, 10, '#f00')]
    const result = replaceById(obs, 'z', o => ({ ...o, x: 999 }))
    expect(result[0].x).toBe(0)
  })
})
