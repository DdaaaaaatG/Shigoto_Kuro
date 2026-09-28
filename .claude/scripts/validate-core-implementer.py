#!/usr/bin/env python
"""core-implementer / bridge-implementer 전용: PreToolUse(Bash) 가드 (Python).

목적: Rust·Tauri 구현에 필요한 빌드·테스트·린트는 허용하되, 파괴적 명령·원격 반영·의존성 설치를
      도구 차원에서 차단한다.

허용
----
- cargo build/check/test/clippy/fmt/run/doc/metadata/tree
- yarn tauri dev|build, yarn build/test/lint/dev, 조회 명령 전부(git status/log/diff, ls, cat, grep …)

차단
----
- 파괴: rm -rf, del /s, rmdir /s, Remove-Item -Recurse, 앱 데이터 폴더(AppData / %APPDATA%) 삭제
- git: push, reset --hard, checkout -- <경로>, clean, rebase
- cargo: publish, clean(사용자 요청 시 메인 세션에서), add, install
- 설치: yarn add, npm install <패키지>, npx <미허용 패키지>, rustup, pip install, winget, choco, scoop

설계 원칙: fail-closed — 파싱 실패 시 원본 전체를 검사하고, 의심되면 막는다.
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


_RULES = [
    (re.compile(r"\brm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)\b", re.I),
     "rm -rf 는 차단됩니다. 삭제가 필요하면 대상을 보고하고 사용자가 메인 세션에서 수행합니다."),
    (re.compile(r"\b(del|erase)\b[^&|;]*\s/s\b", re.I), "del /s 는 차단됩니다."),
    (re.compile(r"\brmdir\b[^&|;]*\s/s\b", re.I), "rmdir /s 는 차단됩니다."),
    (re.compile(r"\bRemove-Item\b[^&|;]*-Recurse\b", re.I), "Remove-Item -Recurse 는 차단됩니다."),
    (re.compile(r"\b(rm|del|erase|rmdir|Remove-Item)\b[^&|;]*(appdata|%appdata%|\$env:appdata)", re.I),
     "앱 데이터 폴더(AppData) 삭제는 사용자 설정·이미지를 지웁니다. 차단합니다."),
    (re.compile(r"\bgit\s+push\b", re.I), "git push 는 /sync 명령으로 사용자가 수행합니다."),
    (re.compile(r"\bgit\s+reset\b[^&|;]*--hard\b", re.I), "git reset --hard 는 작업 내용을 잃습니다. 차단합니다."),
    (re.compile(r"\bgit\s+checkout\s+--\s", re.I), "git checkout -- <경로> 는 수정 내용을 되돌립니다. 차단합니다."),
    (re.compile(r"\bgit\s+(clean|rebase)\b", re.I), "git clean/rebase 는 차단됩니다."),
    (re.compile(r"\bcargo\s+publish\b", re.I), "cargo publish 는 차단됩니다."),
    (re.compile(r"\bcargo\s+clean\b", re.I), "cargo clean 은 사용자 요청 시 메인 세션에서 실행합니다."),
    (re.compile(r"\bcargo\s+(add|install)\b", re.I),
     "cargo add/install 은 의존성을 바꿉니다. Cargo.toml 변경은 사용자 승인 후 메인 세션에서 합니다."),
    (re.compile(r"\b(yarn|pnpm|bun)\s+(global\s+)?add\b", re.I), "yarn/pnpm/bun add 는 사용자 승인 후 메인 세션에서 합니다."),
    (re.compile(r"\bnpm\s+(i|install)\b[^&|;]*(\s-g\b|\s--global\b)", re.I), "npm 전역 설치는 차단됩니다."),
    (re.compile(r"\brustup\b", re.I), "rustup 은 툴체인을 바꾸므로 사용자가 직접 실행합니다."),
    (re.compile(r"\b(pip|pip3)\s+install\b|\bwinget\b|\bchoco\b|\bscoop\b", re.I), "시스템 패키지 설치는 차단됩니다."),
]
_NPM_INSTALL = re.compile(r"\b(npm|pnpm)\s+(install|i|add)\b(?P<rest>[^&|;]*)", re.I)
_NPX = re.compile(r"\bnpx\s+(?P<pkg>\S+)", re.I)
_NPX_ALLOWED = {"tauri", "vitest", "eslint", "prettier", "tsc", "@tauri-apps/cli"}


def _has_package_arg(rest: str) -> bool:
    return any(tok and not tok.startswith("-") for tok in rest.strip().split())


def main() -> None:
    raw = sys.stdin.buffer.read().decode("utf-8", errors="replace")
    command = _extract_command(raw)

    for pattern, message in _RULES:
        if pattern.search(command):
            _block(message)
    for m in _NPM_INSTALL.finditer(command):
        if _has_package_arg(m.group("rest")):
            _block("npm/pnpm install <패키지> 는 사용자 승인 후 메인 세션에서 합니다.")
    for m in _NPX.finditer(command):
        if m.group("pkg").lower() not in _NPX_ALLOWED:
            _block(f"npx {m.group('pkg')} 는 설치를 동반할 수 있어 차단합니다.")

    sys.exit(0)


if __name__ == "__main__":
    main()
