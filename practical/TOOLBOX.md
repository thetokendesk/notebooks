# What is installed here

Commands in this folder run without network, so nothing can be downloaded or installed. Everything below is ready.

## Python 3.12 (`python3`, first on PATH)

python-pptx (PowerPoint), python-docx (Word), openpyxl and XlsxWriter (Excel), pandas, matplotlib, Pillow, reportlab
(PDF), pypdf.

## Node (`node`; the libraries are in `node_modules/` here, so `require` and `import` both find them)

pptxgenjs (PowerPoint), exceljs (Excel), docx (Word), chart.js (to use it in a page that must work offline, copy
`node_modules/chart.js/dist/chart.umd.js` into the page), playwright (a headless Chromium for screenshots), three (three.js 0.170.0: `node_modules/three/build/three.module.js`, for testing a page offline that imports it from a CDN).

## Other tools

- `ffmpeg` and `ffprobe` (with subtitles, drawtext, zoompan, xfade and loudnorm)
- `soffice` (LibreOffice, headless; converts Office files to PDF)
- `pdftoppm`, `pdftotext`
- `preview <file>`: turns a finished file into pictures you can look at. A deck or document gives one PNG per page,
  a spreadsheet each sheet as printed after recalculating every formula, a video a frame every 2 seconds, a web page
  full-page screenshots at desktop and phone width. The PNGs go to `<file>-preview/`; their paths are printed.
  Look at them before you finish.

## Fonts

Every font on this Mac, including Georgia and Avenir Next. For Pillow: `/System/Library/Fonts/Supplemental/Georgia
Bold.ttf`, `/System/Library/Fonts/Avenir Next.ttc` (index 7 regular, 5 medium, 2 demi bold, 0 bold).
