# -*- coding: utf-8 -*-
"""Probe: why does the composer disappear after the first AI reply?"""
import sys, time
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:3000'
PW = open('/home/z/my-project/artifacts/rahyar-audit/OWNER_TEMP_PASSWORD.txt').read().strip()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 1440, 'height': 900}, locale='fa-IR')
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(f'PAGEERROR: {e}'))
    page.on('console', lambda m: errors.append(f'CONSOLE-{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    page.goto(f'{BASE}/login', wait_until='networkidle')
    page.fill('#username', 'owner')
    page.fill('#password', PW)
    page.click('button[type="submit"]')
    page.wait_for_url(f'{BASE}/', timeout=30000)
    page.wait_for_timeout(2500)
    page.keyboard.press('4')
    page.wait_for_timeout(1600)
    print('before send: textareas =', page.locator('textarea').count())
    box = page.locator('textarea').last
    box.fill('یک برنامه ساده برای امروز پیشنهاد بده')
    box.press('Enter')
    t0 = time.time()
    seen_stop = False
    for i in range(60):
        page.wait_for_timeout(2000)
        stop_btn = page.locator('[aria-label*="توقف"]').count()
        if stop_btn:
            seen_stop = True
        ta = page.locator('textarea').count()
        if i % 5 == 0 or (seen_stop and stop_btn == 0):
            print(f'[{int(time.time()-t0):>3}s] stop={stop_btn} textareas={ta} stopseen={seen_stop}')
        if seen_stop and stop_btn == 0:
            break
    page.wait_for_timeout(1500)
    print('after reply: textareas =', page.locator('textarea').count())
    body = page.inner_text('body')[:300].replace('\n', ' | ')
    print('body head:', body)
    print('page errors:', errors[:8])
    browser.close()
