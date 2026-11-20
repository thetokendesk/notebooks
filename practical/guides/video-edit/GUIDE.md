# Short videos (ffmpeg)

## What good looks like

- The first 2 seconds hook: the strongest picture plus a short line on screen that says why to keep watching.
  No logo sting, no black frame, no slow fade-in.
- A new picture every 1.5 to 4 seconds. Each beat makes one point.
- Captions readable on a phone with the sound off, inside the safe area, in sync with the voice.
- Voice clear above the music; loudness about -14 LUFS, no clipping, no sound cut mid-word at the end.
- It ends on a call to action held for at least 2 seconds.
- Clean file: the right frame size, constant frame rate, H.264 yuv420p video, AAC 48 kHz stereo audio, faststart.
  No stretched pictures, no black or frozen frames, no flicker at the joins.

## Plan by beats

Write the plan before rendering anything: one row per beat with start, end, picture, text on screen, voice line,
sound. The beats add up to the length the brief asks for. Example for a 10.5 s vertical clip:

| Time | Picture | On screen | Voice |
|---|---|---|---|
| 0 to 2.5 | photo 1, slow push-in | hook: "Three new trails open in May" | "Most people rent a bike for the view." |
| 2.5 to 5 | video clip, reframed | caption | "Our riders come back for the trail." |
| 5 to 8 | photos 2 and 3 | caption | "Three new routes open in May." |
| 8 to 10.5 | photo 3 | call to action: "Book a weekend ride" | "Book a weekend ride today." |

## Formats and safe areas

- Vertical (Shorts, Reels, TikTok): 1080x1920. Wide (YouTube, web): 1920x1080. Feed posts: 1080x1350 or 1080x1080.
- 30 fps unless most sources are 24, 25 or 60; then use theirs. Every clip gets the same size, rate and pixel format.
- Vertical safe area: keep text and faces inside x 90 to 930 and y 250 to 1500. The app draws its buttons on the
  right 150 px and the caption, name and controls over the bottom 420 px.
- Wide: keep text 100 px from the sides and 60 px from top and bottom.
- Reframe a wide source for vertical by cropping to the subject (`crop=ih*9/16:ih:X:0`, X chosen so the subject
  stays in frame) or by centring it over a blurred, filled copy of itself (step 2 below). Never scale to a size
  of a different shape: that stretches the picture.

## Build recipe

Text cards with Pillow, as transparent full-frame PNGs to overlay. Pillow can use any font file, including a
brand font in a .ttc collection (pick the face with `index`); `drawtext` uses only the first face of a .ttc.

```python
# cards.py
from PIL import Image, ImageDraw, ImageFont
W, H = 1080, 1920
FONT = ImageFont.truetype("/System/Library/Fonts/HelveticaNeue.ttc", 112, index=1)   # set from the brand guide
BAND = (31, 58, 95, 215)                                                              # brand dark colour, mostly opaque

def text_card(text, path, top=300):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    lines, cur = [], ""
    for word in text.split():                       # wrap to the safe width
        trial = f"{cur} {word}".strip()
        if d.textlength(trial, font=FONT) <= 840 or not cur: cur = trial
        else: lines.append(cur); cur = word
    lines.append(cur)
    step = int(FONT.size * 1.15)
    d.rectangle([0, top - 50, W, top + step * len(lines) + 50], fill=BAND)
    for i, line in enumerate(lines):
        d.text((90, top + i * step), line, font=FONT, fill="white")
    img.save(path)

text_card("Three new trails open in May", "hook.png")
text_card("Book a weekend ride", "cta.png", top=760)
```

Captions as an .ass file whose canvas matches the video, so sizes and margins are in real pixels. (In an .srt
burned with `force_style`, FontSize and MarginV count in 1/288 of the frame height: FontSize=11 is about 73 px.)

```python
# captions.py: one cue per phrase, at most about 32 characters a line and 2 lines
cues = [(0.3, 2.2, "Most people rent a bike for the view."), (2.2, 4.2, "Our riders come back for the trail."),
        (4.2, 5.7, "Three new routes open in May."), (5.7, 7.3, "Book a weekend ride today.")]
def ts(t): return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"
with open("captions.ass", "w") as f:
    f.write("[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 0\n\n"
            "[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, "
            "BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV\n"
            "Style: Cap,Helvetica Neue,68,&H00FFFFFF,&H00000000,&H80000000,-1,1,6,0,2,90,150,480\n\n"
            "[Events]\nFormat: Layer, Start, End, Style, Text\n")
    for start, end, text in cues:
        f.write(f"Dialogue: 0,{ts(start)},{ts(end)},Cap,{text}\n")
```

Then the video, in steps you can check one by one (`python3 cards.py && python3 captions.py && sh build.sh`):

```bash
set -e
W=1080 H=1920 FPS=30 D=3                    # frame size, frame rate, seconds per clip
ENC="-c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r $FPS"
# 1. Each photo becomes a D-second clip with a slow push-in. Upscaling 2x first stops the zoom from jittering;
#    out_range=tv turns a JPEG's full-range colour into the video range players expect.
for i in 1 2 3; do
  ffmpeg -v error -y -i in/photo$i.jpg -vf "scale=2*$W:2*$H:force_original_aspect_ratio=increase:out_range=tv,crop=2*$W:2*$H,\
zoompan=z='1+0.1*on/($D*$FPS)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=$D*$FPS:s=${W}x$H:fps=$FPS,setsar=1" \
    -frames:v $((D*FPS)) $ENC clip$i.mp4
done
# 2. A 16:9 video reframed to 9:16: the sharp frame centred over a blurred, filled copy of itself.
ffmpeg -v error -y -i in/wide.mp4 -t $D -filter_complex "[0:v]split[a][b];\
[a]scale=$W:$H:force_original_aspect_ratio=increase,crop=$W:$H,boxblur=40[bg];[b]scale=$W:-2[fg];\
[bg][fg]overlay=(W-w)/2:(H-h)/2,fps=$FPS,setsar=1" -an $ENC clip4.mp4
# 3. Join with 0.5 s cross-fades. Each offset = previous offset + clip length - fade length.
ffmpeg -v error -y -i clip1.mp4 -i clip4.mp4 -i clip2.mp4 -i clip3.mp4 -filter_complex \
"[0][1]xfade=transition=fade:duration=0.5:offset=2.5[a];[a][2]xfade=transition=fade:duration=0.5:offset=5[b];\
[b][3]xfade=transition=fade:duration=0.5:offset=7.5[v]" -map "[v]" $ENC joined.mp4
# 4. Voice over quiet music, stereo 48 kHz, as long as the picture (10.5 s).
ffmpeg -v error -y -i in/voice.wav -i in/music.wav -filter_complex "[0]adelay=300:all=1[vo];\
[1]volume=0.12,afade=t=out:st=9.5:d=1[mu];[vo][mu]amix=inputs=2:duration=longest:normalize=0" \
  -t 10.5 -ar 48000 -ac 2 mix.wav
# 5. Loudness to -14 LUFS, true peak -1.5 dB: measure, then correct with the measured values.
python3 - <<'PY'
import json, re, subprocess
target = "I=-14:TP=-1.5:LRA=11"
log = subprocess.run(["ffmpeg", "-hide_banner", "-i", "mix.wav", "-af", f"loudnorm={target}:print_format=json",
                      "-f", "null", "-"], capture_output=True, text=True).stderr
m = json.loads(re.search(r"\{[^{}]+\}", log).group())
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", "mix.wav", "-af", f"loudnorm={target}:measured_I={m['input_i']}:"
                f"measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:"
                f"offset={m['target_offset']}:linear=true,aresample=48000", "mix-norm.wav"], check=True)
PY
# 6. Hook and call-to-action cards, burned captions, final encode.
ffmpeg -v error -y -i joined.mp4 -i hook.png -i cta.png -i mix-norm.wav -filter_complex \
"[0][1]overlay=enable='lt(t,2.4)'[v1];[v1][2]overlay=enable='gte(t,8)'[v2];[v2]ass=captions.ass[v]" \
  -map "[v]" -map 3:a -t 10.5 $ENC -c:a aac -b:a 192k -movflags +faststart final.mp4
```

For one line of plain text, `drawtext` works without a PNG: `drawtext=fontfile='/System/Library/Fonts/Supplemental/Arial
Bold.ttf':text='Open in May':fontsize=72:fontcolor=white:borderw=4:x=(w-tw)/2:y=300:enable='lt(t,2)'`.
Video clips that keep their own sound: resample each to 48 kHz stereo (`-ar 48000 -ac 2`) and join the audio with
`acrossfade=d=0.5` alongside the `xfade` chain.

## Common failures and how to catch them

- **xfade or concat refuses the inputs** (size, frame rate or timebase mismatch): give every clip the same WxH,
  `fps`, `setsar=1` and `yuv420p` first, as steps 1 and 2 do.
- **Stretched picture**: a `scale` to a different shape. Use `force_original_aspect_ratio=increase` then `crop`
  (fill) or `=decrease` then `pad` (fit).
- **zoompan clip the wrong length**: feed it one still, not a looped input; `d` frames come out per input frame.
- **Captions too small, at the very bottom, or under the app's buttons**: check them in the frames against the safe
  area. **Captions out of sync**: time the cues from the voice file, not from guesses.
- **Music drowns the voice**: music 18 to 24 dB under speech (`volume=0.06` to `0.12`).
- **Loudness off target**: a mono or very short mix measures low in one pass; mix to stereo, use the two passes.
- **"width not divisible by 2"**: use `-2` for the free dimension in `scale`. **ffprobe says yuvj420p**: a JPEG's
  full range came through; add `out_range=tv` to the first `scale`, as step 1 does.

## Self-check loop

1. Check the file:
   `ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,pix_fmt,sample_rate,channels -show_entries format=duration -of compact final.mp4`
2. Check loudness (I near -14 LUFS, Peak below -1 dBFS):
   `ffmpeg -hide_banner -i final.mp4 -af ebur128=framelog=quiet:peak=true -f null - 2>&1 | grep -E " I:| Peak:"`
3. Check for black or frozen stretches (should print nothing):
   `ffmpeg -hide_banner -i final.mp4 -vf "blackdetect=d=0.1:pix_th=0.1,freezedetect=n=0.003:d=1" -an -f null - 2>&1 | grep -E "black_start|freeze_start"`
4. `preview final.mp4` (add `--every 0.5` for a clip under 30 s) and open every frame. The first frame shows the hook;
   captions sit inside the safe area and match the voice; nothing is stretched; the last frame shows the call to action.
5. Fix the step that caused it, re-run from that step, check again. Stop when a full pass finds nothing.

## Checklist

- [ ] Plan by beats written; the total length matches the brief.
- [ ] Hook in the first 2 seconds; call to action held at least 2 seconds at the end.
- [ ] Right frame size; every clip the same size, frame rate and pixel format; nothing stretched.
- [ ] Captions in sync, font size at least 60 px on a 1080-wide frame, inside the safe area.
- [ ] Voice above music; about -14 LUFS, peak under -1 dBFS; stereo 48 kHz.
- [ ] H.264 yuv420p, AAC, `+faststart`; no black or frozen stretches.
- [ ] Brand fonts and colours on cards and captions, as the brand guide says.
- [ ] `preview` run on the final file and every frame looked at.
