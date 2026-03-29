import { prepareText, computeLayout, LINE_HEIGHT } from './layout'
import type { PreparedText } from './layout'
import {
  createDefaultObstacles,
  updateObstacle,
  startDrag,
  dragTo,
  endDrag,
  hitTest,
  replaceById,
} from './obstacles'
import type { Obstacle } from './obstacles'
import { createDomPool, renderDOM, renderCanvas, resizeCanvas } from './renderer'
import type { Vec2 } from './physics'

// ─── Default text ────────────────────────────────────────────────────────────

const DEFAULT_TEXT = `Typography is the art and technique of arranging type to make written language legible, readable, and appealing when displayed. The arrangement of type involves selecting typefaces, point sizes, line lengths, line spacing, and letter spacing, as well as adjusting the space between pairs of letters.

The term typography is also applied to the style, arrangement, and appearance of the letters, numbers, and symbols created by the process. Type design is a closely related craft, sometimes considered part of typography; most typographers do not design typefaces, and some type designers do not consider themselves typographers.

Typography also may be used as a decorative device, unrelated to the communication of information. Typography is the work of typesetters, compositors, typographers, graphic designers, art directors, manga artists, comic book artists, graffiti artists, and, now, anyone who arranges words, letters, numbers, and symbols for publication, display, or distribution—from clerical workers and newsletter writers to anyone self-publishing materials.`

// ─── Boot ────────────────────────────────────────────────────────────────────

const stage = document.getElementById('stage') as HTMLElement
const canvas = document.getElementById('canvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
const textInput = document.getElementById('text-input') as HTMLTextAreaElement
const panelToggle = document.getElementById('panel-toggle') as HTMLButtonElement
const panelBody = document.getElementById('panel-body') as HTMLElement

// How many DOM pool slots to pre-allocate
const MAX_LINES = Math.ceil(window.innerHeight / LINE_HEIGHT) + 8
const pool = createDomPool(stage, MAX_LINES)

textInput.value = DEFAULT_TEXT

let prepared: PreparedText = prepareText(DEFAULT_TEXT)
let obstacles: Obstacle[] = createDefaultObstacles({
  width: window.innerWidth,
  height: window.innerHeight,
})
let mouse: Vec2 = { x: -9999, y: -9999 }
let dragId: string | null = null
let pendingPrepare = false
let lastTime = 0

// ─── Panel toggle ─────────────────────────────────────────────────────────────

panelToggle.addEventListener('click', () => {
  panelBody.classList.toggle('open')
})

// ─── Text editing (debounced re-prepare) ──────────────────────────────────────

let debounceTimer = 0
textInput.addEventListener('input', () => {
  clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    pendingPrepare = true
  }, 250)
})

// ─── Mouse / touch events ────────────────────────────────────────────────────

function pointerCoords(e: MouseEvent | Touch): Vec2 {
  return { x: e.clientX, y: e.clientY }
}

canvas.style.pointerEvents = 'none' // canvas doesn't capture pointer events
stage.addEventListener('mousemove', e => {
  mouse = pointerCoords(e)
  if (dragId !== null) {
    obstacles = replaceById(obstacles, dragId, o => dragTo(o, mouse.x, mouse.y))
  }
})

stage.addEventListener('mousedown', e => {
  const hit = hitTest(obstacles, e.clientX, e.clientY)
  if (hit !== null) {
    dragId = hit
    obstacles = replaceById(obstacles, dragId, startDrag)
  }
})

stage.addEventListener('mouseup', () => {
  if (dragId !== null) {
    obstacles = replaceById(obstacles, dragId, endDrag)
    dragId = null
  }
})

stage.addEventListener('mouseleave', () => {
  mouse = { x: -9999, y: -9999 }
  if (dragId !== null) {
    obstacles = replaceById(obstacles, dragId, endDrag)
    dragId = null
  }
})

// Touch support
stage.addEventListener('touchstart', e => {
  e.preventDefault()
  const t = e.touches[0]
  const hit = hitTest(obstacles, t.clientX, t.clientY)
  if (hit !== null) {
    dragId = hit
    obstacles = replaceById(obstacles, dragId, startDrag)
  }
}, { passive: false })

stage.addEventListener('touchmove', e => {
  e.preventDefault()
  const t = e.touches[0]
  mouse = pointerCoords(t)
  if (dragId !== null) {
    obstacles = replaceById(obstacles, dragId, o => dragTo(o, t.clientX, t.clientY))
  }
}, { passive: false })

stage.addEventListener('touchend', () => {
  if (dragId !== null) {
    obstacles = replaceById(obstacles, dragId, endDrag)
    dragId = null
  }
})

// ─── Resize handling ─────────────────────────────────────────────────────────

// Resize canvas to fill the viewport whenever the window size changes.
// We use a ResizeObserver on the stage element so we don't miss CSS-driven
// size changes (e.g., on mobile orientation change).
const resizeObserver = new ResizeObserver(() => {
  resizeCanvas(canvas)
})
resizeObserver.observe(stage)
resizeCanvas(canvas)

// ─── rAF loop ─────────────────────────────────────────────────────────────────

function loop(timestamp: number): void {
  const dt = lastTime === 0 ? 0 : timestamp - lastTime
  lastTime = timestamp

  // Re-prepare text if the textarea changed (debounced)
  if (pendingPrepare) {
    prepared = prepareText(textInput.value || DEFAULT_TEXT)
    pendingPrepare = false
  }

  // Update phase: advance obstacle physics
  const bounds = { width: stage.clientWidth, height: stage.clientHeight }
  obstacles = obstacles.map(o => updateObstacle(o, dt, mouse, bounds))

  // Layout phase: compute text lines around obstacles
  const lines = computeLayout(prepared, obstacles, bounds)

  // Render phase: sync DOM pool + redraw canvas
  renderDOM(lines, pool)
  renderCanvas(ctx, obstacles, mouse)

  requestAnimationFrame(loop)
}

requestAnimationFrame(loop)
