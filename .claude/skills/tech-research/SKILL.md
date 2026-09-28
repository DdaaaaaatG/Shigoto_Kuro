---
name: tech-research
description: 기술/라이브러리 조사 및 추천 — Rust 크레이트, npm 패키지, Tauri 플러그인. 조사 절차(공식 문서 → crates.io/npm 지표 → 라이선스 → Windows 지원 → 유지보수 상태 → 확정사항 충돌 검사), 비교표·추천 보고 양식, 설치 허가제(설치는 사용자 승인 후 메인 세션에서)를 정의한다. "라이브러리 검색", "크레이트 추천", "기술 조사", "tech research" 요청 시 참조한다.
---

# 기술 조사 (Tech Research)

- 목적: 필요한 기능을 **어떤 크레이트·패키지·플러그인으로** 해결할지 근거와 함께 추천한다.
- 적용: 메인 세션(WebSearch·WebFetch 사용). 서브에이전트는 이 스킬로 조사하되 **설치하지 않는다**.
- 제품 규격은 `doc/000_프로젝트_확정사항.md`. 확정사항과 충돌하는 후보(예: 후킹에 rdev, 브라우저 MCP)는 추천하지 않는다.

## 1. 조사 절차

| 단계 | 내용 | 확인 지점 |
|---|---|---|
| 1 | **요구 정리** | 무엇을(기능), 어디서(core/bridge/ui), 제약(Windows 전용·오프라인·번들 크기·지연) |
| 2 | **기존 보유 확인** | `Cargo.toml`·`package.json`·Tauri 내장 API(`@tauri-apps/api`, tauri 플러그인)로 이미 되는지. 되면 조사 종료 |
| 3 | **후보 수집** | 공식 문서(docs.rs, tauri.app, npm 문서) 우선. 블로그·SO는 보조 |
| 4 | **지표** | crates.io/npm 다운로드·최근 릴리스 일자·open issue·Rust edition/MSRV·TypeScript 타입 제공 여부 |
| 5 | **라이선스** | MIT/Apache-2.0/BSD 선호. GPL 계열은 배포 형태(exe 동봉)와 충돌 가능 → 표기 |
| 6 | **Windows 지원** | Win10/11 동작, WebView2 호환, unsafe/FFI 여부, 유지보수 이슈 |
| 7 | **확정사항 충돌** | unsafe 격리 원칙(hook 밖 unsafe 유발?), 이미지 규격, 브라우저 MCP 미사용 등 |
| 8 | **결론** | 후보 ≤ 3개 비교표 + 추천 1개 + 근거 + 설치 명령(실행하지 않음) |

## 2. 자주 나오는 영역과 기본 방향

| 영역 | 기본 방향 | 비고 |
|---|---|---|
| 전역 입력 후킹 | `windows` 크레이트(`Win32_UI_WindowsAndMessaging`, `Win32_UI_Input_KeyboardAndMouse`) 직접 호출 | 🔒 확정. rdev·device_query 등 포장 크레이트 금지 |
| PNG 검증·크기 읽기 | `png` 크레이트(IHDR만 읽기) 또는 `image`(디코드 필요 시) | 파일 상한 검사 후 디코드 |
| 설정 직렬화 | `serde` + `serde_json` | `#[serde(default)]` |
| 에러 타입 | `thiserror` | 모듈별 enum |
| 앱 데이터 경로 | Tauri `app.path().app_data_dir()` | 별도 크레이트 불필요 |
| 트레이·자동 실행 | Tauri 내장 tray API, `tauri-plugin-autostart` | 플러그인은 capabilities 권한 필요 |
| 창 투명·항상 위·클릭 통과 | Tauri 창 설정(`transparent`, `alwaysOnTop`, `decorations: false`) + `set_ignore_cursor_events` | 추가 크레이트 불필요 |
| 프론트 테스트 | vitest + @testing-library/react | |
| E2E | tauri-driver + msedgedriver + WebdriverIO | 설치는 사용자 승인 |
| 오버레이 렌더 | React + CSS transform, 팔 곡선은 SVG path / Canvas 2D | 외부 애니메이션 라이브러리는 필요 입증 후 |

## 3. 보고 양식

```
[기술 조사] {주제}
■ 요구: … (계층: core/bridge/ui, 제약: …)
■ 기존 보유로 해결 가능? 예/아니오 (근거)
■ 후보 비교
| 후보 | 버전·최근 릴리스 | 라이선스 | Windows | 다운로드/이슈 | 확정사항 충돌 | 비고 |
■ 추천: {후보} — 근거 3줄
■ 설치 명령(실행 안 함): cargo add … / yarn add …
■ 도입 시 영향: Cargo.toml·capabilities·번들 크기·unsafe 여부
■ 출처: (URL 목록)
```

## 4. 설치 허가제

- 조사와 설치는 분리한다. **설치는 메인 세션에서 사용자 승인 후**에만 실행한다. 서브에이전트의 `cargo add`·`yarn add`·`npx`는 훅이 차단한다.
- 승인 후 설치했으면 `doc/state.json` `dependencies_approved`(구축 중) 또는 완료 보고에 기록한다.
