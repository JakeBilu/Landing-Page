$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$wb = $excel.Workbooks.Add()
$ws = $wb.Sheets.Item(1)
$ws.Name = "Quotation"

$ws.Columns.Item(1).ColumnWidth = 3
$ws.Columns.Item(2).ColumnWidth = 6
$ws.Columns.Item(3).ColumnWidth = 50
$ws.Columns.Item(4).ColumnWidth = 15
$ws.Columns.Item(5).ColumnWidth = 8
$ws.Columns.Item(6).ColumnWidth = 10
$ws.Columns.Item(7).ColumnWidth = 15

$darkGreen = 5104128
$lightGreen = 15578401
$white = 16777215
$black = 0
$gray = 5000268

# Helper function
function WriteCell($r, $c, $v, $b, $sz, $col, $bg, $align) {
    $cell = $ws.Cells.Item($r, $c)
    $cell.Value = $v
    if ($b) { $cell.Font.Bold = $true }
    if ($sz) { $cell.Font.Size = $sz }
    if ($col -ne $null) { $cell.Font.Color = $col }
    if ($bg -ne $null) { $cell.Interior.Color = $bg }
    if ($align -eq "center") { $cell.HorizontalAlignment = 2 }
    if ($align -eq "right") { $cell.HorizontalAlignment = 4 }
    $bdr = $cell.Borders
    $bdr.Item(1).LineStyle = 1
    $bdr.Item(2).LineStyle = 1
    $bdr.Item(3).LineStyle = 1
    $bdr.Item(4).LineStyle = 1
}

function MergeCells($r1, $c1, $r2, $c2) {
    $ws.Range($ws.Cells.Item($r1, $c1), $ws.Cells.Item($r2, $c2)).Merge() | Out-Null
}

# === ROW 1: Company Header ===
MergeCells 1 2 1 7
WriteCell 1 2 "HEALTH SPACE INTERIOR" $true 22 $white $darkGreen "center"

# === ROW 2: Tagline ===
MergeCells 2 2 2 7
WriteCell 2 2 "Crafting Healthy Living Spaces  |  Operated by HS Design" $null 10 $darkGreen $lightGreen "center"

# === ROW 3: Spacer ===
MergeCells 3 2 3 7
WriteCell 3 2 "" $null $null $null $white $null

# === ROW 4-7: Info Block ===
WriteCell 4 6 "To:" $true 10 $black $null "right"
MergeCells 4 7 4 7
WriteCell 4 7 "[Customer Name]" $null 10 $gray

WriteCell 5 6 "Project Site:" $true 10 $black $null "right"
MergeCells 5 7 5 7
WriteCell 5 7 "[Project Address]" $null 10 $gray

WriteCell 6 6 "Date:" $true 10 $black $null "right"
WriteCell 6 7 "[Date]" $null 10 $gray

WriteCell 7 6 "Quotation No:" $true 10 $black $null "right"
WriteCell 7 7 "[QUO-XXXX]" $null 10 $gray

WriteCell 8 6 "Handphone:" $true 10 $black $null "right"
WriteCell 8 7 "[HP-Number]" $null 10 $gray

# === ROW 9: Spacer ===
MergeCells 9 2 9 7
WriteCell 9 2 "" $null $null $null $white

# === ROW 10: QUOTATION Title ===
MergeCells 10 2 10 7
WriteCell 10 2 "QUOTATION" $true 18 $white $darkGreen "center"

# === ROW 11: Spacer ===
MergeCells 11 2 11 7
WriteCell 11 2 "" $null $null $null $white

# === ROW 12: Table Header ===
WriteCell 12 2 "S/N" $true 10 $white $darkGreen "center"
WriteCell 12 3 "Description of Work" $true 10 $white $darkGreen "center"
WriteCell 12 4 "Unit Price (RM)" $true 10 $white $darkGreen "center"
WriteCell 12 5 "Qty" $true 10 $white $darkGreen "center"
WriteCell 12 6 "Unit" $true 10 $white $darkGreen "center"
WriteCell 12 7 "Amount (RM)" $true 10 $white $darkGreen "center"

# === SECTION 1: ELECTRICAL WORK ===
$r = 13
MergeCells $r 2 $r 7
WriteCell $r 2 "ELECTRICAL WORK" $true 10 $darkGreen $lightGreen
$r++

$items1 = @(
    @{no=1; desc="Supply and install 3-points socket point, including wiring (owner supply)"; price=500.00},
    @{no=2; desc="Supply and install ceiling fan with LED 3in1 (owner supply)"; price=400.00},
    @{no=3; desc="Supply and install downlight 5 inches LED (owner supply)"; price=150.00}
)
$sub1 = 0
foreach ($item in $items1) {
    WriteCell $r 2 $item.no $null 10 $black $null "center"
    WriteCell $r 3 $item.desc $null 10 $black
    $fmt = "RM {0:N2}" -f $item.price
    WriteCell $r 4 $fmt $null 10 $black $null "right"
    WriteCell $r 5 "1" $null 10 $black $null "center"
    WriteCell $r 6 "lot" $null 10 $black $null "center"
    WriteCell $r 7 $fmt $null 10 $black $null "right"
    $sub1 += $item.price
    $r++
}
$fmtSub1 = "RM {0:N2}" -f $sub1
WriteCell $r 3 "Subtotal - Electrical Work" $true 10 $black $null "right"
WriteCell $r 7 $fmtSub1 $true 10 $black $null "right"
$r++
$r++

# === SECTION 2: PLASTER CEILING WORK ===
MergeCells $r 2 $r 7
WriteCell $r 2 "PLASTER CEILING WORK" $true 10 $darkGreen $lightGreen
$r++

$items2 = @(
    @{no=1; desc="Supply and install plaster ceiling with gypsum board 9mm (super home series)"; price=1200.00},
    @{no=2; desc="Supply and install cornice / skirting 4 inches (owner supply)"; price=300.00}
)
$sub2 = 0
foreach ($item in $items2) {
    WriteCell $r 2 $item.no $null 10 $black $null "center"
    WriteCell $r 3 $item.desc $null 10 $black
    $fmt = "RM {0:N2}" -f $item.price
    WriteCell $r 4 $fmt $null 10 $black $null "right"
    WriteCell $r 5 "1" $null 10 $black $null "center"
    WriteCell $r 6 "lot" $null 10 $black $null "center"
    WriteCell $r 7 $fmt $null 10 $black $null "right"
    $sub2 += $item.price
    $r++
}
$fmtSub2 = "RM {0:N2}" -f $sub2
WriteCell $r 3 "Subtotal - Ceiling Work" $true 10 $black $null "right"
WriteCell $r 7 $fmtSub2 $true 10 $black $null "right"
$r++
$r++

# === SECTION 3: CABINETRY / CARPENTRY WORK ===
MergeCells $r 2 $r 7
WriteCell $r 2 "CABINETRY / CARPENTRY WORK" $true 10 $darkGreen $lightGreen
$r++

$items3 = @(
    @{no=1; desc="Supply and install L-shape kitchen cabinet without top (melamine)"; price=2500.00},
    @{no=2; desc="Supply and install 2-door wardrobe with 1 drawer (plywood)"; price=1200.00}
)
$sub3 = 0
foreach ($item in $items3) {
    WriteCell $r 2 $item.no $null 10 $black $null "center"
    WriteCell $r 3 $item.desc $null 10 $black
    $fmt = "RM {0:N2}" -f $item.price
    WriteCell $r 4 $fmt $null 10 $black $null "right"
    WriteCell $r 5 "1" $null 10 $black $null "center"
    WriteCell $r 6 "lot" $null 10 $black $null "center"
    WriteCell $r 7 $fmt $null 10 $black $null "right"
    $sub3 += $item.price
    $r++
}
$fmtSub3 = "RM {0:N2}" -f $sub3
WriteCell $r 3 "Subtotal - Cabinetry Work" $true 10 $black $null "right"
WriteCell $r 7 $fmtSub3 $true 10 $black $null "right"
$r++
$r++

# === GRAND TOTAL ===
$grand = $sub1 + $sub2 + $sub3
$fmtGrand = "RM {0:N2}" -f $grand
MergeCells $r 2 $r 6
WriteCell $r 2 "GRAND TOTAL  (EXCLUDING SST 8%)" $true 12 $white $darkGreen "right"
WriteCell $r 7 $fmtGrand $true 12 $white $darkGreen "right"
$r++
$r++

# === TERMS ===
MergeCells $r 2 $r 7
WriteCell $r 2 "TERMS & CONDITIONS" $true 10 $white $darkGreen
$r++

$terms = @(
    "All prices quoted are in Malaysian Ringgit (RM)",
    "This quotation is valid for 30 days from the date above",
    "50% deposit is required upon confirmation of work",
    "Final payment to be settled within 14 days after completion",
    "2% monthly interest will be charged for late payment",
    "Price may vary if owner changes design during production",
    "Deposit paid are non-refundable"
)
foreach ($t in $terms) {
    MergeCells $r 2 $r 7
    WriteCell $r 2 $t $null 9 $gray
    $r++
}
$r++

# === PAYMENT BREAKDOWN ===
MergeCells $r 2 $r 7
WriteCell $r 2 "PAYMENT BREAKDOWN" $true 10 $white $darkGreen
$r++

$pay1 = "RM {0:N2}" -f ($grand * 0.5)
$pay2 = "RM {0:N2}" -f ($grand * 0.5)
WriteCell $r 2 $pay1 $null 10 $black $null "center"
WriteCell $r 3 "Deposit upon confirmation of work" $null 10 $black
$r++
WriteCell $r 2 $pay2 $null 10 $black $null "center"
WriteCell $r 3 "Upon completion of work" $null 10 $black
$r++
$r++

# === BANK DETAILS ===
MergeCells $r 2 $r 7
WriteCell $r 2 "BANK DETAILS" $true 10 $white $darkGreen
$r++
MergeCells $r 2 $r 4
WriteCell $r 2 "Maybank: 551539158314 (HS Design)" $null 9
$r++
MergeCells $r 2 $r 4
WriteCell $r 2 "26, Jalan Mutiara Emas 5/4, Taman Mount Austin, 81100 Johor Bahru, Johor" $null 9
$r++
MergeCells $r 2 $r 4
WriteCell $r 2 "Hotline: 011-1688 0145  |  healthspace.lab@gmail.com" $null 9
$r++
$r++

# === FOOTER ===
MergeCells $r 2 $r 7
WriteCell $r 2 "Confidentiality Note: The information provided in this form is for the sole purpose of internal use and will be kept strictly confidential." $null 8 $gray $null

$ws.Range("A1").Select() | Out-Null
$wb.SaveAs("D:\OpenClaw_Home\.openclaw\workspace\projects\hs-design-landing\HS_Design_Quotation_Template.xlsx")
$wb.Close()
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
Write-Host "Done!"
