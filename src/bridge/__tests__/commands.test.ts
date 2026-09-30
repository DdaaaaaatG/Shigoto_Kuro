import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }))
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: vi.fn() }))

import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { open } from '@tauri-apps/plugin-dialog'
import {
  getSettings,
  setOverlayPosition,
  importAsset,
  getHandAnchor,
  getMonitors,
  exportDefaultAssets,
  getTimer,
  controlTimer,
  setResting,
  getAlarmSound,
  importAlarmSound,
  removeAlarmSound,
  pickAudioFile,
  pickFolder,
  pickPngFile,
  applyPreset,
  deletePreset,
  exportPreset,
  importPreset,
  listPresets,
  renamePreset,
  resetAppData,
  savePreset,
  resetOverlayPosition,
  restoreDefaultAsset,
  setSettingsWindowTitle,
  toBridgeError,
} from '../commands'
import { DEFAULT_SETTINGS } from '../types'

const mockedInvoke = vi.mocked(invoke)
const mockedOpen = vi.mocked(open)
const mockedGetCurrentWindow = vi.mocked(getCurrentWindow)

describe('bridge/commands', () => {
  beforeEach(() => {
    mockedInvoke.mockReset()
  })

  it('getSettings 는 get_settings 명령을 인자 없이 호출한다', async () => {
    mockedInvoke.mockResolvedValueOnce(DEFAULT_SETTINGS)
    const result = await getSettings()
    expect(mockedInvoke).toHaveBeenCalledWith('get_settings', undefined)
    expect(result).toEqual(DEFAULT_SETTINGS)
  })

  it('setOverlayPosition 은 x,y 를 camelCase 인자로 넘긴다', async () => {
    mockedInvoke.mockResolvedValueOnce(undefined)
    await setOverlayPosition(10, 20)
    expect(mockedInvoke).toHaveBeenCalledWith('set_overlay_position', { x: 10, y: 20 })
  })

  it('importAsset 은 kb_down 객체 슬롯을 그대로 넘긴다', async () => {
    mockedInvoke.mockResolvedValueOnce({ canvas: null, entries: [] })
    await importAsset({ kind: 'kb_down', index: 1 }, 'C:/a.png')
    expect(mockedInvoke).toHaveBeenCalledWith('import_asset', {
      slot: { kind: 'kb_down', index: 1 },
      path: 'C:/a.png',
    })
  })

  it('실패는 BridgeError 로 정규화된다', async () => {
    mockedInvoke.mockRejectedValueOnce({ code: 'asset.too_large', message: '1MB 초과' })
    await expect(getSettings()).rejects.toEqual({ code: 'asset.too_large', message: '1MB 초과' })

    mockedInvoke.mockRejectedValueOnce('plain string error')
    await expect(getSettings()).rejects.toEqual({ code: 'unknown', message: 'plain string error' })
  })

  it('toBridgeError 는 Error·문자열·기타를 모두 BridgeError 로 바꾼다', () => {
    expect(toBridgeError(new Error('boom'))).toEqual({ code: 'unknown', message: 'boom' })
    expect(toBridgeError(42).code).toBe('unknown')
  })

  it('getHandAnchor 는 get_hand_anchor 명령을 인자 없이 호출하고 null 을 그대로 돌려준다', async () => {
    mockedInvoke.mockResolvedValueOnce(null)
    const result = await getHandAnchor()
    expect(mockedInvoke).toHaveBeenCalledWith('get_hand_anchor', undefined)
    expect(result).toBeNull()
  })

  it('getHandAnchor 는 Point 값을 그대로 돌려준다', async () => {
    mockedInvoke.mockResolvedValueOnce({ x: 262.5, y: 1.5 })
    const result = await getHandAnchor()
    expect(result).toEqual({ x: 262.5, y: 1.5 })
  })

  it('getMonitors 는 get_monitors 명령을 인자 없이 호출하고 모니터 배열을 그대로 돌려준다', async () => {
    const monitors = [
      { x: 0, y: 0, width: 2560, height: 1440 },
      { x: 320, y: 1440, width: 1920, height: 1080 },
    ]
    mockedInvoke.mockResolvedValueOnce(monitors)
    const result = await getMonitors()
    expect(mockedInvoke).toHaveBeenCalledWith('get_monitors', undefined)
    expect(result).toEqual(monitors)
  })

  it('importAsset 은 특수 키 슬롯(key_undo)을 그대로 넘긴다(v0.11, CR-021)', async () => {
    mockedInvoke.mockResolvedValueOnce({ canvas: null, entries: [] })
    await importAsset('key_undo', 'C:/undo.png')
    expect(mockedInvoke).toHaveBeenCalledWith('import_asset', {
      slot: 'key_undo',
      path: 'C:/undo.png',
    })
  })

  it('getMonitors 실패(모니터 없음)는 BridgeError 로 정규화된다', async () => {
    mockedInvoke.mockRejectedValueOnce({
      code: 'window.no_monitor',
      message: '모니터 정보를 읽을 수 없습니다.',
    })
    await expect(getMonitors()).rejects.toEqual({
      code: 'window.no_monitor',
      message: '모니터 정보를 읽을 수 없습니다.',
    })
  })

  it('resetOverlayPosition 은 reset_overlay_position 명령을 인자 없이 호출한다(v0.14, SV2-06)', async () => {
    mockedInvoke.mockResolvedValueOnce({ x: 100, y: 100 })
    const result = await resetOverlayPosition()
    expect(mockedInvoke).toHaveBeenCalledWith('reset_overlay_position', undefined)
    expect(result).toEqual({ x: 100, y: 100 })
  })

  it('restoreDefaultAsset 은 restore_default_asset 명령에 slot 을 넘긴다(v0.16, DA-03)', async () => {
    mockedInvoke.mockResolvedValueOnce({ canvas: null, entries: [] })
    await restoreDefaultAsset('mouse_base')
    expect(mockedInvoke).toHaveBeenCalledWith('restore_default_asset', { slot: 'mouse_base' })
  })

  it('exportDefaultAssets 은 export_default_assets 명령에 dir·overwrite 를 넘긴다(v0.16, DA-05)', async () => {
    const report = { written: ['kb_up.png'], conflicts: [], failed: [] }
    mockedInvoke.mockResolvedValueOnce(report)
    const result = await exportDefaultAssets('C:\\x', true)
    expect(mockedInvoke).toHaveBeenCalledWith('export_default_assets', {
      dir: 'C:\\x',
      overwrite: true,
    })
    expect(result).toEqual(report)
  })

  it('exportDefaultAssets 실패는 BridgeError 형태 그대로 reject 된다', async () => {
    mockedInvoke.mockRejectedValueOnce({ code: 'asset.export_dir', message: '저장할 폴더를 찾을 수 없습니다.' })
    await expect(exportDefaultAssets('rel', false)).rejects.toEqual({
      code: 'asset.export_dir',
      message: '저장할 폴더를 찾을 수 없습니다.',
    })
  })
})

describe('bridge/commands — 뽀모도 타이머(v0.21, CR-045)', () => {
  beforeEach(() => {
    mockedInvoke.mockReset()
  })

  it('getTimer 는 get_timer 명령을 인자 없이 호출한다', async () => {
    const snapshot = { status: 'stopped', elapsedMs: 0 }
    mockedInvoke.mockResolvedValueOnce(snapshot)
    const result = await getTimer()
    expect(mockedInvoke).toHaveBeenCalledWith('get_timer', undefined)
    expect(result).toEqual(snapshot)
  })

  it('controlTimer 는 control_timer 명령에 action 을 넘긴다', async () => {
    const snapshot = { status: 'running', elapsedMs: 0 }
    mockedInvoke.mockResolvedValueOnce(snapshot)
    const result = await controlTimer('start')
    expect(mockedInvoke).toHaveBeenCalledWith('control_timer', { action: 'start' })
    expect(result).toEqual(snapshot)
  })

  it('controlTimer 실패(꺼짐)는 BridgeError 형태 그대로 reject 된다', async () => {
    mockedInvoke.mockRejectedValueOnce({
      code: 'timer.disabled',
      message: '타이머가 꺼져 있습니다. 먼저 「타이머 사용」을 켜 주세요.',
    })
    await expect(controlTimer('start')).rejects.toEqual({
      code: 'timer.disabled',
      message: '타이머가 꺼져 있습니다. 먼저 「타이머 사용」을 켜 주세요.',
    })
  })

  it('setResting 은 set_resting 명령에 resting 을 넘긴다', async () => {
    const snapshot = { status: 'restPaused', elapsedMs: 2000 }
    mockedInvoke.mockResolvedValueOnce(snapshot)
    const result = await setResting(true)
    expect(mockedInvoke).toHaveBeenCalledWith('set_resting', { resting: true })
    expect(result).toEqual(snapshot)
  })
})

describe('bridge/commands — 알림음(v0.23, CR-048)', () => {
  beforeEach(() => {
    mockedInvoke.mockReset()
  })

  it('getAlarmSound 는 get_alarm_sound 명령을 인자 없이 호출한다', async () => {
    const sound = { format: 'mp3', bytes: 312004, url: 'http://asset.localhost/x?v=1' }
    mockedInvoke.mockResolvedValueOnce(sound)
    const result = await getAlarmSound()
    expect(mockedInvoke).toHaveBeenCalledWith('get_alarm_sound', undefined)
    expect(result).toEqual(sound)
  })

  it('getAlarmSound 는 미등록이면 null 을 그대로 돌려준다', async () => {
    mockedInvoke.mockResolvedValueOnce(null)
    const result = await getAlarmSound()
    expect(result).toBeNull()
  })

  it('importAlarmSound 는 import_alarm_sound 명령에 path 를 넘긴다', async () => {
    const sound = { format: 'wav', bytes: 4000, url: 'http://asset.localhost/x?v=2' }
    mockedInvoke.mockResolvedValueOnce(sound)
    const result = await importAlarmSound('C:/a.wav')
    expect(mockedInvoke).toHaveBeenCalledWith('import_alarm_sound', { path: 'C:/a.wav' })
    expect(result).toEqual(sound)
  })

  it('importAlarmSound 실패(크기 초과)는 BridgeError 형태 그대로 reject 된다', async () => {
    mockedInvoke.mockRejectedValueOnce({
      code: 'sound.too_many_bytes',
      message: '알림음 파일은 1MB 이하여야 합니다. (현재 2000000바이트)',
    })
    await expect(importAlarmSound('C:/big.wav')).rejects.toEqual({
      code: 'sound.too_many_bytes',
      message: '알림음 파일은 1MB 이하여야 합니다. (현재 2000000바이트)',
    })
  })

  it('removeAlarmSound 는 remove_alarm_sound 명령을 인자 없이 호출한다', async () => {
    mockedInvoke.mockResolvedValueOnce(undefined)
    await removeAlarmSound()
    expect(mockedInvoke).toHaveBeenCalledWith('remove_alarm_sound', undefined)
  })
})

describe('bridge/commands — resetAppData(v0.25, data-reset)', () => {
  beforeEach(() => {
    mockedInvoke.mockReset()
  })

  it('reset_app_data 명령을 인자 없이 1회 호출하고 undefined 로 resolve 된다', async () => {
    mockedInvoke.mockResolvedValueOnce(undefined)
    const result = await resetAppData()
    expect(mockedInvoke).toHaveBeenCalledTimes(1)
    expect(mockedInvoke).toHaveBeenCalledWith('reset_app_data', undefined)
    expect(result).toBeUndefined()
  })

  it('실패(reset.io)는 BridgeError 형태 그대로 reject 된다', async () => {
    mockedInvoke.mockRejectedValueOnce({
      code: 'reset.io',
      message: '앱 데이터를 초기화하지 못했습니다. 다음에 앱을 시작할 때 다시 시도합니다.',
    })
    await expect(resetAppData()).rejects.toEqual({
      code: 'reset.io',
      message: '앱 데이터를 초기화하지 못했습니다. 다음에 앱을 시작할 때 다시 시도합니다.',
    })
  })
})

describe('bridge/commands — pickAudioFile(v0.23, CR-048 · TM-08)', () => {
  beforeEach(() => {
    mockedOpen.mockReset()
  })

  it('title 을 지정하면 그대로 넘기고 오디오 필터를 쓴다', async () => {
    mockedOpen.mockResolvedValueOnce('C:/alarm.wav')
    const result = await pickAudioFile('t')
    expect(mockedOpen).toHaveBeenCalledWith({
      multiple: false,
      directory: false,
      title: 't',
      filters: [{ name: 'Audio', extensions: ['wav', 'mp3', 'ogg'] }],
    })
    expect(result).toBe('C:/alarm.wav')
  })

  it('title 을 생략하면 기본 제목을 쓴다', async () => {
    mockedOpen.mockResolvedValueOnce(null)
    const result = await pickAudioFile()
    expect(mockedOpen).toHaveBeenCalledWith(
      expect.objectContaining({ title: '소리 파일 선택' }),
    )
    expect(result).toBeNull()
  })

  it('취소는 null', async () => {
    mockedOpen.mockResolvedValueOnce(null)
    expect(await pickAudioFile('t')).toBeNull()
  })

  it('배열 반환이면 첫 요소를 돌려준다', async () => {
    mockedOpen.mockResolvedValueOnce(['C:/first.mp3', 'C:/second.mp3'])
    expect(await pickAudioFile('t')).toBe('C:/first.mp3')
  })

  it('reject 는 BridgeError 로 정규화된다', async () => {
    mockedOpen.mockRejectedValueOnce(new Error('boom'))
    await expect(pickAudioFile('t')).rejects.toEqual({ code: 'unknown', message: 'boom' })
  })
})

describe('bridge/commands — pickFolder(v0.16, DA-05)', () => {
  beforeEach(() => {
    mockedOpen.mockReset()
  })

  it('title 을 지정하면 그대로 넘긴다', async () => {
    mockedOpen.mockResolvedValueOnce('C:/out')
    const result = await pickFolder('t')
    expect(mockedOpen).toHaveBeenCalledWith({ directory: true, multiple: false, title: 't' })
    expect(result).toBe('C:/out')
  })

  it('title 을 생략하면 기본 제목을 쓴다', async () => {
    mockedOpen.mockResolvedValueOnce(null)
    const result = await pickFolder()
    expect(mockedOpen).toHaveBeenCalledWith(
      expect.objectContaining({ directory: true, title: '폴더 선택' }),
    )
    expect(result).toBeNull()
  })

  it('취소는 null', async () => {
    mockedOpen.mockResolvedValueOnce(null)
    expect(await pickFolder('t')).toBeNull()
  })

  it('배열 반환이면 첫 요소를 돌려준다', async () => {
    mockedOpen.mockResolvedValueOnce(['C:/first', 'C:/second'])
    expect(await pickFolder('t')).toBe('C:/first')
  })

  it('reject 는 BridgeError 로 정규화된다', async () => {
    mockedOpen.mockRejectedValueOnce(new Error('boom'))
    await expect(pickFolder('t')).rejects.toEqual({ code: 'unknown', message: 'boom' })
  })
})

describe('bridge/commands — pickPngFile(v0.14, SV2-07)', () => {
  beforeEach(() => {
    mockedOpen.mockReset()
  })

  it('title 을 생략하면 기존 기본 제목을 쓴다', async () => {
    mockedOpen.mockResolvedValueOnce(null)
    const result = await pickPngFile()
    expect(mockedOpen).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'PNG 이미지 선택' }),
    )
    expect(result).toBeNull()
  })

  it('title 을 지정하면 그대로 넘긴다', async () => {
    mockedOpen.mockResolvedValueOnce('C:/a.png')
    const result = await pickPngFile('제목')
    expect(mockedOpen).toHaveBeenCalledWith(expect.objectContaining({ title: '제목' }))
    expect(result).toBe('C:/a.png')
  })

  it('reject 는 BridgeError 로 정규화된다', async () => {
    mockedOpen.mockRejectedValueOnce(new Error('boom'))
    await expect(pickPngFile()).rejects.toEqual({ code: 'unknown', message: 'boom' })
  })
})

describe('bridge/commands — setSettingsWindowTitle(v0.14, D-6)', () => {
  it('setTitle 을 1회 호출한다', async () => {
    const setTitle = vi.fn().mockResolvedValue(undefined)
    mockedGetCurrentWindow.mockReturnValue({ setTitle } as unknown as ReturnType<
      typeof getCurrentWindow
    >)
    await setSettingsWindowTitle('설정')
    expect(setTitle).toHaveBeenCalledWith('설정')
  })

  it('reject 는 BridgeError 로 정규화된다', async () => {
    const setTitle = vi.fn().mockRejectedValue('권한 없음')
    mockedGetCurrentWindow.mockReturnValue({ setTitle } as unknown as ReturnType<
      typeof getCurrentWindow
    >)
    await expect(setSettingsWindowTitle('오버레이')).rejects.toEqual({
      code: 'unknown',
      message: '권한 없음',
    })
  })
})

// contract.md §5.11 「테스트」 — 래퍼 7개는 정확한 command 이름·인자 객체로 invoke를 1회 부른다.
describe('bridge/commands — 프리셋(v0.30)', () => {
  beforeEach(() => {
    mockedInvoke.mockReset()
  })

  const summary = { id: '1790000000000', name: 'A', savedAt: 1, imageCount: 2, hasAlarm: false }

  it.each([
    ['listPresets', () => listPresets(), 'list_presets', undefined, []],
    ['savePreset', () => savePreset('A'), 'save_preset', { name: 'A' }, summary],
    ['applyPreset', () => applyPreset('p1'), 'apply_preset', { id: 'p1' }, null],
    [
      'exportPreset',
      () => exportPreset('p1', 'D:/out'),
      'export_preset',
      { id: 'p1', dir: 'D:/out' },
      { folderName: 'A' },
    ],
    [
      'importPreset',
      () => importPreset('D:/in'),
      'import_preset',
      { dir: 'D:/in' },
      { preset: null, problems: [{ fileName: 'kb_up.png', code: 'asset.not_rgba' }] },
    ],
    [
      'renamePreset',
      () => renamePreset('p1', 'B'),
      'rename_preset',
      { id: 'p1', name: 'B' },
      summary,
    ],
    ['deletePreset', () => deletePreset('p1'), 'delete_preset', { id: 'p1' }, null],
  ])(
    '%s 는 %s 를 인자 객체로 1회 호출하고 반환을 그대로 resolve 한다',
    async (_n, run, cmd, args, ret) => {
      mockedInvoke.mockResolvedValueOnce(ret)
      const result = await run()
      expect(mockedInvoke).toHaveBeenCalledTimes(1)
      expect(mockedInvoke).toHaveBeenCalledWith(cmd, args)
      expect(result).toEqual(ret)
    },
  )

  it('실패(preset.export_exists)는 BridgeError 형태 그대로 reject 된다', async () => {
    const err = { code: 'preset.export_exists', message: '같은 이름의 폴더가 이미 있습니다.' }
    mockedInvoke.mockRejectedValueOnce(err)
    await expect(exportPreset('p1', 'D:/out')).rejects.toEqual(err)
  })

  it('실패(preset.forbidden)도 그대로 reject 된다', async () => {
    const err = { code: 'preset.forbidden', message: '프리셋은 설정 창에서만 바꿀 수 있습니다.' }
    mockedInvoke.mockRejectedValueOnce(err)
    await expect(applyPreset('p1')).rejects.toEqual(err)
  })
})
