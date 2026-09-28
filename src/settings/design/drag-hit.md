# settings 상세 설계 — 팔·손 끌기 픽셀 판정·영역 상자 (CR-040)

| 항목 | 값 |
|---|---|
| 화면 | 설정 창 `src/settings/` · 「어깨축·손 위치」 탭(`MousePartsTab`) 미리보기 |
| 요구 | `src/settings/requirements.md` **v1.14** — R-37(끌기 대상 = 누른 자리의 알파>0 그림, 선택 버튼 없음) · R-38(팔 = 파란 테두리 상자, 펜 손 = 빨간 테두리 상자) |
| 근거 | `doc/000_프로젝트_확정사항.md` §6 「팔·손 끌기 판정·영역 표시 (🔒 2026-09-25, CR-040)」 · 관리자 위임문(2026-09-25) |
| 레이아웃 | **확정 — 변경 없음.** `design.md` §2 ASCII 그대로. 상자 2개는 미리보기 안에 겹치는 장식이라 영역·버튼·포커스 순서가 바뀌지 않는다(겹침 순서는 §6) |
| 계약 | **변경 없음.** 새 command·event·타입 없음. 이미지 주소는 기존 `AssetEntry.url`(`get_asset_manifest`·`assets://changed`) 그대로 |
| 라이브러리 | 새 설치 없음(브라우저 표준 Canvas 2D·`Image`만) |
| 대체하는 기존 서술 | `design.md` §5.1 `pickDragTarget`(CR-026 행 — 사각형만 보는 판정), §4 끝 문단 「누른 점이 두 그림에 모두 들면 위에 그려진 펜 손을 먼저」(→ 두 그림 모두 **알파>0**일 때), §5.2 렌더 개정 문단의 「펜 손도 좌표 기반, 투명 픽셀도 사각형 안이면 잡힘」, §10 넷째 줄 「투명 픽셀도 그림 사각형 안이면 잡힌다」 → 이 문서 §4·§5가 대체. `hitPart` 자체는 바뀌지 않는다(사각형 예비 판정으로 계속 쓴다) |

## 1. 결론

누른 자리의 실제 픽셀로 판정한다. 비유하면 지금은 「사진 액자의 테두리 안이면 사진을 집었다」고 보는데, 앞으로는 「종이에 잉크가 묻은 자리를 눌렀을 때만 그 종이를 집었다」고 본다.

- 알파 마스크는 **프론트에서 만든다**: 같은 `AssetEntry.url`을 `crossOrigin = 'anonymous'`인 `Image`로 따로 읽어 화면 밖 캔버스에 그리고 `getImageData`로 알파만 뽑는다. 계약·의존성 변경이 없다.
- 판정은 **순수 함수**(`alphaMask.ts`·`mouseWizard.ts`)로 분리하고 마스크를 인자로 주입한다 → jsdom에서 캔버스 없이 테스트한다.
- 마스크가 아직 없거나 만들지 못하면 **옛 사각형 판정으로 대체**한다(§2.3, 끌기가 통째로 막히지 않게).

## 2. 알파 데이터 얻는 방법 — 판단

### 2.1 tainted canvas 검토 (Tauri asset 프로토콜 기준)

| 확인 항목 | 사실 | 근거 |
|---|---|---|
| 이미지 주소 | `http://asset.localhost/{인코딩 경로}?v=…` — Rust가 만들어 `AssetEntry.url`로 준다 | `src-tauri/src/assets/url.rs`, `.claude/reports/bridge-survey-20260924-settingsv2.md` 171행 |
| 페이지 출처 | 개발 `http://localhost:1420`(`tauri.conf.json` `build.devUrl`), 배포 `http://tauri.localhost` → 이미지와 **다른 출처** | `tauri.conf.json`, Tauri 2.11.6 `src/manager/webview.rs` 245~257행(`window_origin` 계산) |
| CORS 헤더 | asset 프로토콜 응답이 **모든 응답**에 `Access-Control-Allow-Origin: {window_origin}`을 붙인다(정상 응답·오류 응답 모두) | Tauri 2.11.6 `src/protocol/asset.rs` 21행·39행, 등록은 `webview.rs` 343행 |
| CSP | `img-src 'self' asset: http://asset.localhost data:` — `new Image()` 로드 허용. `getImageData`는 CSP 대상이 아니다 | `tauri.conf.json` `app.security.csp` |
| 결론 | `crossOrigin = 'anonymous'`로 읽은 이미지는 CORS 통과 → 캔버스가 오염되지 않아 `getImageData`가 된다. **`crossOrigin` 없이 읽으면 오염**되어 `SecurityError`가 난다 → 미리보기의 표시용 `<img>`(crossOrigin 없음)를 재사용하지 말고 **마스크용 `Image`를 따로** 만든다 | 위 세 줄 |

- 이전 판단과의 관계: core `doc/200_설계/core/assets.md` 결정 D2(손 기준점을 Rust에서 계산, 사유 「asset 프로토콜 이미지 CORS 오염 위험」)는 **손 기준점 계산**에 대한 결정이며 이 문서가 바꾸지 않는다. 위 표는 그 「위험」이 `crossOrigin` 지정으로 해소됨을 확인한 것이다.
- 남는 위험: WebView2 실제 동작은 jsdom으로 확인할 수 없다 → 수동 확인 M-40a(§8)로 개발·배포 두 출처에서 확인한다.

### 2.2 대안 (§2.1이 실제 앱에서 실패할 때만)

| 안 | 내용 | 비용 |
|---|---|---|
| A (내장) | 마스크 없음 → 사각형 판정(§2.3). 코드 추가 없음 | 팔을 여전히 잘 못 잡는다(요구 미충족 상태로 되돌아감) |
| B | core가 PNG 알파를 읽어 마스크(또는 불투명 사각형 목록)를 돌려주는 command 신설 | **계약 변경 — bridge 인계 필요**, 사용자 승인 후. 이번 설계에 넣지 않는다 |

### 2.3 마스크가 없을 때 (설계 결정 — 관리자 확인 대상)

`mask`가 `null`(로딩 중·로드 실패·`getContext` 없음·`SecurityError`)이거나 마스크 크기가 매니페스트 크기와 다르면(교체 직후 옛 마스크) 그 그림은 **옛 사각형 판정**(`hitPart`)을 쓴다. 사용자에게 오류를 보이지 않는다(끌기는 되므로). 이유: 판정 수단이 없을 때 「끌기 없음」으로 두면 그림을 전혀 옮길 수 없게 된다.

## 3. 컴포넌트·모듈 (배치 3단계 분류)

`src/components/ui`는 여전히 비어 있다 — 공용 재사용 대상 없음. 모두 화면 로컬.

| 모듈/컴포넌트 | 파일 | 분류 | export / props | 부작용 | 요구ID |
|---|---|---|---|---|---|
| `alphaMask` (신규) | `src/settings/alphaMask.ts` (~40줄) | 화면 로컬 순수 모듈 | `AlphaMask` 타입 · `buildAlphaMask` · `isOpaqueAt`(§5.1) | 없음(React·DOM·Tauri 의존 없음) | R-37 |
| `mouseWizard` (개정) | `src/settings/mouseWizard.ts` (141 → ~165줄) | 화면 로컬 순수 모듈 | `DragCandidate` 타입(신규) · `hitOpaque`(신규) · `pickDragTarget`(시그니처 확장, §5.2). `hitPart`·`clampPartPos`·그 밖은 불변 | 없음 | R-37 |
| `useAlphaMask` (신규) | `src/settings/components/useAlphaMask.ts` (~45줄) | 화면 로컬 훅 | `useAlphaMask(url: string \| undefined): AlphaMask \| null`(§5.3) | 이미지 로드·화면 밖 캔버스(`document.createElement('canvas')`, DOM에 붙이지 않음) | R-37 |
| `PartOutline` (신규) | `src/settings/components/PartOutline.tsx` (~30줄) + `PartOutline.module.css` | 화면 로컬(공용 승격 후보 아님 — 이 미리보기 전용) | `pos: Point \| null`, `size: { width: number; height: number } \| undefined`, `scale: number`, `tone: 'arm' \| 'pen'`(§5.4) | 없음(순수 렌더, `React.memo`) | R-38 |
| `MousePartsTab` (개정) | `src/settings/components/MousePartsTab.tsx` (340 → ~352줄, 400줄 한계 안) | 화면 로컬 | props 불변 | 훅 2회 호출, `onPreviewPointerDown` 인자 변경, 렌더에 상자 2개(§5.5) | R-37, R-38 |
| 색 토큰 (추가) | `design.md` §11 D-4 토큰 선언 블록(`--st-*`가 있는 같은 블록) | CSS 변수 | `--st-outline-arm: #1d4ed8` · `--st-outline-pen: #e11d48` | — | R-38 |

- 별도 「팔/손 옮기기」 선택 버튼은 **만들지 않는다**(R-37). 버튼 줄(`design.md` §5.2 렌더 4)은 불변.
- `<span>`을 `PartOutline` 안에서 직접 쓰는 것은 `design.md` §11 D-1(표준 원소 직접 사용 수용)과 같은 처리다.

## 4. 상태

| 상태 | 용도 | 타입 | 초기값 | 소유 |
|---|---|---|---|---|
| `partMask` | 팔 그림(`mouse_base`) 알파 마스크 | `AlphaMask \| null` | `null` | `useAlphaMask(part?.url)` 내부 `useState`(`MousePartsTab`에서 호출) |
| `penMask` | 펜 손 그림(`pen_up`) 알파 마스크 | `AlphaMask \| null` | `null` | `useAlphaMask(pen?.url)` 내부 `useState` |

- `drag`·`shownPartPos`·`shownPenPos`·`penHome` 등 기존 상태는 불변(`design.md` §4). 상자 위치는 새 상태 없이 `shownPartPos`·`shownPenPos`를 그대로 쓴다 → 끌기 중 움직이는 위치를 따라간다.
- `url`이 바뀌면(교체 — contract §3.2 url 버전 규칙으로 `?v=`가 바뀜, 비우기 → `undefined`) 훅이 마스크를 `null`로 되돌린 뒤 다시 만든다.

## 5. 기능 명세

### 5.1 `alphaMask.ts` (순수)

| function / 타입 | 시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| `AlphaMask` | `type AlphaMask = { readonly width: number; readonly height: number; readonly alpha: Uint8Array }` | `alpha[y × width + x]` = 그 픽셀의 알파(0~255). 길이 = `width × height` | — | R-37 |
| `buildAlphaMask` | `(rgba: Uint8ClampedArray, width: number, height: number) => AlphaMask \| null` | `ImageData.data`(RGBA 순) → 새 `Uint8Array(width × height)`에 `alpha[i] = rgba[i × 4 + 3]` 복사. 입력 배열은 바꾸지 않는다 | `width`·`height`가 정수 1 이상이 아니거나 `rgba.length < width × height × 4`면 `null` | R-37 |
| `isOpaqueAt` | `(mask: AlphaMask, x: number, y: number) => boolean` | `ix = Math.floor(x)`, `iy = Math.floor(y)`. `0 ≤ ix < width && 0 ≤ iy < height`이면 `alpha[iy × width + ix] > 0`, 밖이면 `false` | 없음 | R-37 |

예(테스트 기준): 2×1 RGBA `[0,0,0,0, 9,9,9,255]` → `alpha = [0, 255]` · `isOpaqueAt(m, 0, 0) = false` · `isOpaqueAt(m, 1, 0) = true` · `isOpaqueAt(m, 2, 0) = false`(밖) · `isOpaqueAt(m, -1, 0) = false` · `buildAlphaMask(new Uint8ClampedArray(4), 2, 1) = null`(길이 부족) · `buildAlphaMask(…, 0, 1) = null`.

### 5.2 `mouseWizard.ts` 개정

| function / 타입 | 시그니처 | 동작 | 예외 | 요구ID |
|---|---|---|---|---|
| `DragCandidate` (신규) | `type DragCandidate = { pos: Point; size: { width: number; height: number }; mask?: AlphaMask \| null }` | 끌 수 있는 그림 하나. `pos` = 캔버스 좌표 좌상단, `size` = 매니페스트 자연 크기, `mask` = 알파 마스크(없으면 사각형 대체) | — | R-37 |
| `hitOpaque` (신규) | `(point: Point, c: DragCandidate) => boolean` | ① `hitPart(point, c.pos, c.size)`가 `false`면 `false` ② `c.mask`가 `null`·`undefined`이거나 `c.mask.width !== c.size.width` 또는 `c.mask.height !== c.size.height`면 `true`(사각형 대체, §2.3) ③ 아니면 `isOpaqueAt(c.mask, point.x − c.pos.x, point.y − c.pos.y)`. 그림은 회전 없이 자연 크기로 그려지므로 좌표 변환은 오프셋 빼기뿐이다(`point`는 `previewToCanvas`가 만든 캔버스 정수 좌표) | 없음(크기 ≤ 0은 ①에서 `false`) | R-37 |
| `pickDragTarget` (CR-040 개정) | `(point: Point, pen: DragCandidate \| null, part: DragCandidate \| null) => 'pen' \| 'part' \| null` | ① `pen && hitOpaque(point, pen)` → `'pen'`(둘 다 알파>0이면 위에 그려진 손) ② `part && hitOpaque(point, part)` → `'part'` ③ 아니면 `null`(둘 다 투명 → 끌기 없음). 기존 호출(`mask` 없는 객체)은 옛 사각형 결과와 같다 — CR-026 예시 그대로 성립 | 없음 | R-37, R-11, R-18 |

> 주(CR-044): 아래 예 표는 **CR-038 기하 기준(테스트 픽스처)**이다 — 판정 규칙 검증용 고정 좌표·크기이며, 현재 내장 기본값(contract v0.20: 팔 168×151 @ partPos (411, 464), 펜 손 119×196 @ penPos (372, 476))과 다르다. 기대값은 바꾸지 않는다.

예(기본 그림 좌표 — 팔 171×199 @ (389, 492), 펜 손 136×196 @ (356, 504). 두 사각형 겹침 = x∈[389, 492)·y∈[504, 691)). 누른 점 (450, 600), 팔 기준 (61, 108), 펜 손 기준 (94, 96):

| 펜 손 마스크 (94,96) | 팔 마스크 (61,108) | 결과 |
|---|---|---|
| 0 | 255 | `'part'` — 이번 CR의 목적(겹친 투명 자리 아래 팔을 잡음) |
| 255 | 255 | `'pen'` |
| 255 | 0 | `'pen'` |
| 0 | 0 | `null` |
| 마스크 없음(`null`) | 255 | `'pen'`(사각형 대체) |
| 크기 다른 마스크(예 10×10) | 255 | `'pen'`(사각형 대체) |

누른 점 (370, 520)(펜 손 사각형 안, 팔 사각형 밖): 펜 손 알파 0 → `null`, 알파>0 → `'pen'`.

### 5.3 `useAlphaMask` (훅)

| 항목 | 내용 |
|---|---|
| 시그니처 | `useAlphaMask(url: string \| undefined): AlphaMask \| null` |
| 상태 | `const [mask, setMask] = useState<AlphaMask \| null>(null)` |
| 효과 | `useEffect(…, [url])`: ① `setMask(null)` ② `url`이 없으면 끝 ③ `let cancelled = false`, `const img = new Image()`, `img.crossOrigin = 'anonymous'`(**`src`보다 먼저**), `img.decoding = 'async'` ④ `img.onload`: `cancelled`면 무시 → `w = img.naturalWidth`, `h = img.naturalHeight` → `canvas = document.createElement('canvas')`, `canvas.width = w`, `canvas.height = h` → `ctx = canvas.getContext('2d', { willReadFrequently: true })`, `ctx`가 없으면 `setMask(null)` 후 끝 → `ctx.drawImage(img, 0, 0)` → `try { setMask(buildAlphaMask(ctx.getImageData(0, 0, w, h).data, w, h)) } catch { setMask(null) }` ⑤ `img.onerror`: `cancelled`가 아니면 `setMask(null)` ⑥ `img.src = url` ⑦ 정리 함수: `cancelled = true; img.onload = null; img.onerror = null` |
| 반환 | 현재 `mask` |
| 예외 | 던지지 않는다. 모든 실패 = `null`(§2.3). 콘솔 출력 없음 |
| 성능 | 그림 하나당 로드 1회(최대 900×700 → `Uint8Array` 630,000바이트). 포인터 이동마다 다시 만들지 않는다 |
| 테스트 이음새 | 컴포넌트 테스트는 `vi.mock`으로 이 모듈을 바꿔 url별 마스크를 주입한다. mock이 없으면 jsdom에서 `Image`가 로드되지 않아 늘 `null` → 사각형 대체(기존 끌기 TC가 그대로 성립) |

### 5.4 `PartOutline` (렌더)

1. `pos`가 `null`이거나 `size`가 없거나 `size.width ≤ 0` 또는 `size.height ≤ 0`이면 `null`(그림이 없으면 상자 없음).
2. `<span className={`${styles.outline} ${tone === 'arm' ? styles.arm : styles.pen}`} aria-hidden="true" data-testid={`outline-${tone}`} style={{ left: pos.x × scale, top: pos.y × scale, width: size.width × scale, height: size.height × scale }} />`.
3. `PartOutline.module.css`: `.outline { position: absolute; box-sizing: border-box; border-width: 1px; border-style: dashed; pointer-events: none }` · `.arm { border-color: var(--st-outline-arm) }` · `.pen { border-color: var(--st-outline-pen) }`.
4. `export default React.memo(PartOutline)`.

색 결정(R-38 「파란·빨간」, 기존 토큰과 충돌 없이):

| 토큰 | 값 | 겹치지 않게 비교한 기존 색 |
|---|---|---|
| `--st-outline-arm` | `#1d4ed8`(짙은 파랑) | 이동 영역 선 `#3b82f6`(실선 1px/2px) · `.previewPicking` 외곽선 `#3b82f6` — 색을 더 짙게 하고 **점선**으로 구분 |
| `--st-outline-pen` | `#e11d48`(장미 빨강) | `--st-danger` `#dc2626`(오류 의미) · 축 마커 `#e53935`(채운 원) · `--st-accent` `#BE72AD` — 다른 색상값 + **점선** 상자 모양으로 구분 |

### 5.5 `MousePartsTab` 개정

| 대상 | 개정 |
|---|---|
| 파생 추가 | `const partMask = useAlphaMask(part?.url)`, `const penMask = useAlphaMask(pen?.url)` — `part`·`pen` 파생 바로 뒤, 조건 없이 항상 호출(Hook 규칙) |
| `onPreviewPointerDown` | 조건·흐름은 `design.md` §5.2 CR-026 개정 행 그대로. 판정 호출만 `pickDragTarget(point, pen && penHome ? { pos: penHome, size: pen, mask: penMask } : null, part ? { pos: mouse.partPos, size: part, mask: partMask } : null)`. `null`이면 아무것도 안 함(캡처·`drag` 없음 → 이후 `click`은 `onPreviewClick`이 idle이라 무시) |
| `onPreviewPointerMove`·`Up`·`Cancel`·`onPreviewClick` | 불변(마법사 pickShoulder·pickArea 클릭은 판정과 무관하게 점 지정) |
| 렌더 3(미리보기 안, 아래→위) | 헤어 → 팔 `<img>` → 바탕 → 펜 손 `<img>` → **`<PartOutline pos={part ? shownPartPos : null} size={part} scale={scale} tone="arm" />`** → **`<PartOutline pos={pen ? shownPenPos : null} size={pen} scale={scale} tone="pen" />`** → `AreaOutline` → 축 마커 |
| 표시 조건 | 마법사 단계·`saving`과 무관하게 그림이 있으면 항상 표시(요구에 숨김 조건 없음). 펜 손 상자는 펜 손 `<img>`와 같은 조건(`pen`과 `shownPenPos`가 있을 때) |

## 6. 레이어·미리보기

- 합성 순서(아래→위): 헤어 → 팔(`mouse_base`) → 바탕(`body`/`kb_up`) → 펜 손(`pen_up`) → **팔 상자(파랑)** → **펜 손 상자(빨강)** → 이동 영역 선 → 축 마커. 상자를 그림 위에 두는 이유: 팔은 바탕 아래에 깔려 거의 가려지므로 범위를 보이려면 바탕보다 위여야 한다.
- 상자 = 그림 사각형 전체(투명 여백 포함) — 「각 이미지 범위」를 보인다. 판정은 상자가 아니라 픽셀이다(상자 안 투명 자리는 잡히지 않는다).
- 상자는 `pointer-events: none` → 판정·클릭·끌기에 영향 없음.
- 끌기 중 위치: 팔을 끌면 파란 상자가 `drag.pos`를, 손을 끌면 빨간 상자가 `drag.pos`를 따라간다(`shownPartPos`·`shownPenPos`). 움직이지 않는 쪽 상자는 제자리.
- 미리보기 좌표 = 캔버스 좌표 × `scale`(기존 규칙). 오버레이 화면에는 상자가 없다(설정 미리보기 전용).

## 7. 파이프라인

| # | 흐름 | 정상 | 오류·예외 |
|---|---|---|---|
| P-40a | 마스크 준비 | 탭 렌더 → `useAlphaMask`가 `part.url`·`pen.url`을 따로 로드 → 마스크 저장. 그림 교체(`assets://changed`로 url 변경) → `null`로 되돌린 뒤 다시 생성. 그림 비움 → `null` | 로드 실패·`getContext` 없음·`SecurityError` → `null` → 그 그림은 사각형 판정(§2.3). 사용자 표시 없음 |
| P-40b | 끌기 시작 판정 | idle·저장 중 아님·왼쪽 버튼 → `pickDragTarget`(마스크 주입) → `'pen'`/`'part'`이면 `design.md` P-5 그대로(따라 움직임 → 놓으면 위치가 바뀐 경우만 `set_settings`) | 둘 다 투명 → 아무 일 없음(캡처·저장·표시 변화 없음). 마스크 준비 전 누름 → 사각형 판정 |
| P-40c | 상자 표시 | 그림 있음 → 상자 표시, 끌기 중 따라감, 놓은 뒤 저장된 자리 | 저장 실패 → 기존 P-5대로 오류 줄 + 그림·상자 모두 옛 자리 |

파괴 조작 없음 → confirm 없음.

## 8. 접근성

- 상자는 장식 → `aria-hidden="true"`, 포커스 대상 아님, 문구·aria-label 없음. 새 문구 키 없음(`design/i18n.md` 불변).
- 끌기는 기존대로 포인터 전용(`design.md` §9). 결과는 값 목록 「파츠 위치」·「손 위치」로 확인. 새 상태 알림 없음(투명 자리 누름은 알리지 않는다).
- 포커스 순서·키보드 조작 불변.

## 9. 테스트 인계 (ui-test-designer)

| 대상 | 방식 | 기대 |
|---|---|---|
| `buildAlphaMask`·`isOpaqueAt` | vitest 순수(`test/alphaMask.test.ts` 예정) | §5.1 예 전부 |
| `hitOpaque`·`pickDragTarget` | vitest 순수(`test/mouseWizard.test.ts`) | §5.2 표 6행 + (370, 520) 2건 |
| 화면 끌기(픽셀) | `MousePartsTab` 테스트에서 `useAlphaMask` mock(url → 마스크) | 겹친 점에서 펜 손 투명·팔 불투명 → 팔이 따라 움직이고 놓으면 `setSettings` 1회 `partPos`만 변경 / 둘 다 투명 → `setSettings` 0회·`outline-*` 위치 불변 |
| 상자 | 같은 파일 | `outline-arm`·`outline-pen` 인라인 style = 캔버스 값 × scale, `aria-hidden="true"`, `pen_up` 없으면 `outline-pen` 없음, `mouse_base` 없으면 `outline-arm` 없음, 끌기 중 끄는 쪽 상자만 이동 |
| 수동 M-40a | 실제 앱(`yarn tauri dev`와 빌드 exe 각각) | 기본 그림에서 겹친 곳 중 팔만 칠해진 자리를 눌러 팔이 끌림, 두 그림 모두 투명한 자리는 끌리지 않음, 파란·빨간 점선 상자 표시(스크린샷) |

기존 TC 영향: TC-078·TC-079(`mask` 없는 인자 = 사각형 대체라 결과 불변, 설계 근거 줄만 CR-040으로 갱신) · TC-082·TC-085·TC-090·TC-199(jsdom 마스크 `null` → 결과 불변. TC-085 「겹침 시 펜 손 우선」은 「마스크 없음/둘 다 불투명일 때」로 전제 문구 갱신).

## 10. RTM 조각 (주 문서 `design.md` §13에 행 있음)

| 요구ID | 이 문서 절 |
|---|---|
| R-37 | §2(방법 판단), §3 `alphaMask`·`mouseWizard`·`useAlphaMask`·`MousePartsTab`, §4 `partMask`·`penMask`, §5.1~§5.3, §5.5 `onPreviewPointerDown`, §7 P-40a·P-40b, §9 |
| R-38 | §3 `PartOutline`·색 토큰, §5.4, §5.5 렌더 3·표시 조건, §6, §7 P-40c, §8, §9 |
