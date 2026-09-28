#!/bin/bash
# kuro-no-install-guard.sh - PreToolUse Hook (Bash)
# 새 의존성 설치 명령을 감지하면 "사용자 승인 확인" 안내를 낸다. 차단하지 않는다.
#   - 메인 세션용 안내 훅이다. 서브에이전트는 validate-no-install.py 가드가 차단한다.
#   - 감지: yarn add, npm install/i <pkg>, pnpm add, cargo add, cargo install, rustup,
#           pip install, winget, choco, scoop, npx <pkg>(tauri/vitest/eslint/prettier/tsc 제외)
#   - 인자 없는 yarn install / npm install / npm ci 는 기존 의존성 복원이라 대상이 아니다.
# Exit codes: 0 = 항상 허용 (안내만)

INPUT=$(cat)

. "$(dirname "$0")/_common.sh"
PY=$(resolve_python) || exit 0

VERDICT=$(echo "$INPUT" | "$PY" -c "
import sys, json, re

try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)

if d.get('tool_name', '') != 'Bash':
    sys.exit(0)

cmd = (d.get('tool_input') or {}).get('command') or ''
low = cmd.lower()
if not low.strip():
    sys.exit(0)

hits = []
if re.search(r'\byarn\s+(global\s+)?add\b', low): hits.append('yarn add')
if re.search(r'\bpnpm\s+(add|i|install)\s+[^-\s]', low): hits.append('pnpm add')
if re.search(r'\bnpm\s+(install|i|add)\s+(?!--?[a-z])\S', low): hits.append('npm install <pkg>')
if re.search(r'\bnpm\s+(install|i)\b.*\s(-g|--global)\b', low): hits.append('npm -g')
if re.search(r'\bcargo\s+add\b', low): hits.append('cargo add')
if re.search(r'\bcargo\s+install\b', low): hits.append('cargo install')
if re.search(r'\brustup\b', low): hits.append('rustup')
if re.search(r'\bpip3?\s+install\b', low): hits.append('pip install')
if re.search(r'\b(winget|choco|scoop)\s+install\b', low): hits.append('시스템 패키지 설치')
m = re.search(r'\bnpx\s+(?:--yes\s+|-y\s+)?([a-z@][\w@/.-]*)', low)
if m:
    pkg = m.group(1)
    allow = ('tauri', '@tauri-apps/cli', 'vitest', 'eslint', 'prettier', 'tsc', 'vite')
    if not any(pkg == a or pkg.startswith(a + '@') for a in allow):
        hits.append('npx ' + pkg)

if hits:
    print(', '.join(hits))
" 2>/dev/null)

if [[ -n "$VERDICT" ]]; then
    echo "[kuro] 새 의존성 설치입니다(${VERDICT}). 사용자 승인이 있었는지 확인하세요. 승인이 없으면 중단하고 물어보세요." >&2
fi

exit 0
