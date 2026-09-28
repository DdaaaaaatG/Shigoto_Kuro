#!/bin/bash
# kuro-build-reminder.sh - PostToolUse Hook (Edit|Write)
# 빌드 설정·권한 파일(Cargo.toml, tauri.conf.json, capabilities/*.json) 변경 시 재빌드·최소 권한 확인을 안내한다.
# 세션당 1회. 마커: $TEMP/kuro-build-reminder/{session_id}
# Exit codes: 0 = 항상 허용 (알림만)

INPUT=$(cat)

. "$(dirname "$0")/_common.sh"
PY=$(resolve_python) || exit 0
MARKER_DIR=$(marker_dir "kuro-build-reminder")

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

if not re.search(r'(^|/)src-tauri/(Cargo\.toml|tauri\.conf\.json|capabilities/[^/]+\.json)$', fp):
    sys.exit(0)

sid = d.get('session_id', 'unknown')
mdir = os.environ.get('MARKER_DIR') or '/tmp/kuro-build-reminder'
os.makedirs(mdir, exist_ok=True)
marker = os.path.join(mdir, sid)
if os.path.exists(marker):
    sys.exit(0)
open(marker, 'w').close()
print(os.path.basename(fp))
" 2>/dev/null)

if [[ -n "$RESULT" ]]; then
    echo "[kuro] 빌드 설정/권한이 바뀌었습니다(${RESULT}). cargo check와 capabilities 최소 권한을 확인하세요." >&2
fi

exit 0
