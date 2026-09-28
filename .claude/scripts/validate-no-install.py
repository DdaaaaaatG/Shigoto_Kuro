#!/usr/bin/env python
"""라이브러리 설치 가드: PreToolUse(Bash) (Python).

목적: 새 의존성 추가는 반드시 **사용자 허가 후 메인 세션에서만** 수행한다. 서브에이전트는 사용자에게
직접 허가를 받을 수 없으므로, 새 패키지·크레이트·도구를 설치하는 명령을 차단한다.
(implementer 4종 / ui-tester / ui-fixer / ui-debug / ui-postprocessor / ui-manual-writer 의 Bash에 적용.)

차단
----
- JS: yarn add, yarn global add, npm install|i|add <패키지>, npm -g, pnpm add, bun add, npx <패키지>
- Rust: cargo add, cargo install, rustup
- 기타: pip install, winget, choco, scoop

허용
----
- 인자 없는 의존성 복원: yarn, yarn install, npm install, npm ci, pnpm install
- 프로젝트 도구 실행: npx tauri, npx vitest, npx eslint, npx prettier, npx tsc

설계 원칙: fail-closed — 입력 파싱 실패 시 원본 전체를 검사한다.
종료코드 2 = 차단(사유 stderr). 0 = 허용.
"""
import json
import re
import sys


def _extract_command(raw: str) -> str:
    try:
        data = json.loads(raw)
        cmd = (data.get("tool_input") or {}).get("command")
        if isinstance(cmd, str) and cmd.strip():
            return cmd
    except Exception:
        pass
    return raw


def _block(message: str) -> None:
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    sys.stderr.write("Blocked: " + message + "\n")
    sys.exit(2)


_MSG = "새 의존성 설치는 사용자 허가 후 메인 세션에서만 가능합니다. 후보·용도·대안을 보고하고 승인을 받으세요."

_ADD_ALWAYS = re.compile(r"\b(yarn|pnpm|bun)\s+(global\s+)?add\b", re.IGNORECASE)
_NPM_GLOBAL = re.compile(r"\bnpm\s+(i|install)\b[^&|;]*(\s-g\b|\s--global\b)", re.IGNORECASE)
_NPM_INSTALL = re.compile(r"\b(npm|pnpm)\s+(install|i|add)\b(?P<rest>[^&|;]*)", re.IGNORECASE)
_NPX = re.compile(r"\bnpx\s+(?P<pkg>\S+)", re.IGNORECASE)
_NPX_ALLOWED = {"tauri", "vitest", "eslint", "prettier", "tsc", "@tauri-apps/cli"}
_CARGO = re.compile(r"\bcargo\s+(add|install)\b", re.IGNORECASE)
_RUSTUP = re.compile(r"\brustup\b", re.IGNORECASE)
_OTHER = re.compile(r"\b(pip|pip3)\s+install\b|\bwinget\b|\bchoco\b|\bscoop\b", re.IGNORECASE)


def _has_package_arg(rest: str) -> bool:
    for tok in rest.strip().split():
        if tok and not tok.startswith("-"):
            return True
    return False


def main() -> None:
    raw = sys.stdin.buffer.read().decode("utf-8", errors="replace")
    command = _extract_command(raw)

    if _ADD_ALWAYS.search(command) or _NPM_GLOBAL.search(command):
        _block("패키지 추가(yarn/pnpm/bun add, npm -g)가 감지되었습니다. " + _MSG)
    for m in _NPM_INSTALL.finditer(command):
        if _has_package_arg(m.group("rest")):
            _block("npm/pnpm install <패키지> 가 감지되었습니다. 기존 의존성 복원은 인자 없이 실행하세요. " + _MSG)
    for m in _NPX.finditer(command):
        pkg = m.group("pkg").lower()
        if pkg not in _NPX_ALLOWED:
            _block(f"npx {pkg} 는 설치를 동반할 수 있어 차단합니다(허용: {', '.join(sorted(_NPX_ALLOWED))}). " + _MSG)
    if _CARGO.search(command):
        _block("cargo add/install 이 감지되었습니다. Cargo.toml 의존성 추가는 사용자 승인 후 메인 세션에서 합니다. " + _MSG)
    if _RUSTUP.search(command):
        _block("rustup 은 툴체인을 바꾸므로 사용자가 직접 실행합니다. " + _MSG)
    if _OTHER.search(command):
        _block("시스템 패키지 설치(pip/winget/choco/scoop)가 감지되었습니다. " + _MSG)

    sys.exit(0)


if __name__ == "__main__":
    main()
