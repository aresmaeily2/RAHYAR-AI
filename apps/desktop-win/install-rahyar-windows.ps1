# RahyAr AI — User-Space Windows Installer (Zero Admin Required, Preserves User Data on Upgrade)
param(
  [string]$SourceExe = (Join-Path $PSScriptRoot "RahyAr-Windows-x64.exe"),
  [string]$InstallDir = (Join-Path $env:LOCALAPPDATA "Programs\RahyArAI")
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path $SourceExe)) { throw "Executable not found: $SourceExe" }
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
$destExe = Join-Path $InstallDir "RahyAr-Windows-x64.exe"
Copy-Item -Force $SourceExe $destExe

# Start Menu Shortcut
$startMenu = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut((Join-Path $startMenu "RahyAr AI.lnk"))
$sc.TargetPath = $destExe
$sc.WorkingDirectory = $InstallDir
$sc.Description = "RahyAr AI — Personal AI Assistant"
$sc.Save()

Write-Output "INSTALLED_OK=$destExe"
Write-Output "DATA_DIR=$(Join-Path $env:LOCALAPPDATA 'RahyArAI') (preserved on upgrade)"
