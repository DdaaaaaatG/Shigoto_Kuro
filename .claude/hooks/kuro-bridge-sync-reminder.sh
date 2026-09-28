#!/bin/bash
# kuro-bridge-sync-reminder.sh - PostToolUse Hook (Edit|Write)
# bridge 계층(src-tauri/src/bridge/ 또는 src/bridge/) 수정 시 계약 문서·반대편 타입 동기화를 안내한다.
# 세션당 1회만 알린다. 마커: $TEMP/kuro-bridge-sync/{session_id}
# Exit codes: 0 = 항상 허용 (알림만)

INPUT=$(cat)

. "$(dirname "$0")/_common.sh"
PY=$(resolve_python) || exit 0
MARKER_DIR=$(marker_dir "kuro-bridge-sync")

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

if not re.search(r'(^|/)(src-tauri/src/bridge|src/bridge)/', fp):
    sys.exit(0)
if fp.endswith(('.md', '.markdown')):
    sys.exit(0)

side = 'rust' if '/src-tauri/' in ('/' + fp) else 'ts'
sid = d.get('session_id', 'unknown')
mdir = os.environ.get('MARKER_DIR') or '/tmp/kuro-bridge-sync'
os.makedirs(mdir, exist_ok=True)
marker = os.path.join(mdir, sid)
if os.path.exists(marker):
    sys.exit(0)
open(marker, 'w').close()
print(side)
" 2>/dev/null)

if [[ "$RESULT" == "rust" ]]; then
    echo "[kuro] bridge 계약이 바뀌었을 수 있습니다. doc/200_설계/bridge/contract.md와 반대편(src/bridge/types.ts) 타입을 대조하세요." >&2
elif [[ "$RESULT" == "ts" ]]; then
    echo "[kuro] bridge 계약이 바뀌었을 수 있습니다. doc/200_설계/bridge/contract.md와 반대편(src-tauri/src/bridge/) Rust 구조체를 대조하세요." >&2
fi

exit 0
