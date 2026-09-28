---
description: 배포 패키지 생성 — yarn tauri build로 NSIS 인스톨러·포터블 exe를 만들고 deploy/{version}/에 정리, 설치 안내 README 생성. 내부 문서·.claude·설정 실값은 절대 포함하지 않는다
---

# /deploy — 배포 패키지 생성

최종 사용자에게 전달할 **인스톨러 + 포터블 exe**를 만들고 `deploy/{version}/`에 모은다.

> 프로젝트 루트가 작업 디렉터리다. 절대 경로를 쓰지 않는다. `deploy/`는 `.gitignore` 대상이다.

## 0. 선행 확인

```bash
cargo --version
git status --porcelain
```

- `cargo` 없음 → 중단, `/dev-start` 0단계 안내.
- 미커밋 변경이 있으면 알린다. 배포는 커밋된 상태에서 하는 것을 권고한다(verify-manager PASS → `/sync` → `/deploy`).
- 버전은 `src-tauri/tauri.conf.json`의 `version`이다. `package.json`·`Cargo.toml` 버전과 다르면 먼저 맞춘다(사용자 확인).

## 1. 빌드

```bash
yarn tauri build 2>&1 | tail -40
```

산출물 위치(Tauri 2 기본):

| 종류 | 경로 |
|---|---|
| 실행 파일 | `src-tauri/target/release/kuro_keyviewer.exe` |
| NSIS 인스톨러 | `src-tauri/target/release/bundle/nsis/kuro_keyviewer_{version}_x64-setup.exe` |

- 번들 종류는 `tauri.conf.json` `bundle.targets`에 `["nsis"]`가 있어야 한다. 없으면 보고 후 사용자 확인으로 추가한다.
- 첫 빌드는 NSIS 도구를 내려받느라 인터넷이 필요하다.
- 빌드 실패는 `/dev-build` 라우팅 표를 따른다. 이 명령은 고치지 않는다.

## 2. 산출물 정리

```bash
VERSION=$(python -c "import json;print(json.load(open('src-tauri/tauri.conf.json',encoding='utf-8'))['version'])")
mkdir -p "deploy/$VERSION"
cp src-tauri/target/release/bundle/nsis/*-setup.exe "deploy/$VERSION/"
cp src-tauri/target/release/kuro_keyviewer.exe "deploy/$VERSION/kuro_keyviewer-$VERSION-portable.exe"
```

## 3. 포함·제외 규칙 (⛔ 최우선)

`deploy/`는 **외부 최종 사용자에게 전달**된다. 의심스러우면 포함하지 않는다.

**절대 제외**
- 내부 개발 자산: `.claude/`, `_reference/`, `CLAUDE.md`, `doc/`(설계·검증·CR 대장), `.claude/reports/`
- 설정 실값·개인 데이터: 개발자의 `%APPDATA%\com.kuro.keyviewer` 내용(사용자 이미지·settings.json), `.env`, 로그
- 소스·빌드 중간물: `src/`, `src-tauri/target/`(exe 제외), `node_modules/`, `dist/`
- VCS 메타: `.git/`, `.gitignore`

**포함**
- 인스톨러 exe, 포터블 exe
- `deploy/{version}/README.md` (아래 4단계)
- 라이선스 파일(있으면)
- 사용자 매뉴얼: `src/overlay/manual.md`·`src/settings/manual.md`를 합쳐 `deploy/{version}/사용설명서.md`로 복사(스크린샷 상대 경로가 깨지지 않게 이미지도 함께). 매뉴얼이 아직 없으면 README에 그 사실을 적는다.

## 4. README.md 생성

`deploy/{version}/README.md`에 아래를 채운다.

```
# kuro_keyviewer {version}

## 설치
- 인스톨러: kuro_keyviewer_{version}_x64-setup.exe 실행 → 안내에 따라 설치
- 포터블: kuro_keyviewer-{version}-portable.exe를 원하는 폴더에 두고 실행

## 요구 사항
- Windows 10/11 64bit
- Microsoft Edge WebView2 런타임 (Windows 11·최신 Windows 10에는 기본 포함. 없으면 인스톨러가 설치를 안내)

## 첫 실행
1. 실행하면 화면 위에 투명 오버레이와 트레이 아이콘이 나타난다
2. 내장 기본 그림이 들어 있어 바로 동작한다 — 키보드·마우스를 움직이면 캐릭터가 반응한다
3. 내 그림으로 바꾸려면 트레이 아이콘 → 설정 → 「이미지 설정」에서 카드별로 PNG를 교체한다 (필수는 키보드 기본·팔 2장, 규격은 사용설명서 참조)

## 데이터 위치
- 이미지·설정: %APPDATA%\com.kuro.keyviewer\

## 제거
- 인스톨러 설치: Windows 설정 → 앱에서 제거. 데이터 폴더는 남는다(직접 삭제)
- 포터블: exe 삭제
```

## 5. 보고

```
배포 패키지: deploy/{version}/
- kuro_keyviewer_{version}_x64-setup.exe  (N MB)
- kuro_keyviewer-{version}-portable.exe   (N MB)
- README.md · 사용설명서.md
제외 확인: .claude/ · doc/ · 개인 데이터 없음 (ls 결과 첨부)
```

`ls -la deploy/{version}` 출력을 증거로 붙인다.
