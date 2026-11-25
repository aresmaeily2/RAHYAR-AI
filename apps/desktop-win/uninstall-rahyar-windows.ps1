# RahyAr AI — Clean Windows Uninstaller (Optional -PurgeData to remove local SQLite DB)
param(
  [switch]$PurgeData,
  [string]$InstallDir = (Join-Path $env:LOCALAPPDATA "Programs\RahyArAI")
)
$ErrorActionPreference = 'Continue'
Get-Process -Name "RahyAr-Windows-x64" -ErrorAction SilentlyContinue | Stop-Process -Force
$startShortcut = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\RahyAr AI.lnk"
if (Test-Path $startShortcut) { Remove-Item -Force $startShortcut }
if (Test-Path $InstallDir) { Remove-Item -Recurse -Force $InstallDir }
if ($PurgeData) {
  $dataDir = Join-Path $env:LOCALAPPDATA "RahyArAI"
  if (Test-Path $dataDir) { Remove-Item -Recurse -Force $dataDir }
}
Write-Output "UNINSTALLED_OK=True | PurgeData=$PurgeData"
