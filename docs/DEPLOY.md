# How to deploy the toothbrushing app (GitHub Pages)

## Overview

The app is live at [mulct-diz-db.github.io/Zaehneputzen](https://mulct-diz-db.github.io/Zaehneputzen/). Every push to the `main` branch of the [Zaehneputzen repository](https://github.com/MULCT-DIZ-DB/Zaehneputzen) republishes it automatically.

Only the `app/` folder is published. A GitHub Actions workflow in `.github/workflows/pages.yml` uploads it to GitHub Pages; there is no build step.

## One-time setup (already done)

These steps are done for this repository. Repeat them only for a new repository.

1. Keep the repository **public**. A free GitHub account can only use Pages with public repositories, so anyone with the link can see the code.
2. Make sure `.github/workflows/pages.yml` is committed on `main`. It publishes the `app/` folder.
3. On GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**. Don't click either **Configure** button, because the workflow already exists.
4. Open the **Actions** tab, select **Deploy to GitHub Pages** and click **Run workflow** (or **Re-run all jobs** on a failed run).
5. Wait for the green check (about 1 minute), then open the live URL.
6. On the iPad, open the URL in **Safari** → Share → **Add to Home Screen**. Open it once while online; after that it works offline.
7. Progress is saved per web address, so the GitHub Pages app starts empty. To keep existing progress, export it in the parents' menu of the old address, then tap **Sicherung laden** on the new start screen (shown while there is no progress).

## Publishing code changes

A push to `main` is the whole release: the app updates about 1–11 minutes later.

1. Run the tests first: `.venv\Scripts\python tools\run_tests.py`.
2. If you added a new file to `app/`, add it to the `PRECACHE` list in `app/sw.js`. Otherwise the iPad can't open that file offline.
3. Commit and push: `git add -A`, `git commit -m "…"`, `git push`.
4. Check the **Actions** tab: the **Deploy to GitHub Pages** run should turn green in about 1 minute.
5. GitHub Pages caches files for up to 10 minutes. If the old version still shows, wait and reload.
6. On the iPad, close the app and open it again while online. It loads the newest files first and only falls back to its offline copy without a connection.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Run fails at "configure-pages" | Pages source isn't set to GitHub Actions (setup step 3), then re-run. |
| 404 on the live URL | No successful run yet, or the URL is missing `/Zaehneputzen/` at the end. |
| iPad still shows the old version | Wait 10 minutes, then close and reopen the app while online. |
| App doesn't work offline | A new file is missing from `PRECACHE` in `app/sw.js`. |
