---
description: 앱 실행 후 오버레이·설정 창 스크린샷을 doc/300_검증/screenshots/{YYYYMMDD-HHMM}/에 저장하고 경로를 보고한다 (dev 또는 빌드된 exe)
---

# 앱 실행 + 스크린샷

브라우저 MCP를 쓰지 않는다. 앱을 실제로 띄우고 화면을 캡처해 파일로 남기는 것이 이 프로젝트의 "눈으로 확인"이다.

> 프로젝트 루트가 작업 디렉터리다. 절대 경로를 쓰지 않는다.

## 1. 실행 대상 결정

| 인자 | 대상 |
|---|---|
| (없음) 또는 `dev` | `/dev-start`와 같은 방식으로 `yarn tauri dev`(이미 떠 있으면 재사용) |
| `exe` | `src-tauri/target/release/kuro_keyviewer.exe` (없으면 `/deploy` 또는 `yarn tauri build` 안내 후 중단) |

앱이 뜨면 오버레이 창(투명·테두리 없음)과 트레이 아이콘이 보인다. 설정 창은 트레이 메뉴 「설정」으로 연다.

## 2. 스크린샷 저장 폴더

```bash
STAMP=$(date +%Y%m%d-%H%M)
mkdir -p "doc/300_검증/screenshots/$STAMP"
```

## 3. 캡처 (PowerShell, 전체 화면 → PNG)

오버레이는 투명 창이라 창 단위 캡처가 비어 보일 수 있다. **전체 화면**을 캡처한 뒤 필요하면 좌표로 잘라낸다.

```powershell
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size)
$bmp.Save("doc/300_검증/screenshots/$env:STAMP/overlay-idle.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
```

- PowerShell 도구로 실행할 때 `$env:STAMP`를 먼저 설정한다: `$env:STAMP = Get-Date -Format "yyyyMMdd-HHmm"`.
- 파일명 규칙: `{창}-{상태}.png` — `overlay-idle.png`, `overlay-keydown.png`, `overlay-mouse.png`, `settings-main.png`, `settings-images.png`.
- 상태 재현: 키 입력·마우스 이동은 사용자가 직접 하거나, 캡처 직전에 PowerShell `[System.Windows.Forms.SendKeys]::SendWait("a")`·`[System.Windows.Forms.Cursor]::Position` 변경으로 만든다. 저수준 훅은 SendKeys 입력도 받는다.
- 설정 창은 트레이 메뉴 또는 앱이 제공하는 단축키로 연 뒤 캡처한다. 창 위치를 모르면 전체 화면 캡처로 충분하다.

## 4. 확인과 보고

- 저장된 PNG를 `Read`로 열어 실제 화면이 담겼는지 본다(검은 화면·빈 화면이면 실패로 보고).
- 보고 형식:
  ```
  실행: dev | exe
  스크린샷: doc/300_검증/screenshots/{STAMP}/
    - overlay-idle.png   (확인: 몸통+대기 레이어 표시)
    - settings-main.png  (확인: 설정 창 4개 섹션)
  이상: 없음 | {관찰한 문제}
  ```
- 이 폴더는 `.gitignore` 대상이다. 증거로 남길 캡처만 `doc/300_검증/`의 리포트에 상대 경로로 인용한다.
