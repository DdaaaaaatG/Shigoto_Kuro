/**
 * 「타이머」 탭 미리보기 — design/timer-tab.md §2·§4·§5.3·§6·§9(CR-045) + §14.4·§14.7.4(CR-050). 오버레이와
 * 같은 합성 순서(배경 → 뽀모도 인물 → 말풍선 → 시간 글자 → kb_up)로 겹쳐 보여주고, 글자를 끌어 자리를
 * 옮길 수 있다. 살아 있는 시간의 구독(useTimerSnapshot)은 TimerTab이 1회 갖고 snapshot·receivedAt을
 * props로 내려준다(CR-050 — 구독 1개 유지) — 이 컴포넌트는 받은 값을 표시만 한다. 끝남(finished) 동안은
 * CSS 애니메이션(.blink)으로만 깜빡인다(JS 타이머 없음).
 */
import { useRef, useState, type PointerEvent } from 'react'
import type { AssetManifest, Point, TimerSettings, TimerSnapshot } from 'bridge'
import { useElapsedText } from 'components/hooks/useElapsedText'
import { isTimerBlinking, timerTextStyle } from 'components/utils/timerClock'
import { useMessages } from '../i18n/MessagesContext'
import { findEntry } from '../imageSlots'
import { fitScale, previewToCanvas } from '../mouseWizard'
import { TIMER_PREVIEW_BOX, clampTextPos } from '../timerValues'
import styles from './TimerTab.module.css'

export type TimerPreviewProps = {
  manifest: AssetManifest
  timer: TimerSettings
  snapshot: TimerSnapshot
  receivedAt: number
  onCommitPos: (pos: Point) => Promise<void>
}

type DragState = { grab: Point; pos: Point; from: Point }

/** 캔버스가 아직 없을 때(첫 실행 전) 미리보기가 쓰는 기본 상자(design/timer-tab.md §6) */
const DEFAULT_CANVAS = { width: 900, height: 700 }

export const TimerPreview = ({ manifest, timer, snapshot, receivedAt, onCommitPos }: TimerPreviewProps) => {
  const t = useMessages()
  const elapsedText = useElapsedText(snapshot, receivedAt)
  const blinking = isTimerBlinking(snapshot)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [pendingPos, setPendingPos] = useState<Point | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)

  const canvas = manifest.canvas ?? DEFAULT_CANVAS
  const scale = fitScale(canvas, TIMER_PREVIEW_BOX)
  const shownPos = drag?.pos ?? pendingPos ?? timer.textPos

  const toCanvasPoint = (e: PointerEvent<HTMLDivElement>): Point => {
    const stage = stageRef.current
    if (!stage) return timer.textPos
    const rect = stage.getBoundingClientRect()
    return previewToCanvas({ x: e.clientX - rect.left, y: e.clientY - rect.top }, scale, canvas)
  }

  const onTextPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || pendingPos !== null) return
    const point = toCanvasPoint(e)
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
    setDrag({ grab: { x: point.x - shownPos.x, y: point.y - shownPos.y }, pos: shownPos, from: shownPos })
  }

  const onTextPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag === null) return
    const point = toCanvasPoint(e)
    const pos = clampTextPos({ x: point.x - drag.grab.x, y: point.y - drag.grab.y }, canvas)
    setDrag({ ...drag, pos })
  }

  const onTextPointerUp = async () => {
    if (drag === null) return
    const { pos, from } = drag
    setDrag(null)
    if (pos.x === from.x && pos.y === from.y) return
    setPendingPos(pos)
    await onCommitPos(pos)
    setPendingPos(null)
  }

  const onTextPointerCancel = () => setDrag(null)

  const bg = findEntry(manifest, 'background')?.url
  const char = findEntry(manifest, 'pomo_char')?.url
  const bubble = findEntry(manifest, 'pomo_bubble')?.url
  const kbUp = findEntry(manifest, 'kb_up')?.url

  return (
    <div
      ref={stageRef}
      role="group"
      aria-label={t.timerPreviewAria}
      className={styles.stage}
      style={{ width: canvas.width * scale, height: canvas.height * scale }}
    >
      <div
        className={styles.canvas}
        style={{ width: canvas.width, height: canvas.height, transform: `scale(${scale})` }}
      >
        {bg && <img className={styles.layer} src={bg} alt="" draggable={false} />}
        {char && <img className={styles.layer} src={char} alt="" draggable={false} />}
        {bubble && <img className={styles.layer} src={bubble} alt="" draggable={false} />}
        <div
          data-testid="timer-text"
          role="img"
          aria-label={t.timerTextDragAria}
          className={blinking ? styles.blink : undefined}
          style={{
            ...timerTextStyle({ ...timer, textPos: shownPos }),
            pointerEvents: 'auto',
            cursor: drag ? 'grabbing' : 'grab',
            touchAction: 'none',
          }}
          onPointerDown={onTextPointerDown}
          onPointerMove={onTextPointerMove}
          onPointerUp={() => void onTextPointerUp()}
          onPointerCancel={onTextPointerCancel}
        >
          {elapsedText}
        </div>
        {kbUp && <img className={styles.layer} src={kbUp} alt="" draggable={false} />}
      </div>
      {manifest.canvas === null && <p className={styles.empty}>{t.previewNoBody}</p>}
    </div>
  )
}

export default TimerPreview
