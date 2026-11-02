# -*- coding: utf-8 -*-
"""FINAL MISSION media — real screenshots (22) + continuous walkthrough video.
Captured from the RUNNING production build with the real owner session.
Agentic demos use the 5 mandatory mission scenarios (real DB effects).
No secrets displayed; owner password read from artifacts, never printed."""
import os, time
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:3000'
SHOTS = '/home/z/my-project/artifacts/media/final/screenshots'
VID = '/home/z/my-project/artifacts/media/final/video'
os.makedirs(SHOTS, exist_ok=True)
os.makedirs(VID, exist_ok=True)
OWNER_PW = open('/home/z/my-project/artifacts/rahyar-audit/OWNER_TEMP_PASSWORD.txt').read().strip()

count = 0
def shot(page, name, full=False):
    global count
    p = f'{SHOTS}/{name}.png'
    page.screenshot(path=p, full_page=full)
    count += 1
    print(f'  [{count:02d}] {name}.png ({os.path.getsize(p)//1024} KB)')

def settle(page, ms=1500):
    try:
        page.wait_for_load_state('networkidle')
    except Exception:
        pass
    page.wait_for_timeout(ms)

def login(page):
    page.goto(f'{BASE}/login', wait_until='networkidle')
    settle(page, 900)
    page.fill('#username', 'owner')
    page.fill('#password', OWNER_PW)
    page.click('button[type="submit"]')
    page.wait_for_url(f'{BASE}/', timeout=30000)
    settle(page, 2200)

def wait_reply_done(page, max_s=90):
    """wait until streaming finishes (stop button appears then disappears)"""
    import time as _t
    t0 = _t.time()
    seen = False
    while _t.time() - t0 < max_s:
        page.wait_for_timeout(1200)
        stop = page.locator('[aria-label*="توقف"]').count()
        if stop:
            seen = True
        if seen and stop == 0:
            break
    page.wait_for_timeout(1200)

def ensure_chat(page):
    """make sure we are in the assistant view with a fillable composer"""
    for _ in range(3):
        if page.locator('textarea').count() > 0:
            try:
                page.locator('textarea').last.click(timeout=4000)
                return
            except Exception:
                pass
        page.keyboard.press('4')
        page.wait_for_timeout(1800)

def chat_send(page, text):
    wait_reply_done(page)
    ensure_chat(page)
    box = page.locator('textarea').last
    box.fill(text)
    box.press('Enter')

def wait_chip(page, marker, timeout=45000):
    page.wait_for_selector(f'text={marker}', timeout=timeout)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ═══════════ اسکرین‌شات‌ها (دسکتاپ ۱۴۴۰) ═══════════
    ctx = browser.new_context(viewport={'width': 1440, 'height': 900}, locale='fa-IR')
    page = ctx.new_page()
    page.goto(f'{BASE}/login', wait_until='networkidle')
    settle(page, 900)
    shot(page, '01-login-fa')
    login(page)
    shot(page, '02-dashboard-today-fa')

    # چت — پاسخ واقعی مدل
    page.keyboard.press('4')
    settle(page, 1500)
    shot(page, '03-assistant-fa')
    chat_send(page, 'سلام رهیار! خودت را در دو جمله کوتاه معرفی کن')
    wait_reply_done(page, max_s=60)
    shot(page, '04-ai-real-answer-fa')

    # دموهای عامل — سناریوهای الزامی مأموریت (اثر واقعی)
    chat_send(page, 'مخارج این هفته را جمع کن و گزارش بده.')
    page.wait_for_function(
        "() => document.body.innerText.includes('خلاصه مالی') || document.body.innerText.includes('جمع هزینه')",
        timeout=40000)
    settle(page, 800)
    shot(page, '05-agentic-finance-summary')

    chat_send(page, 'یک پیام آماده کن و قبل از ارسال، متنش را به من نشان بده.')
    page.wait_for_selector('text=ارسال نشده', timeout=40000)
    settle(page, 800)
    shot(page, '06-agentic-message-draft')

    chat_send(page, 'قرار فردا را به تقویم اضافه کن و یک ساعت قبل یادآوری کن.')
    page.wait_for_selector('text=یادآوری: قرار', timeout=40000)
    settle(page, 800)
    shot(page, '07-agentic-event-reminder')

    # دموی plan_day — اکشن برنامه‌ریزی واقعی (نصب‌شده توسط گارد مأموریت)
    chat_send(page, 'یک برنامه ساده برای امروز پیشنهاد بده')
    try:
        page.wait_for_selector('text=برنامه امروز چیده شد', timeout=45000)
    except Exception:
        wait_reply_done(page, max_s=50)
    settle(page, 2500)
    shot(page, '07b-agentic-plan-day')

    page.keyboard.press('2')
    settle(page, 1500)
    shot(page, '08-tasks-fa')
    page.keyboard.press('3')
    settle(page, 1800)
    shot(page, '09-calendar-fa')
    page.keyboard.press('5')
    settle(page, 1800)
    shot(page, '10-plan-fa')
    page.keyboard.press('6')
    settle(page, 1800)
    shot(page, '11-finance-accounts-fa')
    # گزارش ماه مالی — تب/بخش گزارش اگر هست
    try:
        page.locator('text=گزارش').first.click(timeout=4000)
        settle(page, 1500)
    except Exception:
        pass
    shot(page, '12-finance-report-fa')
    page.keyboard.press('7')
    settle(page, 1500)
    shot(page, '14-settings-fa')
    # یادآورها — دیالوگ تنظیمات اعلان (زنگ/صدا/گفتار)
    try:
        page.click('button:has-text("بازکردن تنظیمات یادآور")', timeout=4000)
        settle(page, 1300)
        shot(page, '13-reminders-notif-settings-fa')
        page.keyboard.press('Escape')
        settle(page, 700)
    except Exception:
        print('  (reminder dialog skipped)')
    # تم و محیط — تغییر تم
    try:
        page.locator('button:has-text("تم")').first.click(timeout=3000)
        settle(page, 700)
    except Exception:
        pass
    page.keyboard.press('1')
    settle(page, 1500)
    shot(page, '15-theme-ambient-fa')
    page.keyboard.press('7')
    settle(page, 1200)
    shot(page, '16-users-admin-fa')

    # انگلیسی LTR — دکمهٔ «انگلیسی» در بخش زبان تنظیمات
    try:
        page.locator('button:has-text("انگلیسی")').first.click(timeout=4000)
        settle(page, 1600)
    except Exception:
        pass
    try:
        page.click('button:has-text("Today")', timeout=6000)
    except Exception:
        page.click('button:has-text("امروز")', timeout=6000)
    settle(page, 1800)
    shot(page, '17-dashboard-english-ltr')
    try:
        page.click('button:has-text("Tasks")', timeout=6000)
        settle(page, 1500)
    except Exception:
        page.click('button:has-text("کارها")', timeout=6000)
        settle(page, 1500)
    shot(page, '18-tasks-english-ltr')
    ctx.close()

    # ═══════════ موبایل ۳۹۰×۸۴۴ ═══════════
    mctx = browser.new_context(viewport={'width': 390, 'height': 844}, locale='fa-IR',
                               is_mobile=True, has_touch=True)
    mp = mctx.new_page()
    mp.goto(f'{BASE}/login', wait_until='networkidle')
    settle(mp, 900)
    shot(mp, '19-mobile-login-fa')
    mp.fill('#username', 'owner')
    mp.fill('#password', OWNER_PW)
    mp.click('button[type="submit"]')
    mp.wait_for_url(f'{BASE}/', timeout=30000)
    settle(mp, 2200)
    shot(mp, '20-mobile-today-fa')
    mctx.close()

    # ═══════════ خطای شبکه و بازیابی ═══════════
    octx = browser.new_context(viewport={'width': 1440, 'height': 900}, locale='fa-IR')
    op = octx.new_page()
    login(op)
    op.keyboard.press('4')
    settle(op, 1200)
    octx.set_offline(True)
    chat_send(op, 'یادم بنداز آزمون قطع شبکه')
    op.wait_for_timeout(6000)
    shot(op, '21-network-error-offline')
    octx.set_offline(False)
    settle(op, 3500)
    chat_send(op, 'کارهای امروز من چیست؟')
    op.wait_for_timeout(4500)
    shot(op, '22-network-recovered')
    octx.close()

    # ═══════════ ویدئوی پیوسته ═══════════
    vctx = browser.new_context(viewport={'width': 1280, 'height': 720}, locale='fa-IR',
                               record_video_dir=VID, record_video_size={'width': 1280, 'height': 720})
    vp = vctx.new_page()
    vp.goto(f'{BASE}/login', wait_until='networkidle')
    settle(vp, 1200)
    vp.fill('#username', 'owner')
    vp.fill('#password', OWNER_PW)
    vp.click('button[type="submit"]')
    vp.wait_for_url(f'{BASE}/', timeout=30000)
    settle(vp, 2500)
    vp.keyboard.press('4')
    settle(vp, 1500)
    chat_send(vp, 'یک برنامه ساده برای امروز پیشنهاد بده')
    try:
        vp.wait_for_selector('text=برنامه امروز چیده شد', timeout=45000)
    except Exception:
        wait_reply_done(vp, max_s=50)
    settle(vp, 2500)  # ناوبری خودکار به نمای برنامه — اثر واقعی اکشن
    chat_send(vp, 'مخارج این هفته را جمع کن و گزارش بده.')
    try:
        vp.wait_for_function(
            "() => document.body.innerText.includes('خلاصه مالی') || document.body.innerText.includes('جمع هزینه')",
            timeout=40000)
    except Exception:
        pass
    settle(vp, 1200)
    chat_send(vp, 'یک پیام آماده کن و قبل از ارسال، متنش را به من نشان بده.')
    try:
        vp.wait_for_selector('text=ارسال نشده', timeout=40000)
    except Exception:
        pass
    settle(vp, 1200)
    chat_send(vp, 'قرار فردا را به تقویم اضافه کن و یک ساعت قبل یادآوری کن.')
    try:
        vp.wait_for_selector('text=یادآوری: قرار', timeout=45000)
    except Exception:
        pass
    settle(vp, 1500)
    vp.keyboard.press('2')
    settle(vp, 1800)
    vp.keyboard.press('3')
    settle(vp, 1800)
    vp.keyboard.press('6')
    settle(vp, 2000)
    vp.keyboard.press('7')
    settle(vp, 1500)
    try:
        vp.locator('button:has-text("انگلیسی")').first.click(timeout=4000)
        settle(vp, 1500)
    except Exception:
        pass
    try:
        vp.click('button:has-text("Today")', timeout=6000)
    except Exception:
        vp.click('button:has-text("امروز")', timeout=6000)
    settle(vp, 1800)
    try:
        vp.locator('button:has-text("فارسی")').first.click(timeout=4000)
        settle(vp, 1500)
    except Exception:
        pass
    vp.set_viewport_size({'width': 390, 'height': 844})
    settle(vp, 1800)
    vp.set_viewport_size({'width': 1280, 'height': 720})
    settle(vp, 1200)
    vctx.set_offline(True)
    vp.keyboard.press('4')
    settle(vp, 1000)
    chat_send(vp, 'یادم بنداز آزمون قطع شبکه در ویدئو')
    vp.wait_for_timeout(6500)
    vctx.set_offline(False)
    settle(vp, 4000)
    vp.keyboard.press('1')
    settle(vp, 1500)
    vctx.close()

    browser.close()

print(f'DONE: {count} screenshots + video recorded')
