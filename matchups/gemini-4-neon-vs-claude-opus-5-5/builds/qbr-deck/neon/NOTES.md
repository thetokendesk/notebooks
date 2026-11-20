# Notes & Decisions — Q3 2026 Board Deck (`deck.pptx`)

## 1. Storyline & Format Choices
- **12 slides (within the 10–12 slide brief):** Structured strictly around Maya's four themes — *how the quarter went* (Slides 2–3), *what's driving it* (Slides 4–7), *what worries me* (Slides 8–9), and *the three board decisions* (Slides 10–12), opening with a title slide and closing with an owner/timeline decision summary.
- **"Charts not tables" & concise executive density:** Built 7 native, editable PowerPoint charts (clustered column, clustered horizontal bar, single-series P&L column, multi-series line, single-series cost/wage lines, and quarterly wholesale cliff column) and zero dense data tables. Every slide sticks to one message, <= 3 short bullets (<= 12 words each), >= 18 pt body text, and >= 12 pt footnotes/labels.
- **Meeting date:** The brief was received on Wednesday, November 18, 2026 ("Our board meets next Tuesday"), so the cover slide is dated **November 24, 2026**.

## 2. Key Analytical Choices & Data Nuances

### "Best quarter ever" vs. Q4 2025 holiday peak (Slides 2–3)
- Maya's raw notes asked whether Q3 (~$1.27M) was the best quarter ever. Computing full quarterly totals from `data/sales-monthly.csv` shows **holiday Q4 2025 revenue was $1,305,968** vs. **Q3 2026 revenue of $1,274,171** (+17.5% YoY).
- However, Q3 2026 **did** set all-time company records for **Gross Profit ($803,728 vs. $798,820 in Q4 2025)** and **Operating Contribution ($437,060 vs. $435,738 in Q4 2025)**.
- To ensure total accuracy in front of the board, Q3 revenue is framed as **best non-holiday quarter ever** while Gross Profit and Operating Contribution are highlighted as **all-time quarterly highs**.

### Definition of Operating Contribution (Slides 2, 3, 10)
- `data/costs-monthly.csv` provides direct operating expenses (`staff_hours × avg_hourly_wage_usd`, `rent_usd`, and `marketing_usd`), without payroll taxes/benefits, corporate overhead, D&A, interest, or taxes.
- We therefore define **Operating Contribution = Gross Profit − (Labor + Rent + Marketing)** and state this explicitly in the slide footnotes rather than over-claiming it as GAAP net income or full EBITDA.

### Proving Airport Café Profitability (Slide 5)
- `data/costs-monthly.csv` is reported company-wide rather than by location, so we isolated Airport's incremental store cost using the clear June 2025 opening step-change:
  - **Incremental rent:** Exactly **+$5,400/mo** ($14,700 -> $20,100; $16,200/quarter), matching Maya's notes.
  - **Incremental direct labor:** Pre-Airport company hours (Jan 2024 – May 2025) averaged a steady **3,772 hrs/mo** (range 3,729–3,817). Post-opening Q3 2026 hours exceeded that baseline by **1,124 hrs/mo** (3,372 hrs/quarter × $18.89/hr = **$63,722/quarter**).
  - **Result:** $249,591 GP − $79,922 est. rent + labor = **$169,669 (~$170K, 47% store contribution margin, ~$57K/mo)**, settling the Maya vs. Tom question in favor of strong profitability (even adding a conservative 30% payroll tax/benefit load still clears ~$151K/quarter).

### Gross Margin Decomposition & Rounding Consistency (Slide 7)
- Decomposing the **+3.4 pt YoY gross margin jump** (59.65% -> 63.08%, exact +3.42 pts) reveals that **75% (+2.55 pts)** came from **channel mix shift** (higher-margin cafés and subscriptions growing while 19%-margin wholesale shrank) and only **25% (+0.87 pts)** came from green coffee easing ($6.08/lb in Q3 '25 to $5.70/lb in Q3 '26).
- Because rounding 2.55 -> 2.6 and 0.87 -> 0.9 would sum to 3.5 instead of 3.4, the component bar displays two-decimal values (`+2.55 pts` and `+0.87`) alongside exact shares (`75%` / `25%`) so all parts reconcile cleanly to the headline `+3.4 pts` gain.
- Snapback risk (~$83K/yr) is computed using Q3 2026 roasted volume (10,594 kg adjusted for ~15.5% roast loss = 27,652 green lbs/quarter, ~110.6K lbs/yr) × the $0.75/lb gap between current $5.70/lb and Feb 2025's $6.45/lb peak.

### Wholesale Margin Squeeze & Conditioning Ask #1 (Slides 8 & 12)
- Computing unit revenue (`revenue_usd / units`) across all 34 months revealed that **March 2025 raised prices across cafés (+$0.35/drink) and retail/subscription bags (+~$2/bag), while Wholesale stayed frozen at $21.50/kg** for the entire period.
- That freeze compressed Wholesale gross margin from **37.6% (Q1 2024)** to **19.3% (Q3 2026)**. As a result, the lost hotel account (~711 kg/mo, ~$183K/yr revenue) carried only **~$35K/yr in gross profit** — meaning a $70K + commission sales lead would need >$363K in new annual sales just to cover base salary at current margins.
- Rather than weakening Maya's hire request, Slides 8 and 12 frame **Ask #1 proactively**: approve the ~$70K + commission sales lead *paired with* a wholesale price reset and April 2027 Cold Brew distribution so the unit economics close cleanly for the board.

### Missing `orders-online.csv` & Use of October 2026 Actuals (Slides 4, 5, 6, 9)
- `data/README.md` documents `orders-online.csv`, but that file was not included in `data/`. This aligns with Maya's note that subscription churn is currently unmeasured; all Online Shop and Subscription metrics are computed from `sales-monthly.csv`, and adding churn analytics is explicitly recommended before any retail bag price increase.
- Both CSVs include **October 2026** alongside Q3 2026 (Jul–Sep). All core Q3 figures remain strictly Jul–Sep 2026, while October 2026 is surfaced selectively as an early Q4 signal: North Shore's post-construction rebound (+10.4% MoM), Subscription reaching 1,789 bags ($30K/mo), avg wage reaching $18.98/hr, and total company YoY growth slowing to +7.1% once Airport lapped its full-ramp Oct 2025 base.

### Bag Pricing Debate — Ask #3 (Slide 11)
- Based on Q3 2026 annualized bag volume (19,796 subscription bags × $0.90 net of SUB10 + 12,736 online shop bags × $1.00 = **$30,552/yr**, rounded to **~$31K/yr**), a +$1 list increase offsets roughly one year of wage inflation (+$0.54/hr YoY ≈ $32K/yr).
- However, at current unit gross profits ($8.23/bag subscription, $9.22/bag online), just **~10% volume or retention loss** (9.9% sub / 9.8% online) completely erases the gain. Both Tom's and Maya's cases are shown transparently, leading to a clear recommendation aligned with Maya's instinct: hold January retail bags, build churn tracking, reset wholesale prices first, and revisit retail bags only if green coffee exceeds $6.25/lb.

## 3. Brand & Quality Verification
- **Strict palette compliance:** Used only the five colors from `brand/BRAND.md` (`#B4532A` Kestrel Rust, `#2B1D16` Roast, `#F3E9DC` Crema, `#7A8B6F` Sage, and `#9DB7C9` Sky restricted to chart comparisons only).
- **Typography & assets:** `Georgia` Bold for headlines and KPI numbers; `Avenir Next` and `Avenir Next Demi Bold` for all body text, footers, and native chart text; `brand/logo-dark.png` on dark Roast backgrounds (Slides 1 and 12) placed by height only with clear space exceeding the kestrel mark's height; five photos (`cafe-downtown.jpg`, `airport-cafe.jpg`, `subscription-box.jpg`, `cold-brew-cans.jpg`, `bags-lineup.jpg`) cropped cleanly without distortion.
- **Visual inspection (`preview`):** Ran three full `preview deck.pptx` visual passes across all 12 slides, fixing Georgia oldstyle numeral descender clearance (Slides 2, 4, 6, 8, 10), horizontal bar legend placement (Slide 4), rectangle drop shadows (global), card text wrapping (Slides 7, 10, 11, 12), and single-point label styling (Slide 7) until every slide rendered cleanly with zero overlaps or clipping.
