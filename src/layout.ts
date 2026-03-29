import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext'
import type { PreparedTextWithSegments, LayoutCursor } from '@chenglou/pretext'
import { circleIntervalAtY, lineWidthAtY } from './physics'
import type { Obstacle } from './obstacles'

export { type PreparedTextWithSegments as PreparedText }

export const FONT = '15px Georgia, serif'
export const LINE_HEIGHT = 26
export const MARGIN_LEFT = 28
export const MARGIN_RIGHT = 28
export const MARGIN_TOP = 32
// Don't bother rendering a line shorter than this (px)
const MIN_LINE_WIDTH = 48

// The cursor at the very start of any prepared text
const INITIAL_CURSOR: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }

export type TextLine = {
  text: string
  width: number
  x: number
  y: number
}

export function prepareText(text: string): PreparedTextWithSegments {
  return prepareWithSegments(text, FONT)
}

/**
 * Walk through `prepared` and produce layout lines, shrinking each row's
 * available width to account for any obstacles that intersect that y band.
 *
 * The cursor starts at INITIAL_CURSOR (beginning of text) and advances via
 * line.end. Lines that would be narrower than MIN_LINE_WIDTH are skipped
 * (the text cursor does NOT advance for skipped rows — those lines will be
 * laid out again once the obstacle moves away).
 */
export function computeLayout(
  prepared: PreparedTextWithSegments,
  obstacles: Obstacle[],
  stage: { width: number; height: number },
): TextLine[] {
  const lines: TextLine[] = []
  let cursor: LayoutCursor = INITIAL_CURSOR
  let y = MARGIN_TOP

  while (y + LINE_HEIGHT <= stage.height) {
    const midY = y + LINE_HEIGHT / 2

    const blocked = obstacles
      .map(o => circleIntervalAtY(o.x, o.y, o.radius, midY))
      .filter((i): i is [number, number] => i !== null)

    const w = lineWidthAtY(MARGIN_LEFT, stage.width, MARGIN_RIGHT, blocked)

    if (w < MIN_LINE_WIDTH) {
      // Row fully blocked — advance y without consuming text
      y += LINE_HEIGHT
      continue
    }

    const line = layoutNextLine(prepared, cursor, w)
    if (line === null) break // end of text

    lines.push({ text: line.text, width: line.width, x: MARGIN_LEFT, y })
    cursor = line.end
    y += LINE_HEIGHT
  }

  return lines
}
