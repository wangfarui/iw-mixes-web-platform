param([ValidateSet('install', 'start', 'status', 'pair', 'uninstall')][string]$Action = 'install')
$ErrorActionPreference = 'Stop'
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw '请先安装 Node.js 20 或更高版本，并重新打开 PowerShell。' }
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
    & $node.Source (Join-Path $PSScriptRoot 'aiLauncher.mjs') $Action
    if ($LASTEXITCODE -ne 0) { throw "本机助手命令失败：$Action" }
} finally { Pop-Location }
