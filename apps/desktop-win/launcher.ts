// ─── RahyAr AI — Standalone Windows Desktop Application Entrypoint (Bun Compile + SQLite WAL + Embedded UI) ──
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createRahyarBackend } from '../backend/src/server'
import uiHtml from './dist/index.html' with { type: 'text' }

const args = new Set(process.argv.slice(2))
const selfCheck = args.has('--self-check')
const noLaunch = args.has('--no-window') || selfCheck

const localAppData = process.env.LOCALAPPDATA || process.cwd()
const dataDir = join(localAppData, 'RahyArAI')
mkdirSync(dataDir, { recursive: true })
const dbPath = process.env.RAHYAR_DB_PATH || join(dataDir, 'rahyar-desktop.sqlite')

const core = createRahyarBackend(dbPath)
const port = selfCheck ? 0 : Number(process.env.RAHYAR_PORT || 4310)

const server = Bun.serve({
  port,
  async fetch(req: Request) {
    const url = new URL(req.url)
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(uiHtml, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Security-Policy': "default-src 'self' 'unsafe-inline'; connect-src 'self' http://127.0.0.1:* http://localhost:*;",
        },
      })
    }
    if (url.pathname === '/api/v1/os/notify' && req.method === 'POST') {
      const body = (await req.json()) as { title?: string; message?: string }
      const title = String(body.title || 'RahyAr AI').replace(/['"]/g, '')
      const msg = String(body.message || 'Reminder').replace(/['"]/g, '')
      try {
        // Trigger real Windows Toast via PowerShell WinRT (non-blocking)
        const ps = `[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null; $tpl = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02); $nodes = $tpl.GetElementsByTagName('text'); $nodes.Item(0).AppendChild($tpl.CreateTextNode('${title}')) > $null; $nodes.Item(1).AppendChild($tpl.CreateTextNode('${msg}')) > $null; $toast = [Windows.UI.Notifications.ToastNotification]::new($tpl); [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('RahyAr AI').Show($toast)`
        Bun.spawn(['powershell', '-NoProfile', '-WindowStyle', 'Hidden', '-Command', ps], { stdout: 'ignore', stderr: 'ignore' })
        return Response.json({ ok: true, delivered: 'windows_toast' })
      } catch (e) {
        return Response.json({ ok: false, error: String(e) }, { status: 500 })
      }
    }
    return core.handleRequest(req)
  },
})

const baseUrl = `http://127.0.0.1:${server.port}`
console.log(`RAHYAR_DESKTOP_READY url=${baseUrl} db=${dbPath}`)

if (selfCheck) {
  const h = await (await fetch(`${baseUrl}/healthz`)).json()
  const uiRes = await fetch(`${baseUrl}/`)
  const cal = await (await fetch(`${baseUrl}/api/v1/calendar/month?gy=2026&gm=11&locale=fa`)).json() as { cells: unknown[] }
  console.log(JSON.stringify({ selfCheck: true, health: h, uiStatus: uiRes.status, calendarCells: cal.cells.length, dbPath }))
  server.stop(true)
  core.close()
  process.exit(0)
}

if (!noLaunch) {
  // Open standalone borderless Windows Desktop App Window via built-in Edge WebView2
  try {
    Bun.spawn(['cmd', '/c', 'start', '', 'msedge', `--app=${baseUrl}`, '--window-size=1180,780'], {
      stdout: 'ignore',
      stderr: 'ignore',
    })
  } catch {
    console.log(`Open RahyAr AI manually at ${baseUrl}`)
  }
}
