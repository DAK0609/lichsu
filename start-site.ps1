$ErrorActionPreference = 'Stop'
$python = Get-Command py -ErrorAction SilentlyContinue
if ($python) {
  $pythonCommand = $python.Source
  $pythonArgs = @('-m', 'http.server', '8000', '--bind', '0.0.0.0', '--directory', $PSScriptRoot)
} else {
  $pythonCommand = 'C:\Users\DELL\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
  if (-not (Test-Path -LiteralPath $pythonCommand)) { throw 'Không tìm thấy Python để mở trang.' }
  $pythonArgs = @('-m', 'http.server', '8000', '--bind', '0.0.0.0', '--directory', $PSScriptRoot)
}
$addresses = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.InterfaceOperationalStatus -eq 'Up' -and $_.PrefixOrigin -ne 'WellKnown' } |
  Select-Object -ExpandProperty IPAddress -Unique
Write-Host ''
Write-Host 'Mở trang trên iPhone: kết nối cùng Wi-Fi với máy tính, rồi vào một địa chỉ dưới đây:' -ForegroundColor Cyan
foreach ($address in $addresses) { Write-Host "  http://${address}:8000" -ForegroundColor Green }
Write-Host 'Giữ cửa sổ này mở trong khi ôn tập. Nhấn Ctrl+C để dừng máy chủ.' -ForegroundColor DarkGray
& $pythonCommand @pythonArgs
