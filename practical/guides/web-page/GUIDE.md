# Web pages (one HTML file)

## What good looks like

- Opens from the folder with no network and works: every style, script, font choice, image and data point is inside
  the file or beside it. No CDN links, no external fonts, no lorem ipsum, no placeholder images.
- Reads well at 1440 and 390 px: no sideways scrolling, no text out of its box, tap targets 44 px tall or more.
- The first screen says what this is and what to do (a landing page), or shows the key number (a dashboard).
- Every word and number comes from the inputs. Controls do what they say: a filter changes the numbers and charts.
- Contrast passes (body text 4.5:1 against its background, large text 3:1); every image has alt text.

## Rules

- **Layout**: one centred column, `max-width` 1080 to 1200 px, side padding 24 px (16 px on phones). CSS grid or
  flex, collapsing to one column below 760 px. Spacing on an 8 px scale (8, 16, 24, 32, 48, 64, 96).
- **Type**: body 16 to 18 px, line height 1.5, lines under 70 characters (`max-width: 60ch`). Headings by
  `clamp()`, for example `clamp(28px, 4vw, 40px)` for h1. Two typefaces at most. Use real `h1` to `h3` in order.
- **Brand**: colours as CSS variables in `:root`, taken from the brand guide; the accent for one thing per screen
  (the main button, the series that matters). Brand fonts by name with a system fallback
  (`"Helvetica Neue", Arial, sans-serif`). Logo as a relative `<img>` or a data URI, never stretched.
- **Images**: relative paths, or data URIs when it must be one file (resize to 1600 px wide, JPEG quality 80
  first). `object-fit: cover` with a fixed `aspect-ratio` crops without distortion.
- **Landing page**: a hero with a headline stating the benefit, one supporting line, one primary button and a real
  picture; three to five sections (how it works, proof, offer, questions); the call to action again at the end.
  Headlines in the brand's voice and concrete, with a number when there is one.
- **Dashboard**: a takeaway headline; the key numbers as tiles first; then charts, one question each, titled with
  what they show; filters above them that change tiles and charts together. Data read from the CSV at build time
  and embedded as JSON. Number formats people read: $2.09M, 73K, Jan.
- **Charts**: copy `node_modules/chart.js/dist/chart.umd.js` into a `<script>` in the page. Put each canvas in a box
  with a fixed height and set `maintainAspectRatio: false`. Turn animation off so screenshots show the final state.

## Build recipe

Generate the page from a script that reads the inputs:

```python
# build_page.py: one HTML file with the data and the chart library inside it, so it works offline.
import csv, json
rows = [dict(r, rentals=int(r["rentals"]), revenue_usd=float(r["revenue_usd"])) for r in csv.DictReader(open("rentals.csv"))]
chartjs = open("node_modules/chart.js/dist/chart.umd.js").read().replace("</script", "<\\/script")

html = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rentals 2026</title>
<style>
  :root { --ink: #1F3A5F; --accent: #E07A1F; --muted: #5B6B7A; --line: #D9DEE3; --bg: #F7F7F2; }  /* brand */
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.5 "Helvetica Neue", Arial, sans-serif; }
  main { max-width: 1120px; margin: 0 auto; padding: 32px 24px 64px; }
  h1 { font: 700 clamp(28px, 4vw, 40px)/1.15 Rockwell, serif; margin: 0 0 8px; }
  .lede { color: var(--muted); margin: 0 0 24px; max-width: 60ch; }
  .filters { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 24px; }
  select { font: inherit; padding: 8px 12px; border: 1px solid var(--line); border-radius: 6px; background: #fff; }
  .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
  .kpi, .card { background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 20px; }
  .kpi b { display: block; font-size: clamp(22px, 5vw, 40px); line-height: 1.1; }
  .kpi span, .card p { color: var(--muted); font-size: 14px; }
  .grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
  .card h2 { font-size: 18px; margin: 0 0 12px; }
  .chart { position: relative; height: 300px; }   /* the canvas fills this box; never let it size itself */
  @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } main { padding: 20px 16px; } .kpi { padding: 14px; } }
</style></head><body><main>
<h1>E-bikes carried revenue growth in 2026</h1>
<p class="lede">Monthly rentals and revenue by station and bike type, January to December 2026 (rentals.csv).</p>
<div class="filters"><label>Station <select id="station"></select></label>
  <label>Bike type <select id="type"></select></label></div>
<section class="kpis">
  <div class="kpi"><b id="k-rev"></b><span>Revenue</span></div>
  <div class="kpi"><b id="k-rentals"></b><span>Rentals</span></div>
  <div class="kpi"><b id="k-avg"></b><span>Average per rental</span></div></section>
<section class="grid">
  <div class="card"><h2>Revenue by month</h2><div class="chart"><canvas id="byMonth" role="img" aria-label="Revenue by month"></canvas></div></div>
  <div class="card"><h2>Revenue by bike type</h2><div class="chart"><canvas id="byType" role="img" aria-label="Revenue by bike type"></canvas></div></div>
</section></main>
<script>__CHARTJS__</script>
<script>
const ROWS = __DATA__, ACCENT = "#E07A1F", COLOR = { "Classic": "#8A9BA8", "E-bike": ACCENT, "Kids": "#1F3A5F" };
const $ = id => document.getElementById(id);
const money = v => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 }).format(v);
const month = m => new Date(m + "-01T12:00").toLocaleString("en-US", { month: "short" });
for (const [id, key] of [["station", "station"], ["type", "bike_type"]]) {
  $(id).innerHTML = ["All", ...new Set(ROWS.map(r => r[key]))].map(v => `<option>${v}</option>`).join("");
  $(id).onchange = update;
}
Object.assign(Chart.defaults, { color: "#5B6B7A", animation: false });   // no animation: screenshots show the end state
Chart.defaults.font.family = '"Helvetica Neue", Arial, sans-serif';
const chart = (id, type) => new Chart($(id), { type, data: { labels: [], datasets: [{ data: [], tension: 0.3,
  borderColor: ACCENT, backgroundColor: ctx => COLOR[ctx.chart.data.labels[ctx.dataIndex]] || ACCENT }] },
  options: { maintainAspectRatio: false, plugins: { legend: { display: false } },
             scales: { y: { beginAtZero: true, ticks: { callback: money } } } } });
const charts = [[chart("byMonth", "line"), "month"], [chart("byType", "bar"), "bike_type"]];
function update() {
  const rows = ROWS.filter(r => ($("station").value === "All" || r.station === $("station").value) &&
                                ($("type").value === "All" || r.bike_type === $("type").value));
  const rev = rows.reduce((s, r) => s + r.revenue_usd, 0), n = rows.reduce((s, r) => s + r.rentals, 0);
  $("k-rev").textContent = money(rev);
  $("k-rentals").textContent = n.toLocaleString("en-US", { notation: "compact" });
  $("k-avg").textContent = n ? "$" + (rev / n).toFixed(2) : "–";
  for (const [c, key] of charts) {
    const totals = {};
    for (const r of rows) totals[r[key]] = (totals[r[key]] || 0) + r.revenue_usd;
    c.data.labels = Object.keys(totals).map(k => key === "month" ? month(k) : k);
    c.data.datasets[0].data = Object.values(totals); c.update();
  }
}
update();
</script></body></html>"""
open("dashboard.html", "w").write(html.replace("__CHARTJS__", chartjs).replace("__DATA__", json.dumps(rows)))
```

## Check the page

`preview` takes full-page screenshots at 1440 and 390 px but cannot click. `node check_page.mjs dashboard.html`
reports script errors, requests leaving the folder, phone overflow, images without alt text, and whether a filter
changes the numbers (change the ids to your page's).

```javascript
import { chromium } from "playwright";
import path from "node:path";
const url = "file://" + path.resolve(process.argv[2]);
const browser = await chromium.launch();
for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const problems = [];
  page.on("pageerror", e => problems.push("error: " + e.message));
  page.on("console", m => m.type() === "error" && problems.push("console: " + m.text()));
  page.on("request", r => !/^(file|data|blob):/.test(r.url()) && problems.push("outside request: " + r.url()));
  await page.goto(url);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 0) problems.push(`page is ${overflow}px wider than the screen`);
  const missingAlt = await page.$$eval("img:not([alt])", els => els.length);
  if (missingAlt) problems.push(`${missingAlt} images without alt text`);
  if (await page.$("#station")) {                         // a dashboard: use your page's filter and figure ids
    const before = await page.textContent("#k-rev");
    await page.selectOption("#station", { index: 1 });
    if (before === await page.textContent("#k-rev")) problems.push("the station filter did not change the revenue");
  }
  await page.screenshot({ path: `filtered-${width}.png`, fullPage: true });
  console.log(width, problems.length ? problems : "ok");
}
await browser.close();
```

## Common failures and how to catch them

- **Blank chart or page**: a script error (a missing library, a typo). `check_page.mjs` prints it, as it does
  requests to a CDN or web font, which fail offline.
- **Chart that keeps growing or is squashed**: the canvas has no fixed-height parent. Use the `.chart` box.
- **Sideways scroll on a phone**: a fixed width, a wide table or a long word. Use `max-width: 100%`, let tables
  scroll inside `overflow-x: auto`, and `overflow-wrap: anywhere` for long strings.
- **Filters that change nothing**, or the tiles but not the charts: the script and its screenshots show both.
- **Made-up content** (placeholder copy, invented quotes or numbers), and **text over photos** that cannot be read:
  use the inputs only; put a dark `linear-gradient` under the text or move it off the photo.

## Self-check loop

1. Build from the script, then `node check_page.mjs page.html`: both widths must print `ok`.
2. `preview page.html`; open both PNGs and the `filtered-*.png` screenshots. Check the first screen, alignment,
   spacing, contrast, image crops, nothing cut off or overlapping, the phone layout as designed.
3. Fix in the script, rebuild, check again. Stop when a full pass finds nothing.

## Checklist

- [ ] One file (plus local images); opens offline; no outside requests; no script errors.
- [ ] Works at 1440 and 390 px; no sideways scroll; tap targets 44 px or more.
- [ ] Real content from the inputs; key message or number on the first screen.
- [ ] Brand colours, fonts and logo; accent on one thing per screen; contrast 4.5:1; alt text; headings in order.
- [ ] Dashboard: tiles and charts update with every filter; numbers formatted for people.
- [ ] `preview` run on the final file and every screenshot looked at.
