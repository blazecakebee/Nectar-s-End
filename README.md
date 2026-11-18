# Nectar's End

A harsh but fair 2D cave-diving survival & extraction roguelike that runs in the browser. Plain HTML5 Canvas and JavaScript, no build step. Inspired by *Casualties: Unknown*.

**Play:** https://blazecakebee.github.io/Nectar-s-End/

## The loop
Title → **Staging Lobby** (skill terminal, gear locker, quartermaster, survivor dossier) → **Descent Elevator** → endless descent through four biomes → **extract** at elevators every 250m, or die → back to the lobby with Survival Data (XP), scrap and unlocks.

Every run you play a **new random human**: random first and last name, age, occupation, two or three traits, and random looks (skin tone, hair style and color, facial hair, build, scars, glasses, clothing colors).

## Features
- **Anatomy sim:** 6 body parts plus organs (brain, eyes, lungs, heart, stomach, liver). Wound types include cuts, lacerations, arterial bleeds, gunshots with lodged fragments, bites, burns and fractures. Also tracked: blood volume, pain and blackouts, infection and sepsis, toxins, radiation, temperature, hunger, thirst and stress.
- **Triage:** put the right item on the right body part. Bandages, tourniquets (don't leave them on), sutures, splints, forceps, antiseptic and drugs. Surgical tables make treatment faster and less painful.
- **Loose verlet physics:** active-ragdoll characters, limp bodies, crates, barrels, debris and cave-ins. You can throw bricks, bottles, flares, glowsticks and molotovs, and hold the right mouse button to grab and drag almost anything.
- **Cave biomes, each with a perk and a challenge:** Mossy Grotto (0m: forage, glowshrooms / spores, damp wounds), Sunscorched Sandstone (250m: dry air, ruins / heat, sinking sand), Frozen Hollows (500m: slower bleeding, fresh water / cold, ice, icicles), Crystal Depths (750m: crystal light, Crystal Shards / radiation, shard floors), Magma Abyss (1000m+: warmth, rich caches / heat, lava, vents).
- **Points of interest:** medic cabins, triage tents, scavenger camps, armories, labs, crawlspace stashes, supply pods.
- **Encounters and events:** wounded survivors (treat, rob or leave), standoffs, masked traders, cave-ins, blackouts, gas breaches, distress beacons (supply pod or trap), ambushes.
- **UI:** fading-ink portrait, depth meter and threat gauge, an **M** hex menu leading to Status, Inventory, Health, Crafting, Map, Journal, Skills, Settings and Quit. Hex skill web with pan and zoom. Cemetery of past survivors.
- **Ultrawide:** the view widens to the screen's aspect ratio, from 16:10 up to 32:9.
- Saves to `localStorage`, with export and import in Settings.

## Controls
A/D move · W/S ladders · Space jump · Shift sprint · Ctrl/C/S crouch & crawl · LMB attack/shoot (aim at limbs) · RMB drag objects · E interact · F flashlight · R reload/unjam · G throw / Q cycle · B quick-bandage · 1 swap weapon · **M** menu · Tab inventory · H health · V status · K craft · N map · J journal

## Credits
Item, menu and skill icons: [Pixel Atlas](https://pixelatlas.org) sprites from `Angais/pixel-art-atlas-1.4m`, CC0 1.0 (see `assets/ICONS_LICENSE.txt`).

## Files
`index.html`, `css/style.css`, `js/` (data, sprites, audio, physics, survivor, world, entities, skilltree, ui, game), `assets/logo.png`.

## Shipping an update (and the update log)
`version.json` is both the version number and the in-game **Update Log**. To release, add a new entry at the **top** of `"log"`, then push:

```json
{ "version": "0.1.2", "date": "2026-11-20", "title": "Short headline",
  "changes": ["What changed", "Another change"] },
```

The top entry's `version` is the live version. Players get a popup within about 1–10 minutes; GitHub Pages caches files for up to 10 minutes. The popup offers **Update now**, **Later** or **What's new**. If they do nothing, the page auto-refreshes: after 30s on the title screen or lobby, or after 90s during a run (with a warning). Progress is saved first. After updating, a "What's new" window opens once, and the title screen's **UPDATE LOG** button glows until it has been read. The log is also under Settings → Updates.
