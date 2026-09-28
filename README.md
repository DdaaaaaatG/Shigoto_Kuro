# kuro_keyviewer

봉고캣(Bongo Cat)류 **키뷰어**. 키보드를 치거나 마우스를 움직이면 사용자가 넣은 PNG 이미지가 바뀌거나 움직이는 투명 오버레이를 화면 위에 띄운다. Windows 10/11 전용 데스크톱 앱(OBS 연동 없음, exe 직접 실행).

- 확정 사양·규칙의 단일 소스: [`doc/000_프로젝트_확정사항.md`](doc/000_프로젝트_확정사항.md)
- 이미지 파츠 제작 가이드: [`doc/100_요구조건/parts-spec.md`](doc/100_요구조건/parts-spec.md)
- bridge 계약(command·event): `doc/200_설계/bridge/contract.md`

## 기술 스택

| 항목 | 값 |
|---|---|
| 프레임워크 | Tauri 2 |
| 네이티브 | Rust (stable) — 전역 입력 후킹은 `windows` 크레이트로 `SetWindowsHookExW` 직접 호출 |
| 프론트 | React 18 + TypeScript + Vite, CSS Modules |
| 패키지 매니저 | yarn 1.x |
| 테스트 | `cargo test` / vitest |

## 개발 환경 준비 (최초 1회)

1. **Rust 툴체인** — <https://rustup.rs> 에서 `rustup-init.exe` 실행 → `stable-x86_64-pc-windows-msvc`. Visual Studio Build Tools의 "C++ 빌드 도구" 워크로드가 필요하다.
2. **WebView2 런타임** — Windows 10/11에는 보통 설치돼 있다. 없으면 인스톨러가 내려받는다(`downloadBootstrapper`).
3. **Node 20+ 와 yarn 1.x**.
4. 의존성 설치

   ```bash
   yarn install
   ```

5. 앱 아이콘 생성 (한 번만, 1024×1024 PNG 준비 후)

   ```bash
   yarn tauri icon path/to/app-icon.png
   ```

   `src-tauri/icons/` 에 `32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.ico` 가 만들어진다. 트레이 아이콘도 이 창 아이콘을 재사용한다.

## 명령

| 목적 | 명령 |
|---|---|
| 개발 실행(핫리로드) | `yarn tauri dev` |
| 프론트 타입 검사 | `yarn tsc` |
| 프론트 테스트 | `yarn test` |
| Rust 테스트 | `cd src-tauri && cargo test` |
| Rust 린트 | `cd src-tauri && cargo clippy && cargo fmt --check` |
| 린트/포맷(TS) | `yarn lint` / `yarn format` |
| 배포 빌드(NSIS 인스톨러) | `yarn tauri build` → `src-tauri/target/release/bundle/nsis/` |

## 폴더 구조

```
src/                React (ui 계층)
  main.tsx          창 라벨(overlay/settings)로 화면 분기
  overlay/          오버레이 화면
  settings/         설정 화면
  bridge/           invoke·listen 래퍼 + TS 계약 타입 (Rust 와 1:1)
  state/            입력 상태기계·마우스 매핑 (순수 TS, vitest)
  components/       공용 컴포넌트·훅·유틸
src-tauri/          Rust (core + bridge 계층)
  src/hook/         전역 키보드·마우스 훅 — unsafe 허용 유일 구역
  src/window/       오버레이 창 위치·표시·가상 화면 범위
  src/tray/         트레이 아이콘·메뉴
  src/assets/       PNG 검증·저장·manifest
  src/settings/     설정 JSON
  src/bridge/       commands.rs(invoke) · events.rs(emit) · types.rs(계약 표면)
doc/                요구조건·설계·검증 문서
.claude/            에이전트·스킬·훅 (개발 자동화)
```

계층은 `ui → bridge → core` 단방향이다. 화면 코드는 `src/bridge` 래퍼만 호출하고 `@tauri-apps/api` 를 직접 쓰지 않는다.

## 데이터 위치

`%APPDATA%\com.kuro.keyviewer\` — `settings.json`, `assets\*.png`, `assets\manifest.json`.

## 상태

뼈대 단계. 설계 문서(`requirements.md`·`design.md`)와 화면 구현은 `.claude` 의 ui-manager 파이프라인으로 진행한다.
