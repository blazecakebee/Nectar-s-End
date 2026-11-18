# Nectar's End

A harsh but fair 2D cave-diving survival roguelike that runs in the browser. Plain HTML5 Canvas and JavaScript, no build step. Inspired by *Casualties: Unknown*.

You are a **Vespa**, a striped golden parasite sent by an interstellar hive mind. You ride human hosts down into caves so deep nobody has found the bottom, hunting the nectar of relic flowers.

**Play:** https://blazecakebee.github.io/Nectar-s-End/

## The loop
Title → **Base Camp** (skill table, gear rack, quartermaster, host dossier) → **winch lift** (solo or co-op) → endless descent through five biomes, with a **town every 250m** (inn, doctor, trader, well, workbench, Deep Post) → your host dies → the Vespa bursts out for 10 seconds → back to Base Camp with a new host, XP and anything you sent up the Deep Post.

Every host is a **new random human** with a random name (by sex), age, occupation, traits and looks (skin tone, 30+ hairstyles, hair and eye color, facial hair, build, scars, glasses, clothes). The one constant is the Vespa's **glowing gold eyes**.

## Features
- **The Vespa:** gold eyes with a fading trail; 8 gifts awakened by Relic Nectar (Overclocked Heart, Chitin Plating, Compound Sight, Stinger Lash, Wing Buds, Hive Pulse, Amber Blood, Mandibles); a 10-second goo burst on death; a prologue cutscene.
- **Anatomy sim:** 6 body parts plus organs (brain, eyes, lungs, heart, stomach, liver). Wound types include cuts, lacerations, arterial bleeds, gunshots with lodged fragments, bites, burns and fractures. Also tracked: blood volume, pain and blackouts, infection and sepsis, toxins, radiation, temperature, hunger, thirst and stress.
- **Triage:** put the right item on the right body part. Bandages, tourniquets (don't leave them on), sutures, splints, forceps, antiseptic and drugs.
- **Physics:** active ragdolls and weighted props (heavy crates fall hard and drag slowly). Throw rocks, bottles, flares, glowcaps, molotovs and dynamite. Hold the right mouse button to drag things.
- **Destructible terrain:** dig with a pickaxe, ice axe or rock hammer; blast with dynamite.
- **Cave biomes, each with a perk and a challenge:** Mossy Grotto, Sunscorched Sandstone (250m), Frozen Hollows (500m), Crystal Depths (750m), Magma Abyss (1000m+).
- **Online co-op** over WebRTC ([PeerJS](https://peerjs.com), MIT, bundled in `js/lib/`) with 5-letter room codes. Each player keeps their own save, and both reconnect after a reload.
- **Saves:** 3 save slots, plus autosave on a timer, at inns, and when the page closes or reloads.
- **Music:** generative WebAudio soundtrack per area.
- **UI:** colored blinking portraits, glass HUD, **M** hex menu, hex skill web, cemetery, 7 UI themes. Supports ultrawide screens (16:10 up to 32:9).

## Controls
A/D move · W/S ropes (W grabs mid-air) · Space jump (also off ropes) · Shift+S slide down a rope · Shift sprint · Ctrl/C crouch (walk into low gaps to crawl) · LMB attack/shoot/dig · RMB drag objects · X Hive Pulse · E interact · F flashlight · R reload/unjam · G throw / Q cycle · B quick-bandage · 1 swap weapon · **M** menu · Tab inventory · H health · V status · K craft · N map · J journal

## Credits
Co-op networking: PeerJS (MIT, see `js/lib/PEERJS_LICENSE`). Item, menu and skill icons: [Pixel Atlas](https://pixelatlas.org) sprites from `Angais/pixel-art-atlas-1.4m`, CC0 1.0 (see `assets/ICONS_LICENSE.txt`).

## Files
`index.html`, `css/style.css`, `js/` (data, atlas, sprites, audio, physics, survivor, world, entities, skilltree, ui, game, saves, vespa, title, net, update, `lib/peerjs.min.js`), `assets/`.

Co-op uses the free public PeerJS signalling server. For local testing, add `?peer=127.0.0.1:9000` to the URL to use your own PeerServer.

## Shipping an update (and the update log)
`version.json` is both the version number and the in-game **Update Log**. To release, add a new entry at the **top** of `"log"`, then push:

```json
{ "version": "0.1.2", "date": "2026-11-20", "title": "Short headline",
  "changes": ["What changed", "Another change"] },
```

The top entry's `version` is the live version. Players get a popup within about 1–10 minutes; GitHub Pages caches files for up to 10 minutes. The popup offers **Update now**, **Later** or **What's new**. If they do nothing, the page auto-refreshes: after 30s on the title screen or lobby, or after 90s during a run Your run is saved first and resumes automatically after the refresh. After updating, a "What's new" window opens once, and the title screen's **UPDATE LOG** button glows until it has been read. The log is also under Settings → Updates.
