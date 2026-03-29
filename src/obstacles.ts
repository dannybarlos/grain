import { type Vec2, type Bounds, applyDrift, repelForce } from './physics'

export type Obstacle = {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly vx: number
  readonly vy: number
  readonly radius: number
  readonly isDragging: boolean
  readonly color: string
}

// How far the mouse repels obstacles (px)
export const MOUSE_REPEL_RADIUS = 160
// Impulse strength added to velocity per repel event
const MOUSE_REPEL_STRENGTH = 0.25

export function createObstacle(
  id: string,
  x: number,
  y: number,
  radius: number,
  color: string,
  vx = 0,
  vy = 0,
): Obstacle {
  return { id, x, y, vx, vy, radius, isDragging: false, color }
}

export function createDefaultObstacles(bounds: Bounds): Obstacle[] {
  return [
    createObstacle('a', bounds.width * 0.62, bounds.height * 0.28, 80, '#c96b2f', 0.045, 0.028),
    createObstacle('b', bounds.width * 0.78, bounds.height * 0.66, 60, '#4a7fc1', -0.032, 0.042),
    createObstacle('c', bounds.width * 0.88, bounds.height * 0.45, 50, '#5aaa6a', 0.052, -0.033),
  ]
}

/** Apply one physics tick (dt in ms) to an obstacle. Dragged obstacles are frozen. */
export function updateObstacle(
  o: Obstacle,
  dt: number,
  mouse: Vec2,
  bounds: Bounds,
): Obstacle {
  if (o.isDragging) return o

  const impulse = repelForce(
    { x: o.x, y: o.y },
    mouse,
    MOUSE_REPEL_RADIUS,
    MOUSE_REPEL_STRENGTH,
  )

  const vel: Vec2 = { x: o.vx + impulse.x, y: o.vy + impulse.y }

  const { pos, vel: newVel } = applyDrift(
    { x: o.x, y: o.y },
    vel,
    o.radius,
    bounds,
    dt,
  )

  return { ...o, x: pos.x, y: pos.y, vx: newVel.x, vy: newVel.y }
}

export function startDrag(o: Obstacle): Obstacle {
  return { ...o, isDragging: true, vx: 0, vy: 0 }
}

export function dragTo(o: Obstacle, x: number, y: number): Obstacle {
  return { ...o, x, y }
}

export function endDrag(o: Obstacle): Obstacle {
  return { ...o, isDragging: false }
}

/**
 * Return the id of the topmost obstacle whose circle contains (px, py),
 * or null if none. Checks in reverse array order so the last-added obstacle
 * is hit-tested first (painter's order).
 */
export function hitTest(
  obstacles: Obstacle[],
  px: number,
  py: number,
): string | null {
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i]
    const dx = px - o.x
    const dy = py - o.y
    if (dx * dx + dy * dy <= o.radius * o.radius) return o.id
  }
  return null
}

/** Replace the obstacle with the given id with an updated version. */
export function replaceById(
  obstacles: Obstacle[],
  id: string,
  updater: (o: Obstacle) => Obstacle,
): Obstacle[] {
  return obstacles.map(o => (o.id === id ? updater(o) : o))
}
