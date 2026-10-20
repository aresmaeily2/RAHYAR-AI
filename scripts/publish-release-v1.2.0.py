#!/usr/bin/env python3
# ساخت Release v1.2.0 (additive) و آپلود ۹ asset + تأیید دانلود بایت‌به‌بایت
import json, os, subprocess, sys, hashlib, urllib.request

REPO = "aresmaeily2/HAMYAR-AI"
TOKEN = open("/home/z/my-project/upload/HAMYAR TOKEN.txt").read().strip()
DIR = "/home/z/my-project/release-delivery/v1.2.0"
TAG = "v1.2.0"

ASSETS = [
    ("Rahyar-Android-v1.2.0-debug-test.apk", "application/vnd.android.package-archive"),
    ("Rahyar-Android-v1.2.0-release-unsigned.apk", "application/vnd.android.package-archive"),
    ("Rahyar-Android-Source-v1.2.0.zip", "application/zip"),
    ("Rahyar-Android-v1.2.0-Screenshots.zip", "application/zip"),
    ("DELIVERY_INDEX.md", "text/markdown"),
    ("ARCHITECTURE_REPORT.md", "text/markdown"),
    ("FEATURES_TABLE.md", "text/markdown"),
    ("OFFLINE_TEST_REPORT.md", "text/markdown"),
    ("INSTALL_GUIDE_FA.md", "text/markdown"),
]

BODY = """نسخهٔ مستقل اندروید RahyAr — v1.2.0 (versionCode 12)

**تغییر معماری:** اپ اکنون بدون هاست و بدون اینترنت اجرا می‌شود؛ UI از دارایی‌های داخل APK (WebViewAssetLoader روی مبدأ امن appassets) بارگذاری می‌شود و داده‌ها در حافظهٔ محلی دستگاه ذخیره می‌شوند.

## فایل قابل نصب (آزمایشی)
- `Rahyar-Android-v1.2.0-debug-test.apk` — **امضای Debug؛ فقط برای آزمون نصب** (487,853 بایت؛ SHA-256: `0626b358031955d765154bd74156d6e228612db95a20ce5039d24bd352022213`)
- راهنمای نصب فارسی: `INSTALL_GUIDE_FA.md`

## فایل‌های دیگر
- `Rahyar-Android-v1.2.0-release-unsigned.apk` — ساخت release بدون امضا (برای امضای آیندهٔ مالک؛ نصب نمی‌شود)
- `Rahyar-Android-Source-v1.2.0.zip` — سورس کامل برای build مجدد
- `Rahyar-Android-v1.2.0-Screenshots.zip` — رندر فایل‌های UI داخل APK (برچسب منشأ داخل بسته)
- گزارش‌ها: `ARCHITECTURE_REPORT.md` (قبل/بعد مستقل‌سازی) · `FEATURES_TABLE.md` (سه گروه قابلیت) · `OFFLINE_TEST_REPORT.md` (تست‌های واقعی: 27/27 JVM + بررسی‌های apksigner/zipalign/badging)

## وضعیت امضا (متوقف برای تصمیم مالک)
- کلید Release قبلی از دست رفته (ممیزی قبلی) — هیچ کلید جدیدی بدون اجازهٔ مالک ساخته نشده است.
- به‌روزرسانی درجا از v1.1.0 با کلیدهای فعلی ممکن نیست؛ نصب تازه (پس از پشتیبان‌گیری) لازم است.
- Release v1.1.0 بدون تغییر حفظ شده است (additive).

commit سورس: `ed9ec2d`
"""

def api(url, method="GET", data=None, ctype="application/json"):
    req = urllib.request.Request(url, method=method)
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("User-Agent", "rahyar-delivery")
    body = None
    if data is not None:
        body = data if isinstance(data, bytes) else json.dumps(data).encode()
        req.add_header("Content-Type", ctype)
    return urllib.request.urlopen(req, body, timeout=120)

# ۱) ساخت release
rel = None
try:
    r = api(f"https://api.github.com/repos/{REPO}/releases/tags/{TAG}")
    rel = json.load(r)
    print(f"release {TAG} already exists, id={rel['id']}")
except urllib.error.HTTPError as e:
    if e.code != 404: raise
    payload = {
        "tag_name": TAG, "target_commitish": "main",
        "name": "RahyAr Android v1.2.0 — نسخهٔ مستقل (آزمایشی)",
        "body": BODY, "draft": False, "prerelease": True,
    }
    rel = json.load(api(f"https://api.github.com/repos/{REPO}/releases", "POST", payload))
    print(f"release created, id={rel['id']}")

existing = {a["name"] for a in rel.get("assets", [])}

# ۲) آپلود asset ها
for name, ctype in ASSETS:
    path = os.path.join(DIR, name)
    if not os.path.exists(path):
        print(f"MISSING LOCAL FILE: {name}"); sys.exit(1)
    if name in existing:
        print(f"skip (exists): {name}"); continue
    url = f"https://uploads.github.com/repos/{REPO}/releases/{rel['id']}/assets?name={name}"
    data = open(path, "rb").read()
    api(url, "POST", data, ctype).read()
    print(f"uploaded: {name} ({len(data)} B)")

# ۳) تأیید دانلود بایت‌به‌بایت (دسترسی معادل مالک — با توکن)
print("\n=== DOWNLOAD VERIFICATION (owner-equivalent, token-authenticated) ===")
ok = True
for name, _ in ASSETS:
    local = open(os.path.join(DIR, name), "rb").read()
    h = hashlib.sha256(local).hexdigest()
    url = f"https://api.github.com/repos/{REPO}/releases/assets?per_page=100"
    # پیدا کردن asset id
    assets = json.load(urllib.request.urlopen(urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/releases/{rel['id']}",
        headers={"Authorization": f"Bearer {TOKEN}", "User-Agent": "rahyar-delivery"}), timeout=120))["assets"]
    aid = next(a["id"] for a in assets if a["name"] == name)
    dl = urllib.request.urlopen(urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/releases/assets/{aid}",
        headers={"Authorization": f"Bearer {TOKEN}", "Accept": "application/octet-stream",
                 "User-Agent": "rahyar-delivery"}), timeout=300).read()
    dh = hashlib.sha256(dl).hexdigest()
    status = "PASS" if (dh == h and len(dl) == len(local)) else "FAIL"
    if status == "FAIL": ok = False
    print(f"{status}  {name}  {len(dl)} B  {dh[:16]}…")

print("\nALL-DOWNLOADS-VERIFIED" if ok else "\nVERIFICATION-FAILED")
sys.exit(0 if ok else 2)
