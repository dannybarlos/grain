/** Pure math: no DOM, no side effects. All functions return new values. */

export type Vec2 = { readonly x: number; readonly y: number }
export type Bounds = { readonly width: number; readonly height: number }

/**
 * The x interval [xMin, xMax] that a circle at (cx, cy) with radius r
 * blocks at a given y coordinate. Returns null when y is outside the circle.
 */
export function circleIntervalAtY(
  cx: number,
  cy: number,
  r: number,
  y: number,
): [number, number] | null {
  const dy = y - cy
  if (Math.abs(dy) >= r) return null
  const dx = Math.sqrt(r * r - dy * dy)
  return [cx - dx, cx + dx]
}

/**
 * Given a column starting at `marginLeft` with total right edge at `stageWidth`,
 * return the available text width for a line at a given y, after subtracting
 * any obstacle circles that overlap the column from the right.
 *
 * Text is left-aligned: we find the leftmost obstacle edge that falls inside
 * the column and use that as the right bound for the line.
 */
export function lineWidthAtY(
  marginLeft: number,
  stageWidth: number,
  marginRight: number,
  blockedIntervals: Array<[number, number]>,
): number {
  const maxRight = stageWidth - marginRight
  let right = maxRight

  for (const [x1, x2] of blockedIntervals) {
    // Obstacle fully to the left of the margin: ignore it
    if (x2 <= marginLeft) continue
    // Obstacle overlaps the column: the right edge of available space is the
    // leftmost point of the obstacle that's inside the column
    const obstacleLeft = Math.max(x1, marginLeft)
    right = Math.min(right, obstacleLeft)
  }

  return Math.max(0, right - marginLeft)
}

/**
 * Advance obstacle position by dt milliseconds with wall bouncing.
 * Returns updated pos and vel; does NOT mutate inputs.
 */
export function applyDrift(
  pos: Vec2,
  vel: Vec2,
  radius: number,
  bounds: Bounds,
  dt: number,
): { pos: Vec2; vel: Vec2 } {
  if (dt <= 0) return { pos, vel }

  let nx = pos.x + vel.x * dt
  let ny = pos.y + vel.y * dt
  let nvx = vel.x
  let nvy = vel.y

  if (nx - radius < 0) {
    nx = radius
    nvx = Math.abs(nvx)
  } else if (nx + radius > bounds.width) {
    nx = bounds.width - radius
    nvx = -Math.abs(nvx)
  }

  if (ny - radius < 0) {
    ny = radius
    nvy = Math.abs(nvy)
  } else if (ny + radius > bounds.height) {
    ny = bounds.height - radius
    nvy = -Math.abs(nvy)
  }

  return { pos: { x: nx, y: ny }, vel: { x: nvx, y: nvy } }
}

/**
 * Compute an impulse Vec2 that repels `pos` away from `mouse`.
 * The force is proportional to proximity: maximum at distance 0, zero at `repelRadius`.
 * When pos === mouse exactly, the impulse is pushed along the +x axis.
 */
export function repelForce(
  pos: Vec2,
  mouse: Vec2,
  repelRadius: number,
  strength: number,
): Vec2 {
  const dx = pos.x - mouse.x
  const dy = pos.y - mouse.y
  const distSq = dx * dx + dy * dy

  if (distSq >= repelRadius * repelRadius) return { x: 0, y: 0 }

  // Degenerate case: pos and mouse are at the same point — push along +x
  if (distSq === 0) return { x: strength, y: 0 }

  const dist = Math.sqrt(distSq)
  const t = 1 - dist / repelRadius // 1 at center, 0 at edge
  const force = strength * t

  return {
    x: (dx / dist) * force,
    y: (dy / dist) * force,
  }
}
