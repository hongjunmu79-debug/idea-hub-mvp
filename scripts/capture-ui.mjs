import http from 'node:http'
import { readFile, stat, mkdir } from 'node:fs/promises'
import path from 'node:path'

const modulePath = process.env.PLAYWRIGHT_MODULE
if (!modulePath) throw new Error('Set PLAYWRIGHT_MODULE to playwright/index.mjs')
const { chromium } = await import(modulePath)
const root = path.resolve('web/dist')
const output = path.resolve('docs/screenshots')
await mkdir(output, { recursive: true })

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' }
const server = http.createServer(async (request, response) => {
  if (request.url.startsWith('/api/')) {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(request.url.startsWith('/api/ideas') ? '[]' : '{"status":"ok"}')
    return
  }
  const requested = path.normalize(decodeURIComponent(request.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '')
  let file = path.join(root, requested === '/' ? 'index.html' : requested)
  try { if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html') }
  catch { file = path.join(root, 'index.html') }
  try {
    const body = await readFile(file)
    response.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' })
    response.end(body)
  } catch {
    response.writeHead(404); response.end('Not found')
  }
})

await new Promise(resolve => server.listen(4177, '127.0.0.1', resolve))
const browser = await chromium.launch({ headless: true })
try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
  await desktop.goto('http://127.0.0.1:4177', { waitUntil: 'networkidle' })
  await desktop.screenshot({ path: path.join(output, 'desktop-home.png'), fullPage: true })
  await desktop.getByRole('button', { name: /record this moment/i }).click()
  await desktop.screenshot({ path: path.join(output, 'desktop-capture.png'), fullPage: true })

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  await mobile.goto('http://127.0.0.1:4177', { waitUntil: 'networkidle' })
  await mobile.screenshot({ path: path.join(output, 'mobile-home.png'), fullPage: true })
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}

