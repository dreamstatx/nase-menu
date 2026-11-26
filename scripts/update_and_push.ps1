# Обновляет скидки (prices.json) и выкладывает их на сайт.
# Запуск вручную:  powershell -ExecutionPolicy Bypass -File scripts\update_and_push.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
$env:PYTHONIOENCODING = 'utf-8'
$sd = 'safe.directory=' + ($root -replace '\\', '/')
$log = Join-Path $root 'scripts\last-update.log'

"=== $(Get-Date -Format 'yyyy-MM-dd HH:mm') ===" | Out-File $log -Encoding utf8
cmd /c "python -I scripts\update_prices.py >> scripts\last-update.log 2>&1"
git -c $sd add prices.json
git -c $sd diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  git -c $sd commit -q -m "Обновление цен $(Get-Date -Format 'yyyy-MM-dd')"
  git -c $sd -c credential.helper= -c 'credential.helper=!gh auth git-credential' pull -q --rebase origin main 2>$null
  git -c $sd -c credential.helper= -c 'credential.helper=!gh auth git-credential' push -q origin main 2>$null
  'Опубликовано' | Out-File $log -Append -Encoding utf8
} else {
  'Цены не изменились' | Out-File $log -Append -Encoding utf8
}
