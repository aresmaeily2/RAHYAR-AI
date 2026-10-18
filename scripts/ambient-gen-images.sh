#!/bin/bash
# تولید ۹ تصویر طبیعت برای لایه ۵ پس‌زمینه زنده — بسیار نرم و کم‌کنتراست
# خروجی خام: artifacts/ambient/raw/*.png → سپس با پایتون به WebP ریز تبدیل می‌شود
set -u
RAW=/home/z/my-project/artifacts/ambient/raw
mkdir -p "$RAW"

gen() {
  local name="$1"; shift
  local prompt="$1"; shift
  if [ -s "$RAW/$name.png" ]; then echo "SKIP $name"; return 0; fi
  z-ai image -p "$prompt" -o "$RAW/$name.png" -s 1344x768 >/dev/null 2>&1 \
    && echo "OK   $name ($(stat -c%s "$RAW/$name.png") bytes)" \
    || echo "FAIL $name"
}

gen sea     "extremely soft dreamy calm ocean horizon at dawn, pale teal and aqua water, gentle mist, very low contrast, minimal, pastel tones, blurred soft focus photograph, tranquil, no people, no text"
gen forest  "extremely soft dreamy misty green forest, morning fog between trees, pale sage green tones, very low contrast, minimal pastel, blurred soft focus photograph, serene, no people, no text"
gen aurora  "extremely soft dreamy northern lights aurora borealis over snowy mountains at night, gentle violet and cyan glow, very low contrast, dark pastel sky, blurred soft focus photograph, calm, no people, no text"
gen sunset  "extremely soft dreamy golden sunset over calm sea, warm peach and amber gradient sky, gentle haze, very low contrast, minimal pastel, blurred soft focus photograph, peaceful, no people, no text"
gen night   "extremely soft dreamy starry night sky over dark mountain silhouette, deep blue night, few faint stars, very low contrast, dark pastel, blurred soft focus photograph, quiet, no people, no text"
gen clouds  "extremely soft dreamy pale overcast sky with very gentle clouds, off-white and light grey pastel, almost monochrome, very low contrast, minimal, blurred soft focus photograph, empty calm, no people, no text"
gen sakura  "extremely soft dreamy cherry blossom branches in spring, pale pink petals, soft white sky, very low contrast, pastel pink tones, blurred soft focus photograph, delicate, no people, no text"
gen autumn  "extremely soft dreamy autumn forest with golden and amber falling leaves, warm pastel orange tones, gentle haze, very low contrast, blurred soft focus photograph, nostalgic, no people, no text"
gen rain    "extremely soft dreamy rainy day, rain drops on window glass with blurred grey green nature behind, muted pastel tones, very low contrast, blurred soft focus photograph, cozy calm, no people, no text"

echo "--- done ---"
ls -la "$RAW"
