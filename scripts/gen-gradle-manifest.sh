#!/bin/bash
# RETIRED (R3-P1 §7 — V1-P3-R3): این اسکریپت قدیمی مانیفست واقعی خط لوله را
# از نسخهٔ کهنهٔ android/src/AndroidManifest.xml بازتولید می‌کرد و اگر اجرا می‌شد
# مانیفست کامل v2.1.0+ را نابود می‌کرد.
# منبع حقیقت یگانه: android/app/gradle/AndroidManifest.xml (خط لولهٔ v13/v14).
echo 'RETIRED: android/app/gradle/AndroidManifest.xml is the single source of truth.' >&2
exit 1
