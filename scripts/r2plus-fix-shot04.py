# -*- coding: utf-8 -*-
"""Fix shot 04: real AI reply visible in chat, no navigation side-effect."""
import os, time
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:3000'
OUT = '/home/z/my-project/artifacts/media/screenshots'
OWNER_PW = open('/home/z/my-project/artifacts/rahyar-audit/OWNER_TEMP_PASSWORD.txt').read().strip()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 1440, 'height': 900}, locale='fa-IR')
    page = ctx.new_page()
    page.goto(f'{BASE}/login', wait_until='networkidle')
    page.fill('#username', 'owner')
    page.fill('#password', OWNER_PW)
    page.click('button[type="submit"]')
    page.wait_for_url(f'{BASE}/', timeout=25000)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1500)
    page.locator('button:has-text("دستیار")').first.click()
    page.wait_for_timeout(1500)

    msg = 'یک نکته انگیزشی کوتاه به فارسی بگو'
    box = page.locator('textarea, input[placeholder]').last
    box.fill(msg)
    page.keyboard.press('Enter')
    t0, prev, stable = time.time(), '', 0
    while time.time() - t0 < 120:
        page.wait_for_timeout(4000)
        body = page.locator('body').inner_text()
        tail = body.split(msg)[-1].strip() if msg in body else ''
        if len(tail) > 50:
            if tail[:80] != prev[:80]:
                prev, stable = tail, 0
            else:
                stable += 1
                if stable >= 2: break
    print('reply waited:', round(time.time()-t0), 's | tail len:', len(prev))
    page.screenshot(path=f'{OUT}/04-ai-real-answer-fa.png')
    print('04:', os.path.getsize(f'{OUT}/04-ai-real-answer-fa.png')//1024, 'KB')
    browser.close()
