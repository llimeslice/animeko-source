param(
    [ValidateRange(1, 65535)]
    [int]$Port = 8765,
    [string]$BindAddress = '0.0.0.0'
)

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    throw 'Node.js is required. Install Node.js, then run this script again.'
}

$serverScript = Join-Path $PSScriptRoot 'serve-source.mjs'
& $node.Source $serverScript $Port $BindAddress
