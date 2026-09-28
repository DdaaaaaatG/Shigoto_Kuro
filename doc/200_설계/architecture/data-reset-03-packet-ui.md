# data-reset 인계 패킷 — ui

- 받는 세션: `claude --agent ui-manager` (작업 모드: **보강** — 기존 settings 화면 「기본 설정」 탭에 카드 1장 추가)
- 전반 설계: `doc/200_설계/architecture/data-reset-02-design.md`(§1, §2 ui 로컬 상태, §3 계약). 이 패킷과 어긋나면 02-design이 맞다.
- 전략: `ui-design-strategy`(§11 파괴 조작은 `ConfirmDialog`), `.claude/skills/tsx-rules.md`·`ts-rules.md`·`ui_design_concept.md`, `change-request-tracking`(보강 → CR 엔트리 필수).
- 순서: ui-designer(requirements·design·general-tab·i18n 문서) → ui-design-checker → ui-test-designer(시나리오·스펙) → ui-test-checker → ui-implementer → ui-tester → ui-manual-writer.

## 선행 조건

- **bridge 패킷 완료 마커**(`data-reset-03-packet-bridge.md` 「완료 마커」)가 있어야 착수한다.
  - `resetAppData(): Promise<void>`가 `src/bridge`에서 export돼 있어야 한다.
  - 에러 code `reset.io`·`reset.seed`가 계약 §6에 있어야 한다. 총 24개다.
- 새 의존성 없음.
- **⚠ 앱 실행(`/dev-start`·`/run-app`) 전 D-7 확인.** 이 기능이 들어간 앱을 개발 PC에서 처음 켜면, 세대 표식이 없어서 개발자 데이터가 초기화된다. ui-tester·수동 확인 단계에서 앱을 띄우기 전에, 메인 세션이 사용자 승인 하에 `%APPDATA%\com.kuro.keyviewer\`를 백업했는지(또는 표식을 미리 만들었는지) 확인한다. 확인되지 않았으면 vitest까지만 하고 멈춘 뒤 보고한다.

## 요구ID

- 횡단: R-B1(버튼 + 확인창 + 3개 국어), R-B2(ui 부분: 호출과 두 창 반영), R-B3(ui 부분: 에러 문구), R-C1(ui 부분: `package.json` 버전).
- 화면 요구 번호: settings **R-56**(제안, ui-designer가 확정)이 「기본 설정 탭 전체 초기화」다. CR 번호는 CR 대장의 다음 번호(예상 **CR-054**)다.
- overlay 화면: **변경 없음.** 초기화 뒤 core가 오버레이 WebView를 새로고침하고 기존 구독(`onSettingsChanged`·`onAssetsChanged`)이 값을 받는다. 오버레이 코드와 문서는 고치지 않는다.

## 변경 대상 파일

| 파일 | 변경 | 소유자 |
|---|---|---|
| `src/settings/requirements.md` | R-56 추가(아래 §1 요구 문장) | ui-designer |
| `src/settings/design.md` | 변경이력, RTM R-56 행, §12 공용 후보 표(변경 없으면 그대로) | ui-designer |
| `src/settings/design/general-tab.md` | §1 레이아웃에 카드 추가, §2 컴포넌트 표, §3 상태·기능, §5·§6 | ui-designer |
| `src/settings/design/i18n.md` | §4.11 신설(단순 키 +8), §4.6 오류 문구 +2(code 22 → 24) | ui-designer |
| `src/settings/test/scenarios.md` · `manual-checklist.md` | TC·수동 항목 추가, 기존 개수 단언 개정 목록 | ui-test-designer |
| `src/settings/test/change-requests.md` | CR 엔트리(보강) | ui-manager 파이프라인 |
| `src/settings/components/ResetAllCard.tsx` (**신규**) | 카드·확인창·상태 줄 | ui-implementer |
| `src/settings/components/GeneralTab.tsx` | 마지막 카드 뒤에 `<ResetAllCard onError={onError} />` 한 줄 | ui-implementer |
| `src/settings/components/GeneralTab.module.css` | 위험 조작 버튼 스타일(디자인 시스템 토큰만) | ui-implementer |
| `src/settings/i18n/{types,ko,ja,en}.ts` | 키 +8, `errors` +2 | ui-implementer |
| `src/settings/test/*.test.tsx`, `i18n.test.ts` | 새 스펙, `bridge` mock에 `resetAppData` 추가, 키·code 개수 단언 개정 | ui-test-designer / ui-implementer |
| `src/settings/manual.md` | 「전체 초기화」 절 + 스크린샷 | ui-manual-writer |
| `package.json` | `"version": "0.1.0"` → `"0.1.1"`(R-C1) | ui-implementer(가드에 막히면 보고) |

## 1. 요구 문장 (R-56 초안)

> 기본 설정 탭 맨 아래 「초기화」 카드에 「전체 초기화」 버튼을 둔다. 누르면 확인 창을 띄우고, 확인하면 등록한 그림(모든 칸)·알림음·모든 설정을 처음 설치한 상태(내장 기본 그림 7장, 기본 좌표·배율·타이머 설정, 기본 위치)로 즉시 되돌린다. 자동 실행 설정은 유지한다(D-3). 오버레이와 설정 창은 재시작 없이 새 상태를 보여 준다. 되돌릴 수 없다.

- D-2(언어 유지 여부)는 결정 대기다. 결정 전 문구는 「언어도 초기화」 기준이고, 유지로 결정되면 `resetAllDesc`에 「언어」를 넣는다(§4 대체 문구).

## 2. 레이아웃 (general-tab.md §1에 추가)

```
| +-- card: cardStartup -------------------------------------+   |
| | ... (기존)                                                |   |
| +----------------------------------------------------------+   |
| +-- card: cardReset ------------------------ [resetAll] ---+   |   ← 신규, 탭 맨 아래
| | resetAllDesc                                              |   |
| | (role=status) resetAllPending | resetAllDone | ''         |   |
| +----------------------------------------------------------+   |
```

- `SettingsCard title={t.cardReset} action={<button …>{t.resetAll}</button>}` 형태다. 기존 「위치 초기화」(cardWindow 머리 버튼)와 같은 자리 규칙을 따른다.
- 버튼 스타일은 **위험 조작**을 나타내야 한다. 기존 `outlineButton` 모양에 디자인 시스템의 위험(danger) 색 토큰을 쓴다. 새 색을 만들지 않고, 토큰 이름은 ui-designer가 `ui_design_concept.md`에서 고른다.
- 카드 높이·여백은 기존 기본 설정 카드 규칙(R-28, general-tab.md §2.2)을 따른다.

## 3. 컴포넌트·상태·기능

| 컴포넌트 | 파일 | props | 요구 |
|---|---|---|---|
| `ResetAllCard` (default) | `src/settings/components/ResetAllCard.tsx` | `onError: (e: BridgeError \| null) => void` | R-56(R-B1·R-B2·R-B3) |

| 상태 | 타입 | 초기값 | 용도 |
|---|---|---|---|
| `dialogOpen` | `boolean` | `false` | 확인창 표시 |
| `phase` | `'idle' \| 'pending' \| 'done'` | `'idle'` | 버튼 비활성·상태 줄 |

동작:
1. 버튼 클릭 → `phase === 'pending'`이면 무시. 아니면 `dialogOpen = true`.
2. `ConfirmDialog`(tone 기본 `danger`): `title={t.confirmResetAllTitle}` · `message={t.confirmResetAllMessage}` · `confirmLabel={t.confirmResetAllOk}` · `cancelLabel={t.confirmCancel}`(기존 키 재사용). 첫 포커스는 취소 버튼이다(기존 컴포넌트 동작).
3. 취소·Esc → `dialogOpen = false`. **호출 0회.**
4. 확인 → `dialogOpen = false`, `phase = 'pending'` → `await resetAppData()`.
   - 성공 → `phase = 'done'`, `onError(null)`.
   - 실패 → `phase = 'idle'`, `onError(toBridgeError(e))`. 기존 공용 오류 줄에 `errorText`로 표시한다.
5. 버튼은 `disabled={phase === 'pending'}`이고 `aria-busy`를 둔다.
6. 상태 줄은 `<p role="status" aria-live="polite">`이고 항상 렌더한다. 내용은 pending일 때 `t.resetAllPending`, done일 때 `t.resetAllDone`, 그 밖에는 빈 문자열이다.
7. **낙관적 갱신 없음.** 화면 값은 기존 `SettingsApp`의 `onSettingsChanged`·`onAssetsChanged` 구독으로만 바뀐다(general-tab.md 저장 방식 규칙과 같다).
   - 초기화 뒤 언어가 바뀌면 `done` 문구도 새 언어로 보인다(정상).
   - 탭은 「기본 설정」 그대로다.
8. 알림음 카드는 타이머 탭이 마운트될 때 `getAlarmSound()`를 다시 조회하므로 따로 처리하지 않는다(분석서 §5-6).
9. 이벤트 도착 순서에 의존하지 않는다(계약 v0.25 순서 규칙).

## 4. 문구 초안 (i18n §4.11 신설, ja·en은 **사용자 검수 필요**)

| 키 | ko | ja | en | 용도 |
|---|---|---|---|---|
| `cardReset` | 초기화 | 初期化 | Reset | 카드 제목 |
| `resetAll` | 전체 초기화 | すべて初期化 | Reset all | 카드 머리 버튼 |
| `resetAllDesc` | 등록한 그림·알림음과 모든 설정을 처음 설치한 상태(기본 그림)로 되돌립니다. 자동 실행 설정은 그대로 둡니다. | 登録した画像・通知音とすべての設定を、インストール直後の状態(基本画像)に戻します。自動起動の設定はそのままです。 | Restores your images, alarm sound, and all settings to the just-installed state (default images). The startup setting is kept. | 카드 설명 |
| `confirmResetAllTitle` | 전체 초기화 | すべて初期化 | Reset all | 확인창 제목 |
| `confirmResetAllMessage` | 등록한 그림·알림음과 모든 설정을 지우고 기본값으로 되돌릴까요? 오버레이도 기본 위치로 돌아갑니다. 되돌릴 수 없습니다. | 登録した画像・通知音とすべての設定を削除して、初期状態に戻しますか?オーバーレイも初期位置に戻ります。元に戻せません。 | Remove all your images, alarm sound, and settings and restore the defaults? The overlay will also return to its default position. This cannot be undone. | 확인창 본문 |
| `confirmResetAllOk` | 초기화 | 初期化する | Reset | 확인 버튼(danger) |
| `resetAllPending` | 초기화하는 중입니다… | 初期化しています… | Resetting… | 상태 줄 |
| `resetAllDone` | 초기화했습니다. | 初期化しました。 | Reset complete. | 상태 줄 |

오류 문구(§4.6 `errors`, code 22 → **24**):

| code | ko | ja | en |
|---|---|---|---|
| `reset.io` | 데이터를 모두 초기화하지 못했습니다. 앱을 다시 켜면 초기화를 다시 시도합니다. | データをすべて初期化できませんでした。アプリを再起動すると、もう一度初期化します。 | Could not reset all data. The app will try again the next time it starts. |
| `reset.seed` | 기본 그림을 다시 넣지 못했습니다. 앱을 다시 켜면 다시 시도합니다. | 基本画像を戻せませんでした。アプリを再起動すると、もう一度試します。 | Could not restore the default images. The app will try again the next time it starts. |

- D-2가 「언어 유지」로 결정되면 `resetAllDesc`의 둘째 문장을 다음으로 바꾼다. ko 「언어와 자동 실행 설정은 그대로 둡니다.」 / ja 「言語と自動起動の設定はそのままです。」 / en 「Your language and startup settings are kept.」
- `confirmCancel`은 기존 키를 재사용한다. 새 키를 만들지 않는다.
- `i18n/types.ts`에 먼저 추가해서 3개 국어 누락을 타입으로 막는다(기존 관례).

## 5. 수용 기준

vitest(`yarn test --run src/settings`):

| TC(ui-test-designer가 번호 확정) | 단언 |
|---|---|
| 카드 렌더 | 기본 설정 탭 맨 아래에 `cardReset` 제목, `resetAll` 버튼, `resetAllDesc`(ko 정확 일치)가 있고 상태 줄은 비어 있음 |
| 확인창 열기 | 버튼 클릭 → `alertdialog`가 뜨고 제목·본문·확인·취소 문구(ko 정확)가 맞으며, 포커스는 취소 |
| 취소·Esc | 둘 다 창이 닫히고 `resetAppData` 0회 |
| 확인 → 성공 | `resetAppData` 1회(인자 없음). 해결 전에는 버튼 disabled·`aria-busy`이고 상태 줄이 `resetAllPending`. 해결 후에는 `resetAllDone`이고 `onError(null)` |
| 확인 → 실패 | reject `{code:'reset.io', message:'x'}` → `onError`가 code `reset.io`로 1회 호출되고 상태 줄은 빈 문자열. 버튼이 다시 활성 |
| 중복 클릭 | pending 중 버튼 클릭 → 창이 열리지 않고 호출 수가 늘지 않음 |
| 흐름(TC-FLOW) | `SettingsApp`: 확인 → 해결 → mock `settings://changed`(기본 Settings)·`assets://changed`(기본 7장)를 **어느 순서로 보내도** 기본 설정 탭 값과 이미지 탭 카드가 기본값을 보임 |
| i18n | 새 키 8개가 ja·en에서 비어 있지 않음. `errors` code 24개가 계약 §6 목록과 1:1 |

- 기존 스펙의 개수 단언(단순 키 수, code 수 22)과 `vi.mock('bridge'…)` 목록에 `resetAppData`를 추가하는 개정 목록을 scenarios.md 변경 대기열에 적는다. BRG-001 참고: events mock은 이번에 바뀌지 않는다.
- `yarn tsc --noEmit` exit 0 · `yarn build` exit 0 · 새 TSX는 400줄 이하, 함수는 50줄 이하.
- **수동 확인(D-7 백업 확인 후에만)**: `/run-app`으로 다음을 캡처한다. `doc/300_검증/screenshots/{YYYYMMDD-HHMM}/`
  1. 커스텀 상태
  2. 확인창(ko)
  3. 초기화 직후 오버레이(기본 그림·기본 위치)와 설정 창(기본 값)
  4. 앱 재시작 뒤 **다시 초기화되지 않음**(3과 같은 화면, 사이에 바꾼 값 유지)
- `package.json`·`src-tauri/tauri.conf.json`·`src-tauri/Cargo.toml`의 version이 모두 `0.1.1`인지 대조표를 싣는다(R-C1 최종 검사).
- CR 엔트리(보강)가 있고, design.md RTM R-56 행이 TC와 이어진다.

## 하지 말 것

- `invoke`·`listen`을 화면에서 직접 쓰지 않는다(`resetAppData`는 `bridge`에서만 가져온다).
- `src/bridge/**`·`src-tauri/**`·`contract.md`를 수정하지 않는다. 계약이 부족하면 멈추고 아키텍트 세션으로 되돌린다.
- 새 이벤트를 구독하지 않는다. 낙관적 갱신을 하지 않는다. 앱 버전 표시·백업 버튼·부분 초기화 선택지를 만들지 않는다(요구 없음).
- overlay 화면 코드·문서를 고치지 않는다.
- D-7 백업 확인 없이 앱을 실행하지 않는다. 실행 중인 앱·dev 프로세스를 종료하지 않는다.
- 브라우저 `window.confirm`을 쓰지 않는다(`ConfirmDialog` 사용).

## 완료 마커

- `src/settings/components/ResetAllCard.tsx`가 있고, `GeneralTab`에 연결돼 있으며, i18n 키 8개와 에러 2개가 추가돼 있다.
- `yarn test --run` PASS 증거가 있다.
- 세 파일 version이 0.1.1로 같다.
- 스크린샷 경로(수동 확인을 수행한 경우)가 있다.
- CR 엔트리 「적용·검증됨」, manual.md 갱신.
- 이후 권고: `claude --agent verify-manager`(배포 전 통합 검증) → 사용자 OK 시 `/deploy`(0.1.1).
