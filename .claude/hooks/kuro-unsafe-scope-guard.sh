#!/bin/bash
# kuro-unsafe-scope-guard.sh - PreToolUse Hook (Edit|Write)
# unsafe 코드는 src-tauri/src/hook/ 안에서만 허용한다 (확정사항 §2 unsafe 범위).
#   - 쓰려는 내용(new_string / content)에 단어 `unsafe`가 있고
#   - 파일이 .md 문서가 아니며
#   - 경로가 src-tauri/src/hook/ 아래가 아니면 차단
# 에이전트별 스크립트 가드(validate-unsafe-scope.py)와 함께 이중 안전 장치다.
# Exit codes: 0 = allow, 2 = block

INPUT=$(cat)

. "$(dirname "$0")/_common.sh"
PY=$(resolve_python) || {
    echo "[kuro] $(basename "$0"): python을 찾지 못해 가드를 건너뜁니다(검사 미수행)." >&2
    exit 0
}

VERDICT=$(echo "$INPUT" | "$PY" -c "
import sys, json, re

try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)

if d.get('tool_name', '') not in ('Edit', 'Write', 'NotebookEdit'):
    sys.exit(0)

inp = d.get('tool_input') or {}
fp = (inp.get('file_path') or inp.get('notebook_path') or '').replace('\\\\', '/')
if not fp:
    sys.exit(0)

low = fp.lower()
if low.endswith(('.md', '.markdown', '.txt', '.html')):
    sys.exit(0)

body = inp.get('new_string')
if body is None:
    body = inp.get('content') or inp.get('new_source') or ''

# 실제 unsafe 코드만 판정(2026-09-23 사용자 지정): 주석(// 이후)을 떼고 구문 형태만 잡는다.
UNSAFE_CODE = re.compile(r'\bunsafe\s*(\{|\(|fn\b|impl\b|trait\b|extern\b)')
code = '\n'.join(line.split('//', 1)[0] for line in body.splitlines())
if not UNSAFE_CODE.search(code):
    sys.exit(0)

# 허용 구역: src-tauri/src/hook/ 하위 (.rs)
if re.search(r'(^|/)src-tauri/src/hook/', low):
    sys.exit(0)

print(fp)
" 2>/dev/null)

if [[ -n "$VERDICT" ]]; then
    echo "BLOCKED: unsafe 코드는 src-tauri/src/hook/ 안에서만 허용됩니다. 대상: ${VERDICT}" >&2
    echo "  네이티브 호출이 필요하면 hook 모듈에 안전한 래퍼 함수를 만들고 그것을 호출하세요." >&2
    exit 2
fi

exit 0
