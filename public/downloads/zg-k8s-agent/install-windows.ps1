param([string]$Source = "$PSScriptRoot\zg-k8s-agent-windows-amd64.runtime.exe")
$ErrorActionPreference = "Stop"
$InstallDir = Join-Path $env:LOCALAPPDATA "zg-k8s-agent"
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
$Target = Join-Path $InstallDir "zg-k8s-agent.exe"
Copy-Item -Force $Source $Target
$command = '"' + $Target + '" "%1"'
New-Item -Path "HKCU:\Software\Classes\zg-k8s-agent\shell\open\command" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Classes\zg-k8s-agent" -Name '(Default)' -Value 'URL:zg-k8s-agent Protocol'
Set-ItemProperty -Path "HKCU:\Software\Classes\zg-k8s-agent" -Name 'URL Protocol' -Value ''
Set-ItemProperty -Path "HKCU:\Software\Classes\zg-k8s-agent\shell\open\command" -Name '(Default)' -Value $command
Start-Process -FilePath $Target
Write-Output "zg-k8s-agent installed at $Target"
