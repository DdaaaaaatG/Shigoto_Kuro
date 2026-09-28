#!/usr/bin/env python
"""unsafe 격리 가드: PreToolUse(Write|Edit) (Python).

목적: `unsafe` 코드는 전역 후킹 모듈 `src-tauri/src/hook/` 안에서만 허용한다(확정사항 §2).
      다른 경로의 Rust 파일에 `unsafe` 가 들어가는 쓰기를 차단해 FFI 검증 범위를 한 폴더에 가둔다.

판정
----
- 쓰기 내용(`new_string` 또는 `content`)에 단어 `unsafe` 가 있고,
- 대상 경로가 `src-tauri/src/hook/` 아래가 아니면 → 차단.
- 문서(.md)·주석만의 언급은 제외한다(코드 줄 기준: `//`·`///`·`//!` 로 시작하는 줄은 무시).

설계 원칙: fail-closed — 경로를 못 읽으면 차단.
종료코드 2 = 차단(사유 stderr). 0 = 허용.
"""
import json
import re
import sys

_UNSAFE = re.compile(r"\bunsafe\b")
_COMMENT_LINE = re.compile(r"^\s*//")
# 실제 구문만 판정(2026-09-23 사용자 지정)
_UNSAFE_CODE = re.compile(r"\bunsafe\s*(\{|\(|fn\b|impl\b|trait\b|extern\b)")
_DOC_EXT = (".md", ".markdown", ".txt", ".html", ".json", ".toml", ".yaml", ".yml")


def _block(message: str) -> None:
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    sys.stderr.write("Blocked: " + message + "\n")
    sys.exit(2)


def _load(raw: str):
    try:
        return json.loads(raw)
    except Exception:
        return None


def _code_has_unsafe(text: str) -> bool:
    for line in text.splitlines():
        if _COMMENT_LINE.match(line):
            continue
        if _UNSAFE_CODE.search(line.split('//', 1)[0]):
            return True
    return False


def main() -> None:
    raw = sys.stdin.buffer.read().decode("utf-8", errors="replace")
    data = _load(raw)
    if data is None:
        # 파싱 실패: 원본에 unsafe 가 있으면 보수적으로 차단
        if _UNSAFE.search(raw):
            _block("입력을 해석할 수 없고 unsafe 가 포함되어 차단합니다.")
        sys.exit(0)

    if data.get("tool_name", "") not in ("Write", "Edit", "NotebookEdit"):
        sys.exit(0)

    ti = data.get("tool_input") or {}
    path = ""
    for key in ("file_path", "path", "filePath", "notebook_path"):
        val = ti.get(key)
        if isinstance(val, str) and val.strip():
            path = val
            break
    text = ti.get("new_string") or ti.get("content") or ""
    if not isinstance(text, str) or not text:
        sys.exit(0)

    norm = path.replace("\\", "/").lower()
    if norm.endswith(_DOC_EXT):
        sys.exit(0)
    if not _code_has_unsafe(text):
        sys.exit(0)
    if not norm:
        _block("unsafe 가 포함된 쓰기인데 경로를 확인할 수 없어 차단합니다.")
    if "/src-tauri/src/hook/" in norm or norm.startswith("src-tauri/src/hook/"):
        sys.exit(0)
    _block("unsafe 는 src-tauri/src/hook/ 안에서만 허용됩니다(확정사항 §2). "
           "FFI 호출을 hook 모듈로 옮기고 안전한 래퍼 함수를 노출하세요: " + path)


if __name__ == "__main__":
    main()
