Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\User\.gemini\antigravity\brain\0cfd52dc-e84d-4be8-9e07-8cf1b52e5514\circular_transparent_emblem_1780583345996.png"
$destPath = "C:\Users\User\.gemini\antigravity\scratch\leaderboard\public\logo.png"
$destIconPath = "C:\Users\User\.gemini\antigravity\scratch\leaderboard\src\app\icon.png"

# We want to load the image and force pixels outside the circular area to be 100% transparent.
if (Test-Path $srcPath) {
    Write-Host "Loading image: $srcPath"
    # To prevent file lock, we load the image into memory and copy it
    $tempImg = [System.Drawing.Image]::FromFile($srcPath)
    $bmp = New-Object System.Drawing.Bitmap($tempImg.Width, $tempImg.Height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.DrawImage($tempImg, 0, 0, $tempImg.Width, $tempImg.Height)
    $g.Dispose()
    $tempImg.Dispose()

    $w = $bmp.Width
    $h = $bmp.Height
    $cx = $w / 2
    $cy = $h / 2
    # Radius of the circle. We can make it slightly smaller (e.g., 49% of width) to clip any rough edges.
    $radius = ($w / 2) - 2
    if ($radius -lt 0) { $radius = $w / 2 }

    Write-Host "Image size: $w x $h, Center: $cx, $cy, Radius: $radius"

    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $dx = $x - $cx
            $dy = $y - $cy
            $distSq = ($dx * $dx) + ($dy * $dy)
            if ($distSq -gt ($radius * $radius)) {
                $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            }
        }
    }

    # Save to logo.png
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Saved transparent logo to: $destPath"

    # Save to icon.png
    $bmp.Save($destIconPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Saved transparent icon to: $destIconPath"

    $bmp.Dispose()
    Write-Host "Crop circle successful!"
} else {
    Write-Error "Source image not found: $srcPath"
}
