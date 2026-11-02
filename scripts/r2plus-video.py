# -*- coding: utf-8 -*-
"""R2+ continuous walkthrough video (v2 — keyboard navigation, fault-tolerant)."""
import os, time
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:3000'
OUTD = '/home/z/my-project/artifacts/media/video'
os.makedirs(OUTD, exist_ok=True)
OWNER_PW = open('/home/z/my-project/artifacts/rahyar-audit/OWNER_TEMP_PASSWORD.txt').read().strip()

def settle(page, ms=1400):
    try: page.wait_for_load_state('networkidle')
    except Exception: pass
    page.wait_for_timeout(ms)

def navkey(page, key, wait=2000):
    try:
        page.keyboard.press(key)  # app shortcuts: 1..7
        page.wait_for_timeout(wait)
        return True
    except Exception:
        return False

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 1280, 'height': 720},
        record_video_dir=OUTD, record_video_size={'width': 1280, 'height': 720},
        locale='fa-IR')
    page = ctx.new_page()
    t0 = time.time()
    def mark(s): print(f'[{int(time.time()-t0):>3}s] {s}')

    # 1) login page + real login
    page.goto(f'{BASE}/login', wait_until='networkidle'); settle(page, 2200)
    mark('login page shown')
    page.fill('#username', 'owner')
    page.fill('#password', OWNER_PW)
    page.click('button[type="submit"]')
    page.wait_for_url(f'{BASE}/', timeout=25000); settle(page, 2800)
    mark('logged in, dashboard')

    # 2) quick-add task (N shortcut opens/focuses quick add)
    try:
        inp = page.locator('input[aria-label="افزودن کار جدید"], input[aria-label="Add new task"]').first
        inp.click(timeout=6000)
        inp.fill('بازی فوتبال با بچه‌ها ساعت ۱۷')
        page.keyboard.press('Enter')
        page.wait_for_timeout(1800)
        mark('task created via quick-add (toast ثبت شد)')
    except Exception as e:
        mark(f'quick-add skipped: {type(e).__name__}')

    # 3) tasks
    navkey(page, '2', 2400); mark('tasks view')

    # 4) calendar + navigation
    navkey(page, '3', 2200)
    for lbl in ['ماه بعد', 'ماه قبل', 'بعدی', 'قبلی']:
        try:
            page.locator(f'button[aria-label*="{lbl}"]').first.click(timeout=1500)
            page.wait_for_timeout(900)
        except Exception: pass
    try:
        page.locator('button:has-text("›")').first.click(timeout=1500); page.wait_for_timeout(800)
        page.locator('button:has-text("‹")').first.click(timeout=1500); page.wait_for_timeout(800)
    except Exception: pass
    mark('calendar navigated')

    # 5) finance
    navkey(page, '6', 2600)
    page.mouse.wheel(0, 340); page.wait_for_timeout(1300)
    mark('finance view')

    # 6) settings + language toggle
    navkey(page, '7', 2400); mark('settings view')
    try:
        page.locator('button:has-text("انگلیسی")').first.click(timeout=5000)
        settle(page, 2400); mark('switched to English')
        try:
            page.locator('button:has-text("فارسی"), button:has-text("Persian")').first.click(timeout=6000, force=True)
            settle(page, 2400); mark('switched back to Persian (UI)')
        except Exception:
            r = ctx.request.put(f'{BASE}/api/settings/app', headers={'Origin': BASE, 'Content-Type': 'application/json'}, data='{"lang":"fa"}')
            page.reload(wait_until='networkidle'); settle(page, 2400)
            mark(f'switched back to Persian (API {r.status})')
    except Exception as e:
        mark(f'lang toggle skipped: {type(e).__name__}')

    # 7) real AI chat
    navkey(page, '4', 2000)
    msg = 'سلام رهیار! یک جمله کوتاه درباره امروز بگو'
    box = page.locator('textarea').last
    box.scroll_into_view_if_needed()
    box.click(); box.fill(msg); page.keyboard.press('Enter')
    t1 = time.time()
    n_before = page.locator('.ara-md').count()
    # wait for typing indicator to appear, then disappear, then blocks stabilize
    seen_typing = False
    prev_txt, stable = '', 0
    while time.time() - t1 < 100:
        page.wait_for_timeout(2500)
        dots = page.locator('.ara-typing-dot').count()
        if dots > 0: seen_typing = True
        blocks = page.locator('.ara-md')
        txt = blocks.last.inner_text().strip() if blocks.count() else ''
        if seen_typing and dots == 0: break
        if txt and txt == prev_txt and len(txt) > 30:
            stable += 1
            if stable >= 2: break
        else:
            stable = 0
        prev_txt = txt
    page.wait_for_timeout(1500)
    mark(f'AI reply received ({round(time.time()-t1)}s, blocks {n_before}->{page.locator(".ara-md").count()})')

    # 8) plan
    navkey(page, '5', 2600); mark('plan view')

    # 9) mobile layout
    page.set_viewport_size({'width': 390, 'height': 844})
    page.wait_for_timeout(2400)
    mark('mobile layout shown')
    page.set_viewport_size({'width': 1280, 'height': 720})
    page.wait_for_timeout(2000)

    # 10) offline error + recovery
    ctx.set_offline(True)
    try:
        page.keyboard.press('4'); page.wait_for_timeout(1200)
        box = page.locator('textarea').last
        box.fill('تست حالت آفلاین'); page.keyboard.press('Enter')
    except Exception: pass
    page.wait_for_timeout(5000)
    mark('offline error state shown')
    ctx.set_offline(False)
    page.reload(wait_until='networkidle'); settle(page, 2800)
    mark('recovered online')

    video_path = page.video.path()
    ctx.close(); browser.close()
    print('VIDEO:', video_path)
