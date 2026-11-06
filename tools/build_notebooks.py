"""Builds the upscale-video notebooks from one set of shared cells.

    python3 tools/build_notebooks.py

Each notebook runs the same five steps: check the GPU, pick a video, install the model,
upscale, compare and download. Only the install and upscale cells differ per model, and
each model's settings below are the ones measured on Colab in our tests.
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SAMPLE = "https://raw.githubusercontent.com/thetokendesk/notebooks/main/upscale-video/sample/sample-360p.mp4"


def md(text):
    return {"cell_type": "markdown", "metadata": {}, "source": text.strip("\n").splitlines(keepends=True)}


def code(text):
    return {
        "cell_type": "code",
        "metadata": {"cellView": "form"},
        "execution_count": None,
        "outputs": [],
        "source": text.strip("\n").splitlines(keepends=True),
    }


def gpu_cell(need_gb, refuse):
    """`refuse`: the GPUs this model cannot use, as Python conditions on gpu_gb and gpu_cap, each with the reason."""
    checks = "\n".join(f"if {cond}:\n    raise SystemExit({why!r})" for cond, why in refuse)
    return code(f'''
#@title 1. Check the GPU
import subprocess
gpu = subprocess.run("nvidia-smi --query-gpu=name,memory.total,compute_cap --format=csv,noheader",
                     shell=True, capture_output=True, text=True).stdout.strip()
if not gpu:
    raise SystemExit("No GPU yet. Runtime > Change runtime type > pick a GPU, Save, then run this cell again.")
gpu_name, gpu_mem, gpu_cap = [x.strip() for x in gpu.split(",")]
gpu_gb, gpu_cap = int(gpu_mem.split()[0]) / 1024, float(gpu_cap)
print(f"GPU: {{gpu_name}}, {{gpu_gb:.0f}} GB")
{checks}
NEED_GB = {need_gb}
if gpu_gb < NEED_GB:
    print(f"This model used up to {{NEED_GB}} GB in our test, so it may run out of memory here. If it does, pick a bigger GPU.")
''')


VIDEO_CELL = code(f'''
#@title 2. Your video
#@markdown Leave it as **sample** to try our 6-second sample clip. Clear it to upload a video from your computer, or paste a link to an .mp4.
VIDEO = "sample"  #@param {{type:"string"}}
import os, shutil, subprocess, urllib.request
os.makedirs("/content/in", exist_ok=True)
SAMPLE = "{SAMPLE}"
if VIDEO.strip() == "":
    from google.colab import files
    uploaded = files.upload()
    name = next(iter(uploaded))
    src = "/content/in/" + name
    shutil.move(name, src)
elif VIDEO.strip() == "sample" or VIDEO.strip().startswith("http"):
    url = SAMPLE if VIDEO.strip() == "sample" else VIDEO.strip()
    src = "/content/in/" + os.path.basename(url.split("?")[0])
    urllib.request.urlretrieve(url, src)
else:
    src = VIDEO.strip()
w, h = [int(x) for x in subprocess.run(
    f'ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "{{src}}"',
    shell=True, capture_output=True, text=True).stdout.strip().split(",")[:2]]
seconds = float(subprocess.run(f'ffprobe -v error -show_entries format=duration -of csv=p=0 "{{src}}"',
                               shell=True, capture_output=True, text=True).stdout.strip())
print(f"Video: {{os.path.basename(src)}}, {{w}}x{{h}}, {{seconds:.1f}} s")
''')

PEAK_HELPER = '''
import threading, time
def watch_gpu_memory():
    """Peak GPU memory while the upscale runs, read every 2 s."""
    peak, stop = [0], threading.Event()
    def loop():
        while not stop.is_set():
            try:
                used = subprocess.run("nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits",
                                      shell=True, capture_output=True, text=True).stdout.split()[0]
                peak[0] = max(peak[0], int(used))
            except Exception:
                pass
            time.sleep(2)
    threading.Thread(target=loop, daemon=True).start()
    return peak, stop
'''

COMPARE_CELL = code('''
#@title 5. Compare and download
CLOSE_UP = "upper"  #@param ["upper", "center", "lower"]
#@markdown Where the close-up is taken: **upper** suits a face in a vertical video.
from IPython.display import Image, display
at = min(2.0, seconds / 2)
OW, OH = [int(x) for x in subprocess.run(
    f'ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "{out}"',
    shell=True, capture_output=True, text=True).stdout.strip().split(",")[:2]]
# The same moment, the original resized the ordinary way to the new size, and the upscale.
!ffmpeg -v error -y -ss {at} -i "{src}" -frames:v 1 -vf "scale={OW}:{OH}:flags=bicubic" /content/out/before.png
!ffmpeg -v error -y -ss {at} -i "{out}" -frames:v 1 /content/out/after.png
!ffmpeg -v error -y -i /content/out/before.png -i /content/out/after.png -filter_complex "[0]scale=-2:900[a];[1]scale=-2:900[b];[a][b]hstack" /content/out/compare.png
side = min(OW, OH) // 3
x = (OW - side) // 2
y = max(0, min(OH - side, int(OH * {"upper": 0.3, "center": 0.5, "lower": 0.7}[CLOSE_UP]) - side // 2))
!ffmpeg -v error -y -i /content/out/before.png -i /content/out/after.png -filter_complex "[0]crop={side}:{side}:{x}:{y},scale=600:600:flags=neighbor[a];[1]crop={side}:{side}:{x}:{y},scale=600:600:flags=neighbor[b];[a][b]hstack" /content/out/close-up.png
print("Left: your video, resized the ordinary way. Right: upscaled.")
display(Image("/content/out/compare.png", width=900))
print("Close-up:")
display(Image("/content/out/close-up.png", width=900))
try:
    from google.colab import files
    files.download(out)
except Exception:
    print("Download it from the Files panel on the left:", out)
''')

FINISH = md('''
### When you're done
Download your video first: everything here is deleted when the session ends. Then **Runtime → Disconnect and delete runtime**, so the GPU stops using your compute units.
''')


def notebook(cells):
    return {
        "nbformat": 4,
        "nbformat_minor": 0,
        "metadata": {
            "colab": {"provenance": [], "gpuType": "T4"},
            "kernelspec": {"name": "python3", "display_name": "Python 3"},
            "language_info": {"name": "python"},
            "accelerator": "GPU",
        },
        "cells": cells,
    }


FLASHVSR = notebook([
    md('''
# Upscale a video with FlashVSR+

From **The Token Desk**. Turns a low-resolution clip (an AI video made at 480p, an old recording) into a sharp one, keeping faces as they were.

**In our test** (a 16-second 480x854 clip to 1152x2048): Turbo took 1.2 minutes on a Colab G4 and 5.3 on an L4, about half a compute unit per minute of finished video on either, and used up to 13 GB of GPU memory. Base used up to 21 GB.

**How to run it:** Runtime → Change runtime type → L4, A100 or G4 (the free T4 can't run FlashVSR+) → Save. Then Runtime → Run all. Step 2 asks for your video if you cleared the sample.

FlashVSR+ is by OpenImagingLab, Apache-2.0: [github.com/OpenImagingLab/FlashVSR_Plus](https://github.com/OpenImagingLab/FlashVSR_Plus).
'''),
    gpu_cell(13, [("gpu_cap < 8", "FlashVSR+ needs a newer GPU than this one (on Colab, the free T4 can't run it). Runtime > Change runtime type > L4, A100 or G4.")]),
    VIDEO_CELL,
    code('''
#@title 3. Install FlashVSR+ (about a minute)
import time
t0 = time.time()
REPO = "/content/FlashVSR_Plus"
COMMIT = "b548a2c"  # the version we tested, 16 Oct 2026
!git clone -q https://github.com/OpenImagingLab/FlashVSR_Plus {REPO} && cd {REPO} && git checkout -q {COMMIT}
# Their requirements, without torch: Colab's own is already installed.
!cd {REPO} && grep -v -i -E '^(torch|torchvision|torchaudio)([<>=~ ]|$)' requirements.txt > /tmp/req.txt
!cd {REPO} && pip install -q -r /tmp/req.txt && pip install -q -e . --no-deps
!cd {REPO} && pip install -q -e operators/flashvsr_attn --no-build-isolation --no-deps
!hf download ruchangyao/FlashVSR_plus TCDecoder.ckpt turbo/dit.safetensors turbo/lq_proj_in.safetensors base/dit.safetensors base/lq_proj_in.safetensors --local-dir {REPO}/ckpts
print(f"Installed in {(time.time() - t0) / 60:.1f} min")
'''),
    code('''
#@title 4. Upscale
MODE = "turbo"  #@param ["turbo", "base"]
LONG_SIDE = 2048  #@param {type:"integer"}
#@markdown Turbo is the fast one. Base is a little sharper and needs about 21 GB of GPU memory.
''' + PEAK_HELPER + '''
os.makedirs("/content/out", exist_ok=True)
scale = LONG_SIDE / max(w, h)
# FlashVSR+ needs both sides divisible by 128.
W = max(128, round(w * scale / 128) * 128)
H = max(128, round(h * scale / 128) * 128)
out = f"/content/out/{os.path.splitext(os.path.basename(src))[0]}-flashvsr-{MODE}.mp4"
peak, stop = watch_gpu_memory()
t0 = time.time()
# --decode-every 8 reads the video in pieces: loaded whole, a 32-second clip filled a 52 GB machine.
!cd {REPO} && python -m inference.run_stream --input "{src}" --mode {MODE} --attn-kernel triton_block_sparse --decode-every 8 --output /content/out/raw.mp4 --height {H} --width {W}
stop.set()
# The original sound, put back.
!ffmpeg -v error -y -i /content/out/raw.mp4 -i "{src}" -map 0:v -map 1:a? -c:v copy -c:a copy -shortest "{out}"
assert os.path.exists(out), "The upscale did not finish: read the lines above for the error."
print(f"Done: {w}x{h} to {W}x{H} in {(time.time() - t0) / 60:.1f} min, up to {peak[0] / 1024:.1f} GB of GPU memory.")
'''),
    COMPARE_CELL,
    FINISH,
])

SEEDVR2 = notebook([
    md('''
# Upscale a video with SeedVR2

From **The Token Desk**. The slowest of the upscalers we tested and the one that adds the most fine texture: skin, lashes, the weave of a suit.

**In our test** (a 16-second 480x854 clip to 1080x1920): 6.4 minutes on a Colab G4, about 4 compute units per minute of finished video; 35 minutes on an L4, about 3.7 units per minute. It used up to 22 GB of GPU memory, so a 24 GB card like an RTX 4090 runs it.

**How to run it:** Runtime → Change runtime type → G4 (fastest), A100 or L4 → Save. Then Runtime → Run all. Colab's free T4 is far too slow for it.

SeedVR2 is by ByteDance Seed; this runs numz's command-line version, Apache-2.0: [github.com/numz/ComfyUI-SeedVR2_VideoUpscaler](https://github.com/numz/ComfyUI-SeedVR2_VideoUpscaler).
'''),
    gpu_cell(22, [("gpu_gb < 20", "SeedVR2 needs about 22 GB of GPU memory. Runtime > Change runtime type > L4 (slow), A100 or G4."), ("gpu_cap < 8", "SeedVR2 is far too slow on this GPU: on Colab's T4 it had not finished 6 seconds of video after 75 minutes. Pick an L4, A100 or G4.")]),
    VIDEO_CELL,
    code('''
#@title 3. Install SeedVR2 (about a minute)
import time
t0 = time.time()
REPO = "/content/SeedVR2"
COMMIT = "4490bd1"  # the version we tested
!git clone -q https://github.com/numz/ComfyUI-SeedVR2_VideoUpscaler {REPO} && cd {REPO} && git checkout -q {COMMIT}
!grep -v -i -E '^(torch|torchvision|torchaudio)([<>=~ ]|$)' {REPO}/requirements.txt > /tmp/req.txt && pip install -q -r /tmp/req.txt
!hf download numz/SeedVR2_comfyUI seedvr2_ema_3b_fp16.safetensors ema_vae_fp16.safetensors --local-dir /content/weights
print(f"Installed in {(time.time() - t0) / 60:.1f} min")
'''),
    code('''
#@title 4. Upscale
RESOLUTION = 1080  #@param {type:"integer"}
#@markdown The short side of the result, in pixels: 1080 makes a vertical clip 1080x1920.
''' + PEAK_HELPER + '''
os.makedirs("/content/out", exist_ok=True)
out = f"/content/out/{os.path.splitext(os.path.basename(src))[0]}-seedvr2.mp4"
peak, stop = watch_gpu_memory()
t0 = time.time()
!cd {REPO} && python inference_cli.py "{src}" --output /content/out/raw.mp4 --model_dir /content/weights --dit_model seedvr2_ema_3b_fp16.safetensors --resolution {RESOLUTION} --batch_size 33 --uniform_batch_size --temporal_overlap 4 --color_correction lab --vae_encode_tiled --vae_decode_tiled --video_backend ffmpeg
stop.set()
!ffmpeg -v error -y -i /content/out/raw.mp4 -i "{src}" -map 0:v -map 1:a? -c:v copy -c:a copy -shortest "{out}"
assert os.path.exists(out), "The upscale did not finish: read the lines above for the error."
print(f"Done in {(time.time() - t0) / 60:.1f} min, up to {peak[0] / 1024:.1f} GB of GPU memory.")
'''),
    COMPARE_CELL,
    FINISH,
])

RELAYVSR = notebook([
    md('''
# Upscale a video with RelayVSR

From **The Token Desk**. The fastest upscaler we tested, and it kept faces.

**In our test** (a 16-second 480x854 clip on a Colab G4): the 2x model took 17 seconds of processing and used up to 17 GB of GPU memory; the 4x model, run at 2.4x, took 27 seconds and up to 37 GB. Add about a minute the first time, while it warms up.

**How to run it:** Runtime → Change runtime type → pick a GPU (an L4 or bigger for the 2x model, an A100 or G4 for 4x) → Save. Then Runtime → Run all.

RelayVSR runs on LightX2V, Apache-2.0: [github.com/ModelTC/LightX2V](https://github.com/ModelTC/LightX2V). **Check the licence before you use the result commercially:** the 2x model's page ([lightx2v/RelayVSR_X2](https://huggingface.co/lightx2v/RelayVSR_X2)) states none, and the original 4x model ([kopper/RelayVSR](https://huggingface.co/kopper/RelayVSR)) has no model card.
'''),
    gpu_cell(17, [("gpu_gb < 20", "RelayVSR needs about 17 GB of GPU memory and more machine memory than the free T4 has. Runtime > Change runtime type > L4, A100 or G4.")]),
    VIDEO_CELL,
    code('''
#@title 3. Install RelayVSR (about two minutes)
MODEL = "x2"  #@param ["x2", "x4"]
import json, time
t0 = time.time()
REPO = "/content/LightX2V"
COMMIT = "77bb43d"  # the version we tested, 5 Nov 2026
!git clone -q https://github.com/ModelTC/LightX2V {REPO} && cd {REPO} && git checkout -q {COMMIT}
# Everything but torch, and the server-only parts the command-line runner never imports.
!cd {REPO} && grep -v -i -E '^(torch|torchvision|torchaudio|sgl-kernel|alibabacloud|aio-pika|asyncpg|aioboto3|swanlab|prometheus)([<>=~ _-]|$)' requirements.txt > /tmp/req.txt && pip install -q -r /tmp/req.txt
!cd {REPO} && pip install -q -e . --no-deps
# The runner reads video with PyAV, which its requirements leave out.
!pip install -q av
# Write H.264, which plays everywhere.
for c in ("relayvsr_x2.json", "relayvsr_x4.json"):
    f = f"{REPO}/configs/relayvsr/{c}"
    cfg = json.load(open(f)); cfg["video_codec"] = "libx264"; json.dump(cfg, open(f, "w"), indent=1)
WEIGHTS = {"x2": "lightx2v/RelayVSR_X2", "x4": "kopper/RelayVSR"}[MODEL]
!hf download {WEIGHTS} --local-dir /content/models/{MODEL}
print(f"Installed in {(time.time() - t0) / 60:.1f} min")
'''),
    code('''
#@title 4. Upscale
RATIO = 2.0  #@param {type:"number"}
#@markdown How many times bigger. The 2x model is made for 2; the 4x model ran well at 2.4 in our test.
''' + PEAK_HELPER + '''
os.makedirs("/content/out", exist_ok=True)
out = f"/content/out/{os.path.splitext(os.path.basename(src))[0]}-relayvsr-{MODEL}.mp4"
peak, stop = watch_gpu_memory()
t0 = time.time()
!cd {REPO} && export lightx2v_path={REPO} model_path=/content/models/{MODEL} CUDA_VISIBLE_DEVICES=0 && bash -c "source scripts/base/base.sh && python -m lightx2v.infer --model_cls relayvsr_{MODEL} --task sr --model_path /content/models/{MODEL} --config_json {REPO}/configs/relayvsr/relayvsr_{MODEL}.json --video_path '{src}' --sr_ratio {RATIO} --save_result_path /content/out/raw.mp4 --seed 42"
stop.set()
!ffmpeg -v error -y -i /content/out/raw.mp4 -i "{src}" -map 0:v -map 1:a? -c:v copy -c:a copy -shortest "{out}"
assert os.path.exists(out), "The upscale did not finish: read the lines above for the error."
print(f"Done in {(time.time() - t0) / 60:.1f} min, up to {peak[0] / 1024:.1f} GB of GPU memory.")
'''),
    COMPARE_CELL,
    FINISH,
])

for name, nb in (("flashvsr-plus", FLASHVSR), ("seedvr2", SEEDVR2), ("relayvsr", RELAYVSR)):
    path = ROOT / "upscale-video" / f"{name}.ipynb"
    path.write_text(json.dumps(nb, indent=1, ensure_ascii=False) + "\n")
    print("wrote", path.relative_to(ROOT))
