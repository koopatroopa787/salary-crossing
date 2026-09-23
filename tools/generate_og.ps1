Add-Type -AssemblyName System.Drawing

$width = 1200
$height = 630
$image = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($image)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$background = [System.Drawing.ColorTranslator]::FromHtml("#102922")
$cream = [System.Drawing.ColorTranslator]::FromHtml("#F4E9D0")
$green = [System.Drawing.ColorTranslator]::FromHtml("#79D9BA")
$muted = [System.Drawing.ColorTranslator]::FromHtml("#AEC5BC")
$graphics.Clear($background)

$circleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(18, 121, 217, 186))
$graphics.FillEllipse($circleBrush, 830, -190, 560, 560)
$graphics.FillEllipse($circleBrush, -190, 430, 420, 420)

$brandFont = New-Object System.Drawing.Font("Segoe UI", 28, [System.Drawing.FontStyle]::Bold)
$headlineFont = New-Object System.Drawing.Font("Georgia", 58, [System.Drawing.FontStyle]::Bold)
$bodyFont = New-Object System.Drawing.Font("Segoe UI", 25, [System.Drawing.FontStyle]::Regular)
$smallFont = New-Object System.Drawing.Font("Segoe UI", 20, [System.Drawing.FontStyle]::Bold)
$creamBrush = New-Object System.Drawing.SolidBrush($cream)
$greenBrush = New-Object System.Drawing.SolidBrush($green)
$mutedBrush = New-Object System.Drawing.SolidBrush($muted)

$graphics.DrawString("SALARY CROSSING", $brandFont, $greenBrush, 88, 72)
$graphics.DrawString("What is your salary", $headlineFont, $creamBrush, 82, 174)
$graphics.DrawString("really worth abroad?", $headlineFont, $creamBrush, 82, 250)
$graphics.DrawString("Compare take-home pay across the UK, Dubai, Australia and the US.", $bodyFont, $mutedBrush, 88, 370)
$graphics.DrawString("Published tax rates  ·  Real calculations  ·  Free", $smallFont, $greenBrush, 88, 474)

$arrowPen = New-Object System.Drawing.Pen($green, 14)
$arrowPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$arrowPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$graphics.DrawLine($arrowPen, 924, 248, 1082, 248)
$graphics.DrawLine($arrowPen, 1045, 211, 1082, 248)
$graphics.DrawLine($arrowPen, 1045, 285, 1082, 248)
$creamPen = New-Object System.Drawing.Pen($cream, 14)
$creamPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$creamPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$graphics.DrawLine($creamPen, 1082, 326, 924, 326)
$graphics.DrawLine($creamPen, 961, 289, 924, 326)
$graphics.DrawLine($creamPen, 961, 363, 924, 326)

$output = Join-Path $PSScriptRoot "..\static\og.png"
$image.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)

$arrowPen.Dispose()
$creamPen.Dispose()
$brandFont.Dispose()
$headlineFont.Dispose()
$bodyFont.Dispose()
$smallFont.Dispose()
$creamBrush.Dispose()
$greenBrush.Dispose()
$mutedBrush.Dispose()
$circleBrush.Dispose()
$graphics.Dispose()
$image.Dispose()
