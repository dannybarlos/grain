import type { TextLine } from './layout'
import type { Obstacle } from './obstacles'
import { MOUSE_REPEL_RADIUS } from './obstacles'
import type { Vec2 } from './physics'

// ─── DOM pool ───────────────────────────────────────────────────────────────

/** Allocate a fixed pool of span elements and append them to `parent`. */
export function createDomPool(parent: HTMLElement, size: number): HTMLElement[] {
  const pool: HTMLElement[] = []
  for (let i = 0; i < size; i++) {
    const el = document.createElement('span')
    el.className = 'line'
    el.style.display = 'none'
    parent.appendChild(el)
    pool.push(el)
  }
  return pool
}

/**
 * Sync the DOM pool to `lines`.
 * - Elements within the line count get their content and position updated.
 * - Elements beyond the line count are hidden.
 * No elements are created or removed (zero DOM mutations in the hot path).
 */
export function renderDOM(lines: TextLine[], pool: HTMLElement[]): void {
  const count = Math.min(lines.length, pool.length)
  for (let i = 0; i < count; i++) {
    const el = pool[i]
    const line = lines[i]
    el.textContent = line.text
    // Use transform instead of left/top to avoid triggering layout
    el.style.transform = `translate(${line.x}px, ${line.y}px)`
    el.style.display = 'block'
  }
  for (let i = count; i < pool.length; i++) {
    pool[i].style.display = 'none'
  }
}

// ─── Canvas ──────────────────────────────────────────────────────────────────

/**
 * Resize canvas to match its CSS display size (device-pixel-ratio aware).
 * Returns true when a resize actually happened (so callers can skip a frame).
 */
export function resizeCanvas(canvas: HTMLCanvasElement): boolean {
  const dpr = window.devicePixelRatio || 1
  const w = Math.round(canvas.clientWidth * dpr)
  const h = Math.round(canvas.clientHeight * dpr)
  if (canvas.width === w && canvas.height === h) return false
  canvas.width = w
  canvas.height = h
  return true
}

/**
 * Clear the canvas and draw all obstacles plus the mouse-repel aura.
 * All drawing uses a single clearRect + paint pass (no dirty-region tracking).
 */
export function renderCanvas(
  ctx: CanvasRenderingContext2D,
  obstacles: Obstacle[],
  mouse: Vec2,
): void {
  const { width, height } = ctx.canvas
  ctx.clearRect(0, 0, width, height)

  const dpr = window.devicePixelRatio || 1
  ctx.save()
  ctx.scale(dpr, dpr)

  // Mouse repel aura
  drawMouseAura(ctx, mouse)

  // Obstacles (back to front)
  for (const o of obstacles) {
    drawObstacle(ctx, o)
  }

  ctx.restore()
}

function drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle): void {
  ctx.save()

  // Soft glow
  ctx.shadowColor = o.color
  ctx.shadowBlur = 24

  // Fill
  ctx.beginPath()
  ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2)
  ctx.fillStyle = hexWithAlpha(o.color, 0.18)
  ctx.fill()

  // Stroke ring
  ctx.shadowBlur = 0
  ctx.beginPath()
  ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2)
  ctx.strokeStyle = hexWithAlpha(o.color, o.isDragging ? 0.9 : 0.55)
  ctx.lineWidth = o.isDragging ? 2 : 1.5
  ctx.stroke()

  ctx.restore()
}

function drawMouseAura(ctx: CanvasRenderingContext2D, mouse: Vec2): void {
  const r = MOUSE_REPEL_RADIUS
  const grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, r)
  grad.addColorStop(0, 'rgba(255,255,255,0.04)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')

  ctx.beginPath()
  ctx.arc(mouse.x, mouse.y, r, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()
}

/** Convert a hex color string and alpha into rgba(...). */
function hexWithAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
