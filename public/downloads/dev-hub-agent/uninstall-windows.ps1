$ErrorActionPreference = "SilentlyContinue"
foreach ($Name in @('dev-hub-agent', 'zg-workbench-agent', 'zg-k8s-agent')) {
    Stop-Process -Name $Name -Force
    Remove-Item -LiteralPath "HKCU:\Software\Classes\$Name" -Recurse -Force
    Remove-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name $Name -Force
    Remove-Item -LiteralPath "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\$Name" -Recurse -Force
    Remove-Item -LiteralPath (Join-Path $env:LOCALAPPDATA $Name) -Recurse -Force
}
Write-Output 'Dev Hub Agent uninstalled'
