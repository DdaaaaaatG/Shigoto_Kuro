#!/bin/bash
# kuro-destructive-guard.sh - PreToolUse Hook (Bash)
# 되돌릴 수 없는 파괴적 명령을 실행 전에 차단한다.
#   차단: rm -rf(빌드 산출물 제외), git reset --hard, git push --force, git clean -fd,
#         git checkout -- ., 앱 데이터 폴더(%APPDATA%\com.kuro.keyviewer) 재귀 삭제
#   경고: cargo clean (비차단)
# Exit codes: 0 = allow, 2 = block
# 한글 메시지는 bash echo로 낸다 — python stderr는 이 환경에서 cp949라 깨진다.

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

if d.get('tool_name', '') != 'Bash':
    sys.exit(0)

cmd = (d.get('tool_input') or {}).get('command') or ''
if not cmd.strip():
    sys.exit(0)

low = cmd.lower().replace('\\\\', '/')

# 1) git 파괴 명령
if re.search(r'\bgit\s+reset\s+.*--hard', low):
    print('GIT_RESET'); sys.exit(0)
if re.search(r'\bgit\s+push\b.*(\s--force\b|\s-f\b|--force-with-lease)', low):
    print('GIT_FORCE'); sys.exit(0)
if re.search(r'\bgit\s+clean\b.*-[a-z]*[fd]', low):
    print('GIT_CLEAN'); sys.exit(0)
if re.search(r'\bgit\s+checkout\s+--\s+\.', low) or re.search(r'\bgit\s+restore\s+\.\s*$', low):
    print('GIT_CHECKOUT'); sys.exit(0)

# 2) rm -rf — 빌드 산출물(node_modules/dist/target/deploy) 대상만 허용
m = re.search(r'\brm\s+(-[a-z]*r[a-z]*f[a-z]*|-[a-z]*f[a-z]*r[a-z]*)\s+(.+)', low)
if m:
    targets = [t for t in re.split(r'\s+', m.group(2).strip()) if t and not t.startswith('-')]
    if not targets:
        print('RM_RF'); sys.exit(0)
    allowed = re.compile(r'(^|/)(node_modules|dist|target|deploy)(/|$)')
    for t in targets:
        t = t.strip('\"\\'')
        if t in ('/', '.', '..', '*', '~', './', '../') or not allowed.search(t):
            print('RM_RF'); sys.exit(0)

# 3) 앱 데이터 폴더 재귀 삭제 (PowerShell/cmd)
appdata = re.search(r'(appdata|com\.kuro\.keyviewer|kuro_keyviewer|kuro-keyviewer)', low)
recursive = re.search(r'(remove-item\b.*-recurse|\bdel\s+/s|\brmdir\s+/s|\brd\s+/s)', low)
if appdata and recursive:
    print('APPDATA'); sys.exit(0)

# 4) cargo clean — 경고만
if re.search(r'\bcargo\s+clean\b', low):
    print('CARGO_CLEAN'); sys.exit(0)

sys.exit(0)
" 2>/dev/null)

case "$VERDICT" in
    GIT_RESET)
        echo "BLOCKED: git reset --hard는 작업 트리 변경을 모두 버립니다. git stash 또는 개별 파일 복원을 쓰세요." >&2
        exit 2 ;;
    GIT_FORCE)
        echo "BLOCKED: git push --force는 원격 이력을 덮어씁니다. 1인 개발이라도 금지입니다(settings.json deny)." >&2
        exit 2 ;;
    GIT_CLEAN)
        echo "BLOCKED: git clean -f/-d는 추적되지 않은 파일을 삭제합니다. 대상을 확인하고 개별 삭제하세요." >&2
        exit 2 ;;
    GIT_CHECKOUT)
        echo "BLOCKED: 작업 트리 전체 되돌리기(git checkout -- . / git restore .)는 금지입니다. 파일 단위로 지정하세요." >&2
        exit 2 ;;
    RM_RF)
        echo "BLOCKED: rm -rf는 node_modules/dist/target/deploy 하위에만 허용됩니다. 그 외는 대상을 확인해 개별 삭제하세요." >&2
        exit 2 ;;
    APPDATA)
        echo "BLOCKED: 앱 데이터 폴더(%APPDATA%\\com.kuro.keyviewer) 재귀 삭제가 감지되었습니다. 사용자 이미지·설정이 사라집니다. 백업 후 사용자 확인을 받으세요." >&2
        exit 2 ;;
    CARGO_CLEAN)
        echo "[kuro] cargo clean은 target/ 전체를 지워 다음 빌드가 오래 걸립니다. 필요한 경우에만 진행하세요." >&2
        exit 0 ;;
esac

exit 0
