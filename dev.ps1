# Run with: powershell -ExecutionPolicy Bypass -File .\dev.ps1
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$runtime = Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot '.tools') -Directory -Filter 'node-*-win-x64' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($runtime) { $env:PATH = $runtime.FullName + ';' + $env:PATH }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Install Node.js 22 or newer first: https://nodejs.org/' }
if (-not (Test-Path -LiteralPath 'node_modules')) { npm.cmd ci; if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' } }
npm.cmd run dev
