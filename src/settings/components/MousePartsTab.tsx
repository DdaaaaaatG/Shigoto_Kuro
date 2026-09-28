/**
 * 설정 창 「어깨축·손 위치」 탭(옛 「마우스 파츠」, R-26 재사용).
 * - 미리보기: 바탕(body, 없으면 kb_up) 아래에 마우스 기본 파츠를 partPos 에 자연 크기로 겹치고,
 *   이동 영역 선(AreaOutline)과 축(어깨)을 표시한다. 패드 구역 박스는 항상 숨긴다(CR-016).
 * - 「어깨축 설정하기」 마법사(CR-005, 한 단계): 축 클릭 → 검토 → 저장/취소.
 * - 「사각형 이동 영역 설정」 마법사(CR-018, R-15 · 문구 CR-057): 네 꼭짓점을 순서대로 클릭 → 검토(사각형) → 저장/취소.
 *   idle 에서는 안내 줄 아래에 이동 영역 설명 줄(areaDesc, CR-057 · R-57)을 함께 보인다.
 *   두 마법사는 같은 상태기계(mouseWizard.ts, 순수)를 공유해 동시에 진행할 수 없다(§4 상호 배타).
 * - 손 그림 끌어다 놓기(CR-016, R-11): 미리보기에서 손 그림 사각형을 눌러 끌고 놓으면 partPos 를 저장한다.
 *   끌기는 마법사가 idle 이고 저장 중이 아닐 때만 시작된다(끌기·마법사 충돌 규칙, design §5.2).
 * - 펜 쥔 손 위치 끌기(CR-026, R-18): pen_up 이 등록돼 있으면 바탕 위에 그리고 같은 방식으로 끌어
 *   penPos 를 저장한다. 팔 파츠와 겹치면 위에 그려진 펜 손을 먼저 잡는다(pickDragTarget).
 * - 팔·손 끌기 픽셀 판정·영역 상자(CR-040, R-37·R-38): 끌기 대상은 누른 자리에 실제로 그려진(알파>0)
 *   그림으로 정한다(useAlphaMask 로 만든 마스크를 pickDragTarget 에 주입 — hitOpaque). 마스크가
 *   없거나(로딩 중·실패) 크기가 다르면(교체 직후) 옛 사각형 판정으로 대체한다. 미리보기에 팔(파란)·
 *   펜 손(빨간) 영역 상자(PartOutline, 점선, 장식)를 항상 표시해 각 그림 범위를 보여 준다 — 상자는
 *   판정에 관여하지 않는다.
 * - 「기본값으로 리셋」: DEFAULT_MOUSE_SETTINGS 로 되돌린다(확인 창 없음, 사용자 확인 🔒 2026-09-23).
 *   단, penMode(CR-033) 는 위치류가 아니므로 리셋해도 현재 값을 그대로 싣는다(images-tab.md §9.6, 결정 ①).
 * - CR-028: 문구 출처가 labels.ts → useMessages()(Provider 없으면 ko)로 바뀐다. 동작·props 는 그대로다(R-26).
 * - 헤어(뒷머리, CR-037·R-34): hair 슬롯이 있으면 미리보기 맨 아래(바탕과 같은 .layer, 캔버스 전체)에 그린다.
 *   끌기·클릭 판정 대상이 아니다(좌표 기반 pickDragTarget 은 헤어를 모른다).
 */
import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import {
  DEFAULT_MOUSE_SETTINGS,
  setSettings,
  slotKey,
  toBridgeError,
  type AssetManifest,
  type BridgeError,
  type MouseSettings,
  type Point,
  type Settings,
} from 'bridge'
import { resolvePenPos } from 'state/mouseMapping'
import { useMessages } from '../i18n/MessagesContext'
import type { Messages } from '../i18n/types'
import {
  applyWizard,
  clampPartPos,
  fitScale,
  initialWizard,
  pickDragTarget,
  previewToCanvas,
  wizardReduce,
  type WizardState,
} from '../mouseWizard'
import AreaOutline from './AreaOutline'
import PartOutline from './PartOutline'
import { useAlphaMask } from './useAlphaMask'
import styles from './MousePartsTab.module.css'

const BOX = { width: 450, height: 350 }

export type MousePartsTabProps = {
  settings: Settings
  manifest: AssetManifest
  onError: (e: BridgeError | null) => void
}

type Drag = { target: 'part' | 'pen'; grab: Point; pos: Point; from: Point }
type AreaDisplay = { points: readonly Point[]; closed: boolean; editing: boolean }

const findUrl = (manifest: AssetManifest, key: 'body' | 'kb_up' | 'mouse_base' | 'hair') =>
  manifest.entries.find(e => e.slot === key)?.url

/** 값 목록 「이동 영역」 행 문구: 꼭짓점 이름 (x, y) 네 개를 ' · '로 연결(CR-018, R-16) */
const areaText = (area: readonly Point[], t: Messages): string => {
  const cornerLabels = [t.areaCorner1, t.areaCorner2, t.areaCorner3, t.areaCorner4]
  return area.map((p, i) => `${cornerLabels[i]} (${p.x}, ${p.y})`).join(' · ')
}

const guideText = (w: WizardState, t: Messages): string => {
  switch (w.step) {
    case 'idle':
      return t.wizardIdle
    case 'pickShoulder':
      return t.wizardPickShoulder
    case 'review':
      return t.wizardReview
    case 'pickArea':
      return [t.areaPick1, t.areaPick2, t.areaPick3, t.areaPick4][w.area.length]
    case 'reviewArea':
      return t.areaReview
  }
}

const MousePartsTab = ({ settings, manifest, onError }: MousePartsTabProps) => {
  const t = useMessages()
  const [wizard, dispatch] = useReducer(wizardReduce, initialWizard)
  const [saving, setSaving] = useState(false)
  const [drag, setDrag] = useState<Drag | null>(null)
  const canvas = manifest.canvas ?? { width: 900, height: 700 }
  const scale = fitScale(canvas, BOX)
  const mouse: MouseSettings = settings.mouse ?? DEFAULT_MOUSE_SETTINGS
  const baseUrl = findUrl(manifest, 'body') ?? findUrl(manifest, 'kb_up')
  const hairUrl = findUrl(manifest, 'hair')
  const part = manifest.entries.find(e => e.slot === 'mouse_base')
  const pen = manifest.entries.find(e => slotKey(e.slot) === 'pen_up')
  const partMask = useAlphaMask(part?.url)
  const penMask = useAlphaMask(pen?.url)
  const penHome = pen ? resolvePenPos(mouse, { width: pen.width, height: pen.height }) : null
  const shownShoulder =
    wizard.step === 'pickShoulder' || wizard.step === 'review' ? wizard.shoulder : mouse.shoulder
  const shownPartPos = drag?.target === 'part' ? drag.pos : mouse.partPos
  const shownPenPos = drag?.target === 'pen' ? drag.pos : penHome

  // §4 shownArea: pickArea·reviewArea 중에는 임시 점(편집 표시), 그 외 저장된 영역(닫힌 얇은 선)
  let shownArea: AreaDisplay
  if (wizard.step === 'pickArea') {
    shownArea = { points: wizard.area, closed: false, editing: true }
  } else if (wizard.step === 'reviewArea') {
    shownArea = { points: wizard.area, closed: true, editing: true }
  } else {
    shownArea = { points: mouse.area, closed: true, editing: false }
  }
  const valuesArea: readonly Point[] = wizard.step === 'reviewArea' ? wizard.area : mouse.area

  // §9 단계 전환 후 포커스: 단계별 첫 버튼으로 옮긴다. 첫 마운트(초기 idle)는 옮기지 않는다.
  const startRef = useRef<HTMLButtonElement>(null)
  const cancelPickRef = useRef<HTMLButtonElement>(null)
  const saveRef = useRef<HTMLButtonElement>(null)
  const prevStepRef = useRef(wizard.step)

  useEffect(() => {
    const prevStep = prevStepRef.current
    prevStepRef.current = wizard.step
    if (prevStep === wizard.step) return
    if (wizard.step === 'pickShoulder' || wizard.step === 'pickArea') cancelPickRef.current?.focus()
    else if (wizard.step === 'review' || wizard.step === 'reviewArea') saveRef.current?.focus()
    else startRef.current?.focus()
  }, [wizard.step])

  const persist = async (next: MouseSettings) => {
    setSaving(true)
    try {
      await setSettings({ ...settings, mouse: next })
      onError(null)
      dispatch({ type: 'saved' })
    } catch (e) {
      onError(toBridgeError(e))
    } finally {
      setSaving(false)
    }
  }

  const toCanvasPoint = (e: PointerEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect()
    return previewToCanvas({ x: e.clientX - rect.left, y: e.clientY - rect.top }, scale, canvas)
  }

  const onPreviewClick = (e: MouseEvent<HTMLDivElement>) => {
    if (wizard.step !== 'pickShoulder' && wizard.step !== 'pickArea') return
    dispatch({ type: 'pick', point: toCanvasPoint(e) })
  }

  const onPreviewPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (wizard.step !== 'idle' || saving || e.button !== 0) return
    const point = toCanvasPoint(e)
    const target = pickDragTarget(
      point,
      pen && penHome ? { pos: penHome, size: pen, mask: penMask } : null,
      part ? { pos: mouse.partPos, size: part, mask: partMask } : null,
    )
    if (target === null) return
    const from = target === 'pen' && penHome ? penHome : mouse.partPos
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ target, grab: { x: point.x - from.x, y: point.y - from.y }, pos: from, from })
  }

  const onPreviewPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag === null) return
    const size = drag.target === 'pen' ? pen : part
    if (size === undefined) return
    const point = toCanvasPoint(e)
    const pos = clampPartPos({ x: point.x - drag.grab.x, y: point.y - drag.grab.y }, size, canvas)
    setDrag({ ...drag, pos })
  }

  const onPreviewPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (drag === null) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    const { target, pos: final, from } = drag
    setDrag(null)
    if (final.x === from.x && final.y === from.y) return
    void persist(target === 'pen' ? { ...mouse, penPos: final } : { ...mouse, partPos: final })
  }

  const onPreviewPointerCancel = () => setDrag(null)

  const onSave = () => {
    const next = applyWizard(mouse, wizard)
    if (next) void persist(next)
  }

  const onStartArea = () => dispatch({ type: 'startArea' })

  // (CR-033 결정 ①) 리셋은 위치류만 기본값으로 — penMode 저장값은 그대로 싣는다(images-tab.md §9.6)
  const onReset = () => void persist({ ...DEFAULT_MOUSE_SETTINGS, penMode: mouse.penMode })

  const mark = (p: Point | null, cls: string, label: string) =>
    p ? (
      <span
        className={`${styles.marker} ${cls}`}
        style={{ left: p.x * scale, top: p.y * scale }}
        role="img"
        aria-label={`${label} (${p.x}, ${p.y})`}
      />
    ) : null

  return (
    <section aria-label={t.tabMouse} className={styles.root}>
      <p className={styles.guide} role="status" aria-live="polite">
        {guideText(wizard, t)}
      </p>
      {/* CR-057: 이동 영역 설명 — 대기 상태에서만, 안내 줄과 같은 스타일 */}
      {wizard.step === 'idle' && <p className={styles.guide}>{t.areaDesc}</p>}

      <div
        className={
          wizard.step === 'idle' ? styles.preview : `${styles.preview} ${styles.previewPicking}`
        }
        style={{ width: canvas.width * scale, height: canvas.height * scale }}
        onClick={onPreviewClick}
        onPointerDown={onPreviewPointerDown}
        onPointerMove={onPreviewPointerMove}
        onPointerUp={onPreviewPointerUp}
        onPointerCancel={onPreviewPointerCancel}
        role="presentation"
        data-testid="mouse-preview"
      >
        {hairUrl && <img className={styles.layer} src={hairUrl} alt="" draggable={false} />}
        {part && (
          <img
            className={styles.part}
            src={part.url}
            alt=""
            draggable={false}
            style={{
              left: shownPartPos.x * scale,
              top: shownPartPos.y * scale,
              width: part.width * scale,
              height: part.height * scale,
            }}
          />
        )}
        {baseUrl ? (
          <img className={styles.layer} src={baseUrl} alt="" draggable={false} />
        ) : (
          <p className={styles.empty}>{t.previewNoBody}</p>
        )}
        {pen && shownPenPos && (
          <img
            className={styles.part}
            src={pen.url}
            alt=""
            draggable={false}
            style={{
              left: shownPenPos.x * scale,
              top: shownPenPos.y * scale,
              width: pen.width * scale,
              height: pen.height * scale,
            }}
          />
        )}
        <PartOutline pos={part ? shownPartPos : null} size={part} scale={scale} tone="arm" />
        <PartOutline pos={pen ? shownPenPos : null} size={pen} scale={scale} tone="pen" />
        <AreaOutline
          points={shownArea.points}
          closed={shownArea.closed}
          editing={shownArea.editing}
          scale={scale}
          width={canvas.width * scale}
          height={canvas.height * scale}
        />
        {mark(shownShoulder, styles.markerShoulder, t.markerShoulder)}
      </div>

      <div className={styles.actions}>
        {wizard.step === 'idle' && (
          <>
            <button
              type="button"
              ref={startRef}
              onClick={() => dispatch({ type: 'start' })}
              disabled={saving}
            >
              {t.wizardStart}
            </button>
            <button type="button" onClick={onStartArea} disabled={saving}>
              {t.areaStart}
            </button>
            <button type="button" onClick={onReset} disabled={saving}>
              {t.resetDefault}
            </button>
          </>
        )}
        {(wizard.step === 'pickShoulder' || wizard.step === 'pickArea') && (
          <button
            type="button"
            ref={cancelPickRef}
            onClick={() => dispatch({ type: 'cancel' })}
            disabled={saving}
          >
            {t.wizardCancel}
          </button>
        )}
        {(wizard.step === 'review' || wizard.step === 'reviewArea') && (
          <>
            <button type="button" ref={saveRef} onClick={onSave} disabled={saving}>
              {t.wizardSave}
            </button>
            <button type="button" onClick={() => dispatch({ type: 'cancel' })} disabled={saving}>
              {t.wizardCancel}
            </button>
          </>
        )}
      </div>

      <dl className={styles.values}>
        <dt>{t.markerShoulder}</dt>
        <dd>
          ({mouse.shoulder.x}, {mouse.shoulder.y})
        </dd>
        <dt>{t.markerPart}</dt>
        <dd>
          ({shownPartPos.x}, {shownPartPos.y})
        </dd>
        <dt>{t.markerArea}</dt>
        <dd>{areaText(valuesArea, t)}</dd>
        {pen && shownPenPos && (
          <>
            <dt>{t.markerPen}</dt>
            <dd>
              ({shownPenPos.x}, {shownPenPos.y})
            </dd>
          </>
        )}
      </dl>
    </section>
  )
}

export default MousePartsTab
