# -*- coding: utf-8 -*-
"""Fix shot 12: capture the app's OWN network-error state (not browser error page)."""
import os
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
    page.wait_for_timeout(2000)

    # NOW cut the network while app is fully loaded, then trigger real API calls
    ctx.set_offline(True)
    # navigate to chat view and try to send a message -> server fetch fails
    try:
        page.locator('button:has-text("دستیار")').first.click(timeout=5000)
    except Exception:
        pass
    page.wait_for_timeout(1200)
    try:
        box = page.locator('textarea, input[placeholder]').last
        box.fill('سلام، تست آفلاین')
        page.keyboard.press('Enter')
    except Exception:
        pass
    page.wait_for_timeout(4000)
    p12 = f'{OUT}/12-network-error-offline.png'
    page.screenshot(path=p12)
    print('12:', os.path.getsize(p12)//1024, 'KB')
    ctx.set_offline(False)
    page.reload(wait_until='networkidle')
    page.wait_for_timeout(2500)
    p13 = f'{OUT}/13-network-recovered.png'
    page.screenshot(path=p13)
    print('13:', os.path.getsize(p13)//1024, 'KB')
    browser.close()
print('done')
