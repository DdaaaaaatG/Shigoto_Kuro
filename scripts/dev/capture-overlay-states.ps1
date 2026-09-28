param([string]$OutDir)
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System; using System.Runtime.InteropServices;
public struct RECT { public int L, T, R, B; }
public static class N {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte sc, uint flags, UIntPtr extra);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
}
'@
$p = Get-Process kuro-keyviewer | Select-Object -First 1
$r = New-Object RECT; [N]::GetWindowRect($p.MainWindowHandle, [ref]$r) | Out-Null
Write-Output ("window: " + ($r.R-$r.L) + "x" + ($r.B-$r.T) + " at (" + $r.L + "," + $r.T + ")")
function Shot([string]$name) {
  $rect = New-Object System.Drawing.Rectangle ($r.L-10), ($r.T-10), ($r.R-$r.L+20), ($r.B-$r.T+20)
  $bmp = New-Object System.Drawing.Bitmap $rect.Width, $rect.Height
  $g = [System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($rect.Location, [System.Drawing.Point]::Empty, $rect.Size)
  $path = Join-Path $OutDir ($name + '.png')
  $bmp.Save($path); $g.Dispose(); $bmp.Dispose(); Write-Output ("saved " + $path)
}
[N]::SetCursorPos(1700, 1300) | Out-Null; Start-Sleep -Milliseconds 400
Shot '1-idle'
[N]::keybd_event(0x7C, 0, 0, [UIntPtr]::Zero); Start-Sleep -Milliseconds 250
Shot '2-key-down'
[N]::keybd_event(0x7C, 0, 2, [UIntPtr]::Zero); Start-Sleep -Milliseconds 300
Shot '3-key-up'
for ($i=0; $i -lt 10; $i++) { [N]::keybd_event(0x7C,0,0,[UIntPtr]::Zero); Start-Sleep -Milliseconds 30; [N]::keybd_event(0x7C,0,2,[UIntPtr]::Zero); Start-Sleep -Milliseconds 40 }
Start-Sleep -Milliseconds 250
Shot '4-slam'
Start-Sleep -Milliseconds 2200
[N]::SetCursorPos(100, 100) | Out-Null; Start-Sleep -Milliseconds 300
Shot '5-mouse-topleft'
[N]::SetCursorPos(3300, 1400) | Out-Null; Start-Sleep -Milliseconds 300
Shot '6-mouse-bottomright'
Start-Sleep -Seconds 9
Shot '7-rest'
