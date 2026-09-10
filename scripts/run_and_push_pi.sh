#!/usr/bin/env bash
# ==============================================================================
# Autonomous UCLA Course Enrollment Refresher & Git Sync for Raspberry Pi
# ==============================================================================
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "================================================================"
echo "Starting UCLA Enrollment Refresh on $(hostname) at $(date -u)"
echo "================================================================"

# 1. Sync latest changes from GitHub
git pull --rebase origin main

# 2. Run fast enrollment refresher (buffered I/O for MicroSD safety)
python3 scripts/refresh_enrollment.py --checkpoint-interval 100 --save-interval-sec 180

# 3. Regenerate course_data.js with fresh timestamp for web frontend
python3 -c "
import json
from datetime import datetime, timezone

with open('course_info.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

now = datetime.now(timezone.utc)
ts_ms = int(now.timestamp() * 1000)
iso_str = now.isoformat()

js_header = f'// UCLA Course Information Dataset\nwindow.COURSE_INFO_TIMESTAMP = {ts_ms}; // {iso_str}\nwindow.COURSE_INFO = '
with open('course_data.js', 'w', encoding='utf-8') as f:
    f.write(js_header)
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write(';\n')
"

# 4. Stage and push only if there are genuine diffs
git add course_info.json course_data.js

if ! git diff --cached --quiet; then
    git commit -m "Auto-update enrollment metrics from Raspberry Pi [$(date -u '+%Y-%m-%d %H:%M UTC')]"
    git push origin main
    echo "[+] Successfully pushed updated enrollment data to GitHub!"
else
    echo "[*] No enrollment changes detected. Nothing to push."
fi

echo "================================================================"
echo "Enrollment Refresh & Git Sync Completed at $(date -u)"
echo "================================================================"
