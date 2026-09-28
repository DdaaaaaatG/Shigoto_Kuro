/**
 * 레이어 1~3 (몸통 / 일반 상태 / 키보드 파츠) — 전부 캔버스 전체 크기 PNG 를 같은 자리에 겹친다.
 * 마우스 파츠(레이어 4)는 MouseArm 이 담당한다.
 * 키보드 파츠는 들림·누름 프레임에 더해 특수 키 전용 그림(CR-021, R-22)을 같은 요소로 그린다.
 * 펜 모드(prop penMode — CR-033, R-29)이면 키보드 파츠는 pickPenKeyboardEntry 가 고른다 — 특수 키를
 * 누르고 있으면 그 전용 그림, 아니면 kb_up(kb_down 프레임은 쓰지 않는다, CR-042). 손 그림 교체는
 * PenHand(pickPenEntry) 가 맡는다.
 */
import {
  isKbDownSlot,
  slotKey,
  type AssetEntry,
  type AssetManifest,
  type AssetSlot,
  type MouseSettings,
} from 'bridge'
import { currentSpecial, type MachineState, type SpecialKey } from 'state/inputMachine'
import styles from '../overlay.module.css'

interface Props {
  manifest: AssetManifest
  machine: MachineState
  /** 펜 모드 여부(CR-033) — OverlayApp이 isPenMode(manifest, settings.mouse)로 계산해 넘긴다 */
  penMode: boolean
}

export const findEntry = (manifest: AssetManifest, slot: AssetSlot): AssetEntry | undefined =>
  manifest.entries.find(e => slotKey(e.slot) === slotKey(slot))

/**
 * 파일명 키 문자열로 항목을 찾는다(CR-025) — 펜 슬롯(`pen_up`·`pen_down_{n}`·`pen_key_{special}`)의 TS
 * 표현은 bridge 결정이라(계약 미확정) `slotKey`가 돌려주는 문자열로만 찾는다.
 */
export const findByKey = (manifest: AssetManifest, key: string): AssetEntry | undefined =>
  manifest.entries.find(e => slotKey(e.slot) === key)

/** 등록된 키보드 누름 프레임 수 (최소 1 — 프레임 순환 계산용) */
export const kbDownFrameCount = (manifest: AssetManifest): number =>
  Math.max(1, manifest.entries.filter(e => isKbDownSlot(e.slot)).length)

/**
 * 펜 모드 판정(🔒, CR-033 개정) = `pen_up` 등록 **그리고** `mouse.penMode === true`(contract v0.15).
 * `pen_up`만 있고 토글이 꺼져 있으면(또는 mouse가 null·옛 설정처럼 필드가 없으면) 펜 모드가 아니다.
 */
export const isPenMode = (manifest: AssetManifest, mouse: MouseSettings | null): boolean =>
  findByKey(manifest, 'pen_up') !== undefined && mouse?.penMode === true

/** 특수 키 분류값 → 전용 이미지 슬롯(🔒 슬롯 이름, CR-021) */
export const SPECIAL_KEY_SLOT: Readonly<Record<SpecialKey, AssetSlot>> = {
  space: 'key_space',
  z: 'key_z',
  question: 'key_question',
  exclamation: 'key_exclamation',
  enter: 'key_enter',
  backspace: 'key_backspace',
  undo: 'key_undo',
}

/**
 * 키보드 파츠 그림 선택(design.md §10.6·§10.13, design/functions.md §5.3) — 들림 / 가장 최근 눌린 특수 키의
 * 전용 그림(등록돼 있으면) / 누름 프레임(`kb_down[kbFrame] ?? kb_down[0]`) / `kb_down`이 하나도 없으면
 * `kb_up`(CR-043, R-32 — `kb_down_0` 선택 강등에 따른 폴백. `kb_up`도 없으면 `undefined`) 순.
 */
export const pickKeyboardEntry = (manifest: AssetManifest, machine: MachineState): AssetEntry | undefined => {
  if (!machine.kbDown) return findEntry(manifest, 'kb_up')

  const special = currentSpecial(machine)
  const specialEntry = special !== null ? findEntry(manifest, SPECIAL_KEY_SLOT[special]) : undefined
  if (specialEntry) return specialEntry

  return (
    findEntry(manifest, { kind: 'kb_down', index: machine.kbFrame }) ??
    findEntry(manifest, { kind: 'kb_down', index: 0 }) ??
    findEntry(manifest, 'kb_up')
  )
}

/**
 * 펜 모드 키보드 파츠 그림 선택(CR-042, design.md §10.12, design/functions.md §5.5 CR-042 개정) — 들림
 * 또는 특수 키 없음 → kb_up / 가장 최근 눌린 특수 키의 전용 그림(등록돼 있으면) → 없으면 kb_up.
 * `kb_down` 프레임은 펜 모드에서 절대 쓰지 않는다(손 그림 순환은 PenHand.pickPenEntry 가 pen_down_0 하나로 맡는다).
 */
export const pickPenKeyboardEntry = (manifest: AssetManifest, machine: MachineState): AssetEntry | undefined => {
  if (!machine.kbDown) return findEntry(manifest, 'kb_up')

  const special = currentSpecial(machine)
  const specialEntry = special !== null ? findEntry(manifest, SPECIAL_KEY_SLOT[special]) : undefined
  return specialEntry ?? findEntry(manifest, 'kb_up')
}

const Layer = ({ entry }: { entry?: AssetEntry }) => {
  if (!entry) return null
  return <img className={styles.layer} src={entry.url} alt="" draggable={false} />
}

const LayerStack = ({ manifest, machine, penMode }: Props) => {
  const body = findEntry(manifest, 'body')
  const state = findEntry(manifest, machine.layer)
  // 펜 모드(prop, CR-033)면 키보드 레이어는 pickPenKeyboardEntry(특수 키 그림 또는 kb_up, CR-042) —
  // 손 그림 순환·특수 키 전용 손 그림 교체는 PenHand(pickPenEntry)가 맡는다. isPenMode는 여기서 부르지
  // 않는다(판정은 OverlayApp이 한 번만 한다 — design.md §10.10)
  const kb = penMode ? pickPenKeyboardEntry(manifest, machine) : pickKeyboardEntry(manifest, machine)

  return (
    <>
      <Layer entry={body} />
      <Layer entry={state} />
      <Layer entry={kb} />
    </>
  )
}

export default LayerStack
