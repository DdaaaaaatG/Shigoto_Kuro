/**
 * CR-015로 mapToPad·armControlPoint·armPath·restPosition은 삭제됐다(손바닥 모드·팔 곡선 폐기).
 * CR-017로 armRotationDeg·mapAroundPivot도 삭제됐다(회전만 → 회전+늘어나기, 패드 → 자유 사각형 영역).
 * 새 함수(pickMonitor·cursorUv·bilerpQuad·armTransform·armTransformCss·resolvePivot)의 동작 검증은
 * src/overlay/test/mouseMapping.test.ts(TC-113~TC-120)·MouseArm.test.tsx가 겸한다(scenarios.md §0.2).
 */
import { describe, expect, it } from 'vitest'
import * as mapping from './mouseMapping'

describe('삭제 확인 (CR-015 · CR-017)', () => {
  it('손바닥 모드·팔 곡선·구 회전 전용 함수는 export되지 않는다', () => {
    for (const name of [
      'mapToPad',
      'armControlPoint',
      'armPath',
      'restPosition',
      'armRotationDeg',
      'mapAroundPivot',
    ]) {
      expect(name in mapping).toBe(false)
    }
  })
})
