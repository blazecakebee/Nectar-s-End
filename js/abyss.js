// Nectar's End — 0.9 "The Abyss Calls": wider world, sub-biomes, biome-only containers, flora & fauna, bandit camps,
// hidden artifact vaults, wandering teachers & vendors, new gear, ledge hanging, terrain-chewing digging, smarter foes,
// the Curse of the Abyss and everything that eases it, a live map and a movable minimap.
(function (NE) {
'use strict';
const { ri, rf, pick, chance, clamp, lerp } = NE; const T = NE.T; const G = NE.G; const IT = NE.ITEMS; const L = NE.LOOT; const W_ = NE.World.prototype;
const sz = (id, w, h) => { NE.ISIZE[id] = [w, h]; };

// =====================================================================================================================
// ITEMS: climbing / diving / rocket gear, wandering-vendor exclusives, curse remedies, field medicine, artifacts
// =====================================================================================================================
const GEAR = [
  // id, name, slot, col, w, gmods, extra, desc, value, size
  ['clharness', 'Climber\'s Rig', 'belt', '#c08a30', 0.9, { climb: 1.3, parkour: 1.3 }, { rig: 1 }, 'Carabiners and a chest harness: climb 30% faster, wall-climb 30% longer, and hanging from a ledge costs no stamina.', 70, [2, 1]],
  ['crampons', 'Crampon Boots', 'feet', '#7a6a5a', 1.4, { climb: 1.2, fall: 0.9 }, { grip: 1, noslip: 1 }, 'Steel spikes strapped to stiff boots: never slip on ice, cling to walls in mid-air, +20% climbing.', 60, [2, 1]],
  ['scubamask', 'Scuba Mask', 'face', '#3a80a0', 0.4, {}, { scuba: 1 }, 'See clearly underwater and swim 30% faster. Pairs with an Air Tank.', 55, [1, 1]],
  ['scubatank', 'Air Tank', 'belt', '#40a080', 3, {}, { air: 75 }, 'Compressed air on your back: +75 seconds of breath underwater. Heavy.', 90, [1, 2]],
  ['swimfins', 'Swim Fins', 'feet', '#e08030', 0.6, { speed: 0.9 }, { fins: 1 }, 'Kick through water 80% faster. A little clumsy on land (-10% speed).', 40, [2, 1]],
  ['rocketboots', 'Rocket Boots', 'feet', '#d05020', 2.2, {}, { rocket: 2 }, 'Press jump in mid-air to fire the boots (2 bursts, refill on the ground). Loud.', 220, [2, 1]],
  ['jetpack', 'Salvaged Jetpack', 'belt', '#a0a8b0', 4.5, {}, { jet: 1 }, 'Hold jump in mid-air to fly on a sputtering flame. The fuel cell refills while you stand on solid ground.', 420, [2, 2]],
  ['wayfarer', 'Wayfarer\'s Cloak', 'body', '#a89070', 1.4, { noise: 0.65, cold: 0.8 }, { armor: 0.15, res: { sharp: 0.15, bite: 0.15, blunt: 0.1 } }, 'A travelling cloak dyed with cave ash: -35% noise, keeps the chill off.', 180, [2, 2]],
  ['spurs', 'Hunter\'s Spurs', 'feet', '#5a4030', 1, { runSpeed: 1.15, fall: 0.85 }, { grip: 1 }, 'Light boots with hooked spurs: sprint 15% faster, grip walls, -15% fall damage.', 160, [2, 1]],
  ['duelgaunt', 'Duelist\'s Gauntlets', 'hands', '#a03028', 0.8, { melee: 1.15, swing: 1.1 }, { parryW: 1.3 }, 'Lacquered steel cuffs: +15% melee, swings 10% faster, parry window 30% wider.', 200, [1, 1]],
  ['luckycoin', 'Delver\'s Lucky Coin', 'charm', '#e0b040', 0.05, { loot: 1.2, barter: 0.9 }, {}, 'Flip it before every cache: +20% loot, traders charge 10% less.', 150, [1, 1]],
  ['owlamulet', 'Owl-Eye Amulet', 'charm', '#c08a40', 0.1, { sight: 1.35, lamp: 1.15 }, {}, 'You see 35% further into the dark.', 160, [1, 1]],
  ['plaguemask', 'Plague Doctor\'s Mask', 'face', '#e8e0d0', 0.6, { infect: 0.6, gas: 0.4, tox: 0.8 }, { mask2: 1 }, 'A beak stuffed with herbs: shrugs off most spores and gas, -40% infection.', 190, [1, 1]],
  ['delverwhistle', 'Delver\'s Whistle', 'charm', '#c0c4ca', 0.05, {}, { curseRes: 0.25 }, 'A cave raider\'s whistle. Blowing it steadies you: the Curse of the Abyss builds 25% slower.', 120, [1, 1]],
];
for (const [id, name, slot, col, w, gmods, ex, desc, value, s] of GEAR) {
  IT[id] = Object.assign({ name, icon: id, col, w, cat: 'gear', slot, gmods, desc, worth: value }, ex); sz(id, s[0], s[1]);
}
IT.swimfins.icon = 'gi_swimfins';
// curse remedies — every symptom has a cure (and a few general ones)
const REM = [
  ['gingerroot', 'Ginger Root', 'dizzy', 'Chew it: clears dizziness and keeps it away for 6 minutes. Also eases nausea a little.', 14, 'food'],
  ['antiemetic', 'Settling Tincture', 'nausea', 'A bitter green draught: stops the retching and blocks nausea for 6 minutes.', 18],
  ['warmsalve', 'Circulation Salve', 'numb', 'Rub it in until your fingers burn: brings feeling back to numb limbs, 6 minutes of protection.', 20],
  ['claritydrops', 'Clarity Drops', 'halluc', 'Two drops in each eye: the phantoms fade. Blocks hallucinations for 6 minutes.', 24],
  ['coagulant', 'Coagulant Pills', 'bleedout', 'Stops the curse bleeding from your nose, ears and eyes, and slows other bleeding for 6 minutes.', 26],
  ['wakesalts', 'Waking Salts', 'senseless', 'Sharp enough to wake the dead: restores sight and hearing, blocks sensory loss for 6 minutes.', 26],
  ['calmtea', 'Calmroot Tea', 'frenzy', 'Steady hands, quiet mind: ends the frenzy and keeps your body your own for 6 minutes.', 22],
  ['antihollow', 'Anti-Hollow Serum', 'hollow', 'Halts the transformation and reverses some of it. Protects against metamorphosis for 6 minutes.', 60],
  ['ascentbalm', 'Ascent Balm', 'all', 'The delver\'s miracle: lowers the curse sharply and cures every current symptom.', 90],
  ['mandrake', 'Abyssal Mandrake', 'hollow', 'A screaming root from the deep layers. Eaten raw it slows the change in your flesh.', 40, 'food'],
];
for (const [id, name, sym, desc, value, cat] of REM) { IT[id] = { name, icon: id, w: 0.1, cat: cat || 'med', med: cat === 'food' ? undefined : 'drug', stack: 5, worth: value, desc, abyss: sym }; if (cat === 'food') { IT[id].hunger = 4; IT[id].thirst = 0; } sz(id, 1, 1); }
// field medicine
IT.poultice = { name: 'Herbal Poultice', icon: 'poultice', w: 0.1, cat: 'med', med: 'drug', stack: 5, worth: 16, fx: 'poultice', desc: 'Crushed herbs packed in a clean rag: closes small wounds everywhere, clears dirt and cuts infection.' };
IT.honeydress = { name: 'Honey Dressing', icon: 'honeydress', w: 0.1, cat: 'med', med: 'drug', stack: 5, worth: 22, fx: 'honey', desc: 'Honey kills rot. Stops infection cold and calms every open wound\'s bleeding.' };
IT.bloodtonic = { name: 'Blood Tonic', icon: 'bloodtonic', w: 0.3, cat: 'med', med: 'drug', stack: 3, worth: 40, fx: 'tonic', desc: 'Iron, mushroom and herb stock: restores 600ml of blood over a minute.' };
IT.broth = { name: 'Mushroom Broth', icon: 'broth', w: 0.4, cat: 'food', hunger: 32, thirst: 18, stress: -8, stack: 3, worth: 14, warm: 1, desc: 'Hot, salty, earthy. Warms you through.' };
for (const id of ['poultice', 'honeydress', 'bloodtonic', 'broth']) sz(id, 1, 1);
// artifacts: one of each per run, sealed in hidden vaults
NE.ARTIFACTS = [
  // id, name, grade, slot/cat, desc, extra
  ['starcompass', 'Star Compass', 'Special', 'charm', 'Its needle points at the heart of the Abyss. Shows the way to every hidden vault and town on your map, and reveals each level as you enter it.', { compass: 1 }],
  ['unheardbell', 'Unheard Bell', 'Special', 'charm', 'Ring it ([Q] while worn): for 8 seconds everything around you stops. Recharges in 90 seconds.', { bell: 1 }],
  ['sovereign', 'Sovereign of Dawn', 'Special', 'body', 'A white whistle\'s armour. Almost nothing gets through: 70% protection against everything, no slowdown.', { armor: 0.75, res: { bullet: 0.7, sharp: 0.7, blunt: 0.7, bite: 0.7, burn: 0.6, frag: 0.7 }, spd: 1, dur: 999 }],
  ['hollowheart', 'Hollow\'s Heart', 'Special', 'charm', 'The heart of one who survived the sixth layer. The Curse of the Abyss can no longer change you. -15% max blood.', { curseImm: 1 }],
  ['blazereap', 'Blaze Reap', '1st', 'weapon', 'A pickaxe that burns from within. Every strike or dig bursts into fire, and it chews through rock like paper.', null],
  ['thousandpins', 'Thousand-Men Pins', '1st', 'charm', 'Pins worn in the hair of the strongest delvers: +50% melee damage, +12kg carry.', { gmods: { melee: 1.5 } }],
  ['gangway', 'Gangway', '1st', 'weapon', 'A gauntlet that fires a lance of light, piercing everything in its path. Drinks lantern oil (batteries).', null],
  ['eternalfortune', 'Eternal Fortune', '1st', 'charm', 'Cheats death once: when a wound would kill you, you wake with your blood restored. Then it crumbles.', { fortune: 1 }],
  ['sunsphere', 'Sun-Sphere', '2nd', 'charm', 'Warm as a little sun: you never feel cold, every body part slowly mends, and the dark is less deep.', { gmods: { cold: 0.1, lamp: 1.2 }, sun: 1 }],
  ['prayerbone', 'Prayer Bone Whistle', '2nd', 'charm', 'A whistle carved from a delver\'s bone. The Curse of the Abyss builds 60% slower.', { curseRes: 0.6 }],
  ['gentleknock', 'Gentle Knock', '2nd', 'hands', 'Knock once on a person and they lose the will to fight. Human foes you hit may drop their weapons and flee.', { knock: 1 }],
  ['seaglass', 'Sea-Glass Bubble', '2nd', 'charm', 'A bubble of air that never pops. Breathe underwater forever and swim like a fish.', { air: 9999, fins: 1 }],
  ['thinkingstone', 'Thinking Stone', '3rd', 'charm', 'It hums when danger looks at you: enemies\' attacks flash before they land, and your parry window is 40% wider.', { parryW: 1.4, foresight: 1 }],
  ['invlantern', 'Ever-Burning Lantern', '3rd', 'charm', 'Its flame never gutters: your lantern never runs out, shines 30% further, and makes vault walls glimmer.', { gmods: { lamp: 1.3 }, everlamp: 1 }],
  ['moonflute', 'Moon-Reed Flute', '3rd', 'charm', 'Its note soothes beasts: animals and ferals will not attack you unless you strike first.', { calmBeasts: 1 }],
  ['stillward', 'Stilling Ward', '4th', 'charm', 'A stone that drinks pain: pain is halved and your mind steadier (-30% stress).', { gmods: { stress: 0.7 }, painHalf: 1 }],
];
for (const [id, name, grade, slot, desc, ex] of NE.ARTIFACTS) {
  const base = { name, icon: id, col: '#ffd890', w: 0.4, worth: 900, artifact: grade, desc: '[' + grade + ' Grade Artifact] ' + desc };
  if (slot === 'weapon') continue;
  IT[id] = Object.assign(base, { cat: 'gear', slot }, ex || {}); sz(id, 1, 1);
}
IT.sovereign.w = 3; sz('sovereign', 2, 2); IT.gentleknock.gmods = { melee: 1.05 };
IT.blazereap = { name: 'Blaze Reap', icon: 'blazereap', col: '#e05020', w: 2.6, cat: 'weapon', dig: 9, artifact: '1st', worth: 900, blaze: 1, melee: { dmg: 30, kind: 'sharp', reach: 15, stam: 9, cd: 0.62 }, desc: '[1st Grade Artifact] A pickaxe that burns from within. Every strike bursts into flame, and it digs through rock like paper.' };
IT.gangway = { name: 'Gangway', icon: 'gangway', col: '#e0f0ff', w: 1.2, cat: 'weapon', artifact: '1st', worth: 900, beam: 1, melee: { dmg: 10, kind: 'blunt', reach: 9, stam: 5, cd: 0.4 }, desc: '[1st Grade Artifact] A gauntlet that fires a lance of light through everything in its path. Right-click to fire; drinks one Battery per shot.' };
sz('blazereap', 3, 2); sz('gangway', 1, 2);
if (NE.Combat && NE.Combat.WLEN) { NE.Combat.WLEN.blazereap = 11; NE.Combat.WLEN.gangway = 3; }
NE.ARTI_IDS = NE.ARTIFACTS.map(a => a[0]);

// =====================================================================================================================
// LOOT: less of everything (especially food and water), and biome-only containers — 25 new ones, 45+ in total
// =====================================================================================================================
const nerf = (tab, ids, k) => { for (const e of tab) if (ids.includes(e[0])) e[1] *= k; };
nerf(L.common, ['water', 'dirtywater', 'ration', 'chocolate', 'mushroom', 'spoiled', 'alcohol', 'can'], 0.55);
if (L.food) nerf(L.food, ['ration', 'chocolate', 'water', 'can'], 0.6);
nerf(L.mine, ['water', 'ration'], 0.5); nerf(L.frost, ['water', 'ration'], 0.5); nerf(L.wreck, ['water'], 0.5);
for (const k in NE.CONTAINERS) { const C = NE.CONTAINERS[k]; if (!C.n || k === 'pod' || k === 'cabinet') continue; C.n = [Math.max(0, C.n[0] - (C.n[0] > 1 ? 1 : 0)), Math.max(1, C.n[1] - 1)]; }
// biome loot tables
L.grove = [['herb', 4], ['mushroom', 3], ['gingerroot', 2], ['poultice', 1.5], ['rag', 3], ['clharness', 0.4], ['crampons', 0.2], ['owlamulet', 0.15]];
L.sands = [['trinket', 4], ['cactus', 3], ['antiemetic', 1.2], ['nomadwrap', 0.8], ['luckycoin', 0.25], ['wayfarer', 0.2], ['water', 1], ['knife', 1]];
L.tundra = [['warmsalve', 1.5], ['crampons', 0.8], ['alcohol', 2], ['battery', 2], ['ration', 1], ['furhood', 0.6], ['clharness', 0.5]];
L.prism = [['claritydrops', 1.6], ['datashard', 3], ['antirad', 2], ['owlamulet', 0.3], ['scubamask', 0.3], ['battery', 2]];
L.cinder = [['coagulant', 1.4], ['scrap', 4], ['dynamite', 1], ['rocketboots', 0.12], ['firemask', 0.4], ['tape', 2]];
L.comb = [['honeydress', 1.5], ['honey', 3], ['calmtea', 1], ['herb', 2], ['chitinhelm', 0.4], ['bloodtonic', 0.6]];
L.abyssal = [['scubatank', 0.6], ['scubamask', 0.7], ['swimfins', 0.8], ['wakesalts', 1.2], ['divehelm', 0.4], ['shells', 1.5], ['battery', 1.5]];
L.relic = [['trinket', 4], ['calmtea', 1.2], ['antihollow', 0.5], ['delverwhistle', 0.4], ['bonemail', 0.3], ['mandrake', 0.6]];
L.core = [['antihollow', 1.2], ['ascentbalm', 0.4], ['mandrake', 1], ['nectar', 0.3], ['bloodtonic', 1], ['rocketboots', 0.15]];
L.bandit = [['pistol', 1.2], ['revolver', 0.8], ['shotgun', 0.4], ['hunting', 0.4], ['machete', 1.4], ['fireaxe', 0.6], ['ammo9', 3], ['ammo357', 2], ['shells', 2], ['policevest', 0.8], ['knucklegloves', 0.6], ['runshoes', 0.5], ['dynamite', 1], ['luckycoin', 0.15], ['rocketboots', 0.08], ['jetpack', 0.03]].filter(e => IT[e[0]]);
for (const t of ['common', 'med']) L[t].push(['gingerroot', 0.6], ['antiemetic', 0.4]);
L.med.push(['poultice', 1.2], ['coagulant', 0.4, 900], ['ascentbalm', 0.1, 1500]);
// remove the containers that used to appear everywhere, keep each one in one biome
const ONE = { raidstash: 'grotto', toolbox: 'grotto', minecart: 'desert', ammobox: 'magma', gunlocker: 'crystal', wardrobe: null, forager: 'grotto', reliquary: 'desert', cocoon: 'hive', pilgrim: 'ossuary' };
for (const r in NE.CT_REGION) NE.CT_REGION[r] = NE.CT_REGION[r].filter(([id]) => !(id in ONE) || ONE[id] === r);
const NEWCT = [
  ['fairyring', 'Fairy-Ring Stump', 'basket', '#6a5a3a', 'wood', [['grove', 1.4], ['common', 0.4]], [1, 2], 'grotto'],
  ['hermitpack', 'Hermit\'s Bindle', 'bindle', '#7a6a4a', 'cloth', [['grove', 1], ['med', 0.6]], [1, 2], 'grotto'],
  ['mossbody', 'Moss-Covered Delver', 'body', '#4a6a30', 'cloth', [['grove', 0.8], ['armor', 0.4], ['raider', 0.3]], [1, 2], 'grotto'],
  ['canopic', 'Canopic Jars', 'urn', '#c09a60', 'wood', [['sands', 1.2], ['ruin', 0.8]], [1, 2], 'desert'],
  ['nomadbox', 'Nomad Strongbox', 'chest', '#8a5a30', 'wood', [['sands', 1.3], ['raider', 0.5]], [1, 3], 'desert'],
  ['sandbody', 'Sand-Buried Traveller', 'body', '#b08850', 'cloth', [['sands', 1], ['food', 0.3]], [1, 2], 'desert'],
  ['radiocase', 'Expedition Radio Case', 'box', '#4a5a6a', 'metal', [['tundra', 1.2], ['frost', 0.6]], [1, 2], 'ice'],
  ['icecrate', 'Ice-Locked Crate', 'crate', '#a8c8e0', 'wood', [['tundra', 1], ['frost', 1]], [1, 3], 'ice'],
  ['fishbasket', 'Ice-Fisher\'s Basket', 'basket', '#6a7a88', 'cloth', [['tundra', 0.8], ['food', 0.6]], [1, 2], 'ice'],
  ['crystalpod', 'Resonant Crystal Pod', 'geode', '#80d0ff', 'wood', [['prism', 1.4], ['rare', 0.4]], [1, 2], 'crystal'],
  ['surveycase', 'Surveyor\'s Case', 'box', '#c0b070', 'metal', [['prism', 1], ['lab', 0.7]], [1, 2], 'crystal'],
  ['prismcoffin', 'Prism Coffin', 'coffin', '#8a7ad0', 'wood', [['prism', 1.2], ['armor', 0.5]], [1, 3], 'crystal'],
  ['obsidurn', 'Obsidian Vessel', 'urn', '#2a2228', 'wood', [['cinder', 1.2], ['rare', 0.5]], [1, 2], 'magma'],
  ['crucible', 'Smelter\'s Crucible', 'cart', '#7a3a20', 'metal', [['cinder', 1.3], ['forge', 0.6]], [1, 3], 'magma'],
  ['charred', 'Charred Delver', 'body', '#2a1a14', 'cloth', [['cinder', 0.8], ['med', 0.5], ['weapon', 0.3]], [1, 2], 'magma'],
  ['nectarcask', 'Nectar Cask', 'barrel', '#b07020', 'wood', [['comb', 1.3], ['food', 0.4]], [1, 2], 'hive'],
  ['royalcell', 'Royal Cell', 'cell', '#e8b030', 'cloth', [['comb', 1], ['rare', 0.8]], [1, 2], 'hive'],
  ['dronehusk', 'Drone Husk', 'body', '#6a4a20', 'cloth', [['comb', 0.8], ['hive', 0.6]], [1, 2], 'hive'],
  ['giantclam', 'Giant Clam', 'geode', '#d0c8b8', 'wood', [['abyssal', 1.4], ['rare', 0.5]], [1, 2], 'drowned'],
  ['netbundle', 'Fisher\'s Net Bundle', 'sack', '#5a6a5a', 'cloth', [['abyssal', 1], ['wreck', 0.6]], [1, 2], 'drowned'],
  ['drownbody', 'Drowned Delver', 'body', '#2a4a4a', 'cloth', [['abyssal', 0.9], ['armor', 0.4]], [1, 2], 'drowned'],
  ['saintbox', 'Saint\'s Reliquary', 'chest', '#d8c890', 'metal', [['relic', 1.4], ['rare', 0.5]], [1, 3], 'ossuary'],
  ['boneurn', 'Bone-Ash Urn', 'urn', '#c8c0a8', 'wood', [['relic', 1], ['bone', 0.7]], [1, 2], 'ossuary'],
  ['heartbloom', 'Heart-Bloom', 'pod2', '#e04070', 'cloth', [['core', 1.3]], [1, 2], 'heart'],
  ['veincache', 'Vein-Wrapped Cache', 'cocoon', '#a02040', 'cloth', [['core', 1], ['med', 0.6]], [1, 3], 'heart'],
  ['lastpilgrim', 'The Last Pilgrim', 'body', '#5a2a3a', 'cloth', [['core', 0.8], ['relic', 0.6], ['raider', 0.3]], [1, 2], 'heart'],
];
for (const [id, name, shape, col, snd, tables, n, reg] of NEWCT) {
  NE.CONTAINERS[id] = { name, shape, col, sound: snd, tables, n, search: shape === 'body' || shape === 'basket' || shape === 'sack' ? 1.3 : 1.9, lock: shape === 'chest' ? 0.2 : 0 };
  (NE.CT_REGION[reg] = NE.CT_REGION[reg] || []).push([id, 1.4]);
}
NE.CONTAINERS.banditchest = { name: 'Bandit Strongbox', shape: 'chest', col: '#4a2a1a', sound: 'metal', tables: [['bandit', 1.6], ['rare', 0.5]], n: [3, 5], search: 2.2, lock: 0.5 };
NE.CONTAINERS.vault = { name: 'Vault Offering Box', shape: 'chest', col: '#c0a050', sound: 'metal', tables: [['rare', 1.2], ['core', 0.6], ['med', 0.6]], n: [2, 3], search: 2 };

// =====================================================================================================================
// SUB-BIOMES: every biome comes in three flavours and each run picks one per biome
// =====================================================================================================================
const SUB = {
  grotto: [
    { id: 'fungal', name: 'Fungal Grotto', tint: ['#4a4436', '#1c1a22', '#8a5aa0'], flora: ['fl_cap', 'fl_cap', 'fl_bell', 'fl_puff'], fauna: ['fa_moth', 'fa_snail', 'fa_firefly'], note: 'Towering mushrooms and drifting spores.' },
    { id: 'verdant', name: 'Verdant Grotto', tint: ['#4a5236', '#18241a', '#5a9a3a'], flora: ['fl_fern', 'fl_fern', 'fl_bell', 'fl_tulip'], fauna: ['fa_firefly', 'fa_beetle', 'fa_frog'], note: 'Ferns, flowers and fireflies. Almost pleasant.' },
    { id: 'weeping', name: 'Weeping Grotto', tint: ['#3e4a44', '#141e1e', '#4a8a7a'], flora: ['fl_fern', 'fl_reed', 'fl_bell'], fauna: ['fa_frog', 'fa_bat', 'fa_snail'], wet: 1, note: 'Water drips from every surface into still pools.' },
  ],
  desert: [
    { id: 'dunes', name: 'Buried Dunes', tint: ['#b88a50', '#2e2010', '#e0c080'], flora: ['fl_dune', 'fl_cactus', 'fl_dune'], fauna: ['fa_scarab', 'fa_lizard'], note: 'Sand has swallowed half the caves.' },
    { id: 'tombs', name: 'Sunken Tombs', tint: ['#9a7a58', '#241a14', '#c8a070'], flora: ['fl_dune', 'fl_cactusbloom'], fauna: ['fa_scarab', 'fa_bat'], note: 'Rows of carved tombs, sealed long ago.' },
    { id: 'oasis', name: 'Hidden Oasis', tint: ['#a88050', '#1e2014', '#80b050'], flora: ['fl_palm', 'fl_cactusbloom', 'fl_reed'], fauna: ['fa_lizard', 'fa_firefly', 'fa_frog'], wet: 1, note: 'Spring water and stubborn green life.' },
  ],
  ice: [
    { id: 'glacier', name: 'Blue Glacier', tint: ['#5a80a8', '#101c30', '#c8e8ff'], flora: ['fl_frost', 'fl_icelily'], fauna: ['fa_icecrab', 'fa_snowmoth'], note: 'Sheer blue ice, groaning under its own weight.' },
    { id: 'tundra', name: 'Snowbound Hollows', tint: ['#6a7888', '#18202a', '#f0f8ff'], flora: ['fl_frost', 'fl_dune'], fauna: ['fa_hare', 'fa_snowmoth'], note: 'Drifts of snow blown down from who knows where.' },
    { id: 'aurora', name: 'Aurora Caverns', tint: ['#4a6a80', '#0c1424', '#90ffd0'], flora: ['fl_icelily', 'fl_crystal'], fauna: ['fa_wisp', 'fa_icecrab'], note: 'Green light ripples across the ice ceiling.' },
  ],
  crystal: [
    { id: 'amethyst', name: 'Amethyst Halls', tint: ['#4a3a6a', '#160f26', '#c090ff'], flora: ['fl_crystal', 'fl_prism'], fauna: ['fa_mite', 'fa_wisp'], note: 'Violet crystal grows like a forest.' },
    { id: 'geodes', name: 'Geode Fields', tint: ['#3a4a5a', '#0e1620', '#80d0ff'], flora: ['fl_crystal', 'fl_crystal', 'fl_prism'], fauna: ['fa_mite', 'fa_moth'], note: 'Cracked geodes the size of houses.' },
    { id: 'singing', name: 'Singing Crystals', tint: ['#5a4a5a', '#1a1220', '#ff90d0'], flora: ['fl_prism', 'fl_bell'], fauna: ['fa_wisp', 'fa_jelly'], note: 'The crystals hum when you walk past.' },
  ],
  magma: [
    { id: 'obsidian', name: 'Obsidian Wastes', tint: ['#2a2024', '#120a0c', '#ff5020'], flora: ['fl_ash', 'fl_ember'], fauna: ['fa_emberfly', 'fa_salamander'], note: 'Glassy black rock, sharp as knives.' },
    { id: 'sulfur', name: 'Sulfur Vents', tint: ['#4a4020', '#1a160a', '#e0d040'], flora: ['fl_ash', 'fl_sulfur'], fauna: ['fa_emberfly', 'fa_beetle'], note: 'Yellow crusts and rotten-egg air.' },
    { id: 'forge', name: 'Ancient Forgeworks', tint: ['#4a2a20', '#1e100c', '#ff9050'], flora: ['fl_ember', 'fl_ash'], fauna: ['fa_salamander', 'fa_emberfly'], note: 'Someone smelted metal here, long ago.' },
  ],
  hive: [
    { id: 'waxen', name: 'Waxen Halls', tint: ['#a07020', '#2a1a08', '#ffd060'], flora: ['fl_wax', 'fl_comb'], fauna: ['fa_bee', 'fa_bee'], note: 'Smooth wax walls, warm to the touch.' },
    { id: 'brood', name: 'Brood Chambers', tint: ['#8a4a20', '#22100a', '#ff9040'], flora: ['fl_comb', 'fl_vine'], fauna: ['fa_bee', 'fa_grub'], note: 'Rows of capped cells. Some of them twitch.' },
    { id: 'royal', name: 'Royal Gallery', tint: ['#a08040', '#1e1608', '#fff0a0'], flora: ['fl_wax', 'fl_tulip'], fauna: ['fa_bee', 'fa_moth'], note: 'Golden pillars and the scent of royal jelly.' },
  ],
  drowned: [
    { id: 'kelp', name: 'Kelp Forest', tint: ['#2a4a40', '#0a1a18', '#4ac080'], flora: ['fl_kelp', 'fl_kelp', 'fl_anemone'], fauna: ['fa_jelly', 'fa_fish'], wet: 1, note: 'Kelp sways in water that isn\'t there.' },
    { id: 'reef', name: 'Dead Reef', tint: ['#4a4a50', '#12141a', '#ff8070'], flora: ['fl_coral', 'fl_anemone'], fauna: ['fa_crab', 'fa_jelly'], wet: 1, note: 'Bleached coral and crab shells.' },
    { id: 'trench', name: 'Black Trench', tint: ['#1a2a30', '#05080a', '#40a0ff'], flora: ['fl_anemone', 'fl_kelp'], fauna: ['fa_angler', 'fa_jelly'], wet: 1, note: 'Lightless and very, very deep.' },
  ],
  ossuary: [
    { id: 'catacomb', name: 'Catacombs', tint: ['#8a8070', '#1a1610', '#e0d8c0'], flora: ['fl_bonelily', 'fl_candle'], fauna: ['fa_rat', 'fa_bat'], note: 'Niches full of bones, stacked with care.' },
    { id: 'charnel', name: 'Charnel Pits', tint: ['#6a5a50', '#1a100c', '#c06040'], flora: ['fl_bonelily', 'fl_marrow'], fauna: ['fa_rat', 'fa_crow'], note: 'Here they stopped stacking and started piling.' },
    { id: 'cathedral', name: 'Bone Cathedral', tint: ['#a89c80', '#1e1a14', '#ffe0a0'], flora: ['fl_candle', 'fl_bonelily'], fauna: ['fa_moth', 'fa_crow'], note: 'Arches of femurs, windows of skulls.' },
  ],
  heart: [
    { id: 'pulse', name: 'Pulsing Veins', tint: ['#6a2040', '#1a0610', '#ff4080'], flora: ['fl_heartvine', 'fl_nectar'], fauna: ['fa_wisp', 'fa_grub'], note: 'The walls beat. Slowly.' },
    { id: 'bloom', name: 'Nectar Bloom', tint: ['#8a4030', '#200a08', '#ffb040'], flora: ['fl_nectar', 'fl_nectar', 'fl_tulip'], fauna: ['fa_bee', 'fa_wisp'], note: 'Flowers the size of people, dripping gold.' },
    { id: 'maw', name: 'The Maw', tint: ['#3a1020', '#0c0306', '#ff2040'], flora: ['fl_heartvine', 'fl_marrow'], fauna: ['fa_angler', 'fa_grub'], note: 'Something enormous is breathing nearby.' },
  ],
};
NE.SUBBIOMES = SUB;
const mix = (a, b, k) => { const pa = NE.hexToRgb ? null : null; const h = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)]; const A = h(a), B = h(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
const VAR = {};
NE.subFor = (seed, bid) => { const L2 = SUB[bid]; if (!L2) return null; return L2[(NE.hash((seed >>> 0) % 100000, bid.length * 131 + bid.charCodeAt(0)) * L2.length | 0) % L2.length]; };
const biomeAt0 = NE.biomeAt;
NE.biomeAt = function (d) {
  const b = biomeAt0(d); const seed = NE._subSeed; if (seed == null || !SUB[b.id]) return b;
  const sb = NE.subFor(seed, b.id); const key = b.id + ':' + sb.id; if (VAR[key]) return VAR[key];
  const [tile, back, accent] = sb.tint; const p = b.pal;
  const pal = Object.assign({}, p, { tile: mix(p.tile, tile, 0.6), tile2: mix(p.tile2, NE.shade(tile, 0.8), 0.6), back: mix(p.back, back, 0.65), back2: mix(p.back2, NE.shade(back, 1.2), 0.6), bg: mix(p.bg, NE.shade(back, 0.6), 0.6), edge: mix(p.edge, accent, 0.45), top: mix(p.top, accent, 0.5) });
  const v = VAR[key] = Object.assign({}, b, { pal, sub: sb.id, subName: sb.name, name: sb.name, baseName: b.name, flora: sb.flora, fauna: sb.fauna, wet: sb.wet, perk: b.perk + ' ' + sb.note });
  return v;
};
const texFor0 = W_.texFor; W_.texFor = function (biome) { if (!biome.sub) return texFor0.call(this, biome); this.texSub = this.texSub || {}; const k = biome.id + ':' + biome.sub; const store = this.tex; this.tex = this.texSub[k] = this.texSub[k] || {}; try { return texFor0.call(this, biome); } finally { this.tex = store; } };
const ens0 = W_.ensure; W_.ensure = function () { if (!this.lobby) NE._subSeed = this.seed >>> 0; return ens0.apply(this, arguments); };

// =====================================================================================================================
// FLORA & FAUNA: biome-specific plants on the ground and little animated creatures (pure decoration)
// =====================================================================================================================
const FLORA = {
  fl_cap: ['cap', '#d8c0a0', '#a04a8a'], fl_bell: ['bell', '#3a6a2a', '#a0e0ff'], fl_puff: ['puff', '#5a4a3a', '#e0d0b0'], fl_fern: ['fern', '#3a7a2a', '#5aa03a'], fl_tulip: ['bell', '#3a6a2a', '#ff8060'],
  fl_reed: ['reed', '#4a6a3a', '#a08a50'], fl_dune: ['tuft', '#a08a50', '#d8c080'], fl_cactus: ['cactus', '#4a7a3a', '#6aa04a'], fl_cactusbloom: ['cactus', '#4a7a3a', '#ff60a0'], fl_palm: ['fern', '#5a8a3a', '#8ac050'],
  fl_frost: ['crystal', '#a8d0f0', '#ffffff'], fl_icelily: ['bell', '#6a90b0', '#d0f0ff'], fl_crystal: ['crystal', '#7a70b0', '#c0b0ff'], fl_prism: ['crystal', '#ff90d0', '#90ffd0'], fl_ash: ['tuft', '#3a3030', '#6a5a50'],
  fl_ember: ['bell', '#3a2018', '#ff7030'], fl_sulfur: ['puff', '#8a8030', '#f0e040'], fl_wax: ['cap', '#d0a040', '#ffe080'], fl_comb: ['comb', '#c08020', '#ffd060'], fl_vine: ['reed', '#5a4020', '#a07030'],
  fl_kelp: ['kelp', '#2a6a4a', '#4aa070'], fl_anemone: ['anemone', '#a04060', '#ff90b0'], fl_coral: ['coral', '#c0b0a0', '#ff8070'], fl_bonelily: ['bell', '#c8c0a8', '#fff4e0'], fl_candle: ['candle', '#e0d8c0', '#ffc060'],
  fl_marrow: ['cap', '#c8b8a0', '#a03030'], fl_heartvine: ['reed', '#802040', '#ff4080'], fl_nectar: ['bell', '#6a3020', '#ffc040'],
};
const FAUNA = {
  fa_moth: ['fly', '#d8c8a0'], fa_firefly: ['glow', '#d0ff60'], fa_snail: ['crawl', '#a08060'], fa_beetle: ['crawl', '#3a3a5a'], fa_frog: ['hop', '#5aa040'], fa_bat: ['bat', '#2a2228'],
  fa_scarab: ['crawl', '#3a6a8a'], fa_lizard: ['crawl', '#a07a40'], fa_icecrab: ['crawl', '#a0c8e0'], fa_snowmoth: ['fly', '#f0f8ff'], fa_hare: ['hop', '#e8e8f0'], fa_wisp: ['glow', '#90ffd0'],
  fa_mite: ['crawl', '#c090ff'], fa_jelly: ['jelly', '#ff90d0'], fa_emberfly: ['glow', '#ff8030'], fa_salamander: ['crawl', '#ff6020'], fa_bee: ['fly', '#ffc020'], fa_grub: ['crawl', '#e0d0a0'],
  fa_fish: ['jelly', '#80c0ff'], fa_crab: ['crawl', '#e06040'], fa_angler: ['glow', '#40a0ff'], fa_rat: ['crawl', '#6a5a50'], fa_crow: ['hop', '#1a1a20'],
};
const drawDecor0 = NE.drawDecor;
NE.drawDecor = function (ctx, d, pal, time, fl) {
  const fv = FLORA[d.k], av = FAUNA[d.k]; if (!fv && !av) return drawDecor0(ctx, d, pal, time, fl);
  const x = Math.round(d.x), y = Math.round(d.y); const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); }; const h = NE.hash(x, 7); const t = time || G.t || 0;
  if (fv) { const [shape, c1, c2] = fv; const sway = Math.round(Math.sin(t * 1.3 + h * 6) * 0.6);
    switch (shape) {
      case 'cap': { const n = 1 + (h * 3 | 0); for (let i = 0; i < n; i++) { const hh = 3 + ((h * 7 + i * 3) % 5 | 0), ox = i * 3 - n; R(ox, -hh, 1, hh, c1); R(ox - 1 - (i === 1 ? 1 : 0), -hh - 2, 3 + (i === 1 ? 2 : 0), 2, c2); R(ox, -hh - 2, 1, 1, NE.shade(c2, 1.4)); } break; }
      case 'bell': { const hh = 4 + (h * 4 | 0); R(0, -hh, 1, hh, c1); R(1, -hh + 2, 1, 1, c1); R(-1 + sway, -hh - 1, 3, 2, c2); R(sway, -hh + 1, 1, 1, NE.shade(c2, 0.7)); if (pal && h > 0.5) { ctx.fillStyle = c2 + '33'; ctx.fillRect(x - 2 + sway, y - hh - 3, 5, 5); } break; }
      case 'puff': R(-1, -3, 1, 3, c1); R(1, -2, 1, 2, c1); R(-2, -5, 3, 3, c2); R(1, -4, 2, 2, NE.shade(c2, 0.85)); if (Math.sin(t * 0.7 + h * 9) > 0.96) { ctx.fillStyle = c2 + '88'; ctx.fillRect(x - 1, y - 8 - ((t * 6) % 6 | 0), 1, 1); } break;
      case 'fern': for (let i = 0; i < 4; i++) { const k = (i - 1.5); R(Math.round(k * 2) + sway * (i % 2), -2 - i, 1, 2 + i, i % 2 ? c1 : c2); } R(0, -6, 1, 6, c1); break;
      case 'reed': for (let i = 0; i < 3; i++) { const hh = 5 + (((h * 10) + i * 3) % 4 | 0); R(i * 2 - 2, -hh, 1, hh, c1); R(i * 2 - 2 + (i === 1 ? sway : 0), -hh - 1, 1, 2, c2); } break;
      case 'tuft': for (let i = -2; i <= 2; i++) R(i, -1 - (Math.abs(i) === 1 ? 2 : 1) + (i === 0 ? -1 : 0), 1, 2 + (i === 0 ? 1 : 0), i % 2 ? c1 : c2); break;
      case 'cactus': R(0, -7, 2, 7, c1); R(-2, -5, 1, 3, c1); R(-1, -3, 1, 1, c1); R(3, -4, 1, 2, c1); R(2, -3, 1, 1, c1); R(0, -8, 2, 1, c2); break;
      case 'crystal': R(0, -6, 2, 6, c1); R(-2, -4, 2, 4, NE.shade(c1, 0.8)); R(2, -3, 1, 3, c2); R(0, -6, 1, 2, c2); if (Math.sin(t * 2 + h * 9) > 0.7) R(1, -5, 1, 1, '#ffffff'); break;
      case 'comb': for (const [a, b] of [[-3, -3], [0, -3], [-2, -6]]) { R(a, b, 3, 3, c1); R(a + 1, b + 1, 1, 1, c2); } break;
      case 'kelp': { const hh = 8 + (h * 8 | 0); for (let i = 0; i < hh; i++) R(Math.round(Math.sin(t * 1.5 + i * 0.5 + h * 5) * 1.2), -i, 1, 1, i % 3 ? c1 : c2); break; }
      case 'anemone': R(-2, -2, 5, 2, c1); for (let i = -2; i <= 2; i++) R(i + Math.round(Math.sin(t * 2 + i) * 0.6), -4 - (i % 2 ? 1 : 0), 1, 2, c2); break;
      case 'coral': R(0, -6, 1, 6, c1); R(-2, -4, 2, 1, c1); R(-2, -6, 1, 2, c1); R(1, -3, 2, 1, c1); R(2, -5, 1, 2, c1); R(-2, -7, 1, 1, c2); R(2, -6, 1, 1, c2); break;
      case 'candle': R(-2, -3, 1, 3, c1); R(1, -5, 1, 5, c1); R(-2, -4, 1, 1, c2); R(1, -6 - (Math.sin(t * 9 + h) > 0 ? 1 : 0), 1, 1, c2); ctx.fillStyle = c2 + '30'; ctx.fillRect(x - 3, y - 9, 7, 6); break;
    }
    return;
  }
  const [mode, col] = av; const ph = t * (0.4 + h * 0.4) + h * 40;
  switch (mode) {
    case 'fly': { const fx = Math.sin(ph) * 22, fy = -14 - Math.sin(ph * 2.3) * 6; const wing = Math.sin(t * 22 + h) > 0; ctx.fillStyle = col; ctx.fillRect(x + fx | 0, y + fy | 0, 1, 1); ctx.fillRect((x + fx | 0) - 1, (y + fy | 0) - (wing ? 1 : 0), 1, 1); ctx.fillRect((x + fx | 0) + 1, (y + fy | 0) - (wing ? 1 : 0), 1, 1); break; }
    case 'glow': { for (let i = 0; i < 3; i++) { const q = ph + i * 2.1; const fx = Math.sin(q) * 26 + Math.sin(q * 0.37) * 10, fy = -10 - Math.abs(Math.sin(q * 1.7)) * 18; const on = Math.sin(t * 3 + i * 2 + h * 9) > -0.3; if (!on) continue; ctx.fillStyle = col + '40'; ctx.fillRect(x + fx - 1 | 0, y + fy - 1 | 0, 3, 3); ctx.fillStyle = col; ctx.fillRect(x + fx | 0, y + fy | 0, 1, 1); } break; }
    case 'crawl': { const fx = Math.sin(ph * 0.5) * 16; const dir = Math.cos(ph * 0.5) > 0 ? 1 : -1; const leg = Math.sin(t * 14) > 0 ? 1 : 0; ctx.fillStyle = col; ctx.fillRect(x + fx - 1 | 0, y - 2, 3, 2); ctx.fillStyle = NE.shade(col, 1.3); ctx.fillRect(x + fx + dir | 0, y - 2, 1, 1); ctx.fillStyle = NE.shade(col, 0.6); ctx.fillRect(x + fx - 1 + leg | 0, y - 1, 1, 1); break; }
    case 'hop': { const k = (ph % 3.2); const jump = k < 0.5 ? Math.sin(k / 0.5 * Math.PI) * 6 : 0; const fx = Math.floor(ph / 3.2) % 2 ? 8 : -8; const fx2 = k < 0.5 ? lerp(-fx, fx, k / 0.5) : fx; ctx.fillStyle = col; ctx.fillRect(x + fx2 - 1 | 0, y - 3 - jump | 0, 3, 3); ctx.fillStyle = NE.shade(col, 0.6); ctx.fillRect(x + fx2 + 1 | 0, y - 3 - jump | 0, 1, 1); break; }
    case 'bat': { const ceil = fl && fl.c ? (fl.y0 + fl.c[clamp(Math.floor(d.x / T), 0, fl.c.length - 1)]) * T : y - 40; const awake = Math.sin(ph * 0.2) > 0.6; ctx.fillStyle = col;
      if (!awake) { ctx.fillRect(x, ceil, 1, 1); ctx.fillRect(x - 1, ceil + 1, 3, 2); } else { const fx = Math.sin(ph * 2) * 30, fy = ceil + 6 + Math.sin(ph * 3) * 4; const w = Math.sin(t * 18) > 0 ? -1 : 1; ctx.fillRect(x + fx | 0, fy | 0, 1, 1); ctx.fillRect((x + fx | 0) - 2, (fy | 0) + w, 2, 1); ctx.fillRect((x + fx | 0) + 1, (fy | 0) + w, 2, 1); } break; }
    case 'jelly': { const fx = Math.sin(ph * 0.4) * 14, fy = -18 - Math.sin(ph) * 5; const pulse = Math.sin(t * 3 + h) > 0 ? 1 : 0; ctx.fillStyle = col + '66'; ctx.fillRect(x + fx - 2 | 0, y + fy - 1 | 0, 5, 3 + pulse); ctx.fillStyle = col; ctx.fillRect(x + fx - 1 | 0, y + fy | 0, 3, 1); for (let i = -1; i <= 1; i++) ctx.fillRect(x + fx + i | 0, y + fy + 3 + pulse + (i & 1) | 0, 1, 2); break; }
  }
};

// =====================================================================================================================
// TOWNS: a single hatch is the only way in (nothing pours in from above), and Saltreach no longer sits over a hole
// =====================================================================================================================
const genTown0 = W_.genTown;
W_.genTown = function (f, fl, rows, g, c) {
  const pitIn = fl.pitIn.slice(), ladIn = fl.ladIn.slice(); fl.pitIn = []; fl.ladIn = [];
  const out = genTown0.call(this, f, fl, rows, g, c);
  const W = this.W, y0 = fl.y0, FH = NE.FH; const gv = FH - 4;
  // a solid 2-tile roof across the whole town
  for (let x = 0; x < W; x++) for (let r = 0; r < 2; r++) this.set(x, y0 + r, 1);
  // Saltreach and Ashfall: the bridge now crosses a shallow salt channel, not a chasm
  if (fl.townGap) { const [a, b] = fl.townGap; for (let x = a; x <= b; x++) for (let r = gv; r < FH; r++) this.set(x, y0 + r, 1); for (let x = a + 2; x <= b - 2; x++) this.set(x, y0 + gv, 5); fl.townGap = null; }
  // hatches: wherever a way down from the level above arrives, a ladder through the roof under a hatch
  const wx = NE.townHatchX ? NE.townHatchX(this, f) : null; const spots = wx != null ? [wx] : pitIn.map(p => Math.round((p[0] + p[1]) / 2)).concat(ladIn); if (!spots.length) spots.push(12);
  fl.hatches = [];
  const above = this.floors[f - 1];
  for (let hx of spots) { hx = clamp(hx, 4, W - 5); if (fl.hatches.includes(hx)) continue; fl.hatches.push(hx);
    for (let r = 2; r < gv; r++) if (this.get(hx, y0 + r) === 0) this.set(hx, y0 + r, 3);
    const o = { type: 'hatch', x: (hx + 0.5) * T, y: y0 * T, label: 'Town Hatch — open and climb down to ' + fl.town.name, act: 'hatch', tx: hx, ty: y0 };
    if (above) above.objs.push(o); }
  return out;
};
const drawObj0 = G.drawObj;
G.drawObj = function (ctx, o) {
  if (o.type === 'hatch') { const x = Math.round(o.x), y = Math.round(o.y); const open = G.world.get(o.tx, o.ty) === 3;
    ctx.fillStyle = '#2a2018'; ctx.fillRect(x - 6, y - 2, 12, 2); ctx.fillStyle = open ? '#140e0a' : '#6a5038'; ctx.fillRect(x - 5, y - 2, 10, 2); if (!open) { ctx.fillStyle = '#8a7050'; ctx.fillRect(x - 5, y - 2, 10, 1); ctx.fillStyle = '#c0a060'; ctx.fillRect(x - 1, y - 3, 2, 1); } else { ctx.fillStyle = '#6a5038'; ctx.fillRect(x - 6, y - 10, 2, 9); } return; }
  return drawObj0.apply(this, arguments);
};
const interact0 = G.interact;
G.interact = function () {
  const o = G.interactTarget(); if (o && o.act === 'hatch') { const W = G.world; if (W.get(o.tx, o.ty) !== 3) { W.setMod(o.tx, o.ty, 3); W.setMod(o.tx, o.ty + 1, 3); NE.Audio.play('open_metal'); G.toast('The hatch creaks open. A ladder leads down into the town.'); o.label = 'Town Hatch (open)'; } else G.toast('The hatch is open — climb down the ladder.'); return; }
  return interact0.apply(this, arguments);
};

// =====================================================================================================================
// LEVEL GENERATION ADDITIONS: biome-only containers, density for the wider world, plants & critters, bandit camps,
// sealed artifact vaults and wandering encounters
// =====================================================================================================================
const GENERIC = ['crate', 'locker', 'duffel', 'urn', 'weaponchest']; const POI_KEEP = ['cabinet', 'weaponchest', 'stash', 'pod'];
NE.ART_W = { Special: 0.5, '1st': 1, '2nd': 1.6, '3rd': 2.2, '4th': 2.6 }; NE.ART_MIN = { Special: 1200, '1st': 600, '2nd': 300, '3rd': 120, '4th': 0 };
const genFloorA = W_.genFloor;
W_.genFloor = function (f) {
  const fl = genFloorA.call(this, f); if (this.lobby || !fl || fl.town || f === 0) return fl;
  const W = this, Wd = W.W, y0 = fl.y0, FH = NE.FH, B = fl.biome.id, depth = fl.depth, g = fl.g, c = fl.c;
  const solid = (x, r) => W.solid(W.get(x, y0 + r)), air = (x, r) => W.get(x, y0 + r) === 0;
  const objNear = (tx, pad) => fl.objs.some(o => o.x != null && Math.abs(o.x / T - tx) < pad) || fl.spawns.some(s => Math.abs(s.x / T - tx) < pad);
  const groundCol = x => x > 4 && x < Wd - 5 && solid(x, g[x]) && air(x, g[x] - 1) && air(x, g[x] - 2) && air(x, g[x] - 3);
  const gy = x => (y0 + g[x]) * T;
  // 1) every container belongs to its biome
  const reg = NE.CT_REGION[B] || [];
  if (reg.length) for (const o of fl.objs) if (o.type === 'container' && GENERIC.includes(o.ct) && !(POI_KEEP.includes(o.ct) && fl.poi && o.x > fl.poi.x0 - 8 && o.x < fl.poi.x1 + 8)) { o.ct = NE.wpick(reg); o.label = NE.CONTAINERS[o.ct].name; o.locked = NE.CONTAINERS[o.ct].lock && chance(NE.CONTAINERS[o.ct].lock) ? 'lock' : null; if (NE.CONTAINERS[o.ct].bld !== 'shed') fl.decor = fl.decor.filter(d => !(d.k === 'shed' && Math.abs(d.x - o.x) < 2)); }
  // 2) the world is twice as wide: more lamps, decor and the odd extra foe (but no extra loot)
  for (let k = 0; k < ri(2, 4); k++) { const x = ri(5, Wd - 6) * T + 4; fl.objs.push({ type: 'lamp', x, y: W.ceilY(fl, x) + 1, on: chance(0.7), col: fl.biome.pal.lamp, flick: chance(0.5) ? rf(0.1, 0.8) : 0 }); }
  for (let k = 0; k < ri(4, 8); k++) { const x = ri(4, Wd - 6) * T; fl.decor.push({ k: pick(fl.biome.decor), x, y: W.groundY(fl, x), s: rf(0, 1) }); }
  const tbl = depth < 120 ? [['scav', 5], ['gunner', depth > 60 ? 1 : 0.01]] : fl.biome.enemies;
  for (let k = 0; k < (depth < 60 ? ri(0, 1) : ri(1, 2)); k++) { const x = ri(10, Wd - 10) * T; fl.spawns.push({ kind: 'enemy', type: NE.wpick(tbl), x, y: W.groundY(fl, x) }); }
  if (B === 'grotto') for (let k = 0; k < ri(2, 5); k++) fl.objs.push({ type: 'glowshroom', x: ri(5, Wd - 6) * T + 4, y: 0 });
  if (B === 'crystal') for (let k = 0; k < ri(3, 6); k++) fl.objs.push({ type: 'crystal', x: ri(5, Wd - 6) * T + 4, ceil: chance(0.4), col: pick(['#80d0ff', '#c090ff', '#90ffd0', '#ff90d0']) });
  for (const o of fl.objs) if ((o.type === 'glowshroom' || o.type === 'crystal') && !o.y) o.y = o.ceil ? W.ceilY(fl, o.x) + 1 : W.groundY(fl, o.x);
  // 3) plants and little animals
  if (fl.biome.flora) { for (let k = 0; k < ri(10, 18); k++) { const tx = ri(6, Wd - 7); if (!groundCol(tx)) continue; fl.decor.push({ k: pick(fl.biome.flora), x: tx * T + ri(0, 7), y: gy(tx), s: rf(0, 1) }); }
    for (let k = 0; k < ri(3, 6); k++) { const tx = ri(8, Wd - 9); if (!groundCol(tx)) continue; fl.decor.push({ k: pick(fl.biome.fauna), x: tx * T, y: gy(tx), s: rf(0, 1) }); } }
  // 4) bandit camp: a flat stretch with tents, a fire, a strongbox and guards
  const hallX = x => fl._poiHall && x > fl._poiHall[0] - 26 && x < fl._poiHall[1] + 6;
  if (f >= 3 && chance(fl.poi ? Math.min(0.25, 0.12 + depth / 8000) : Math.min(0.45, 0.25 + depth / 6000))) {
    for (let tries = 0; tries < 80; tries++) { const w = 20, x0 = ri(14, Wd - 15 - w); let ok = true; const gs = [];
      if (hallX(x0)) continue;
      for (let x = x0 - 1; x <= x0 + w; x++) { if (objNear(x, 2)) { ok = false; break; } for (let r = g[x]; r < Math.min(FH, g[x] + 2); r++) if (!solid(x, r)) { ok = false; break; } if (!ok) break; if (W.get(x, y0) === 0 && c[x] === 0) { ok = false; break; } gs.push(g[x]); }
      if (!ok) continue; gs.sort((a, b) => a - b); const gl = gs[gs.length >> 1]; if (gs[gs.length - 1] - gs[0] > 2) continue;
      // enough headroom, nothing wet nearby, and reachable from the path
      for (let x = x0 - 3; x <= x0 + w + 2 && ok; x++) for (let r = gl - 7; r <= gl + 1; r++) { const t = W.get(x, y0 + r); if (t === 5 || t === 9 || t === 11) { ok = false; break; } }
      for (let x = x0 - 1; x <= x0 + w && ok; x++) for (let r = gl - 6; r < Math.min(g[x], gl); r++) if (W.get(x, y0 + r) !== 0) { ok = false; break; }
      if (ok && fl._reach) { let any = false; for (let x = x0; x <= x0 + w; x++) if (fl._reach[(gl - 1) * Wd + x]) any = true; if (!any) ok = false; }
      if (!ok) continue;
      for (let x = x0 - 1; x <= x0 + w; x++) { for (let r = Math.min(g[x], gl); r < Math.max(g[x], gl); r++) W.set(x, y0 + r, r >= gl ? 1 : 0); g[x] = gl; }
      const cx = x0 + w / 2; fl.camp = { x0: x0 * T, x1: (x0 + w) * T };
      fl.decor.push({ k: 'btent', x: (x0 + 3) * T, y: gy(x0), s: 0.2 }, { k: 'btent', x: (x0 + w - 3) * T, y: gy(x0), s: 0.8 }, { k: 'bflag', x: (x0 + 1) * T, y: gy(x0), s: 0 }, { k: 'bflag', x: (x0 + w - 1) * T, y: gy(x0), s: 1 });
      fl.objs.push({ type: 'fire', x: cx * T, y: gy(cx | 0), label: 'Bandit Campfire', act: 'fire' });
      const box = this.container('banditchest', (cx + 4) * T, gy(cx | 0), depth); fl.objs.push(box);
      const types = depth < 300 ? ['scav', 'scav', 'gunner'] : depth < 900 ? ['scav', 'gunner', 'rival'] : ['rival', 'specops', 'gunner'];
      for (let i = 0; i < ri(3, 4); i++) { const x = (x0 + 2 + i * 5) * T; fl.spawns.push({ kind: 'enemy', type: pick(types), x, y: gy(x0), guard: true, bandit: true }); }
      break; }
    // noisy caves rarely leave a long flat shelf, so dig the camp into dry rock next to the path instead
    if (!fl.camp && fl._reach) for (let tries = 0; tries < 160; tries++) { const w = 18, x0 = ri(14, Wd - 15 - w), gl = ri(8, FH - 3); let ok = true, touch = 0;
      if (objNear(x0 + w / 2, w / 2 + 3) || hallX(x0)) continue;
      for (let x = x0 - 3; x <= x0 + w + 2 && ok; x++) for (let r = gl - 8; r <= gl + 2; r++) { const t = W.get(x, y0 + r); if (t === 5 || t === 9 || t === 11) { ok = false; break; } }
      if (!ok) continue;
      // don't plug a shaft the path drops through, and keep the band's roof and floor intact
      for (let x = x0 - 1; x <= x0 + w && ok; x++) { if (air(x, gl) && fl._reach[gl * Wd + x] && air(x, gl + 2)) ok = false; if (W.get(x, y0 + gl - 7) === 0 && gl - 7 <= 0) ok = false; }
      if (!ok) continue;
      for (let x = x0 - 1; x <= x0 + w; x++) for (let r = gl - 6; r < gl; r++) if (fl._reach[r * Wd + x]) touch++;
      if (touch < 3) continue;
      for (let x = x0 - 1; x <= x0 + w; x++) { for (let r = gl - 6; r < gl; r++) { const t = W.get(x, y0 + r); if (t !== 0 && t !== 2) W.set(x, y0 + r, 0); fl._reach[r * Wd + x] = 1; } for (let r = gl; r <= gl + 1; r++) if (!solid(x, r)) W.set(x, y0 + r, 1); g[x] = gl; }
      // soften the walls into ramps so the camp isn't a sealed box
      for (const [sx, d] of [[x0 - 2, -1], [x0 + w + 1, 1]]) for (let k = 0; k < 4; k++) { const x = sx + d * k; for (let r = gl - 6 + k; r < gl; r++) { if (W.get(x, y0 + r) !== 0 && W.get(x, y0 + r) !== 2) W.set(x, y0 + r, 0); fl._reach[r * Wd + x] = 1; } }
      const cx = x0 + w / 2; fl.camp = { x0: x0 * T, x1: (x0 + w) * T };
      fl.decor.push({ k: 'btent', x: (x0 + 3) * T, y: gy(x0), s: 0.2 }, { k: 'btent', x: (x0 + w - 3) * T, y: gy(x0), s: 0.8 }, { k: 'bflag', x: (x0 + 1) * T, y: gy(x0), s: 0 }, { k: 'bflag', x: (x0 + w - 1) * T, y: gy(x0), s: 1 });
      fl.objs.push({ type: 'fire', x: cx * T, y: gy(cx | 0), label: 'Bandit Campfire', act: 'fire' });
      const box = this.container('banditchest', (cx + 4) * T, gy(cx | 0), depth); fl.objs.push(box);
      const types = depth < 300 ? ['scav', 'scav', 'gunner'] : depth < 900 ? ['scav', 'gunner', 'rival'] : ['rival', 'specops', 'gunner'];
      for (let i = 0; i < ri(3, 4); i++) { const x = (x0 + 2 + i * 4) * T; fl.spawns.push({ kind: 'enemy', type: pick(types), x, y: gy(x0), guard: true, bandit: true }); }
      break; }
  }
  // 5) sealed artifact vault behind a cracked wall at one end of the level
  this._arts = this._arts || [];
  if (depth >= 120 && chance(Math.min(0.16, 0.06 + depth / 14000))) {
    const pool = NE.ARTIFACTS.filter(a => !this._arts.includes(a[0]) && depth >= NE.ART_MIN[a[2]]).map(a => [a[0], NE.ART_W[a[2]]]);
    if (pool.length) for (let tries = 0; tries < 400; tries++) {
      const x0 = ri(5, Wd - 14), r0 = ri(1, FH - 5); let ok = true;
      for (let x = x0 - 1; x <= x0 + 8 && ok; x++) for (let r = r0 - 1; r <= r0 + 4; r++) if (!solid(x, r)) { ok = false; break; }
      if (!ok || objNear(x0 + 4, 8)) continue;
      const openL = [0, 1, 2, 3].filter(k => air(x0 - 2, r0 + k)).length >= 2, openR = [0, 1, 2, 3].filter(k => air(x0 + 9, r0 + k)).length >= 2; if (!openL && !openR) continue;
      const side = openL ? -1 : 1; const art = NE.wpick(pool); this._arts.push(art);
      const room = [x0, x0 + 6], wall = side < 0 ? [x0 - 1, x0 - 1] : [x0 + 8, x0 + 8], gv = r0 + 4; const rx = x0 + 3;
      fl.vault = { x: (rx + 0.5) * T, y: (y0 + gv) * T, art, wallX: (side < 0 ? wall[0] : wall[1] + 1) * T, room: side < 0 ? [x0, x0 + 7] : [x0, x0 + 7], rows: [r0, r0 + 3], inner: side < 0 ? wall[1] : wall[0] };
      fl.objs.push({ type: 'artifact', x: (rx + 0.5) * T, y: (y0 + gv) * T, art, label: 'Something old and humming', act: 'artifact', sealed: true });
      const vb = this.container('vault', (rx + (side < 0 ? 2.5 : -2.5)) * T, (y0 + gv) * T, depth + 300); vb.sealed = true; vb.act = null; fl.objs.push(vb);
      let fy = r0 + 3; while (fy < FH - 1 && air(side < 0 ? wall[0] - 1 : wall[1] + 1, fy + 1)) fy++;
      fl.decor.push({ k: 'vcrack', x: fl.vault.wallX, y: (y0 + fy + 1) * T, s: side < 0 ? 1 : -1 });
      break; }
  }
  // 6) wandering encounters: a fist monk, a sword master or a travelling vendor (rarely, a wounded survivor)
  if (f >= 2 && chance(Math.min(0.16, 0.07 + depth / 14000))) { const enc = NE.wpick([['monk', 1], ['sword', 1], ['vendor', 1.4]]); for (let tries = 0; tries < 20; tries++) { const tx = ri(12, Wd - 13); if (!groundCol(tx) || objNear(tx, 3)) continue; fl.spawns.push({ kind: 'trader', enc, x: tx * T, y: gy(tx) }); break; } }
  for (const sp of fl.spawns) if (sp.y == null) sp.y = W.groundY(fl, sp.x);
  return fl;
};
const LIQT = { 5: 1, 9: 1, 11: 1 }; const range = ([a, b]) => { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; };
// decor: bandit tents & flags, the vault's cracked wall
const drawDecorB = NE.drawDecor;
NE.drawDecor = function (ctx, d, pal, time, fl) {
  const x = Math.round(d.x), y = Math.round(d.y); const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
  switch (d.k) {
    case 'btent': { const c = d.s > 0.5 ? '#6a4a30' : '#5a5038'; for (let i = 0; i < 12; i++) R(-i, -12 + i, i * 2 + 1, 1, i === 11 ? NE.shade(c, 0.6) : c); R(-1, -6, 3, 6, '#1a120c'); R(0, -14, 1, 3, '#3a2a1a'); return; }
    case 'bflag': { R(0, -20, 1, 20, '#3a2a1a'); const w = Math.sin((time || 0) * 3 + d.s * 5) > 0 ? 1 : 0; R(1, -20, 6, 4 + w, '#8a2020'); R(2, -19, 2, 1, '#e0d0b0'); R(3, -18, 1, 1, '#e0d0b0'); return; }
    case 'vcrack': { const side = d.s > 0 ? -1 : 1; const glim = 0.25 + 0.25 * Math.sin((time || 0) * 2) + (G.player && G.player.gear && G.player.gear.charm && G.player.gear.charm.id === 'invlantern' ? 0.4 : 0);
      ctx.fillStyle = '#0a0806'; for (let i = 0; i < 18; i++) ctx.fillRect(x + side * ((i * 7) % 3), y - 4 - i, 1, 1); ctx.fillStyle = 'rgba(255,220,140,' + glim.toFixed(2) + ')'; ctx.fillRect(x + side, y - 10, 1, 1); ctx.fillRect(x, y - 15, 1, 1); return; }
  }
  return drawDecorB.apply(this, arguments);
};

// =====================================================================================================================
// ENCOUNTERS: fist monks, sword masters and travelling vendors; bandits guard their camps; artifacts in their vaults
// =====================================================================================================================
const EXCL = ['rocketboots', 'jetpack', 'wayfarer', 'spurs', 'duelgaunt', 'luckycoin', 'owlamulet', 'plaguemask', 'delverwhistle', 'scubatank', 'clharness'];
const spawnA = G.spawnFloor;
G.spawnFloor = function (fl, restoring) {
  const n0 = G.actors.length; spawnA.apply(this, arguments);
  const fresh = G.actors.slice(n0); const sp = (fl.spawns || []).filter(s => s.kind === 'enemy' || s.kind === 'trader' || s.kind === 'survivor');
  for (const a of fresh) { const s = sp.find(q => !q._used && Math.abs(q.x - a.x) < 2 && ((a.D && q.kind === 'enemy') || (a.isNPC && q.kind === a.kind))); if (!s) continue; s._used = true;
    if (s.bandit) { a.bandit = true; a.post = true; a.label = 'Bandit'; }
    if (s.enc) NE.makeEncounter(a, s.enc, fl); }
  for (const s of sp) s._used = false;
};
const NAMES = { monk: ['Brother Ashen', 'Sister Kel', 'Old Tamo', 'The Quiet Hand', 'Brother Ubo'], sword: ['Ser Marrow', 'The Grey Blade', 'Hayato of the Ledge', 'Vash the Patient', 'Captain Orrin'], vendor: ['Nomad Jessop', 'Kiki the Collector', 'Wandering Pell', 'Grandmother Fen', 'Muttering Ox'] };
NE.makeEncounter = function (n, enc, fl) {
  n.enc = enc; n.masked = false; n.weapon = enc === 'sword' ? 'machete' : null; n.gear.body = null; n.name = NE.withSeed(NE.hash(fl.f, 77) * 1e9, () => pick(NAMES[enc]));
  if (enc === 'monk') { n.label = n.name + ' — Fist Monk'; n.act = 'teach'; n.shirt = '#c06020'; n.pants = '#7a3a18'; n.look.hair = 'bald'; }
  if (enc === 'sword') { n.label = n.name + ' — Sword Master'; n.act = 'teach'; n.shirt = '#2a2a3a'; n.pants = '#1a1a24'; }
  if (enc === 'vendor') { n.label = n.name + ' — Wandering Vendor'; n.act = 'trade'; n.shirt = '#5a3a6a'; n.packCol = ['#5a3a6a', '#d0a040']; n.greet = 'Things you won\'t find in any town. Prices you won\'t like.';
    n.stock = NE.withSeed(NE.hash(fl.f, 91) * 1e9, () => { const st = []; const ex = EXCL.slice(); for (let i = 0; i < 3; i++) { const id = ex.splice(ri(0, ex.length - 1), 1)[0]; st.push({ id, n: 1, price: Math.round((IT[id].worth || 100) * 1.3) }); } for (const id of ['ascentbalm', 'claritydrops', 'coagulant', 'antiemetic', 'bloodtonic']) if (chance(0.5)) st.push({ id, n: ri(1, 2), price: Math.round((IT[id].worth || 20) * 1.4) }); return st; }); }
};
NE.STYLES = { fist: { name: 'Way of the Open Palm', max: 3, cost: 40, per: 'unarmed blows +35% damage, punches 10% faster, and every hit can stagger' }, blade: { name: 'Patient Blade', max: 3, cost: 55, per: 'sharp weapons +15% damage, swings 8% faster, parry window +12%' } };
NE.styleLv = k => (G.run && G.run.style && G.run.style[k]) || 0;
NE.styleMul = function (a, w) { if (!a || !a.isPlayer || !w) return 1; if (w.id === 'fists' || w.id === 'jaws') return 1 + 0.35 * NE.styleLv('fist'); if (w.melee && w.melee.kind === 'sharp') return 1 + 0.15 * NE.styleLv('blade'); return 1; };
const pw0 = NE.Combat.parryWin; NE.Combat.parryWin = function (t) { let k = pw0 ? pw0(t) : 1; if (t && t.isPlayer) { for (const sl of ['hands', 'charm']) { const e = t.gear && t.gear[sl]; if (e && IT[e.id] && IT[e.id].parryW) k *= IT[e.id].parryW; } const w = t.weaponDef && t.weaponDef(); if (w && w.melee && w.melee.kind === 'sharp') k *= 1 + 0.12 * NE.styleLv('blade'); } return k; };
NE.teach = function (n) {
  const p = G.player, key = n.enc === 'monk' ? 'fist' : 'blade', S = NE.STYLES[key], lv = NE.styleLv(key); const cost = S.cost * (lv + 1); const val = G.tradeValue(p.inv);
  const line = n.enc === 'monk' ? '"Your fists are honest. Let me teach them to be dangerous."' : '"You swing like you\'re chopping wood. Sit. Watch."';
  NE.UI.dialog(n.label, '<i>' + line + '</i><p><b>' + S.name + '</b> — level ' + lv + '/' + S.max + '. Each lesson: ' + S.per + '.</p>', [
    { label: lv >= S.max ? 'You have learned all I can teach' : 'Train (' + cost + ' in trade)', hint: val >= cost ? 'Lesson ' + (lv + 1) + ' of ' + S.max : 'You need ' + cost + ' worth of trade goods', disabled: lv >= S.max || val < cost,
      fn: () => { G.payValue(p.inv, cost); NE.UI.fade(() => { G.run.style = G.run.style || {}; G.run.style[key] = lv + 1; p.stats.swing = (p.stats.swing || 1) * (key === 'fist' ? 1.1 : 1.08); G.run.t += 60; NE.Audio.play('ding'); G.toast(S.name + ' — level ' + (lv + 1) + '. ' + (key === 'fist' ? 'Your knuckles feel like stone.' : 'The blade feels lighter.')); G.log('Trained with ' + n.name + ': ' + S.name + ' ' + (lv + 1) + '.', 'good'); }); } },
    { label: 'Spar for free', hint: 'A quick bout: no lesson, but you get a feel for it', fn: () => { G.npcSay && G.npcSay(n, n.enc === 'monk' ? 'Breathe. Then strike.' : 'Feet first. The blade follows.', 3); } },
    { label: 'Leave' }]);
};
const interactB = G.interact;
G.interact = function () { const o = G.interactTarget(); if (o && o.act === 'teach') return NE.teach(o); if (o && o.act === 'artifact') return o.sealed ? null : NE.takeArtifact(o); return interactB.apply(this, arguments); };
// fist style: hits can stagger
const hurtS = NE.Actor.prototype.hurt; NE.Actor.prototype.hurt = function (part, dmg, kind, src, dir) { const r = hurtS.apply(this, arguments); const p = G.player; if (p && this !== p && this.D && src === p.surv.first) { const w = p.weaponDef(); if (w.id === 'fists' && NE.styleLv('fist') && chance(0.12 * NE.styleLv('fist'))) this.stagger = Math.max(this.stagger || 0, 0.7); { const w2 = p.weaponDef(); if (w2.blaze && kind !== 'burn' && this.alive) { hurtS.call(this, part, 7, 'burn', src, dir); for (let i = 0; i < 8; i++) G.addP(this.x + rf(-4, 4), this.y - 10 + rf(-6, 6), rf(-20, 20), rf(-60, -10), 0.5, i % 2 ? '#ff7020' : '#ffd060', 'spark', -0.2); } }
      if (p.gear && p.gear.hands && p.gear.hands.id === 'gentleknock' && !['feral', 'trog', 'husk', 'stalker', 'burrower'].includes(this.type) && chance(0.35)) { this.state = 'flee'; this.calmed = true; this.weapon = null; G.toast('Gentle Knock — they lose the will to fight.'); } } return r; };
// artifacts
NE.takeArtifact = function (o) {
  const p = G.player; const id = o.art; const it = IT[id]; if (!it) return;
  G.run.artifacts = G.run.artifacts || []; if (G.run.artifacts.includes(id)) return;
  const left = p.inv.add(id, 1); if (left) return G.toast('No room in your pack for it.');
  G.run.artifacts.push(id); G.meta.artifactLog = G.meta.artifactLog || {}; G.meta.artifactLog[id] = (G.meta.artifactLog[id] || 0) + 1;
  o.act = null; o.label = ''; o.taken = true; NE.Audio.play('chime'); G.flashT = 0.6;
  NE.UI.banner(it.name, it.artifact + ' Grade Artifact'); G.toast('Found: ' + it.name + ' (' + it.artifact + ' Grade Artifact)'); G.log('Recovered an artifact from a sealed vault: ' + it.name + '.', 'good');
};
const drawObjA = G.drawObj;
G.drawObj = function (ctx, o) {
  if (o.type === 'artifact') { const x = Math.round(o.x), y = Math.round(o.y); ctx.fillStyle = '#4a4038'; ctx.fillRect(x - 5, y - 6, 10, 6); ctx.fillStyle = '#6a5a48'; ctx.fillRect(x - 6, y - 7, 12, 2);
    if (!o.taken) { const t = G.t, b = Math.sin(t * 2) * 1.5; ctx.fillStyle = 'rgba(255,220,140,0.18)'; ctx.fillRect(x - 6, y - 20 + b, 12, 12); try { const im = NE.icon(o.art, null, 2, o.art); ctx.drawImage(im, x - 4, y - 17 + Math.round(b), 8, 8); } catch (e) { } if (Math.random() < 0.1) G.addP(x + rf(-5, 5), y - 12, 0, -12, 0.8, '#ffe0a0', 'glow', -0.1); }
    return; }
  return drawObjA.apply(this, arguments);
};

for (const id of Object.keys(IT)) if (IT[id].worth && !NE.PRICE[id] && (GEAR.some(g => g[0] === id) || REM.some(r => r[0] === id) || ['poultice', 'honeydress', 'bloodtonic', 'broth'].includes(id))) NE.PRICE[id] = IT[id].worth;

// =====================================================================================================================
// MOVEMENT: ledge hanging & pull-ups, rocket boots, jetpack, swim fins, breath underwater
// =====================================================================================================================
const has = (p, flag) => { const G2 = p.gear; if (!G2) return 0; let v = 0; for (const k in G2) { const e = G2[k]; if (e && IT[e.id] && IT[e.id][flag]) v = Math.max(v, IT[e.id][flag]); } return v; };
NE.gearFlag = has;
const ledgeAt = (a, d) => { const W = a.g.world; const hx = Math.floor((a.x + d * (a.w / 2 + 1.5)) / T); const ty = Math.floor((a.y - a.h + 1) / T);
  for (const t of [ty, ty + 1]) { if (!W.solid(W.get(hx, t)) || W.solid(W.get(hx, t - 1)) || W.solid(W.get(hx, t - 2))) continue; const ly = t * T; if (Math.abs((a.y - a.h) - ly) > 7) continue; if (W.solid(W.get(Math.floor(a.x / T), t - 1))) continue; return { d, ly, tx: hx, room: !W.solid(W.get(hx, t - 3)) }; } return null; };
const pmA = NE.Actor.prototype.physicsMove;
NE.Actor.prototype.physicsMove = function (dt, c) {
  if (!this.isPlayer) { if (this.D && NE.aiAdjust) NE.aiAdjust(this, dt, c); return pmA.call(this, dt, c); }
  const A = this.anat, W = this.g.world;
  this.hangCD = Math.max(0, (this.hangCD || 0) - dt);
  // ---- hanging from a ledge
  if (this.hang) { const H = this.hang; const jp = c.jump && !this._hj; this._hj = !!c.jump;
    if (A.uncon || this.rd || A.armFactor() < 0.3 || !W.solid(W.get(H.tx, Math.floor(H.ly / T)))) { this.hang = null; this.hangCD = 0.4; return pmA.call(this, dt, c); }
    if (H.pull != null) { H.pull += dt / 0.42; const k = Math.min(1, H.pull); this.y = lerp(H.ly + this.h - 1, H.ly - 0.01, k * k); this.x = lerp(H.x0, (H.tx + 0.5) * T, Math.max(0, k * 1.4 - 0.4)); this.vx = 0; this.vy = 0; this.climbPh += dt * 8;
      if (k >= 1) { this.hang = null; this.onGround = true; this.hangCD = 0.3; if (!H.room) { this.crouch = true; this.crawl = true; this.h = NE.HCRAWL; } A.stam -= 4; } return { landed: 0 }; }
    this.vx = 0; this.vy = 0; this.y = H.ly + this.h - 1; this.x = H.x0; this.onGround = false; this.facing = H.d;
    if (!has(this, 'rig')) A.stam -= dt * 2.2; if (A.stam <= 0) { this.hang = null; this.hangCD = 0.6; G.toast('Your grip gives out.'); return { landed: 0 }; }
    if (c.down) { this.hang = null; this.hangCD = 0.35; this.vy = 30; return { landed: 0 }; }
    if (jp && c.mx === -H.d) { this.hang = null; this.hangCD = 0.3; this.vy = -180; this.vx = -H.d * 120; this.facing = -H.d; A.stam -= 5; NE.Audio.play('step', 0.8); return { landed: 0 }; }
    if (jp || c.up) { H.pull = 0; NE.Audio.play('cloth', 0.6); }
    return { landed: 0 }; }
  // ---- swimming gear
  const wet = W.isWater(this.x, this.y - 2); const sm0 = this.speedMul; if (wet) this.speedMul = (this.speedMul || 1) * (1 + (has(this, 'fins') ? 0.8 : 0) + (has(this, 'scuba') ? 0.3 : 0));
  // ---- rocket boots: a burst on each mid-air jump press
  const jp = c.jump && !this._rjh; this._rjh = !!c.jump;
  if (this.onGround) { this.rocketN = has(this, 'rocket'); this.jetFuel = Math.min(3, (this.jetFuel == null ? 3 : this.jetFuel) + dt * 1.2); this.airT = 0; } else this.airT = (this.airT || 0) + dt;
  const rk = has(this, 'rocket');
  if (rk && jp && !this.onGround && !this.climbing && !wet && (this.wallCoy || 0) <= 0 && (this.rocketN || 0) > 0 && this.airT > 0.08 && !A.uncon) { this.rocketN--; this.vy = -235; NE.Audio.play('whoosh', 0.9); G.noise(this.x, this.y, 110); for (let i = 0; i < 12; i++) G.addP(this.x + rf(-2, 2), this.y, rf(-25, 25), rf(40, 110), rf(0.2, 0.5), i % 3 ? '#ff8030' : '#ffe080', 'spark', 0.2); }
  // ---- jetpack: hold jump in mid-air
  const jet = has(this, 'jet'); this.jetting = false;
  if (jet && c.jump && !this.onGround && !this.climbing && !wet && this.airT > 0.22 && (this.jetFuel || 0) > 0 && !A.uncon) { this.jetting = true; this.jetFuel -= dt; this.vy = Math.max(-130, this.vy - 1150 * dt); if (Math.random() < dt * 30) G.addP(this.x - this.facing * 3, this.y - 10, rf(-10, 10), rf(60, 120), rf(0.2, 0.4), Math.random() < 0.5 ? '#ff9040' : '#c0c0c0', 'spark', 0.1); this.jetSnd = (this.jetSnd || 0) - dt; if (this.jetSnd <= 0) { this.jetSnd = 0.18; NE.Audio.play('hiss', 0.4); G.noise(this.x, this.y, 60); } }
  const res = pmA.call(this, dt, c); this.speedMul = sm0;
  // ---- grab a ledge while falling past it (moving toward the wall or holding up)
  if (!this.onGround && !this.climbing && !this.wallClimb && !this.wallDown && !c.down && !this.crawl && !wet && this.vy > -40 && !this.hangCD && !A.uncon && !this.rd && A.armFactor() >= 0.35 && A.stam > 3 && !this.jetting) {
    for (const d of c.mx ? [c.mx] : c.up ? [this.facing] : []) { const L2 = ledgeAt(this, d); if (L2) { this.hang = { d, ly: L2.ly, tx: L2.tx, x0: this.x, room: L2.room }; this._hj = true; this.vx = 0; this.vy = 0; this.y = L2.ly + this.h - 1; this.facing = d; NE.Audio.play('step', 0.6); this.wallClimb = false; break; } } }
  return res;
};
// arms up while hanging
const poseH = NE.ragPose;
NE.ragPose = function (a) { const out = poseH(a); if (!a.hang) return out; const H = a.hang, d = H.d; const k = H.pull != null ? Math.min(1, H.pull) : 0; const hy = H.ly + (k > 0 ? 0 : 0); const hx = a.x + d * 3.5;
  out[4] = [hx - d * 0.5, hy - 0.5]; out[6] = [hx + d * 0.5, hy - 0.5]; out[3] = [lerp(out[1][0], hx, 0.5) - d, lerp(out[1][1], hy, 0.5)]; out[5] = [lerp(out[1][0], hx, 0.5) + d * 0.5, lerp(out[1][1], hy, 0.5) + 1];
  if (k === 0) { const sw = Math.sin(G.t * 2) * 0.6; out[8] = [out[8][0] + sw, out[8][1]]; out[10] = [out[10][0] - sw, out[10][1]]; } return out; };
// breath underwater
const puA = NE.Player.prototype.update;
NE.Player.prototype.update = function (dt) {
  const r = puA.apply(this, arguments); if (!this.alive || !G.world || G.world.lobby) return r;
  const under = G.world.isWater(this.x, this.y - this.h + 3); const cap = 12 + (has(this, 'air') || 0) + (has(this, 'scuba') ? 15 : 0) + (NE.hasGift && NE.hasGift(this, 'deeplungs') ? 10 : 0);
  this.breathMax = cap; if (this.breath == null) this.breath = cap;
  if (under) { this.breath -= dt; if (this.breath <= 0) { this.breath = 0; this.anat.stam -= dt * 20; this.drownT = (this.drownT || 0) + dt; if (this.drownT > 1) { this.drownT = 0; this.hurt('torso', 6, 'blunt', 'Drowning'); this.anat.org.lungs -= 3; G.toast('You\'re drowning — get to the surface!'); } } }
  else { this.breath = Math.min(cap, this.breath + dt * 6); this.drownT = 0; }
  return r;
};
const drawP = NE.Actor.prototype.draw;
NE.Actor.prototype.draw = function (ctx) { const r = drawP.apply(this, arguments); if (this.isPlayer && this.breathMax && this.breath < this.breathMax - 0.05) { const n = Math.ceil(this.breath / this.breathMax * 6); for (let i = 0; i < 6; i++) { ctx.fillStyle = i < n ? '#bfe8ff' : 'rgba(191,232,255,0.2)'; ctx.fillRect(Math.round(this.x) - 9 + i * 3, Math.round(this.y - this.h) - 8, 2, 2); } }
  if (this.isPlayer && this.jetting) { ctx.fillStyle = Math.random() < 0.5 ? '#ffb040' : '#ff6020'; ctx.fillRect(Math.round(this.x - this.facing * 3) - 1, Math.round(this.y - 8), 2, 3 + (Math.random() * 3 | 0)); } return r; };
// no slipping on ice with crampons
const pmI = NE.Actor.prototype.physicsMove; NE.Actor.prototype.physicsMove = function (dt, c) { const r = pmI.apply(this, arguments); if (this.isPlayer && this.onIce && has(this, 'noslip')) this.onIce = false; return r; };

// =====================================================================================================================
// DIGGING: every hit bites out a chunk of rock; tools bite much bigger chunks. Hold the button to keep digging.
// =====================================================================================================================
const digPow = (pl, w) => { const d = w.dig || 0.3; return d * (pl.stats.melee || 1); };
G.tryDig = function (pl, w) {
  const W = G.world; if (W.lobby) return false; const m = G.mouse; const hx = pl.x, hy = pl.y - pl.h * 0.6;
  let dx = m.wx - hx, dy = m.wy - hy; const Lh = Math.hypot(dx, dy) || 1; dx /= Lh; dy /= Lh;
  const reach = 14 + (w.dig ? 4 : 0); let tx = -1, ty = -1, px = 0, py = 0;
  for (let d = 2; d <= reach; d += 1) { px = hx + dx * d; py = hy + dy * d; const t = W.get(Math.floor(px / T), Math.floor(py / T)); if (W.solidAt(px, py) || t === 4) { tx = Math.floor(px / T); ty = Math.floor(py / T); break; } }
  if (tx < 0) return false; if (G.actors.some(a => a !== pl && a.alive && !a.town && NE.dist(a.x, a.cy, hx, hy) < 16 && (a.x - hx) * dx > 0)) return false;
  if (!W.diggable(tx, ty)) { G.toast('Too hard to break.'); NE.Audio.play('deny'); return true; }
  const pw = digPow(pl, w); const tool = !!w.dig && w.dig >= 1; const heavy = (w.w || 0.5) >= 1.4; const rad = tool ? clamp(1.1 + pw * 0.3, 1.4, 3.4) : heavy ? 1.05 : 0.75;
  const dmg = tool ? 4 + pw * 3 : 2 + pw * 4 + (w.w || 0.5) * 1.5; let broke = 0; const col0 = W.biomeAtY(py).pal.tile;
  const R2 = Math.ceil(rad);
  for (let oy = -R2; oy <= R2; oy++) for (let ox = -R2; ox <= R2; ox++) { const d2 = Math.hypot(ox, oy); if (d2 > rad) continue; const x = tx + ox, y = ty + oy; if (!W.diggable(x, y) || !W.solid(W.get(x, y)) && W.get(x, y) !== 4) continue;
    // don't dig the tile you're standing on unless you aim down at it
    if (ox * dx + oy * dy < -0.6) continue;
    const res = W.damageTile(x, y, dmg * (1 - d2 / (rad + 0.6))); if (res === 'broke') { broke++; G.dust(x * T + 4, y * T + 6, 3); } }
  const cx = tx * T + 4, cy = ty * T + 4;
  for (let i = 0; i < 6 + broke * 2; i++) G.addP(cx - dx * 4, cy - dy * 4, rf(-60, 60) - dx * 30, rf(-70, 10), rf(0.3, 0.8), i % 2 ? col0 : NE.shade(col0, 1.4), 'spark', 1); G.noise(cx, cy, 60 + broke * 15);
  if (w.blaze) for (let i = 0; i < 10; i++) G.addP(cx + rf(-6, 6), cy + rf(-6, 6), rf(-30, 30), rf(-80, -20), rf(0.3, 0.7), i % 2 ? '#ff8030' : '#ffd060', 'spark', -0.2);
  if (broke) { NE.Audio.play('crack'); G.shake && G.shake(Math.min(3, broke * 0.6)); if (chance(0.15 + broke * 0.04)) { const left = pl.inv.add('brick', 1); if (!left) G.toast('+1 Rock'); } } else NE.Audio.play('hit', 0.6);
  pl._digHold = true; return true;
};
const digPerk = G.tryDig; G.tryDig = function (pl, w) { if (NE.vperk && NE.vperk(pl) === 'dig' && w && w.dig) w = Object.assign({}, w, { dig: w.dig * 1.5 }); return digPerk.call(this, pl, w); };
const puD = NE.Player.prototype.update;
NE.Player.prototype.update = function (dt) { const r = puD.apply(this, arguments); if (!G.mouse.l) this._digHold = false; else if (this._digHold && this.cd <= 0 && !this.charge && !this.strk && this.alive && G.playing() && !NE.UI.panel && !NE.UI.modalOpen()) { const w = this.weaponDef(); if (!w.gun) this.attack(); } return r; };

// =====================================================================================================================
// THE CURSE OF THE ABYSS: climbing back up strains the body, more the deeper you are. The deep also presses on you
// even while you descend. Eight symptoms, one per layer, each with its own remedy.
// =====================================================================================================================
const SYM = {
  dizzy: { L: 1, name: 'Dizziness', cure: 'gingerroot', desc: 'The cave tilts. Your steps drift.' },
  nausea: { L: 2, name: 'Nausea', cure: 'antiemetic', desc: 'You retch without warning, losing food and water.' },
  numb: { L: 3, name: 'Numb Limbs', cure: 'warmsalve', desc: 'A limb goes dead: weaker swings, slower legs.' },
  halluc: { L: 4, name: 'Hallucinations', cure: 'claritydrops', desc: 'Figures at the edge of the light. Sounds that aren\'t there.' },
  bleedout: { L: 5, name: 'Curse Bleeding', cure: 'coagulant', desc: 'Blood seeps from your nose, ears and eyes.' },
  senseless: { L: 6, name: 'Sensory Loss', cure: 'wakesalts', desc: 'The world goes dim and far away.' },
  frenzy: { L: 7, name: 'Frenzy', cure: 'calmtea', desc: 'Your body stops listening. Hands turn on you.' },
  hollow: { L: 8, name: 'Metamorphosis', cure: 'antihollow', desc: 'Your flesh is changing. Fur, eyes, claws. If it finishes, you\'re no longer human.' },
};
NE.CURSE_SYM = SYM;
NE.curseLayer = d => clamp(1 + Math.floor(d / 330), 1, 8);
const CS = () => { const R = G.run; if (!R) return null; return R.curse = R.curse || { v: 0, sym: {}, prot: {}, hollow: 0, muts: [], nextP: 120 }; };
NE.curseState = CS;
const curseRes = p => { let k = 1; for (const sl of ['charm', 'belt', 'face']) { const e = p.gear && p.gear[sl]; if (e && IT[e.id] && IT[e.id].curseRes) k *= 1 - IT[e.id].curseRes; } return k; };
const wearing = (p, id) => p.gear && Object.values(p.gear).some(e => e && e.id === id);
NE.curseTrigger = function (p, id, dur, quiet) {
  const C = CS(); if (!C) return; if (C.prot[id] > 0) return; if (id === 'hollow' && wearing(p, 'hollowheart')) return;
  const was = C.sym[id] > 0; C.sym[id] = Math.max(C.sym[id] || 0, dur);
  if (id === 'numb' && !was) C.numbPart = pick(['larm', 'rarm', 'lleg', 'rleg']);
  if (!was && !quiet) { NE.UI.banner('CURSE OF THE ABYSS', SYM[id].name + ' — ' + SYM[id].desc); G.log('Curse: ' + SYM[id].name + '. Remedy: ' + IT[SYM[id].cure].name + '.', 'bad'); NE.Audio.play('screech', 0.25); }
};
NE.curseCure = function (id, prot) { const C = CS(); if (!C) return; const ids = id === 'all' ? Object.keys(SYM) : [id]; for (const k of ids) { if (k === 'hollow' && id === 'all') { C.hollow = Math.max(0, C.hollow - 25); } C.sym[k] = 0; C.prot[k] = Math.max(C.prot[k] || 0, prot); } if (id === 'all') C.v = Math.max(0, C.v - 55); };
const puC = NE.Player.prototype.update;
NE.Player.prototype.update = function (dt, input) {
  const A = this.anat;
  // Eternal Fortune: cheat death once
  if (this.alive && wearing(this, 'eternalfortune') && (A.blood < 720 || A.parts.head.hp < 6 || A.parts.torso.hp < 6)) { A.blood = Math.max(A.blood, 2880); for (const k of NE.PARTS) { const P = A.parts[k]; if (!P.severed) P.hp = Math.max(P.hp, P.max * 0.45); for (const w of P.wounds) { w.bleed *= 0.2; } } A.uncon = false; A.cons = 100; for (const k in this.gear) if (this.gear[k] && this.gear[k].id === 'eternalfortune') this.gear[k] = null; NE.UI.banner('ETERNAL FORTUNE', 'Death passes you by. The charm crumbles to dust.'); NE.Audio.play('chime'); G.flashT = 0.8; }
  const r = puC.apply(this, arguments);
  if (!this.alive || !G.world || G.world.lobby || G.state !== 'run' || !G.run) return r;
  const C = CS(); const d = NE.depthOfY(this.y); const L = NE.curseLayer(d); C.L = L;
  // ascent builds the curse; the deeper the layer, the harsher
  const immune = wearing(this, 'hollowheart') ? 0.5 : 1; const footed = this.onGround || this.climbing || this.hang;
  if (footed && !this.rd) { if (C.base == null || this.y > C.base || C.base - this.y > T * 40) C.base = this.y; else if (C.base - this.y > 2) { const up = (C.base - this.y) / T; C.base = this.y; C.v = Math.min(120, C.v + up * (0.22 + L * 0.2) * curseRes(this) * immune); C.calm = 1.5; } }
  C.calm = Math.max(0, (C.calm || 0) - dt); if (!C.calm) C.v = Math.max(0, C.v - dt * (this.onGround && Math.abs(this.vx) < 5 ? 1.4 : 0.6));
  // thresholds trigger symptoms from the layers you've reached
  const pool = Object.keys(SYM).filter(k => SYM[k].L <= L);
  const pickSym = () => { const w = pool.map(k => [k, SYM[k].L === L ? 3 : 1]); return NE.wpick(w); };
  for (const th of [30, 60, 90]) { if (C.v >= th && !(C.hit && C.hit[th])) { C.hit = C.hit || {}; C.hit[th] = true; NE.curseTrigger(this, pickSym(), 25 + th * 0.4); } if (C.v < th - 15 && C.hit && C.hit[th]) C.hit[th] = false; }
  // the deep presses on you even when you go down: occasional episodes from layer 2 on
  C.nextP -= dt; if (C.nextP <= 0) { C.nextP = rf(150, 300) / (0.6 + L * 0.2); if (L >= 2 && chance(0.35 + L * 0.06)) NE.curseTrigger(this, pickSym(), 18 + L * 2); }
  // timers
  for (const k in C.sym) if (C.sym[k] > 0) C.sym[k] = Math.max(0, C.sym[k] - dt); for (const k in C.prot) if (C.prot[k] > 0) C.prot[k] = Math.max(0, C.prot[k] - dt);
  const on = k => C.sym[k] > 0 && !(C.prot[k] > 0);
  // effects
  if (on('nausea')) { C.vomCD = (C.vomCD || rf(4, 9)) - dt; if (C.vomCD <= 0) { C.vomCD = rf(7, 13); this.vomitT = 1.3; A.hunger = Math.max(0, A.hunger - 7); A.thirst = Math.max(0, A.thirst - 6); NE.Audio.play('squelch', 0.6); for (let i = 0; i < 14; i++) G.addP(this.x + this.facing * 3, this.y - this.h + 6, this.facing * rf(10, 60), rf(-20, 30), rf(0.4, 0.9), i % 2 ? '#a0a040' : '#7a7a30', 'spark', 1); G.say && G.say(pick(['Hhgk—', '*retches*', 'Not again...']), 0.6); } }
  this.vomitT = Math.max(0, (this.vomitT || 0) - dt);
  if (on('bleedout')) { A.blood -= dt * 9; if (Math.random() < dt * 4) G.addP(this.x + this.facing * 2, this.y - this.h + 5, rf(-6, 6), rf(0, 20), 0.6, '#a01010', 'spark', 1); }
  if (on('frenzy')) { C.frzCD = (C.frzCD || rf(3, 6)) - dt; if (C.frzCD <= 0) { C.frzCD = rf(6, 11); this.frenzyT = 2.2; if (chance(0.5)) { this.hurt(pick(['larm', 'rarm', 'torso']), 3, 'sharp', 'Your own nails'); G.say && G.say(pick(['Get OUT of me—', 'Stop it, stop it...', 'My hands—']), 0.8); } } }
  this.frenzyT = Math.max(0, (this.frenzyT || 0) - dt);
  if (on('halluc')) { C.phT = (C.phT || 2) - dt; if (C.phT <= 0) { C.phT = rf(4, 9); NE._phantoms = (NE._phantoms || []).slice(-3); const side = chance(0.5) ? 1 : -1; NE._phantoms.push({ x: this.x + side * rf(70, 150), y: this.y, t: 0, life: rf(5, 9), f: -side, look: NE.makeSurvivor().look }); if (chance(0.6)) NE.Audio.play(pick(['growl', 'shout', 'step']), 0.35); } }
  if (on('hollow')) { C.hollow = Math.min(100, C.hollow + dt * 0.55); const M = [[25, 'fur', 'Coarse fur sprouts along your arms (cold resistance).'], [50, 'claws', 'Your nails harden into claws (+20% melee).'], [75, 'eyes', 'New eyes open along your brow (+30% sight).']];
    for (const [th, id, msg] of M) if (C.hollow >= th && !C.muts.includes(id)) { C.muts.push(id); G.log('Metamorphosis: ' + msg, 'bad'); NE.UI.banner('METAMORPHOSIS', msg); if (id === 'fur') this.stats.cold *= 0.5; if (id === 'claws') this.stats.melee *= 1.2; if (id === 'eyes') this.stats.sight = (this.stats.sight || 1) * 1.3; }
    if (C.hollow >= 100) { A.cause = 'Lost their humanity to the Abyss'; A.blood = 0; G.log('There is nothing human left of you.', 'bad'); } }
  // artifacts with passive effects
  if (wearing(this, 'sunsphere')) { A.temp = Math.max(A.temp, 36.8); for (const k of NE.PARTS) { const P = A.parts[k]; if (!P.severed) P.hp = Math.min(P.max, P.hp + dt * 0.35); } }
  if (wearing(this, 'stillward')) A.pain *= Math.pow(0.5, dt);
  if (wearing(this, 'invlantern')) this.light.bat = 100;
  if (this.tonicT > 0) { this.tonicT -= dt; A.blood = Math.min(NE.BLOOD, A.blood + dt * 8); }
  NE.curseFX(this, C);
  return r;
};
// controls: dizziness drifts you, nausea doubles you over, a numb leg drags, frenzy turns left into right
NE.curseCtl = function (p, c, dt) {
  const C = G.run && G.run.curse; if (!C || G.state !== 'run') return c; const on = k => C.sym[k] > 0 && !(C.prot[k] > 0); let o = c;
  const cp = () => { if (o === c) o = Object.assign({}, c); return o; };
  if (p.vomitT > 0) { cp(); o.mx = 0; o.jump = false; o.sprint = false; }
  if (on('dizzy')) { cp(); const k = Math.sin(G.t * 1.7) * 0.35; if (o.mx) o.mx = clamp(o.mx + k * 0.6, -1, 1); else if (p.onGround && Math.abs(k) > 0.3) o.mx = k * 0.4; }
  if (on('numb') && C.numbPart && C.numbPart.endsWith('leg')) { cp(); o.mx *= 0.7; o.sprint = false; }
  if (on('senseless')) { cp(); o.sprint = o.sprint && chance(0.5); }
  if (p.frenzyT > 0) { cp(); o.mx = -o.mx; }
  return o;
};
const pmC = NE.Actor.prototype.physicsMove;
NE.Actor.prototype.physicsMove = function (dt, c) { if (this.isPlayer && c && NE.curseCtl) c = NE.curseCtl(this, c, dt); return pmC.call(this, dt, c); };
const smC = NE.styleMul; NE.styleMul = function (a, w) { let k = smC(a, w); const C = G.run && G.run.curse; if (a && a.isPlayer && C && C.sym.numb > 0 && !(C.prot.numb > 0) && C.numbPart && C.numbPart.endsWith('arm')) k *= 0.7; return k; };
// screen effects & HUD
NE.curseFX = function (p, C) {
  let el = document.getElementById('cursefx'); if (!el) { el = document.createElement('div'); el.id = 'cursefx'; el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:5;transition:background .6s'; document.body.appendChild(el); }
  const on = k => C.sym[k] > 0 && !(C.prot[k] > 0); let bg = '';
  if (on('senseless')) bg = 'radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 12%, rgba(0,0,0,.93) 46%)';
  else if (on('bleedout')) bg = 'radial-gradient(ellipse at 50% 50%, rgba(120,0,0,0) 45%, rgba(140,0,0,' + (0.35 + 0.1 * Math.sin(G.t * 3)).toFixed(2) + ') 100%)';
  else if (on('halluc')) bg = 'radial-gradient(ellipse at ' + (50 + Math.sin(G.t) * 10).toFixed(0) + '% 50%, rgba(120,60,160,0) 40%, rgba(90,40,140,.28) 100%)';
  else if (p.frenzyT > 0) bg = 'rgba(160,20,20,' + (0.12 + 0.1 * Math.sin(G.t * 20)).toFixed(2) + ')';
  else if (on('hollow')) bg = 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 50%, rgba(40,80,20,.3) 100%)';
  if (el._bg !== bg) { el._bg = bg; el.style.background = bg; }
  if (on('dizzy') && G.cam) { G.cam.x += Math.sin(G.t * 1.3) * 0.5; G.cam.y += Math.cos(G.t * 1.1) * 0.3; }
};
const drawPh = NE.Actor.prototype.draw;
NE.Actor.prototype.draw = function (ctx) { const r = drawPh.apply(this, arguments);
  if (this.isPlayer && NE._phantoms && NE._phantoms.length) { const C = G.run && G.run.curse; const live = C && C.sym.halluc > 0 && !(C.prot.halluc > 0);
    for (const ph of NE._phantoms) { ph.t += 1 / 60; const dist = Math.abs(ph.x - this.x); const a = live ? clamp(Math.min(ph.t, ph.life - ph.t, 1) * clamp((dist - 30) / 50, 0, 1), 0, 0.7) : 0; if (a <= 0.02) continue;
      ctx.globalAlpha = a; const fake = { x: ph.x, y: ph.y, facing: ph.f, vx: 0, onGround: true, walkPh: 0 }; const pts = NE.ragPose(fake).map(q => ({ x: q[0], y: q[1] })); try { NE.drawHuman(ctx, { pts }, ph.look, { facing: ph.f, shirt: '#1a1a1a', pants: '#101010', eyeGlow: '#ff3030' }); } catch (e) { } ctx.globalAlpha = 1; }
    NE._phantoms = NE._phantoms.filter(ph => ph.t < ph.life); }
  return r; };
// rest clears the curse (but not the metamorphosis)
const restC = G.rest; G.rest = function () { const C = CS(); const r = restC.apply(this, arguments); if (C) setTimeout(() => { C.v = 0; for (const k in C.sym) if (k !== 'hollow') C.sym[k] = 0; }, 500); return r; };
// remedies & field medicine
const conC = NE.consume;
NE.consume = function (pl, entry) {
  const it = IT[entry.id]; if (!it) return conC.apply(this, arguments);
  if (it.abyss || it.fx) { const A = pl.anat; entry.n--; if (entry.n <= 0) pl.inv.remove(entry); NE.Audio.play('ui');
    if (it.abyss === 'all') { NE.curseCure('all', 180); G.toast('The Ascent Balm burns cold through every vein. The curse recedes.'); }
    else if (entry.id === 'mandrake') { const C = CS(); if (C) C.hollow = Math.max(0, C.hollow - 15); NE.curseCure('hollow', 60); A.hunger = Math.min(100, A.hunger + 4); G.toast('It screams as you bite it. The change in your flesh slows.'); }
    else if (it.abyss) { if (it.abyss === 'hollow') { const C = CS(); if (C) C.hollow = Math.max(0, C.hollow - 40); } if (it.abyss === 'dizzy') NE.curseCure('nausea', 0); NE.curseCure(it.abyss, 360); G.toast(it.name + ': ' + SYM[it.abyss].name.toLowerCase() + ' cured and kept away for a while.'); }
    if (it.fx === 'poultice') { for (const k of NE.PARTS) for (const w of A.parts[k].wounds) { w.dirty = 0; w.inf = 0; if (!w.closed && w.bleed < 1.4 && w.t !== 'art') { w.closed = true; w.bleed = 0; } } G.toast('The poultice draws out the dirt and closes the small wounds.'); }
    if (it.fx === 'honey') { for (const k of NE.PARTS) for (const w of A.parts[k].wounds) { w.dirty = 0; w.inf = 0; w.bleed *= 0.5; } G.toast('Honey seals every wound. No rot will take hold.'); }
    if (it.fx === 'tonic') { pl.tonicT = 60; G.toast('Iron and earth. Your blood starts to come back.'); }
    return true; }
  const r = conC.apply(this, arguments); if (r && it.warm) pl.anat.temp = Math.min(37.4, pl.anat.temp + 1); return r;
};

// =====================================================================================================================
// SMARTER ENEMIES: hop obstacles, chase you up ledges, gunners keep their distance, fighters sidestep heavy wind-ups,
// spread out instead of queueing, and raise the alarm for nearby friends. They also hit 20% harder (combat.js).
// =====================================================================================================================
NE.ENEMY_DMG = 1.2;
NE.aiAdjust = function (e, dt, c) {
  if (e.frozenT > 0) { c.mx = 0; c.jump = false; return; }
  const t = e.target; if (!t || !t.alive || (e.state !== 'chase' && e.state !== 'aim') || e.calmed) return;
  const W = e.g.world; const dx = t.x - e.x, d = Math.abs(dx), dy = t.y - e.y;
  if (c.mx && e.onGround) { const ax = Math.floor((e.x + Math.sign(c.mx) * (e.w / 2 + 2.5)) / T); const tf = Math.floor((e.y - 3) / T); if (W.solid(W.get(ax, tf)) && !W.solid(W.get(ax, tf - 2)) && !W.solid(W.get(ax, tf - 3))) c.jump = true; }
  if (dy < -20 && d < 60 && e.onGround && chance(dt * 2.5)) { c.jump = true; c.mx = Math.sign(dx); }
  const gun = e.weapon && IT[e.weapon] && IT[e.weapon].gun;
  if (gun && d < 55 && e.state !== 'aim' && e.ammo > 0) { c.mx = -Math.sign(dx); c.sprint = true; }
  e._dodgeCD = Math.max(0, (e._dodgeCD || 0) - dt);
  if (!gun && t.isPlayer && t.charge && t.charge.t > 0.35 && d < 32 && !(e.windT > 0) && !e._dodgeCD && chance(0.45)) { e._dodgeT = 0.38; e._dodgeCD = 2.6; }
  if (e._dodgeT > 0) { e._dodgeT -= dt; c.mx = -Math.sign(dx); c.sprint = true; }
  if (!gun && !(e.windT > 0) && d < 34) { const ally = G.actors.find(o => o !== e && o.D && o.alive && o.target === t && Math.sign(o.x - t.x) === Math.sign(e.x - t.x) && Math.abs(o.x - t.x) < d - 2); if (ally && d < 28) c.mx = 0; }
};
const euA = NE.Enemy.prototype.update;
NE.Enemy.prototype.update = function (dt) {
  if (this.frozenT > 0) { this.frozenT -= dt; return; }
  const before = this.state; const r = euA.apply(this, arguments);
  if (this.calmed && this.alive) { this.state = 'flee'; this.target = this.target || G.player; }
  if (this.alive && this.target && this.state === 'chase' && before !== 'chase' && !this._alerted) { this._alerted = true;
    for (const o of G.actors) if (o !== this && o.D && o.alive && !o.target && o.isHostileTo && o.isHostileTo(this.target) && NE.dist(o.x, o.y, this.x, this.y) < 150 && Math.abs(o.y - this.y) < 40) { o.target = this.target; o.state = 'chase'; o.lastSeen = { x: this.target.x, y: this.target.y }; o._alerted = true; } }
  return r;
};
// Moon-Reed Flute: beasts leave you alone unless you start it
const hostA = NE.Enemy.prototype.isHostileTo;
NE.Enemy.prototype.isHostileTo = function (a) { if (a && a.isPlayer && ['feral', 'trog', 'husk', 'stalker', 'burrower', 'crawler', 'spider', 'bat'].includes(this.type) && !this.provoked && a.gear && Object.values(a.gear).some(e => e && e.id === 'moonflute')) return false; return hostA.apply(this, arguments); };
const aggA = NE.Enemy.prototype.onAggro; NE.Enemy.prototype.onAggro = function (src) { if (src && src.isPlayer) this.provoked = true; return aggA.apply(this, arguments); };

// =====================================================================================================================
// ARTIFACT ACTIVES: Unheard Bell stops time nearby, Gangway fires a piercing beam, Star Compass guides you
// =====================================================================================================================
NE.BIND_DEFS.push(['artifact', 'Ring the Unheard Bell (artifact)', ['KeyY', null]], ['minimap', 'Show / hide the minimap', ['KeyU', null]]);
const onKeyA = G.onKey;
G.onKey = function (code) { const act = G.actionOf(code); const p = G.player;
  if (act === 'artifact' && G.state === 'run' && p && p.alive && !NE.UI.panel) return NE.ringBell(p);
  if (act === 'minimap' && !NE.UI.panel) { NE.MM.toggle(); return; }
  return onKeyA.apply(this, arguments); };
NE.ringBell = function (p) { if (!Object.values(p.gear || {}).some(e => e && e.id === 'unheardbell')) return G.toast('You have nothing to ring.');
  if ((p.bellCD || 0) > G.t) return G.toast('The bell is still silent (' + Math.ceil(p.bellCD - G.t) + 's).');
  p.bellCD = G.t + 90; let n = 0; for (const a of G.actors) if (a.D && a.alive && NE.dist(a.x, a.y, p.x, p.y) < 180) { a.frozenT = 8; a.windT = 0; a.charge = null; n++; }
  NE.Audio.play('chime'); G.flashT = 0.5; NE.UI.banner('UNHEARD BELL', n ? n + ' creature' + (n > 1 ? 's' : '') + ' frozen in time for 8 seconds.' : 'Nothing near enough to hear it.'); };
const drawFz = NE.Actor.prototype.draw; NE.Actor.prototype.draw = function (ctx) { const r = drawFz.apply(this, arguments); if (this.frozenT > 0) { ctx.fillStyle = 'rgba(180,200,255,0.25)'; ctx.fillRect(Math.round(this.x) - 6, Math.round(this.y - this.h) - 2, 12, this.h + 2); } return r; };
// Gangway: right-click fires a beam of light that burns through foes and rock (one Battery per shot)
const pokeA = NE.Player.prototype.poke;
NE.Player.prototype.poke = function () { const w = this.weaponDef(); if (!w.beam) return pokeA.apply(this, arguments);
  if ((this.beamCD || 0) > G.t) return; if (this.inv.count('battery') < 1) { G.toast('Gangway needs a Battery to fire.'); NE.Audio.play('deny'); return; }
  this.inv.consume('battery', 1); this.beamCD = G.t + 1.4; const m = G.mouse; const hx = this.x, hy = this.y - this.h * 0.6; let dx = m.wx - hx, dy = m.wy - hy; const Lh = Math.hypot(dx, dy) || 1; dx /= Lh; dy /= Lh;
  const W = G.world; const hit = new Set(); let len = 0;
  for (let d = 4; d < 280; d += 3) { const x = hx + dx * d, y = hy + dy * d; len = d; const tx = Math.floor(x / T), ty = Math.floor(y / T); if (W.solid(W.get(tx, ty))) { if (W.diggable(tx, ty)) W.damageTile(tx, ty, 30); else break; }
    for (const a of G.actors) if (a !== this && a.alive && !a.town && !hit.has(a) && a.contains && a.contains(x, y, 2)) { hit.add(a); a.hurt(a.partNear ? a.partNear(x, y) : 'torso', 55, 'burn', this.surv.first, { x: dx, y: dy }); if (a.onAggro) a.onAggro(this); }
    if (d % 9 === 0) G.addP(x, y, rf(-10, 10), rf(-10, 10), 0.4, d % 2 ? '#e0f4ff' : '#80c8ff', 'glow', 0); }
  NE._beams = (NE._beams || []).concat([{ x0: hx, y0: hy, x1: hx + dx * len, y1: hy + dy * len, t: 0.25 }]); NE.Audio.play('hiss', 1); G.shake && G.shake(3); G.noise(hx, hy, 200); };
const drawBm = NE.Actor.prototype.draw; NE.Actor.prototype.draw = function (ctx) { const r = drawBm.apply(this, arguments); if (this.isPlayer && NE._beams && NE._beams.length) { for (const b of NE._beams) { b.t -= 1 / 60; ctx.globalAlpha = Math.max(0, b.t / 0.25); ctx.strokeStyle = '#e8f6ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y1); ctx.stroke(); ctx.strokeStyle = '#60b0ff'; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1; } NE._beams = NE._beams.filter(b => b.t > 0); } return r; };
// carry & blood adjustments for some artifacts
const csA = NE.Player.prototype.setAbilities; NE.Player.prototype.setAbilities = function () { return csA.apply(this, arguments); };
const puE = NE.Player.prototype.update; NE.Player.prototype.update = function (dt) { const r = puE.apply(this, arguments); const pins = Object.values(this.gear || {}).some(e => e && e.id === 'thousandpins'); if (pins !== !!this._pins) { this.inv.carry += pins ? 12 : -12; this._pins = pins; } const hh = Object.values(this.gear || {}).some(e => e && e.id === 'hollowheart'); if (hh && this.anat.blood > 3400) this.anat.blood = 3400; return r; };

// =====================================================================================================================
// HUD: curse meter in the vitals, correct "next town" marker
// =====================================================================================================================
const tickA = NE.UI.tick;
NE.UI.tick = function (dt) { tickA.apply(this, arguments); const p = G.player; if (!p || G.state !== 'run' || !G.run || G.world.lobby) return;
  try { const d = NE.depthOfY(p.y); const F = NE.TOWN_FIRST, E = NE.TOWN_EVERY; const next = d < F ? F : F + (Math.floor((d - F) / E) + 1) * E; const prev = d < F ? 0 : next - E; const el = document.querySelector('.d-ticks'); if (el) el.textContent = '▸ next town ~' + next + 'm'; const fi = document.querySelector('.d-fill'); if (fi) fi.style.width = ((d - prev) / (next - prev) * 100).toFixed(1) + '%';
    const C = G.run.curse; const v = document.getElementById('vitals'); if (C && v && p.alive) { let row = v.querySelector('.v-curse'); if (!row) { row = document.createElement('div'); row.className = 'v-curse'; v.appendChild(row); }
      const syms = Object.keys(C.sym).filter(k => C.sym[k] > 0 && !(C.prot[k] > 0)); const prot = Object.keys(C.prot).filter(k => C.prot[k] > 0);
      const html = '<div class="vc-top"><span>CURSE · L' + (C.L || 1) + '</span><b>' + Math.round(Math.min(100, C.v)) + '%</b></div><div class="vc-bar"><i style="width:' + Math.min(100, C.v).toFixed(0) + '%"></i></div>' + (syms.length ? '<div class="vc-sym">' + syms.map(k => '<em title="Remedy: ' + IT[SYM[k].cure].name + '">' + SYM[k].name + '</em>').join('') + '</div>' : '') + (C.hollow > 0 ? '<div class="vc-sym"><em class="h">Changed ' + Math.round(C.hollow) + '%</em></div>' : '') + (prot.length && !syms.length ? '<div class="vc-ok">Protected: ' + prot.map(k => SYM[k].name).join(', ') + '</div>' : '');
      if (row._h !== html) { row._h = html; row.innerHTML = html; } } } catch (e) { }
};
const stA = document.createElement('style'); stA.textContent = '.v-curse{margin-top:.25em;font-size:.72em}.vc-top{display:flex;justify-content:space-between;color:#c8a0ff;letter-spacing:.08em}.vc-bar{height:.35em;background:rgba(255,255,255,.07);border-radius:.2em;overflow:hidden}.vc-bar i{display:block;height:100%;background:linear-gradient(90deg,#7a50c0,#e040a0)}.vc-sym{display:flex;flex-wrap:wrap;gap:.25em;margin-top:.2em}.vc-sym em{font-style:normal;background:rgba(200,60,140,.25);border:1px solid rgba(255,120,200,.35);padding:0 .3em;border-radius:.2em;color:#ffc0e0}.vc-sym em.h{background:rgba(80,140,40,.3);border-color:rgba(140,220,80,.4);color:#d0ffb0}.vc-ok{color:#9fd890;margin-top:.15em}';
document.head.appendChild(stA);

// =====================================================================================================================
// CRAFTING: field medicine, every curse remedy, and the simpler climbing / diving gear
// =====================================================================================================================
NE.RECIPES.push(
  { id: 'poultice', name: 'Herbal Poultice', out: ['poultice', 1], need: [['herb', 1], ['cleanrag', 1]], desc: 'Closes small wounds, cleans the rest.' },
  { id: 'honeydress', name: 'Honey Dressing', out: ['honeydress', 1], need: [['honey', 1], ['bandage', 1]] },
  { id: 'bloodtonic', name: 'Blood Tonic', out: ['bloodtonic', 1], need: [['mushroom', 2], ['herb', 1], ['water', 1]], station: 'fire' },
  { id: 'broth', name: 'Mushroom Broth', out: ['broth', 1], need: [['mushroom', 2], ['water', 1]], station: 'fire' },
  { id: 'antiemetic', name: 'Settling Tincture', out: ['antiemetic', 1], need: [['herb', 2], ['water', 1]], station: 'fire', desc: 'Cures and blocks curse nausea.' },
  { id: 'warmsalve', name: 'Circulation Salve', out: ['warmsalve', 1], need: [['herb', 1], ['alcohol', 1], ['rag', 1]], desc: 'Cures and blocks curse numbness.' },
  { id: 'claritydrops', name: 'Clarity Drops', out: ['claritydrops', 1], need: [['datashard', 1], ['water', 1], ['herb', 1]], station: 'workbench', desc: 'Cures and blocks hallucinations.' },
  { id: 'coagulant', name: 'Coagulant Pills', out: ['coagulant', 2], need: [['cactus', 2], ['herb', 1]], station: 'fire', desc: 'Cures and blocks the curse bleeding.' },
  { id: 'wakesalts', name: 'Waking Salts', out: ['wakesalts', 1], need: [['alcohol', 1], ['brick', 1], ['bottle', 1]], station: 'workbench', desc: 'Cures and blocks sensory loss.' },
  { id: 'calmtea', name: 'Calmroot Tea', out: ['calmtea', 1], need: [['herb', 2], ['honey', 1]], station: 'fire', desc: 'Cures and blocks the frenzy.' },
  { id: 'antihollow', name: 'Anti-Hollow Serum', out: ['antihollow', 1], need: [['mandrake', 1], ['antibiotics', 1], ['bottle', 1]], station: 'workbench', desc: 'Halts and reverses metamorphosis.' },
  { id: 'ascentbalm', name: 'Ascent Balm', out: ['ascentbalm', 1], need: [['herb', 3], ['honey', 2], ['datashard', 2]], station: 'workbench', desc: 'Cures every curse symptom at once.' },
  { id: 'clharness', name: 'Climber\'s Rig', out: ['clharness', 1], need: [['cloth', 3], ['scrap', 2], ['tape', 2]], station: 'workbench' },
  { id: 'crampons', name: 'Crampon Boots', out: ['crampons', 1], need: [['hikeboots', 1], ['scrap', 3]], station: 'workbench' },
  { id: 'swimfins', name: 'Swim Fins', out: ['swimfins', 1], need: [['cloth', 2], ['tape', 2], ['scrap', 1]] },
  { id: 'scubamask', name: 'Scuba Mask', out: ['scubamask', 1], need: [['bottle', 1], ['tape', 2], ['scrap', 1]], station: 'workbench' },
  { id: 'delverwhistle', name: 'Delver\'s Whistle', out: ['delverwhistle', 1], need: [['scrap', 1], ['trinket', 1]] },
);
NE.RECIPES = NE.RECIPES.filter(r => IT[r.out[0]] && r.need.every(([id]) => IT[id]));
// forage: ginger in the grotto, mandrake in the deep
const forA = W_.genFloor; W_.genFloor = function (f) { const fl = forA.call(this, f); if (this.lobby || !fl || fl.town) return fl; const B = fl.biome.id;
  const add = (id, n) => { for (let k = 0; k < n; k++) { const tx = ri(8, this.W - 9); const x = (tx + 0.5) * T; fl.objs.push({ type: 'forage', item: id, x, y: this.groundY(fl, x), label: '', act: 'pick' }); } };
  if (B === 'grotto' && chance(0.35)) add('gingerroot', 1); if (['ossuary', 'heart', 'drowned'].includes(B) && chance(0.3)) add('mandrake', 1); return fl; };

// ---- wild forage: three plants per biome, each with its own use (food, water, healing, visions, warmth, stamina...)
const WILD = [
  // id, name, biome, fx, desc
  ['glowcap', 'Glowcap', 'grotto', { hunger: 10, trip: 45, stress: -15 }, 'Glows faintly. Eat it and the cave starts to breathe. Calms the nerves.'],
  ['healberry', 'Mendberry', 'grotto', { hunger: 6, heal: 10 }, 'Tart red berry. Knits small wounds a little.'],
  ['fernfrond', 'Dewfern Frond', 'grotto', { thirst: 14, hunger: 3 }, 'Chew the wet fronds for water.'],
  ['aloe', 'Cave Aloe', 'desert', { heal: 8, thirst: 6, pain: 10 }, 'Cool gel. Soothes pain, closes scrapes.'],
  ['datefruit', 'Dune Date', 'desert', { hunger: 22, stam: 25 }, 'Sticky and sweet. A burst of energy.'],
  ['barrelcactus', 'Barrel Cactus Flesh', 'desert', { thirst: 28, tox: 4 }, 'Watery pulp. A little bitter on the gut.'],
  ['frostberry', 'Frostberry', 'ice', { hunger: 8, thirst: 16 }, 'Icy, juicy berries.'],
  ['frostleaf', 'Emberleaf', 'ice', { warm: 1.2, pain: 12 }, 'Burns the tongue and warms you to the bones.'],
  ['snowdrop', 'Snowdrop Bloom', 'ice', { heal: 6, infect: 20 }, 'Antiseptic petals. Fights infection.'],
  ['crystalcap', 'Prismcap', 'crystal', { trip: 60, rad: 20 }, 'Crystal-veined mushroom. Purges radiation and floods your eyes with colour.'],
  ['manaberry', 'Humming Berry', 'crystal', { stam: 45, hunger: 6 }, 'Faintly vibrates. Your legs feel light.'],
  ['crystalapple', 'Geode Apple', 'crystal', { hunger: 18, thirst: 12, rad: 10 }, 'Glassy skin, crisp flesh.'],
  ['fireberry', 'Cinderberry', 'magma', { stam: 35, warm: 0.6, thirst: -6 }, 'Hot to the touch. Pure energy, but drying.'],
  ['firepepper', 'Magma Pepper', 'magma', { pain: 25, thirst: -10, hunger: 4 }, 'So hot nothing else hurts for a while.'],
  ['flamelily', 'Flame Lily', 'magma', { heal: 14, tox: 6 }, 'Cauterising nectar. Heals, but it\'s mildly poisonous.'],
  ['sunfruit', 'Sunfruit', 'hive', { hunger: 20, thirst: 12 }, 'Honey-soaked fruit the swarm grows.'],
  ['lavender', 'Hive Lavender', 'hive', { stress: -30, pain: 8 }, 'The smell alone slows your heart.'],
  ['pitcher', 'Pitcher Plant', 'hive', { thirst: 26, tox: 3 }, 'Drink what pooled inside. Don\'t look too closely.'],
  ['seaweed', 'Brine Kelp', 'drowned', { hunger: 10, thirst: 5 }, 'Salty, chewy, filling enough.'],
  ['lotusroot', 'Lotus Root', 'drowned', { heal: 10, infect: 10, hunger: 8 }, 'Starchy root with healing sap.'],
  ['spiritlotus', 'Spirit Lotus', 'drowned', { trip: 70, stress: -30 }, 'Glowing petals. You see things that aren\'t there, and stop caring.'],
  ['shadowcap', 'Shadowcap', 'ossuary', { trip: 45, hunger: 8, tox: 4 }, 'Grows on old bones. Strong visions.'],
  ['nettle', 'Grave Nettle', 'ossuary', { heal: 8, infect: 20 }, 'Stings going down, cleans wounds from inside.'],
  ['bracket', 'Bracket Fungus', 'ossuary', { hunger: 18 }, 'Woody shelf fungus. Bland and filling.'],
  ['moonfruit', 'Moonfruit', 'heart', { hunger: 20, thirst: 15 }, 'Pale and cool, full of juice.'],
  ['shadowrose', 'Blackheart Rose', 'heart', { heal: 16, tox: 8 }, 'Strong healing at a price.'],
  ['starberry', 'Starberry', 'heart', { stam: 60, trip: 20 }, 'Fizzes on the tongue. Endless energy, a little dizzy.'],
];
NE.WILD = {};
for (const [id, name, biome, fx, desc] of WILD) { const it = { name, icon: id, w: 0.1, stack: 5, cat: 'food', desc: desc + ' (Foraged)', fx, value: 4 + Math.round((fx.heal || 0) / 3 + (fx.trip ? 3 : 0)) };
  if (fx.hunger > 0) it.hunger = fx.hunger; if (fx.thirst > 0) it.thirst = fx.thirst; if (fx.tox) it.tox = fx.tox; if (fx.stress) it.stress = fx.stress; IT[id] = it; (NE.WILD[biome] = NE.WILD[biome] || []).push(id); }
const consF = NE.consume; NE.consume = function (pl, entry) { const it = NE.ITEMS[entry.id]; const fx = it && it.fx; const r = consF.apply(this, arguments); if (!r || !fx || !pl.isPlayer) return r; const A = pl.anat;
  if (fx.thirst < 0) A.thirst = Math.max(0, A.thirst + fx.thirst); if (fx.hunger < 0) A.hunger = Math.max(0, A.hunger + fx.hunger);
  if (fx.heal) { let h = fx.heal; const ps = Object.values(A.parts).filter(q => !q.severed && q.hp < q.max).sort((a, b) => a.hp / a.max - b.hp / b.max); for (const q of ps) { const d = Math.min(h, q.max - q.hp); q.hp += d; h -= d; if (h <= 0) break; } }
  if (fx.pain) { A.pain = Math.max(0, A.pain - fx.pain); A.painSpike = Math.max(0, (A.painSpike || 0) - fx.pain); }
  if (fx.stam) A.stam = Math.min(A.stamMax, A.stam + fx.stam); if (fx.warm) A.temp = clamp(A.temp + fx.warm, 33, 39); if (fx.rad) A.rad = Math.max(0, A.rad - fx.rad); if (fx.infect) A.infection = Math.max(0, A.infection - fx.infect);
  if (fx.trip && G.run) { const was = G.run.trip > 0; G.run.trip = Math.max(G.run.trip || 0, 0) + fx.trip; if (!was) G.say(pick(['Oh. Oh no. The walls...', 'Everything is... humming.', 'Colours. So many colours.', 'Is the floor breathing?']), 3); }
  return r; };
// visions: the world shifts colour and sways while it lasts; it also dulls pain and stress a little
const tickTrip = NE.UI.tick; NE.UI.tick = function (dt) { const r = tickTrip.apply(this, arguments); const cv = G.cv; if (!cv) return r; const R = G.run;
  if (R && R.trip > 0 && G.state === 'run' && G.player && G.player.alive) { R.trip -= dt; const k = Math.min(1, R.trip / 8); cv.style.filter = 'hue-rotate(' + ((G.t * 50) % 360).toFixed(0) + 'deg) saturate(' + (1 + 0.8 * k).toFixed(2) + ') blur(' + (Math.sin(G.t * 1.7) * 0.4 * k + 0.2 * k).toFixed(2) + 'px)'; cv.style.transform = 'rotate(' + (Math.sin(G.t * 0.9) * 0.6 * k).toFixed(2) + 'deg) scale(' + (1 + 0.01 * k).toFixed(3) + ')';
    const A = G.player.anat; A.stress = Math.max(0, A.stress - dt * 0.6); A.pain = Math.max(0, A.pain - dt * 0.4); if (R.trip <= 0) { R.trip = 0; G.toast('The visions fade.'); } }
  else if (cv.style.filter || cv.style.transform) { cv.style.filter = ''; cv.style.transform = ''; }
  return r; };
// three of each biome's plants grow on every level of it
const forB = W_.genFloor; W_.genFloor = function (f) { const fl = forB.call(this, f); if (this.lobby || !fl || fl.town) return fl; const L = NE.WILD[fl.biome.id]; if (!L) return fl;
  for (let k = 0; k < ri(2, 4); k++) { const tx = ri(8, this.W - 9); const x = (tx + 0.5) * T; fl.objs.push({ type: 'forage', item: pick(L), x, y: this.groundY(fl, x), label: '', act: 'pick' }); } return fl; };

// =====================================================================================================================
// MAP: drawn from the real tiles and colours of each level, with people, containers, towns and your partner
// =====================================================================================================================
const TCOL = (W, fl, t, x, r) => { const p = fl.biome.pal; const h = NE.hash(x, r + fl.y0); const n = 0.92 + h * 0.16;
  switch (t) { case 0: return NE.shade(p.back2 || p.back, 1.9 * n); case 5: return '#2c6a80'; case 9: return '#ff6a20'; case 11: return '#e0a020'; case 3: return p.ladder || '#c0a060'; case 2: return p.plat; case 10: return NE.shade('#bfe6ff', n); case 4: return '#b0a0ff'; case 6: return NE.shade('#c8a060', n); case 8: return '#7a7a80';
    default: { const above = W.get(x, fl.y0 + r - 1); return above === 0 ? (p.top || p.edge) : NE.shade(p.tile, 0.62 * n); } } };
NE.drawTilesTo = function (c, W, f0, f1, x0, x1, S, ox, oy, reveal) {
  const FH = NE.FH;
  for (let f = f0; f <= f1; f++) { const fl = W.floors[f]; if (!fl) continue; const fy = (f - f0) * FH;
    for (let r = 0; r < FH; r++) for (let x = Math.max(0, x0); x < Math.min(W.W, x1); x++) { const seen = reveal || fl.seen[r * W.W + x]; if (!seen) continue; c.fillStyle = TCOL(W, fl, W.get(x, fl.y0 + r), x, r); c.fillRect(ox + (x - x0) * S, oy + (fy + r) * S, S, S); } }
};
const mapMarks = (c, W, f0, f1, x0, S, ox, oy, full) => { const g = G, p = g.player, FH = NE.FH, R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
  const P = (wx, wy) => [ox + (wx / T - x0) * S, oy + (wy / T - f0 * FH) * S];
  for (let f = f0; f <= f1; f++) { const fl = W.floors[f]; if (!fl) continue; const seenAt = (wx, wy) => { const tx = Math.floor(wx / T), r = Math.floor(wy / T) - fl.y0 - 1; return r >= 0 && r < FH && fl.seen[r * W.W + tx]; };
    for (const o of fl.objs) { if (o.x == null || (!seenAt(o.x, o.y) && !(o.type === 'artifact' && g.player && Object.values(g.player.gear || {}).some(e => e && e.id === 'starcompass')))) continue; let col = null, sz2 = 3;
      if (o.type === 'container') col = o.searched ? '#5a5048' : '#e0c070'; else if (o.type === 'post' || o.type === 'bed') col = '#ffd890'; else if (o.type === 'relic') col = '#ffcf40'; else if (o.type === 'artifact' && !o.taken) { col = '#ff80ff'; sz2 = 5; } else if (o.type === 'fire') col = '#ff8030'; else if (o.type === 'hatch') { col = '#c0a060'; sz2 = 4; } else if (o.type === 'bench') col = '#a0c0ff';
      if (col) { const [x, y] = P(o.x, o.y); R(x - sz2 / 2, y - sz2 - 1, sz2, sz2, col); } } }
  for (const a of g.actors) { if (!a.alive || a === p) continue; const f = Math.floor(a.y / T / FH); if (f < f0 || f > f1) continue; const fl = W.floors[f]; const tx = Math.floor(a.x / T), r = Math.floor(a.y / T) - fl.y0 - 1; if (!(r >= 0 && fl.seen[r * W.W + tx])) continue; if (!full && NE.dist(a.x, a.y, p.x, p.y) > 260) continue;
    const col = a.isRemote ? '#60d0ff' : a.town ? '#d8c8a0' : a.isNPC ? (a.enc ? '#ffb0ff' : '#c890ff') : a.D ? (a.hostile === false ? '#d0a060' : '#ff4a3a') : null; if (!col) continue; const [x, y] = P(a.x, a.y); R(x - 1, y - 4, 3, 4, col); }
  const q = G.net && G.net.on && G.net.peer; if (q) { const [x, y] = P(q.x, q.y); R(x - 2, y - 6, 5, 6, '#60d0ff'); }
  if (p && (performance.now() / 300 | 0) % 2) { const [x, y] = P(p.x, p.y); R(x - 2, y - 6, 5, 6, '#ffe080'); }
};
UI0().drawMap = function () {
  const cv = document.getElementById('mapcv'); if (!cv) return; const g = G, W = g.world, p = g.player; if (!W || W.lobby || !p) { cv.width = 200; cv.height = 40; const c = cv.getContext('2d'); c.fillStyle = '#ccc'; c.font = '10px monospace'; c.fillText('Staging lobby — no map.', 10, 24); return; }
  const S = 4, FH = NE.FH, LM = 70; const fi = g.floorIdx(p.y - 2); const f0 = Math.max(0, fi - 3), f1 = Math.min(W.floors.length - 1, fi + 3);
  const w = W.W * S + LM, h = (f1 - f0 + 1) * FH * S; if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } const c = cv.getContext('2d'); c.fillStyle = '#060504'; c.fillRect(0, 0, w, h);
  NE.drawTilesTo(c, W, f0, f1, 0, W.W, S, LM, 0, false);
  for (let f = f0; f <= f1; f++) { const fl = W.floors[f]; const oy = (f - f0) * FH * S; c.fillStyle = NE.shade(fl.biome.pal.lamp, 0.7); c.fillRect(LM - 3, oy, 2, FH * S); c.fillStyle = fl.town ? '#ffd890' : '#a09a8a'; c.font = '10px monospace'; c.fillText(Math.round(fl.depth) + 'm', 3, oy + 13); c.fillStyle = '#7a7468'; c.font = '9px monospace'; c.fillText((fl.town ? fl.town.name : fl.biome.name).slice(0, 11), 3, oy + 25); if (fl.camp) { c.fillStyle = '#ff6a4a'; c.fillText('camp', 3, oy + 37); } }
  mapMarks(c, W, f0, f1, 0, S, LM, 0, true);
};
function UI0() { return NE.UI; }
// the Star Compass reveals each level as you enter it
const puS = NE.Player.prototype.update; NE.Player.prototype.update = function (dt) { const r = puS.apply(this, arguments); if (G.state === 'run' && Object.values(this.gear || {}).some(e => e && e.id === 'starcompass')) { const fl = G.curFloor && G.curFloor(); if (fl && !fl._revealed) { fl._revealed = true; fl.seen.fill(1); G.toast('The Star Compass shows you the whole level.'); } } return r; };
const legA = NE.UI.render.map; NE.UI.render.map = function (b) { legA.call(this, b); const l = b.querySelector('.map-leg'); if (l) l.innerHTML = '<span><i style="background:#ffe080"></i>You</span><span><i style="background:#60d0ff"></i>Partner</span><span><i style="background:#e0c070"></i>Container</span><span><i style="background:#ff4a3a"></i>Hostile</span><span><i style="background:#ffb0ff"></i>Wanderer</span><span><i style="background:#c0a060"></i>Hatch</span><span><i style="background:#ff80ff"></i>Artifact</span><span><i style="background:#ff8030"></i>Fire</span>'; NE.UI.drawMap(); };

// =====================================================================================================================
// MINIMAP: live, drag it anywhere (it remembers), [U] hides it. Starts just left of your portrait.
// =====================================================================================================================
const MM = NE.MM = { el: null, cv: null, t: 0, hidden: false };
MM.load = () => { try { return JSON.parse(localStorage.getItem('ne_minimap') || 'null'); } catch (e) { return null; } };
MM.save = () => { try { const r = MM.el.getBoundingClientRect(); localStorage.setItem('ne_minimap', JSON.stringify({ x: r.left, y: r.top, hidden: MM.hidden })); } catch (e) { } };
MM.make = function () { if (MM.el) return; const el = MM.el = document.createElement('div'); el.id = 'minimap'; el.innerHTML = '<div class="mm-h"><span>MAP</span><small></small><b title="Reset position">⟲</b></div><canvas width="240" height="132"></canvas>'; document.body.appendChild(el); MM.cv = el.querySelector('canvas');
  const sv = MM.load(); if (sv) { MM.hidden = !!sv.hidden; if (sv.x != null) { el.style.left = clamp(sv.x, 0, innerWidth - 60) + 'px'; el.style.top = clamp(sv.y, 0, innerHeight - 40) + 'px'; el.style.right = 'auto'; } }
  let drag = null; el.querySelector('.mm-h').addEventListener('mousedown', e => { if (e.target.tagName === 'B') return; const r = el.getBoundingClientRect(); drag = { dx: e.clientX - r.left, dy: e.clientY - r.top }; e.preventDefault(); e.stopPropagation(); });
  addEventListener('mousemove', e => { if (!drag) return; el.style.left = clamp(e.clientX - drag.dx, 0, innerWidth - 60) + 'px'; el.style.top = clamp(e.clientY - drag.dy, 0, innerHeight - 30) + 'px'; el.style.right = 'auto'; });
  addEventListener('mouseup', () => { if (drag) { drag = null; MM.save(); } });
  el.querySelector('.mm-h b').onclick = e => { e.stopPropagation(); el.style.left = ''; el.style.top = ''; el.style.right = ''; MM.save(); try { localStorage.removeItem('ne_minimap'); } catch (e2) { } };
  el.addEventListener('mousedown', e => e.stopPropagation()); };
MM.toggle = function () { MM.make(); MM.hidden = !MM.hidden; MM.save(); G.toast(MM.hidden ? 'Minimap hidden ([U] to show).' : 'Minimap shown.'); };
MM.tick = function (dt) { const g = G, p = g.player; const show = g.state === 'run' && p && g.world && !g.world.lobby && !MM.hidden; if (!show) { if (MM.el) MM.el.style.display = 'none'; return; } MM.make(); MM.el.style.display = '';
  MM.t -= dt; if (MM.t > 0) return; MM.t = 0.12; const W = g.world, c = MM.cv.getContext('2d'); const S = 3, cols = 80, rows = 44; const ptx = Math.floor(p.x / T), pty = Math.floor(p.y / T);
  const x0 = clamp(ptx - cols / 2, 0, Math.max(0, W.W - cols)), ty0 = pty - rows / 2; const FH = NE.FH; const f0 = Math.max(0, Math.floor(ty0 / FH)), f1 = Math.min(W.floors.length - 1, Math.floor((ty0 + rows) / FH));
  c.fillStyle = '#060504'; c.fillRect(0, 0, 240, 132); const oy = (f0 * FH - ty0) * S;
  NE.drawTilesTo(c, W, f0, f1, x0, x0 + cols, S, 0, oy, false); mapMarks(c, W, f0, f1, x0, S, 0, oy, false);
  const fl = g.curFloor && g.curFloor(); MM.el.querySelector('small').textContent = fl ? (fl.town ? fl.town.name : fl.biome.name) + ' · ' + Math.round(NE.depthOfY(p.y)) + 'm' : ''; };
const tickM = NE.UI.tick; NE.UI.tick = function (dt) { tickM.apply(this, arguments); try { MM.tick(dt); } catch (e) { } };
const stM = document.createElement('style'); stM.textContent = '#minimap{position:fixed;top:.7em;right:calc(.8em + 7.6em + .7em);z-index:6;background:rgba(14,10,8,.86);border:1px solid rgba(255,210,90,.25);border-radius:.5em;padding:.25em;box-shadow:0 .3em 1.2em rgba(0,0,0,.5)}#minimap canvas{display:block;width:240px;height:132px;image-rendering:pixelated;border-radius:.3em}#minimap .mm-h{display:flex;gap:.5em;align-items:center;font-size:.7em;color:#e8d8b0;cursor:move;padding:0 .2em .2em;user-select:none;letter-spacing:.1em}#minimap .mm-h small{flex:1;color:#a09070;letter-spacing:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#minimap .mm-h b{cursor:pointer;color:#a09070;font-weight:normal}';
document.head.appendChild(stM);

// swim-fin icon (hand-drawn)
const iconF = NE.icon; const finCache = {};
NE.icon = function (key, col, scale, itemId) { if (key === 'gi_swimfins') { const sc = Math.max(1, Math.round((scale || 4) / 2)); if (finCache[sc]) return finCache[sc]; const c = document.createElement('canvas'); c.width = c.height = 16 * sc; const x = c.getContext('2d');
  const rows = ['................', '................', '..oo......oo....', '.offo....offo...', '.offo....offo...', '.offfo...offfo..', '.offffo..offffo.', '.offffo..offffo.', '.ofdfdo..ofdfdo.', '.offffo..offffo.', '.offfo...offfo..', '..ooo.....ooo...', '................'];
  const pal = { o: '#140e0a', f: '#e08030', d: '#a05018' }; rows.forEach((r, j) => { for (let i = 0; i < 16; i++) { const ch = r[i]; if (ch === '.') continue; x.fillStyle = pal[ch]; x.fillRect(i * sc, (j + 2) * sc, sc, sc); } }); return finCache[sc] = c; }
  return iconF.apply(this, arguments); };

// vaults stay solid rock until you break through their cracked wall
NE.vaultOpen = function (fl) { const V = fl.vault; if (!V || V.open) return true; const W = G.world; let breach = false; for (let r = V.rows[0]; r <= V.rows[1]; r++) if (!W.solid(W.get(V.inner, fl.y0 + r))) breach = true; if (!breach && W.get(V.room[0], fl.y0 + V.rows[1]) !== 0) return false;
  V.open = true; for (let x = V.room[0]; x <= V.room[1]; x++) for (let r = V.rows[0]; r <= V.rows[1]; r++) if (W.get(x, fl.y0 + r) !== 0) W.setMod(x, fl.y0 + r, 0);
  for (const o of fl.objs) if (o.sealed) { o.sealed = false; if (o.type === 'container') o.act = 'search'; }
  if (breach) { NE.Audio.play('crack'); NE.UI.banner('A SEALED VAULT', 'Old air rushes out. Something hums inside.'); } return true; };
const puV = NE.Player.prototype.update; NE.Player.prototype.update = function (dt) { const r = puV.apply(this, arguments); this._vT = (this._vT || 0) - dt; if (this._vT <= 0 && G.state === 'run' && G.world && !G.world.lobby) { this._vT = 0.3; const fl = G.curFloor && G.curFloor(); if (fl && fl.vault && !fl.vault.open) NE.vaultOpen(fl); } return r; };
const drawObjV = G.drawObj; G.drawObj = function (ctx, o) { if (o.sealed) return; return drawObjV.apply(this, arguments); };

// =====================================================================================================================
// FOOD BALANCE (0.9.1): simulated runs showed ~4x more food than a run burns. Bodies now rarely carry food, forage is
// thinner, containers hold less food — and going hungry or thirsty for long actually kills you.
// =====================================================================================================================
NE.FOOD_DROP_KEEP = 0.35;
const dlF = NE.Enemy.prototype.dropLoot;
NE.Enemy.prototype.dropLoot = function () { return dlF.apply(this, arguments).filter(e => { const it = IT[e.id]; return !(it && it.cat === 'food') || chance(NE.FOOD_DROP_KEEP); }); };
nerf(L.common, ['water', 'dirtywater', 'ration', 'chocolate', 'mushroom', 'can', 'honey'], 0.55);
if (L.food) nerf(L.food, ['ration', 'chocolate', 'water', 'can', 'mushroom', 'cactus', 'alcohol'], 0.55);
for (const t of ['frost', 'wreck', 'mine', 'raider', 'ruin', 'hive', 'grove', 'comb']) if (L[t]) nerf(L[t], ['water', 'ration', 'honey', 'mushroom', 'herb'].filter(id => id !== 'herb' || t === 'none'), 0.75);
const forF = W_.genFloor; W_.genFloor = function (f) { const fl = forF.call(this, f); if (this.lobby || !fl || fl.town) return fl; fl.objs = fl.objs.filter(o => o.type !== 'forage' || ['gingerroot', 'mandrake', 'herb'].includes(o.item) || chance(0.6)); return fl; };
// dry biomes: a little less punishing, and rock seeps to drink from
for (const b of NE.BIOMES) { const k = { desert: 1.5, magma: 1.7, hive: 1.15, heart: 1.3 }[b.id]; if (k) b.thirst = k; }
const seepF = W_.genFloor; W_.genFloor = function (f) { const fl = seepF.call(this, f); if (this.lobby || !fl || fl.town || f === 0) return fl; const B = fl.biome.id;
  const ch = { desert: 0.6, magma: 0.65, heart: 0.55, hive: 0.4, crystal: 0.35, ossuary: 0.35 }[B] || 0.25;
  if (chance(ch)) for (let tries = 0; tries < 20; tries++) { const tx = ri(8, this.W - 9); const x = (tx + 0.5) * T; if (fl.objs.some(o => Math.abs(o.x - x) < 16)) continue; fl.objs.push({ type: 'seep', x, y: this.groundY(fl, x), label: 'Rock Seep — drink', act: 'drink', uses: ri(2, 5) }); break; }
  return fl; };
const drawSeep = G.drawObj; G.drawObj = function (ctx, o) { if (o.type === 'seep') { const x = Math.round(o.x), y = Math.round(o.y); ctx.fillStyle = '#2a3a40'; ctx.fillRect(x - 4, y - 16, 8, 16); ctx.fillStyle = o.uses > 0 ? '#5aa0c0' : '#3a4a50'; ctx.fillRect(x - 1, y - 15, 2, 14); ctx.fillRect(x - 3, y - 2, 6, 2); if (o.uses > 0) { const k = (G.t * 1.5 + x) % 1; ctx.fillStyle = '#9ad8f0'; ctx.fillRect(x, y - 14 + Math.round(k * 12), 1, 2); } return; } return drawSeep.apply(this, arguments); };

// =====================================================================================================================
// 30 NEW VESPA GIFTS (0.9.3): strain gifts go from 13 to 43, and every strain gets a fresh, wider set
// =====================================================================================================================
const NG = [
  // id, name, icon, tier, mut, desc
  ['sapblood', 'Sap Blood', 'ab_amber', 1, 'amber', 'Your blood runs thick and slow: -20% bleeding.'],
  ['nightglow', 'Lantern Eyes', 'ab_eye', 1, 'eyes', 'Your eyes drink the dark: see 25% further, lantern reach +15%.'],
  ['stilltongue', 'Still Tongue', 'ab_mand', 1, 'mandibles', 'A calm that isn\'t yours: -30% stress.'],
  ['ironstomach', 'Iron Stomach', 'ab_mand', 1, 'mandibles', 'Toxins hit you half as hard.'],
  ['cleanblood', 'Clean Blood', 'ab_heart', 1, 'veins', 'The brood eats rot: -40% infection.'],
  ['mossskin', 'Moss Skin', 'ab_chitin', 1, 'plates', 'A soft green fuzz: -30% cold, -20% radiation.'],
  ['featherfall', 'Feather Fall', 'ab_wings', 1, 'wings', 'Vestigial wings catch the air: fall damage halved.'],
  ['deeplungs', 'Deep Lungs', 'ab_pulse', 1, 'veins', '+10 stamina and 10 extra seconds of breath underwater.'],
  ['packlegs', 'Mule Legs', 'ab_wings', 1, 'plates', 'Thick, knotted thighs: +6kg carry.'],
  ['scavnose', 'Scavenger\'s Nose', 'ab_mand', 1, 'antennae', 'You smell what\'s hidden: +15% loot, search 15% faster.'],
  ['nectarnose', 'Nectar Sense', 'ab_eye', 1, 'antennae', 'Relic flowers and sealed vaults show on your map wherever they are.'],
  ['curseward', 'Abyss-Born', 'ab_goo', 2, 'veins', 'The deep recognises you: the Curse of the Abyss builds 35% slower.'],
  ['crushjaws', 'Crushing Jaws', 'ab_mand', 2, 'mandibles', 'Your bare-handed blows hit 60% harder.'],
  ['stingtail', 'Tail Stinger', 'ab_sting', 2, 'stinger', 'Every 8s your next melee hit injects venom: +12 damage and poison.'],
  ['hardshell', 'Hard Shell', 'ab_chitin', 2, 'plates', 'A plate over your skull and ribs: -15% damage to head and torso.'],
  ['quickclot', 'Quick Clot', 'ab_amber', 2, 'amber', 'Every 20s your worst bleeding wound seals itself.'],
  ['secondwind', 'Second Wind', 'ab_heart', 2, 'veins', 'When your stamina runs dry, a gland refills 60% of it (every 40s).'],
  ['wallcrawl', 'Wall Crawler', 'ab_wings', 2, 'wings', 'Hooked fingertips: wall-climb twice as long, climb 30% faster.'],
  ['pheromone', 'Calming Musk', 'ab_goo', 2, 'antennae', 'Beasts and ferals that spot you often lose interest — unless you attack them.'],
  ['acidbloom', 'Acid Bloom', 'ab_goo', 2, 'veins', 'Your kills burst into acid, burning anything else nearby.'],
  ['wingbuzz', 'Wing Buzz', 'ab_wings', 2, 'wings', 'Running costs 40% less stamina and you run 8% faster.'],
  ['stonebones', 'Stone Bones', 'ab_chitin', 2, 'plates', 'Bones like rock: fractures 60% rarer, -20% fall damage.'],
  ['killrush', 'Hunter\'s Rush', 'ab_sting', 2, 'stinger', 'Every kill: 4 seconds of +25% speed and +20% melee.'],
  ['longarms', 'Long Limbs', 'ab_wings', 2, 'plates', 'Your arms stretch a little too far: +3 reach, +10% melee.'],
  ['chameleon', 'Chameleon Skin', 'ab_eye', 2, 'plates', 'Crouch and hold still: nothing more than a few steps away can see you.'],
  ['echoburst', 'Echo Burst', 'ab_pulse', 2, 'antennae', 'Every kill instantly resets your dash and lunge.'],
  ['broodmother', 'Brood Mother', 'ab_heart', 3, 'amber', 'Every kill has a 25% chance to fully heal your most hurt body part.'],
  ['jellyveins', 'Royal Jelly Veins', 'ab_amber', 3, 'veins', 'Every body part slowly regenerates (0.4 HP/s).'],
  ['deathgrip', 'Death Grip', 'ab_chitin', 3, 'plates', 'Below 25% blood you take 35% less damage from everything.'],
  ['swarmcloak', 'Swarm Cloak', 'ab_pulse', 3, 'wings', 'Every 20s a cloud of drones swirls around you for 4s, stinging anything in reach.'],
];
const NGIDS = NG.map(g => g[0]);
for (const [id, name, icon, tier, mut, desc] of NG) { const g = { id, name, icon, desc, mut, strain: 1 }; NE.STRAIN_GIFTS.push(g); NE.ABILITIES.push(g); NE.GIFT_TIER[id] = tier; }
// redistribute: every strain gets a fresh mix; low tiers get modest gifts, high tiers get run-defining ones
{ const tierOf = id => NE.GIFT_TIER[id] || 2; const SG = NE.STRAIN_GIFTS.map(g => g.id);
  const pools = { 1: SG.filter(id => tierOf(id) === 1), 2: SG.filter(id => tierOf(id) === 2), 3: SG.filter(id => tierOf(id) === 3) }; const ptr = { 1: 0, 2: 0, 3: 0 };
  const MIX = { common: [1, 2], uncommon: [1, 1, 2], rare: [1, 2, 2], epic: [1, 2, 2, 3], legendary: [2, 2, 3, 3], mythical: [1, 2, 2, 3, 3], secret: [1, 1, 2, 2, 3, 3] };
  const seen = new Set();
  NE.VARIANTS.forEach((v, i) => { const mix = MIX[v.tier] || [1, 2]; for (let tries = 0; tries < 8; tries++) { const pow = []; for (const t of mix) { const P = pools[t]; let id; let k = 0; do { id = P[(ptr[t] + k) % P.length]; k++; } while (pow.includes(id) && k < P.length); ptr[t] = (ptr[t] + k + (tries ? 3 : 0)) % P.length; pow.push(id); } const key = pow.slice().sort().join(','); if (!seen.has(key)) { seen.add(key); v.pow = pow; break; } v.pow = pow; } });
}
// ---- stat gifts
const GM = { sapblood: { bleed: 0.8 }, nightglow: { sight: 1.25, lamp: 1.15 }, stilltongue: { stress: 0.7 }, ironstomach: { tox: 0.5 }, cleanblood: { infect: 0.6 }, mossskin: { cold: 0.7, rad: 0.8 }, featherfall: { fall: 0.5 }, scavnose: { loot: 1.15, search: 0.85 }, wallcrawl: { parkour: 2, climb: 1.3 }, wingbuzz: { runCost: 0.6, runSpeed: 1.08 }, stonebones: { fracture: 0.4, fall: 0.8 }, longarms: { melee: 1.1 } };
const GA = { deeplungs: { stamina: 10 } };
const saG = NE.Player.prototype.setAbilities;
NE.Player.prototype.setAbilities = function (list) { const s = this.stats; if (this._gm3) for (const k in this._gm3) s[k] /= this._gm3[k]; if (this._ga3) for (const k in this._ga3) s[k] -= this._ga3[k]; if (this._mule && this.inv) this.inv.carry -= 6;
  const r = saG.apply(this, arguments); const L2 = list || []; const m = {}, a = {}; for (const id of L2) { for (const k in (GM[id] || {})) m[k] = (m[k] || 1) * GM[id][k]; for (const k in (GA[id] || {})) a[k] = (a[k] || 0) + GA[id][k]; }
  for (const k in m) s[k] = (s[k] == null ? 1 : s[k]) * m[k]; for (const k in a) s[k] = (s[k] || 0) + a[k]; this._gm3 = m; this._ga3 = a; this._mule = L2.includes('packlegs'); if (this._mule && this.inv) this.inv.carry += 6; return r; };
const ab = (p, id) => p && p.abil && p.abil.includes(id);
NE.hasGift = ab;
// curse & map
const ctrigG = NE.curseTrigger; NE.curseTrigger = function (p, id, dur, quiet) { if (ab(p, 'curseward') && chance(0.35)) return; return ctrigG.apply(this, arguments); };
const puCW = NE.Player.prototype.update; NE.Player.prototype.update = function (dt) { const C = G.run && G.run.curse; const v0 = C ? C.v : 0; const r = puCW.apply(this, arguments); if (C && ab(this, 'curseward') && C.v > v0) C.v = v0 + (C.v - v0) * 0.65; return r; };
// fists
const smG = NE.styleMul; NE.styleMul = function (a, w) { let k = smG(a, w); if (a && a.isPlayer && w && (w.id === 'fists' || w.id === 'jaws') && ab(a, 'crushjaws')) k *= 1.6; if (a && a.isPlayer && a.rushT > 0) k *= 1.2; return k; };
// damage taken
const hurtG = NE.Actor.prototype.hurt;
NE.Actor.prototype.hurt = function (part, dmg, kind, src, dir) { const p = G.player;
  if (this.isPlayer && this.abil) { if (ab(this, 'hardshell') && (part === 'head' || part === 'torso')) arguments[1] *= 0.85; if (ab(this, 'deathgrip') && this.anat.blood < 1000) arguments[1] *= 0.65; }
  const r = hurtG.apply(this, arguments);
  if (p && this !== p && this.D && this.alive && src === p.surv.first && kind !== 'poison' && kind !== 'burn' && ab(p, 'stingtail') && (p.stingT || 0) <= G.t) { p.stingT = G.t + 8; hurtG.call(this, part, 12, 'sharp', src, dir); this.anat.tox = (this.anat.tox || 0) + 30; for (let i = 0; i < 6; i++) G.addP(this.x, this.y - 10, rf(-20, 20), rf(-40, 0), 0.5, '#a0e040', 'spark', 0.3); }
  return r; };
// kills
const deathG = G.onEnemyDeath;
G.onEnemyDeath = function (e, cause) { const was = e.alive; deathG.apply(this, arguments); const p = G.player; if (!was || !p || !p.alive || !e.anat || e.anat.lastHit !== p.surv.first) return;
  if (ab(p, 'killrush')) p.rushT = 4;
  if (ab(p, 'echoburst')) { p.dashCD = 0; p.lungeCD = 0; }
  if (ab(p, 'broodmother') && chance(0.25)) { let worst = null; for (const k of NE.PARTS) { const P = p.anat.parts[k]; if (P.severed) continue; if (!worst || P.hp / P.max < worst.hp / worst.max) worst = P; } if (worst) { worst.hp = worst.max; G.toast('Brood Mother — your flesh knits whole.'); } }
  if (ab(p, 'acidbloom')) { for (let i = 0; i < 18; i++) G.addP(e.x, e.y - 6, rf(-60, 60), rf(-60, 0), rf(0.4, 0.8), i % 2 ? '#a0e040' : '#60a020', 'spark', 0.6); for (const a of G.actors) if (a !== e && a.D && a.alive && NE.dist(a.x, a.y, e.x, e.y) < 40) a.hurt('torso', 12, 'burn', p.surv.first, { x: Math.sign(a.x - e.x), y: -0.3 }); } };
// per-frame gifts
const puG = NE.Player.prototype.update;
NE.Player.prototype.update = function (dt) { const r = puG.apply(this, arguments); if (!this.alive || !this.abil || !this.abil.length || G.state !== 'run') return r; const A = this.anat;
  if (ab(this, 'quickclot')) { this.clotT = (this.clotT || 20) - dt; if (this.clotT <= 0) { this.clotT = 20; let best = null, bp = null; for (const k of NE.PARTS) for (const w of A.parts[k].wounds) if (!w.closed && (!best || w.bleed > best.bleed)) { best = w; bp = k; } if (best && best.bleed > 0.1) { best.closed = true; best.bleed = 0; G.toast('Quick Clot seals the wound on your ' + NE.PART_NAMES[bp].toLowerCase() + '.'); } } }
  if (ab(this, 'secondwind') && A.stam <= 1 && (this.windCD || 0) <= G.t) { this.windCD = G.t + 40; A.stam = A.stamMax * 0.6; G.toast('Second wind!'); NE.Audio.play('gasp', 0.6); }
  if (ab(this, 'jellyveins')) for (const k of NE.PARTS) { const P = A.parts[k]; if (!P.severed) P.hp = Math.min(P.max, P.hp + dt * 0.4); }
  if (this.rushT > 0) { this.rushT -= dt; } const rush = this.rushT > 0; if (rush !== !!this._rush) { this.stats.speed *= rush ? 1.25 : 1 / 1.25; this._rush = rush; }
  if (ab(this, 'swarmcloak')) { this.cloakT = (this.cloakT == null ? 20 : this.cloakT) - dt; if (this.cloakT <= 0) { this.cloakT = 20; this.cloakOn = 4; NE.Audio.play('hiss', 0.4); } if (this.cloakOn > 0) { this.cloakOn -= dt; if (Math.random() < dt * 40) G.addP(this.x + rf(-14, 14), this.y - rf(2, 20), rf(-30, 30), rf(-30, 30), 0.3, '#ffd040', 'spark', 0); this.cloakTick = (this.cloakTick || 0) - dt; if (this.cloakTick <= 0) { this.cloakTick = 0.5; for (const a of G.actors) if (a.D && a.alive && NE.dist(a.x, a.y, this.x, this.y) < 22) a.hurt(a.partNear ? a.partNear(a.x, a.y - 10) : 'torso', 2.5, 'sharp', this.surv.first, { x: Math.sign(a.x - this.x), y: 0 }); } } }
  return r; };
// beasts lose interest; chameleons vanish
const euG = NE.Enemy.prototype.update; NE.Enemy.prototype.update = function (dt) { const r = euG.apply(this, arguments); const t = this.target; if (t && t.isPlayer && ab(t, 'pheromone') && !this.provoked && ['feral', 'trog', 'husk', 'stalker', 'burrower', 'swarmling', 'bloater'].includes(this.type) && chance(dt * 0.35)) { this.target = null; this.state = 'idle'; } return r; };
const seeG = NE.Enemy.prototype.canSee; NE.Enemy.prototype.canSee = function (a) { if (a && a.isPlayer && ab(a, 'chameleon') && a.crouch && Math.abs(a.vx) < 6 && NE.dist(a.x, a.y, this.x, this.y) > 28 && !this.provoked) return false; return seeG.apply(this, arguments); };

// =====================================================================================================================
// FINAL PLACEMENT CHECK (0.10.1): nothing stands in water, floats, or sits somewhere you can't reach
// =====================================================================================================================
const valF = W_.genFloor;
const valid = function (W, fl) {
  const y0 = fl.y0, FH = NE.FH, R = fl._reach; const LQ = t => t === 5 || t === 9 || t === 11;
  const okAt = (x, y, head, ceil) => { const tx = Math.floor(x / T), ty = Math.round(y / T); if (ceil) return W.solid(W.get(tx, ty - 1)) && W.get(tx, ty) === 0; if (!(W.solid(W.get(tx, ty)) || W.get(tx, ty) === 2)) return false; for (let k = 1; k <= head; k++) if (W.get(tx, ty - k) !== 0) return false; for (const dx of [-1, 1]) if (LQ(W.get(tx + dx, ty - 1))) return false; const r = ty - 1 - y0; return !R || r < 0 || r >= FH || R[r * W.W + tx]; };
  const fix = (o, head, ceil) => { if (okAt(o.x, o.y, head, ceil)) return true; const s2 = NE.surfaceNear && NE.surfaceNear(W, fl, Math.floor(o.x / T), Math.round(o.y / T) - y0, ceil, head); if (!s2) return false; o.x = s2.x * T + 4; o.y = ceil ? s2.y * T + 1 : s2.y * T; return true; };
  medGroup(W, fl, okAt);
  fl.objs = fl.objs.filter(o => { if (o.sealed || o.type === 'hatch' || o.x == null || o.y == null) return true; const ceil = o.type === 'lamp' || o.type === 'icicle' || (o.type === 'crystal' && o.ceil); return fix(o, o.type === 'medtent' || o.type === 'quarter' ? 4 : 2, ceil); });
  fl.spawns = fl.spawns.filter(sp => fix(sp, 3, false));
  fl.decor = fl.decor.filter(d => { if (d.k === 'vcrack' || d.k === 'stal' || d.k === 'vine' || d.k === 'roots' || d.k === 'chain' || d.k === 'web' || d._grp || d.k === 'medtent') return true; if (d.k === 'btent' || d.k === 'bflag') return okAt(d.x, d.y, 2, false); return fix(d, 1, false); });
  declutter(W, fl, okAt);
};
// ---- the medical tent, its cot, cabinet, water jug (and triage duffel/tent) always move as one unit onto flat, dry ground
const medGroup = function (W, fl, okAt) {
  if (!fl.poi || !(fl.poi.kind === 'medic' || fl.poi.kind === 'triage')) return; const cx0 = (fl.poi.x0 + fl.poi.x1) / 2;
  if (fl._mg == null) { fl._mg = cx0; } const cx = fl._mg; const mem = [];
  for (const o of fl.objs) { if (o.type === 'table' && /Field Cot/.test(o.label || '')) mem.push([o, -12, 0]); else if (o.ct === 'cabinet' && Math.abs(o.x - cx - 14) < 60) mem.push([o, 14, 0]); else if (o.type === 'dispenser' && o.label === 'Water Jug') mem.push([o, 30, 1]); else if (o.triage) mem.push([o, -30, 1]); }
  for (const d of fl.decor) { if (d.k === 'medtent') { d._grp = 1; mem.push([d, 0, 0]); } else if (d.k === 'tent' && fl.poi.kind === 'triage' && Math.abs(d.x - (cx - 40)) < 80) { d._grp = 1; mem.push([d, -40, 1]); } }
  if (!mem.length) return;
  const fits = (c, list) => { let lo = 1e9, hi = -1e9; for (const [, off] of list) { lo = Math.min(lo, off); hi = Math.max(hi, off); } const a = Math.floor((c + lo - 22) / T), b = Math.floor((c + hi + 8) / T); let row = null;
    for (let x = a; x <= b; x++) { if (row == null) { const sx = Math.floor(c / T); for (let r = fl.y0 + 5; r < fl.y0 + NE.FH - 1; r++) if (okAt(sx * T + 4, r * T, 4, false) && (row == null || Math.abs(r - Math.round(mem[0][0].y / T)) < Math.abs(row - Math.round(mem[0][0].y / T)))) row = r; if (row == null) return null; }
      if (!okAt(x * T + 4, row * T, 4, false)) return null; } return row; };
  const place = (c, row, list) => { for (const [o, off] of list) { o.x = c + off; o.y = row * T; } fl._mg = c; };
  // already sitting together on good ground? leave it
  const ok0 = mem.every(([o, off]) => Math.abs(o.x - (cx + off)) < 1 && Math.abs(o.y - mem[0][0].y) < 1) && fits(cx, mem); if (ok0 != null && ok0 === Math.round(mem[0][0].y / T)) return;
  for (const list of [mem, mem.filter(m => !m[2])]) for (let d = 0; d <= W.W; d++) for (const c of d ? [cx + d * T, cx - d * T] : [cx]) { if (c < 6 * T || c > (W.W - 6) * T) continue; const row = fits(c, list); if (row != null) { place(c, row, list); if (list !== mem) { const drop = new Set(mem.filter(m => m[2]).map(m => m[0])); fl.objs = fl.objs.filter(o => !drop.has(o)); fl.decor = fl.decor.filter(o => !drop.has(o)); } return; } }
  // nowhere flat enough: dig a level pad for the tent beside the path (never plugging a shaft the path drops through)
  { const R = fl._reach, Wd = W.W, y0 = fl.y0, FH = NE.FH; const LQ = t => t === 5 || t === 9 || t === 11; const ys = mem.map(m => Math.round(m[0].y / T)).sort((a, b) => a - b); const row0 = clamp(ys[ys.length >> 1], y0 + 6, y0 + FH - 2);
    let lo = 1e9, hi = -1e9; for (const [, off] of mem) { lo = Math.min(lo, off); hi = Math.max(hi, off); }
    for (let d = 0; d <= 50 && R; d++) for (const c of d ? [cx + d * T, cx - d * T] : [cx]) for (const row of [row0, row0 - 1, row0 + 1, row0 - 2, row0 + 2]) {
      if (row < y0 + 6 || row > y0 + FH - 2) continue; const a = Math.floor((c + lo - 22) / T), b = Math.floor((c + hi + 8) / T); if (a < 4 || b > Wd - 5) continue; let ok = true, touch = 0;
      for (let x = a - 2; x <= b + 2 && ok; x++) for (let r = row - 6; r <= row + 1; r++) if (LQ(W.get(x, r))) { ok = false; break; }
      for (let x = a; x <= b && ok; x++) { const rr = row - y0; if (W.get(x, row) === 0 && R[rr * Wd + x] && W.get(x, row + 1) === 0) ok = false; if (W.get(x, row + 2) === 0 && W.get(x, row + 1) === 0 && W.get(x, row) === 0) ok = false; for (let r = row - 5; r < row; r++) if (r - y0 >= 0 && R[(r - y0) * Wd + x]) touch++; }
      if (!ok || touch < 4) continue;
      for (let x = a; x <= b; x++) { for (let r = row - 5; r < row; r++) { if (W.get(x, r) !== 0 && W.get(x, r) !== 2) W.set(x, r, 0); if (r - y0 >= 0) R[(r - y0) * Wd + x] = 1; } for (let r = row; r <= row + 1; r++) if (!W.solid(W.get(x, r))) W.set(x, r, 1); }
      place(c, row, mem); return; } }
  // nowhere flat enough: keep the cabinet and cot where they stand, lose the jug so it can't end up alone
  { const cab = mem.find(m => m[1] === 14 && m[0].ct); if (cab) for (const [o, off, opt] of mem) { if (o === cab[0] || opt) continue; const x = cab[0].x - 14 + off; if (okAt(x, cab[0].y, 2, false)) { o.x = x; o.y = cab[0].y; } } }
  const drop = new Set(mem.filter(m => m[2]).map(m => m[0])); fl.objs = fl.objs.filter(o => !drop.has(o)); fl.decor = fl.decor.filter(o => !drop.has(o));
};
// ---- nothing generates on top of anything else: important things keep their spot, the rest shuffle along the ground or go
const OWD = { container: 13, table: 18, bench: 16, bed: 18, fire: 11, dispenser: 8, forage: 9, glowshroom: 7, post: 16, sign: 8, elevator: 22, seep: 8, gasleak: 8, relic: 12, artifact: 10, console: 12, tfeat: 18, ember: 6, dead: 14, quarter: 18, scrapheap: 14 };
const CSW = { cart: 18, coffin: 18, body: 16, chest: 15, sack: 12, locker: 11, cell: 12, skulls: 14, bindle: 16 };
const declutter = function (W, fl, okAt) {
  const ceil = o => o.type === 'lamp' || o.type === 'icicle' || (o.type === 'crystal' && o.ceil) || o.type === 'rad' || o.type === 'hatch' || o.sealed || o.x == null || o.y == null;
  const wOf = o => o.type === 'container' ? (CSW[(NE.CONTAINERS[o.ct] || {}).shape] || 13) : (OWD[o.type] != null ? OWD[o.type] : 10);
  const pri = o => grp.has(o) ? 0 : o.type === 'forage' || o.type === 'glowshroom' || o.type === 'ember' ? 3 : o.type === 'prop' || o.type === 'gasleak' || o.type === 'seep' ? 2 : 1;
  const placed = []; const drop = new Set(); const grp = new Set(fl.objs.filter(o => (o.type === 'table' && /Field Cot/.test(o.label || '')) || o.ct === 'cabinet' || o.label === 'Water Jug' || o.triage));
  const list = fl.objs.filter(o => !ceil(o)).map((o, i) => [o, i]).sort((a, b) => pri(a[0]) - pri(b[0]) || a[1] - b[1]).map(a => a[0]);
  const hit = (o, x, y) => placed.some(q => Math.abs(q.x - x) < (wOf(q) + wOf(o)) / 2 + 2 && Math.abs(q.y - y) < 12);
  for (const o of list) {
    if (!hit(o, o.x, o.y)) { placed.push(o); continue; }
    const tx = Math.floor(o.x / T), ty = Math.round(o.y / T); let done = false;
    for (let d = 1; d <= 40 && !done; d++) for (const sx of [tx + d, tx - d]) { if (sx < 4 || sx > W.W - 5) continue;
      for (const dy of [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -6, 6]) { const x = sx * T + 4, y = (ty + dy) * T; if (okAt(x, y, 2, false) && !hit(o, x, y)) { o.x = x; o.y = y; done = true; break; } } if (done) break; }
    if (done) { placed.push(o); continue; } if (pri(o) >= 2) { drop.add(o); continue; }
    // no room anywhere nearby: keep whichever matters more and lose the other
    const imp = q => grp.has(q) ? 5 : ['hatch', 'elevator', 'post', 'fire', 'bench', 'table', 'bed', 'relic', 'artifact', 'console', 'tfeat', 'sign'].includes(q.type) ? 4 : q.type === 'container' ? (q.locked || q.ct === 'banditchest' || q.ct === 'vault' ? 3 : 2) : 1;
    const q = placed.find(q => Math.abs(q.x - o.x) < (wOf(q) + wOf(o)) / 2 + 2 && Math.abs(q.y - o.y) < 12);
    if (q && imp(o) > imp(q)) { drop.add(q); placed.splice(placed.indexOf(q), 1); placed.push(o); } else drop.add(o); }
  if (drop.size) fl.objs = fl.objs.filter(o => !drop.has(o));
  // a water jug only makes sense beside a medical tent
  const tents = fl.decor.filter(d => d.k === 'medtent'); fl.objs = fl.objs.filter(o => !(o.type === 'dispenser' && o.label === 'Water Jug') || tents.some(t => Math.abs(t.x - o.x) < 50 && Math.abs(t.y - o.y) < 16));
};
// later floors carve into the band above (drops/connectors), so re-check the previous floor too
NE._valid = valid; W_.genFloor = function (f) { const fl = valF.call(this, f); if (this.lobby || !fl) return fl; if (fl.delve) valid(this, fl); const pv = this.floors && this.floors[f - 1]; if (pv && pv.delve && !pv.town) valid(this, pv); return fl; };
})(window.NE);
