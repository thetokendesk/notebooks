# Q3 2026 board deck: notes

`deck.pptx` (12 slides) is built by `python3 build_deck.py`, which reads `data/sales-monthly.csv` and
`data/costs-monthly.csv` and computes every number on the slides. To change something, edit the script and rebuild
rather than editing the .pptx by hand. Speaker notes on each slide give the talking points, the method and the sources.

## Storyline (slide titles)
1. Title: Q3 2026 business review, board meeting Tuesday 24 November 2026
2. Q3 revenue rose 18% to $1.27M; wholesale is the one weak spot
3. Q3 was our best third quarter yet, second only to last year's holiday quarter
4. The airport brought $112K of our $190K growth; wholesale lost $44K
5. After its own staff and rent, the airport café made $169K in Q3
6. Subscriptions grew 70% in a year, to 1,712 bags in September
7. Gross margin rose 3.4 points to 63.1%, mostly because sales moved to the cafés
8. Wholesale lost a third of its sales with the hotel group, and nobody is selling
9. Beyond wholesale, four risks could slow us: coffee costs, churn, the website, staff
10. Cold brew is set for April; $40K in Q1 gets it ready
11. A $1 bag price rise would add about $29K a year if volumes hold
12. Three decisions for the board today, and what happens next (closing slide, with the logo)

## Where the data differs from the notes (please check before Tuesday)
- **"Best Q ever" isn't right.** Q3 2026 ($1,274K) is the best third quarter, but Q4 2025 ($1,306K, the holiday
  quarter) was bigger. The deck says "best third quarter, second only to last year's holiday quarter".
- **"Margin back above 63"**: Q3 gross margin is 63.1% (Q2 was 63.2%). In the data, which starts in January 2024,
  margin has never been above 63% before this year, so the deck says "rose 3.4 points" and avoids "back".
- **Most of the margin gain is mix, not coffee prices.** Of the 3.4 points, about 2.6 come from the channel mix
  (more café sales at about 69% margin, less wholesale at 19%). The other 0.8 come from better margins within
  channels, mainly cheaper green coffee. Method: change in channel shares valued at Q3 2025 channel margins; the
  remainder is the within-channel effect. Rounded so that the two parts add up to 3.4.
- **Wholesale price hasn't changed since January 2024**: $21.50/kg in every month. Its cost per kg went from $13.41
  to $17.35, so its gross margin fell from 38% (Q1 2024) to 19%. The lost hotel volume (about 768 kg a month, about
  $198K a year in revenue) earned only about $38K a year in gross profit at today's margin. That is less than the
  proposed ~$70K salary. The deck shows this on slides 8 and 12 and suggests the lead's brief include raising
  wholesale prices. Decision 1 stays as you wrote it.
- **Downtown wasn't just "steady"**: it grew 16% and added $54K, more than subscriptions ($34K). North Shore grew 11%.

## Assumptions and choices
- **Airport contribution ($169K in Q3; $89K in Q3 2025).** Airport revenue less its cost of goods, less the extra
  rent ($5,400/month, rent went from $14,700 to $20,100 in June 2025), less the extra staff hours since it opened.
  The staff-hours baseline is the 12 months before opening (3,769 h/month). All ~1,128 extra hours a month are
  charged to the airport at each month's average wage, which is generous to the cost side. Shared roastery,
  management and marketing costs are not allocated.
- **$1 bag rise ≈ $29K a year**: last 12 months' volumes (Nov 2025 to Oct 2026: 13,632 online bags + 17,196
  subscription bags; subscription at 10% off, so +$0.90). Break-even volume loss about 10%, from gross profit per bag
  of about $8.57. Online discount codes are ignored. Last rise: March 2025, about $1.87 a bag on the online shop;
  bag volume growth was +25% y/y in Q1 2025 and +29% in Q2 2025, so it did not slow sales.
- **"For (Tom)" and "Against (Maya)"**: your notes give the positions but not the reasons. I wrote the arguments
  from the data. Please check they match what each of you would say.
- **Next steps and owners on slide 12 are my proposals** (role posted in December; cold brew plan at the December
  meeting, as in your notes; final price call by 15 December). Edit them in `build_deck.py` (the `asks` list).
- **Cold brew**: the market review figures aren't in the folder, so no market numbers are quoted. $40K is shown
  against Q3 gross profit ($804K), about 5%.
- **Not in the data**: churn, airport staff turnover, the 41 headcount and the "about 30 accounts" come from your
  notes and the brand guide; no figure for them could be computed.
- `data/README.md` describes `orders-online.csv`, but that file isn't in `data/`. Without it, churn and discount use
  couldn't be checked.
- Q4 2026 has only October, so it's left out of all quarterly charts.
- Date: "next Tuesday" was read as Tuesday 24 November 2026.

## Build notes
- Brand: Rust/Roast/Crema/Sage from BRAND.md, Georgia Bold headlines, Avenir Next body; logo on the title and
  closing slides (placed by height). Photos are cropped to fill, never stretched.
- Charts are native and editable. LibreOffice drew negative bars as positive when individual bars had their own
  colours, so slide 4 uses three overlapping series (airport, other growth, decline) instead.
