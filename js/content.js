// Nectar's End — 0.7 content: prosthetics, regional armour, packs & outfits, themed containers, new deep biomes, new mobs + variants,
// new Vespa gifts with a tiered random order, flowing liquids, medical tents & locker sheds, modular wardrobe.
(function (NE) {
'use strict';
const { ri, rf, pick, chance, clamp, lerp } = NE; const T = NE.T; const G = NE.G;

// ======================================================================= ICONS
Object.assign(NE.ICONS, {
  peg: ['......bB', '.....bB.', '....bB..', '...BB...', '...kk...', '...BB...', '...BB...', '...bb...'],
  parm: ['.gg.....', 'gwgg....', '.ggdg...', '..gdgg..', '...ggdg.', '....gwgg', '.....g.g', '.....g..'],
  pleg: ['..ggg...', '..gwg...', '..gdg...', '..ggg...', '...gw...', '...gg...', '...gg...', '.kkggg..'],
  saw: ['........', 'bbb.....', 'bBbgggg.', 'bbbwwwwg', '...gkgkg', '....k.k.', '........', '........'],
  hood: ['..XXXX..', '.XXXXXX.', 'XXkkkkXX', 'XkwkwkkX', 'XkkkkkkX', '.XXkkXX.', '..XXXX..', '........'],
  plate: ['.XX..XX.', 'XXXXXXXX', 'XwXXXXwX', 'XXXXXXXX', '.XXXXXX.', '.XXwwXX.', '.XXXXXX.', '..X..X..'],
  divehelm: ['..yyyy..', '.yyyyyy.', 'yykkkkyy', 'yklllkyy', 'ykllkkyy', 'yykkkkyy', '.yyyyyy.', '..y..y..'],
});

// ======================================================================= ITEMS
const IT = NE.ITEMS;
NE.SAW_DMG = { saw_arm_w: 16, saw_arm_a: 20, saw_arm_p: 25 };
// prosthetics: strap onto a stump in the Anatomy tab. Most give 55-80% of a real limb; artificer work beats flesh.
const PROS = [
  ['peg_leg_w', 'Worn Peg Leg', 'peg', 'leg', 0.55, '#6a4a2a', 'Split oak, wrapped in tape. Better than crawling.'],
  ['peg_leg_a', 'Peg Leg', 'peg', 'leg', 0.65, '#7a5a36', 'A solid ash peg with a leather cup.'],
  ['peg_leg_p', 'Pristine Peg Leg', 'peg', 'leg', 0.72, '#9a7044', 'Lathe-turned hardwood, padded socket, rubber foot.'],
  ['peg_arm_w', 'Worn Hook Arm', 'peg', 'arm', 0.5, '#6a4a2a', 'A bent hook on a wooden cuff.'],
  ['peg_arm_a', 'Hook Arm', 'peg', 'arm', 0.6, '#7a5a36', 'A sturdy steel hook on a fitted cuff.'],
  ['peg_arm_p', 'Pristine Hook Arm', 'peg', 'arm', 0.68, '#9a7044', 'Polished hook, harness straps, a grip that holds.'],
  ['metal_arm_w', 'Worn Scrap-Metal Arm', 'metal', 'arm', 0.65, '#6a7078', 'Pipes, bolts and a cable-pulled claw.'],
  ['metal_arm_a', 'Scrap-Metal Arm', 'metal', 'arm', 0.74, '#8a9098', 'Riveted plates and a three-finger grip.'],
  ['metal_arm_p', 'Pristine Mechanical Arm', 'metal', 'arm', 0.8, '#a8b0b8', 'Expedition-issue. Spring-loaded fingers, steel bones.'],
  ['metal_leg_a', 'Scrap-Metal Leg', 'metal', 'leg', 0.72, '#8a9098', 'A pipe-frame leg with a hinged knee.'],
  ['saw_arm_w', 'Worn Saw-Blade Arm', 'saw', 'arm', 0.55, '#7a7a7a', 'A rusted circular blade on a crank-driven stump socket. Unarmed, you fight with the saw.'],
  ['saw_arm_a', 'Saw-Blade Arm', 'saw', 'arm', 0.62, '#9a9ea4', 'A motor-sprung saw that whines when you swing. Unarmed, you fight with the saw.'],
  ['saw_arm_p', 'Pristine Saw-Blade Arm', 'saw', 'arm', 0.7, '#c0c6cc', 'Toothed steel spinning on a sealed bearing. Unarmed, it tears through flesh and bone.'],
  ['art_arm', 'Artificer Arm', 'art', 'arm', 1.08, '#c8a040', 'Brass and amber, humming faintly. Stronger than the arm you lost.'],
  ['art_leg', 'Artificer Leg', 'art', 'leg', 1.08, '#c8a040', 'Brass and amber, warm to the touch. Runs better than flesh ever did.'],
];
for (const [id, name, kind, slot, eff, col, desc] of PROS) {
  IT[id] = { name, icon: kind === 'saw' ? 'saw' : kind === 'peg' ? (slot === 'leg' ? 'peg' : 'parm') : slot === 'leg' ? 'pleg' : 'parm', col, w: kind === 'peg' ? 1.2 : kind === 'metal' || kind === 'saw' ? 2.4 : 1.6, cat: 'tool', prost: { kind, slot, eff }, value: kind === 'art' ? 260 : kind === 'saw' ? 120 : Math.round(eff * 70), desc: desc + ' Fits a ' + slot + ' stump: ' + Math.round(eff * 100) + '% function' + (kind === 'saw' ? ', ' + NE.SAW_DMG[id] + ' sharp damage unarmed.' : '.') };
  NE.ISIZE[id] = slot === 'leg' ? [1, 3] : [1, 2];
}
IT.grapple = { name: 'Grappling Hook', icon: 'parm', col: '#8a8e94', w: 1.4, cat: 'tool', value: 60, desc: 'Press [Z] to fire it at the rock above you and haul yourself up. Press again or jump to let go.' }; NE.ISIZE.grapple = [2, 2];
IT.saw = { name: 'Bone Saw', icon: 'saw', col: '#a0a0a0', w: 0.7, cat: 'tool', value: 30, desc: 'A surgeon\'s saw. The cleanest way to take a limb off (Anatomy → Procedures).' }; NE.ISIZE.saw = [2, 1];

// 30 armour pieces, themed by region. warm/cool cut cold/heat, radRes/gasF cut radiation/gas, fallRes cuts fall damage.
const ARM = [
  ['mosscap', 'Moss-Padded Cap', 'Mosshide', 'head', '#4a6a30', 0.5, 0.22, { bite: 0.4, sharp: 0.25, blunt: 0.2 }, 1, 50, {}, 'Grotto moss stitched over leather. Muffles bites.'],
  ['mosscoat', 'Mosshide Coat', 'Mosshide', 'body', '#4a6a30', 2.5, 0.3, { bite: 0.5, sharp: 0.3, blunt: 0.2, bullet: 0.05 }, 1, 90, { warm: 0.2 }, 'Mosshide set. Light, quiet, warm.'],
  ['spelhelm', 'Spelunker\'s Lamp Helm', 'Spelunker', 'head', '#e0b020', 1.1, 0.35, { blunt: 0.45, sharp: 0.3, bullet: 0.1 }, 1, 70, { fallRes: 0.1 }, 'Hard shell, chin strap. Falling rocks bounce off.'],
  ['spelharn', 'Caver\'s Padded Harness', 'Spelunker', 'body', '#c08a20', 3, 0.35, { blunt: 0.4, sharp: 0.3, bite: 0.3 }, 0.99, 100, { fallRes: 0.2 }, 'Spelunker set. Padding takes the sting out of falls (-20%).'],
  ['nomadwrap', 'Nomad Head-Wrap', 'Nomad', 'head', '#c8a868', 0.3, 0.15, { sharp: 0.2, bite: 0.2 }, 1, 40, { cool: 0.3 }, 'Keeps the sandstone heat off your skull.'],
  ['nomadrobe', 'Nomad Duster', 'Nomad', 'body', '#b08850', 2, 0.25, { sharp: 0.3, bite: 0.3, blunt: 0.15, burn: 0.3 }, 1, 80, { cool: 0.35 }, 'Nomad set. Layered cloth that breathes. Heat -35%.'],
  ['bronzehelm', 'Ruin-Guard Bronze Helm', 'Ruin-Guard', 'head', '#b08040', 1.8, 0.5, { blunt: 0.5, sharp: 0.6, bullet: 0.2 }, 0.98, 110, {}, 'Pulled from a buried guardhouse. Green with age, still hard.'],
  ['bronzecuir', 'Ruin-Guard Cuirass', 'Ruin-Guard', 'body', '#b08040', 7, 0.55, { blunt: 0.45, sharp: 0.6, bite: 0.55, bullet: 0.25 }, 0.9, 150, {}, 'Ruin-Guard set. Ancient bronze. Heavy.'],
  ['furhood', 'Furclad Hood', 'Furclad', 'head', '#d8d0c0', 0.6, 0.2, { bite: 0.35, blunt: 0.2 }, 1, 50, { warm: 0.3 }, 'Thick white fur. Ears stay attached.'],
  ['furparka', 'Furclad Armoured Parka', 'Furclad', 'body', '#d8d0c0', 3.5, 0.35, { bite: 0.45, sharp: 0.3, blunt: 0.3 }, 0.97, 100, { warm: 0.45 }, 'Furclad set. Hide plates under fur. Cold -45%.'],
  ['icehelm', 'Ice-Cutter Helm', 'Ice-Cutter', 'head', '#7a98b0', 1.5, 0.45, { blunt: 0.5, sharp: 0.45, bullet: 0.25 }, 0.99, 100, { warm: 0.1 }, 'Lined steel. Built for the Hollows\' miners.'],
  ['icemail', 'Rime-Quilted Gambeson', 'Ice-Cutter', 'body', '#7a98b0', 4, 0.4, { blunt: 0.45, sharp: 0.4, bite: 0.4, bullet: 0.15 }, 0.97, 120, { warm: 0.25 }, 'Ice-Cutter set. Quilted layers stop a lot.'],
  ['shardhelm', 'Shardplate Helm', 'Shardplate', 'head', '#8a7ad0', 2, 0.55, { sharp: 0.7, blunt: 0.45, bullet: 0.35 }, 0.98, 130, { radRes: 0.1 }, 'Crystal plates grown onto a steel frame.'],
  ['shardplate', 'Shardplate Armour', 'Shardplate', 'body', '#8a7ad0', 8, 0.6, { sharp: 0.7, bite: 0.7, blunt: 0.45, bullet: 0.4 }, 0.86, 170, { radRes: 0.15 }, 'Shardplate set. Blades skid off it.'],
  ['prismvisor', 'Prism Visor', 'Prism', 'head', '#b0e0ff', 0.9, 0.3, { bullet: 0.3, blunt: 0.3, burn: 0.3 }, 1, 80, { radRes: 0.3 }, 'Refracts the crystal glare — and its radiation.'],
  ['prismweave', 'Prism-Weave Vest', 'Prism', 'body', '#b0e0ff', 3, 0.4, { bullet: 0.5, sharp: 0.35, burn: 0.4 }, 0.98, 110, { radRes: 0.35 }, 'Prism set. Radiation -35%. Surprisingly bullet-proof.'],
  ['obsidhelm', 'Obsidian Helm', 'Obsidian', 'head', '#2a2228', 2.2, 0.6, { sharp: 0.65, blunt: 0.55, bullet: 0.45, burn: 0.4 }, 0.97, 150, {}, 'Volcanic glass knapped into a war helm.'],
  ['obsidplate', 'Obsidian Plate', 'Obsidian', 'body', '#2a2228', 9.5, 0.65, { sharp: 0.7, blunt: 0.6, bite: 0.65, bullet: 0.5, burn: 0.5 }, 0.82, 200, {}, 'Obsidian set. Near-impervious and brutally heavy.'],
  ['firemask', 'Firewalker Mask', 'Firewalker', 'head', '#a03a20', 0.8, 0.25, { burn: 0.7, blunt: 0.2 }, 1, 70, { cool: 0.4, gasF: 0.3 }, 'Asbestos and brass. Breathes through the smoke.'],
  ['firecoat', 'Firewalker Coat', 'Firewalker', 'body', '#a03a20', 3, 0.3, { burn: 0.75, sharp: 0.25, bite: 0.3 }, 0.98, 100, { cool: 0.5 }, 'Firewalker set. Heat -50%, burns barely touch you.'],
  ['chitinhelm', 'Chitin Crown', 'Chitin', 'head', '#8a5a20', 1, 0.55, { bite: 0.7, sharp: 0.6, blunt: 0.4, bullet: 0.3 }, 1, 120, {}, 'Carved from a hive warden\'s skull-plate.'],
  ['chitinplate', 'Chitin Carapace', 'Chitin', 'body', '#8a5a20', 5, 0.6, { bite: 0.75, sharp: 0.6, blunt: 0.45, bullet: 0.4 }, 0.95, 160, {}, 'Chitin set. Strong as steel at half the weight.'],
  ['divehelm', 'Brass Diving Helmet', 'Diver', 'head', '#c09040', 3, 0.6, { blunt: 0.6, sharp: 0.55, bullet: 0.45 }, 0.96, 140, { gasF: 0.85 }, 'Sealed brass bowl. Gas can\'t reach you (-85%).'],
  ['divesuit', 'Drowned Diver\'s Suit', 'Diver', 'body', '#3a5050', 4, 0.35, { bite: 0.45, sharp: 0.3, blunt: 0.25 }, 0.96, 110, { warm: 0.3 }, 'Diver set. Rubberised canvas. Keeps the cold water out.'],
  ['skullhelm', 'Ossuary Skull Helm', 'Ossuary', 'head', '#e0d8c0', 1.2, 0.45, { blunt: 0.4, sharp: 0.5, bite: 0.5 }, 1, 90, {}, 'Someone\'s skull, reinforced. Enemies hesitate.'],
  ['bonemail', 'Bone-Lattice Mail', 'Ossuary', 'body', '#e0d8c0', 4, 0.5, { sharp: 0.55, bite: 0.6, blunt: 0.3, bullet: 0.25 }, 0.95, 130, {}, 'Ossuary set. Rattles. Holds.'],
  ['weldmask', 'Welder\'s Mask', 'Workshop', 'head', '#3a3e44', 1.3, 0.3, { burn: 0.6, blunt: 0.3, sharp: 0.3 }, 1, 80, {}, 'Dark glass and a steel shell.'],
  ['policevest', 'Police Vest', 'Workshop', 'body', '#1c2430', 3.2, 0.45, { bullet: 0.55, sharp: 0.3, blunt: 0.2 }, 0.98, 120, {}, 'Soft armour from a world that had police.'],
  ['chainmail', 'Riveted Chainmail', 'Workshop', 'body', '#8a8e94', 6, 0.45, { sharp: 0.75, bite: 0.7, blunt: 0.1, bullet: 0.1 }, 0.93, 140, {}, 'Hand-riveted rings. Laughs at knives, not at hammers.'],
  ['beehood', 'Beekeeper\'s Veil', 'Workshop', 'head', '#e8e0c0', 0.4, 0.12, { bite: 0.55 }, 1, 40, { gasF: 0.2 }, 'Mesh veil. The Vespa finds it funny.'],
];
NE.ARMOR2 = [];
for (const [id, name, set, slot, col, w, armor, res, spd, dur, ex, desc] of ARM) {
  IT[id] = Object.assign({ name, set, icon: slot === 'head' ? (id === 'divehelm' ? 'divehelm' : id.includes('hood') || id.includes('wrap') || id.includes('veil') ? 'hood' : 'helmet') : (w >= 6 ? 'plate' : 'vest'), col, w, cat: 'gear', slot, armor, res, spd, dur, desc, value: Math.round(20 + armor * 120) }, ex);
  NE.ISIZE[id] = slot === 'head' ? [2, 2] : [3, 3]; NE.ARMOR2.push(id);
}

// 10 utility pieces in four new slots (hands, feet, belt, charm). gmods multiply your stats while worn.
const UTIL = [
  ['hikeboots', 'Hiking Boots', 'feet', 'boot', '#6a4a2a', 1.2, { parkour: 1.6, fall: 0.85 }, { grip: 1 }, 'Grippy lugged soles: hold toward a wall in mid-air to cling to it, wall-climb 60% longer, -15% fall damage.'],
  ['runshoes', 'Running Shoes', 'feet', 'boot', '#d04030', 0.6, { runSpeed: 1.12, runCost: 0.8 }, {}, 'Sprint 12% faster for 20% less stamina.'],
  ['climbgloves', 'Climbing Gloves', 'hands', 'fist', '#8a6a3a', 0.3, { climb: 1.4, pick: 1.2 }, {}, 'Climb 40% faster. Nimble fingers: locks pick 20% faster.'],
  ['knucklegloves', 'Weighted Knuckle Gloves', 'hands', 'fist', '#3a3a3a', 0.6, { melee: 1.12, swing: 1.08 }, {}, 'Lead sewn into the knuckles: melee damage +12%, swings 8% faster.'],
  ['canteen', 'Insulated Canteen Belt', 'belt', 'water', '#4a6a5a', 0.8, { thirst: 0.6 }, {}, 'Sips on the move: thirst drains 40% slower.'],
  ['larder', 'Larder Belt-Pouch', 'belt', 'can', '#8a6a3a', 0.8, { hunger: 0.6 }, {}, 'Jerky, nuts, sugar cubes: hunger drains 40% slower.'],
  ['harness', 'Load-Bearing Harness', 'belt', 'backpack', '#3a4430', 1.2, { carry: 1.25 }, {}, 'Spreads the weight: +25% carry capacity.'],
  ['armband', 'Medic\'s Armband', 'charm', 'bandage', '#e8e2d0', 0.1, { treat: 0.8, medEff: 1.1 }, {}, 'Steady hands: treatments 20% faster and 10% stronger.'],
  ['nightgoggles', 'Night-Eye Goggles', 'charm', 'eye', '#5aa060', 0.5, { lamp: 1.4, battery: 1.3 }, {}, 'Amplified sight: lantern reach +40%, oil lasts 30% longer.'],
  ['rabbitfoot', 'Lucky Rabbit\'s Foot', 'charm', 'trinket', '#d8c8a8', 0.1, { loot: 1.25, search: 0.85 }, {}, 'You find more (+25% loot) and find it faster (-15% search time).'],
];
NE.UTIL = [];
for (const [id, name, slot, icon, col, w, gmods, ex, desc] of UTIL) { IT[id] = Object.assign({ name, icon, col, w, cat: 'gear', slot, gmods, desc, value: 45 }, ex); NE.ISIZE[id] = slot === 'feet' || slot === 'belt' ? [2, 1] : [1, 1]; NE.UTIL.push(id); }
NE.LOOT.weapon.push(['runshoes', 0.5], ['knucklegloves', 0.5]); NE.LOOT.common.push(['canteen', 0.25], ['larder', 0.25], ['rabbitfoot', 0.15]);
NE.SHOP_ITEMS.push(['hikeboots', 45], ['climbgloves', 35], ['canteen', 40]);

// ======================================================================= BACKPACKS & OUTFITS (+10 each)
NE.BACKPACKS.push(
  { id: 'satchel', name: 'Courier Satchel', slots: 12, carry: 16, col: ['#5a3a24', '#c0a060'], price: 60, mods: { speed: 1.03 }, unlock: { type: 'kills', v: 5, text: 'Kill 5 enemies in one run' }, desc: 'Small and snug: move 3% faster.' },
  { id: 'miner', name: 'Miner\'s Ore Pack', slots: 14, carry: 30, col: ['#4a4038', '#a07a40'], price: 180, unlock: { type: 'depth', v: 400, text: 'Reach 400m' }, desc: 'Steel frame built for rock. Huge carry weight.' },
  { id: 'hunter', name: 'Hunter\'s Game Bag', slots: 16, carry: 20, col: ['#4a5a2a', '#2a3018'], price: 160, mods: { noise: 0.9 }, unlock: { type: 'kills', v: 15, text: 'Kill 15 enemies in one run' }, desc: 'Waxed canvas: 10% quieter.' },
  { id: 'medic2', name: 'Field Surgeon\'s Case', slots: 14, carry: 18, col: ['#e8e2d0', '#b03030'], price: 200, medHalf: true, mods: { treat: 0.85 }, unlock: { type: 'medtent', text: 'Search a Medical Tent cabinet' }, desc: 'Medical items weigh half. Treatment 15% faster.' },
  { id: 'frost', name: 'Frost-Lined Rucksack', slots: 16, carry: 22, col: ['#c8d8e8', '#5a7088'], price: 220, mods: { cold: 0.85 }, unlock: { type: 'depth', v: 550, text: 'Reach 550m' }, desc: 'Insulated: cold -15%.' },
  { id: 'smuggler', name: 'Smuggler\'s Double-Bag', slots: 20, carry: 20, col: ['#2a2a2a', '#5a2a2a'], price: 300, unlock: { type: 'kills', v: 30, text: 'Kill 30 enemies in one run' }, desc: 'Hidden compartments everywhere.' },
  { id: 'honeycomb', name: 'Honeycomb Carrier', slots: 20, carry: 30, col: ['#c08a20', '#ffd060'], price: 420, unlock: { type: 'depth', v: 1300, text: 'Reach 1300m (Hive Warrens)' }, desc: 'Woven wax cells. Light and roomy.' },
  { id: 'diver', name: 'Drowned Diver\'s Pack', slots: 22, carry: 28, col: ['#2a4a4a', '#c09040'], price: 480, unlock: { type: 'depth', v: 1600, text: 'Reach 1600m (Drowned Abyss)' }, desc: 'Sealed and buoyant.' },
  { id: 'reliquary', name: 'Bone Reliquary', slots: 24, carry: 30, col: ['#e0d8c0', '#5a4a3a'], price: 560, unlock: { type: 'depth', v: 1900, text: 'Reach 1900m (Ossuary)' }, desc: 'A box of carved bone. Unsettlingly spacious.' },
  { id: 'vespa', name: 'Brood-Sac Pack', slots: 26, carry: 34, col: ['#8a2a5a', '#ffd23a'], price: 700, unlock: { type: 'gifts', v: 4, text: 'Awaken 4 Vespa gifts in one run' }, desc: 'It\'s alive. It holds a lot.' },
);
NE.OUTFITS.push(
  { id: 'miner', name: 'Miner\'s Overalls', shirt: '#6a5030', pants: '#3a3a40', price: 70, mods: { carry: 2 }, unlock: { type: 'depth', v: 150, text: 'Reach 150m' }, desc: '+2kg carry.' },
  { id: 'scout', name: 'Scout Fatigues', shirt: '#4a5a3a', pants: '#3a4a2a', price: 140, mods: { noise: 0.85 }, unlock: { type: 'kills', v: 10, text: 'Kill 10 enemies in one run' }, desc: 'Noise -15%.' },
  { id: 'runner', name: 'Runner\'s Kit', shirt: '#a03a2a', pants: '#2a2a2a', price: 160, mods: { runCost: 0.85 }, unlock: { type: 'depth', v: 300, text: 'Reach 300m' }, desc: 'Sprinting costs 15% less stamina.' },
  { id: 'surgeon', name: 'Surgeon\'s Scrubs', shirt: '#5a7ac0', pants: '#5a7ac0', price: 200, mods: { medEff: 1.15, treat: 0.9 }, unlock: { type: 'medtent', text: 'Search a Medical Tent cabinet' }, desc: 'Treatments 15% stronger, 10% faster.' },
  { id: 'brawler', name: 'Pit-Fighter Wraps', shirt: '#7a3a2a', pants: '#3a2a20', price: 220, mods: { melee: 1.08 }, unlock: { type: 'kills', v: 25, text: 'Kill 25 enemies in one run' }, desc: 'Melee damage +8%.' },
  { id: 'smith', name: 'Smith\'s Apron', shirt: '#4a3a2a', pants: '#2a2420', price: 200, mods: { heat: 0.7 }, unlock: { type: 'depth', v: 1000, text: 'Reach 1000m (Magma Abyss)' }, desc: 'Leather apron. Heat -30%.' },
  { id: 'monk', name: 'Hollow Monk Robes', shirt: '#6a5a40', pants: '#6a5a40', price: 260, mods: { stress: 0.75 }, unlock: { type: 'depth', v: 750, text: 'Reach 750m' }, desc: 'Stress builds 25% slower.' },
  { id: 'beekeeper', name: 'Beekeeper\'s Suit', shirt: '#e8e2c8', pants: '#e8e2c8', price: 360, mods: { infect: 0.75, tox: 0.8 }, unlock: { type: 'depth', v: 1300, text: 'Reach 1300m (Hive Warrens)' }, desc: 'Infection -25%, toxins -20%.' },
  { id: 'drowned', name: 'Drowned Wetsuit', shirt: '#203838', pants: '#203838', price: 420, mods: { cold: 0.6, lungs: 120 }, unlock: { type: 'depth', v: 1600, text: 'Reach 1600m (Drowned Abyss)' }, desc: 'Cold -40%, stronger lungs.' },
  { id: 'royal', name: 'Royal Hive Regalia', shirt: '#6a2a5a', pants: '#3a1a30', price: 650, mods: { hpMul: 1.08, stamina: 10 }, unlock: { type: 'gifts', v: 5, text: 'Awaken 5 Vespa gifts in one run' }, desc: '+8% health, +10 stamina.' },
);

// ======================================================================= LOOT TABLES & THEMED CONTAINERS
const L = NE.LOOT;
L.medcab = [['armband', 0.6], ['bandage', 8], ['suture', 4], ['splint', 4], ['tourniquet', 4], ['forceps', 3], ['antiseptic', 5], ['antibiotics', 3], ['morphine', 2, 150], ['bloodbag', 1.5, 300], ['saw', 1.5],
  ['peg_leg_w', 1.4], ['peg_arm_w', 1.4], ['peg_leg_a', 0.8, 150], ['peg_arm_a', 0.8, 150], ['metal_arm_w', 0.7, 250], ['metal_arm_a', 0.45, 450], ['metal_leg_a', 0.4, 450], ['peg_leg_p', 0.35, 500], ['peg_arm_p', 0.35, 500], ['metal_arm_p', 0.22, 750], ['art_arm', 0.05, 1000], ['art_leg', 0.05, 1000], ['saw_arm_w', 0.4, 300], ['saw_arm_a', 0.25, 600], ['saw_arm_p', 0.1, 900]];
L.armor = [['mosscap', 2], ['mosscoat', 1.5], ['spelhelm', 2], ['spelharn', 1.4], ['weldmask', 1.5], ['policevest', 1.2], ['chainmail', 0.8, 200], ['beehood', 1], ['leathercap', 1.5], ['vest', 1.2], ['helmet', 2],
  ['nomadwrap', 1.5, 250], ['nomadrobe', 1.2, 250], ['bronzehelm', 0.7, 300], ['bronzecuir', 0.5, 300], ['furhood', 1.5, 500], ['furparka', 1.2, 500], ['icehelm', 0.8, 500], ['icemail', 0.7, 500],
  ['prismvisor', 1, 750], ['prismweave', 0.8, 750], ['shardhelm', 0.6, 750], ['shardplate', 0.4, 750], ['firemask', 1, 1000], ['firecoat', 0.9, 1000], ['obsidhelm', 0.5, 1000], ['obsidplate', 0.35, 1000],
  ['chitinhelm', 0.7, 1300], ['chitinplate', 0.5, 1300], ['divehelm', 0.6, 1600], ['divesuit', 0.7, 1600], ['skullhelm', 0.8, 1900], ['bonemail', 0.6, 1900]];
L.mine = [['grapple', 1.2], ['hikeboots', 0.8], ['climbgloves', 0.8], ['harness', 0.5], ['pickaxe', 2], ['dynamite', 2], ['battery', 4], ['scrap', 6], ['tape', 3], ['spelhelm', 1], ['spelharn', 0.6], ['flare', 3], ['water', 2], ['ration', 2]];
L.food = [['canteen', 0.6], ['larder', 0.6], ['ration', 5], ['chocolate', 4], ['water', 5], ['can', 3], ['mushroom', 2], ['cactus', 1], ['alcohol', 2]].filter(([id]) => IT[id]);
L.ruin = [['trinket', 6], ['datashard', 2], ['nomadwrap', 1], ['bronzehelm', 0.5], ['bronzecuir', 0.3], ['herb', 2], ['water', 2]];
L.frost = [['furhood', 1.2], ['furparka', 0.8], ['icehelm', 0.6], ['icemail', 0.5], ['ration', 3], ['alcohol', 3], ['battery', 2], ['water', 3]];
L.lab = [['nightgoggles', 0.8], ['datashard', 5], ['antirad', 3], ['antibiotics', 2], ['prismvisor', 0.8], ['prismweave', 0.6], ['keycard', 1.5], ['battery', 3], ['metal_arm_a', 0.3]];
L.forge = [['scrap', 6], ['tape', 3], ['firemask', 0.8], ['firecoat', 0.6], ['obsidhelm', 0.4], ['obsidplate', 0.25], ['weldmask', 1], ['sledge', 0.5], ['fireaxe', 0.6], ['metal_arm_w', 0.5], ['metal_leg_a', 0.3], ['saw_arm_w', 0.5], ['saw_arm_a', 0.25, 1100]];
L.hive = [['nectar', 0.6], ['royaljelly', 0.25], ['chitinhelm', 0.8], ['chitinplate', 0.5], ['herb', 3], ['honey', 4], ['trinket', 2]].filter(([id]) => IT[id] || id === 'honey');
L.wreck = [['grapple', 0.8], ['divehelm', 0.6], ['divesuit', 0.7], ['ammo9', 3], ['shells', 2], ['bandage', 3], ['water', 4], ['battery', 2], ['trinket', 3]];
L.bone = [['skullhelm', 0.8], ['bonemail', 0.6], ['trinket', 5], ['datashard', 2], ['peg_leg_a', 0.4], ['peg_arm_a', 0.4], ['art_arm', 0.04], ['art_leg', 0.04]];
L.raider = [['runshoes', 0.6], ['knucklegloves', 0.6], ['harness', 0.4], ['ammo9', 3], ['ammo357', 2], ['shells', 2], ['pistol', 0.8], ['revolver', 0.5], ['knife', 2], ['machete', 1.2], ['policevest', 0.8], ['chainmail', 0.4], ['ration', 2], ['alcohol', 2]];
// honey: a deep-hive food
IT.honey = { name: 'Wild Honeycomb', icon: 'can', col: '#e0a020', w: 0.3, cat: 'food', hunger: 22, thirst: 6, stress: -6, stack: 5, value: 8, desc: 'Sticky, golden, almost too sweet. Calms the nerves.' };
L.common.push(['honey', 0.4, 1300]);
// sprinkle armour into existing tables
L.weapon.push(['policevest', 0.6], ['chainmail', 0.3, 200], ['spelhelm', 0.8], ['weldmask', 0.6]);
L.rare.push(['art_arm', 0.06, 800], ['art_leg', 0.06, 800], ['metal_arm_a', 0.4, 400]);
// the plain med boxes no longer appear in the open: real cabinets live in medical tents
NE.CONTAINERS.cabinet.name = 'Medical Cabinet'; NE.CONTAINERS.cabinet.tables = [['medcab', 1]]; NE.CONTAINERS.cabinet.n = [3, 5];
NE.CONTAINERS.locker.bld = 'shed';

// shape: how it's drawn. region: where it spawns (weight). bld: built into a shed.
const CT = [
  // grotto
  ['mosschest', 'Moss-Grown Chest', 'chest', '#4a5a30', 'wood', [['common', 1], ['armor', 0.6]], [1, 3], { grotto: 1.4 }],
  ['forager', 'Forager\'s Basket', 'basket', '#9a7a48', 'cloth', [['food', 1.2], ['common', 0.6]], [1, 3], { grotto: 1.6, desert: 0.5 }],
  ['rootcache', 'Root-Tangled Cache', 'sack', '#5a4a2a', 'cloth', [['rare', 0.8], ['common', 1]], [1, 2], { grotto: 1 }],
  ['minecart', 'Abandoned Ore Cart', 'cart', '#5a5048', 'metal', [['mine', 1.5]], [2, 3], { grotto: 1.2, desert: 1, ice: 0.8 }],
  ['toolbox', 'Rusty Toolbox', 'box', '#a03a20', 'metal', [['mine', 1], ['common', 0.6]], [1, 3], { grotto: 0.8, desert: 0.8, ice: 0.8, magma: 0.6 }],
  // desert
  ['sarcoph', 'Sandstone Sarcophagus', 'coffin', '#b08850', 'wood', [['ruin', 1.5], ['rare', 0.4]], [2, 3], { desert: 1.3 }],
  ['amphora', 'Sealed Amphora', 'urn', '#b0703a', 'wood', [['ruin', 1], ['food', 0.6]], [1, 2], { desert: 1.6 }],
  ['caravan', 'Caravan Saddlebag', 'sack', '#8a5a30', 'cloth', [['food', 1], ['raider', 0.6]], [1, 3], { desert: 1.2 }],
  ['reliquary', 'Gilded Reliquary', 'chest', '#d0a040', 'metal', [['ruin', 1.4], ['rare', 0.8]], [2, 3], { desert: 0.5, crystal: 0.3 }],
  // ice
  ['icechest', 'Frozen Supply Crate', 'crate', '#8aa0b8', 'wood', [['frost', 1.3], ['common', 0.5]], [1, 3], { ice: 1.6 }],
  ['sled', 'Expedition Sled', 'cart', '#6a4a2a', 'wood', [['frost', 1], ['food', 0.8]], [2, 3], { ice: 1.2 }],
  ['frozenbody', 'Frozen Climber', 'body', '#5a7088', 'cloth', [['frost', 1], ['med', 0.7]], [1, 3], { ice: 1 }],
  // crystal
  ['labcase', 'Research Specimen Case', 'box', '#c0c8d0', 'metal', [['lab', 1.4]], [1, 3], { crystal: 1.4 }],
  ['geodebox', 'Hollow Geode', 'geode', '#7a70b0', 'wood', [['rare', 1], ['lab', 0.5]], [1, 2], { crystal: 1.2 }],
  ['ammobox', 'Expedition Ammo Box', 'box', '#3a4430', 'metal', [['raider', 1.2], ['weapon', 0.4]], [2, 4], { crystal: 1, magma: 0.8, ice: 0.4 }],
  // magma
  ['forgechest', 'Forge-Master\'s Chest', 'chest', '#3a2622', 'metal', [['forge', 1.4]], [2, 3], { magma: 1.4 }],
  ['ashurn', 'Ash Urn', 'urn', '#4a3a36', 'wood', [['rare', 0.8], ['forge', 0.5]], [1, 2], { magma: 1 }],
  ['slagcart', 'Slag Cart', 'cart', '#5a3020', 'metal', [['forge', 1], ['mine', 0.6]], [2, 3], { magma: 1 }],
  // hive
  ['waxcell', 'Sealed Wax Cell', 'cell', '#d09020', 'cloth', [['hive', 1.4]], [1, 3], { hive: 2 }],
  ['broodpod', 'Brood Pod', 'pod2', '#8a4a20', 'cloth', [['hive', 1], ['rare', 0.6]], [1, 2], { hive: 1.4 }],
  ['cocoon', 'Silk Cocoon', 'cocoon', '#d8d0b0', 'cloth', [['raider', 0.8], ['med', 0.8], ['armor', 0.4]], [1, 3], { hive: 1.2, ossuary: 0.6 }],
  // drowned
  ['wreckchest', 'Sunken Sea-Chest', 'chest', '#3a4a40', 'wood', [['wreck', 1.4]], [2, 3], { drowned: 1.6 }],
  ['diverlocker', 'Diver\'s Locker', 'locker', '#3a5a5a', 'metal', [['wreck', 1.2], ['armor', 0.5]], [1, 3], { drowned: 1.2 }, 'shed'],
  ['barrelc', 'Watertight Barrel', 'barrel', '#5a4030', 'wood', [['food', 1], ['wreck', 0.6]], [1, 3], { drowned: 1.2 }],
  // ossuary
  ['ossuary', 'Bone Ossuary Box', 'coffin', '#d8d0b8', 'wood', [['bone', 1.4]], [2, 3], { ossuary: 1.6 }],
  ['skullpile', 'Heap of Skulls', 'skulls', '#e0d8c0', 'wood', [['bone', 1], ['rare', 0.5]], [1, 2], { ossuary: 1.2 }],
  ['pilgrim', 'Pilgrim\'s Pack', 'sack', '#5a4a3a', 'cloth', [['med', 0.8], ['food', 0.8], ['bone', 0.4]], [1, 3], { ossuary: 1, heart: 0.8 }],
  // everywhere / buildings
  ['raidstash', 'Raider Stash', 'crate', '#5a3a2a', 'wood', [['raider', 1.3]], [2, 3], { grotto: 0.6, desert: 0.7, ice: 0.6, crystal: 0.5, magma: 0.5 }],
  ['gunlocker', 'Security Gun Locker', 'locker', '#2a3a2a', 'metal', [['weapon', 1.2], ['raider', 0.5]], [1, 3], { crystal: 0.6, magma: 0.6, drowned: 0.5 }, 'shed'],
  ['wardrobe', 'Worker\'s Clothes Locker', 'locker', '#6a6050', 'metal', [['armor', 1.3], ['common', 0.4]], [1, 2], { grotto: 0.6, desert: 0.6, ice: 0.7, crystal: 0.6, magma: 0.6, hive: 0.4, drowned: 0.5, ossuary: 0.5 }, 'shed'],
  ['heartsac', 'Nectar Sac', 'pod2', '#c03060', 'cloth', [['hive', 1.2], ['rare', 1]], [2, 3], { heart: 2 }],
];
NE.CT_REGION = {};
for (const [id, name, shape, col, snd, tables, n, reg, bld] of CT) {
  NE.CONTAINERS[id] = { name, shape, col, sound: snd, tables, n, search: shape === 'basket' || shape === 'sack' ? 1.3 : shape === 'coffin' || shape === 'chest' ? 2.2 : 1.7, bld, lock: shape === 'chest' || shape === 'locker' ? 0.25 : 0 };
  for (const r in reg) (NE.CT_REGION[r] = NE.CT_REGION[r] || []).push([id, reg[r]]);
}
NE.CONTAINERS.locker.shape = 'locker';

// ======================================================================= NEW DEEP BIOMES
NE.BIOMES.push(
  { id: 'hive', name: 'Hive Warrens', from: 1300, dark: 0.8, cold: 0, heat: 0.5, bleed: 1, infect: 1.3, thirst: 1.3,
    perk: 'Wild honeycomb to eat. Wax cells full of nectar.', challenge: 'Sticky honey pools. The hive defends itself in swarms.',
    pal: { bg: '#120c04', back: '#2a1a08', back2: '#33210a', tile: '#8a5a1a', tile2: '#6a4412', edge: '#d09030', top: '#e0a838', plat: '#7a5020', ladder: '#a07a40', lamp: '#ffc040' },
    enemies: [['swarmling', 3], ['warden', 2], ['spitter', 2], ['nectarknight', 1], ['rival', 1]], decor: ['comb', 'comb', 'drip', 'stalag', 'roots'] },
  { id: 'drowned', name: 'Drowned Abyss', from: 1600, dark: 0.85, cold: 0.7, heat: 0, bleed: 0.9, infect: 1.1, thirst: 0.7,
    perk: 'Water everywhere. Sunken expedition wrecks.', challenge: 'Flooding tunnels, springs that never stop, things that swim.',
    pal: { bg: '#040a0e', back: '#0c1c24', back2: '#10242e', tile: '#2a4048', tile2: '#20343a', edge: '#4a7a80', top: '#3a6a5a', plat: '#2a4048', ladder: '#6a8080', lamp: '#60e0d0' },
    enemies: [['drowned', 3], ['bloater', 2], ['brute', 1], ['skulker', 1], ['specops', 1]], decor: ['kelp', 'kelp', 'wreck', 'stalag', 'boulder'] },
  { id: 'ossuary', name: 'Bone Ossuary', from: 1900, dark: 0.86, cold: 0.4, heat: 0, bleed: 1.1, infect: 1.4, thirst: 1,
    perk: 'Ancient reliquaries. Artificer limbs turn up among the bones.', challenge: 'The dead do not stay still. Wailing in the dark.',
    pal: { bg: '#0c0a08', back: '#1e1a14', back2: '#262018', tile: '#5a5040', tile2: '#4a4234', edge: '#a89c80', top: '#c8bc9c', plat: '#5a5040', ladder: '#8a7a60', lamp: '#e0d0a0' },
    enemies: [['bonewalker', 3], ['mourner', 2], ['skulker', 2], ['brute', 1], ['rival', 1]], decor: ['bones', 'skullwall', 'bones', 'pillar', 'stalag'] },
  { id: 'heart', name: 'The Nectar Heart', from: 2300, dark: 0.88, cold: 0, heat: 0.8, bleed: 1.2, infect: 1.5, thirst: 1.5,
    perk: 'Relic flowers bloom here more than anywhere. Nectar sacs everywhere.', challenge: 'The source of it all. Everything here wants you.',
    pal: { bg: '#10040a', back: '#240a16', back2: '#2e0e1c', tile: '#5a1a30', tile2: '#481428', edge: '#c04070', top: '#e05080', plat: '#5a1a30', ladder: '#a06080', lamp: '#ff60a0' },
    enemies: [['nectarknight', 2], ['warden', 2], ['spitter', 2], ['bloater', 1], ['brute', 1], ['mourner', 1], ['rival', 1]], decor: ['comb', 'veins', 'drip', 'veins', 'stalag'] },
);
NE.TOWNS.hive = ['Waxhome', 'Combwell']; NE.TOWNS.drowned = ['Lastlight Dock', 'Tidelock']; NE.TOWNS.ossuary = ['Calvary', 'Marrowhold']; NE.TOWNS.heart = ['The Last Lantern'];

// ======================================================================= NEW MOBS
Object.assign(NE.ENEMIES, {
  spitter: { block: 0, lunge: 0, name: 'Acid Spitter', faction: 'beast', speed: 34, hpMul: 0.8, weapon: null, dmg: 7, kind: 'bite', reach: 10, cd: 1.2, sight: 140, hears: 1.3, skin: '#8a9a3a', shirt: '#5a6a20', pants: '#3a4416', bare: 1, eyeGlow: '#c0ff40', spit: 1, loot: [['herb', 1], ['antiseptic', 0.3]], desc: 'Hangs back and lobs burning acid. Close the distance.' },
  brute: { block: 0.2, lunge: 0, name: 'Hulking Brute', faction: 'beast', speed: 30, hpMul: 2.6, weapon: ['sledge', 'leadpipe'], dmg: 20, kind: 'blunt', reach: 12, cd: 1.6, sight: 110, hears: 1, skin: '#9a7a6a', shirt: '#4a3a30', pants: '#2a2420', bare: 1, chitin: 0.15, brute: 1, loot: [['ration', 1], ['scrap', 2], ['sledge', 0.2]], desc: 'A mountain of scar tissue. Every blow throws you off your feet. Dodge, don\'t block.' },
  swarmling: { block: 0, lunge: 1, name: 'Hive Swarmling', faction: 'hive', speed: 64, hpMul: 0.35, weapon: null, dmg: 5, kind: 'bite', reach: 9, cd: 0.6, sight: 100, hears: 1.6, skin: '#d0a030', shirt: '#8a5a10', pants: '#5a3a08', bare: 1, eyeGlow: '#ff8020', pack: 3, loot: [['honey', 0.4]], desc: 'Fast, frail, never alone.' },
  warden: { block: 0.3, lunge: 1, name: 'Hive Warden', faction: 'hive', speed: 40, hpMul: 1.8, weapon: null, dmg: 15, kind: 'sharp', reach: 14, cd: 1.05, sight: 130, hears: 1.4, skin: '#a06a20', shirt: '#6a4010', pants: '#4a2a0a', bare: 1, chitin: 0.45, eyeGlow: '#ffb020', loot: [['honey', 1], ['chitinhelm', 0.12], ['chitinplate', 0.08]], desc: 'Armoured hive soldier with scythe-claws. Hit it while it recovers.' },
  drowned: { block: 0, lunge: 1, name: 'Drowned Diver', faction: 'drowned', speed: 38, hpMul: 1.2, weapon: ['knife', 'spear', 'crowbar'], sight: 110, hears: 1.5, skin: '#7a9a90', shirt: '#2a3a38', pants: '#1a2a28', eyeGlow: '#60ffe0', swimmer: 1, loot: [['divehelm', 0.08], ['divesuit', 0.1], ['water', 1], ['trinket', 1]], desc: 'Bloated, blue, and twice as fast in water.' },
  bonewalker: { block: 0.25, lunge: 0, name: 'Ossuary Revenant', faction: 'dead', speed: 34, hpMul: 1.4, weapon: ['machete', 'axe', 'cleaver', 'pickaxe'], sight: 120, hears: 1, skin: '#d8d0b8', shirt: '#8a8070', pants: '#5a5040', chitin: 0.3, bones: 1, eyeGlow: '#80c0ff', loot: [['trinket', 2], ['skullhelm', 0.1], ['bonemail', 0.06], ['peg_leg_a', 0.06]], desc: 'Bones wired together by something that isn\'t finished with them. Blunt weapons shatter it.' },
  mourner: { block: 0, lunge: 0, name: 'Wailing Mourner', faction: 'dead', speed: 30, hpMul: 0.9, weapon: null, dmg: 9, kind: 'sharp', reach: 11, cd: 1, sight: 130, hears: 1.4, skin: '#c8c0c8', shirt: '#2a2228', pants: '#1a161a', bare: 1, eyeGlow: '#ffffff', wail: 1, loot: [['trinket', 2], ['painkillers', 0.5]], desc: 'Its scream rattles your skull, drains your stamina and calls everything nearby. Kill it first.' },
  skulker: { block: 0, lunge: 1, name: 'Skulker', faction: 'trog', speed: 52, hpMul: 0.9, weapon: ['knife', 'shiv'], sight: 120, hears: 2, skin: '#3a3a3a', shirt: '#1a1a1c', pants: '#141416', stealth: 1, loot: [['lockpick', 1], ['knife', 0.3], ['trinket', 1]], desc: 'Nearly invisible until it\'s close. Listen for it.' },
  bloater: { block: 0, lunge: 0, name: 'Bloated Host', faction: 'infected', speed: 24, hpMul: 1.1, weapon: null, dmg: 8, kind: 'bite', reach: 10, cd: 1.2, sight: 80, hears: 1, skin: '#9aa070', shirt: '#6a6a40', pants: '#4a4a30', bare: 1, bloat: 1, loot: [['antiseptic', 0.6], ['herb', 1]], desc: 'Swollen with spores. Bursts into a toxic cloud when it dies — kill it from range or back off.' },
  nectarknight: { block: 0.6, lunge: 1, name: 'Nectar Knight', faction: 'rival', speed: 46, hpMul: 1.9, weapon: ['fireaxe', 'machete', 'spear', 'sledge'], sight: 160, hears: 1.3, shirt: '#5a2a50', pants: '#2a1a2a', eyeGlow: '#ffd23a', gear: [['chitinhelm', 0.6], ['chitinplate', 0.4], ['obsidplate', 0.15]], loot: [['nectar', 0.4], ['royaljelly', 0.3], ['art_arm', 0.03], ['art_leg', 0.03]], desc: 'A Vespa host that went all the way. Parries, lunges, wears hive armour. Elite.' },
});
Object.assign(NE.THREAT, { spitter: 1.6, brute: 2.8, swarmling: 0.6, warden: 2.4, drowned: 1.8, bonewalker: 2.2, mourner: 1.8, skulker: 1.9, bloater: 1.5, nectarknight: 3.2 });
// factions that are hostile to the player and each other like the existing ones
NE.MOB_VARIANTS = [
  { id: 'armored', pre: 'Armoured', w: 3, min: 150, fn: e => { const pool = NE.ARMOR2.filter(id => IT[id]); const b = pool.filter(id => IT[id].slot === 'body'), h = pool.filter(id => IT[id].slot === 'head'); if (!e.gear.body) { const id = pick(b); e.gear.body = { id, n: 1, dur: IT[id].dur }; } if (!e.gear.head && chance(0.7)) { const id = pick(h); e.gear.head = { id, n: 1, dur: IT[id].dur }; } } },
  { id: 'frenzied', pre: 'Frenzied', w: 3, min: 100, fn: e => { e.speedMul *= 1.3; e.D.cd = (e.D.cd || 1) * 0.8; e.vglow = '#ff4040'; } },
  { id: 'hulking', pre: 'Hulking', w: 2, min: 250, fn: e => { for (const k in e.anat.parts) { const P = e.anat.parts[k]; P.max *= 1.6; P.hp = P.max; } e.speedMul *= 0.9; e.anat.blood = 6000; } },
  { id: 'veteran', pre: 'Veteran', w: 2, min: 300, fn: e => { e.D.block = Math.min(0.8, (e.D.block || 0) + 0.3); e.D.lunge = 1; } },
  { id: 'nectar', pre: 'Nectar-Touched', w: 1, min: 500, fn: e => { e.D.eyeGlow = '#ffd23a'; for (const k in e.anat.parts) { const P = e.anat.parts[k]; P.max *= 1.25; P.hp = P.max; } e.D.loot = (e.D.loot || []).concat([['nectar', 0.5]]); e.nectarGlow = true; } },
];

// ======================================================================= NEW VESPA GIFTS + POWER TIERS
NE.ABILITIES.push(
  { id: 'molt', name: 'Emergency Molt', icon: 'ab_chitin', desc: 'Once per run, a killing blow instead tears you out of your old skin — you live on with half your blood.', mut: 'plates' },
  { id: 'brood', name: 'Brood Shield', icon: 'ab_amber', desc: 'A membrane of larvae soaks the next hit you take completely. Regrows every 25s.', mut: 'amber' },
  { id: 'barbs', name: 'Barbed Strikes', icon: 'ab_sting', desc: 'Your melee hits leave barbs behind: every hit opens an extra bleeding wound.', mut: 'stinger' },
  { id: 'resonance', name: 'Hive Resonance', icon: 'ab_pulse', desc: 'Every kill mends 10 HP on every body part.', mut: 'antennae' },
  { id: 'adrenal', name: 'Adrenal Sac', icon: 'ab_heart', desc: 'When you\'re about to black out, a gland floods you with adrenaline (every 90s).', mut: 'veins' },
  { id: 'bulwark', name: 'Chitin Bulwark', icon: 'ab_chitin', desc: 'Blocking costs half the stamina and your parry window is wider.', mut: 'plates' },
  { id: 'tendons', name: 'Spring Tendons', icon: 'ab_wings', desc: 'Dash costs half stamina and recharges twice as fast.', mut: 'wings' },
  { id: 'gorge', name: 'Gorging Gut', icon: 'ab_mand', desc: 'Hunger and thirst drain 40% slower.', mut: 'mandibles' },
  { id: 'wax', name: 'Wax Glands', icon: 'ab_amber', desc: 'You sweat sealing wax: bleeding -10%, treatments 25% faster.', mut: 'amber' },
  { id: 'quills', name: 'Quill Burst', icon: 'ab_sting', desc: 'When something hits you in melee, quills fire back: 35% chance to stagger it hard.', mut: 'stinger' },
  { id: 'gills', name: 'Gill Slits', icon: 'ab_eye', desc: 'Swim twice as fast and never tire in water.', mut: 'veins' },
  { id: 'echo', name: 'Echo Sense', icon: 'ab_eye', desc: 'Hidden things can\'t hide: skulkers and ambushers glow when near.', mut: 'antennae' },
);
// 1 = modest, 2 = strong, 3 = run-defining. Early drinks can only roll low tiers.
NE.GIFT_TIER = { eyes: 1, mand: 1, phantom: 1, frost: 1, ember: 1, gorge: 1, wax: 1, gills: 1, echo: 1, hive: 1, honeyblood: 2,
  heart: 2, wings: 2, amber: 2, carapace: 2, leap: 2, rot: 2, thorns: 2, royal: 2, barbs: 2, tendons: 2, adrenal: 2, bulwark: 2, resonance: 2, quills: 2, regen: 2,
  chitin: 3, sting: 3, pulse: 3, swarm: 3, frenzy: 3, molt: 3, brood: 3 };
NE.giftTierCap = n => n < 2 ? 1 : n < 4 ? 2 : 3; // gifts 1-2: tier 1 only, 3-4: up to tier 2, 5+: anything
})(window.NE);

// =====================================================================================================================
// BEHAVIOUR: world generation, liquids, mobs, gifts, gear, grapple, drawing, UI
// =====================================================================================================================
(function (NE) {
'use strict';
const { ri, rf, pick, chance, clamp, lerp } = NE; const T = NE.T; const G = NE.G; const W_ = NE.World.prototype;
const LIQ = { 5: 1, 9: 1, 11: 1 }; // water, lava, honey
NE.TL.HONEY = 11;

// ----------------------------------------------------------------------- world generation additions
const genFloor0 = W_.genFloor;
W_.genFloor = function (f) {
  const fl = genFloor0.call(this, f); if (!fl || this.lobby) return fl;
  const W = this, B = fl.biome.id, y0 = fl.y0, FH = NE.FH; const town = NE.isTownFloor(f);
  const busy = x => fl.objs.some(o => Math.abs(o.x - x) < 14) || (fl.poi && x > fl.poi.x0 - 8 && x < fl.poi.x1 + 8);
  const flatAt = tx => tx > 4 && tx < W.W - 5 && fl.g[tx] === fl.g[tx + 1] && fl.g[tx] === fl.g[tx - 1] && W.get(tx, y0 + fl.g[tx]) === 1 && W.get(tx, y0 + fl.g[tx] - 1) === 0;
  if (!town && f > 0) {
    // region-themed containers: re-theme some of the plain ones and add a couple more
    const reg = NE.CT_REGION[B] || [];
    if (reg.length) for (const o of fl.objs) if (o.type === 'container' && ['crate', 'urn', 'duffel'].includes(o.ct) && !(fl.poi && o.x > fl.poi.x0 && o.x < fl.poi.x1) && chance(0.55)) { o.ct = NE.wpick(reg); o.label = NE.CONTAINERS[o.ct].name; }
    if (reg.length) for (let k = 0; k < ri(1, 2); k++) for (let tries = 0; tries < 20; tries++) { const tx = ri(6, W.W - 7); const x = (tx + 0.5) * T; if (!flatAt(tx) || busy(x)) continue; const o = this.container(NE.wpick(reg), x, (y0 + fl.g[tx]) * T, fl.depth); fl.objs.push(o); break; }
    // locker sheds: every locker-type container sits inside a little corrugated shed
    for (const o of fl.objs) if (o.type === 'container' && NE.CONTAINERS[o.ct] && NE.CONTAINERS[o.ct].bld === 'shed' && !(fl.poi && o.x > fl.poi.x0 && o.x < fl.poi.x1)) fl.decor.push({ k: 'shed', x: o.x, y: o.y, s: rf(0, 1) });
    // medical tents around the medic POIs
    if (fl.poi && (fl.poi.kind === 'medic' || fl.poi.kind === 'triage')) { const cx = (fl.poi.x0 + fl.poi.x1) / 2; fl.decor.unshift({ k: 'medtent', x: cx, y: (y0 + FH - 4) * T, s: 0 }); fl.medtent = true; for (const o of fl.objs) if (o.ct === 'cabinet') o.label = 'Medical Cabinet (tent)'; }
    // springs: water (or lava) pours from cracks in the ceiling and pools below
    const springs = { grotto: 0.25, ice: 0.2, drowned: 1, hive: 0.5, magma: 0.3, heart: 0.3 }[B] || 0;
    fl.springs = [];
    for (let k = 0; k < (B === 'drowned' ? ri(2, 3) : 1); k++) if (chance(springs)) { const tx = ri(8, W.W - 9); const cy = y0 + fl.c[tx]; if (W.get(tx, cy) !== 0 || fl.c[tx] < 1) continue; fl.springs.push({ tx, ty: cy, type: B === 'magma' ? 9 : B === 'hive' || B === 'heart' ? 11 : 5, left: B === 'drowned' ? 40 : 14, t: 0 }); }
    // biome pools
    const pool = (type, n) => { for (let k = 0; k < n; k++) for (let tries = 0; tries < 20; tries++) { const w = ri(3, 6), tx = ri(6, W.W - w - 6); let ok = true; for (let x = tx - 1; x <= tx + w; x++) if (!flatAt(x) || busy((x + 0.5) * T)) ok = false; if (!ok) continue;
      for (let x = tx; x < tx + w; x++) { const gy = y0 + fl.g[x]; const d = x === tx || x === tx + w - 1 ? 1 : 2; for (let r = 0; r < d; r++) if (W.get(x, gy + r) === 1) W.set(x, gy + r, type); } break; } };
    if (B === 'hive' || B === 'heart') pool(11, ri(1, 2)); if (B === 'drowned') pool(5, ri(2, 4)); if (B === 'ossuary' && chance(0.4)) pool(5, 1);
    if (B === 'hive' || B === 'heart') for (let r = y0; r < y0 + FH; r++) for (let x = 0; x < W.W; x++) if (W.get(x, r) === 5) W.set(x, r, 11);
    if (B === 'heart' && chance(0.5)) { const tx = ri(8, W.W - 9); if (!busy((tx + 0.5) * T)) fl.objs.push({ type: 'relic', x: (tx + 0.5) * T, y: (y0 + fl.g[tx]) * T, label: 'Relic Flower', act: 'harvest', hue: ri(0, 2) }); }
  }
  // register every liquid cell in this band with the flow simulation
  this.liq = this.liq || new Map(); this.liqGen = this.liqGen || new Map();
  for (let r = y0; r < y0 + FH; r++) for (let x = 0; x < this.W; x++) { const t = this.get(x, r); if (LIQ[t]) { const k = r * this.W + x; this.liq.set(k, { a: 1, t }); this.liqGen.set(k, t); } }
  // liquid state that was saved (or sent by the co-op host) before this band existed
  if (this.liqPending && this.liqPending.size) for (const [k, v] of this.liqPending) { const r = Math.floor(k / this.W); if (r >= y0 && r < y0 + FH) { this.liqSet(k, v[0], v[1]); this.liqPending.delete(k); } }
  return fl;
};

// ----------------------------------------------------------------------- flowing, stacking liquids
// Each liquid cell holds an amount 0..1. Every tick it falls into the cell below, then spreads sideways to level out,
// so pools fill bottom-up, spill over ledges, pour down shafts and flood the holes you dig. Lava is thick; honey is thicker.
const VISC = { 5: 0.5, 9: 0.12, 11: 0.07 };
W_.liqAt = function (tx, ty) { const c = this.liq && this.liq.get(ty * this.W + tx); return c ? c.a : (LIQ[this.get(tx, ty)] ? 1 : 0); };
W_.isWater = function (px, py) { const tx = Math.floor(px / T), ty = Math.floor(py / T); const t = this.get(tx, ty); if (!LIQ[t]) return false; const c = this.liq && this.liq.get(ty * this.W + tx); if (!c) return true; return py >= (ty + 1 - c.a) * T - 0.5; };
W_.isHoney = function (px, py) { return this.get(Math.floor(px / T), Math.floor(py / T)) === 11 && this.isWater(px, py); };
W_.liqTick = function (cy) {
  if (!this.liq || this.lobby) return; const Wd = this.W, M = this.liq; const r0 = Math.max(0, Math.floor(cy / T) - 40), r1 = Math.floor(cy / T) + 40;
  this._lt = (this._lt || 0) + 1; const dirFirst = this._lt % 2 ? 1 : -1;
  // springs feed in
  for (const fl of this.visibleFloors(cy)) for (const s of fl.springs || []) { if (s.left <= 0) continue; const k = (s.ty + 1) * Wd + s.tx; if (this.get(s.tx, s.ty + 1) !== 0 && !(LIQ[this.get(s.tx, s.ty + 1)] && this.get(s.tx, s.ty + 1) === s.type)) continue; const c = M.get(k) || { a: 0, t: s.type }; if (c.t !== s.type) continue; const add = Math.min(0.12, 1 - c.a); c.a += add; s.left -= add; M.set(k, c); this.set(s.tx, s.ty + 1, s.type); if (Math.random() < 0.05 && NE.Audio && G.player && Math.abs(G.player.y - s.ty * T) < 120) NE.Audio.play('drip', 0.4); }
  const cells = []; for (const [k, c] of M) { const y = Math.floor(k / Wd); if (y >= r0 && y <= r1) cells.push(k); }
  cells.sort((a, b) => b - a); // bottom rows first
  let n = 0;
  for (const k of cells) {
    const c = M.get(k); if (!c) continue; const x = k % Wd, y = (k - x) / Wd; if (++n > 2500) break;
    if (this.get(x, y) !== c.t) { if (this.get(x, y) === 0) this.set(x, y, c.t); else { M.delete(k); continue; } } // got filled in by rock: gone
    const v = VISC[c.t] || 0.5; if (c.t !== 5 && (this._lt + x) % (c.t === 9 ? 3 : 5)) continue;
    // fall
    const bk = k + Wd, bt = this.get(x, y + 1);
    if (bt === 0 || bt === c.t || (LIQ[bt] && bt !== c.t)) {
      if (LIQ[bt] && bt !== c.t) { // water meets lava: both cool into rock with a hiss
        if ((c.t === 5 && bt === 9) || (c.t === 9 && bt === 5)) { this.setMod(x, y + 1, 1); M.delete(bk); c.a -= 0.5; if (G.addP) for (let i = 0; i < 6; i++) G.addP((x + 0.5) * T, (y + 1) * T, rf(-20, 20), rf(-60, -20), 0.8, '#d0d0d0', 'spark', -0.4); if (NE.Audio && G.player && Math.abs(G.player.y - y * T) < 120) NE.Audio.play('hiss', 0.5); if (c.a <= 0.02) { M.delete(k); this.set(x, y, 0); } continue; }
      } else { const b = M.get(bk) || { a: bt === c.t ? 1 : 0, t: c.t }; const mv = Math.min(c.a, 1 - b.a); if (mv > 0.001) { b.a += mv; c.a -= mv; M.set(bk, b); this.set(x, y + 1, c.t); c.moved = 1; } }
    }
    if (c.a <= 0.01) { M.delete(k); this.set(x, y, 0); continue; }
    // spread sideways once supported
    const below = this.get(x, y + 1); const supported = this.solid(below) || below === 2 || (below === c.t && (M.get(bk) || { a: 1 }).a > 0.98) || (LIQ[below] && below !== c.t);
    if (supported) for (const d of [dirFirst, -dirFirst]) { const nx = x + d, nt = this.get(nx, y); if (nt !== 0 && nt !== c.t) continue; const nk = k + d; const nc = M.get(nk) || { a: nt === c.t ? 1 : 0, t: c.t }; const diff = c.a - nc.a; if (diff > 0.015) { const mv = diff * v * 0.5; nc.a += mv; c.a -= mv; M.set(nk, nc); this.set(nx, y, c.t); } }
    if (c.a <= 0.01) { M.delete(k); this.set(x, y, 0); }
  }
};
// ---- liquid state as data: what changed since generation (saves), and absolute cell updates (co-op)
W_.liqSet = function (k, t, a) {
  const x = k % this.W, y = (k - x) / this.W; if (y >= this.rows.length) { (this.liqPending = this.liqPending || new Map()).set(k, [t, a]); return; }
  this.liq = this.liq || new Map(); const cur = this.get(x, y);
  if (!t || a <= 0.004) { this.liq.delete(k); if (LIQ[cur]) this.set(x, y, 0); return; }
  if (cur !== 0 && !LIQ[cur]) return; // rock got there first: the next tile sync will sort it out
  this.liq.set(k, { a, t }); this.set(x, y, t);
};
W_.liqDiff = function () { const out = []; if (!this.liq) return out; const gen = this.liqGen || new Map();
  for (const [k, c] of this.liq) if (gen.get(k) !== c.t || c.a < 0.996) out.push(k, c.t, Math.round(c.a * 255));
  for (const [k] of gen) if (!this.liq.has(k)) out.push(k, 0, 0); return out; };
W_.liqApplyList = function (arr) { for (let i = 0; i + 2 < arr.length; i += 3) this.liqSet(arr[i], arr[i + 1], arr[i + 2] / 255); };
// a dug-out tile next to liquid wakes the flow (setMod already changes the tile; the sim picks it up next tick)
const setMod0 = W_.setMod; W_.setMod = function (x, y, v, quiet) { setMod0.call(this, x, y, v, quiet); if (this.liq && !LIQ[v]) { const k = y * this.W + x; if (this.liq.has(k) && v !== 0) this.liq.delete(k); } };
W_.drawWater = function (ctx, cx, cy, time) {
  const tx0 = Math.floor(cx / T) - 1, ty0 = Math.floor(cy / T) - 1, tx1 = tx0 + Math.ceil(NE.VW / T) + 2, ty1 = ty0 + Math.ceil(NE.VH / T) + 2; const M = this.liq;
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const t = this.get(tx, ty); if (!LIQ[t]) continue; const px = tx * T, py = ty * T; const c = M && M.get(ty * this.W + tx); const a = c ? c.a : 1; const up = this.get(tx, ty - 1); const top = up !== t || (M && M.get((ty - 1) * this.W + tx) && M.get((ty - 1) * this.W + tx).a < 0.05);
    const dn = this.get(tx, ty + 1); const falling = c && dn === 0 && a < 0.9; const h = Math.max(1, Math.round(a * 8)); const fl = this.floorOf(ty); const icy = fl && fl.biome.id === 'ice';
    let body, surf; if (t === 9) { body = 'rgba(255,' + (90 + Math.floor(Math.sin(time * 3 + tx) * 30)) + ',20,0.92)'; surf = '#ffd060'; } else if (t === 11) { body = 'rgba(214,140,30,0.85)'; surf = '#ffd070'; } else { body = icy ? 'rgba(60,110,150,0.6)' : fl && fl.biome.id === 'drowned' ? 'rgba(20,80,90,0.65)' : 'rgba(30,70,80,0.6)'; surf = icy ? 'rgba(220,245,255,0.8)' : 'rgba(140,200,210,0.7)'; }
    ctx.fillStyle = body;
    if (falling) { const w = Math.max(1, Math.round(a * 6)); ctx.fillRect(px + 4 - (w >> 1), py, w, 8); ctx.fillStyle = surf; ctx.fillRect(px + 4 - (w >> 1), py + ((time * 40 + tx * 3) % 8 | 0), 1, 2); continue; }
    ctx.fillRect(px, py + 8 - h, 8, h);
    if (top) { ctx.fillStyle = surf; const wv = t === 5 && Math.sin(time * 2 + tx * 0.9) > 0 ? 1 : 0; ctx.fillRect(px, py + 8 - h + wv, 8, 1); }
  }
  G.drawContentFX && G.drawContentFX(ctx);
};
const isLava0 = W_.isLava; W_.isLava = function (px, py) { return isLava0.call(this, px, py) && this.isWater(px, py); };

// ----------------------------------------------------------------------- decor: sheds, medical tents, deep-biome dressing
const drawDecor0 = NE.drawDecor;
NE.drawDecor = function (ctx, d, pal, time, fl) {
  const x = Math.round(d.x), y = Math.round(d.y); const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
  switch (d.k) {
    case 'shed': { const c = d.s > 0.5 ? '#5a5248' : '#4a4e52'; R(-12, -22, 24, 22, NE.shade(c, 0.55)); R(-11, -21, 22, 21, c); for (let i = -10; i < 11; i += 3) R(i, -21, 1, 21, NE.shade(c, 0.8)); R(-14, -25, 28, 3, NE.shade(c, 0.7)); R(-14, -25, 28, 1, NE.shade(c, 1.2)); R(-9, -18, 18, 18, '#1a1612'); R(-11, -21, 1, 21, NE.shade(c, 0.6)); R(-6, -24, 3, 1, '#a0a090'); if (d.s > 0.3) R(5, -24, 2, 2, '#8a3a20'); break; }
    case 'medtent': { const W2 = 44, H2 = 30; for (let i = 0; i < H2; i++) { const w = Math.round(W2 * (0.35 + 0.65 * i / H2)); R(-(w >> 1), -H2 + i, w, 1, i % 6 === 0 ? '#c8c2b0' : '#dcd6c4'); } R(-(W2 >> 1), -2, W2, 2, '#a8a290'); R(-8, -18, 16, 16, '#3a3028'); R(-3, -H2 + 6, 6, 2, '#c02020'); R(-1, -H2 + 4, 2, 6, '#c02020'); R(-(W2 >> 1) - 1, -1, 1, 1, '#6a6050'); R((W2 >> 1), -1, 1, 1, '#6a6050'); break; }
    case 'comb': { const c = NE.shade(pal.back, 2.6); for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) { const hx = i * 6 + (j % 2) * 3, hy = -j * 5 - 8; R(hx, hy, 5, 4, c); R(hx + 1, hy + 1, 3, 2, NE.shade(pal.back, 1.3)); if ((i + j + Math.floor(d.s * 9)) % 4 === 0) R(hx + 1, hy + 1, 3, 2, '#c08020'); } break; }
    case 'drip': { const ceil = fl && fl.c ? (fl.y0 + fl.c[clamp(Math.floor(d.x / T), 0, fl.c.length - 1)]) * T : y - 60; ctx.fillStyle = '#d09020'; ctx.fillRect(x, ceil, 2, 4); ctx.fillRect(x + 1, ceil + 4, 1, 3); const k = (time * 0.7 + d.s * 5) % 1; ctx.fillRect(x + 1, ceil + 7 + Math.round(k * (y - ceil - 8)), 1, 2); break; }
    case 'kelp': { for (let i = 0; i < 18; i++) { ctx.fillStyle = i % 4 ? '#2a5a4a' : '#3a7a5a'; ctx.fillRect(x + Math.round(Math.sin(time * 1.5 + i * 0.4 + d.s * 6) * 1.5), y - i, 1, 1); } break; }
    case 'wreck': { const c = '#4a3a2a'; R(-14, -6, 28, 6, c); R(-16, -8, 4, 3, c); R(12, -9, 3, 4, c); for (let i = -12; i < 12; i += 4) R(i, -6, 1, 6, NE.shade(c, 0.7)); R(-2, -18, 1, 12, '#3a2a1a'); R(-2, -18, 7, 1, '#3a2a1a'); break; }
    case 'skullwall': { for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) { const sx = i * 5 + (j % 2) * 2, sy = -j * 5 - 6; R(sx, sy, 4, 4, '#cfc6ae'); R(sx + 1, sy + 1, 1, 1, '#2a2620'); R(sx + 2, sy + 1, 1, 1, '#2a2620'); R(sx + 1, sy + 3, 2, 1, '#8a8270'); } break; }
    case 'veins': { const ceil = fl && fl.c ? (fl.y0 + fl.c[clamp(Math.floor(d.x / T), 0, fl.c.length - 1)]) * T : y - 60; const p = 0.6 + 0.4 * Math.sin(time * 3 + d.s * 4); ctx.fillStyle = 'rgba(200,40,90,' + p + ')'; let vx = x; for (let yy = ceil; yy < y; yy += 1) { vx += NE.hash(yy, x) < 0.5 ? 0 : (NE.hash(x, yy) < 0.5 ? 1 : -1); ctx.fillRect(vx, yy, 1, 1); } break; }
    default: return drawDecor0(ctx, d, pal, time, fl);
  }
};
const texFor0 = W_.texFor; W_.texFor = function (biome) { const had = !!this.tex[biome.id]; const t = texFor0.call(this, biome); if (!had && t && t.back && ['hive', 'drowned', 'ossuary', 'heart'].includes(biome.id)) { const bx = t.back.getContext('2d'); const k = biome.id;
    for (let i = 0; i < 26; i++) { const x = Math.floor(NE.hash(i, 3) * 96), y = Math.floor(NE.hash(3, i) * 96); if (k === 'hive') { bx.strokeStyle = 'rgba(220,150,40,0.22)'; bx.strokeRect(x + 0.5, y + 0.5, 6, 5); } else if (k === 'drowned') { bx.fillStyle = 'rgba(80,200,200,0.12)'; bx.fillRect(x, y, 1, 4); } else if (k === 'ossuary') { bx.fillStyle = 'rgba(220,210,180,0.18)'; bx.fillRect(x, y, 3, 1); bx.fillRect(x + 1, y - 1, 1, 3); } else { bx.fillStyle = 'rgba(220,60,110,0.2)'; bx.fillRect(x, y, 1, 6); } } t._pat = null; }
  return t; };

// ----------------------------------------------------------------------- containers: drawn by shape
NE.CONTAINERS.urn.shape = 'urn';
const drawObj0 = G.drawObj;
const SHAPED = new Set(['chest', 'basket', 'sack', 'cart', 'box', 'coffin', 'urn', 'crate', 'body', 'geode', 'cell', 'pod2', 'cocoon', 'barrel', 'skulls', 'locker']);
G.drawObj = function (ctx, o) {
  if (o.type !== 'container' || !NE.CONTAINERS[o.ct] || ['crate', 'locker', 'cabinet', 'duffel', 'bag', 'weaponchest', 'stash', 'pod', 'corpse'].includes(o.ct) || !SHAPED.has(NE.CONTAINERS[o.ct].shape)) return drawObj0(ctx, o);
  const C = NE.CONTAINERS[o.ct], c = C.col || '#777', x = Math.round(o.x), y = Math.round(o.y), op = o.searched; const R = (a, b, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x + a, y + b, w, h); }; const D = s => NE.shade(c, s);
  switch (C.shape) {
    case 'chest': R(-7, -8, 14, 8, D(0.5)); R(-6, -7, 12, 7, c); R(-6, -7, 12, 2, D(1.2)); R(-6, -5, 12, 1, D(0.6)); R(-7, -7, 1, 7, '#8a8a80'); R(6, -7, 1, 7, '#8a8a80'); R(-1, -5, 2, 2, o.locked ? '#e0c050' : '#5a5040'); if (op) R(-6, -10, 12, 2, D(0.8)); break;
    case 'basket': R(-5, -6, 10, 6, D(0.6)); for (let i = 0; i < 5; i++) R(-4 + i * 2, -5, 1, 5, D(1.15)); R(-5, -6, 10, 1, D(1.3)); if (!op) { R(-3, -8, 2, 2, '#a04a30'); R(0, -8, 3, 2, '#c8a050'); } break;
    case 'sack': R(-4, -6, 9, 6, D(0.6)); R(-3, -7, 7, 7, c); R(-1, -9, 3, 2, D(0.8)); R(0, -10, 1, 1, '#2a2018'); R(-3, -3, 7, 1, D(0.8)); break;
    case 'cart': R(-9, -8, 18, 6, D(0.5)); R(-8, -7, 16, 4, c); R(-8, -7, 16, 1, D(1.25)); R(-6, -2, 3, 2, '#2a2a2a'); R(3, -2, 3, 2, '#2a2a2a'); if (!op) { R(-6, -9, 4, 2, '#7a7068'); R(-1, -10, 5, 3, '#8a7a60'); } break;
    case 'box': R(-5, -6, 10, 6, D(0.55)); R(-4, -5, 8, 5, c); R(-4, -5, 8, 1, D(1.25)); R(-1, -7, 2, 1, '#2a2a2a'); R(-2, -7, 4, 1, D(0.7)); R(-1, -3, 2, 1, '#d8d0b0'); break;
    case 'coffin': R(-9, -6, 18, 6, D(0.5)); R(-8, -5, 16, 5, c); R(-8, -5, 16, 1, D(1.2)); R(-2, -5, 1, 5, D(0.7)); R(1, -5, 1, 5, D(0.7)); R(-1, -4, 1, 1, D(1.5)); if (op) R(-9, -8, 12, 2, D(0.8)); break;
    case 'urn': R(-3, -10, 6, 10, D(0.55)); R(-2, -9, 4, 9, c); R(-4, -7, 8, 5, c); R(-2, -11, 4, 1, D(0.7)); R(-3, -5, 6, 1, D(1.3)); if (op) R(-1, -11, 2, 1, '#1a1410'); break;
    case 'crate': R(-6, -10, 12, 10, D(0.55)); R(-5, -9, 10, 8, c); R(-5, -5, 10, 1, D(0.75)); for (let i = 0; i < 8; i++) R(-4 + i, -8 + i, 1, 1, D(1.2)); R(-5, -9, 10, 1, D(1.35)); break;
    case 'body': R(-7, -3, 14, 3, D(0.6)); R(-6, -3, 12, 2, c); R(5, -4, 3, 3, '#c8b8a8'); R(-8, -2, 2, 2, '#2a2420'); R(-4, -1, 3, 1, D(0.5)); break;
    case 'geode': R(-5, -7, 10, 7, D(0.6)); R(-4, -8, 8, 8, c); R(-2, -6, 4, 4, '#2a2040'); R(-1, -5, 1, 2, '#c0b0ff'); R(1, -4, 1, 2, '#90e0ff'); break;
    case 'cell': for (const [a, b] of [[-6, -6], [0, -6], [-3, -11]]) { R(a, b, 6, 5, D(0.6)); R(a + 1, b + 1, 4, 3, op ? '#3a2408' : c); R(a + 1, b + 1, 4, 1, D(1.4)); } break;
    case 'pod2': { const k = Math.sin(G.t * 2 + x) * 0.5; R(-4, -9, 8, 9, D(0.55)); R(-3, -10 + Math.round(k), 6, 10, c); R(-2, -8, 1, 5, D(1.4)); R(1, -6, 1, 3, D(0.7)); break; }
    case 'cocoon': R(-3, -12, 6, 12, D(0.7)); R(-2, -13, 4, 13, c); for (let i = 0; i < 4; i++) R(-2, -11 + i * 3, 4, 1, D(0.85)); R(0, -16, 1, 3, '#d8d0c0'); break;
    case 'barrel': R(-4, -10, 8, 10, D(0.55)); R(-3, -10, 6, 10, c); R(-4, -8, 8, 1, '#6a6a60'); R(-4, -3, 8, 1, '#6a6a60'); R(-2, -10, 4, 1, D(1.3)); break;
    case 'skulls': for (const [a, b] of [[-6, -4], [-1, -4], [4, -4], [-4, -8], [1, -8], [-1, -12]]) { R(a, b, 4, 4, c); R(a + 1, b + 1, 1, 1, '#2a2620'); R(a + 2, b + 1, 1, 1, '#2a2620'); } break;
    case 'locker': { const h = 16, yy = y - h; ctx.fillStyle = D(0.5); ctx.fillRect(x - 5, yy - 1, 10, h + 1); ctx.fillStyle = c; ctx.fillRect(x - 4, yy, 8, h); ctx.fillStyle = D(1.25); ctx.fillRect(x - 4, yy, 8, 1); ctx.fillStyle = D(0.6); ctx.fillRect(x, yy, 1, h); for (let i = 0; i < 3; i++) { ctx.fillStyle = D(0.55); ctx.fillRect(x - 3, yy + 2 + i * 2, 2, 1); ctx.fillRect(x + 2, yy + 2 + i * 2, 2, 1); } if (op) { ctx.fillStyle = '#111'; ctx.fillRect(x + 1, yy + 1, 3, h - 2); } break; }
  }
  if (o.locked && C.shape !== 'chest') R(-1, -6, 2, 2, '#e0c050');
  if (!o.searched && G.player && G.state === 'run') { const r = 40 * G.player.stats.loot; if (NE.dist(x, y, G.player.x, G.player.y) < r) { ctx.fillStyle = 'rgba(232,226,208,' + (0.4 + 0.3 * Math.sin(G.t * 4)) + ')'; ctx.fillRect(x, y - 16, 1, 1); } }
};
const finishSearch0 = G.finishSearch; G.finishSearch = function (o) { if (o && o.ct === 'cabinet' && G.run && !G.run.medtent) { G.run.medtent = true; } return finishSearch0.call(this, o); };

// ----------------------------------------------------------------------- spawning: packs, variants
const spawnFloor0 = G.spawnFloor;
G.spawnFloor = function (fl, restoring) {
  const n0 = G.actors.length; spawnFloor0.call(this, fl, restoring); if (restoring) return;
  const fresh = G.actors.slice(n0).filter(a => a.D && !a.town);
  for (const e of fresh) {
    if (e.D.pack && !e.packOf && !fl._packed && (fl._packed = true)) for (let i = 1; i < e.D.pack; i++) { const m = new NE.Enemy(G, e.x + rf(-14, 14), e.y, e.type, fl.depth); m.packOf = e; G.actors.push(m); NE.decorateEnemy(m, fl.depth); }
    NE.decorateEnemy(e, fl.depth);
  }
};
NE.decorateEnemy = function (e, depth) {
  const D = e.D; if (e._dec) return; e._dec = true;
  if (D.bones) e.anat.s = Object.assign({}, e.anat.s, { bleed: 0.15 });
  if (['spitter', 'swarmling', 'warden', 'bloater', 'mourner'].includes(e.type)) e.hunch = true;
  if (e.type === 'swarmling') e.look.hair = 'bald';
  const ch = clamp((depth - 100) / 3200, 0, 0.25); if (!chance(ch) || e.packOf) return;
  const vs = NE.MOB_VARIANTS.filter(v => depth >= v.min); if (!vs.length) return; const v = NE.wpick(vs.map(x => [x, x.w]));
  e.D = Object.assign({}, D, { name: v.pre + ' ' + D.name, loot: (D.loot || []).slice() }); e.variant = v.id; v.fn(e);
};

// ----------------------------------------------------------------------- mob behaviours
G.cproj = [];
const upd0 = NE.Enemy.prototype.update;
NE.Enemy.prototype.update = function (dt) {
  const D = this.D; if (D.swimmer) { this._sm0 = this._sm0 || this.speedMul; this.speedMul = this.inWater ? this._sm0 * 2.2 : this._sm0; }
  upd0.call(this, dt);
  if (!this.alive || this.rd || (this.stagger > 0)) return; const t = this.target; if (!t || !t.alive || this.state !== 'chase') return;
  const d = Math.hypot(t.x - this.x, t.y - this.y);
  if (D.spit) { this.spitCD = (this.spitCD == null ? rf(1, 2) : this.spitCD) - dt;
    if (this.spitCD <= 0 && d > 26 && d < 140 && this.g.world.los(this.x, this.y - this.h + 3, t.x, t.cy)) { this.spitCD = rf(2.2, 3.4); const dx = t.x - this.x, dy = t.cy - (this.y - this.h + 3); const tt = clamp(d / 150, 0.35, 0.9); G.cproj.push({ x: this.x + this.facing * 3, y: this.y - this.h + 3, vx: dx / tt, vy: dy / tt - 0.5 * 300 * tt, by: this, t: 0, kind: 'acid' }); NE.Audio.play('squelch', 0.5); this.windT = 0; }
    if (d < 36 && !this.windT && this.cd > 0) this.backT = Math.max(this.backT || 0, 0.5); }
  if (D.wail) { this.wailCD = (this.wailCD == null ? rf(2, 4) : this.wailCD) - dt;
    if (this.wailCD <= 0 && d < 110) { this.wailCD = rf(8, 11); NE.Audio.play('screech', 0.7); G.shake(3); this.wailFx = 0.8;
      for (const a of G.actors) { if (!a.alive) continue; const da = Math.hypot(a.x - this.x, a.y - this.y); if (a.isPlayer && da < 110) { a.anat.stam = Math.max(0, a.anat.stam - 30); a.anat.stress = Math.min(100, a.anat.stress + 18); a.hurtT = 0.6; a.charge = null; a.guard = null; G.toast('The wail rattles your skull!'); }
        else if (a.D && a !== this && da < 220 && a.state !== 'chase' && a.isHostileTo && a.isHostileTo(t)) { a.target = t; a.state = 'chase'; } } } }
  if (this.wailFx > 0) this.wailFx -= dt;
};
// bloaters burst, bones shatter to blunt hits
const onDeath0 = G.onEnemyDeath;
G.onEnemyDeath = function (e, cause) {
  const was = e.alive; const byPlayer = G.player && e.anat && e.anat.lastHit === G.player.surv.first;
  onDeath0.call(this, e, cause); if (!was) return;
  if (e.D && e.D.bloat) { NE.Audio.play('squelch', 1); NE.Audio.play('hiss', 0.8); G.gas.push({ spore: true, x: e.x, y: e.y - 6, r: 14, max: 34, d: 0.9, vx: rf(-4, 4), life: 9 }); for (let i = 0; i < 24; i++) G.addP(e.x, e.cy, rf(-90, 90), rf(-100, 10), rf(0.4, 0.9), pick(['#9aa070', '#c8d080', '#6a7040']), 'blood');
    for (const a of G.actors) if (a.alive && a !== e && Math.hypot(a.x - e.x, a.cy - e.cy) < 26 && a.hurt) { a.hurt('torso', 8, 'burn', 'Bloater spores'); if (a.anat) a.anat.tox = (a.anat.tox || 0) + 25; } }
  const p = G.player; if (byPlayer && p && p.abil && p.abil.includes('resonance')) { for (const k of NE.PARTS) { const P = p.anat.parts[k]; if (!P.severed) P.hp = Math.min(P.max, P.hp + 10); } G.addP(p.x, p.cy, 0, -20, 0.6, '#ffd040', 'glow', 0); }
};
G.updateCproj = function (dt) {
  const W = G.world; for (const q of G.cproj) { q.t += dt; q.vy += 300 * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (Math.random() < dt * 40) G.addP(q.x, q.y, rf(-8, 8), rf(-8, 8), 0.3, '#b0e040', 'glow', 0);
    let hit = null; for (const a of G.actors) { if (!a.alive || a === q.by || (q.by.isHostileTo && !q.by.isHostileTo(a))) continue; if (a.contains && a.contains(q.x, q.y, 2)) { hit = a; break; } }
    if (hit || W.solidAt(q.x, q.y) || q.t > 3) { q.dead = true; NE.Audio.play('hiss', 0.4); for (let i = 0; i < 8; i++) G.addP(q.x, q.y, rf(-40, 40), rf(-50, 0), 0.5, pick(['#b0e040', '#80b020']), 'spark', 0.5);
      if (hit && !(hit.dashIF > 0)) { hit.hurt(hit.partNear ? hit.partNear(q.x, q.y) : 'torso', rf(8, 12), 'burn', q.by.D ? q.by.D.name : 'Acid'); if (hit.anat) hit.anat.tox = (hit.anat.tox || 0) + 8; } } }
  G.cproj = G.cproj.filter(q => !q.dead);
};
G.drawContentFX = function (ctx) {
  for (const q of G.cproj) { ctx.fillStyle = '#80b020'; ctx.fillRect(Math.round(q.x) - 1, Math.round(q.y) - 1, 3, 3); ctx.fillStyle = '#d8ff70'; ctx.fillRect(Math.round(q.x), Math.round(q.y) - 1, 1, 1); }
  const p = G.player; if (p && p.hook) { const h = p.hook, sx = p.x, sy = p.y - p.h + 6; ctx.fillStyle = '#b8a888'; const n = Math.ceil(Math.hypot(h.x - sx, h.y - sy) / 1.5); for (let i = 0; i < n; i++) { const k = i / n; const sag = h.att ? 0 : Math.sin(k * Math.PI) * 2; ctx.fillRect(Math.round(sx + (h.x - sx) * k), Math.round(sy + (h.y - sy) * k + sag), 1, 1); } ctx.fillStyle = '#c0c4ca'; ctx.fillRect(Math.round(h.x) - 1, Math.round(h.y) - 1, 3, 2); ctx.fillRect(Math.round(h.x), Math.round(h.y) - 2, 1, 1); }
  for (const a of G.actors) if (a.alive && a.wailFx > 0) { ctx.strokeStyle = 'rgba(255,255,255,' + (a.wailFx * 0.5) + ')'; ctx.lineWidth = 1; const r = (0.8 - a.wailFx) * 120; ctx.beginPath(); ctx.arc(a.x, a.cy, r, 0, 7); ctx.stroke(); }
};
// skulkers fade into the dark unless you're close (Echo Sense always shows them)
const draw0 = NE.Enemy.prototype.draw;
NE.Enemy.prototype.draw = function (ctx) {
  if (this.D && this.D.stealth && this.alive) { const p = G.player; const d = p ? Math.hypot(p.x - this.x, p.y - this.y) : 999; const echo = p && p.abil && p.abil.includes('echo'); let al = clamp((60 - d) / 40, 0.08, 1); if (this.hurtT > 0 || this.windT > 0) al = 1; if (echo) al = Math.max(al, 0.6); ctx.globalAlpha = al; draw0.call(this, ctx); ctx.globalAlpha = 1; if (echo && al < 1) { ctx.fillStyle = 'rgba(255,210,60,0.6)'; ctx.fillRect(Math.round(this.x), Math.round(this.y - this.h - 3), 1, 1); } return; }
  draw0.call(this, ctx);
  if (this.nectarGlow && this.alive && Math.random() < 0.2) G.addP(this.x + rf(-3, 3), this.y - rf(2, 20), 0, -8, 0.5, '#ffd23a', 'glow', 0);
};
// hurt hooks: bones vs blunt, brood shield, barbs, quills, gear fall resistance
const hurt0 = NE.Actor.prototype.hurt;
NE.Actor.prototype.hurt = function (part, dmg, kind, src, dir) {
  if (!this.alive) return; const p = G.player;
  if (this.D && this.D.bones && kind === 'blunt') dmg *= 1.5;
  if (this.isPlayer) {
    if (kind === 'fall') { let fr = 0; for (const s in this.gear) { const e = this.gear[s]; const it = e && NE.ITEMS[e.id]; if (it && it.fallRes) fr += it.fallRes; } dmg *= 1 - Math.min(0.6, fr); }
    if (this.abil && this.abil.includes('brood') && (this.broodT || 0) <= 0 && dmg > 3 && kind !== 'fall' && kind !== 'burn') { this.broodT = 25; NE.Audio.play('squelch', 0.8); for (let i = 0; i < 14; i++) G.addP(this.x, this.cy, rf(-50, 50), rf(-60, 10), 0.6, pick(['#ffd040', '#e8e0b0']), 'goo'); G.toast('Brood Shield absorbed the hit!'); return; }
  }
  hurt0.call(this, part, dmg, kind, src, dir);
  if (p && src === p.surv.first && this !== p && p.abil && p.abil.includes('barbs') && (kind === 'sharp' || kind === 'blunt' || kind === 'bite') && this.anat && this.anat.parts[part] && !this.anat.parts[part].severed) this.anat.parts[part].wounds.push({ t: 'cut', bleed: rf(0.4, 0.9), dirty: 0.1, inf: 0, closed: false, age: 0, bullet: false });
  if (this.isPlayer && this.abil && this.abil.includes('quills') && (kind === 'sharp' || kind === 'blunt' || kind === 'bite') && chance(0.35)) { let best = null, bd = 22; for (const a of G.actors) if (a.alive && a.D && a.isHostileTo && a.isHostileTo(this)) { const d = Math.hypot(a.x - this.x, a.y - this.y); if (d < bd) { bd = d; best = a; } } if (best) { best.stagger = Math.max(best.stagger || 0, 1.1); best.hurt(pick(['torso', 'head', 'larm', 'rarm']), 5, 'sharp', this.surv.first); for (let i = 0; i < 6; i++) G.addP(this.x, this.cy, Math.sign(best.x - this.x) * rf(60, 120), rf(-30, 10), 0.3, '#e8d090', 'spark', 0); } }
};

// ----------------------------------------------------------------------- player: gear stats, gifts, grapple, saw arm, honey
const statsKeyOf = p => Object.keys(p.gear).map(k => p.gear[k] ? p.gear[k].id : '').join('|');
NE.Player.prototype.applyGearMods = function () {
  const key = statsKeyOf(this); if (key === this._gk) return; this._gk = key; const s = this.stats;
  if (this._gm) for (const k in this._gm) s[k] /= this._gm[k]; const gm = {}; for (const sl in this.gear) { const e = this.gear[sl]; const it = e && NE.ITEMS[e.id]; if (it && it.gmods) for (const k in it.gmods) gm[k] = (gm[k] || 1) * it.gmods[k]; }
  for (const k in gm) s[k] = (s[k] == null ? 1 : s[k]) * gm[k]; this._gm = gm; if (this.inv) { this.inv.carry = s.carry; }
  this.grip = !!(this.gear.feet && NE.ITEMS[this.gear.feet.id].grip);
};
const setAb0 = NE.Player.prototype.setAbilities;
NE.Player.prototype.setAbilities = function (list) { const s = this.stats; if (this._gm) { for (const k in this._gm) s[k] /= this._gm[k]; this._gm = null; } this._gk = null; if (!this._st1) this._st1 = { hunger: s.hunger, thirst: s.thirst, treat: s.treat }; Object.assign(s, this._st1); setAb0.call(this, list); const has = id => list.includes(id); if (has('gorge')) { s.hunger *= 0.6; s.thirst *= 0.6; } if (has('wax')) { s.bleed *= 0.9; s.treat *= 0.75; } this.applyGearMods(); };
const SAW = (id) => ({ id: 'sawarm', name: 'Saw-Blade Arm', w: 1.2, melee: { dmg: NE.SAW_DMG[id] || 18, kind: 'sharp', reach: 11, stam: 5, cd: 0.42 } });
NE.Combat.WLEN.sawarm = 3;
const wdef0 = NE.Player.prototype.weaponDef;
NE.Player.prototype.weaponDef = function () { if (!this.equip.weapon) { for (const k of ['rarm', 'larm']) { const P = this.anat.parts[k]; if (P.severed && P.prost && P.prost.kind === 'saw') return SAW(P.prost.id); } } return wdef0.call(this); };
const dash0 = NE.Player.prototype.dash;
NE.Player.prototype.dash = function (mx) { const cd = this.dashCD; dash0.call(this, mx); if (this.abil && this.abil.includes('tendons') && this.dashCD > 0 && !(cd > 0)) { this.anat.stam += 7 * this.stats.staminaCost; this.dashCD = 0.3; } };
NE.Player.prototype.grapple = function () {
  const g = this.g; if (this.hook) { this.hook = null; NE.Audio.play('cloth', 0.6); return; }
  if (!this.inv.has('grapple')) { g.toast('You need a Grappling Hook.'); NE.Audio.play('deny'); return; }
  if (this.anat.armFactor() < 0.35 || this.anat.uncon || this.rd) return g.toast('Your arms can\'t throw it.');
  let dx = g.mouse.wx - this.x, dy = g.mouse.wy - (this.y - this.h + 6); const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L; if (dy > -0.15) { dy = -0.5; const l2 = Math.hypot(dx, dy); dx /= l2; dy /= l2; }
  this.hook = { x: this.x, y: this.y - this.h + 6, vx: dx * 420, vy: dy * 420, att: false, len: 0, t: 0 }; NE.Audio.play('whoosh', 0.8); this.climbing = false;
};
NE.Player.prototype.hookTick = function (dt, input) {
  const h = this.hook, W = this.g.world; h.t += dt; const sx = this.x, sy = this.y - this.h + 6;
  if (!h.att) { const steps = 4; for (let i = 0; i < steps; i++) { h.x += h.vx * dt / steps; h.y += h.vy * dt / steps; if (W.solidAt(h.x, h.y)) { h.att = true; h.x -= h.vx * dt / steps * 0.5; h.y -= h.vy * dt / steps * 0.5; h.len = Math.hypot(h.x - sx, h.y - sy); NE.Audio.play('metal', 0.9); this.g.dust(h.x, h.y, 3); break; } }
    if (!h.att && (h.t > 0.45 || Math.hypot(h.x - sx, h.y - sy) > 150)) { this.hook = null; NE.Audio.play('cloth', 0.4); } return; }
  if (input && input.jump && !this._hj && h.t > 0.15) { this.hook = null; this.vy = Math.min(this.vy, -150); this._hj = true; return; } this._hj = input && input.jump;
  const reel = input && input.down ? -40 : 140; h.len = clamp(h.len - reel * dt, 9, 160);
  const dx = h.x - sx, dy = h.y - sy, d = Math.hypot(dx, dy) || 1; const ux = dx / d, uy = dy / d;
  if (d > h.len) { const vr = this.vx * ux + this.vy * uy; if (vr < 0) { this.vx -= vr * ux; this.vy -= vr * uy; } const pull = (d - h.len) * 14; this.vx += ux * pull * dt * 10; this.vy += uy * pull * dt * 10; this.onGround = false; }
  if (input && input.mx) this.vx += input.mx * 140 * dt; // swing
  this.vx = clamp(this.vx, -260, 260); this.vy = clamp(this.vy, -280, 300); this.anat.stam -= dt * 3;
  if (this.anat.stam <= 0 || this.rd || this.anat.uncon) this.hook = null;
};
const pupd0 = NE.Player.prototype.update;
NE.Player.prototype.update = function (dt, input) {
  this.applyGearMods(); const A = this.anat; const has = id => this.abil && this.abil.includes(id);
  if (has('gills') && this.inWater) { this._smG = true; this.speedMul = 2; } else if (this._smG) { this._smG = false; this.speedMul = 1; }
  const st0 = A.stam; pupd0.call(this, dt, input);
  if (has('gills') && this.inWater && A.stam < st0) A.stam = st0;
  if (this.broodT > 0) this.broodT -= dt; this.adrenalCD = Math.max(0, (this.adrenalCD || 0) - dt);
  if (has('adrenal') && this.adrenalCD <= 0 && A.cons < 22 && !A.dead) { this.adrenalCD = 90; A.drugs.adrenaline = 1; A.cons = Math.max(A.cons, 50); if (A.uncon) A.uncon = false; NE.Audio.play('heart', 1); G.toast('Adrenal Sac bursts — you snap awake!'); }
  // hiking boots: cling to a wall you're pushing into
  if (this.grip && this.wallSliding) { this.vy = Math.min(this.vy, 6); if (A.stam > 0) A.stam -= dt * 2; }
  // honey: thick, slow, sticky
  const W = this.g.world; if (W.isHoney && W.isHoney(this.x, this.y - 2)) { this.vx *= Math.pow(0.08, dt); if (this.vy > 0) this.vy *= Math.pow(0.05, dt); }
  if (this.hook) this.hookTick(dt, input);
  // severed limbs remember they're gone after a reload
  for (const k of ['larm', 'rarm', 'lleg', 'rleg']) if (A.parts[k].severed && !(this.sev && this.sev[k])) { this.sev = this.sev || {}; this.sev[k] = -999; }
};
// Emergency Molt: one second chance per run
const pdeath0 = G.playerDeath;
G.playerDeath = function () {
  const p = G.player, A = p && p.anat, R = G.run;
  if (p && A && p.abil && p.abil.includes('molt') && R && !R.molted && A.parts.head.hp > 0 && A.org.brain > 0) { R.molted = true; A.dead = false; A.cause = ''; A.blood = Math.max(A.blood, 2600); for (const k in A.org) A.org[k] = Math.max(A.org[k], 25); A.cons = 40; A.uncon = false; A.drugs.adrenaline = 1; for (const k of NE.PARTS) { const P = A.parts[k]; P.wounds = P.wounds.filter(w => w.closed); P.hp = Math.max(P.hp, P.max * 0.3); }
    NE.Audio.play('squelch', 1); NE.Audio.play('screech', 0.6); G.flashT = 0.8; G.shake(6); for (let i = 0; i < 40; i++) G.addP(p.x, p.cy, rf(-80, 80), rf(-100, 10), rf(0.6, 1.2), pick(['#c8b890', '#ffd040', '#8a6a40']), 'goo'); NE.UI.banner('EMERGENCY MOLT', 'You tear free of your dying skin. That trick only works once.'); G.log('Emergency Molt: you shed your ruined skin and live.', 'good'); return; }
  return pdeath0.call(this);
};
// Vespa gifts: random order every run, but early drinks can only roll modest gifts
G.drinkNectar = (function (orig) { return function (p) {
  const R = G.run; if (!R) return orig.call(this, p); const cap = NE.giftTierCap((R.abil || []).length); const all = NE.ABILITIES; const pow = NE.variantOf(p.surv.variant).pow || [];
  const allowed = all.filter(a => (NE.GIFT_TIER[a.id] || 2) <= cap); const anyLeft = allowed.some(a => (!a.strain || pow.includes(a.id)) && !(R.abil || []).includes(a.id));
  if (anyLeft) NE.ABILITIES = allowed; try { return orig.call(this, p); } finally { NE.ABILITIES = all; p.setAbilities(G.run.abil || []); }
}; })(G.drinkNectar);

// ----------------------------------------------------------------------- per-frame: liquids & projectiles
const gupd0 = G.update;
G.update = function (dt, rdt) {
  gupd0.call(this, dt, rdt);
  if (!NE.Net || !NE.Net.prototype._liqHooked) NE.hookNet();
  const W = G.world, N = G.net && G.net.on ? G.net : null; const live = W && !W.lobby && (G.state === 'run' || G.state === 'dying' || G.state === 'burst');
  if (live && !(N && N.role === 'guest')) { G._liqAcc = (G._liqAcc || 0) + dt; if (G._liqAcc > 1 / 20) { G._liqAcc = 0; W.liqTick(G.focus().y); if (N && N.peer && !N.peer.hidden && Math.abs(N.peer.y - G.focus().y) > 80 * T) W.liqTick(N.peer.y); } }
  if (live && N && N.role === 'host' && N.peer) { G._liqSend = (G._liqSend || 0) + dt; if (G._liqSend > 0.15) { G._liqSend = 0; NE.liqStream(W, N); } }
  if (G.cproj.length) G.updateCproj(dt);
  // anyone in honey is slowed (enemies too)
  if (W && W.isHoney) for (const a of G.actors) if (a.alive && !a.isPlayer && W.isHoney(a.x, a.y - 2)) a.vx *= Math.pow(0.1, dt);
};
const clear0 = G.clearWorld; G.clearWorld = function () { G.cproj = []; if (G.player) G.player.hook = null; return clear0.apply(this, arguments); };

// ----------------------------------------------------------------------- liquids in co-op & saves
// Host is the only one simulating. Every 0.15s it sends the guest every cell near them that changed since it last told them.
NE.liqStream = function (W, N) {
  if (!W.liq) return; const sent = W.liqSent = W.liqSent || new Map(); const gen = W.liqGen || new Map(); const Wd = W.W;
  const r0 = Math.max(0, Math.floor(N.peer.y / T) - 34), r1 = Math.floor(N.peer.y / T) + 34; const k0 = r0 * Wd, k1 = (r1 + 1) * Wd; const out = [];
  const q = (t, a) => t * 1000 + Math.round(a * 255);
  for (const [k, c] of W.liq) { if (k < k0 || k >= k1) continue; const v = q(c.t, c.a); if (sent.get(k) !== v) { sent.set(k, v); out.push(k, c.t, Math.round(c.a * 255)); } }
  for (const [k, v] of sent) if (k >= k0 && k < k1 && v !== 0 && !W.liq.has(k)) { sent.set(k, 0); out.push(k, 0, 0); }
  for (const [k] of gen) if (k >= k0 && k < k1 && !W.liq.has(k) && !sent.has(k)) { sent.set(k, 0); out.push(k, 0, 0); }
  for (let i = 0; i < out.length; i += 1800) N.send({ t: 'liq', c: out.slice(i, i + 1800) });
};
// net.js loads after this file: hook its message handler once it exists
NE.hookNet = function () { if (!NE.Net || NE.Net.prototype._liqHooked) return; const handle0 = NE.Net.prototype.handle; NE.Net.prototype._liqHooked = true;
  NE.Net.prototype.handle = function (m) {
    if (m && m.t === 'liq') { if (this.role === 'guest' && G.world && !G.world.lobby) G.world.liqApplyList(m.c || []); return; }
    if (m && m.t === 'hello' && this.role === 'host' && G.world) G.world.liqSent = new Map(); // (re)joined: resend everything near them
    return handle0.call(this, m);
  }; };
window.addEventListener('load', NE.hookNet); setTimeout(NE.hookNet, 0);
const ser0 = NE.Save.serializeRun; NE.Save.serializeRun = function (g) { const r = ser0.call(this, g); if (r && g.world && g.world.liqDiff) { r.liq = g.world.liqDiff(); r.springs = g.world.floors.map(fl => (fl.springs || []).map(sp => Math.round(sp.left * 10) / 10)); } return r; };
const res0 = NE.Save.restoreRun; NE.Save.restoreRun = function (g, d) { res0.call(this, g, d); if (d && d.liq && g.world && g.world.liqApplyList) g.world.liqApplyList(d.liq); if (d && d.springs && g.world) d.springs.forEach((arr, f) => { const fl = g.world.floors[f]; if (fl && fl.springs) arr.forEach((v, i) => { if (fl.springs[i]) fl.springs[i].left = v; }); }); };

// ----------------------------------------------------------------------- environment: gear warmth/cooling/radiation/gas
const env0 = G.computeEnv;
G.computeEnv = function (p) {
  const env = env0.call(this, p); if (!p || !p.gear) return env; let warm = 0, cool = 0, rad = 0, gas = 0;
  for (const s in p.gear) { const e = p.gear[s]; const it = e && NE.ITEMS[e.id]; if (!it) continue; warm += it.warm || 0; cool += it.cool || 0; rad += it.radRes || 0; gas += it.gasF || 0; }
  if (env.cold) env.cold *= 1 - Math.min(0.85, warm); if (env.heat) env.heat *= 1 - Math.min(0.85, cool); if (env.rad) env.rad *= 1 - Math.min(0.9, rad); if (env.gas) env.gas *= 1 - Math.min(0.95, gas);
  return env;
};
})(window.NE);

// =====================================================================================================================
// MODULAR WARDROBE: tabs, filters, a card grid and a detail panel instead of one long list
// =====================================================================================================================
(function (NE) {
'use strict';
const UI = NE.UI, G = () => NE.G; const $ = s => document.querySelector(s); const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
if (!document.getElementById('ward2-css')) { const st = document.createElement('style'); st.id = 'ward2-css'; st.textContent = `
.w2{display:grid;grid-template-columns:calc(170px*var(--us,1)) 1fr calc(220px*var(--us,1));gap:calc(10px*var(--us,1));height:100%;min-height:0}
.w2-prev{display:flex;flex-direction:column;align-items:center;gap:6px}.w2-prev canvas{image-rendering:pixelated;width:100%;background:rgba(0,0,0,.25);border:1px solid rgba(232,226,208,.15)}
.w2-mid{display:flex;flex-direction:column;min-height:0}.w2-tabs{display:flex;gap:4px;margin-bottom:6px;flex-wrap:wrap}
.w2-tab{padding:4px 10px;border:1px solid rgba(232,226,208,.25);background:rgba(0,0,0,.3);color:inherit;cursor:pointer;font:inherit}
.w2-tab.on{background:rgba(255,192,48,.18);border-color:#ffc030;color:#ffd870}
.w2-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(calc(118px*var(--us,1)),1fr));gap:6px;overflow:auto;min-height:0;padding-right:4px}
.w2-card{border:1px solid rgba(232,226,208,.18);background:rgba(0,0,0,.28);padding:6px;cursor:pointer;display:flex;flex-direction:column;gap:3px;position:relative}
.w2-card:hover{border-color:rgba(255,255,255,.5)}.w2-card.sel{border-color:#ffc030;box-shadow:0 0 0 1px #ffc030 inset}.w2-card.lock{opacity:.55}
.w2-card .sw{height:calc(26px*var(--us,1));display:flex;gap:2px}.w2-card .sw i{flex:1;display:block}
.w2-card b{font-size:.92em}.w2-card small{opacity:.7;font-size:.8em}.w2-card .tag{position:absolute;top:3px;right:4px;font-size:.72em;color:#7ad07a}
.w2-det{border:1px solid rgba(232,226,208,.18);background:rgba(0,0,0,.28);padding:8px;display:flex;flex-direction:column;gap:6px;overflow:auto}
.w2-det .st{display:flex;justify-content:space-between;border-bottom:1px dashed rgba(232,226,208,.12);padding:2px 0}
`; document.head.appendChild(st); }
const packCells = o => Math.max(4, 4 + Math.floor((o.slots + 8 - 20) / 2)) * 10;
UI.render.wardrobe = function (b) {
  const g = G(), M = g.meta, surv = M.survivor; UI.w2 = UI.w2 || { tab: 'backpacks', filt: 'all', sel: null };
  const S = UI.w2; const list = S.tab === 'backpacks' ? NE.BACKPACKS : NE.OUTFITS; const eqKey = S.tab === 'backpacks' ? 'backpack' : 'outfit';
  const owned = o => M.unlocked[S.tab].includes(o.id) || !o.unlock && !o.price;
  const shown = list.filter(o => S.filt === 'all' || (S.filt === 'owned' ? owned(o) : !owned(o)));
  const sel = list.find(o => o.id === S.sel) || list.find(o => o.id === M.equipped[eqKey]) || list[0]; S.sel = sel.id;
  const sw = o => S.tab === 'backpacks' ? '<i style="background:' + o.col[0] + '"></i><i style="background:' + o.col[1] + ';flex:.4"></i>' : (o.random ? '<i style="background:linear-gradient(90deg,#6a5a40,#3a4a60,#5a3a3a)"></i>' : '<i style="background:' + o.shirt + '"></i><i style="background:' + o.pants + '"></i>');
  const card = o => { const un = owned(o), eq = M.equipped[eqKey] === o.id; return '<div class="w2-card' + (o.id === S.sel ? ' sel' : '') + (un ? '' : ' lock') + '" data-id="' + o.id + '"><div class="sw">' + sw(o) + '</div><b>' + esc(o.name) + '</b><small>' + (S.tab === 'backpacks' ? packCells(o) + ' cells • ' + (o.carry + 6) + 'kg' : esc((o.desc || '').split('.')[0])) + '</small>' + (eq ? '<span class="tag">WORN</span>' : un ? '' : '<span class="tag" style="color:#e0b040">🔒</span>') + '</div>'; };
  const un = owned(sel), eq = M.equipped[eqKey] === sel.id;
  let det = '<h3 style="margin:0">' + esc(sel.name) + '</h3><div class="dim">' + esc(sel.desc || '') + '</div>';
  if (S.tab === 'backpacks') det += '<div class="st"><span>Grid</span><b>' + NE.packGrid(sel.slots) + '</b></div><div class="st"><span>Cells</span><b>' + packCells(sel) + '</b></div><div class="st"><span>Carry</span><b>' + (sel.carry + 6) + ' kg</b></div>';
  for (const k in (sel.mods || {})) { const v = sel.mods[k]; const pct = k === 'carry' || k === 'stamina' || k === 'lungs' ? (v > 0 ? '+' : '') + v : (v > 1 ? '+' : '') + Math.round((v - 1) * 100) + '%'; det += '<div class="st"><span>' + esc({ speed: 'Move speed', noise: 'Noise', treat: 'Treatment time', cold: 'Cold', heat: 'Heat', gas: 'Spores/gas', rad: 'Radiation', carry: 'Carry (kg)', runCost: 'Sprint stamina', medEff: 'Treatment strength', melee: 'Melee damage', stress: 'Stress', infect: 'Infection', tox: 'Toxins', lungs: 'Lung capacity', hpMul: 'Health', stamina: 'Stamina' }[k] || k) + '</span><b>' + pct + '</b></div>'; }
  if (!un) det += '<div class="warn">🔒 ' + esc(sel.unlock ? sel.unlock.text : 'Locked') + (sel.price ? '<br>or buy at the Quartermaster for ' + sel.price + ' scrap' : '') + '</div>';
  det += un ? (eq ? '<button class="btn" disabled>WORN</button>' : '<button class="btn" data-eq="1">EQUIP</button>') : (sel.price ? '<button class="btn" data-buy="1"' + (M.scrap >= sel.price ? '' : ' disabled') + '>BUY — ' + sel.price + '</button>' : '');
  b.innerHTML = '<div class="w2"><div class="w2-prev"><canvas id="prevcv" width="144" height="132"></canvas><div class="dim center">' + esc(surv ? surv.name : '') + '</div><div class="dim center" style="font-size:.85em">' + esc((NE.BACKPACKS.find(x => x.id === M.equipped.backpack) || NE.BACKPACKS[0]).name) + '<br>' + esc((NE.OUTFITS.find(x => x.id === M.equipped.outfit) || NE.OUTFITS[0]).name) + '</div></div>' +
    '<div class="w2-mid"><div class="w2-tabs"><button class="w2-tab' + (S.tab === 'backpacks' ? ' on' : '') + '" data-tab="backpacks">BACKPACKS (' + NE.BACKPACKS.length + ')</button><button class="w2-tab' + (S.tab === 'outfits' ? ' on' : '') + '" data-tab="outfits">OUTFITS (' + NE.OUTFITS.length + ')</button><span style="flex:1"></span>' +
    ['all', 'owned', 'locked'].map(f => '<button class="w2-tab' + (S.filt === f ? ' on' : '') + '" data-f="' + f + '">' + f.toUpperCase() + '</button>').join('') + '</div><div class="w2-grid">' + (shown.length ? shown.map(card).join('') : '<div class="dim">Nothing here.</div>') + '</div></div>' +
    '<div class="w2-det">' + det + '</div></div>';
  // preview shows the hovered/selected piece on your survivor
  const pb = S.tab === 'backpacks' ? sel.id : M.equipped.backpack, po = S.tab === 'outfits' ? sel.id : M.equipped.outfit; if (surv) UI.previewHuman($('#prevcv'), surv, pb, po);
  b.querySelectorAll('[data-tab]').forEach(e => e.onclick = () => { S.tab = e.dataset.tab; S.sel = null; NE.Audio.play('ui'); UI.render.wardrobe(b); });
  b.querySelectorAll('[data-f]').forEach(e => e.onclick = () => { S.filt = e.dataset.f; NE.Audio.play('ui'); UI.render.wardrobe(b); });
  b.querySelectorAll('.w2-card').forEach(e => e.onclick = () => { S.sel = e.dataset.id; NE.Audio.play('ui'); UI.render.wardrobe(b); });
  const eb = b.querySelector('[data-eq]'); if (eb) eb.onclick = () => { M.equipped[eqKey] = sel.id; g.save(); NE.Audio.play('buy'); const p = g.player; if (p) { p.packCol = (NE.BACKPACKS.find(x => x.id === M.equipped.backpack) || NE.BACKPACKS[0]).col; const of = NE.OUTFITS.find(x => x.id === M.equipped.outfit) || NE.OUTFITS[0]; p.shirt = of.random ? surv.look.shirt : of.shirt; p.pants = of.random ? surv.look.pants : of.pants; } UI.render.wardrobe(b); };
  const bb = b.querySelector('[data-buy]'); if (bb) bb.onclick = () => { if (M.scrap < sel.price) return NE.Audio.play('deny'); M.scrap -= sel.price; M.unlocked[S.tab].push(sel.id); g.save(); NE.Audio.play('buy'); UI.toast && UI.toast('Unlocked ' + sel.name + '.'); UI.render.wardrobe(b); };
};
})(window.NE);

// =====================================================================================================================
// CO-OP PARTY HUD: your partner's health, blood and stamina under your portrait, plus a bar over their head
// =====================================================================================================================
(function (NE) {
'use strict';
const G = NE.G, UI = NE.UI; const $ = s => document.querySelector(s); const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
if (!document.getElementById('party-css')) { const st = document.createElement('style'); st.id = 'party-css'; st.textContent = `
#party{position:absolute;left:0;right:0;top:calc(100% + .5em);display:flex;flex-direction:column;gap:.35em;pointer-events:none}
#party .pm{padding:.3em .35em;border-radius:.5em;border:1px solid rgba(255,210,90,.25);background:linear-gradient(160deg,rgba(40,30,18,.88),rgba(14,10,8,.88));box-shadow:0 .2em .6em rgba(0,0,0,.5)}
#party .pm.down{border-color:rgba(255,90,60,.7);animation:pmPulse 1s infinite}#party .pm.dead{opacity:.6;filter:grayscale(.8)}
@keyframes pmPulse{50%{box-shadow:0 0 .8em rgba(255,60,40,.6)}}
#party .pn{display:flex;justify-content:space-between;align-items:baseline;font-family:'VT323',monospace;font-size:.8em;color:#f0e6c8;white-space:nowrap;overflow:hidden}
#party .pn small{color:#c8b890;font-size:.85em}#party .bars{display:flex;flex-direction:column;gap:2px;margin-top:2px}
#party .pbar{height:.42em;background:rgba(255,255,255,.08);border-radius:1em;overflow:hidden;position:relative}#party .pbar i{display:block;height:100%;border-radius:1em;transition:width .25s}
#party .tags{display:flex;flex-wrap:wrap;gap:2px;margin-top:3px}#party .tags span{font-family:'VT323',monospace;font-size:.6em;padding:0 .35em;border-radius:1em;background:rgba(255,80,60,.14);color:#ff8a7a}
#party .tags span.ok{background:rgba(120,220,120,.1);color:#9ae09a}
.ptag{position:absolute;transform:translate(-50%,-100%);pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:1px}
.ptag b{font-family:'VT323',monospace;font-weight:normal;font-size:.72em;color:#ffe2a0;text-shadow:1px 1px 0 #000,0 0 4px #000;white-space:nowrap}
.ptag .pbar{width:2.6em;height:.28em;background:rgba(0,0,0,.6);border:1px solid rgba(0,0,0,.8);border-radius:1em;overflow:hidden}.ptag .pbar i{display:block;height:100%}
.ptag.down b{color:#ff7a6a}`; document.head.appendChild(st); }
const col = k => k > 0.6 ? '#7ad07a' : k > 0.3 ? '#e0c050' : '#e05040';
UI.partyHud = function () {
  const g = G, N = g.net, run = g.state === 'run' || g.state === 'dying' || g.state === 'burst';
  let box = $('#party'); const port = $('#portrait');
  const peer = N && N.on && N.peer && !N.peer.hidden ? N.peer : null; const show = run && peer && port;
  if (!show) { if (box) box.innerHTML = ''; const t = $('#ptag'); if (t) t.style.display = 'none'; return; }
  if (!box) { box = document.createElement('div'); box.id = 'party'; port.appendChild(box); }
  const m = N.peerMed || {}; const s = N.peerSurv || {}; const alive = peer.alive && m.al !== 0; const down = alive && m.u === 1;
  const hp = m.hp != null ? m.hp / 100 : 1, bl = m.b != null ? m.b / 5000 : 1, st = m.st != null ? m.st / 100 : 1;
  const dy = Math.round((peer.y - g.player.y) / NE.T * NE.MPT); const where = Math.abs(dy) < 6 ? (Math.abs(peer.x - g.player.x) < 40 ? 'here' : (peer.x > g.player.x ? '→ ' : '← ') + Math.round(Math.abs(peer.x - g.player.x) / NE.T) + 't') : (dy > 0 ? '↓' : '↑') + Math.abs(dy) + 'm';
  const tags = []; if (!alive) tags.push('<span>DEAD</span>'); else { if (down) tags.push('<span>DOWN — revive!</span>'); if (m.bl > 0.05) tags.push('<span>bleeding ' + m.bl + '/s</span>'); for (const c of (m.cond || [])) if (!/bleeding/i.test(c) && tags.length < 4) tags.push('<span>' + esc(c) + '</span>'); if (tags.length === 0) tags.push('<span class="ok">stable</span>'); }
  const html = '<div class="pm' + (down ? ' down' : '') + (alive ? '' : ' dead') + '"><div class="pn"><span>' + esc(s.first || s.name || 'Partner') + '</span><small>' + where + '</small></div><div class="bars">' +
    '<div class="pbar" title="Health"><i style="width:' + Math.round(hp * 100) + '%;background:' + col(hp) + '"></i></div>' +
    '<div class="pbar" title="Blood"><i style="width:' + Math.round(bl * 100) + '%;background:#c03030"></i></div>' +
    '<div class="pbar" title="Stamina"><i style="width:' + Math.round(st * 100) + '%;background:#4ab0a0"></i></div></div><div class="tags">' + tags.join('') + '</div></div>' +
    (g.minion && g.minion.alive && g.minion.anat ? '<div class="pm"><div class="pn"><span>Brood minion</span><small>' + Math.round(g.minion.anat.parts.torso.hp) + 'hp</small></div></div>' : '');
  if (box._h !== html) { box._h = html; box.innerHTML = html; }
};
// tag over the partner's head: name + health
UI.partyTag = function () {
  const g = G, N = g.net; const peer = N && N.on && N.peer && !N.peer.hidden && N.peer.alive && (g.state === 'run' || g.state === 'burst') ? N.peer : null;
  let t = $('#ptag'); if (!peer) { if (t) t.style.display = 'none'; return; }
  if (!t) { t = document.createElement('div'); t.id = 'ptag'; t.className = 'ptag'; t.innerHTML = '<b></b><div class="pbar"><i></i></div>'; $('#hud').appendChild(t); }
  const m = N.peerMed || {}; const hp = m.hp != null ? m.hp / 100 : 1; const sp = UI.toScreen(peer.x, peer.y - (peer.h || 23) - 5);
  t.style.display = ''; t.style.left = sp.x + 'px'; t.style.top = sp.y + 'px'; t.classList.toggle('down', m.u === 1);
  const nm = (N.peerSurv && (N.peerSurv.first || N.peerSurv.name)) || 'Partner'; const lbl = m.u === 1 ? nm + ' — DOWN' : nm; if (t.firstChild.textContent !== lbl) t.firstChild.textContent = lbl;
  const i = t.querySelector('i'); i.style.width = Math.round(hp * 100) + '%'; i.style.background = col(hp);
};
const tick0 = UI.tick;
UI.tick = function (dt) { tick0.call(this, dt); UI._pt = (UI._pt || 0) - dt; if (UI._pt <= 0) { UI._pt = 0.12; try { UI.partyHud(); } catch (e) { } } try { UI.partyTag(); } catch (e) { } };
})(window.NE);
