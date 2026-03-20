Add-PSSnapin Microsoft.SharePoint.Client -ErrorAction SilentlyContinue

$headers = @{
    "Authorization" = "Bearer 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"
    "Notion-Version" = "2022-06-28"
    "Content-Type" = "application/json"
}
$db = "329538249e7e804bb295f34904902b1a"

# Add Project (rich_text)
$body1 = @"
{"name":"Project","type":"rich_text","rich_text":{}}
"@
$uri1 = "https://api.notion.com/v1/databases/$db/properties"
try {
    $r1 = Invoke-RestMethod -Uri $uri1 -Method PATCH -Headers $headers -Body $body1 -ContentType "application/json"
    Write-Host "Project: OK"
} catch {
    Write-Host "Project error: $($_.Exception.Message)"
}

# Add Date (date)
$body2 = @"
{"name":"Date","type":"date","date":{}}
"@
try {
    $r2 = Invoke-RestMethod -Uri $uri1 -Method PATCH -Headers $headers -Body $body2 -ContentType "application/json"
    Write-Host "Date: OK"
} catch {
    Write-Host "Date error: $($_.Exception.Message)"
}

# Add Status (select)
$body3 = @"
{"name":"Status","type":"select","select":{"options":[{"name":"Draft","color":"gray"},{"name":"Sent","color":"blue"},{"name":"Paid","color":"green"}]}}
"@
try {
    $r3 = Invoke-RestMethod -Uri $uri1 -Method PATCH -Headers $headers -Body $body3 -ContentType "application/json"
    Write-Host "Status: OK"
} catch {
    Write-Host "Status error: $($_.Exception.Message)"
}

Write-Host "Done!"
