#!/usr/bin/env python
"""오케스트레이터 소스 쓰기 가드: PreToolUse(Write|Edit, Bash) (Python).

공유 스크립트다. 첫 번째 인자로 에이전트 라벨을 받는다(생략 시 `system-architect`).
    python validate-architect-readonly.py                # system-architect
    python validate-architect-readonly.py task-manager   # task-manager

목적: 두 오케스트레이터 모두 **소스·설정·계약 코드를 직접 바꾸지 않는다.**
- `system-architect`: 횡단 분석·전반설계만 하고 구현은 매니저(core/bridge/ui-manager) 세션으로 인계한다.
- `task-manager`: 요구·RTM·상태 문서만 쓰고 구현은 리프 에이전트(core/bridge/ui implementer)에 위임한다.

- Write|Edit: **설계/분석 산출물 경로에만** 허용 —
    `doc/` 아래 `.md`/`.json`, `.claude/reports/` 아래 `.md`/`.json`.
    소스(.rs/.ts/.tsx/.js/.jsx), 설정(Cargo.toml/package.json/tauri.conf.json/capabilities), 그 외 확장자는 차단.
- Bash: 조회/분석(git log·diff·status·show, grep·rg·find·ls·cat·head·tail·wc, cargo metadata·tree) 허용.
    변경·파괴·설치·git 쓰기·cargo build/test/run·yarn 실행은 차단.

설계 원칙: fail-closed — 파싱 실패/판단 불가 시 막는다. 종료코드 2 = 차단(사유 stderr), 0 = 허용.
"""
import json
import re
import sys

AGENT = sys.argv[1] if len(sys.argv) > 1 else "system-architect"
HANDOFF = (
    "구현은 리프 에이전트(core-implementer/bridge-implementer/ui-implementer)에 위임하세요"
    if AGENT == "task-manager"
    else "구현은 매니저(core-manager/bridge-manager/ui-manager) 세션으로 인계하세요"
)


def _load():
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    data_b = sys.stdin.buffer.read()
    try:
        raw = data_b.decode("utf-8")
    except UnicodeDecodeError:
        raw = data_b.decode("cp949", errors="replace")
    try:
        return json.loads(raw), raw
    except Exception:
        return None, raw


def _block(msg: str) -> None:
    sys.stderr.write("Blocked: " + msg + "\n")
    sys.exit(2)


# ── Bash: 허용 목록(조회 전용) ──────────────────────────────────────────────
_ALLOWED_PREFIX = [
    r"git\s+(log|diff|status|show|blame|ls-files|rev-parse|branch\s+--list|remote\s+-v|tag\s+-l)\b",
    r"(rg|grep|egrep|fgrep)\b",
    r"(find|ls|dir|cat|head|tail|wc|stat|file|tree|pwd|echo|date|type|which|where)\b",
    r"cargo\s+(metadata|tree|--version|-V)\b",
    r"(rustc|node|yarn|python|py)\s+(--version|-V|-v)\b",
    r"python\s+\S*doc\S*\.py\b",   # 문서 대조 스크립트(읽기 전용)만
]
_ALLOWED_RE = [re.compile(p) for p in _ALLOWED_PREFIX]

# 어떤 경우에도 차단(허용 목록보다 우선)
_DESTRUCTIVE = [
    r"\brm\b", r"\brmdir\b", r"\bmv\b", r"\bcp\b", r"\bdel\b", r"\berase\b",
    r"\btouch\b", r"\btee\b", r"\btruncate\b", r"\bmkdir\b",
    r">{1,2}\s*[^&\s]",            # 리다이렉션(파일 쓰기)
    r"\bgit\s+(commit|push|pull|reset|checkout|switch|merge|rebase|stash|add|rm|restore|clean|tag\s+[^-]|branch\s+[^-])\b",
    r"\bcargo\s+(build|test|run|check|clippy|fmt|add|remove|install|publish|clean|update|new|init)\b",
    r"\byarn\b(?!\s+(--version|-v))", r"\bnpm\b(?!\s+(--version|-v))", r"\bnpx\b", r"\bpnpm\b",
    r"\bpip\s+install\b", r"\brustup\b", r"(?<![\w/\-])tauri\b",  # src-tauri 경로는 제외
    r"--write\b", r"--fix\b",
]
_DESTRUCTIVE_RE = [re.compile(p) for p in _DESTRUCTIVE]


def _check_bash(command: str) -> None:
    cmd = (command or "").strip()
    if not cmd:
        _block(AGENT + ": 빈 명령(fail-closed).")
    low = cmd.lower()
    for rx in _DESTRUCTIVE_RE:
        if rx.search(low):
            _block(AGENT + "는 변경/파괴/실행 명령을 쓰지 않습니다(소스·설정 수정, 빌드·테스트 실행, 커밋, 설치 금지). "
                   + HANDOFF + ": " + cmd[:160])
    # 체인·파이프의 각 세그먼트가 모두 허용 목록에 있어야 통과
    segments = re.split(r"\s*(?:&&|\|\||;|\|)\s*", low)
    for seg in segments:
        seg = seg.strip()
        if not seg:
            continue
        seg = re.sub(r"^(cd\s+\S+\s*(&&|;)?\s*)", "", seg)  # 선행 cd 허용
        if not seg:
            continue
        if not any(rx.match(seg) for rx in _ALLOWED_RE):
            _block(AGENT + "의 Bash는 조회·분석 명령만 허용합니다(git log/diff/status, grep, rg, find, ls, cat, "
                   "head, tail, wc, cargo metadata/tree). 허용 밖: " + seg[:120])
    sys.exit(0)


# ── Write/Edit: 산출물 경로만 ───────────────────────────────────────────────
_ALLOWED_WRITE = ("doc/", ".claude/reports/")
_ALLOWED_EXT_RE = re.compile(r"\.(md|json)$")
_SOURCE_EXT_RE = re.compile(r"\.(rs|ts|tsx|js|jsx|mjs|cjs|toml|yaml|yml|html|css|sh|ps1|py)$")


def _check_write(tool_input: dict) -> None:
    path = ""
    for key in ("file_path", "path", "filePath", "notebook_path"):
        v = tool_input.get(key)
        if isinstance(v, str) and v.strip():
            path = v
            break
    norm = path.replace("\\", "/").lower()
    if not norm:
        _block(AGENT + "는 산출물 외 파일을 쓰지 않습니다(경로 미확인 → 차단).")
    base = norm.rsplit("/", 1)[-1]
    if base in ("cargo.toml", "package.json", "tauri.conf.json", "vite.config.ts", "tsconfig.json"):
        _block(AGENT + "는 설정 파일을 직접 쓰지 않습니다. " + HANDOFF + ".")
    if _SOURCE_EXT_RE.search(norm):
        _block(AGENT + "는 소스 파일을 직접 쓰지 않습니다. " + HANDOFF + ".")
    if not any(seg in norm for seg in _ALLOWED_WRITE):
        _block(AGENT + "의 산출물은 doc/(요구·설계 문서)·.claude/reports/(리포트·상태)에만 씁니다. " + HANDOFF + ".")
    if not _ALLOWED_EXT_RE.search(norm):
        _block(AGENT + "의 산출물은 .md/.json 문서만 허용합니다: " + norm)
    sys.exit(0)


def main() -> None:
    data, _raw = _load()
    if data is None:
        _block("입력 파싱 실패(fail-closed).")
    tool = data.get("tool_name") or data.get("toolName") or ""
    ti = data.get("tool_input") or {}
    if tool in ("Write", "Edit", "MultiEdit", "NotebookEdit"):
        _check_write(ti if isinstance(ti, dict) else {})
    elif tool == "Bash":
        _check_bash(ti.get("command", "") if isinstance(ti, dict) else "")
    sys.exit(0)


if __name__ == "__main__":
    main()
