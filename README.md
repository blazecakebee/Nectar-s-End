# Nectar's End

A harsh but fair 2D anatomical survival & extraction roguelike that runs in the browser. Plain HTML5 Canvas and JavaScript, no build step. Inspired by *Casualties: Unknown*.

**Play:** https://blazecakebee.github.io/Nectar-s-End/

## The loop
Title → **Staging Lobby** (skill terminal, gear locker, quartermaster, survivor dossier) → **Descent Elevator** → endless descent through four biomes → **extract** at elevators every 250m, or die → back to the lobby with Survival Data (XP), scrap and unlocks.

Every run you play a **new random human**: random first and last name, age, occupation, two or three traits, and random looks (skin tone, hair style and color, facial hair, build, scars, glasses, clothing colors).

## Features
- **Anatomy sim:** 6 body parts plus organs (brain, eyes, lungs, heart, stomach, liver). Wound types include cuts, lacerations, arterial bleeds, gunshots with lodged fragments, bites, burns and fractures. Also tracked: blood volume, pain and blackouts, infection and sepsis, toxins, radiation, temperature, hunger, thirst and stress.
- **Triage:** put the right item on the right body part. Bandages, tourniquets (don't leave them on), sutures, splints, forceps, antiseptic and drugs. Surgical tables make treatment faster and less painful.
- **Loose verlet physics:** active-ragdoll characters, limp bodies, crates, barrels, debris and cave-ins. You can throw bricks, bottles, flares, glowsticks and molotovs, and hold the right mouse button to grab and drag almost anything.
- **Biomes:** Collapsed Urban Perimeter (0m), Quarantine Containment (250m), Flooded Industrial (600m), Reactor Abyss (1000m+). Each has its own hazards: glass, crumbling floors, gas, water and cold, steam, radiation.
- **Points of interest:** medic cabins, triage tents, scavenger camps, armories, labs, crawlspace stashes, supply pods.
- **Encounters and events:** wounded survivors (treat, rob or leave), standoffs, masked traders, cave-ins, blackouts, gas breaches, distress beacons (supply pod or trap), ambushes.
- **UI:** fading-ink portrait, depth meter and threat gauge, an **M** hex menu leading to Status, Inventory, Health, Crafting, Map, Journal, Skills, Settings and Quit. Hex skill web with pan and zoom. Cemetery of past survivors.
- **Ultrawide:** the view widens to the screen's aspect ratio, from 16:10 up to 32:9.
- Saves to `localStorage`, with export and import in Settings.

## Controls
A/D move · W/S ladders · Space jump · Shift sprint · Ctrl/C/S crouch & crawl · LMB attack/shoot (aim at limbs) · RMB drag objects · E interact · F flashlight · R reload/unjam · G throw / Q cycle · B quick-bandage · 1 swap weapon · **M** menu · Tab inventory · H health · V status · K craft · N map · J journal

## Files
`index.html`, `css/style.css`, `js/` (data, sprites, audio, physics, survivor, world, entities, skilltree, ui, game), `assets/logo.png`.
