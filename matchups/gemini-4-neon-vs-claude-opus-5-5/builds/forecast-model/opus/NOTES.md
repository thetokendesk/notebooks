# Kestrine Cold Brew model: notes

`cold-brew-model.xlsx`. It runs for 36 months, April 2027 to March 2030. It is built by `build/build_model.py`, so fix the script and rebuild rather than editing the workbook.
It opens on the **Base** case with **Riverbend**. Switch the case in `Inputs!C2` (Low/Base/High) and the co-packer in `Inputs!C3`.

## Results (operating profit is after the iced coffee margin the cafés lose)

| Case | Co-packer | Cash needed | Break-even | Payback | Cash, Mar 2030 | Cans thrown away |
|---|---|---|---|---|---|---|
| Low | Blue Ridge | $276k | never | never | ($272k) | 57% |
| Low | Riverbend | $136k | never | never | ($136k) | 1% |
| **Base** | **Riverbend** | **$43k** (Jun 2027) | **Jul 2027** | **Sep 2028** | **$95k** | 0% |
| Base | Blue Ridge | $60k (Jul 2027) | Jul 2027 | Aug 2028 | $103k | 13% |
| High | Riverbend | $39k | Jul 2027 | Jan 2028 | $315k | 0% |
| High | Blue Ridge | $46k | Jul 2027 | Jan 2028 | $401k | 0.2% |

How these were checked: LibreOffice can't run inside my sandbox, so `build/check.py` (from GUIDE.md) could not run here. Instead I rendered the workbook with `preview`. I also re-ran the same logic in plain Python (`build/shadow.py`). For Base/Riverbend the two agree to the dollar: $43,127 needed, $94,542 at March 2030, $104,770 operating profit and 289,316 cans. The other five rows come from `shadow.py`. I did not render the workbook in each of those cases, so flip the switches in Excel to confirm them.

**Why Riverbend is the default.** At launch volumes, Blue Ridge's 25,000-can minimum is about 3 to 6 months of sales. With a 3-month selling window, about 13% of the cans it makes get thrown away in Base and 57% in Low. Riverbend costs $0.23 more a can but needs about $17k less cash, and it keeps the downside half as bad. Blue Ridge comes out ahead once sales reliably reach roughly 8,000+ cans a month (High case, or Base from year 2). A sensible plan is to start with Riverbend and move later.

**What drives it.** Online carries the line: about $1.50 margin a can after $11 shipping with Riverbend ($1.70 with Blue Ridge). Café cans earn more each but are few, and 30% of them replace an iced coffee. Wholesale and grocery earn about $0.90 to $1.00 a can with Riverbend. Fixed costs are $6,800 a month after launch. In the Low case volumes never cover them.

## Choices I made (all are inputs on the Inputs sheet, with sources)

- **Low / High ranges** are my judgement around Tom and Maya's guesses. They are roughly ±25% on café cans, ±50 boxes on online and ±1,000 cans a month on wholesale. Low also has slower ramps, no grocery deal, coffee at $17/kg, $12.50 shipping and 60-day payment terms.
- **Grocery is in Base** (signed, from month 4, 1,500 cans a month), as the notes guess. Low has no grocery deal. To test Base without it, set `Grocery stores sign` to 0.
- **Online growth slows after month 12** (Base 2% a month, not 5%). Five percent compounding for 3 years would make cold brew bigger than today's whole online shop. Data shows shop bags growing 1.0% a month since Jan 2024 and subscription bags 4.5%, so 2% sits between them.
- **Wholesale goes flat at 2,500 a month** after month 6. The notes say nothing after that, and wholesale coffee shrank after the hotel account left in April 2026.
- **Iced coffee lost:** 30% of café cans lose a sale with "about the same margin" (Tom). I charge each one the can's own café margin. Data puts an average café drink at $3.76 margin against about $3.15 for a can, so this is if anything slightly generous.
- **Shelf life:** 120 days. Base and Low sell a can for 3 months after it is made, leaving about 30 days for the buyer. High sells to the date (4 months). Waste is first-in-first-out by month.
- **Production:** a run happens when opening stock won't cover the month. Each run is two months' sales or the co-packer minimum, whichever is larger. Cans and sleeves are bought in 50,000 lots, a $7,500 cash outlay. Can quantities are rounded to whole cans so stock maths is exact.
- **Cash timing:** cafés and online pay on the day. Wholesale and grocery pay 1 month later (Low 2). Runs, sleeves, design and the Blue Ridge deposit are paid when they happen. Pre-launch spend (design, deposit, first run) sits in April 2027 rather than Feb–Mar, which doesn't change the peak cash need.
- **Coffee cost:** I kept the notes' $15.20/kg. The Data sheet implies $14.96/kg from October 2026 green prices and roast loss, so they agree.
- **Break-even** = first month with an operating profit. **Payback** = first month cumulative cash is back to zero. The Summary also counts any loss-making months after break-even (Base: none).

## Left out (would change the answer)

- Night Shift Decaf in year 2. A second flavour needs its own runs and its own 50,000 sleeves, so it adds cash need.
- Summer seasonality for online, wholesale and grocery. The notes only give it for cafés.
- Price or cost inflation, tax, and any roastery capacity limit. Cold brew needs about 250–570 kg of coffee a month against about 3,600 kg roasted now.
- Lead times (6 vs 3 weeks) are only noted. The model assumes runs are planned ahead, with no forecast error and no safety stock.
- `data/README.md` mentions `orders-online.csv`, but that file isn't in `data/`. Nothing in the model needs it.
