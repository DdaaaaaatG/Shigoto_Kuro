---
description: 전체 테스트 — cargo test(src-tauri) + yarn test --run. 인자로 core / bridge / ui / <파일경로> 범위 지정 가능. 결과 요약과 실패 라우팅
---

# 테스트 실행

`/test` 뒤의 인자로 범위를 정한다. 인자가 없으면 전체.

> 프로젝트 루트가 작업 디렉터리다. 절대 경로를 쓰지 않는다.

| 인자 | 실행 |
|---|---|
| (없음) | `cargo test` + `yarn test --run` |
| `core` | `cd src-tauri && cargo test` (bridge 모듈 제외: `cargo test -- --skip bridge`) |
| `bridge` | `cd src-tauri && cargo test bridge` + `yarn test --run src/bridge` |
| `ui` | `yarn test --run` (src/overlay, src/settings, src/components, src/state) |
| `<파일경로>` | `.rs`면 `cargo test --test <이름>` 또는 `cargo test <모듈경로>`, `.ts/.tsx`면 `yarn test --run <파일경로>` |

## 실행

```bash
cd src-tauri && cargo test 2>&1 | tail -40
```
```bash
yarn test --run 2>&1 | tail -40
```

- `cargo`가 없으면 Rust 쪽은 SKIP으로 표기한다(`/dev-start` 0단계 안내).
- 두 명령은 독립이라 병렬 실행해도 된다.
- `yarn test`는 vitest다. `--run`을 빼면 watch 모드로 세션이 막힌다.

## 결과 보고 형식

```
테스트: PASS | FAIL
- cargo test : N passed / M failed / K ignored  (실패: 모듈::테스트명 …)
- vitest     : N passed / M failed  (실패: 파일 > 테스트명 …)
```

실패한 테스트는 **이름·파일·첫 단언 메시지**까지 적는다. "몇 개 실패"만 적지 않는다.

## 실패 라우팅 (이 명령은 고치지 않는다)

| 실패 위치 | 라우팅 |
|---|---|
| `src-tauri/src/hook|window|tray|assets|settings` 테스트 | core-manager 세션 |
| `src-tauri/src/bridge` · `src/bridge` 테스트 | bridge-manager 세션 |
| `src/overlay`·`src/settings`·`src/components`·`src/state` 테스트 | ui-debug 세션 (기존 화면) / ui-manager (구축 중) |

- 같은 테스트가 원인 수정 없이 2회 이상 실패하면 멈추고 보고한다.
- 전체 PASS는 `/sync` 전 verify-manager 게이트의 입력이 된다.
