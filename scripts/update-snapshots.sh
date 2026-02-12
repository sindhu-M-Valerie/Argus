#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
OUT_DIR="public/data"

mkdir -p "$OUT_DIR"

curl -fsS "${BASE_URL}/api/signals" > "${OUT_DIR}/signals.json"
curl -fsS "${BASE_URL}/api/live-sources?type=news&limit=30" > "${OUT_DIR}/live-sources-all.json"

THEMES=(
  "violence"
  "child-abuse-nudity"
  "sexual-exploitation"
  "human-exploitation"
  "suicide-self-harm"
  "violent-speech"
  "tvec"
  "illegal-goods"
  "human-trafficking"
  "ncii"
  "dangerous-organizations"
  "harassment-bullying"
  "dangerous-misinformation"
  "spam-inauthentic"
  "malware"
  "cybersecurity"
  "fraud-impersonation"
)

for theme in "${THEMES[@]}"; do
  curl -fsS "${BASE_URL}/api/live-sources?theme=${theme}&type=news&limit=30" \
    > "${OUT_DIR}/live-sources-theme-${theme}.json"
done

echo "Snapshot refresh complete"
