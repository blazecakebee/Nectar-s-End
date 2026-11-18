// Nectar's End — static data: names, items, biomes, perks, cosmetics, recipes
window.NE = window.NE || {};
(function (NE) {
'use strict';
NE.T = 8; NE.VW = 400; NE.VH = 225; NE.FH = 14; NE.WW = 112; NE.MPT = 2; NE.GRAV = 700;

NE.ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
NE.rf = (a, b) => a + Math.random() * (b - a);
NE.pick = a => a[Math.floor(Math.random() * a.length)];
NE.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
NE.lerp = (a, b, t) => a + (b - a) * t;
NE.chance = p => Math.random() < p;
NE.wpick = function (list) { let t = 0; for (const e of list) t += e[1]; let r = Math.random() * t; for (const e of list) { r -= e[1]; if (r <= 0) return e[0]; } return list[list.length - 1][0]; };
NE.hash = (x, y) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
NE.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

NE.FIRST = ['Ada','Abel','Agnes','Ansel','Bea','Boris','Cal','Cora','Dmitri','Dora','Eli','Esme','Felix','Freya','Gus','Greta','Hal','Hana','Ivo','Iris','Jonah','Juno','Kasimir','Kit','Lev','Lena','Milo','Maren','Nico','Noor','Otto','Olive','Pavel','Pia','Quinn','Rosa','Rafe','Sable','Silas','Tamsin','Theo','Una','Victor','Vera','Wes','Wren','Yuri','Zora','Mateo','Ines','Kofi','Amara','Hideo','Mei','Arjun','Priya','Sven','Ingrid','Tobias','Lucia','Marek','Odile','Bram','Nadia'];
NE.LAST = ['Abernathy','Barlow','Castellan','Drummond','Ellery','Falk','Greaves','Hollis','Ivers','Jessop','Kovac','Lindqvist','Marsh','Novak','Okafor','Petrov','Quill','Radcliffe','Sorensen','Thorne','Underhill','Vance','Whitlock','Yates','Zelenko','Ashdown','Blackwood','Crane','Dunmore','Fenwick','Garrow','Hale','Kestrel','Locke','Mercer','Nakamura','Osei','Pryce','Rook','Stroud','Tanaka','Voss','Weller','Morales','Haddad','Brennan','Kowalski','Achterberg','Moreau','Esposito','Lindgren','Varga'];

NE.OCCUPATIONS = [
  { id: 'paramedic', name: 'Paramedic', desc: 'Treats wounds 30% faster.', mods: { treat: 0.7 }, kit: ['bandage', 'tourniquet'] },
  { id: 'builder', name: 'Mine Worker', desc: '+3kg carry, sturdier bones.', mods: { carry: 3, fracture: 0.85 }, kit: ['tape', 'pipe'] },
  { id: 'cook', name: 'Line Cook', desc: 'Hunger drains 20% slower. Knows a blade.', mods: { hunger: 0.8 }, kit: ['knife', 'ration'] },
  { id: 'guard', name: 'Park Ranger', desc: 'Headlamp lasts longer. Steadier nerves.', mods: { battery: 1.5, stress: 0.85 }, kit: ['pipe', 'battery'] },
  { id: 'courier', name: 'Rock Climber', desc: '+8% move speed, +10 stamina.', mods: { speed: 1.08, stamina: 10 }, kit: ['water', 'chocolate'] },
  { id: 'labtech', name: 'Geologist', desc: 'Resists toxins & infection.', mods: { tox: 0.8, infect: 0.8 }, kit: ['antiseptic', 'filter'] },
  { id: 'miner', name: 'Spelunker', desc: 'Sees further in the dark.', mods: { sight: 1.15 }, kit: ['crowbar', 'glowstick'] },
  { id: 'soldier', name: 'Ex-Soldier', desc: 'Steadier aim. Starts armed.', mods: { aim: 0.75 }, kit: ['pistol', 'ammo9'] },
  { id: 'teacher', name: 'Schoolteacher', desc: 'Calm under pressure. Better barter.', mods: { stress: 0.75, barter: 0.85 }, kit: ['painkillers', 'chocolate'] },
  { id: 'mechanic', name: 'Mechanic', desc: 'Crafts with less scrap.', mods: { craft: 1 }, kit: ['scrap', 'tape', 'lockpick'] },
];
NE.TRAITS = [
  { id: 'thick', name: 'Thick-Skinned', good: true, desc: '-15% bleeding', mods: { bleed: 0.85 } },
  { id: 'stoic', name: 'Stoic', good: true, desc: '+12 pain threshold', mods: { painTol: 12 } },
  { id: 'nimble', name: 'Nimble', good: true, desc: '-30% fall damage', mods: { fall: 0.7 } },
  { id: 'irongut', name: 'Iron Gut', good: true, desc: '-40% food & water sickness', mods: { tox: 0.6 } },
  { id: 'nightowl', name: 'Night Owl', good: true, desc: '+10% light radius', mods: { sight: 1.1 } },
  { id: 'packrat', name: 'Packrat', good: true, desc: '+4kg carry', mods: { carry: 4 } },
  { id: 'hemo', name: 'Hemophiliac', good: false, desc: '+30% bleeding', mods: { bleed: 1.3 } },
  { id: 'smoker', name: 'Smoker', good: false, desc: '-15 stamina, weaker lungs', mods: { stamina: -15, lungs: 80 } },
  { id: 'glass', name: 'Brittle Bones', good: false, desc: '+40% fracture chance', mods: { fracture: 1.4 } },
  { id: 'nervous', name: 'Nervous', good: false, desc: '+30% stress', mods: { stress: 1.3 } },
  { id: 'bigeater', name: 'Big Eater', good: false, desc: '+30% hunger', mods: { hunger: 1.3 } },
  { id: 'clumsy', name: 'Clumsy', good: false, desc: '+40% fall damage, louder', mods: { fall: 1.4, noise: 1.2 } },
  { id: 'nearsight', name: 'Nearsighted', good: false, desc: '-12% light radius', mods: { sight: 0.88 } },
];

NE.ITEMS = {
  rag: { name: 'Dirty Rag', icon: 'rag', w: 0.1, stack: 5, cat: 'med', med: 'bandage', q: 0.45, dirty: 0.35, desc: 'Better than nothing. Barely. Can infect.' },
  cleanrag: { name: 'Sterilized Rag', icon: 'rag', col: '#e8e2d0', w: 0.1, stack: 5, cat: 'med', med: 'bandage', q: 0.65, desc: 'Soaked in alcohol. Decent dressing.' },
  bandage: { name: 'Bandage', icon: 'bandage', w: 0.1, stack: 5, cat: 'med', med: 'bandage', q: 1, desc: 'Clean gauze. Slows bleeding a lot.' },
  tourniquet: { name: 'Tourniquet', icon: 'tourniquet', w: 0.2, cat: 'med', med: 'tq', desc: 'Stops limb bleeding completely. Hurts. Don\'t leave it on.' },
  suture: { name: 'Suture Kit', icon: 'suture', w: 0.2, uses: 3, cat: 'med', med: 'suture', desc: 'Closes wounds on a body part. Agonizing without help.' },
  splint: { name: 'Splint', icon: 'splint', w: 0.4, cat: 'med', med: 'splint', desc: 'Immobilizes a fracture.' },
  forceps: { name: 'Forceps', icon: 'forceps', w: 0.1, uses: 5, cat: 'med', med: 'forceps', desc: 'Pulls lodged bullets & shrapnel.' },
  antiseptic: { name: 'Antiseptic', icon: 'antiseptic', w: 0.3, uses: 3, cat: 'med', med: 'clean', desc: 'Disinfects wounds on one body part.' },
  alcohol: { name: 'Moonshine', icon: 'alcohol', w: 0.4, uses: 3, cat: 'med', med: 'clean', desc: 'Disinfects (stings more). Crafting ingredient.' },
  painkillers: { name: 'Painkillers', icon: 'pills', col: '#e8e2d0', w: 0.1, uses: 4, cat: 'med', med: 'drug', drug: 'painkiller', desc: 'Dulls pain for two minutes.' },
  morphine: { name: 'Morphine', icon: 'syringe', col: '#b0b0ff', w: 0.1, cat: 'med', med: 'drug', drug: 'morphine', desc: 'Kills pain. Clouds the head.' },
  antibiotics: { name: 'Antibiotics', icon: 'pills', col: '#50b050', w: 0.1, uses: 3, cat: 'med', med: 'drug', drug: 'antibiotic', desc: 'Fights infection over time.' },
  antirad: { name: 'Anti-Rad', icon: 'pills', col: '#e0c050', w: 0.1, uses: 2, cat: 'med', med: 'drug', drug: 'antirad', desc: 'Flushes radiation.' },
  adrenaline: { name: 'Adrenaline', icon: 'syringe', col: '#e05040', w: 0.1, cat: 'med', med: 'drug', drug: 'adrenaline', desc: 'Jolts you awake. Stamina surge.' },
  bloodbag: { name: 'Blood Bag', icon: 'bloodbag', w: 0.5, cat: 'med', med: 'drug', drug: 'blood', desc: '+1000mL blood over two minutes.' },
  water: { name: 'Canteen', icon: 'water', col: '#6ad0e0', w: 0.5, cat: 'food', thirst: 40, desc: 'Clean, filtered water.' },
  dirtywater: { name: 'Cave Water', icon: 'water', col: '#8a7040', w: 0.5, cat: 'food', thirst: 30, tox: 28, desc: 'Could make you sick. Boil it at a fire.' },
  ration: { name: 'Canned Ration', icon: 'can', w: 0.4, cat: 'food', hunger: 40, desc: 'Beans, probably.' },
  chocolate: { name: 'Chocolate Bar', icon: 'chocolate', w: 0.1, cat: 'food', hunger: 15, stress: -12, desc: 'A small mercy.' },
  spoiled: { name: 'Death Cap', icon: 'can', col: '#6a8a40', w: 0.4, cat: 'food', hunger: 30, tox: 40, desc: 'Looks edible. Probably isn\'t.' },
  scrap: { name: 'Scrap Metal', icon: 'scrap', w: 0.4, stack: 10, cat: 'mat', value: 3, desc: 'Topside currency. Crafting.' },
  tape: { name: 'Duct Tape', icon: 'tape', w: 0.2, stack: 5, cat: 'mat', value: 2, desc: 'Holds the world together.' },
  cloth: { name: 'Cloth Scraps', icon: 'cloth', w: 0.1, stack: 10, cat: 'mat', desc: 'Two make a rag.' },
  pipe: { name: 'Rock Hammer', icon: 'pipe', w: 1.5, cat: 'weapon', melee: { dmg: 15, kind: 'blunt', reach: 15, stam: 9, cd: 0.6 } },
  knife: { name: 'Hunting Knife', icon: 'knife', w: 0.3, cat: 'weapon', melee: { dmg: 11, kind: 'sharp', reach: 11, stam: 5, cd: 0.38 } },
  shiv: { name: 'Flint Dagger', icon: 'shiv', w: 0.2, cat: 'weapon', melee: { dmg: 9, kind: 'sharp', reach: 10, stam: 4, cd: 0.34 } },
  crowbar: { name: 'Crowbar', icon: 'crowbar', w: 1.8, cat: 'weapon', tool: 'pry', melee: { dmg: 17, kind: 'blunt', reach: 15, stam: 10, cd: 0.65 }, desc: 'Also pries open locks.' },
  axe: { name: 'Ice Axe', icon: 'axe', w: 2.6, cat: 'weapon', twoHand: true, melee: { dmg: 28, kind: 'sharp', reach: 16, stam: 16, cd: 0.9 } },
  pistol: { name: '9mm Pistol', icon: 'pistol', w: 1.0, cat: 'weapon', gun: { dmg: 34, mag: 8, ammo: 'ammo9', spread: 0.05, jam: 0.04, cd: 0.28, range: 230 } },
  rifle: { name: 'Battle Rifle', icon: 'rifle', w: 3.6, cat: 'weapon', twoHand: true, gun: { dmg: 58, mag: 5, ammo: 'ammo762', spread: 0.025, jam: 0.03, cd: 0.55, range: 330 } },
  ammo9: { name: '9mm Rounds', icon: 'ammo', w: 0.01, stack: 60, cat: 'ammo', value: 1 },
  ammo762: { name: '7.62 Rounds', icon: 'ammo', col: '#c0a040', w: 0.02, stack: 40, cat: 'ammo', value: 2 },
  flare: { name: 'Road Flare', icon: 'flare', w: 0.3, stack: 4, cat: 'throw', throwable: 'flare', desc: 'Throw: 40s of red light.' },
  glowstick: { name: 'Glowcap', icon: 'glowstick', w: 0.05, stack: 6, cat: 'throw', throwable: 'glowstick', desc: 'A glowing mushroom. Throw it to light a spot for a long time.' },
  bottle: { name: 'Empty Bottle', icon: 'bottle', w: 0.3, stack: 3, cat: 'throw', throwable: 'bottle', desc: 'Throw it to make noise. Molotov base.' },
  brick: { name: 'Rock', icon: 'brick', w: 1.2, stack: 3, cat: 'throw', throwable: 'brick', desc: 'Heavy. Bonk. Plenty of these down here.' },
  molotov: { name: 'Molotov', icon: 'molotov', w: 0.5, stack: 3, cat: 'throw', throwable: 'molotov', desc: 'Bottled fire.' },
  battery: { name: 'Battery', icon: 'battery', w: 0.1, stack: 4, cat: 'tool', desc: 'Use to recharge your flashlight.' },
  lockpick: { name: 'Lockpick', icon: 'lockpick', w: 0.05, stack: 5, cat: 'tool', desc: 'Opens locks. Might snap.' },
  keycard: { name: 'Old Mine Key', icon: 'keycard', w: 0.02, cat: 'tool', desc: 'Opens one strongbox or iron lock.' },
  filter: { name: 'Respirator Filter', icon: 'filter', w: 0.3, stack: 3, cat: 'tool', desc: 'Feeds a respirator: 90s of spores or gas.' },
  respirator: { name: 'Respirator', icon: 'respirator', w: 0.6, cat: 'gear', slot: 'face', desc: 'Blocks toxic gas while a filter lasts.' },
  vest: { name: 'Leather Vest', icon: 'vest', w: 4, cat: 'gear', slot: 'body', armor: 0.35, dur: 100, desc: 'Absorbs torso damage.' },
  platevest: { name: 'Plate Carrier', icon: 'vest', col: '#3a4430', w: 6, cat: 'gear', slot: 'body', armor: 0.6, dur: 150, desc: 'Real armor.' },
  helmet: { name: 'Caving Helmet', icon: 'helmet', col: '#d0a020', w: 1, cat: 'gear', slot: 'head', armor: 0.3, dur: 60, desc: 'Some head protection.' },
  milhelmet: { name: 'Combat Helmet', icon: 'helmet', col: '#4a5040', w: 1.4, cat: 'gear', slot: 'head', armor: 0.55, dur: 100, desc: 'Stops a lot.' },
  mushroom: { name: 'Cave Mushroom', icon: 'mushroom', w: 0.1, stack: 5, cat: 'food', hunger: 18, desc: 'Foraged. Earthy and filling.' },
  herb: { name: 'Healing Herb', icon: 'herb', w: 0.05, stack: 5, cat: 'med', med: 'drug', drug: 'herb', desc: 'Chew it: dulls pain and fights infection a little.' },
  cactus: { name: 'Prickly Pear', icon: 'cactus', w: 0.3, stack: 4, cat: 'food', thirst: 25, hunger: 8, desc: 'Juicy. Mind the spines.' },
  trinket: { name: 'Lost Locket', icon: 'trinket', w: 0.05, stack: 10, cat: 'value', value: 12, desc: 'Someone loved this once. Worth scrap topside.' },
  datashard: { name: 'Crystal Shard', icon: 'datashard', w: 0.05, stack: 10, cat: 'value', value: 20, xp: 40, desc: 'Hums with stored light. Extract with it for big XP.' },
};
for (const k in NE.ITEMS) NE.ITEMS[k].id = k;

// Cave biomes. heat/cold/bleed/infect/thirst feed the anatomy sim; perk + challenge text shows on entry and in the journal.
NE.BIOMES = [
  { id: 'grotto', name: 'Mossy Grotto', from: 0, dark: 0.8, drone: 52, cold: 0, heat: 0, bleed: 1, infect: 1.2, thirst: 1,
    perk: 'Forage mushrooms & healing herbs. Glowshrooms light the way.', challenge: 'Damp: wounds infect faster. Spore puffs choke you.',
    pal: { bg: '#0d110c', back: '#1a2116', back2: '#212a1c', tile: '#4a4a36', tile2: '#3a3a2a', edge: '#6a7a4a', top: '#4f7a2e', plat: '#5a5038', ladder: '#9a7a48', lamp: '#ffc070' },
    enemies: [['feral', 3], ['scav', 4]], decor: ['vines', 'roots', 'moss', 'boulder', 'stalag', 'vines'] },
  { id: 'desert', name: 'Sunscorched Sandstone', from: 250, dark: 0.82, drone: 46, cold: 0, heat: 1, bleed: 1, infect: 0.7, thirst: 1.8,
    perk: 'Dry air: wounds rarely infect. Ancient ruins hold trinkets. Prickly pears quench thirst.', challenge: 'Heat: thirst drains almost twice as fast. Sand floors give way.',
    pal: { bg: '#140e08', back: '#2a1d12', back2: '#332416', tile: '#a87a48', tile2: '#8a6036', edge: '#d8a868', top: '#d8b070', plat: '#8a6a40', ladder: '#b08850', lamp: '#ffb050' },
    enemies: [['scav', 4], ['feral', 2], ['gunner', 1]], decor: ['ruin', 'pottery', 'bones', 'pillar', 'boulder', 'stalag'] },
  { id: 'ice', name: 'Frozen Hollows', from: 500, dark: 0.86, drone: 40, cold: 1.2, heat: 0, bleed: 0.75, infect: 0.8, thirst: 1,
    perk: 'Cold slows bleeding. Fresh water pools everywhere.', challenge: 'Freezing: hypothermia creeps in, ice is slippery, icicles fall.',
    pal: { bg: '#0a0e14', back: '#162030', back2: '#1c2a3c', tile: '#5a7088', tile2: '#4a5e74', edge: '#a8c8e0', top: '#e8f4ff', plat: '#6a7a8a', ladder: '#9aa8b0', lamp: '#a0e0ff' },
    enemies: [['feral', 3], ['scav', 3], ['gunner', 2]], decor: ['icicles', 'frozen', 'stalag', 'icicles', 'boulder'] },
  { id: 'crystal', name: 'Crystal Depths', from: 750, dark: 0.88, drone: 34, cold: 0.3, heat: 0, bleed: 1, infect: 1, thirst: 1,
    perk: 'Glowing crystals light the caves. Crystal Shards (XP) are common.', challenge: 'Crystal radiation sickens you. Shard floors cut. Expedition soldiers patrol.',
    pal: { bg: '#08070f', back: '#151226', back2: '#1c1830', tile: '#3e3a5a', tile2: '#2e2a48', edge: '#7a70b0', top: '#8a7ad0', plat: '#4a4468', ladder: '#8a8070', lamp: '#b0a0ff' },
    enemies: [['scav', 2], ['gunner', 3], ['specops', 3], ['feral', 2]], decor: ['cluster', 'geode', 'cluster', 'stalag', 'cluster'] },
  { id: 'magma', name: 'Magma Abyss', from: 1000, dark: 0.9, drone: 28, cold: 0, heat: 1.6, bleed: 1.1, infect: 0.8, thirst: 2.2,
    perk: 'Never cold. The richest caches lie here.', challenge: 'Scorching heat, lava pools and steam vents. Deadliest foes.',
    pal: { bg: '#100605', back: '#22100c', back2: '#2c1510', tile: '#3a2622', tile2: '#2a1a18', edge: '#7a4030', top: '#5a2a1e', plat: '#4a2a20', ladder: '#8a6a40', lamp: '#ff9050' },
    enemies: [['gunner', 3], ['specops', 4], ['scav', 2]], decor: ['obsidian', 'cracks', 'stalag', 'cracks', 'boulder'] },
];
NE.biomeAt = d => { let b = NE.BIOMES[0]; for (const x of NE.BIOMES) if (d >= x.from) b = x; return b; };

// Skill web. angle in degrees (0 = right, 90 = up). parent = track it hangs off.
NE.PERKS = [
  { id: 'movement', name: 'Movement', max: 6, icon: 'boot', ang: 172, col: '#7ad0ff', desc: '+4% move speed, -5% stamina cost per rank.' },
  { id: 'agility', name: 'Agility', max: 5, icon: 'bolt', ang: 196, col: '#7ad0ff', desc: '-10% fall damage, quieter steps, faster climbing per rank.' },
  { id: 'cardio', name: 'Cardio', max: 3, icon: 'lungs', ang: 218, col: '#7ad0ff', desc: '+12 max stamina, -12% gas damage per rank.' },
  { id: 'eyesight', name: 'Eyesight', max: 3, icon: 'eye', ang: 138, col: '#f0e080', desc: '+15% light radius & loot highlight range per rank.' },
  { id: 'tolerance', name: 'Tolerance', max: 5, icon: 'drop', ang: 72, col: '#ff7a7a', desc: '-10% toxins/radiation/infection, -6% bleeding per rank.' },
  { id: 'medicine', name: 'Field Medicine', max: 5, icon: 'heart', ang: 92, col: '#ff7a7a', desc: '-10% treatment time, better makeshift dressings per rank.' },
  { id: 'endurance', name: 'Endurance', max: 6, icon: 'shield', ang: 112, col: '#ff7a7a', desc: '+8 pain threshold, -8% fracture, -6% hunger/thirst/cold per rank.' },
  { id: 'strength', name: 'Strength', max: 7, icon: 'dumbbell', ang: 8, col: '#ffb060', desc: '+8% melee damage, +2.5kg carry per rank.' },
  { id: 'scavenger', name: 'Scavenger', max: 4, icon: 'pick', ang: -14, col: '#ffb060', desc: '-12% search time, wider loot sense per rank.' },
  { id: 'psychology', name: 'Psychology', max: 4, icon: 'mind', ang: -46, col: '#c890ff', desc: '-12% stress, steadier aim, better barter per rank.' },
  { id: 'coldblood', name: 'Cold Blood', max: 1, icon: 'skull', ang: -46, after: 'psychology', req: { psychology: 4, endurance: 3 }, col: '#ff4060', desc: 'CAPSTONE: no panic tremors, slower bleeding under stress, self-surgery never knocks you out. Needs Psychology 4 + Endurance 3.' },
];

NE.BACKPACKS = [
  { id: 'canvas', name: 'Worn Canvas Rucksack', slots: 12, carry: 18, col: ['#6b5a40', '#4a3e2c'], unlock: null, price: 0, desc: 'Patched and dependable.' },
  { id: 'paramedic', name: 'Paramedic Trauma Pack', slots: 14, carry: 20, col: ['#b03030', '#e8e2d0'], unlock: { type: 'triage', text: 'Search a Field Triage Tent' }, price: 120, desc: 'Medical items weigh half.' },
  { id: 'hazard', name: 'Spelunker\'s Hauling Rig', slots: 14, carry: 22, col: ['#d0b030', '#2a2a2a'], unlock: { type: 'depth', v: 250, text: 'Reach 250m' }, price: 150, desc: 'Sturdy yellow frame.' },
  { id: 'brass', name: 'Brass-Trimmed Expedition Pack', slots: 16, carry: 24, col: ['#5a4030', '#c09040'], unlock: { type: 'depth', v: 600, text: 'Reach 600m' }, price: 220, desc: 'Old money, old leather.' },
  { id: 'specops', name: 'Expedition Frame Pack', slots: 18, carry: 28, col: ['#3a4430', '#1a1e16'], unlock: { type: 'specops', text: 'Kill a Lost Expedition Soldier' }, price: 320, desc: 'Built for the long haul.' },
  { id: 'reactor', name: 'Crystal-Lined Duffel', slots: 20, carry: 26, col: ['#30304a', '#a0a0ff'], unlock: { type: 'extract', v: 1000, text: 'Extract from 1000m+' }, price: null, desc: 'Faintly warm. Don\'t ask.' },
];
NE.OUTFITS = [
  { id: 'rags', name: 'Civilian Rags', unlock: null, price: 0, random: true, desc: 'Whatever they had on.' },
  { id: 'overalls', name: 'Caving Coveralls', shirt: '#4a5a70', pants: '#3a4a60', price: 40, mods: { carry: 1 }, desc: '+1kg carry. Lots of pockets.' },
  { id: 'scrubs', name: 'Medic Fleece', shirt: '#3f8a80', pants: '#3f8a80', unlock: { type: 'depth', v: 250, text: 'Reach 250m' }, price: 90, mods: { treat: 0.9 }, desc: 'Treatment 10% faster.' },
  { id: 'hazmat', name: 'Sand Wraps', shirt: '#c8a868', pants: '#a88850', unlock: { type: 'depth', v: 350, text: 'Reach 350m (Sandstone)' }, price: 160, mods: { heat: 0.55, gas: 0.8 }, desc: 'Heat -45%, spores -20%.' },
  { id: 'thermal', name: 'Thermal Parka', shirt: '#1c2228', pants: '#1c2228', unlock: { type: 'depth', v: 500, text: 'Reach 500m (Frozen Hollows)' }, price: 180, mods: { cold: 0.5 }, desc: 'Cold & wet -50%.' },
  { id: 'reactor', name: 'Crystal-Weave Suit', shirt: '#6a5aa0', pants: '#4a4070', unlock: { type: 'extract', v: 1000, text: 'Extract from 1000m+' }, price: null, mods: { rad: 0.6 }, desc: 'Radiation -40%.' },
];
NE.SHOP_ITEMS = [['rag', 4], ['water', 6], ['battery', 6], ['flare', 8], ['lockpick', 10], ['bandage', 12], ['splint', 14], ['painkillers', 15], ['tourniquet', 16], ['respirator', 30]];

NE.RECIPES = [
  { id: 'tear', name: 'Tear Clothes into Rags', out: ['rag', 2], need: [], special: 'tear', desc: 'Shreds your outfit a little.' },
  { id: 'ragcloth', name: 'Rag from Scraps', out: ['rag', 1], need: [['cloth', 2]] },
  { id: 'cleanrag', name: 'Sterilize Rag', out: ['cleanrag', 1], need: [['rag', 1], ['alcohol', 1]] },
  { id: 'bandage', name: 'Improvised Bandage', out: ['bandage', 1], need: [['cleanrag', 2], ['tape', 1]] },
  { id: 'splint', name: 'Scrap Splint', out: ['splint', 1], need: [['scrap', 2], ['tape', 1]] },
  { id: 'splint2', name: 'Pipe Splint', out: ['splint', 1], need: [['pipe', 1], ['rag', 1]] },
  { id: 'tourniquet', name: 'Tourniquet', out: ['tourniquet', 1], need: [['rag', 2], ['scrap', 1]] },
  { id: 'shiv', name: 'Scrap Shiv', out: ['shiv', 1], need: [['scrap', 2], ['tape', 1]] },
  { id: 'molotov', name: 'Molotov', out: ['molotov', 1], need: [['bottle', 1], ['alcohol', 1], ['rag', 1]] },
  { id: 'lockpick', name: 'Lockpicks', out: ['lockpick', 2], need: [['scrap', 1]], station: 'workbench' },
  { id: 'vest', name: 'Scrap Vest', out: ['vest', 1], need: [['scrap', 5], ['tape', 2], ['cloth', 2]], station: 'workbench' },
  { id: 'boil', name: 'Boil Water', out: ['water', 1], need: [['dirtywater', 1]], station: 'fire' },
];

NE.LOOT = {
  common: [['mushroom', 3], ['herb', 2], ['rag', 10], ['cloth', 7], ['scrap', 9], ['tape', 5], ['water', 4], ['dirtywater', 6], ['ration', 4], ['chocolate', 4], ['spoiled', 3], ['alcohol', 3], ['bottle', 3], ['battery', 4], ['trinket', 3], ['flare', 2], ['glowstick', 2]],
  med: [['bandage', 8], ['rag', 4], ['antiseptic', 5], ['painkillers', 5], ['suture', 3], ['splint', 3], ['tourniquet', 3], ['forceps', 2], ['antibiotics', 2, 200], ['morphine', 1.5, 200], ['bloodbag', 1, 450], ['adrenaline', 1, 350], ['antirad', 2, 850]],
  weapon: [['pipe', 4], ['knife', 4], ['crowbar', 3], ['axe', 2, 150], ['pistol', 2, 100], ['ammo9', 6], ['rifle', 1, 650], ['ammo762', 2.5, 650], ['vest', 1.5], ['platevest', 0.8, 800], ['helmet', 1.5], ['milhelmet', 0.8, 700], ['lockpick', 3], ['keycard', 1, 250], ['respirator', 1, 200], ['filter', 2, 200]],
  rare: [['datashard', 3, 300], ['herb', 2], ['trinket', 4], ['keycard', 1.5], ['morphine', 1.5], ['bloodbag', 1], ['pistol', 1], ['ammo9', 3], ['adrenaline', 1]],
};
NE.CONTAINERS = {
  crate: { name: 'Supply Crate', search: 1.4, tables: [['common', 1]], n: [1, 3], col: '#7a5a36', sound: 'wood' },
  locker: { name: 'Rusted Mining Locker', search: 2.0, tables: [['common', 2], ['weapon', 1]], n: [1, 3], lock: 0.25, col: '#5a6066', sound: 'metal' },
  duffel: { name: 'Expedition Med Bag', search: 1.6, tables: [['med', 1]], n: [1, 3], col: '#a83030', sound: 'cloth' },
  cabinet: { name: 'First-Aid Box', search: 1.5, tables: [['med', 1]], n: [2, 4], col: '#e0dcd0', sound: 'metal' },
  weaponchest: { name: 'Miners\' Strongbox', search: 2.4, tables: [['weapon', 1]], n: [2, 4], lock: 1, col: '#3a4430', sound: 'metal' },
  urn: { name: 'Ancient Urn', search: 1.2, tables: [['common', 1], ['rare', 1.2]], n: [1, 2], col: '#9a6a3a', sound: 'wood' },
  stash: { name: 'Hidden Cache', search: 1.8, tables: [['rare', 1], ['med', 1]], n: [2, 3], col: '#5a4a2a', sound: 'cloth' },
  pod: { name: 'Lowered Supply Pod', search: 2.2, tables: [['med', 3], ['rare', 1]], n: [4, 6], col: '#d0d0d8', sound: 'metal' },
  corpse: { name: 'Body', search: 1.5, tables: [], n: [0, 0], sound: 'cloth' },
  bag: { name: 'Dropped Bag', search: 0.8, tables: [], n: [0, 0], col: '#4a3e2c', sound: 'cloth' },
};

NE.ENEMIES = {
  feral: { name: 'Cave-Mad Wretch', faction: 'infected', speed: 52, hpMul: 0.75, weapon: null, dmg: 9, kind: 'bite', reach: 10, cd: 0.9, sight: 95, skin: '#8a9a80', shirt: '#4a4038', pants: '#3a342e', loot: [['rag', 2], ['spoiled', 1], ['trinket', 1]] },
  scav: { name: 'Cave Raider', faction: 'scav', speed: 40, hpMul: 1, weapon: ['pipe', 'knife', 'crowbar', 'shiv'], sight: 120, shirt: '#5a4a3a', pants: '#3a3a3a', loot: [['rag', 2], ['scrap', 2], ['water', 1], ['bandage', 1], ['ammo9', 1], ['ration', 1]] },
  gunner: { name: 'Armed Raider', faction: 'scav', speed: 36, hpMul: 1, weapon: ['pistol'], sight: 150, shirt: '#3a4a3a', pants: '#2a2a2a', loot: [['ammo9', 3], ['bandage', 1], ['painkillers', 1], ['scrap', 1]], gear: [['helmet', 0.3], ['vest', 0.3]] },
  specops: { name: 'Lost Expedition Soldier', faction: 'remnant', speed: 40, hpMul: 1.25, weapon: ['rifle'], sight: 180, shirt: '#2a3024', pants: '#22281e', loot: [['ammo762', 3], ['bandage', 2], ['morphine', 1], ['datashard', 1]], gear: [['milhelmet', 0.8], ['platevest', 0.7]] },
};

NE.MONO = {
  start: ['Okay. Deep breath.', 'Rope\'s tied. Down we go.', 'I can do this.', 'Just a little deeper...'],
  bleed: ['I need to stop the bleeding...', 'I\'m bleeding. I\'m bleeding.', 'That\'s... a lot of blood.'],
  artery: ['Oh god, it\'s pumping out—', 'Tourniquet. I need a tourniquet. NOW.'],
  fracture: ['Something snapped—', 'My bone... oh god, my bone.', 'I can\'t put weight on it.'],
  lowblood: ['I\'m so cold...', 'Everything\'s going grey...', 'Stay awake. Stay awake.'],
  pain: ['Make it stop...', 'AAGH—', 'Breathe through it...'],
  dark: ['Too dark. Can\'t see a thing.', 'Something\'s moving out there.', 'The walls are closing in...'],
  heat: ['So hot... I need water.', 'The air is burning my throat.'],
  biome: ['It changes down here...', 'I\'ve never seen anything like this.'],
  kill: ['...I had no choice.', 'Stay down.', 'Oh god... they\'re dead.'],
  hungry: ['When did I last eat?'], thirsty: ['My throat is sand.'],
  gas: ['Can\'t— breathe—', 'Spores... in my lungs...'],
  cold: ['C-can\'t stop sh-shaking...'],
  treat: ['That\'ll hold. For now.', 'Better. A little.'],
  medic: ['A medic station. Thank god.'],
  spotted: ['They saw me.', 'Oh no. No no no.'],
  wake: ['...where... how long was I out?'],
  infection: ['It\'s hot... the wound is hot.'],
  rad: ['Metal taste in my mouth...'],
};
})(window.NE);
