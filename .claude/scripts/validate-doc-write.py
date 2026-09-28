#!/usr/bin/env python
"""문서 작성자 전용: PreToolUse(Write|Edit) 가드 (Python).

대상: ui-designer · ui-test-designer · core-designer · bridge-designer · ui-component-designer
목적: 설계·시나리오 작성자는 **문서와 테스트 스펙만** 쓴다. 제품 소스(.rs/.ts/.tsx/.js)와
      설정 파일(Cargo.toml·package.json·tauri.conf.json 등)은 구현자 소관이므로 차단한다.

허용
- 확장자 `.md` 인 파일 전부
- `doc/` 아래 전부
- 화면 폴더 테스트 경로 `src/*/test/` 아래 (`.test.ts` / `.test.tsx` / `.md` 포함)
- `.claude/reports/` 아래

차단
- `.rs` · `.ts`(테스트 제외) · `.tsx`(테스트 제외) · `.js` · `.jsx` · `.json`(설정) · `Cargo.toml` · `package.json` 등
  그 밖의 모든 경로

설계 원칙: fail-closed — 경로를 못 찾거나 허용 목록 밖이면 막는다.
종료코드 2 = 차단(사유 stderr). 0 = 허용.
"""
import json
import re
import sys
try:
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass


def _file_path(raw: str) -> str:
    try:
        data = json.loads(raw)
        ti = data.get("tool_input") or {}
        for key in ("file_path", "path", "filePath", "notebook_path"):
            v = ti.get(key)
            if isinstance(v, str) and v.strip():
                return v
    except Exception:
        return ""
    return ""


def _block(message: str) -> None:
    sys.stderr.write("Blocked: " + message + "\n")
    sys.exit(2)


def _normalize(path: str) -> str:
    p = path.replace("\\", "/")
    p = re.sub(r"/{2,}", "/", p)
    return p.lower()


def _is_allowed(path: str) -> bool:
    # 1) 마크다운은 어디든 허용
    if path.endswith(".md") or path.endswith(".markdown"):
        return True
    # 2) doc/ 아래 전부
    if "/doc/" in path or path.startswith("doc/"):
        return True
    # 3) .claude/reports/ 아래
    if "/.claude/reports/" in path or path.startswith(".claude/reports/"):
        return True
    # 4) 화면 폴더 test/ 아래 (src/{screen}/test/**)
    if re.search(r"(^|/)src/[^/]+/test/", path):
        return True
    return False


def main() -> None:
    # 훅 입력은 UTF-8 JSON — 콘솔 코드페이지(cp949)와 무관하게 바이트로 읽어 디코드한다.
    raw = sys.stdin.buffer.read().decode("utf-8", errors="replace")
    path = _normalize(_file_path(raw))

    if not path:
        _block("문서 작성자: 쓰기 대상 경로를 확인할 수 없어 차단합니다. "
               "허용 범위는 .md · doc/ · src/{화면}/test/ · .claude/reports/ 입니다.")

    if _is_allowed(path):
        sys.exit(0)

    _block("문서 작성자는 문서(.md)·doc/·화면 test/·.claude/reports/ 만 씁니다. "
           f"'{path}' 는 제품 소스 또는 설정 파일입니다 — 구현은 implementer 소관입니다.")


if __name__ == "__main__":
    main()
