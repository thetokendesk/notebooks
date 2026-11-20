# Slide decks (.pptx)

## What good looks like

- Read only the slide titles, in order, and you have the whole argument. Each title is a full sentence that states
  the takeaway: "Weekend rentals grew 37% in a year while weekdays held flat", not "Revenue by day type".
- One message per slide. Everything on the slide supports its title; anything else moves to another slide or the notes.
- Every number comes from the input files, computed in code, and matches wherever it appears again.
- Charts are native chart objects the reader can click and edit, styled to the brand, with the series that carries
  the message in the accent colour.
- Nothing overflows, overlaps, stretches or sits a few pixels off its neighbours. Every slide uses the same margins.
- The deck opens with a title slide and closes with the ask or the next steps: who does what, by when.
- Speaker notes say what to say on each slide and where its numbers came from.

## Plan before you build

1. Read the brief and every input file. List the numbers you will use and compute each one in code.
2. Write the storyline as a list of slide titles. Lead with the answer (a summary slide right after the title slide),
   then the evidence, then the ask. Read the titles aloud: if the story does not hold, fix it here, not later.
3. Pick a form for each slide: big number, chart, two-column comparison, short list, photo with caption, table.
   Do not use the same form for every slide.

## Layout rules

- 16:9, 13.333 x 7.5 in. Outer margin 0.6 in on all sides. Title box at y 0.4 in, 1.2 in tall. Content area from
  y 1.7 in to 6.9 in. Split the content area into halves or thirds with a 0.4 in gutter; align every edge to it.
- Titles: 28 to 32 pt, at most 2 lines (about 14 words). Body text: 18 pt or more. Chart labels, table text,
  footnotes and sources: 12 pt minimum. Big-number slides: the number at 72 to 120 pt with a one-line label under it.
- Lists: at most 5 bullets per slide, at most 12 words per bullet, one level only. Three bullets beat five.
- Tables: at most 6 rows and 5 columns on a slide; right-align numbers; bold or colour the row that matters.
- Charts: one per slide. Bars start at zero. Label values directly and drop the value axis and gridlines. Show a
  legend only for two or more series. Put units in the title or the labels ($K, %, units). Sort bars by size unless
  the categories have a natural order (months, quarters).
- Photos fill their box and are cropped, never stretched or squeezed. Full-bleed on half the slide works well for
  the title slide and section breaks.

## Applying a brand guide

- Copy the colours from BRAND.md into constants at the top of the script and use nothing else. Use the accent for one
  thing per slide (the key series, the key number); text in the dark colour; backgrounds in the light one.
- Set the brand fonts on every run of text, including chart fonts, legends and data labels; otherwise the default
  theme font shows through.
- Logo: on the title slide and the closing slide, placed by height only (so it keeps its proportions), with clear
  space around it as the brand guide says. Use the version made for the background it sits on.
- Follow the brand guide's chart rules (which colour means what, no 3D, pie limits) and its voice for titles.
- With no brand guide: near-black text on white or off-white, one strong accent, one neutral grey, one typeface.

## Build recipe (python-pptx)

Use the blank layout and place everything from the grid constants. Placeholders from other layouts leave
"Click to add title" boxes behind when unused.

```python
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION
from PIL import Image

# Set these from the brand guide: dark text, accent, neutral, background; heading and body fonts.
INK, ACCENT, MUTED, BG = (RGBColor.from_string(c) for c in ("1F3A5F", "E07A1F", "8A9BA8", "F7F7F2"))
HEAD, BODY = "Rockwell", "Helvetica Neue"
W, H, M = Inches(13.333), Inches(7.5), Inches(0.6)       # 16:9 slide and outer margin
prs = Presentation(); prs.slide_width, prs.slide_height = W, H

def text(slide, lines, x, y, w, h, size=18, font=BODY, color=INK, bold=False):
    tf = slide.shapes.add_textbox(x, y, w, h).text_frame
    tf.word_wrap = True
    for i, line in enumerate([lines] if isinstance(lines, str) else lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(size * 0.6)
        r = p.add_run(); r.text = line                       # fonts on the run: PowerPoint honours these
        r.font.size, r.font.name, r.font.bold, r.font.color.rgb = Pt(size), font, bold, color
    return tf

def new_slide(title, notes):
    s = prs.slides.add_slide(prs.slide_layouts[6])         # blank layout
    s.background.fill.solid(); s.background.fill.fore_color.rgb = BG
    text(s, title, M, Inches(0.4), W - 2 * M, Inches(1.2), size=30, font=HEAD, bold=True)
    s.notes_slide.notes_text_frame.text = notes
    return s

def picture_fill(slide, path, x, y, w, h):
    """Fill the box with the photo and crop the overflow; never stretch."""
    iw, ih = Image.open(path).size
    pic = slide.shapes.add_picture(path, x, y, w, h)
    if iw / ih > w / h:
        pic.crop_left = pic.crop_right = (1 - (w / h) / (iw / ih)) / 2
    else:
        pic.crop_top = pic.crop_bottom = (1 - (iw / ih) / (w / h)) / 2
    return pic

def column_chart(slide, categories, series, colors, x, y, w, h, fmt='$#,##0,"K"'):
    data = CategoryChartData(); data.categories = categories
    for name, values in series.items():
        data.add_series(name, values)
    chart = slide.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED, x, y, w, h, data).chart
    chart.font.size, chart.font.name = Pt(14), BODY
    chart.has_legend = len(series) > 1
    if chart.has_legend:
        chart.legend.position, chart.legend.include_in_layout = XL_LEGEND_POSITION.TOP, False
    chart.value_axis.visible = chart.value_axis.has_major_gridlines = False
    plot = chart.plots[0]; plot.gap_width = 60; plot.has_data_labels = True
    plot.data_labels.number_format, plot.data_labels.number_format_is_linked = fmt, False
    for s, c in zip(chart.series, colors):
        s.format.fill.solid(); s.format.fill.fore_color.rgb = c
    return chart

s = new_slide("Weekend rentals grew 37% in a year while weekdays held flat",
              "Weekend revenue: $180K in Q3 2025 to $247K in Q3 2026 (rentals.csv).")
column_chart(s, ["Q3 25", "Q4 25", "Q1 26", "Q2 26", "Q3 26"],
             {"Weekdays": [412e3, 380e3, 405e3, 398e3, 410e3], "Weekends": [180e3, 205e3, 221e3, 236e3, 247e3]},
             [MUTED, ACCENT], M, Inches(1.7), W - 2 * M, Inches(5.2))
s = new_slide("E-bikes earn half the revenue on a third of the fleet", "Fleet list and rentals.csv, Q3 2026.")
text(s, ["E-bikes: 34% of the fleet, 51% of revenue", "Average e-bike rental: $46, against $22"],
     M, Inches(1.7), Inches(5.6), Inches(5))
picture_fill(s, "photos/ebikes.jpg", Inches(6.6), Inches(1.7), W - Inches(6.6) - M, Inches(5.2))
prs.save("deck.pptx")
```

In real use, compute the chart values from the input files; never type them in. A logo goes in with
`s.shapes.add_picture("logo.png", x, y, height=Inches(0.6))`: give only the height. A title slide: `picture_fill`
on the right half, the title through `text` at 40 to 44 pt on the left.

With pptxgenjs, set `pptx.layout = "LAYOUT_WIDE"`, add charts with `slide.addChart(pptx.ChartType.bar, data,
{barDir: "col", chartColors: [...], showValue: true, valAxisHidden: true, valGridLine: {style: "none"}})`, set
`dataLabelFontFace`, `catAxisLabelFontFace` and `legendFontFace` (plain `fontFace` does not reach them), and add
notes with `slide.addNotes(...)`.

## Common failures and how to catch them

- **Text overflows its box.** Neither library shrinks text to fit; long text runs off the box or off the slide.
  Keep to the limits above, then check every slide in `preview`. A two-line title pushes into whatever sits below
  1.7 in.
- **Overlaps.** Shapes placed by guessed coordinates collide. Derive every position from W, H, M and the grid.
- **Stretched photos.** Passing both width and height to `add_picture` without cropping distorts the photo. Use
  `picture_fill`.
- **Default look leaks through.** Office blue, Calibri, a white chart background, default chart fonts. Set colours and
  fonts explicitly everywhere.
- **Numbers that disagree.** The same figure rounded two ways on two slides, or a total that is not the sum of its
  parts. Compute each number once, in code, and format it with one function.
- **Pictures of charts.** A matplotlib PNG cannot be edited and blurs when projected. Use it only for chart types
  the library cannot make natively.
- **Too much on one slide.** If it needs a font smaller than the minimums, split it into two slides.

## Self-check loop

1. Build the deck with the script. Change the script, never the .pptx by hand, so every fix survives a rebuild.
2. Run `preview deck.pptx`. Open every PNG in `deck-preview/`, one by one.
3. On each slide check: text inside its box and inside the margins; titles at most 2 lines; nothing overlapping;
   photos undistorted; chart labels readable and in the brand font; nothing left over from a template.
4. Read the titles and notes back in order and check the story and the numbers:
   `python3 -c "from pptx import Presentation; [print(i+1, next((sh.text_frame.text for sh in s.shapes if sh.has_text_frame), ''), '|', s.notes_slide.notes_text_frame.text) for i, s in enumerate(Presentation('deck.pptx').slides)]"`
   (prints the first text on each slide: the title when built with `new_slide`).
5. Fix, rebuild, preview again. Stop only when a full pass finds nothing.

## Checklist

- [ ] Titles alone tell the story; each is a takeaway sentence of at most 2 lines.
- [ ] Title slide first; answer or summary early; ask or next steps (owner, date) last.
- [ ] One message per slide; at most 5 bullets of at most 12 words; body 18 pt or more, nothing below 12 pt.
- [ ] Every number computed from the inputs and consistent across slides; sources in the notes.
- [ ] Charts native, branded, directly labelled, accent on the series that matters.
- [ ] Brand colours, fonts and logo applied as BRAND.md says; photos cropped, not stretched.
- [ ] Same margins and grid on every slide; no leftover placeholders.
- [ ] Speaker notes on every slide.
- [ ] `preview` run on the final file and every PNG looked at.
