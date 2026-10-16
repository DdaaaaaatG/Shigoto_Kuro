# capture-windows.ps1 — 오버레이 창(화면 BitBlt+CAPTUREBLT)과 설정 창(PrintWindow, 가려져 있어도 창 내용만)을 캡처한다.
# 사용: powershell -File scripts/dev/capture-windows.ps1 -OutDir <폴더> [-ShowSettings] [-Click "x,y"(설정 창 클라이언트 좌표)] [-Key END]
# 합성 클릭은 WindowFromPoint가 설정 창일 때만 보낸다. 실행 중인 kuro 프로세스(dev·release 어느 쪽이든)를 찾는다.
param([string]$OutDir, [switch]$ShowSettings, [string]$Click = "", [string]$Key = "", [string]$Prefix = "")
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System; using System.Text; using System.Runtime.InteropServices;
public struct RECT { public int L, T, R, B; }
public struct PT { public int X, Y; }
public delegate bool EnumProc(IntPtr h, IntPtr l);
public static class W {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h, ref PT p);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc p, IntPtr l);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowTextW(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte sc, uint flags, UIntPtr extra);
  [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(PT p);
  [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr h, uint f);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, int dx, int dy, uint data, UIntPtr extra);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern IntPtr GetDC(IntPtr h);
  [DllImport("user32.dll")] public static extern int ReleaseDC(IntPtr h, IntPtr dc);
  [DllImport("gdi32.dll")] public static extern bool BitBlt(IntPtr hdc, int x, int y, int w, int h, IntPtr src, int sx, int sy, uint rop);
  public static IntPtr Found = IntPtr.Zero;
  public static IntPtr FindExact(string title) {
    Found = IntPtr.Zero;
    EnumWindows((h, l) => { var sb = new StringBuilder(256); GetWindowTextW(h, sb, 256);
      if (sb.ToString() == title) { Found = h; return false; } return true; }, IntPtr.Zero);
    return Found;
  }
}
'@
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }
function SaveBmp($bmp, $name) { $p = Join-Path $OutDir ($Prefix + $name + '.png'); $bmp.Save($p); $bmp.Dispose(); Write-Output ("saved " + $p) }

# 1) 오버레이: 화면에서 BitBlt(CAPTUREBLT — layered 창 포함)
$ov = [W]::FindExact("kuro_keyviewer")
if ($ov -ne [IntPtr]::Zero) {
  $r = New-Object RECT; [W]::GetWindowRect($ov, [ref]$r) | Out-Null
  $w = $r.R-$r.L; $h = $r.B-$r.T
  Write-Output ("overlay " + $w + "x" + $h + " at (" + $r.L + "," + $r.T + ")")
  $bmp = New-Object System.Drawing.Bitmap $w, $h; $g = [System.Drawing.Graphics]::FromImage($bmp)
  $hdc = $g.GetHdc(); $sdc = [W]::GetDC([IntPtr]::Zero)
  [W]::BitBlt($hdc, 0, 0, $w, $h, $sdc, $r.L, $r.T, 0x40CC0020) | Out-Null
  [W]::ReleaseDC([IntPtr]::Zero, $sdc) | Out-Null; $g.ReleaseHdc($hdc); $g.Dispose()
  SaveBmp $bmp '01-overlay'
} else { Write-Output "overlay window not found" }

# 2) 설정 창: 필요하면 앞으로 → 클릭/키 → PrintWindow(가려져 있어도 창 내용만)
$st = [W]::FindExact("kuro_keyviewer " + [char]0xC124 + [char]0xC815)
if ($st -eq [IntPtr]::Zero) { Write-Output "settings window not found"; exit 0 }
if ($ShowSettings) {
  [W]::ShowWindow($st, 9) | Out-Null; Start-Sleep -Milliseconds 300
  [W]::keybd_event(0x12,0,0,[UIntPtr]::Zero); [W]::keybd_event(0x12,0,2,[UIntPtr]::Zero)
  [W]::SetForegroundWindow($st) | Out-Null
  [W]::SetWindowPos($st, [IntPtr](-1), 0,0,0,0, 0x3) | Out-Null; Start-Sleep -Milliseconds 200
  [W]::SetWindowPos($st, [IntPtr](-2), 0,0,0,0, 0x3) | Out-Null; Start-Sleep -Milliseconds 600
}
if ($Click) {
  $o = New-Object PT; [W]::ClientToScreen($st, [ref]$o) | Out-Null
  $xy = $Click.Split(","); $pt = New-Object PT; $pt.X = $o.X + [int]$xy[0]; $pt.Y = $o.Y + [int]$xy[1]
  if ([W]::GetAncestor([W]::WindowFromPoint($pt), 2) -ne $st) { Write-Output "REFUSE click: not settings window under point" }
  else { [W]::SetCursorPos($pt.X, $pt.Y) | Out-Null; Start-Sleep -Milliseconds 120; [W]::mouse_event(2,0,0,0,[UIntPtr]::Zero); Start-Sleep -Milliseconds 40; [W]::mouse_event(4,0,0,0,[UIntPtr]::Zero); Start-Sleep -Milliseconds 1000; Write-Output ("clicked " + $Click) }
}
if ($Key) { $map = @{ ENTER = 0x0D; ESC = 0x1B; TAB = 0x09; PGDN = 0x22; END = 0x23 }; [W]::keybd_event([byte]$map[$Key],0,0,[UIntPtr]::Zero); [W]::keybd_event([byte]$map[$Key],0,2,[UIntPtr]::Zero); Start-Sleep -Milliseconds 700 }
$r = New-Object RECT; [W]::GetWindowRect($st, [ref]$r) | Out-Null
$w = $r.R-$r.L; $h = $r.B-$r.T
Write-Output ("settings " + $w + "x" + $h + " at (" + $r.L + "," + $r.T + ")")
$bmp = New-Object System.Drawing.Bitmap $w, $h; $g = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $g.GetHdc(); [W]::PrintWindow($st, $hdc, 2) | Out-Null; $g.ReleaseHdc($hdc); $g.Dispose()
SaveBmp $bmp '02-settings'
