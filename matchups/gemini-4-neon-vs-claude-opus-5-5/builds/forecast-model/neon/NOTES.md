# Kestrine Cold Brew Financial Model — Notes & Modeling Choices

Prepared for Maya Okafor and Tom Reyes (November 2026) to accompany [cold-brew-model.xlsx](cold-brew-model.xlsx).

---

## 1. Headline Findings (Board Summary)

Under our **Base Case** with the recommended **Hybrid** co-packer strategy (starting on Riverbend's 8,000-can minimum and switching to Blue Ridge's 25,000-can minimum once 4-month demand reaches 25,000 cans):

- **Peak cash needed (incremental, net of café cannibalization):** **$59,282** in **June 2027** (Month 3, at the end of the $25,000 launch marketing push and the first 25,000-can Blue Ridge run). For context, Kestrine's existing business generated ~$134,000/month in operating cash proxy in Jan–Oct 2026 (`data/sales-monthly.csv`, `data/costs-monthly.csv`), so the launch is easily self-fundable.
- **Cash payback month (cumulative cash ≥ $0 permanently):** **June 2028 (Month 15)** incremental; **May 2028 (Month 14)** on a standalone cold brew basis (ex-cannibalization).
- **Monthly operating breakeven (incremental EBIT > $0 permanently):** **July 2027 (Month 4)** — the first month grocery starts and launch marketing steps down from $8,333/mo to $3,000/mo.
- **3-Year Revenue / Incremental Operating Profit / Ending Cash:** **$986,024** revenue (`325,660` cans), **$219,882** incremental EBIT (`22.3%` margin; `$248,696` standalone before `$28,814` café cannibalization), and **$197,613** cumulative net cash.

### Scenario & Co-Packer Matrix (Incremental Basis, Net of Café Cannibalization)

| Scenario | Co-Packer | Grocery Signed? | 3-Yr Revenue | 3-Yr Inc. EBIT | Peak Cash Needed | Cash Payback | Expired Cans |
|---|---|---|---|---|---|---|---|
| **Low** | **Hybrid** | No | $506,104 | ($74,515) | $93,319 (Feb 2030) | Not in 3 yrs | 0 (0.0%) |
| Low | Riverbend | No | $506,104 | ($74,515) | $93,319 (Feb 2030) | Not in 3 yrs | 0 (0.0%) |
| Low | Blue Ridge | No | $506,104 | ($101,951) | $127,364 (Dec 2029) | Not in 3 yrs | 66,953 (29.8%) |
| **Base** | **Hybrid** | Yes (M4) | **$986,024** | **$219,882** | **$59,282 (Jun 2027)** | **Jun 2028 (M15)** | **495 (0.1%)** |
| Base | Riverbend | Yes (M4) | $986,024 | $138,185 | $43,968 (Jul 2027) | Aug 2028 (M17) | 0 (0.0%) |
| Base | Blue Ridge | Yes (M4) | $986,024 | $215,441 | $50,304 (Jun 2027) | Jul 2028 (M16) | 7,056 (2.0%) |
| **High** | **Hybrid** | Yes (M4) | $1,686,562 | $599,276 | $44,309 (Apr 2027) | Nov 2027 (M8) | 0 (0.0%) |
| High | Riverbend | Yes (M4) | $1,686,562 | $465,549 | $32,431 (May 2027) | Dec 2027 (M9) | 0 (0.0%) |
| High | Blue Ridge | Yes (M4) | $1,686,562 | $599,276 | $44,309 (Apr 2027) | Nov 2027 (M8) | 0 (0.0%) |

**Key strategic takeaway:** Do **not** sign Blue Ridge's 25,000-can minimum on Day 1. In the Base case, total demand in the first 120 days (Apr–Jul 2027) is only `17,944` cans — leaving `7,056` cans expired past shelf life if produced at Blue Ridge from launch. Starting with **Riverbend** (8,000-can runs, $0 deposit, 3-week lead time) de-risks launch and protects Kestrine if grocery stores do not sign (avoiding ~67,000 spoiled cans in the Low case), while switching to **Blue Ridge** once 4-month demand crosses `25,000` cans captures ~$76k of 3-year cash savings versus staying with Riverbend.

---

## 2. Modeling Choices & Assumptions Made

Where `inputs/cold-brew-notes.md` did not specify exact mechanics, we made the following transparent, editable choices (all controlled on the `Inputs` tab):

1. **Timeline (Pre-Launch + 36 Operating Months):**
   - The forecast runs from **April 2027 (M1) through March 2030 (M36)**, preceded by a **Pre-Launch (`M0`)** column to capture upfront outlays required before April 1: one-time can design & sleeve artwork (`$8,000`), the initial 50,000-sleeve MOQ purchase (`$7,500`), and—if Blue Ridge is active in Month 1—the `$12,000` signing deposit.
   - Calendar days per month use `DAY(EOMONTH(date, 0))`, automatically accounting for the 2028 leap year (Feb 2028 = 29 days).

2. **Co-Packer Switch & 120-Day FIFO Shelf-Life Aging:**
   - Added a second dropdown switch (`Inputs!D4`: **Hybrid**, **Riverbend**, **Blue Ridge**) alongside the **Scenario** switch (`Inputs!D3`: **Low**, **Base**, **High**).
   - `Operations` models **exact 4-month FIFO inventory aging** (Age 1 = 0–30 days through Age 4 = 91–120 days). Any cans remaining in Age 4 after month-end sales automatically expire and are written off in P&L (`Spoilage write-off`).
   - Production triggers automatically whenever beginning good inventory is below monthly demand, ordering `MAX(minimum run, shortfall)`.
   - **Blue Ridge deposit timing:** The `$12,000` signing deposit hits cash one month prior to the first Blue Ridge run (reflecting the 6-week lead time) and is credited evenly (`$6,000` each) against Blue Ridge Runs 1 and 2.
   - **Sleeve 50,000 MOQ:** Sleeves are purchased in 50,000-unit cash batches (`$7,500`) whenever remaining sleeve stock is below a production run, while expensed into finished goods COGS at `$0.15/can` as cans are sold or spoiled.

3. **Café Cannibalization Anchored to Actual Data (`data/sales-monthly.csv`):**
   - The model presents **both** standalone Cold Brew results and **Incremental (board decision)** results net of displaced café iced coffee sales.
   - In `data/sales-monthly.csv`, Kestrine's three cafés averaged a **$5.45** drink price and **69.0% gross margin** across Jan–Oct 2026 (`Data!C6`, linked live into `Inputs`).
   - Matching Tom's observation (*"30% of cans sold in cafés would have been an iced coffee anyway, at about the same margin"*), each displaced iced coffee is valued at `$4.50` retail × (`69.0%` actual café GM − `3.0%` card fee) = **$2.97 lost net contribution per displaced drink**. Cannibalization is `30%` in Base, `40%` in Low, and `20%` in High.

4. **Online Shipping & Payment Processing Fees:**
   - Online 12-packs are modeled gross: `$36.00` product revenue + `$9.00` shipping revenue (`$45.00` gross card charge), with `$11.00/box` cold-pack shipping cost in Direct Costs (`$2.00/box` net shipping subsidy).
   - Modeling shipping gross ensures the `3.0%` card processing fee applies accurately to the full `$45.00` charged to the customer's card (and to `$4.50` café retail sales). Wholesale and grocery are billed on invoice with no card fee.

5. **Years 2–3 Volume Trajectories:**
   - **Cafés:** Base starts at `40 cans/day` (May–Sep) and `20 cans/day` (Oct–Apr), growing `4%/yr` in Years 2–3 (`0%` Low, `8%` High) — conservative relative to Kestrine's 10%+ YoY café drink growth in 2024–2026 (`data/sales-monthly.csv`).
   - **Online:** Base starts at `150` boxes/mo growing `5.0%/mo` throughout Year 1 (aligned with Kestrine's `4.5%/mo` sustained subscription growth in 2024–2026), moderating to `2.5%/mo` in Years 2–3 as volume scales (`2.5%/1.5%` Low; `7.0%/3.5%` High).
   - **Wholesale:** Linear ramp from `500` cans in M1 to `2,500` in M6 (Base), then steady `1.5%/mo` growth in M7–M36 (`0.5%` Low, `2.5%` High) as Kestrine expands across its ~30+ restaurant and office accounts.
   - **Grocery:** Explicitly tied to a `1/0` toggle (`Local grocery stores signed?`). Set to `1` (signed from M4 at `1,500` cans/mo, growing `1.0%/mo`) in Base, `0` (not signed) in Low to isolate contract risk, and `1` (`2,250` cans/mo, `2.0%/mo`) in High.

6. **Working Capital (B2B Accounts Receivable):**
   - Wholesale and grocery revenues assume standard **Net-30 payment terms** (`30` days on `Inputs`), while café and online card sales settle immediately. Setting `Wholesale & grocery payment terms` to `0` converts B2B sales to cash-on-delivery.
   - The `Checks` sheet verifies an **exact penny-level accounting bridge**: `3-Year Cumulative Incremental Cash == 3-Year Incremental EBIT (incl. M0 artwork) − Ending Finished Goods Inventory ($) − Ending Sleeve Inventory ($) − Ending A/R ($) − Ending Uncredited Deposit ($)`.

7. **Roasted Coffee Cost & Roaster Capacity (`data/costs-monthly.csv`):**
   - In `data/costs-monthly.csv`, Oct 2026 green coffee is `$5.70/lb` with `16.0%` roast loss, implying `$14.96/kg` green-only cost — closely confirming the brief's `$15.20/kg` roasted Hover House cost (allowing ~$0.24/kg for roasting energy/handling).
   - Because green coffee peaked at `$6.45/lb` in Feb 2025 (`$16.93/kg` green-only), the **Low** case tests `$16.50/kg` roasted coffee cost, **Base** uses `$15.20/kg`, and **High** uses `$14.20/kg`.
   - Kestrine roasted a demonstrated peak of `4,385 kg/mo` in Dec 2025 before losing its hotel wholesale account in Apr 2026, dropping to a `3,513 kg/mo` average (May–Oct 2026) — leaving **~872 kg/mo of spare roasting capacity**. Cold Brew requires at most `366 kg/mo` in Base (`42.0%` of spare capacity) and `726 kg/mo` in High (`83.2%`), confirming **no new roaster capital expenditure is required**.

8. **Exclusion of Night Shift Decaf (Year 2 Option):**
   - `inputs/cold-brew-notes.md` mentions *"maybe add Night Shift Decaf in year two."* We intentionally kept the launch model focused on the single **Original (Hover House Blend)** SKU.
   - Decaf typically accounts for ~10–15% of RTD cold brew demand. At Base Year 2 scale (~9,300 cans/mo total), decaf demand would be only ~900–1,400 cans/mo (~3,600–5,600 cans per 120-day shelf-life window), falling short of even Riverbend's 8,000-can minimum run and requiring a separate 50,000-sleeve order (`$7,500`) and artwork. We recommend revisiting Night Shift Decaf only once total Original volume exceeds ~15,000+ cans/month.

---

## 3. Workbook Structure & How to Use

- **`Summary`**: Executive board dashboard — active scenario & audit badge, 6 headline KPIs, annual P&L / volume / cash summary, Blue Ridge vs. Riverbend unit-cost & shelf-life comparison, and two charts (Cumulative Cash Flow and Annual Revenue by Channel).
- **`Inputs`**: Single source of truth for all assumptions. **Blue text on pale yellow** = editable inputs; **green text** = cross-sheet links from `Data`; **black text** = formulas. Change `Inputs!D3` (`Low` / `Base` / `High`) or `Inputs!D4` (`Hybrid` / `Riverbend` / `Blue Ridge`) to recalculate the entire workbook automatically.
- **`Revenue`**: Monthly calendar drivers, channel volumes, gross revenue, mix, and roaster capacity check (`Apr 2027`–`Mar 2030`).
- **`Operations`**: Co-packer run selection, exact 4-month FIFO shelf-life aging & spoilage, 50k-MOQ sleeve inventory, weighted-average inventory valuation, and Blue Ridge deposit/credit schedule.
- **`Cash_PL`**: Monthly accrual P&L, café cannibalization bridge, Net-30 working capital & direct cash flow statement, and permanent payback/breakeven flags.
- **`Checks`**: 11 automated integrity and accounting reconciliation checks (`Checks!B15` = `TRUE` across all 9 Scenario × Co-Packer combinations).
- **`Data`**: Raw monthly historicals from `data/costs-monthly.csv` and `data/sales-monthly.csv` plus live benchmark formulas feeding the model.
