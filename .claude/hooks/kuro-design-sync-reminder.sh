#!/bin/bash
# kuro-design-sync-reminder.sh - PostToolUse Hook (Edit|Write)
# 화면 폴더(src/overlay/, src/settings/)의 .ts/.tsx 소스 수정 시 design.md 동기화·CR 기록을 안내한다.
# test/ 하위와 문서(.md)는 제외. 화면당 세션 1회. 마커: $TEMP/kuro-design-sync/{session_id}-{screen}
# Exit codes: 0 = 항상 허용 (알림만)

INPUT=$(cat)

. "$(dirname "$0")/_common.sh"
PY=$(resolve_python) || exit 0
MARKER_DIR=$(marker_dir "kuro-design-sync")

RESULT=$(echo "$INPUT" | MARKER_DIR="$MARKER_DIR" "$PY" -c "
import sys, json, os, re

try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)

if d.get('tool_name', '') not in ('Edit', 'Write'):
    sys.exit(0)

fp = ((d.get('tool_input') or {}).get('file_path') or '').replace('\\\\', '/')
if not fp:
    sys.exit(0)

m = re.search(r'(^|/)src/(overlay|settings)/(.+)$', fp)
if not m:
    sys.exit(0)
rest = m.group(3)
if rest.startswith('test/') or '/test/' in rest:
    sys.exit(0)
if not re.search(r'\.(ts|tsx)$', rest):
    sys.exit(0)
if re.search(r'\.(test|spec)\.(ts|tsx)$', rest):
    sys.exit(0)

screen = m.group(2)
sid = d.get('session_id', 'unknown')
mdir = os.environ.get('MARKER_DIR') or '/tmp/kuro-design-sync'
os.makedirs(mdir, exist_ok=True)
marker = os.path.join(mdir, f'{sid}-{screen}')
if os.path.exists(marker):
    sys.exit(0)
open(marker, 'w').close()
print(screen)
" 2>/dev/null)

if [[ -n "$RESULT" ]]; then
    echo "[kuro] ${RESULT} 소스가 바뀌었습니다. design.md 동기화(ui-designer) 또는 CR 대장(test/change-requests.md) 기록을 잊지 마세요." >&2
fi

exit 0
