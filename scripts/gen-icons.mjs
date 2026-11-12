// 用 Playwright 把 SVG 渲染成 PNG 图标:node scripts/gen-icons.mjs
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)('playwright')

const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#8c2f25"/>
  <text x="256" y="345" font-size="250" text-anchor="middle" fill="#f6f4ef"
    font-family="'Noto Serif CJK SC','Noto Sans CJK SC','PingFang SC',serif" font-weight="700">命</text>
</svg>`

const browser = await chromium.launch()
for (const [name, size] of [['icon-192', 192], ['icon-512', 512], ['apple-touch-icon', 180]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(`<body style="margin:0">${svg(size)}</body>`)
  await page.screenshot({ path: `public/icons/${name}.png` })
  await page.close()
}
await browser.close()
