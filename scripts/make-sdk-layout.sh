#!/bin/bash
# ساخت SDK layout سازگار با AGP از ابزارهای رسمی دانلودشده (symlink) + لایسنس
set -euo pipefail
SDK=/home/z/my-project/artifacts/android-sdk
T=/home/z/my-project/artifacts/android-build/tools
mkdir -p "$SDK/platforms" "$SDK/build-tools" "$SDK/licenses"
ln -sfn "$T/plat/android-34" "$SDK/platforms/android-34"
ln -sfn "$T/bt/android-14" "$SDK/build-tools/34.0.0"
# لایسنس رسمی SDK (هش استاندارد، بدون دانلود)
printf '24333f8a63b6825ea9c5514f83c2829b004d1fee\n' > "$SDK/licenses/android-sdk-license"
printf '84831a9a08c46f9a89b0b7dbc2331e6e1d0e7d36\n' > "$SDK/licenses/android-sdk-preview-license"
ls -la "$SDK" "$SDK/platforms" "$SDK/build-tools"
echo SDK_LAYOUT_OK
