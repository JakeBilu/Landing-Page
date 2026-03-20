$headers = @{
    "Authorization" = "Bearer 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"
    "Notion-Version" = "2022-06-28"
    "Content-Type" = "application/json"
}
$db = "329538249e7e804bb295f34904902b1a"
$uri = "https://api.notion.com/v1/databases/$db/properties"

# Add Project
$body1 = @"
{"Project": {"type": "rich_text", "rich_text": {}}
"@
try {
    $r = Invoke-WebRequest -Uri $uri -Method PATCH -Headers $headers -ContentType "application/json" -Body $body1
    Write-Host "Project: $($r.StatusCode)"
} catch {
    Write-Host "Project: $($_.Exception.Message)"
}
Start-Sleep 500

# Add Date
$body2 = @"
{"Date": {"type": "date", "date": {}}
"@
try {
    $r = Invoke-WebRequest -Uri $uri -Method PATCH -Headers $headers -ContentType "application/json" -Body $body2
    Write-Host "Date: $($r.StatusCode)"
} catch {
    Write-Host "Date: $($_.Exception.Message)"
}
Start-Sleep 500

# Add Status
$body3 = @"
{"Status": {"type": "select", "select": {"options": [{"name": "Draft", "color": "gray"}, {"name": "Sent", "color": "blue"}, {"name": "Paid", "color": "green"}]}}
"@
try {
    $r = Invoke-WebRequest -Uri $uri -Method PATCH -Headers $headers -ContentType "application/json" -Body $body3
    Write-Host "Status: $($r.StatusCode)"
} catch {
    Write-Host "Status: $($_.Exception.Message)"
}
