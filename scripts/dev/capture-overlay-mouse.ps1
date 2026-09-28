param([string]$OutDir)
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System; using System.Runtime.InteropServices;
public struct RECT { public int L, T, R, B; }
public static class N {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, int dx, int dy, uint data, UIntPtr extra);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out System.Drawing.Point p);
}
'@ -ReferencedAssemblies System.Drawing
$p = Get-Process kuro-keyviewer | Select-Object -First 1
$r = New-Object RECT; [N]::GetWindowRect($p.MainWindowHandle, [ref]$r) | Out-Null
function Shot([string]$name) {
  $rect = New-Object System.Drawing.Rectangle ($r.L-10), ($r.T-10), ($r.R-$r.L+20), ($r.B-$r.T+20)
  $bmp = New-Object System.Drawing.Bitmap $rect.Width, $rect.Height
  $g = [System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($rect.Location, [System.Drawing.Point]::Empty, $rect.Size)
  $bmp.Save((Join-Path $OutDir ($name + '.png'))); $g.Dispose(); $bmp.Dispose()
  $c = New-Object System.Drawing.Point; [N]::GetCursorPos([ref]$c) | Out-Null
  Write-Output ("saved " + $name + "  cursor=" + $c.X + "," + $c.Y)
}
# 이동 이벤트를 훅 경로로 발생시키기 위해 SetCursorPos 뒤에 mouse_event 상대 이동 1px
[N]::SetCursorPos(150, 150) | Out-Null; Start-Sleep -Milliseconds 50; [N]::mouse_event(0x0001, 1, 1, 0, [UIntPtr]::Zero); Start-Sleep -Milliseconds 350
Shot 'm1-topleft'
[N]::SetCursorPos(3300, 1350) | Out-Null; Start-Sleep -Milliseconds 50; [N]::mouse_event(0x0001, 1, 1, 0, [UIntPtr]::Zero); Start-Sleep -Milliseconds 350
Shot 'm2-bottomright'
# 오버레이 창 중앙에서 왼클릭 누른 채 캡처 → 뗌
[N]::SetCursorPos($r.L + 225, $r.T + 175) | Out-Null; Start-Sleep -Milliseconds 50; [N]::mouse_event(0x0001, 1, 0, 0, [UIntPtr]::Zero); Start-Sleep -Milliseconds 200
[N]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero); Start-Sleep -Milliseconds 250
Shot 'm3-leftdown'
[N]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero); Start-Sleep -Milliseconds 300
Shot 'm4-leftup'
