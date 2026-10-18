// ─── ممیزی DOM زنده — یافتن متن فارسی در رابط انگلیسی ─────────
// از agent-browser استفاده می‌کند؛ باید نشست ان فعال باشد
import { execSync } from 'node:child_process'

const VIEWS = [
  ['today', 'today'],
  ['tasks', 'tasks'],
  ['calendar', 'calendar'],
  ['assistant', 'assistant'],
  ['plan', 'plan'],
  ['finance', 'finance'],
  ['settings', 'settings'],
] as const

// ناوبری با شماره کلیدها (۱-۷) از sidebar
const keys: Record<string, string> = { today: '1', tasks: '2', calendar: '3', assistant: '4', plan: '5', finance: '6', settings: '7' }

function ab(cmd: string): string {
  return execSync(`agent-browser ${cmd}`, { encoding: 'utf8', timeout: 45000 })
}

const report: Record<string, string[]> = {}
for (const [name] of VIEWS) {
  try {
    if (name === 'finance' || name === 'settings') {
      ab(`find role button click --name "${name === 'finance' ? 'Finance' : 'Settings'}"`).toString()
    } else {
      ab(`press ${keys[name]}`).toString()
    }
    execSync('sleep 1.4')
    // متن قابل مشاهده صفحه اصلی (بدون اسکریپت)
    const txt = ab(`eval "(() => { const el = document.querySelector('main') || document.body; return el.innerText })()" --json 2>/dev/null || true`).toString()
    const m = txt.match(/"result":"((?:[^"\\]|\\.)*)"/) ?? txt.match(/"value":"((?:[^"\\]|\\.)*)"/)
    const text = m ? JSON.parse('"' + m[1] + '"') : txt
    const faLines = text.split('\n').filter((l: string) => /[\u0600-\u06FF]/.test(l)).map((l: string) => l.trim()).filter(Boolean)
    report[name] = [...new Set(faLines)].slice(0, 25)
  } catch (e) {
    report[name] = ['<error: ' + (e as Error).message.slice(0, 60) + '>']
  }
}
for (const [k, v] of Object.entries(report)) {
  console.log(`\n=== ${k} — ${v.length} مورد ===`)
  for (const l of v) console.log('  · ' + l.slice(0, 80))
}
