# Three-year launch model in Excel

The prompt, word for word:

We're deciding whether to launch Kestrine Cold Brew in cans in April 2027. Build me a three-year monthly financial model in Excel: volumes by channel, prices, costs, cash needed and the month we break even, with a low, base and high case I can switch between. What we know so far is in inputs/cold-brew-notes.md; our current numbers are in data/. Save it as cold-brew-model.xlsx.

Everything you need is in this folder: `inputs/`, `brand/` (the brand guide, logos and photos), `data/`. TOOLBOX.md says what is installed; commands here have no network. Work offline: do not search the web or open web pages. GUIDE.md is a guide for this kind of work: follow it. Nobody will answer questions while you work: make sensible choices and note them in NOTES.md. You have 40 minutes. Save the result as `cold-brew-model.xlsx`. Check it with `preview` before you finish.

## The checklist

Written before the runs; each item scores 0, 1 or 2.

1. Inputs on their own sheet; every calculation a live formula (change an input and the outputs move)
2. The low/base/high switch works and changes the answer
3. Break-even month and lowest cash point shown on a summary sheet
4. Both co-packers modelled or the choice explained; the 25,000-can minimum and 120-day shelf life handled
5. Café cannibalisation (30%) and cold-pack shipping loss included
6. No formula errors after recalculation; assumptions written down

## What was in the folder

- `inputs/`: [inputs/](inputs/)
- `brand/`: [kestrine/](../../kestrine/) (not `data/` or `src/`)
- `data/`: [sales-monthly.csv](../../kestrine/data/sales-monthly.csv), [costs-monthly.csv](../../kestrine/data/costs-monthly.csv)
- `GUIDE.md`: [guides/spreadsheet/GUIDE.md](../../guides/spreadsheet/GUIDE.md)
- `TOOLBOX.md`: [TOOLBOX.md](../../TOOLBOX.md)
