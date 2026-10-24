# Gera o banner (320x180) do launcher Android TV em assets/tv.
param(
    [string]$Title = 'IPTV Player'
)

Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot '..\assets\tv'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function New-TvImage([int]$Width, [int]$Height, [string]$Text, [float]$FontSize, [string]$Path) {
    $bmp = New-Object System.Drawing.Bitmap $Width, $Height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    try {
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
        $rect = New-Object System.Drawing.Rectangle 0, 0, $Width, $Height
        $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(255, 11, 15, 23)), ([System.Drawing.Color]::FromArgb(255, 30, 64, 175)), 45
        $g.FillRectangle($bg, $rect)

        $font = New-Object System.Drawing.Font 'Segoe UI', $FontSize, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
        $format = New-Object System.Drawing.StringFormat
        $format.Alignment = [System.Drawing.StringAlignment]::Center
        $format.LineAlignment = [System.Drawing.StringAlignment]::Center
        $g.DrawString($Text, $font, [System.Drawing.Brushes]::White, [System.Drawing.RectangleF]::new(0, 0, $Width, $Height), $format)

        $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        $g.Dispose()
        $bmp.Dispose()
    }
}

New-TvImage 320 180 $Title 40 (Join-Path $outDir 'tv_banner.png')
Write-Host "Banner gerado em $outDir"
