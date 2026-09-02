$ErrorActionPreference = "SilentlyContinue"
Remove-Item -Path "HKCU:\Software\Classes\zg-k8s-agent" -Recurse -Force
Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "zg-k8s-agent" -Force
Remove-Item -Path (Join-Path $env:LOCALAPPDATA "zg-k8s-agent") -Recurse -Force
Write-Output "zg-k8s-agent uninstalled"
