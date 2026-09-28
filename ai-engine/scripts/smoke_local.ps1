$ErrorActionPreference = "Stop"

Write-Host "--- AI Engine Smoke Test ---"
$port = 8000

Write-Host "`n1. Health Check"
$health = Invoke-RestMethod "http://localhost:$port/health"
$health | ConvertTo-Json -Compress | Write-Host

Write-Host "`n2. Missing Token Check"
try {
    Invoke-RestMethod "http://localhost:$port/v1/generate-plan" -Method Post -Body "{}" -ContentType "application/json"
} catch {
    Write-Host "Expected error: $_"
}

Write-Host "`n3. Parse PDF"
$dummyPdf = "%PDF-1.4`n1 0 obj`n<< /Type /Catalog /Pages 2 0 R >>`nendobj`n2 0 obj`n<< /Type /Pages /Kids [3 0 R] /Count 1 >>`nendobj`n3 0 obj`n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>`nendobj`n4 0 obj`n<< /Length 21 >>`nstream`nBT /F1 12 Tf 100 700 Td (Hello World) Tj ET`nendstream`nendobj`nxref`n0 5`n0000000000 65535 f `n0000000009 00000 n `n0000000058 00000 n `n0000000115 00000 n `n0000000213 00000 n `ntrailer`n<< /Size 5 /Root 1 0 R >>`nstartxref`n285`n%%EOF"
$pdfPath = "$env:TEMP\test_syllabus.pdf"
[IO.File]::WriteAllText($pdfPath, $dummyPdf)

$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"
$bodyLines = (
    "--$boundary",
    "Content-Disposition: form-data; name=`"file`"; filename=`"test_syllabus.pdf`"",
    "Content-Type: application/pdf",
    "",
    $dummyPdf,
    "--$boundary--"
)
$bodyString = $bodyLines -join $LF

$token = $env:AI_INTERNAL_TOKEN
if (-not $token) {
    Write-Host "WARNING: AI_INTERNAL_TOKEN is not set. Token verification might fail."
}

try {
    $parseResponse = Invoke-RestMethod "http://localhost:$port/v1/parse-syllabus" `
        -Method Post `
        -Headers @{"X-Internal-Token"=$token; "Content-Type"="multipart/form-data; boundary=$boundary"} `
        -Body $bodyString
    
    $parseResponse | ConvertTo-Json -Depth 5 -Compress | Write-Host
} catch {
    Write-Host "Parse failed: $_"
    $responseStream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($responseStream)
    Write-Host $reader.ReadToEnd()
}

Write-Host "`nSmoke test script finished."
