param([string]$Source = "$PSScriptRoot\dev-hub-agent-windows-amd64.runtime.exe")
$ErrorActionPreference = "Stop"
$InstallDir = Join-Path $env:LOCALAPPDATA "dev-hub-agent"
$Target = Join-Path $InstallDir "dev-hub-agent.exe"
$Backup = "$Target.previous"
$HadPrevious = Test-Path -LiteralPath $Target
$Healthy = $false
$Process = $null
if (-not (Test-Path -LiteralPath $Source)) { throw "Dev Hub Agent 安装文件不存在" }
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
if ($HadPrevious) { Copy-Item -LiteralPath $Target -Destination $Backup -Force }
try {
    foreach ($Name in @('dev-hub-agent', 'zg-workbench-agent', 'zg-k8s-agent')) {
        Stop-Process -Name $Name -Force -ErrorAction SilentlyContinue
    }
    Copy-Item -LiteralPath $Source -Destination $Target -Force
    & $Target --register-install
    if ($LASTEXITCODE -ne 0) { throw "Dev Hub Agent 注册安装信息失败" }
    $Process = Start-Process -FilePath $Target -PassThru
    & $Target --check-install
    if ($LASTEXITCODE -ne 0) { throw "Dev Hub Agent 安装后健康检查失败" }
    $Healthy = $true
    & $Target --complete-install
    if ($LASTEXITCODE -ne 0) { throw "Dev Hub Agent 已启动，旧安装清理未完成" }
    Write-Output "Dev Hub Agent installed at $Target"
} catch {
    if (-not $Healthy) {
        if ($null -ne $Process) { Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue }
        if ($HadPrevious) {
            Copy-Item -LiteralPath $Backup -Destination $Target -Force
            Start-Process -FilePath $Target
        } else {
            foreach ($Name in @('zg-workbench-agent', 'zg-k8s-agent')) {
                $OldTarget = Join-Path (Join-Path $env:LOCALAPPDATA $Name) "$Name.exe"
                if (Test-Path -LiteralPath $OldTarget) { Start-Process -FilePath $OldTarget; break }
            }
        }
    }
    throw
} finally {
    if ($Healthy) { Remove-Item -LiteralPath $Backup -Force -ErrorAction SilentlyContinue }
}
