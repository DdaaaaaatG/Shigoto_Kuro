#!/usr/bin/env python
"""verify 읽기 전용 가드: PreToolUse(Write|Edit, Bash) (Python).

목적: 배포 전 검증(verify-*) 에이전트는 **측정·판정만** 한다. 소스·설정을 바꾸지 않는다.
- Write|Edit: `doc/300_검증/`·`.claude/reports/` 경로의 `.md`/`.json`에만 허용(리포트 산출). 그 외 차단.
- Bash: 빌드·린트(--check)·테스트·조회 허용 —
    cargo fmt --check / cargo clippy / cargo test / cargo build / cargo check /
    yarn tsc / yarn lint / yarn test / yarn build / yarn tauri build /
    git log·diff·status·show, grep·rg·find·ls·cat·head·tail·wc.
  차단: cargo fmt(--check 없음), eslint --fix, prettier --write, rm/mv/cp, git 쓰기, 설치(yarn add·npm install·cargo add/install·rustup).

설계 원칙: fail-closed — 파싱 실패/판단 불가 시 막는다. 종료코드 2 = 차단(사유 stderr), 0 = 허용.
"""
import json
import re
import sys


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


_DESTRUCTIVE = [
    r"\brm\b", r"\brmdir\b", r"\bmv\b", r"\bcp\b", r"\bdel\b", r"\berase\b", r"\btruncate\b", r"\btee\b",
    r">{1,2}\s*[^&\s]",  # 파일 리다이렉션
    r"\bgit\s+(commit|push|pull|reset|checkout|switch|merge|rebase|stash|add|rm|restore|clean)\b",
    r"\bcargo\s+(add|remove|install|publish|clean|update|new|init|run)\b",
    r"\byarn\s+(add|remove|upgrade|tauri\s+dev)\b", r"\bnpm\s+(install|i|add|update)\b", r"\bnpx\b", r"\bpnpm\b",
    r"\bpip\s+install\b", r"\brustup\b",
    r"--write\b", r"--fix\b",
]
_DESTRUCTIVE_RE = [re.compile(p) for p in _DESTRUCTIVE]

_ALLOWED_PREFIX = [
    r"cargo\s+fmt\b.*--check", r"cargo\s+clippy\b", r"cargo\s+test\b", r"cargo\s+build\b", r"cargo\s+check\b",
    r"cargo\s+(metadata|tree|--version|-V)\b",
    r"yarn\s+(tsc|lint|test|build|tauri\s+build|--version|-v)\b",
    r"git\s+(log|diff|status|show|blame|ls-files|rev-parse|branch\s+--list|remote\s+-v)\b",
    r"(rg|grep|egrep|fgrep|find|ls|dir|cat|head|tail|wc|stat|file|tree|pwd|echo|date|type|which|where)\b",
    r"(rustc|node|python|py)\s+(--version|-V|-v)\b",
    r"python\s+\S*doc\S*\.py\b",
]
_ALLOWED_RE = [re.compile(p) for p in _ALLOWED_PREFIX]


def _check_bash(command: str) -> None:
    cmd = (command or "").strip()
    if not cmd:
        _block("verify: 빈 명령(fail-closed).")
    low = cmd.lower()
    for rx in _DESTRUCTIVE_RE:
        if rx.search(low):
            _block("verify는 읽기 전용입니다. 변경/파괴 명령을 실행하지 않습니다(소스 수정·커밋·설치·포맷 쓰기 금지). "
                   "수정은 생산 에이전트(ui-debug/bridge-manager/core-manager)로 라우팅하세요: " + cmd[:160])
    if re.search(r"\bcargo\s+fmt\b", low) and "--check" not in low:
        _block("verify는 파일을 수정하지 않습니다. 'cargo fmt'는 --check 로만 실행하세요.")
    if re.search(r"\b(eslint|prettier)\b", low) and re.search(r"--(fix|write)\b", low):
        _block("verify는 파일을 수정하지 않습니다. eslint --fix / prettier --write 금지.")
    segments = re.split(r"\s*(?:&&|\|\||;|\|)\s*", low)
    for seg in segments:
        seg = seg.strip()
        seg = re.sub(r"^(cd\s+\S+\s*(&&|;)?\s*)", "", seg)
        if not seg:
            continue
        if not any(rx.match(seg) for rx in _ALLOWED_RE):
            _block("verify의 Bash는 빌드·린트(--check)·테스트·조회만 허용합니다. 허용 밖: " + seg[:120])
    sys.exit(0)


_ALLOWED_WRITE = ("doc/300_검증/", ".claude/reports/")
_ALLOWED_EXT_RE = re.compile(r"\.(md|json)$")


def _check_write(tool_input: dict) -> None:
    path = ""
    for key in ("file_path", "path", "filePath", "notebook_path"):
        v = tool_input.get(key)
        if isinstance(v, str) and v.strip():
            path = v
            break
    norm = path.replace("\\", "/").lower()
    if not norm:
        _block("verify는 리포트 외 파일을 쓰지 않습니다(경로 미확인 → 차단).")
    if any(seg.lower() in norm for seg in _ALLOWED_WRITE) and _ALLOWED_EXT_RE.search(norm):
        sys.exit(0)
    _block("verify는 읽기 전용입니다. 리포트는 doc/300_검증/ 또는 .claude/reports/ 의 .md/.json 에만 쓰고, "
           "코드 수정은 생산 에이전트(ui-debug/bridge-manager/core-manager)로 라우팅하세요.")


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
