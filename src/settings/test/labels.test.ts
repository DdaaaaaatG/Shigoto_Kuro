/**
 * settings 확정 문구 이관 스펙 — CR-028 개정(옛 `labels.ts` 단일 소스 → `i18n/ko.ts`).
 * 기준: src/settings/design/i18n.md §4.1·§4.5·§5 · design.md §8(이관 안내) · scenarios.md TC-009 · TC-092(CR-028 개정).
 * `src/settings/labels.ts` 는 삭제된다(design.md §3 문구 출처 문단). 이 파일은 옛 30키가 ko 사전으로
 * 빠짐없이 옮겨졌는지(26키 유지·4키 삭제)와 CR-005·CR-026 규칙이 유지되는지만 본다. 새 문구·ja·en 은 i18n.test.ts.
 */
import { describe, expect, it } from 'vitest'
import { ko } from '../i18n/ko'

/** 옛 labels.ts 에서 ko 사전으로 이관되는 26키(i18n.md §4.1 4키 + §4.5 22키) */
const MIGRATED = {
  tabsAria: '설정 탭',
  tabImages: '이미지 설정', // CR-028 문구 변경(옛 「이미지」)
  tabMouse: '어깨축·손 위치', // CR-028 문구 변경(옛 「마우스 파츠」)
  errorPrefix: '오류:',
  previewNoBody: '캐릭터 이미지(kb_up)가 등록되지 않았습니다.',
  wizardIdle: '어깨축을 설정하면 팔 파츠가 그 점을 축으로 회전합니다.',
  wizardStart: '어깨축 설정하기',
  wizardPickShoulder: '축이 될 부분을 마우스로 클릭해주세요.',
  wizardReview: '축 위치를 확인하고 저장하세요.',
  wizardSave: '저장',
  wizardCancel: '취소',
  resetDefault: '기본값으로 리셋',
  markerShoulder: '축(어깨)',
  markerPart: '파츠 위치',
  markerPen: '손 위치',
  // CR-057(🔒 사용자 확정 문구): areaStart·areaPick1~4·areaReview 교체 — 옛 「이동 영역 설정하기」·「n/4 이동 영역의 …」·「이동 영역을 확인하고 저장하세요.」
  areaStart: '사각형 이동 영역 설정',
  areaPick1: '1/4 사각형의 왼쪽 위 꼭짓점을 클릭해주세요.',
  areaPick2: '2/4 이제 오른쪽 위 꼭짓점을 클릭해주세요.',
  areaPick3: '3/4 이제 오른쪽 아래 꼭짓점을 클릭해주세요.',
  areaPick4: '4/4 마지막으로 왼쪽 아래 꼭짓점을 클릭해주세요.',
  areaReview: '사각형이 맞는지 확인하고 저장하세요.',
  markerArea: '이동 영역', // CR-057 불변
  areaCorner1: '왼쪽 위',
  areaCorner2: '오른쪽 위',
  areaCorner3: '오른쪽 아래',
  areaCorner4: '왼쪽 아래',
}

const dict = ko as unknown as Record<string, unknown>

describe('ko 사전 — 옛 labels.ts 이관 (i18n.md §4.5·§5)', () => {
  it('TC-009 (CR-057 개정): 이관 26키의 이름·문구가 i18n.md §4.1·§4.5 ko 열과 정확히 같다(tabImages·tabMouse 는 새 문구, area* 6키는 CR-057 🔒 문구)', () => {
    for (const [k, v] of Object.entries(MIGRATED)) {
      expect(dict[k], k).toBe(v)
    }
  })

  it('TC-009: 삭제 키(title·tabBehavior·placeholderImages·placeholderBehavior)와 CR-005 삭제 키가 없다', () => {
    for (const key of [
      'title',
      'tabBehavior',
      'placeholderImages',
      'placeholderBehavior',
      'wizardPickHand',
      'wizardBack',
      'markerHand',
      'handUnset',
    ]) {
      expect(dict, key).not.toHaveProperty(key)
    }
  })

  it('TC-009: 안내 문구에 단계 번호("2/2 ")·이미지 탭 안내·옛 빈 상태 문구가 없다', () => {
    expect(ko.wizardPickShoulder.startsWith('2/2')).toBe(false)
    expect(ko.previewNoBody).not.toContain('이미지 탭')
    expect(ko.previewNoBody).not.toBe('몸통 이미지가 등록되지 않았습니다.')
  })

  it('TC-092: markerPen 은 「손 위치」 — 옛 손 기준점 키(markerHand)는 되살아나지 않는다', () => {
    expect(ko.markerPen).toBe('손 위치')
    expect(dict).not.toHaveProperty('markerHand')
    expect(ko.markerPen).not.toBe(ko.markerPart)
  })
})
