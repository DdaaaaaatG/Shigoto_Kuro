---
description: 개발 환경 시작 — Rust 툴체인 확인 → yarn tauri dev 백그라운드 기동(이미 떠 있으면 재사용) → 상태 보고
---

# 개발 환경 시작

`yarn tauri dev`로 Vite 개발 서버와 Tauri 앱을 함께 띄운다.

> 아래 명령은 **프로젝트 루트가 작업 디렉터리**라는 전제다. 절대 경로를 쓰지 않는다.

## 0. 툴체인 확인 (실패하면 여기서 중단)

```bash
cargo --version && rustc --version
node --version && yarn --version
```

- `cargo`가 없으면 **설치는 사용자 몫**이다. 아래를 안내하고 멈춘다. 이 세션에서 설치 명령을 실행하지 않는다(라이브러리 설치 허가제).
  - rustup: https://rustup.rs (Windows는 `rustup-init.exe`, 기본 설정 그대로)
  - 또는 `winget install Rustlang.Rustup`
  - 설치 후 새 터미널에서 `cargo --version`이 나오면 다시 `/dev-start`
- `node_modules`가 없으면 `yarn install`(기존 의존성 복원 — 허가제 대상 아님).

## 1. 이미 떠 있는지 확인

Vite dev 포트는 `src-tauri/tauri.conf.json`의 `build.devUrl`(기본 `http://localhost:1420`)이다.

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:1420/ || echo "not running"
```

- `200`이면 이미 실행 중 → 재시작하지 않고 3단계로.
- 응답 없음 → 2단계.

## 2. 백그라운드 시작

```bash
yarn tauri dev > .dev-tauri.log 2>&1 &
```

- Bash 도구의 `run_in_background`로 실행한다(포그라운드는 세션이 막힌다).
- 로그: `.dev-tauri.log`(루트, `.gitignore` 대상). 첫 빌드는 Rust 컴파일 때문에 수 분 걸릴 수 있다.
- 기동 확인은 로그의 `Running DevCommand` / `Finished` 줄과 1단계 curl 재시도로 한다. 30초 간격 최대 10회.
- 컴파일 오류가 나면 로그의 `error[E…]` 줄을 그대로 보고하고 `/dev-build`로 원인을 좁힌다.

## 3. 상태 보고

| 항목 | 확인 |
|---|---|
| Vite (`devUrl`) | curl 200 여부 |
| Tauri 앱 프로세스 | 오버레이 창·트레이 아이콘 표시 여부(로그 `Finished` + 사용자 확인) |
| 로그 | `.dev-tauri.log` 마지막 20줄 |

## 이후 — 소스 수정 시

- `src/**` 수정: Vite HMR이 자동 반영한다. 빌드 불필요.
- `src-tauri/**` 수정: Tauri가 Rust를 재컴파일하고 앱을 재시작한다(수십 초). 로그로 완료 확인.
- 화면을 눈으로 확인하려면 `/run-app`(스크린샷 저장).
