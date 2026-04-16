$f = 'c:\research\New folder (2)\astro\mobile\app\(tabs)\porondam.js'
$lines = [System.IO.File]::ReadAllLines($f)
$newLines = $lines[0..314] + $lines[330..($lines.Length-1)]
[System.IO.File]::WriteAllLines($f, $newLines)
Write-Host "Done. Removed lines 316-331. New total: $($newLines.Length)"
