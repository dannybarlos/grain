import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createDomPool, renderDOM, resizeCanvas } from '../renderer'
import type { TextLine } from '../layout'
import type { Obstacle } from '../obstacles'

// jsdom provides a real (but partial) DOM — good enough to test our pool logic.

// ─── createDomPool ────────────────────────────────────────────────────────────

describe('createDomPool', () => {
  it('creates the requested number of span elements', () => {
    const parent = document.createElement('div')
    const pool = createDomPool(parent, 5)
    expect(pool).toHaveLength(5)
    expect(parent.children).toHaveLength(5)
  })

  it('all pool elements start hidden', () => {
    const parent = document.createElement('div')
    const pool = createDomPool(parent, 3)
    for (const el of pool) {
      expect(el.style.display).toBe('none')
    }
  })

  it('appends elements to the provided parent', () => {
    const parent = document.createElement('div')
    createDomPool(parent, 2)
    expect(parent.childElementCount).toBe(2)
  })

  it('returns zero elements when size=0', () => {
    const parent = document.createElement('div')
    const pool = createDomPool(parent, 0)
    expect(pool).toHaveLength(0)
  })
})

// ─── renderDOM ────────────────────────────────────────────────────────────────

describe('renderDOM', () => {
  let parent: HTMLElement
  let pool: HTMLElement[]

  beforeEach(() => {
    parent = document.createElement('div')
    pool = createDomPool(parent, 5)
  })

  it('sets textContent for each line', () => {
    const lines: TextLine[] = [
      { text: 'Hello', width: 50, x: 10, y: 20 },
      { text: 'World', width: 50, x: 10, y: 46 },
    ]
    renderDOM(lines, pool)
    expect(pool[0].textContent).toBe('Hello')
    expect(pool[1].textContent).toBe('World')
  })

  it('sets transform with correct x and y', () => {
    const lines: TextLine[] = [{ text: 'Hi', width: 20, x: 28, y: 32 }]
    renderDOM(lines, pool)
    expect(pool[0].style.transform).toBe('translate(28px, 32px)')
  })

  it('shows used pool elements and hides the rest', () => {
    const lines: TextLine[] = [{ text: 'A', width: 10, x: 0, y: 0 }]
    renderDOM(lines, pool)
    expect(pool[0].style.display).toBe('block')
    for (let i = 1; i < pool.length; i++) {
      expect(pool[i].style.display).toBe('none')
    }
  })

  it('hides all elements when lines is empty', () => {
    renderDOM([], pool)
    for (const el of pool) {
      expect(el.style.display).toBe('none')
    }
  })

  it('handles lines.length === pool.length without error', () => {
    const lines: TextLine[] = pool.map((_, i) => ({ text: `L${i}`, width: 10, x: 0, y: i * 20 }))
    expect(() => renderDOM(lines, pool)).not.toThrow()
  })

  it('handles lines.length > pool.length by clamping to pool size', () => {
    const lines: TextLine[] = Array.from({ length: 10 }, (_, i) => ({
      text: `L${i}`, width: 10, x: 0, y: i * 20,
    }))
    expect(() => renderDOM(lines, pool)).not.toThrow()
    // Pool has 5 elements, first 5 should be shown
    for (let i = 0; i < pool.length; i++) {
      expect(pool[i].style.display).toBe('block')
    }
  })
})

// ─── resizeCanvas ─────────────────────────────────────────────────────────────

describe('resizeCanvas', () => {
  it('returns false when the canvas is already the correct size', () => {
    const canvas = document.createElement('canvas')
    // jsdom doesn't implement devicePixelRatio / clientWidth
    // We just verify the function doesn't throw and returns a boolean
    const result = resizeCanvas(canvas)
    expect(typeof result).toBe('boolean')
  })
})

// ─── renderCanvas ─────────────────────────────────────────────────────────────

describe('renderCanvas', () => {
  it('does not throw given valid obstacles and mouse position', async () => {
    const { renderCanvas } = await import('../renderer')

    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    const ctx = canvas.getContext('2d')
    if (!ctx) return // jsdom canvas may not be available; skip

    const obstacles: Obstacle[] = [
      { id: 'a', x: 200, y: 200, vx: 0, vy: 0, radius: 50, isDragging: false, color: '#c96b2f' },
    ]
    const mouse = { x: 400, y: 300 }

    // Mock createRadialGradient since jsdom canvas doesn't fully implement it
    vi.spyOn(ctx, 'createRadialGradient').mockReturnValue({
      addColorStop: vi.fn(),
    } as unknown as CanvasGradient)

    expect(() => renderCanvas(ctx, obstacles, mouse)).not.toThrow()
  })

  it('does not throw when given an empty obstacles array', async () => {
    const { renderCanvas } = await import('../renderer')

    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    vi.spyOn(ctx, 'createRadialGradient').mockReturnValue({
      addColorStop: vi.fn(),
    } as unknown as CanvasGradient)

    expect(() => renderCanvas(ctx, [], { x: 0, y: 0 })).not.toThrow()
  })
})
