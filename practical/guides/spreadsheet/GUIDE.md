# Spreadsheet models (.xlsx)

## What good looks like

- The reader changes one assumption and every result updates. Nothing is typed in twice.
- The first sheet answers the question in a few numbers and one chart; the detail sits behind it.
- Inputs look different from formulas. Every assumption names its source. Totals reconcile, and a cell says so.
- Numbers read cleanly: thousands separators, currency, percentages, negatives in brackets, no 0.714285714.

## Structure

1. **Summary**: key outputs linked from the model (never retyped), the active scenario, one or two charts, the
   "all checks pass" flag.
2. **Inputs**: one assumption per row (name, unit, source, a value per scenario, the Live value); raw data on **Data**.
3. **Model** (or one sheet per block: Revenue, Costs, Cash): calculations only, time left to right, one row per line
   item, a total column. One formula per row, the same shape in every period column.
4. **Checks**: tests that must be TRUE (totals equal their parts, a valid scenario name) and one cell ANDing them.

- Every calculated cell is a formula. Never write a number you computed in code; let the sheet compute it.
- Formulas reference inputs and contain no numbers except 0, 1, 12 and 100: `=B2*Inputs!$G$7`, never `=B2*28`.
- Scenarios: a switch cell with a Low/Base/High dropdown and a Live column
  `=INDEX(D5:F5,MATCH($C$2,$D$4:$F$4,0))`. The model reads only Live.
- Inputs blue on pale yellow, formulas black, links from other sheets green, under any brand guide too.
- Formats: money `$#,##0;($#,##0);"-"`, prices `$0.00`, counts `#,##0`, rates `0.0%`. Units in labels or headers.
- Headers bold with a bottom border, totals bold, labels 20 to 30 wide, numbers 12 to 14, panes frozen. Brand
  font on every cell, the dark brand colour for titles, the accent for the series that matters.
- Print setup landscape, one page wide: the preview prints each sheet, so this decides what you see.

## Build recipe (openpyxl)

openpyxl writes formulas without results: the spreadsheet app computes them on open, and reading the file back with
openpyxl gives formula text, not numbers. Only `preview` and `check.py` (below) recalculate and show results.
Use openpyxl by default; XlsxWriter stores 0 as every formula's result, which shows wherever nothing recalculates.

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Border, Side
from openpyxl.chart import BarChart, Reference
from openpyxl.worksheet.datavalidation import DataValidation

FONT, ACCENT, DARK = "Helvetica Neue", "E07A1F", "1F3A5F"              # set these from the brand guide
def font(color="000000", bold=False, size=11): return Font(name=FONT, color=color, bold=bold, size=size)
INPUT = (font("0000FF"), PatternFill("solid", fgColor="FFF2CC"))      # blue on pale yellow: typed-in inputs
LINK = font("008000")                                                  # green: pulled from another sheet
USD, USD2, INT, PCT = '$#,##0;($#,##0);"-"', "$0.00", "#,##0", "0.0%"
YEAR_COLS = "BCD"                                                      # one column per year; total in E

wb = Workbook()
inp = wb.active; inp.title = "Inputs"
inp.append(["Assumptions (blue cells are inputs; change only these)"])
inp.append(["Scenario", "", "Base"])
dv = DataValidation(type="list", formula1='"Low,Base,High"'); inp.add_data_validation(dv); dv.add("C2")
inp.append([]); inp.append(["Assumption", "Unit", "Source", "Low", "Base", "High", "Live"])
rows = [("Rentals, year 1", "rentals", 9000, 12000, 15000, INT, "Brief, p.2: first-site results"),
        ("Rental growth a year", "%", 0.05, 0.12, 0.20, PCT, "Assumption: city bike-trail data"),
        ("Average price per rental", "$", 24, 28, 32, USD2, "rentals.csv, 2026 average"),
        ("Cost per rental", "$", 9, 8, 7, USD2, "costs.csv: repairs and cleaning"),
        ("Opening marketing, year 1", "$", 30000, 25000, 20000, USD, "Brief"),
        ("Fixed costs a year", "$", 120000, 120000, 120000, USD, "Brief: lease and two staff")]
ref = {}
for r, (name, unit, lo, base, hi, fmt, src) in enumerate(rows, start=5):
    inp.append([name, unit, src, lo, base, hi, f"=INDEX(D{r}:F{r},MATCH($C$2,$D$4:$F$4,0))"])
    for col in "DEFG": inp[f"{col}{r}"].number_format = fmt
    for col in "DEF": inp[f"{col}{r}"].font, inp[f"{col}{r}"].fill = INPUT
    ref[name] = f"Inputs!$G${r}"
inp["C2"].font, inp["C2"].fill = INPUT

m = wb.create_sheet("Model")
m.append(["$ unless stated"] + [f"Year {y}" for y in range(1, len(YEAR_COLS) + 1)] + ["Total"])
lines = [("Rentals", INT, lambda c, y: f"={ref['Rentals, year 1']}*(1+{ref['Rental growth a year']})^({y}-1)"),
         ("Revenue", USD, lambda c, y: f"={c}2*{ref['Average price per rental']}"),
         ("Direct costs", USD, lambda c, y: f"=-{c}2*{ref['Cost per rental']}"),
         ("Gross profit", USD, lambda c, y: f"={c}3+{c}4"),
         ("Marketing", USD, lambda c, y: f"=IF({y}=1,-{ref['Opening marketing, year 1']},0)"),
         ("Fixed costs", USD, lambda c, y: f"=-{ref['Fixed costs a year']}"),
         ("Operating profit", USD, lambda c, y: f"=SUM({c}5:{c}7)")]
for r, (label, fmt, formula) in enumerate(lines, start=2):
    m.cell(r, 1, label)
    for y, col in enumerate(YEAR_COLS, start=1):
        m.cell(r, y + 1, formula(col, y)).number_format = fmt
    m.cell(r, 5, f"=SUM(B{r}:D{r})").number_format = fmt

ck = wb.create_sheet("Checks")
for row in (["Check", "Pass?"], ["Gross profit = revenue + direct costs", "=ABS(Model!E5-Model!E3-Model!E4)<0.01"],
            ["Total = sum of the years", "=ABS(Model!E8-SUM(Model!B8:D8))<0.01"],
            ["Scenario name is valid", "=COUNTIF(Inputs!D4:F4,Inputs!C2)=1"], ["All checks pass", "=AND(B2:B4)"]):
    ck.append(row)

s = wb.create_sheet("Summary", 0)
s.append(["New rental station: three-year view"]); s.append(['="Scenario: "&Inputs!C2']); s.append([])
for label, f, fmt in [("Revenue, 3 years", "=Model!E3", USD), ("Operating profit, 3 years", "=Model!E8", USD),
                      ("Gross margin", "=Model!E5/Model!E3", PCT), ("All checks pass", "=Checks!B5", "General")]:
    s.append([label, f]); s.cell(s.max_row, 2).number_format = fmt; s.cell(s.max_row, 2).font = LINK
chart = BarChart(); chart.title = "Revenue and operating profit by year"; chart.y_axis.numFmt = "$#,##0"
for row, color in ((3, DARK), (8, ACCENT)):
    chart.add_data(Reference(m, min_col=1, max_col=4, min_row=row), from_rows=True, titles_from_data=True)
    chart.series[-1].graphicalProperties.solidFill = color
chart.set_categories(Reference(m, min_col=2, max_col=4, min_row=1))
chart.width, chart.height = 18, 8
s.add_chart(chart, "A9")

def finish(ws, widths, header_row=None):
    for i, w in enumerate(widths): ws.column_dimensions["ABCDEFG"[i]].width = w
    for row in ws.iter_rows():
        for c in row:
            if c.font.name != FONT: c.font = font(bold=c.font.bold)  # unstyled cells get the brand font
    if header_row:
        for c in ws[header_row]: c.font, c.border = font(bold=True), Border(bottom=Side("thin"))
        ws.freeze_panes = ws.cell(header_row + 1, 2)
    ws.page_setup.orientation = "landscape"                           # one page wide, so preview shows it whole
    ws.sheet_properties.pageSetUpPr.fitToPage = True; ws.page_setup.fitToWidth, ws.page_setup.fitToHeight = 1, 0
for ws in (s, inp): ws["A1"].font = font(DARK, bold=True, size=14)
finish(s, [30, 16]); finish(inp, [28, 8, 32, 12, 12, 12, 12], 4); finish(m, [20, 14, 14, 14, 14], 1); finish(ck, [40, 10], 1)
for r in (5, 8):
    for c in m[r]: c.font = font(bold=True)
wb.save("model.xlsx")
```

Chart from Model ranges, never typed copies; colour each series (`graphicalProperties.solidFill`) and set a font
on every cell, or the default palette and Calibri show through.

## Read the computed values

`preview` shows the sheets after LibreOffice recalculates them. For the numbers as data and a list of error cells,
save this as `check.py` and run `python3 check.py model.xlsx` (it forces a full recalculation, XlsxWriter too).

```python
# Recalculate the workbook in LibreOffice and print every error cell and the summary values.
import openpyxl, os, subprocess, sys, tempfile
src = sys.argv[1]
FORCE_RECALC = """<?xml version="1.0" encoding="UTF-8"?><oor:items xmlns:oor="http://openoffice.org/2001/registry">
<item oor:path="/org.openoffice.Office.Calc/Formula/Load"><prop oor:name="OOXMLRecalcMode" oor:op="fuse"><value>0</value></prop></item>
</oor:items>"""
with tempfile.TemporaryDirectory() as tmp:
    os.makedirs(f"{tmp}/p/user"); open(f"{tmp}/p/user/registrymodifications.xcu", "w").write(FORCE_RECALC)
    subprocess.run(["soffice", f"-env:UserInstallation=file://{tmp}/p", "--headless", "--convert-to", "xlsx",
                    "--outdir", f"{tmp}/out", src], check=True, capture_output=True)
    wb = openpyxl.load_workbook(f"{tmp}/out/{os.path.basename(src)}", data_only=True)
errors = [f"{ws.title}!{c.coordinate} {c.value}" for ws in wb for row in ws.iter_rows() for c in row
          if isinstance(c.value, str) and c.value.startswith("#")]
print("errors:", errors or "none")
[print(r) for r in wb.worksheets[0].iter_rows(max_row=15, values_only=True) if any(v is not None for v in r)]
```

## Common failures and how to catch them

- **#REF!, #NAME?, #DIV/0!, #VALUE!**: a wrong sheet name, a row off by one, a function the app lacks, a zero
  denominator. `check.py` lists them by cell. Fix the generator, never the cell.
- **Plausible but wrong totals** from a formula pointing at the wrong row. Work two outputs out by hand from the
  inputs and compare them with `check.py`.
- **A switch that changes nothing.** Save a copy with each scenario selected and run `check.py` on each; outputs
  must move in the expected direction.
- **Hard-coded numbers** inside formulas or typed-in totals. Read your formula strings for stray digits.
- In the preview: `###` means a column too narrow; a sheet split over pages needs landscape and fit to width;
  a raw 1133798.4 is a numeric cell without a number format.

## Self-check loop

1. Build from the script; fix the script, never the .xlsx.
2. `python3 check.py model.xlsx`: no error cells, plausible outputs, all checks TRUE. Repeat for each scenario.
3. `preview model.xlsx` and open every PNG: formats, widths, colours, chart, nothing cut off.
4. Fix, rebuild, repeat until a full pass finds nothing.

## Checklist

- [ ] Summary first: linked outputs, scenario name, chart, checks flag.
- [ ] Every assumption on Inputs with unit and source, blue on yellow; every other number a formula on them.
- [ ] Scenario switch works (the model reads only Live); checks reconcile and all are TRUE.
- [ ] Number formats on every numeric cell; widths fit; panes frozen; brand font and colours.
- [ ] `check.py` shows no errors; `preview` run on the final file and every PNG looked at.
