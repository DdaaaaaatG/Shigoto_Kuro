# settings 상세 설계 — 「기본 설정」 탭 (CR-028)

- 상위 문서: `src/settings/design.md`(RTM·전체 구조·공통 상태). 문구는 `design/i18n.md` §4.2(키 이름으로만 인용한다).
- 요구: R-03(배율), R-04(유휴 시간), R-20(언어), R-21(위치 잠금), R-22(작업표시줄 표시), R-23(자동 실행), R-24(위치 초기화), R-19(카드 양식), **R-56(전체 초기화 — CR-054, §7)**.
- (CR-054) 계약 추가: contract **v0.25** §5.10 `reset_app_data`(래퍼 `resetAppData(): Promise<void>`), §4 이벤트 순서 주석, §6 `reset.io`·`reset.seed`. 상세는 §7.
- 계약: `doc/200_설계/bridge/contract.md` v0.14 — §3.3 `Settings`(`scale`·`idleSeconds`·`language`·`positionLock`·`showInTaskbar`·`autostart`), §5 `set_settings`·`set_autostart`·`reset_overlay_position`, §5.5, §5.6, §6. 래퍼: `setSettings`·`setAutostart`·`resetOverlayPosition`·`toBridgeError`, 상수 `SCALE_MIN`·`SCALE_MAX`(`src/bridge`).
- 저장 방식(확정): **항목별 즉시 저장**. 「저장」 버튼 없음. 값은 낙관적으로 바꾸지 않고 `settings://changed`로 돌아온 `Settings`로만 바뀐다(기존 설정 창 규칙). 예외: 배율 슬라이더·유휴 시간 입력의 「편집 중 표시값」(§3 draft)만 로컬.

## 1. 레이아웃 (확정)

ui-layout-designer 구성안 대신 아키텍처 패킷(`settings-v2-03-packet-ui.md` §2)과 사용자 참고 스크린샷(기본 설정)을 수용해 확정한다. 카드는 세로로 쌓는다(한 줄에 한 장, 너비 100%).

```
+-- section[aria-label=tabGeneral] ------------------------------+
| +-- card: cardLanguage ------------------------------------+   |
| | select [ LANGUAGE_NAMES v ]                              |   |
| +----------------------------------------------------------+   |
| +-- card: cardScale ---------------------------------------+   |
| | scaleLabel  [=======o===============]  100%              |   |
| |             scaleDesc                                    |   |
| | idleLabel   [  5 ] idleUnit                              |   |
| |             idleDesc                                     |   |
| |             idleRangeHint (only when idleInvalid)        |   |
| +----------------------------------------------------------+   |
| +-- card: cardWindow ------------------- [resetPosition] --+   |
| | (o ) lockLabel                                           |   |
| |      lockDesc                                            |   |
| +----------------------------------------------------------+   |
| +-- card: cardStartup -------------------------------------+   |
| | (o ) taskbarLabel                                        |   |
| |      taskbarDesc                                         |   |
| | (o ) autostartLabel                                      |   |
| |      autostartDesc                                       |   |
| |      autostartPending   (only while autostartPending)    |   |
| +----------------------------------------------------------+   |
| +-- card: cardReset ------------------------- [resetAll] --+   |
| | resetAllDesc                                             |   |
| | (status) resetAllPending / resetAllDone / empty          |   |
| +----------------------------------------------------------+   |
+----------------------------------------------------------------+
```

- 확정 상태: **확정**. 참고 화면의 크기 4단 버튼·흔들림·항상 위에 고정·「변경한 설정은 바로 적용…」 줄·설명서·닫기 버튼은 **없다**(R-19 금지 조건).
- `(o )` = `ToggleSwitch`. 켜짐 = 포인트 컬러(`var(--st-accent)` #BE72AD, CR-032) 채움 트랙 + 오른쪽 손잡이.
- (CR-054, R-56) `cardReset` 카드는 **탭 맨 아래**(cardStartup 뒤) 한 장이다. 머리 오른쪽 `[resetAll]` = 위험 조작 외곽선 버튼(§7.4), 본문 = 설명 `resetAllDesc` 한 단락 + 상태 줄 1개(`role="status"`, 내용 = pending이면 `resetAllPending`, done이면 `resetAllDone`, 그 밖에는 빈 문자열 — 줄은 항상 렌더). 머리 버튼 자리 규칙은 cardWindow의 `[resetPosition]`과 같다(`SettingsCard action=`). 확인창(`ConfirmDialog`)은 모달이라 이 그림에 넣지 않는다(§7.5). 확정 상태: **확정**(패킷 `data-reset-03-packet-ui.md` §2 수용).

## 2. 컴포넌트

| 컴포넌트 | 파일 | 분류 | props | 요구ID |
|---|---|---|---|---|
| `GeneralTab` (default) | `src/settings/components/GeneralTab.tsx` (+`GeneralTab.module.css`) | 화면 로컬 | `settings: Settings`, `onError: (e: BridgeError \| null) => void` | R-19~R-24 |
| `ScaleIdleCard` (default) | `src/settings/components/ScaleIdleCard.tsx` (+`GeneralTab.module.css` 공유) | 화면 로컬(400줄 분리) | `settings: Settings`, `onError: (e: BridgeError \| null) => void` | R-03, R-04 |
| `ToggleSwitch` (default) | `src/settings/components/ToggleSwitch.tsx` (+`ToggleSwitch.module.css`) | 화면 로컬 · **공용 승격 후보**(design.md §12) | `id: string`, `label: string`, `description: string`, `checked: boolean`, `disabled?: boolean`(기본 false), `busy?: boolean`(기본 false), `onToggle: () => void` | R-19, R-21~R-23 |
| `SettingsCard` (default) | `src/settings/components/SettingsCard.tsx` (+`SettingsCard.module.css`) | 화면 로컬 · 공용 승격 후보 | `title: string`, `action?: ReactNode`(카드 머리 오른쪽), `children: ReactNode` | R-19 |
| `generalValues` | `src/settings/generalValues.ts` | 화면 로컬 순수 모듈 | §3.3 | R-03, R-04 |
| `ResetAllCard` (default, **CR-054 신규**) | `src/settings/components/ResetAllCard.tsx` (+`GeneralTab.module.css` 공유 — 새 클래스 `.dangerButton`, §7.4) | 화면 로컬(카드 1장·상태 2개 — 다른 화면 재발 없음, 승격 후보 아님) | `onError: (e: BridgeError \| null) => void`(필수, `GeneralTab`의 `onError`를 그대로 받음). 반환 이벤트 없음 | R-56 |
| `ConfirmDialog` (재사용) | `src/settings/components/ConfirmDialog.tsx` | 화면 로컬 · 공용 승격 후보(design.md §12 — 기존 분류 불변) | `open`·`title`·`message`·`confirmLabel`·`cancelLabel`·`tone?`(기본 `'danger'`)·`onConfirm`·`onCancel`. 열리면 **취소 버튼에 첫 포커스**, Esc = `onCancel`, `role="alertdialog"`(기존 컴포넌트 동작 — 변경 없음) | R-56(재사용) |

### 2.1 `ToggleSwitch` 렌더

1. `<div className=row>` 안에 `<button id={id} type="button" role="switch" aria-checked={checked} aria-labelledby={`${id}-label`} aria-describedby={`${id}-desc`} aria-busy={busy \|\| undefined} disabled={disabled \|\| busy} onClick={onToggle} className={checked ? track + on : track}><span className=knob/></button>`.
2. 오른쪽에 `<span id={`${id}-label`} className=label>{label}</span>`, 그 아래 `<p id={`${id}-desc`} className=desc>{description}</p>`.
3. 스타일: 트랙 44×24px, 둥근 모서리 999px, 꺼짐 `var(--st-track-off)`, 켜짐 `var(--st-accent)`, 손잡이 18px 흰 원, 켜짐 시 `transform: translateX(20px)`(transition 150ms). `disabled` = opacity 0.5, `cursor: not-allowed`. 포커스 링 `outline: 2px solid var(--st-accent); outline-offset: 2px`.
4. 라벨 글자를 눌러도 토글되지 않는다(버튼만 조작 대상 — 오작동 방지). `React.memo` 불필요.

### 2.2 `SettingsCard` 렌더

`<section className=card aria-labelledby={headingId}>` → 머리 줄 `<div className=cardHead><h2 id={headingId} className=cardTitle>{title}</h2>{action}</div>` → `{children}`. `headingId = useId()`. 스타일: 흰 바탕 `var(--st-card)`, 1px `var(--st-border)`, 둥근 모서리 14px, 안쪽 여백 16px 20px, 카드 사이 12px.

(CR-031, R-28 — 위 스타일 문장 대체) 이미지 카드와 같은 간격 체계(`design.md` §2.1 토큰): `.card` = `box-sizing: border-box; padding: var(--st-card-pad)`(16px 사방) · `border-radius: var(--st-card-radius)`(12px) · 흰 바탕·1px 테두리 그대로. 카드 사이 = `GeneralTab` 루트 `display: flex; flex-direction: column; gap: var(--st-gap-md)`(12px, 카드의 `margin` 없음). `.cardHead` = `display: flex; align-items: center; justify-content: space-between; gap: var(--st-gap-sm); min-height: 28px; margin-bottom: var(--st-gap-md)`(12px). `.cardTitle` = `margin: 0; font-size: 14px; line-height: 20px; font-weight: 700`(이미지 탭 그룹 제목과 같은 글자). 카드 안 행(토글 줄·배율 줄·유휴 시간 줄) 사이 = `var(--st-gap-lg)`(16px), 라벨과 설명 사이 = `var(--st-gap-xs)`(4px). 기본 설정 카드는 내용이 카드마다 달라 **높이는 통일하지 않는다**(한 줄에 한 장, 너비 100% — R-28은 기본 설정 탭에는 여백 통일만 요구).

## 3. 상태와 기능

### 3.1 `GeneralTab` 상태

| 상태 | 용도 | 타입 | 초기값 | 소유 |
|---|---|---|---|---|
| `autostartPending` | `setAutostart` 응답 대기(일반 권한 작업 스케줄러 등록 — 보통 1초 안팎, contract v0.22 §5.5). true 동안 자동 실행 토글 `busy`(비활성·`aria-busy`)와 `autostartPending` 문구 | `boolean` | `false` | `GeneralTab` `useState` |
| `resetPending` | 위치 초기화 응답 대기(버튼 비활성) | `boolean` | `false` | `GeneralTab` `useState` |

### 3.2 `GeneralTab` 기능

| function | 시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| `saveSettings` | `(patch: Partial<Pick<Settings, 'language' \| 'positionLock' \| 'showInTaskbar'>>) => Promise<void>` | `setSettings({ ...settings, ...patch })` → 성공 시 `onError(null)`. 화면 값은 `settings://changed`로 바뀐다 | reject → `onError(toBridgeError(e))`. 로컬 상태를 바꾸지 않았으므로 토글·선택은 **원래 값 그대로** | R-20~R-22 |
| `onLanguageChange` | `(e: ChangeEvent<HTMLSelectElement>) => void` | `v = e.currentTarget.value` → `LANGUAGES`에 없으면 무시 → `v === settings.language`면 무시 → `saveSettings({ language: v })` | `saveSettings`와 같음(선택 상자는 `value={settings.language}` 제어라 원래 값으로 돌아간다) | R-20 |
| `onToggleLock` | `() => void` | `saveSettings({ positionLock: !settings.positionLock })` | 같음 | R-21 |
| `onToggleTaskbar` | `() => void` | `saveSettings({ showInTaskbar: !settings.showInTaskbar })` | 같음 | R-22 |
| `onToggleAutostart` | `() => Promise<void>` | `autostartPending`이면 무시 → `setAutostartPending(true)` → `await setAutostart(!settings.autostart)` → 성공 시 `onError(null)`(토글 값은 `settings://changed`로 바뀐다) → `finally` `setAutostartPending(false)` | reject → `onError(toBridgeError(e))`(오류 줄 — `autostart.error`·`io.error` 등 모든 code, CR-049로 취소 분기 없음). 토글은 원래 값(설정 불변 — 계약 §5.5) | R-23 |
| `onResetPosition` | `() => Promise<void>` | `resetPending`이면 무시 → `setResetPending(true)` → `await resetOverlayPosition()` → 성공 시 `onError(null)`(반환 `Position`은 쓰지 않는다 — 저장·이벤트는 core) → `finally` `setResetPending(false)`. **확인 대화상자 없음**(되돌리기 쉬운 이동, 파괴 조작 아님) | reject → `onError(toBridgeError(e))` | R-24 |

- 토글 id: `lock-toggle`, `taskbar-toggle`, `autostart-toggle`. 언어 `select` id: `language-select`.
- 위치 잠금·작업표시줄 토글은 저장 대기 중에도 비활성하지 않는다(응답이 짧다 — 연속 클릭은 마지막 `settings` 기준으로 저장된다).
- `settings.autostart` 표시값은 core가 소유한다(계약 §5.3 「core 소유 필드」). 이 탭은 `setSettings`에 `autostart`를 바꿔 보내지 않는다(`...settings` 그대로 — core가 무시).

### 3.3 `generalValues` 순수 모듈 (`src/settings/generalValues.ts`)

| 이름 | 시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| `SCALE_STEP_PERCENT` | `5` | 슬라이더 단계 폭(%) | — | R-03 |
| `SCALE_KEY_COMMIT_MS` | `300` | 키보드 조작 후 저장까지 지연(ms) | — | R-03 |
| `IDLE_MIN_MINUTES` / `IDLE_MAX_MINUTES` | `1` / `60` | 유휴 시간 허용 범위(분). 저장 범위 = 60~3600초 | — | R-04 |
| `scaleToPercent` | `(scale: number) => number` | `Math.round(scale × 100)` | 없음 | R-03 |
| `percentBounds` | `() => { min: number; max: number }` | `{ min: scaleToPercent(SCALE_MIN), max: scaleToPercent(SCALE_MAX) }` = `{25, 200}`. 화면에 25·200을 직접 적지 않는다 | 없음 | R-03 |
| `idleSecondsToMinutes` | `(seconds: number) => number` | `Math.max(1, Math.round(seconds / 60))` — 60의 배수가 아니면 **반올림 표시**(예: 90초 → 2분, 30초 → 1분). 표시만 하고 저장값은 바꾸지 않는다 | 없음 | R-04 |
| `parseIdleMinutes` | `(text: string) => number \| null` | 앞뒤 공백 제거 후 `/^\d+$/`가 아니면 `null`. 정수 `n`이 `IDLE_MIN_MINUTES ≤ n ≤ IDLE_MAX_MINUTES`이면 `n`, 아니면 `null`. 예: `'5'`→5, `' 60 '`→60, `''`→null, `'0'`→null, `'61'`→null, `'1.5'`→null, `'-3'`→null | 없음 | R-04 |

### 3.4 `ScaleIdleCard` 상태

| 상태 | 용도 | 타입 | 초기값 | 소유 |
|---|---|---|---|---|
| `scaleDraft` | 끌기·키보드 조작 중 표시할 배율(%). `null`이면 저장값 표시 | `number \| null` | `null` | `useState` |
| `scaleTimer` | 키보드 조작 후 저장 예약 | `ReturnType<typeof setTimeout> \| null` | `null` | `useRef` |
| `idleDraft` | 입력 중 문자열. `null`이면 저장값 표시 | `string \| null` | `null` | `useState` |
| `idleInvalid` | 범위 밖·빈 값 안내 표시 | `boolean` | `false` | `useState` |
| (파생) `percent` | 저장된 배율(%) | `number` | `scaleToPercent(settings.scale)` | 파생 |
| (파생) `shownPercent` | 슬라이더 값·옆 표시 `{n}%` | `number` | `scaleDraft ?? percent` | 파생 |
| (파생) `shownIdle` | 입력 칸 값 | `string` | `idleDraft ?? String(idleSecondsToMinutes(settings.idleSeconds))` | 파생 |

### 3.5 `ScaleIdleCard` 기능

| function | 시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| `onScaleInput` | `(e: ChangeEvent<HTMLInputElement>) => void` | `setScaleDraft(Number(e.currentTarget.value))`. **저장하지 않는다**(끌기 중 `setSettings` 0회) | 없음 | R-03 |
| `commitScale` | `() => Promise<void>` | 예약 타이머 해제 → `draft = scaleDraft`가 `null`이면 끝 → `draft === percent`면 `setScaleDraft(null)` 후 끝(저장 없음) → `await setSettings({ ...settings, scale: draft / 100 })` → 성공 `onError(null)` → `finally` `setScaleDraft(null)` | reject → `onError(toBridgeError(e))`, `scaleDraft = null`이라 슬라이더는 **원래 저장값**으로 돌아간다 | R-03 |
| `onScalePointerUp` | `() => void` | `commitScale()` — 놓을 때 1회 저장 | 없음 | R-03 |
| `onScaleKeyUp` | `(e: KeyboardEvent<HTMLInputElement>) => void` | `e.key`가 `ArrowLeft`·`ArrowRight`·`ArrowUp`·`ArrowDown`·`Home`·`End`·`PageUp`·`PageDown` 중 하나면 타이머를 새로 걸어 `SCALE_KEY_COMMIT_MS` 뒤 `commitScale()`(마지막 키 입력 후 1회) | 없음 | R-03 |
| `onScaleBlur` | `() => void` | `scaleDraft !== null`이면 즉시 `commitScale()` | 없음 | R-03 |
| (정리) | `useEffect(() => () => clearTimeout(scaleTimer.current), [])` | 언마운트 시 예약 해제(저장하지 않음) | 없음 | R-03 |
| `onIdleInput` | `(e: ChangeEvent<HTMLInputElement>) => void` | `setIdleDraft(e.currentTarget.value)`, `setIdleInvalid(false)`. 저장하지 않는다(타이핑 중 저장 없음) | 없음 | R-04 |
| `commitIdle` | `() => Promise<void>` | `idleDraft === null`이면 끝 → `n = parseIdleMinutes(idleDraft)` → `setIdleDraft(null)` → `n === null`이면 `setIdleInvalid(true)` 후 끝(저장 없음, 입력 칸은 저장값으로 돌아감) → `n × 60 === settings.idleSeconds`면 끝 → `await setSettings({ ...settings, idleSeconds: n × 60 })` → 성공 `onError(null)` | reject → `onError(toBridgeError(e))`, 입력 칸은 저장값 | R-04 |
| `onIdleKeyDown` | `(e: KeyboardEvent<HTMLInputElement>) => void` | `e.key === 'Enter'`면 `commitIdle()` | 없음 | R-04 |
| `onIdleBlur` | `() => void` | `commitIdle()` | 없음 | R-04 |

- 끌기 중 `settings://changed`(예: 오버레이 Ctrl+휠)가 와도 `scaleDraft`가 있는 동안 슬라이더는 draft를 보이고, 놓은 뒤(`scaleDraft = null`) 새 저장값을 보인다. 오버레이 Ctrl+휠 값이 5의 배수가 아니면 옆 표시 `{n}%`는 실제 값(예: 103%)이고 슬라이더 손잡이는 브라우저가 가까운 단계로 그린다.

### 3.6 `ScaleIdleCard` 렌더

1. `<SettingsCard title={t.cardScale}>`.
2. 배율 행: `<label htmlFor="scale-slider">{t.scaleLabel}</label>` · `<input id="scale-slider" type="range" min={min} max={max} step={SCALE_STEP_PERCENT} value={shownPercent} aria-describedby="scale-desc" aria-valuetext={`${shownPercent}%`} onChange={onScaleInput} onPointerUp={onScalePointerUp} onKeyUp={onScaleKeyUp} onBlur={onScaleBlur}/>` · `<output htmlFor="scale-slider">{shownPercent}%</output>` · `<p id="scale-desc">{format(t.scaleDesc, { min, max })}</p>`.
3. 유휴 시간 행: `<label htmlFor="idle-input">{t.idleLabel}</label>` · `<input id="idle-input" type="number" inputMode="numeric" min={IDLE_MIN_MINUTES} max={IDLE_MAX_MINUTES} step={1} value={shownIdle} aria-describedby="idle-desc" aria-invalid={idleInvalid \|\| undefined} onChange={onIdleInput} onKeyDown={onIdleKeyDown} onBlur={onIdleBlur}/>` · `<span>{t.idleUnit}</span>` · `<p id="idle-desc">{format(t.idleDesc, { min: IDLE_MIN_MINUTES, max: IDLE_MAX_MINUTES })}</p>` · `idleInvalid`이면 `<p className=hint role="alert">{format(t.idleRangeHint, { min: IDLE_MIN_MINUTES, max: IDLE_MAX_MINUTES })}</p>`(경고색 `var(--st-warn)`).
4. 슬라이더 색: 채움·손잡이 `accent-color: var(--st-accent)`.

## 4. `GeneralTab` 렌더

문구는 `t = useMessages()`(`GeneralTab`·`ScaleIdleCard` 각각), `LANGUAGES`·`LANGUAGE_NAMES`·`format`은 `i18n/index.ts`에서 import(`design/i18n.md` §3).

1. `<section aria-label={t.tabGeneral} className=stack>`.
2. 언어 카드: `<SettingsCard title={t.cardLanguage}>` → `<select id="language-select" aria-label={t.languageAria} value={settings.language} onChange={onLanguageChange}>` + `LANGUAGES.map(l => <option key={l} value={l} lang={l}>{LANGUAGE_NAMES[l]}</option>)`. 선택 상자 스타일 = 포인트 컬러 채움 알약(`var(--st-accent)` #BE72AD 바탕 — CR-032, 흰 글자, 둥근 999px, 최소 너비 180px).
3. `<ScaleIdleCard settings={settings} onError={onError}/>`.
4. 창 카드: `<SettingsCard title={t.cardWindow} action={<button type="button" className=outlineButton disabled={resetPending} onClick={onResetPosition}>{t.resetPosition}</button>}>` → `<ToggleSwitch id="lock-toggle" label={t.lockLabel} description={t.lockDesc} checked={settings.positionLock} onToggle={onToggleLock}/>`.
5. 작업표시줄·시작 카드: `<SettingsCard title={t.cardStartup}>` → `<ToggleSwitch id="taskbar-toggle" … checked={settings.showInTaskbar} onToggle={onToggleTaskbar}/>` → `<ToggleSwitch id="autostart-toggle" label={t.autostartLabel} description={t.autostartDesc} checked={settings.autostart} busy={autostartPending} onToggle={onToggleAutostart}/>` → `<p role="status" aria-live="polite" className=notice>`(항상 렌더, 내용만 바뀜) 안에 `autostartPending`이면 `t.autostartPending`, 아니면 빈 내용(CR-049 — 취소 안내 없음).
6. (CR-054, R-56) 초기화 카드: 5번 카드 **뒤, `section`의 마지막 자식**으로 `<ResetAllCard onError={onError} />` 한 줄. `GeneralTab`에는 새 상태·함수·import 외 변경이 없다(import `ResetAllCard from './ResetAllCard'` 1줄 추가). 렌더 상세 §7.5.

## 5. 파이프라인

| # | 흐름 | 정상 | 오류 |
|---|---|---|---|
| G-1 | 언어 바꾸기 | 선택 → `setSettings({...settings, language})` → `settings://changed` → `SettingsApp`이 `MessagesProvider` 언어·`<html lang>`·창 제목(`setSettingsWindowTitle(t.windowTitle)`)을 바꿈 → 세 탭 문구 전부 즉시 교체(재시작 없음) | 저장 실패 → 오류 줄(현재 언어 문구), 선택 상자 원래 언어 |
| G-2 | 배율 | 슬라이더 끌기(표시 `{n}%`만 바뀜, 저장 0회) → 놓기 → `setSettings({...settings, scale: n/100})` 1회 → core 리사이즈 → `settings://changed` | 실패 → 오류 줄(`settings.invalid` 등), 슬라이더 원래 값 |
| G-3 | 유휴 시간 | 숫자 입력(저장 없음) → Enter 또는 포커스 이동 → 1~60 정수면 `setSettings({...settings, idleSeconds: 분×60})` | 범위 밖·빈 값·소수 → 저장 없음, 입력 칸 원래 값, 아래 `idleRangeHint`(`role="alert"`). 저장 실패 → 오류 줄 |
| G-4 | 위치 잠금 | 토글 → `setSettings({...settings, positionLock: !v})` → core가 오버레이 클릭 통과·끌기 차단 적용 → `settings://changed`로 토글 켜짐 | 실패 → 오류 줄, 토글 원래대로 |
| G-5 | 작업표시줄 표시 | 토글 → `setSettings({...settings, showInTaskbar: !v})` → core가 오버레이 창 작업표시줄 버튼 표시/숨김 | 같음 |
| G-6 | 자동 실행 | 토글 → `autostartPending`(토글 비활성, `aria-busy`, 문구 `autostartPending`) → `setAutostart` 성공(일반 권한, 확인 창 없음) → `settings://changed`로 토글 반영 → pending 해제 | 실패(`autostart.error`·`io.error` 등 모든 code) → 오류 줄, 토글 원래대로, 안내 줄 빈 내용 (CR-049: `autostart.cancelled` 폐기 — 취소 분기 없음) |
| G-7 | 위치 초기화 | 버튼 → 비활성 → `resetOverlayPosition()` → core가 오버레이를 기본 위치로 옮기고 저장·emit → 버튼 다시 활성 | 실패(`window.not_found` 등) → 오류 줄 |
| G-8 | (CR-054) 전체 초기화 | 「전체 초기화」 → 확인창(첫 포커스 취소) → 「초기화」 → 확인창 닫힘 · 버튼 비활성+`aria-busy` · 상태 줄 `resetAllPending` → `resetAppData()` 1회 → resolve → 상태 줄 `resetAllDone`, `onError(null)`, 버튼 다시 활성·포커스 복귀. 화면 값(언어 카드·배율·토글·이미지 탭 카드 등)은 **`settings://changed`·`assets://changed` 구독으로만** 기본값이 된다(§7.6) | 취소·Esc → 확인창 닫힘, 호출 0회, 상태 불변, 포커스 버튼. reject(`reset.io`·`reset.seed`·`settings.io`·`state.poisoned`) → 상태 줄 빈 문자열, 버튼 다시 활성, 창 공통 오류 줄(`errorText`, §7.7). 실패해도 core가 두 이벤트를 보내므로 화면은 디스크에 실제로 남은 상태로 맞춰진다(계약 §5.10) |

파괴 조작 confirm: ~~이 탭에는 없다~~ **(CR-054) 「전체 초기화」 1건**(ui-design-strategy §11 「전체 설정 초기화 — 필수, 되돌릴 수 없음 명시」). 확인창 문구는 `design/i18n.md` §4.11 `confirmResetAllTitle`·`confirmResetAllMessage`(「되돌릴 수 없습니다」 포함)·`confirmResetAllOk`·`confirmCancel`. 위치 초기화(G-7)는 드래그로 되돌릴 수 있는 이동이라 여전히 대상 아님.

## 6. 접근성

- 포커스 순서: 언어 `select` → 배율 슬라이더 → 유휴 시간 입력 → 「위치 초기화」 → 위치 잠금 스위치 → 작업표시줄 스위치 → 자동 실행 스위치 → (CR-054) 「전체 초기화」(마지막). 확인창이 열리면 포커스는 확인창 안(취소 → 초기화 순, 기존 `ConfirmDialog` Tab 순환)에 머문다. 초기화 버튼 접근성 상세 §7.8.
- 키보드: 스위치는 네이티브 `<button>`이라 Enter·Space로 토글. 슬라이더는 화살표(±5%)·Home·End·PageUp·PageDown, 마지막 키 후 300ms에 저장. 유휴 시간은 Enter로 확정.
- 역할·이름: 스위치 `role="switch"` + `aria-checked` + `aria-labelledby`(보이는 라벨) + `aria-describedby`(설명). 자동 실행 대기 중 `aria-busy="true"`·`disabled`. 슬라이더 `aria-valuetext="{n}%"`.
- 상태 알림: 자동 실행 대기 안내 = `role="status" aria-live="polite"` 한 줄(CR-049 — 취소 안내 삭제). 유휴 시간 범위 안내 = `role="alert"`. 저장 실패 = 창 공통 오류 줄(`role="alert"`, design.md §5.3). (CR-054) 초기화 진행·완료 안내 = 초기화 카드 상태 줄 `role="status" aria-live="polite"`(§7.8).

## 7. 초기화 카드 `ResetAllCard` (CR-054, R-56 🔒 베타 전용)

비유: 이 버튼은 「창고 정리 요청서」다. 설정 창은 요청서를 내고(확인 한 번), 창고(core)가 정리를 마치면 매장(두 창)에 새 진열표(이벤트)가 붙는다. 설정 창은 진열표를 보고서야 화면을 바꾼다 — 요청서를 냈다고 먼저 진열을 바꾸지 않는다.

- 입력: 요구 R-56(`requirements.md` §1), 패킷 `doc/200_설계/architecture/data-reset-03-packet-ui.md` §2~§4, 전반 설계 `data-reset-02-design.md` §2(`resetDialogOpen`·`resetPhase` → 이 문서의 `dialogOpen`·`phase`), 계약 contract **v0.25** §5.10·§4·§6(패킷과 다르면 계약 우선).
- 보존 규칙(무엇을 지우고 무엇을 남기는가)은 **core 소관**이다(계약 §5.10 「보존 규칙」 표). 이 카드는 규칙을 계산하거나 화면에 따로 적용하지 않는다 — 설명·확인 문구(`design/i18n.md` §4.11)만 규칙과 맞춘다.
- 이 카드가 **하지 않는 것**(R-56 밖): 앱 버전 표시, 백업 버튼, 부분 초기화 선택지, 새 이벤트 구독, 낙관적 갱신, 다른 카드 조작 막기.
- 계약 §5.10 「소비자」 행의 「응답 전까지 다른 조작을 막는다(02-design §2 `resetPhase`)」는 02-design §2 `resetPhase` 규칙을 가리키며, 이 설계는 그것을 **초기화 버튼 재진입 차단**(§7.3 `onOpenDialog` 가드 + 버튼 `disabled`)으로 구현한다. 다른 카드 조작은 막지 않는다 — 초기화와 다른 command의 직렬화는 계약 §5.10 C-4(동기 command)가 보장하고, 계약도 이 ui 장치를 「ui 보조(정합성 근거 아님)」로 적는다. 해석 결정: 「pending 중 조작 차단」은 **초기화 버튼 재진입 차단(`disabled`·`aria-busy`)만** 유지한다(ui 패킷 `data-reset-03-packet-ui.md` §3-5 기준). 계약 §5.10 소비자 행 문구와의 차이는 bridge 문서 정리 대상으로 보고함.

### 7.1 파일

| 파일 | 변경 |
|---|---|
| `src/settings/components/ResetAllCard.tsx` | **신규**, default export `ResetAllCard`(named export도 같은 이름 — 기존 컴포넌트 관례). 목표 ≤ 80줄(400줄 한계 여유), 함수마다 ≤ 50줄 |
| `src/settings/components/GeneralTab.tsx` | import 1줄 + 렌더 마지막에 `<ResetAllCard onError={onError} />` 1줄(§4-6) |
| `src/settings/components/GeneralTab.module.css` | `.dangerButton` 규칙 추가(§7.4). 기존 규칙 불변 |
| `src/settings/i18n/{types,ko,ja,en}.ts` | 단순 키 +8, `errors` +2(`design/i18n.md` §4.11·§4.6) — `types.ts`에 먼저 추가 |

import: `useEffect`·`useRef`·`useState`(react), `resetAppData`·`toBridgeError`·`type BridgeError`(`src/bridge` — `GeneralTab`과 같은 import 경로), `useMessages`(`../i18n/MessagesContext`), `SettingsCard`·`ConfirmDialog`(같은 폴더), `styles from './GeneralTab.module.css'`.

### 7.2 상태

| 상태 | 용도 | 타입 | 초기값 | 소유 |
|---|---|---|---|---|
| `dialogOpen` | 확인창 표시 | `boolean` | `false` | `ResetAllCard` `useState` |
| `phase` | 버튼 비활성·상태 줄 문구 | `'idle' \| 'pending' \| 'done'` | `'idle'` | `ResetAllCard` `useState` |
| `buttonRef` | 「전체 초기화」 버튼 — 포커스 복귀 대상 | `RefObject<HTMLButtonElement>` | `useRef<HTMLButtonElement>(null)` | `useRef` |
| `focusAfterRef` | 확인 뒤 pending이 끝나면 버튼으로 포커스를 돌릴지 | `boolean`(ref) | `false` | `useRef` |
| (파생) `statusText` | 상태 줄 내용 | `string` | 렌더 중 매핑 `statusTextByPhase: Record<Phase, string> = { idle: '', pending: t.resetAllPending, done: t.resetAllDone }`(`type Phase = 'idle' \| 'pending' \| 'done'`, 컴포넌트 파일 로컬 타입)에서 `statusTextByPhase[phase]` — CR-060(중첩 삼항 대체, 값 불변) | 렌더 중 계산 |

- 상태 전이: `idle`/`done` —확인→ `pending` —resolve→ `done` / —reject→ `idle`. 확인창 열기·취소는 `phase`를 바꾸지 않는다(`done` 문구는 다음 확인까지 남는다). 타이머·자동 해제 없음.
- **(규범, 판정 대상)** 탭을 옮기면 `GeneralTab`과 함께 언마운트되어 상태는 초기값(`dialogOpen` false·`phase` idle)으로 돌아온다 — 다시 돌아오면 카드는 초기값이다(보존하지 않는다). pending 중 언마운트돼도 `onError`는 부모(`SettingsApp`) 것이므로 실패는 창 공통 오류 줄에 **반드시** 보여야 한다. 이 두 규칙은 설명이 아니라 구현·검증이 따라야 하는 규범이다(매니저 결정).

### 7.3 기능

| function | 시그니처 | 입력 | 출력(반환 / 상태 변경) | 동작 | 예외 | 요구ID · 패킷 §3 |
|---|---|---|---|---|---|---|
| `onOpenDialog` | `() => void` | 없음(버튼 `onClick`) | 없음 / `dialogOpen = true` | `phase === 'pending'`이면 아무것도 하지 않고 반환(가드). 아니면 `setDialogOpen(true)` | 없음 | R-56 · 동작 1 |
| `onCancel` | `() => void` | 없음(`ConfirmDialog` 취소 버튼·Esc) | 없음 / `dialogOpen = false` | `setDialogOpen(false)` → `buttonRef.current?.focus()`. **bridge 호출 0회**, `phase`·`onError` 불변 | 없음 | R-56 · 동작 3 |
| `onConfirm` | `() => Promise<void>` | 없음(`ConfirmDialog` 확인 버튼) | `Promise<void>`(항상 resolve) / `dialogOpen = false`, `phase` `'pending'` → `'done'` 또는 `'idle'`, `focusAfterRef = true`, `onError` 1회 | ① `setDialogOpen(false)` ② `focusAfterRef.current = true` ③ `setPhase('pending')` ④ `await resetAppData()`(인자 없음, 1회) ⑤ 성공 → `setPhase('done')` → `onError(null)` | `resetAppData` reject → `setPhase('idle')` → `onError(toBridgeError(e))`(창 공통 오류 줄). 예외를 밖으로 던지지 않는다 | R-56 · 동작 4 |
| (효과) 포커스 복귀 | `useEffect(() => { … }, [phase])` | `phase` | 없음 / `focusAfterRef = false` | `phase !== 'pending'`이고 `focusAfterRef.current`면 → `focusAfterRef.current = false` → `buttonRef.current?.focus()`. 비활성(pending) 버튼은 포커스를 받지 못하므로 활성으로 돌아온 **뒤** 효과에서 옮긴다 | 없음(ref null이면 무시) | R-56 · 접근성 |

- 동작 2(확인창 문구·첫 포커스)·5(버튼 disabled·`aria-busy`)·6(상태 줄)은 §7.5 렌더, 동작 7~9(낙관적 갱신 없음·알림음 카드·이벤트 순서)는 §7.6.

### 7.4 위험 버튼 스타일 `.dangerButton` (`GeneralTab.module.css`)

색은 **기존 토큰 `var(--st-danger)`**(#dc2626, `settings.module.css` `:root` — 이미 `ConfirmDialog` `.danger` 확인 버튼·오류 줄 글자에 쓰는 토큰)만 쓴다. `.claude/skills/ui_design_concept.md`의 역할 이름 = **`danger`**(Button 변형 「danger(이미지 제거·초기화)」, 전역 이름 `--color-danger`)이며, settings 창은 이 역할을 `--st-danger`로 구현해 왔다. **새 색 없음.**

| 선택자 | 규칙 |
|---|---|
| `.dangerButton` | `.outlineButton`과 같은 모양 — `padding: 6px 14px; border-radius: 999px; background: #fff; font: inherit; cursor: pointer` — 에 `border: 1px solid var(--st-danger); color: var(--st-danger); font-weight: 600` |
| `.dangerButton:disabled` | `opacity: 0.5; cursor: not-allowed` |
| `.dangerButton:focus-visible` | `outline: 2px solid var(--st-danger); outline-offset: 2px` |

- hover 규칙 없음(`.outlineButton`과 같음). 카드 높이·여백은 §2.2 규칙 그대로(새 치수 없음). 설명 단락은 기존 `.fieldDesc`(12px·`var(--st-muted)`·margin 0), 상태 줄은 기존 `.notice`(min-height 16px — 빈 문자열일 때도 줄 높이 유지) 재사용.

### 7.5 렌더

1. `const t = useMessages()`.
2. `<SettingsCard title={t.cardReset} action={버튼}>` — 버튼 = `<button ref={buttonRef} type="button" className={styles.dangerButton} disabled={phase === 'pending'} aria-busy={phase === 'pending' || undefined} onClick={onOpenDialog}>{t.resetAll}</button>`. 표준 `<button>` 직접 사용은 settings 창 기존 편차(design.md D-3 — 공용 `Button` 없음, cardWindow `[resetPosition]`과 같은 방식).
3. 본문 ①: `<p className={styles.fieldDesc}>{t.resetAllDesc}</p>`.
4. 본문 ②: `<p role="status" aria-live="polite" className={styles.notice}>{statusText}</p>` — **항상 렌더**(내용만 바뀜).
5. 본문 ③: `<ConfirmDialog open={dialogOpen} title={t.confirmResetAllTitle} message={t.confirmResetAllMessage} confirmLabel={t.confirmResetAllOk} cancelLabel={t.confirmCancel} onConfirm={() => void onConfirm()} onCancel={onCancel} />` — `onConfirm`은 `Promise`를 돌려주므로 화살표 래퍼에서 `void`로 버린다(항상 resolve — §7.3). `tone` 생략(기본 `'danger'` = 빨간 확인 버튼). `confirmCancel`은 기존 키 재사용.

### 7.6 화면 갱신 규칙 (낙관적 갱신 없음)

- 초기화 뒤 화면 값은 **기존 `SettingsApp` 구독**(`onSettingsChanged` → `settings`, `onAssetsChanged` → 매니페스트)으로만 바뀐다(이 문서 머리 「저장 방식」과 같은 규칙). `ResetAllCard`는 `getSettings`·`getAssetManifest`를 다시 부르지 않고, 새 이벤트를 구독하지 않는다.
- 두 이벤트는 각각 전체 스냅숏이므로 **도착 순서에 의존하지 않는다**(계약 §4 v0.25 순서 주석). 부분 실패 때 오는 두 번째 `settings://changed`(계약 §5.10 6단계)도 같은 구독이 그대로 받는다 — 별도 처리 없음.
- command 응답(resolve/reject)과 두 이벤트의 도착 순서에도 의존하지 않는다 — 계약 §5.10은 이벤트(2·3·6단계)를 반환(뒤처리 2~9단계가 끝난 마지막 단계) 전에 보내므로 pending 중 값이 먼저 바뀔 수 있고, 이때도 버튼 `disabled`·상태 줄 pending(`resetAllPending`)은 응답까지 유지된다.
- 탭은 「기본 설정」 그대로다(탭 상태는 `SettingsApp` 소유, 이 카드는 건드리지 않는다).
- 언어는 보존된다(🔒). 초기화 전에 설정 파일을 읽지 못한 드문 경우 언어가 기본 `ko`로 바뀔 수 있고(계약 §5.10 보존 규칙 표), 그러면 `done` 문구도 새 언어로 다시 그려진다(정상).
- 알림음 카드(타이머 탭)는 탭이 마운트될 때 `getAlarmSound()`를 다시 조회하므로 이 카드가 처리하지 않는다(패킷 §3-8).
- 타이머 진행 상태는 core 소관(계약 §5.10 보존 규칙 표 · 처리 순서 8단계). 이 카드는 타이머 command를 부르지 않는다.

### 7.7 bridge 계약 사용표 (contract v0.25 인용 — 재정의 아님)

| 이름 | 종류 | 페이로드 타입(`src/bridge/types.ts` 기준) | 호출·구독 위치 | 실패 시 표시 |
|---|---|---|---|---|
| `reset_app_data` · 래퍼 `resetAppData()` | command(§5.10) | 입력 없음 → `Promise<void>`. reject 값은 `toBridgeError(e)`로 `BridgeError { code: string; message: string }` | `ResetAllCard.onConfirm` 1곳 | `onError(BridgeError)` → 창 공통 오류 줄 `{t.errorPrefix} {errorText(t, language, e)}`. 발생 code(계약 §5.10·§6.2): `reset.io`·`reset.seed`·`settings.io`·`state.poisoned` — 문구 `design/i18n.md` §4.6(ko는 core `message` 우선). `settings.io`(계약 §5.10 ④ 설정 저장 실패)는 기존 `settings.io` 문구 그대로이며 부분 초기화·다음 시작 재시도 안내가 없다(알려진 한계, 문구 변경 없음) |
| `settings://changed` | event(§4) | `Settings` | 기존 `SettingsApp` 구독(변경 없음) | — |
| `assets://changed` | event(§4) | `AssetManifest` | 기존 `SettingsApp` 구독(변경 없음) | — |
| `assets://hand-anchor-changed` · `timer://changed` | event(§4, 조건부) | — | 이 카드는 구독하지 않는다. 설정 창의 기존 구독 범위(타이머 탭 공용 훅 등)는 그대로 | — |

### 7.8 접근성

- 버튼: 네이티브 `<button>` — Enter·Space로 연다. 접근 이름 = 보이는 글자 `t.resetAll`(별도 `aria-label` 없음). pending 동안 `disabled` + `aria-busy="true"`(그 밖에는 속성 없음).
- 확인창: 기존 `ConfirmDialog` — `role="alertdialog"`, 제목으로 이름, **첫 포커스 = 취소**, Esc = 취소, Tab은 창 안에서 순환. 본문에 「되돌릴 수 없습니다」가 있어 위험을 색만으로 전하지 않는다.
- 포커스 복귀: 취소·Esc → 「전체 초기화」 버튼. 확인 → pending이 끝난 뒤(`done`·`idle`) 같은 버튼(§7.3 효과).
- 상태 알림: 상태 줄 `role="status" aria-live="polite"`를 **항상** 렌더해 「초기화하는 중입니다…」→「초기화했습니다.」가 읽힌다. 실패는 창 공통 오류 줄(`role="alert"`).
