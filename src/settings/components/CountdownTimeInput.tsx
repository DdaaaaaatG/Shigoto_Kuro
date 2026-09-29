/**
 * 시작 시간 입력 — design/timer-tab.md §14.4·§14.6·§14.7.2·§14.8·§14.11(CR-050). 시·분·초 세 칸을 한
 * 묶음으로 보여주고, 묶음 밖으로 포커스가 나가거나 Enter를 누르면 검증 후 1회 저장을 요청한다. 저장
 * 자체와 잠금 판정(모드·상태)은 TimerTab이 갖고 있다 — 여기는 입력·표시·저장 요청만 한다.
 * CR-052: 타이머 모드가 아닐 때(스톱워치·둘 다 꺼짐 = inactive)도 흐르는 중 잠김(locked)과 같은 회색
 * 비활성 표시(라벨·칸 모두, disabled + aria-disabled). inactive 는 안내 줄을 비운다(locked 만 안내).
 */
import { useEffect, useState, type ChangeEvent, type FocusEvent, type KeyboardEvent } from 'react'
import { useMessages } from '../i18n/MessagesContext'
import type { Messages } from '../i18n/types'
import { pad2, parseHmsDraft, splitHms, type HmsDraft } from '../timerValues'
import styles from './TimerTab.module.css'

/** 안내 줄 문구 — 잠김 안내가 무효 안내보다 우선, 둘 다 아니면 비운다 */
const durationMsg = (locked: boolean, showInvalid: boolean, t: Messages): string => {
  if (locked) return t.timerDurationLocked
  if (showInvalid) return t.timerDurationInvalid
  return ''
}

export type CountdownTimeInputProps = {
  secs: number
  locked: boolean
  /** 타이머(카운트다운) 모드가 켜져 있지 않음 — CR-052. 생략 시 false */
  inactive?: boolean
  onCommit: (secs: number) => Promise<boolean>
}

type FieldKey = keyof HmsDraft

export const CountdownTimeInput = ({
  secs,
  locked,
  inactive = false,
  onCommit,
}: CountdownTimeInputProps) => {
  const t = useMessages()
  const off = locked || inactive
  const [draft, setDraft] = useState<HmsDraft | null>(null)
  const [invalid, setInvalid] = useState(false)
  const [saving, setSaving] = useState(false)

  const sp = splitHms(secs)
  const shownHms: HmsDraft = draft ?? { h: pad2(sp.h), m: pad2(sp.m), s: pad2(sp.s) }

  // 저장값 동기 효과 — props.secs 가 바뀌면(자기 저장 성공 또는 다른 경로의 settings://changed) 입력
  // 중이던 값을 버리고 새 저장값을 보인다
  useEffect(() => {
    setDraft(null)
  }, [secs])

  // 잠금 정리 효과 — 흐르기 시작하거나 타이머 모드를 벗어나면 입력 중이던 값·되돌림 안내를 버린다
  useEffect(() => {
    if (off) {
      setDraft(null)
      setInvalid(false)
    }
  }, [off])

  const commit = async () => {
    // 첫 줄 가드 — 포커스가 있던 칸이 disabled 가 되는 순간 WebView2 가 blur 를 쏠 수 있어 이 함수가
    // 잠금 뒤에 불릴 수 있다(§14.7.2). off 는 항상 최신 prop 값을 읽는다(클로저가 렌더마다 갱신)
    if (off) return
    if (saving) return
    if (draft === null) return
    const parsed = parseHmsDraft(draft)
    if (parsed === null) {
      setDraft(null)
      setInvalid(true)
      return
    }
    if (parsed === secs) {
      setDraft(null)
      return
    }
    setInvalid(false)
    setSaving(true)
    // 저장 중에는 draft 를 그대로 둬 입력한 값이 계속 보인다(옛 저장값으로 튀지 않음)
    const ok = await onCommit(parsed)
    setSaving(false)
    if (!ok) setDraft(null)
  }

  const onFieldChange = (key: FieldKey) => (e: ChangeEvent<HTMLInputElement>) => {
    setDraft({ ...shownHms, [key]: e.currentTarget.value })
    setInvalid(false)
  }

  const onFieldKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    void commit()
  }

  // 칸 사이 Tab 이동(relatedTarget 이 묶음 안)은 저장하지 않는다 — 묶음을 완전히 벗어날 때만 1회 저장
  const onGroupBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
    void commit()
  }

  const field = (key: FieldKey, label: string) => (
    <input
      type="text"
      inputMode="numeric"
      maxLength={2}
      autoComplete="off"
      aria-label={label}
      value={shownHms[key]}
      disabled={off}
      aria-disabled={off || undefined}
      aria-invalid={invalid || undefined}
      onChange={onFieldChange(key)}
      onKeyDown={onFieldKeyDown}
      className={styles.hmsField}
    />
  )

  return (
    <>
      <div className={off ? `${styles.durationRow} ${styles.durationOff}` : styles.durationRow}>
        <span id="timer-duration-label" className={styles.durationLabel}>
          {t.timerDuration}
        </span>
        <div
          role="group"
          aria-disabled={off || undefined}
          aria-labelledby="timer-duration-label"
          aria-describedby="timer-duration-msg"
          className={styles.hms}
          onBlur={onGroupBlur}
        >
          {field('h', t.timerHoursAria)}
          <span className={styles.hmsSep} aria-hidden="true">
            :
          </span>
          {field('m', t.timerMinutesAria)}
          <span className={styles.hmsSep} aria-hidden="true">
            :
          </span>
          {field('s', t.timerSecondsAria)}
        </div>
        <span className={styles.hint}>{t.timerDurationHint}</span>
      </div>
      <p
        id="timer-duration-msg"
        aria-live="polite"
        className={
          invalid && !off
            ? `${styles.msg} ${styles.durationMsg} ${styles.msgError}`
            : `${styles.msg} ${styles.durationMsg}`
        }
      >
        {durationMsg(locked, invalid && !off, t)}
      </p>
    </>
  )
}

export default CountdownTimeInput
