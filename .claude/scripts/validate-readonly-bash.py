#!/usr/bin/env python
"""읽기 전용 Bash 가드: PreToolUse(Bash) (Python).

목적: 매니저·검증자(checker)·분석가(analyst)·아키텍트는 **조회·분석만** 한다.
      파일을 쓰거나 git·cargo·yarn으로 상태를 바꾸는 명령은 역할 위반이므로 차단한다.

허용
----
- 조회: git status/log/diff/show/branch, ls, dir, cat, type, head, tail, wc, find, grep, rg, echo, date, pwd
- 분석 스크립트: `python scripts/docs/<파일>.py ...`
- 크레이트 조회: cargo metadata, cargo tree
- 테스트 실행(관찰용, 소스 불변): cargo test, yarn test, npx vitest
- 파이프는 grep/rg/head/tail/wc/sort/uniq/cut/tr 로 이어질 때만

차단
----
- 리다이렉션(`>`, `>>`), 쓰기 명령(rm/mv/cp/touch/mkdir/del/rmdir/tee/sed -i)
- git commit/push/reset/checkout/add/stash/rebase/merge/clean
- cargo build/test/run/clippy/fmt/clean/publish, yarn/npm/npx 실행 전부
- 체인(`&&`, `;`, `||`) 뒤에 허용 목록 밖 명령이 오는 경우

설계 원칙: fail-closed — 파싱 실패·판단 불가는 차단.
종료코드 2 = 차단(사유 stderr). 0 = 허용.
"""
import json
import re
import shlex
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


# 단독 실행 허용 명령(첫 토큰)
_ALLOWED_HEAD = {
    "ls", "dir", "cat", "type", "head", "tail", "wc", "find", "grep", "rg",
    "echo", "date", "pwd", "printf", "test", "true", "which", "where",
}
# 파이프 뒤에 올 수 있는 필터 명령
_ALLOWED_FILTER = {"grep", "rg", "head", "tail", "wc", "sort", "uniq", "cut", "tr", "cat"}
# git 서브커맨드 허용
_GIT_READ = {"status", "log", "diff", "show", "branch", "rev-parse", "ls-files", "blame", "remote"}
# cargo 서브커맨드 허용
_CARGO_READ = {"metadata", "tree", "test"}  # test: 소스 불변, target/만 씀

_REDIRECT = re.compile(r"(?<![<>])>{1,2}(?![<>])")
_SED_INPLACE = re.compile(r"\bsed\b.*\s-i\b")
_PY_DOCS = re.compile(r"^(python|python3|py)$")


def _check_segment(seg: str, after_pipe: bool) -> None:
    seg = seg.strip()
    if not seg:
        return
    try:
        toks = shlex.split(seg, posix=True)
    except ValueError:
        _block("명령을 해석할 수 없어 차단합니다(따옴표 불일치 등).")
    if not toks:
        return
    head = toks[0].lower()
    if after_pipe:
        if head in _ALLOWED_FILTER:
            return
        _block(f"파이프 뒤에는 필터 명령({', '.join(sorted(_ALLOWED_FILTER))})만 허용됩니다: {head}")
    if head in _ALLOWED_HEAD:
        return
    if head == "git":
        sub = toks[1].lower() if len(toks) > 1 else ""
        if sub in _GIT_READ:
            return
        _block(f"읽기 전용 역할에서는 git {sub}을(를) 실행할 수 없습니다(조회만 허용).")
    if head == "cargo":
        sub = toks[1].lower() if len(toks) > 1 else ""
        if sub in _CARGO_READ:
            return
        _block(f"읽기 전용 역할에서는 cargo {sub}을(를) 실행할 수 없습니다(metadata/tree/test만 허용).")
    if head in ("yarn", "npx"):
        sub = toks[1].lower() if len(toks) > 1 else ""
        if sub in ("test", "vitest"):
            return  # 테스트 실행은 소스를 바꾸지 않는다(관찰용 1회 허용)
        _block(f"읽기 전용 역할에서는 {head} {sub}을(를) 실행할 수 없습니다(test/vitest만 허용).")
    if _PY_DOCS.match(head):
        script = toks[1].replace("\\", "/") if len(toks) > 1 else ""
        if "scripts/docs/" in script and script.endswith(".py"):
            return
        _block("python 실행은 scripts/docs/ 아래 분석 스크립트만 허용됩니다.")
    _block(f"읽기 전용 역할에서 허용되지 않는 명령입니다: {head}")


def main() -> None:
    raw = sys.stdin.buffer.read().decode("utf-8", errors="replace")
    command = _extract_command(raw)

    if _REDIRECT.search(command):
        _block("리다이렉션(>, >>)은 파일을 쓰므로 차단합니다.")
    if _SED_INPLACE.search(command):
        _block("sed -i 는 파일을 고치므로 차단합니다.")

    # 체인 분리: &&, ||, ; 로 나눈 뒤 각 구간을 | 로 다시 나눈다
    for chain in re.split(r"&&|\|\||;", command):
        parts = chain.split("|")
        for i, part in enumerate(parts):
            _check_segment(part, after_pipe=(i > 0))

    sys.exit(0)


if __name__ == "__main__":
    main()
