# Presidency University DLD Virtual Lab

Browser-based Digital Logic Design lab. Pure HTML + CSS + JavaScript, no backend — works on GitHub Pages.

**Developer:** Md. Sohanur Rahman · **Student ID:** 2521720044 · **University:** Presidency University

## Features
- Virtual circuit board: drag parts, wire pins (tap-tap or drag), toggle switches, LEDs
- AND, OR, NOT, NAND, NOR, XOR, XNOR gates + 7400/7402/7404/7408/7432/7486 ICs (need +5V on pin 14, GND on pin 7)
- Real-time simulation (net merging + iterate-until-stable; latches hold state)
- Panel / Guide / Signals / Power tabs, Lab sheet, 7 Experiments (truth tables, circuit diagrams, "open on board"), ICs pin diagrams, Help
- Responsive (phone, tablet, desktop), touch support, zoom buttons

## Structure
```
index.html   css/style.css   js/data.js (gates, ICs, experiments)   js/lab.js (simulator + UI)   assets/logo.png
```

## Deploy on GitHub Pages
Push to a repo → Settings → Pages → deploy from `main` / root.

## Notes on fidelity
The reference site renders via JavaScript and only its header, nav (Lab sheet, Experiments, ICs, Help), Panel/Guide/Signals/Power tabs, hint and credit strip were readable. Its exact colours, lab sheet text and experiment list were not accessible, so those use standard DLD content and a custom blue/gold theme. `assets/logo.png` uses the Presidency University logo supplied by the user. Floating inputs read as 0 (real TTL reads 1).

## Testing
`tests/browser_test.py` (Python + Playwright) drives the real page: all 7 gates, wire creation (tap-tap and drag), switches/LEDs, component drag and delete, all 6 ICs (with and without VCC/GND), all experiment truth tables vs. the simulated circuits, SR latch memory, navigation, tabs, power, and Android-size (360×740 touch) layout. Last run: 58/58 checks passed, no JavaScript errors.

## Android upload instructions (GitHub Pages, no PC needed)
1. Extract `PU-DLD-Virtual-Lab.zip` with the Files app (long-press → Extract). You get `index.html`, `css/`, `js/`, `assets/`, `README.md`.
2. In Chrome on Android open github.com, sign in, tap ⋮ → **Desktop site**, create a **New repository** (e.g. `pu-dld-virtual-lab`, Public).
3. Tap **uploading an existing file**, select ALL extracted files and folders (select `index.html`, `README.md`, `.nojekyll` and the `css`, `js`, `assets` folders — the folders must keep their names), tap **Commit changes**. If folders can't be selected, use the GitHub app/`github.dev`, or upload each folder's files after creating the folder by typing `css/style.css` in *Create new file*.
4. Repository **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main, folder: / (root) → Save**.
5. After ~1 minute open `https://<your-username>.github.io/pu-dld-virtual-lab/`.
`index.html` must sit in the repository root (not inside another folder). All paths are relative, so the site works under a repository sub-path.
