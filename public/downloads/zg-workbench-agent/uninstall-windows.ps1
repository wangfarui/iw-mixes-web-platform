$ErrorActionPreference = "SilentlyContinue"
Stop-Process -Name "zg-workbench-agent" -Force
Stop-Process -Name "zg-k8s-agent" -Force
Remove-Item -Path "HKCU:\Software\Classes\zg-workbench-agent" -Recurse -Force
Remove-Item -Path "HKCU:\Software\Classes\zg-k8s-agent" -Recurse -Force
Remove-Item -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "zg-workbench-agent" -Force
Remove-Item -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "zg-k8s-agent" -Force
Remove-Item -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\zg-workbench-agent" -Recurse -Force
Remove-Item -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\zg-k8s-agent" -Recurse -Force
Remove-Item -Path (Join-Path $env:LOCALAPPDATA "zg-workbench-agent") -Recurse -Force
Remove-Item -Path (Join-Path $env:LOCALAPPDATA "zg-k8s-agent") -Recurse -Force
Write-Output "zg-workbench-agent uninstalled"
