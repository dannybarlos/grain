import { test, expect } from '@playwright/test'

test.describe('Grain — interactive Pretext demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('page loads and shows the stage', async ({ page }) => {
    await expect(page.locator('#stage')).toBeVisible()
    await expect(page.locator('#canvas')).toBeVisible()
  })

  test('at least one text line is rendered within 3 seconds', async ({ page }) => {
    // Wait for the rAF loop to produce at least one visible line
    await page.waitForFunction(
      () => {
        const lines = document.querySelectorAll('.line')
        return Array.from(lines).some(el => (el as HTMLElement).style.display === 'block')
      },
      { timeout: 3000 },
    )

    const visibleLines = await page.$$eval(
      '.line',
      els => els.filter(el => (el as HTMLElement).style.display === 'block').length,
    )
    expect(visibleLines).toBeGreaterThan(0)
  })

  test('edit-text panel opens and closes', async ({ page }) => {
    const toggle = page.locator('#panel-toggle')
    const body = page.locator('#panel-body')

    await expect(body).not.toHaveClass(/open/)
    await toggle.click()
    await expect(body).toHaveClass(/open/)
    await toggle.click()
    await expect(body).not.toHaveClass(/open/)
  })

  test('typing in the textarea triggers a layout update', async ({ page }) => {
    // Open the panel
    await page.locator('#panel-toggle').click()

    // Wait for initial lines to appear
    await page.waitForFunction(
      () => document.querySelectorAll('.line[style*="display: block"]').length > 0,
      { timeout: 3000 },
    )

    // Change the text
    const textarea = page.locator('#text-input')
    await textarea.fill('Short text only.')

    // After debounce + rAF, lines should update (text is much shorter → fewer lines)
    await page.waitForTimeout(400) // 250ms debounce + a couple of frames

    const lineCount = await page.$$eval(
      '.line',
      els => els.filter(el => (el as HTMLElement).style.display === 'block').length,
    )
    // Short text should result in very few lines
    expect(lineCount).toBeLessThan(10)
  })

  test('canvas is rendered at the correct device pixel ratio size', async ({ page }) => {
    const { canvasWidth, canvasHeight, clientWidth, clientHeight, dpr } = await page.evaluate(() => {
      const canvas = document.getElementById('canvas') as HTMLCanvasElement
      return {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
        dpr: window.devicePixelRatio || 1,
      }
    })
    expect(canvasWidth).toBeCloseTo(clientWidth * dpr, -1)
    expect(canvasHeight).toBeCloseTo(clientHeight * dpr, -1)
  })
})
