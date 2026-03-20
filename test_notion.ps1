$headers = @{
    "Authorization" = "Bearer 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"
    "Notion-Version" = "2022-06-28"
    "Content-Type" = "application/json"
}
$db = "329538249e7e804bb295f34904902b1a"

# Try simple GET to check DB is accessible
Write-Host "Testing GET..."
$test = Invoke-RestMethod -Uri "https://api.notion.com/v1/databases/$db" -Headers $headers -Method GET
Write-Host "DB Title: $($test.title[0].plain_text)"
Write-Host "Properties:"

# Try POST to create a property (not PATCH)
$body = @"
{
  "parent": { "database_id": "$db" },
  "type": "property",
  "property_name": "Project",
  "property_type": "rich_text"
}
"@

$create = Invoke-WebRequest -Uri "https://api.notion.com/v1/pages" -Method POST -Headers $headers -ContentType "application/json" -Body $body
Write-Host "Create status: $($create.StatusCode)"
Write-Host $create.Content
