---
description: 검증 빌드 — cargo check(src-tauri) + yarn tsc --noEmit + yarn build. 배포 빌드가 아니라 "컴파일이 되는가"만 본다
---

# 검증 빌드

소스가 컴파일되는지 세 단계로 확인한다. 배포 산출물은 만들지 않는다(그건 `/deploy`).

> 프로젝트 루트가 작업 디렉터리다. 절대 경로를 쓰지 않는다.

## 실행 단계 (모두 실행한 뒤 종합 — 중간에 멈추지 않는다)

1. **Rust 타입 검사**
   ```bash
   cd src-tauri && cargo check 2>&1 | tail -30
   ```
   `cargo`가 없으면 SKIP으로 표기하고 `/dev-start` 0단계 안내를 남긴다.

2. **TypeScript 타입 검사**
   ```bash
   yarn tsc --noEmit 2>&1 | tail -30
   ```

3. **프론트 번들 빌드**
   ```bash
   yarn build 2>&1 | tail -30
   ```
   산출물은 `dist/`(`.gitignore` 대상). Tauri가 `frontendDist`로 참조한다.

## 결과 보고 형식

```
검증 빌드: PASS | FAIL
- cargo check : exit 0 | exit N (error[E0xxx] 요약 n건) | SKIP(툴체인 없음)
- tsc --noEmit: exit 0 | 오류 n건 (파일:라인 첫 3건)
- yarn build  : exit 0 | 오류 요약
```

## 실패 라우팅

| 실패 위치 | 라우팅 |
|---|---|
| `src-tauri/src/hook|window|tray|assets|settings` | core-manager 세션 |
| `src-tauri/src/bridge` 또는 `src/bridge` | bridge-manager 세션 (TS↔Rust 타입 불일치 포함) |
| `src/overlay`·`src/settings`·`src/components` | ui-debug 세션 |

- 자동 수정하지 않는다. 이 명령은 측정만 한다.
- 경고(warning)는 보고에 포함하되 PASS 판정을 막지 않는다. `cargo clippy`·`yarn lint`는 verify-manager 몫이다.
