# Notebooks from The Token Desk

Ready-to-run notebooks for the tests on [The Token Desk](https://www.youtube.com/@thetokendesk). Each one opens in Google Colab with one click, runs on a Colab GPU, and comes with the numbers we measured.

| Folder | What it does |
|---|---|
| [upscale-video](upscale-video/) | Makes a low-resolution video sharp with FlashVSR+, SeedVR2 or RelayVSR |

## Running a notebook

1. Open the notebook's folder and click **Open in Colab**.
2. In Colab: **Runtime → Change runtime type**, pick the GPU the notebook names, **Save**.
3. **Runtime → Run all**.
4. When it's done, download your result, then **Runtime → Disconnect and delete runtime** so the GPU stops using your compute units.

Each notebook pins the version of the model's code we tested, and says the date.
