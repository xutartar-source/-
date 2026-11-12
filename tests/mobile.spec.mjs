// 手机视口下的端到端检查。先 npm run build,再 npm run test:mobile。
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import assert from 'node:assert/strict'
const { chromium, devices } = createRequire(import.meta.url)('playwright')

const PORT = 4179
const URL = `http://localhost:${PORT}/`
const shots = 'tests/screenshots'
mkdirSync(shots, { recursive: true })

const server = spawn('node_modules/.bin/vite', ['preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' })
await new Promise((resolve, reject) => {
  server.stdout.on('data', (d) => String(d).includes('localhost') && resolve())
  server.on('exit', (code) => reject(new Error(`preview 退出:${code}`)))
  setTimeout(() => reject(new Error('preview 启动超时')), 20000)
})

const browser = await chromium.launch()
let failed = false
try {
  for (const [label, device] of [['iphone-se', devices['iPhone SE']], ['iphone-14', devices['iPhone 14']]]) {
    const context = await browser.newContext({ ...device, locale: 'zh-CN' })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    const noOverflow = async (where) => {
      const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])
      assert.ok(sw <= cw, `${label} ${where} 页面横向溢出:${sw} > ${cw}`)
    }

    await page.goto(URL)
    await page.getByRole('heading', { name: '八字排盘' }).waitFor()
    await noOverflow('表单')
    await page.screenshot({ path: `${shots}/${label}-1-form.png`, fullPage: true })

    // 触控目标不小于 44px
    for (const el of await page.locator('select, .seg button, button.primary').all()) {
      const box = await el.boundingBox()
      assert.ok(box.height >= 44, `${label} 控件高度不足 44px`)
    }

    // 输入:2000-01-01 12:00 乌鲁木齐,真太阳时为巳时
    await page.getByPlaceholder('可不填').fill('测试甲')
    await page.getByRole('radio', { name: '女' }).tap()
    await page.getByLabel('年', { exact: true }).selectOption('2000')
    await page.getByLabel('月', { exact: true }).selectOption('1')
    await page.getByLabel('日', { exact: true }).selectOption('1')
    await page.getByLabel('时', { exact: true }).selectOption('12')
    await page.getByLabel('分', { exact: true }).selectOption('0')
    await page.getByLabel('省份').selectOption('新疆')
    await page.getByLabel('城市').selectOption('乌鲁木齐')
    assert.equal(await page.getByLabel('经度').inputValue(), '87.6')
    await page.getByRole('button', { name: '排盘' }).tap()

    await page.getByRole('heading', { name: '测试甲 · 女' }).waitFor()
    const cells = await page.locator('.pillars .gz td').allTextContents()
    assert.equal(cells.join(''), '己丙戊丁卯子午巳', `${label} 四柱应为 己卯 丙子 戊午 丁巳`)
    assert.equal(await page.locator('.dayun .yun').count(), 10)
    await noOverflow('命盘')
    await page.screenshot({ path: `${shots}/${label}-2-chart.png`, fullPage: true })

    // 保存 → 返回 → 刷新后仍在 → 再打开
    await page.getByRole('button', { name: '保存', exact: true }).tap()
    await page.getByRole('button', { name: '已保存' }).waitFor()
    await page.getByRole('button', { name: '返回' }).tap()
    await page.reload()
    const item = page.locator('.history .item')
    assert.equal(await item.count(), 1)
    assert.ok((await item.textContent()).includes('己卯 丙子 戊午 丁巳'))
    await noOverflow('历史')
    await page.screenshot({ path: `${shots}/${label}-3-history.png`, fullPage: true })
    await item.tap()
    await page.getByRole('heading', { name: '测试甲 · 女' }).waitFor()

    // 农历输入:2023 年有闰二月
    await page.getByRole('button', { name: '返回' }).tap()
    await page.getByRole('radio', { name: '农历' }).tap()
    await page.getByLabel('年', { exact: true }).selectOption('2023')
    await page.getByLabel('月', { exact: true }).selectOption({ label: '闰二月' })
    await page.getByLabel('日', { exact: true }).selectOption({ label: '初一' })
    await page.getByRole('button', { name: '排盘' }).tap()
    await page.getByText('2023-03-22 12:00').waitFor()

    // PWA:manifest 与 service worker
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
    const manifest = await (await page.request.get(new globalThis.URL(manifestHref, URL).href)).json()
    assert.equal(manifest.display, 'standalone')
    assert.ok(manifest.icons.length >= 2)
    await page.waitForFunction(() => navigator.serviceWorker.getRegistration().then((r) => Boolean(r?.active)))

    assert.deepEqual(errors, [], `${label} 控制台报错`)
    await context.close()
    console.log(`✓ ${label} 通过`)
  }

  // 离线也能打开(service worker 已缓存)
  const context = await browser.newContext({ ...devices['iPhone 14'] })
  const page = await context.newPage()
  await page.goto(URL)
  await page.waitForFunction(() => navigator.serviceWorker.getRegistration().then((r) => Boolean(r?.active)))
  await page.reload() // 让 service worker 接管页面
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))
  await context.setOffline(true)
  await page.reload()
  await page.getByRole('button', { name: '排盘' }).tap()
  await page.locator('.pillars').waitFor()
  console.log('✓ 离线可用')
  await context.close()
} catch (e) {
  failed = true
  console.error(e)
} finally {
  await browser.close()
  server.kill()
}
process.exit(failed ? 1 : 0)
