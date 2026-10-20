#!/bin/bash
# تولید مانیفست Gradle از مانیفست اصلی (بدون صفت package) — همگامی تضمینی
set -euo pipefail
cd /home/z/my-project
sed "s|^    package=.*$|>|" android/src/AndroidManifest.xml > android/app/gradle/AndroidManifest.xml
echo GRADLE_MANIFEST_OK
