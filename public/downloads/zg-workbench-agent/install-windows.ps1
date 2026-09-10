param([string]$Source = "$PSScriptRoot\zg-workbench-agent-windows-amd64.runtime.exe")
$ErrorActionPreference = "Stop"
$InstallDir = Join-Path $env:LOCALAPPDATA "zg-workbench-agent"
$LegacyDir = Join-Path $env:LOCALAPPDATA "zg-k8s-agent"
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
$Target = Join-Path $InstallDir "zg-workbench-agent.exe"
$LegacyTarget = Join-Path $LegacyDir "zg-k8s-agent.exe"
Stop-Process -Name "zg-workbench-agent" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "zg-k8s-agent" -Force -ErrorAction SilentlyContinue
Copy-Item -Force $Source $Target

foreach ($Protocol in @(@{ Name = "zg-workbench-agent"; Description = "URL:zg-workbench-agent Protocol" }, @{ Name = "zg-k8s-agent"; Description = "URL:zg-k8s-agent Protocol" })) {
    $Key = "HKCU:\Software\Classes\$($Protocol.Name)"
    $CommandKey = "$Key\shell\open\command"
    New-Item -Path $CommandKey -Force | Out-Null
    Set-ItemProperty -Path $Key -Name '(Default)' -Value $Protocol.Description
    Set-ItemProperty -Path $Key -Name 'URL Protocol' -Value ''
    Set-ItemProperty -Path $CommandKey -Name '(Default)' -Value ('"' + $Target + '" "%1"')
}

Start-Process -FilePath $Target
$Healthy = $false
for ($i = 0; $i -lt 100; $i++) {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:28731/v1/health" -TimeoutSec 1
        if ($response.StatusCode -eq 200) { $Healthy = $true; break }
    } catch {}
    Start-Sleep -Milliseconds 100
}
if (-not $Healthy) {
    if (Test-Path $LegacyTarget) { Start-Process -FilePath $LegacyTarget }
    throw "zg-workbench-agent 安装后健康检查失败，已保留旧 Agent"
}
Remove-Item -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\zg-k8s-agent" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\zg-k8s-agent" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path $LegacyDir -Recurse -Force -ErrorAction SilentlyContinue
Write-Output "zg-workbench-agent installed at $Target"
