---
description: Git Sync — 변경 목록 제시 → 사용자 확인 → git add -A → 커밋(type(scope): 한국어 요약) → git push origin main. 단일 저장소·main 브랜치 전용
---

# Git Sync (Commit + Push)

단일 저장소, `main` 브랜치, 1인 개발이다. upstream·fork·cherry-pick 같은 절차는 없다.

> 프로젝트 루트가 작업 디렉터리다. 절대 경로를 쓰지 않는다.

## 0. 사전 확인

```bash
git status --porcelain
git remote -v
git branch --show-current
```

- 변경이 없으면 「커밋할 변경 없음」으로 끝낸다.
- 원격(`origin`)이 없으면 push를 건너뛰고 안내한다: `git remote add origin <GitHub URL>` 후 다시 `/sync`.
- 브랜치가 `main`이 아니면 이유를 사용자에게 묻는다(이 프로젝트는 main 단일 브랜치).
- **verify-manager PASS 후 실행을 권고한다.** 검증을 건너뛰고 싶다면 사용자가 명시적으로 말한 경우에만 진행한다.

## 1. 변경 목록 제시 → 사용자 확인 (필수)

`git status`와 `git diff --stat`를 그대로 보여주고 **커밋 여부와 메시지를 사용자에게 확인**받는다. 확인 없이 다음 단계로 가지 않는다.

- `.gitignore`에 걸려야 할 것이 섞여 있으면(`.dev-tauri.log`, `dist/`, `src-tauri/target/`, `deploy/`, `_reference/`) 커밋 전에 짚는다.
- 설정 실값·개인 경로·사용자 이미지가 들어가 있으면 제외를 제안한다.

## 2. 스테이징·커밋

```bash
git add -A
git commit -m "<메시지>"
```

메시지 규칙:

```
type(scope): 한국어 요약 (50자 안팎)

(선택) 본문: 무엇을 왜 바꿨는지 2~5줄

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

| type | 뜻 |
|---|---|
| feat | 기능 추가 |
| fix | 버그 수정 |
| refactor | 동작 변화 없는 구조 변경 |
| docs | 문서만 |
| test | 테스트만 |
| chore | 빌드·설정·의존성 |

scope는 `core` / `bridge` / `ui` / `overlay` / `settings` / `claude`(자산) / `doc` 중 하나.

- 커밋은 논리 단위로 나눈다. 계층이 다른 변경(core + ui)은 두 커밋으로 가르는 것을 제안한다.
- 훅(`kuro-destructive-guard.sh`)이 `git reset --hard`·`--force`를 막는다. 잘못 커밋했으면 `git revert` 또는 새 커밋으로 고친다.

## 3. 푸시

```bash
git push origin main
```

- 거부되면(`rejected`) `git pull --rebase origin main` 후 재시도한다. 충돌은 파일별로 사용자와 함께 해결한다.
- 완료 보고: 커밋 해시·메시지·푸시 결과 한 줄.

## 4. 반복

모든 변경이 반영될 때까지 0~3을 반복한다. 남은 변경이 있으면 이유(의도적 제외·미완성)를 보고에 적는다.
