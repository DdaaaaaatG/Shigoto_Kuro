#!/usr/bin/env python
"""bridge-implementer 전용: PreToolUse(Write|Edit) 가드 (Python).

목적: bridge 구현자는 **계약 코드(Rust bridge 모듈 + TS 래퍼)와 그 테스트만** 만든다.
      - core 모듈(hook/window/tray/assets/settings) 내부 수정은 core 소관 → 차단.
      - 화면 코드(src/overlay, src/settings, src/components)는 ui 소관 → 차단.
      - tauri.conf.json / Cargo.toml / capabilities 변경은 메인 세션 승인 사항 → 차단(보고로 대체).
허용 경로(프로젝트 루트 기준, 아래 접두어 중 하나):
      src-tauri/src/bridge/ · src/bridge/ · src-tauri/tests/ · src/bridge/__tests__/ · doc/200_설계/bridge/
설계 원칙: fail-closed — 경로를 못 찾거나 허용 목록 밖이면 막는다.
종료코드 2 = 차단(사유 stderr). 0 = 허용.
"""
import json
import re
import sys

ALLOWED_PREFIXES = (
    "src-tauri/src/bridge/",
    "src/bridge/",
    "src-tauri/tests/",
    "src/bridge/__tests__/",
    "doc/200_설계/bridge/",
)


def _read_stdin_utf8() -> str:
    """훅 입력은 UTF-8 JSON이다. Windows 콘솔 기본 cp949로 읽으면 한글 경로가 깨져
    허용 목록 대조에 실패하므로 바이트로 읽어 UTF-8로 디코딩한다."""
    try:
        return sys.stdin.buffer.read().decode("utf-8", "replace")
    except Exception:
        return sys.stdin.buffer.read().decode("utf-8", errors="replace")


def _file_path(raw: str) -> str:
    """stdin JSON에서 대상 경로를 꺼낸다. JSON 파싱 실패 시 정규식으로 한 번 더 시도, 없으면 빈 문자열(fail-closed)."""
    try:
        data = json.loads(raw)
        ti = data.get("tool_input") or {}
        for key in ("file_path", "path", "filePath", "notebook_path"):
            v = ti.get(key)
            if isinstance(v, str) and v.strip():
                return v
        return ""
    except Exception:
        m = re.search(r'"(?:file_path|path|filePath|notebook_path)"\s*:\s*"((?:[^"\\]|\\.)*)"', raw)
        return m.group(1) if m else ""


def _normalize(path: str) -> str:
    """역슬래시→슬래시, 드라이브 문자 제거 후 프로젝트 루트 기준 상대 경로로 정규화한다."""
    p = path.replace("\\", "/")
    # 절대 경로면 프로젝트 루트(kuro_keyviewer/) 이후만 남긴다.
    m = re.search(r"/kuro_keyviewer/(.*)$", p)
    if m:
        p = m.group(1)
    p = re.sub(r"^\./", "", p)
    return p


def _block(message: str) -> None:
    sys.stderr.write("Blocked: " + message + "\n")
    sys.exit(2)


def main() -> None:
    try:  # 차단 사유의 한글이 cp949 콘솔에서 깨지지 않게 한다.
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    raw = _read_stdin_utf8()
    path = _file_path(raw)
    if not path:
        _block("대상 파일 경로를 확인할 수 없습니다(fail-closed). bridge-implementer는 허용 경로에만 씁니다.")

    rel = _normalize(path)

    if any(rel.startswith(prefix) for prefix in ALLOWED_PREFIXES):
        sys.exit(0)

    # 사유를 구체적으로 안내한다.
    if rel.startswith("src-tauri/src/"):
        _block(f"'{rel}' 은 core 모듈입니다. core 내부 수정은 core-implementer 소관입니다 — "
               "필요한 변경을 「core 변경 요구 명세」로 보고하세요.")
    if rel.startswith("src/overlay/") or rel.startswith("src/settings/") or rel.startswith("src/components/"):
        _block(f"'{rel}' 은 화면 코드입니다. ui-implementer 소관입니다 — 계약 변경이면 contract.md 호환성 분류로 ui에 인계하세요.")
    if re.search(r"(tauri\.conf\.json|Cargo\.toml|capabilities/)", rel):
        _block(f"'{rel}' 변경(권한·의존성·번들 설정)은 메인 세션 승인 사항입니다. 필요한 권한·의존성을 보고하세요.")
    _block(f"'{rel}' 은 bridge-implementer 허용 경로가 아닙니다. 허용: " + ", ".join(ALLOWED_PREFIXES))


if __name__ == "__main__":
    main()
