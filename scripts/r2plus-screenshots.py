# -*- coding: utf-8 -*-
"""R2+ real-evidence screenshots — 14+ PNG files from the running production app.
No secrets displayed; owner password comes from artifacts (never printed)."""
import json, os, sys, time
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:3000'
OUT = '/home/z/my-project/artifacts/media/screenshots'
os.makedirs(OUT, exist_ok=True)
PW_FILE = '/home/z/my-project/artifacts/rahyar-audit/OWNER_TEMP_PASSWORD.txt'
OWNER_PW = open(PW_FILE).read().strip()
AI_MSG = 'یک برنامه ساده برای امروز پیشنهاد بده'
shots = []
log = []

def shot(page, name, full=False):
    p = f'{OUT}/{name}.png'
    if os.path.exists(p) and os.path.getsize(p) > 20000 and name not in ('12-network-error-offline','13-network-recovered'):
        shots.append(name); print(f'  [{name}] exists, skip'); return
    page.screenshot(path=p, full_page=full)
    shots.append(name)
    log.append(f'{name}: {os.path.getsize(p)} bytes')
    print(f'  [{len(shots):02d}] {name}.png ({os.path.getsize(p)//1024} KB)')

def nav(page, label):
    # sidebar (desktop) or mobile dock nav button by exact label
    btn = page.locator(f'button:has-text("{label}")').first
    btn.wait_for(state='visible', timeout=15000)
    btn.click()

def settle(page, ms=1600):
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(ms)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ---------- 1) login page (logged out) ----------
    ctx = browser.new_context(viewport={'width': 1440, 'height': 900}, locale='fa-IR')
    page = ctx.new_page()
    page.goto(f'{BASE}/login', wait_until='networkidle')
    settle(page)
    shot(page, '01-login-fa')

    # ---------- real UI login ----------
    page.fill('#username', 'owner')
    page.fill('#password', OWNER_PW)
    page.click('button[type="submit"]')
    page.wait_for_url(f'{BASE}/', timeout=25000)
    settle(page, 2500)
    shot(page, '02-dashboard-today-fa')

    # ---------- assistant ----------
    nav(page, 'دستیار')
    settle(page, 1800)
    shot(page, '03-assistant-fa')

    # ---------- real AI answer ----------
    box = page.locator('textarea, input[placeholder]').last
    box.fill(AI_MSG)
    page.keyboard.press('Enter')
    # wait until the user's message appears and assistant responds (poll chat text growth)
    t0 = time.time()
    prev = ''
    stable = 0
    while time.time() - t0 < 120:
        page.wait_for_timeout(4000)
        body = page.locator('main, body').first.inner_text()
        if AI_MSG in body and '...' not in body[-30:]:
            # assistant reply = text after our message that is not ours
            tail = body.split(AI_MSG)[-1].strip()
            if len(tail) > 40 and tail[:60] != prev[:60]:
                prev = tail; stable = 0
            elif len(tail) > 40:
                stable += 1
                if stable >= 2: break
    print('  AI reply waited', round(time.time()-t0), 's')
    shot(page, '04-ai-real-answer-fa')

    # ---------- tasks ----------
    nav(page, 'کارها')
    settle(page, 2000)
    shot(page, '05-tasks-fa')

    # ---------- calendar ----------
    nav(page, 'تقویم')
    settle(page, 2000)
    shot(page, '06-calendar-fa')

    # ---------- finance ----------
    nav(page, 'مالی')
    settle(page, 2200)
    shot(page, '07-finance-fa')

    # ---------- plan ----------
    nav(page, 'برنامه')
    settle(page, 2000)
    shot(page, '08-plan-fa')

    # ---------- settings ----------
    nav(page, 'تنظیمات')
    settle(page, 2000)
    shot(page, '09-settings-fa')

    # ---------- switch language to EN via settings UI/API then shot LTR ----------
    r = ctx.request.put(f'{BASE}/api/settings/app',
        headers={'Origin': BASE, 'Content-Type': 'application/json'},
        data=json.dumps({'lang': 'en'}))
    log.append(f'lang->en: {r.status}')
    page.goto(f'{BASE}/', wait_until='networkidle')
    settle(page, 2500)
    shot(page, '10-dashboard-english-ltr')
    # tasks view in english too
    nav(page, 'Tasks')
    settle(page, 1500)
    shot(page, '11-tasks-english-ltr')
    # back to fa
    r = ctx.request.put(f'{BASE}/api/settings/app',
        headers={'Origin': BASE, 'Content-Type': 'application/json'},
        data=json.dumps({'lang': 'fa'}))
    log.append(f'lang->fa: {r.status}')

    # ---------- offline error + recovery ----------
    ctx.set_offline(True)
    try:
        page.reload(wait_until='domcontentloaded')
    except Exception:
        pass
    # SPA still mounted; its API calls now fail -> in-app network error state
    try:
        page.evaluate('fetch("/api/health").catch(()=>{})')
    except Exception:
        pass
    page.wait_for_timeout(3000)
    shot(page, '12-network-error-offline')
    ctx.set_offline(False)
    page.reload(wait_until='networkidle')
    settle(page, 2500)
    shot(page, '13-network-recovered')
    ctx.close()

    # ---------- mobile view ----------
    mctx = browser.new_context(viewport={'width': 390, 'height': 844},
        user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        locale='fa-IR', is_mobile=True, has_touch=True)
    mp = mctx.new_page()
    mp.goto(f'{BASE}/login', wait_until='networkidle'); settle(mp)
    shot(mp, '14-mobile-login')
    mp.fill('#username', 'owner')
    mp.fill('#password', OWNER_PW)
    mp.click('button[type="submit"]')
    mp.wait_for_url(f'{BASE}/', timeout=25000)
    settle(mp, 2500)
    shot(mp, '15-mobile-today')
    # tasks on mobile
    mp.locator('[aria-label="ناوبری موبایل"] button:has-text("کارها")').first.click()
    settle(mp, 1800)
    shot(mp, '16-mobile-tasks')
    mctx.close()

    browser.close()

json.dump({'shots': shots, 'log': log}, open('/home/z/my-project/artifacts/media/screenshots-manifest.json', 'w'), ensure_ascii=False, indent=1)
print(f'DONE: {len(shots)} screenshots')
