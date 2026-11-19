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
  grap: ['.g...g..', '..g.g...', '...g....', '...g....', '...B....', '....B...', '.....BB.', '.......B'],
  hook: ['....kk..', '...k..k.', '......k.', '.....k..', '....X...', '...XX...', '..XXX...', '..XX....'],
  aarm: ['.yy.....', 'yrry....', '.yyXy...', '..yXXy..', '...yrXy.', '....yXXy', '.....yry', '......y.'],
  aleg: ['..yyy...', '..yry...', '..yXy...', '..yyy...', '...yr...', '...yX...', '...yX...', '.yyyyy..'],
  saw: ['........', 'bbb.....', 'bBbgggg.', 'bbbwwwwg', '...gkgkg', '....k.k.', '........', '........'],
  hood: ['..XXXX..', '.XXXXXX.', 'XXkkkkXX', 'XkwkwkkX', 'XkkkkkkX', '.XXkkXX.', '..XXXX..', '........'],
  plate: ['.XX..XX.', 'XXXXXXXX', 'XwXXXXwX', 'XXXXXXXX', '.XXXXXX.', '.XXwwXX.', '.XXXXXX.', '..X..X..'],
  divehelm: ['..yyyy..', '.yyyyyy.', 'yykkkkyy', 'yklllkyy', 'ykllkkyy', 'yykkkkyy', '.yyyyyy.', '..y..y..'],
});

// ======================================================================= ITEMS
const IT = NE.ITEMS; NE._origItems = new Set(Object.keys(IT));
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
  IT[id] = { name, icon: kind === 'saw' ? 'saw' : kind === 'peg' ? (slot === 'leg' ? 'peg' : 'hook') : kind === 'art' ? (slot === 'leg' ? 'aleg' : 'aarm') : slot === 'leg' ? 'pleg' : 'parm', col, w: kind === 'peg' ? 1.2 : kind === 'metal' || kind === 'saw' ? 2.4 : 1.6, cat: 'tool', prost: { kind, slot, eff }, value: kind === 'art' ? 260 : kind === 'saw' ? 120 : Math.round(eff * 70), desc: desc + ' Fits a ' + slot + ' stump: ' + Math.round(eff * 100) + '% function' + (kind === 'saw' ? ', ' + NE.SAW_DMG[id] + ' sharp damage unarmed.' : '.') + (kind === 'peg' && slot === 'arm' ? ' The hook doubles as a grappling hook: press [Z].' : '') };
  NE.ISIZE[id] = slot === 'leg' ? [1, 3] : [1, 2];
}
IT.grapple = { name: 'Grappling Hook', icon: 'grap', col: '#8a8e94', w: 1.4, cat: 'tool', value: 60, desc: 'Press [Z] to fire it at the rock above you and haul yourself up. Press again or jump to let go.' }; NE.ISIZE.grapple = [2, 2];
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
  { id: 'hulking', pre: 'Hulking', w: 2, min: 250, fn: e => { for (const k in e.anat.parts) { const P = e.anat.parts[k]; P.max *= 1.6; P.hp = P.max; } e.speedMul *= 0.9; e.anat.blood = 4800; } },
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
  if (!town && f > 0) NE.sculptFloor(this, fl);
  // register every liquid cell in this band with the flow simulation
  this.liq = this.liq || new Map(); this.liqGen = this.liqGen || new Map();
  for (let r = y0; r < y0 + FH; r++) for (let x = 0; x < this.W; x++) { const t = this.get(x, r); if (LIQ[t]) { const k = r * this.W + x; this.liq.set(k, { a: 1, t }); this.liqGen.set(k, t); } }
  // liquid state that was saved (or sent by the co-op host) before this band existed
  if (this.liqPending && this.liqPending.size) for (const [k, v] of this.liqPending) { const r = Math.floor(k / this.W); if (r >= y0 && r < y0 + FH) { this.liqSet(k, v[0], v[1]); this.liqPending.delete(k); } }
  return fl;
};

// ----------------------------------------------------------------------- terrain sculpting: every level gets its own shape
// After the base cave is carved, each level picks a character (rolling hills, a tall chamber, cramped tunnels, a pillared hall,
// rubble fields, big overhangs...) and a handful of set-pieces, all from the run's seed — so no two runs look alike.
NE.FLOOR_STYLES = [['hills', 3], ['chamber', 2], ['cramped', 1.5], ['pillars', 2], ['rubble', 2], ['overhangs', 2], ['terraces', 1.5], ['plain', 1.2]];
NE.sculptFloor = function (W, fl) {
  const FH = NE.FH, y0 = fl.y0, Wd = W.W, g = fl.g, c = fl.c; const B = fl.biome.id;
  const busyX = new Set(); const mark = (px, pad) => { const tx = Math.floor(px / T); for (let d = -pad; d <= pad; d++) busyX.add(tx + d); };
  for (const o of fl.objs) if (o.x != null) mark(o.x, o.type === 'lamp' || o.type === 'crystal' || o.type === 'icicle' || o.type === 'gasleak' ? 0 : 2); for (const sp of fl.spawns) mark(sp.x, 1);
  const solid = (x, r) => W.solid(W.get(x, y0 + r)); const air = (x, r) => W.get(x, y0 + r) === 0;
  // a span is safe to reshape when nothing sits on it and it's ordinary floor (not a pit, chute, pool or ladder)
  const okCol = x => x > 5 && x < Wd - 6 && !busyX.has(x) && solid(x, g[x]) && air(x, g[x] - 1) && air(x, g[x] - 2) && solid(x, g[x] + 1);
  const span = (w, tries) => { for (let k = 0; k < (tries || 30); k++) { const x = ri(6, Wd - 7 - w); let ok = true; for (let i = -1; i <= w; i++) if (!okCol(x + i) || Math.abs(g[x + i] - g[x]) > 1) { ok = false; break; } if (ok) { for (let i = -1; i <= w; i++) busyX.add(x + i); return x; } } return -1; };
  const setT = (x, r, v) => { if (r < 0 || r >= FH) return; W.set(x, y0 + r, v); };
  const rock = B === 'ice' && chance(0.3) ? 10 : 1;
  const P = {
    mound: () => { const w = ri(5, 11), x = span(w); if (x < 0) return; const h = ri(1, 3); for (let i = 0; i < w; i++) { const k = Math.sin(Math.PI * (i + 0.5) / w); const hh = Math.max(i === 0 || i === w - 1 ? 0 : 1, Math.round(h * k)); for (let r = g[x + i] - hh; r < g[x + i]; r++) setT(x + i, r, 1); g[x + i] -= hh; } },
    basin: () => { const w = ri(4, 9), x = span(w); if (x < 0) return; const d = ri(1, 2); const wet = ['grotto', 'ice', 'drowned', 'ossuary'].includes(B) && chance(0.6); for (let i = 0; i < w; i++) { const dd = i === 0 || i === w - 1 ? 1 : d; for (let r = g[x + i]; r < g[x + i] + dd; r++) { if (!solid(x + i, r + 1) && r + 1 < FH) break; setT(x + i, r, wet && r >= g[x + i] + dd - 1 ? (B === 'ice' && chance(0.5) ? 10 : 5) : 0); } } },
    overhang: () => { const w = ri(4, 9), x = span(w, 20); if (x < 0) return; for (let i = 0; i < w; i++) { const k = Math.sin(Math.PI * (i + 0.5) / w); const bottom = Math.min(g[x + i] - 5, c[x + i] + Math.round(k * ri(2, 5))); for (let r = c[x + i]; r < bottom; r++) setT(x + i, r, rock); if (bottom > c[x + i]) c[x + i] = bottom; } },
    pillar: () => { const x = span(2, 20); if (x < 0) return; const tun = 4; for (let i = 0; i < 2; i++) for (let r = Math.max(0, c[x + i]); r < g[x + i] - tun; r++) setT(x + i, r, rock); if (chance(0.5)) setT(x - 1, g[x - 1] - tun - 1, rock); },
    boulder: () => { const w = ri(2, 3), x = span(w, 20); if (x < 0) return; const h = w === 3 ? 2 : 1; for (let i = 0; i < w; i++) { const hh = (i === 0 || i === w - 1) && w === 3 ? 1 : h; for (let r = g[x + i] - hh; r < g[x + i]; r++) setT(x + i, r, rock); g[x + i] -= hh; } },
    chamber: () => { const w = ri(10, 18), x0 = ri(6, Wd - 7 - w); for (let i = 0; i < w; i++) { const x = x0 + i; if (busyX.has(x)) continue; const top = Math.max(0, c[x] - ri(1, 3)); for (let r = top; r < c[x]; r++) if (W.get(x, y0 + r) === 1) setT(x, r, 0); c[x] = top; } for (let k = 0; k < ri(2, 5); k++) { const x = x0 + ri(1, w - 2); const L = ri(2, 4); for (let r = c[x]; r < Math.min(g[x] - 5, c[x] + L); r++) setT(x, r, rock); } },
    cramped: () => { const w = ri(8, 16), x = span(w, 20); if (x < 0) return; for (let i = 0; i < w; i++) { const low = g[x + i] - (i % 7 === 3 ? 6 : 5); for (let r = c[x + i]; r < low; r++) setT(x + i, r, 1); c[x + i] = Math.max(c[x + i], low); } },
    terrace: () => { const w = ri(6, 10), x = span(w); if (x < 0) return; const up = chance(0.5); for (let i = 0; i < w; i++) { const hh = Math.min(2, Math.floor((up ? i : w - 1 - i) / 3) + 1); for (let r = g[x + i] - hh; r < g[x + i]; r++) setT(x + i, r, 1); g[x + i] -= hh; } },
    shards: () => { if (B !== 'crystal' && B !== 'heart') return; const w = ri(3, 5), x = span(w); if (x < 0) return; for (let i = 0; i < w; i++) setT(x + i, g[x + i] - 1, 4); },
    spikes: () => { const w = ri(3, 6), x = span(w, 12); if (x < 0) return; for (let i = 0; i < w; i += 2) if (c[x + i] + 2 < g[x + i] - 5) { setT(x + i, c[x + i], rock); setT(x + i, c[x + i] + 1, rock); } },
  };
  const style = NE.wpick(NE.FLOOR_STYLES); fl.style = style;
  const plan = { hills: ['mound', 'mound', 'basin', 'mound', 'terrace'], chamber: ['chamber', 'boulder', 'spikes', 'mound'], cramped: ['cramped', 'cramped', 'boulder', 'basin'], pillars: ['pillar', 'pillar', 'pillar', 'boulder'], rubble: ['boulder', 'boulder', 'boulder', 'mound', 'basin'], overhangs: ['overhang', 'overhang', 'basin', 'spikes'], terraces: ['terrace', 'terrace', 'mound'], plain: ['basin'] }[style];
  for (const k of plan) P[k](); for (let n = ri(1, 3); n > 0; n--) P[pick(['mound', 'basin', 'overhang', 'boulder', 'pillar', 'spikes', 'shards', 'terrace'])]();
  for (const d of fl.decor) d.y = W.groundY(fl, d.x);
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
const SHAPED = new Set(['bindle', 'chest', 'basket', 'sack', 'cart', 'box', 'coffin', 'urn', 'crate', 'body', 'geode', 'cell', 'pod2', 'cocoon', 'barrel', 'skulls', 'locker']);
G.drawObj = function (ctx, o) {
  if (o.type !== 'container' || !NE.CONTAINERS[o.ct] || ['crate', 'locker', 'cabinet', 'duffel', 'bag', 'weaponchest', 'stash', 'pod', 'corpse'].includes(o.ct) || !SHAPED.has(NE.CONTAINERS[o.ct].shape)) return drawObj0(ctx, o);
  const C = NE.CONTAINERS[o.ct], c = C.col || '#777', x = Math.round(o.x), y = Math.round(o.y), op = o.searched; const R = (a, b, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x + a, y + b, w, h); }; const D = s => NE.shade(c, s);
  switch (C.shape) {
    case 'chest': R(-7, -8, 14, 8, D(0.5)); R(-6, -7, 12, 7, c); R(-6, -7, 12, 2, D(1.2)); R(-6, -5, 12, 1, D(0.6)); R(-7, -7, 1, 7, '#8a8a80'); R(6, -7, 1, 7, '#8a8a80'); R(-1, -5, 2, 2, o.locked ? '#e0c050' : '#5a5040'); if (op) R(-6, -10, 12, 2, D(0.8)); break;
    case 'basket': R(-5, -6, 10, 6, D(0.6)); for (let i = 0; i < 5; i++) R(-4 + i * 2, -5, 1, 5, D(1.15)); R(-5, -6, 10, 1, D(1.3)); if (!op) { R(-3, -8, 2, 2, '#a04a30'); R(0, -8, 3, 2, '#c8a050'); } break;
    case 'bindle': { // a rolled bedroll on the ground, a walking stick propped against it with a patched cloth bundle tied to the end
      R(-9, -4, 9, 4, '#3e4a2c'); R(-9, -4, 9, 1, '#5e6e44'); R(-9, -3, 1, 3, '#2e3820'); R(-1, -3, 1, 3, '#2e3820'); R(-7, -4, 1, 4, '#4a3018'); R(-4, -4, 1, 4, '#4a3018'); R(-9, -1, 9, 1, '#2a3218');
      for (let i = 0; i <= 9; i++) { const sx = -2 + i, sy = -1 - Math.round(i * 1.45); R(sx, sy - 1, 1, 2, '#7a5230'); if (i % 3 === 0) R(sx, sy, 1, 1, '#4a3018'); }
      if (!op) { R(3, -12, 7, 6, c); R(4, -13, 5, 1, c); R(4, -6, 5, 1, D(0.65)); R(2, -11, 1, 4, D(0.6)); R(10, -11, 1, 4, D(0.6)); R(4, -12, 3, 1, D(1.3)); R(3, -10, 1, 2, D(1.15));
        R(7, -10, 2, 2, '#5a7a8a'); R(7, -10, 1, 1, '#7a9aaa'); R(6, -8, 1, 1, '#d8ccb0'); R(5, -14, 3, 1, D(0.75)); R(4, -15, 1, 1, D(0.75)); R(8, -15, 1, 1, D(0.75)); R(6, -15, 1, 1, '#4a3018'); }
      else { R(3, -7, 7, 2, D(0.7)); R(2, -6, 9, 1, D(0.55)); }
      R(7, -15, 1, 2, '#7a5230'); break; }
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
NE.Player.prototype.dash = function (mx) { const cd = this.dashCD; dash0.call(this, mx); if (this.abil && this.abil.includes('tendons') && this.dashCD > 0 && !(cd > 0)) { this.anat.stam += 7 * this.stats.staminaCost; this.dashCD = 0.45; } };
NE.Player.prototype.grapple = function () {
  const g = this.g; if (this.hook) { this.hook = null; NE.Audio.play('cloth', 0.6); return; }
  const hookArm = ['rarm', 'larm'].find(k => { const P = this.anat.parts[k]; return P.severed && P.prost && /^peg_arm/.test(P.prost.id); });
  if (!hookArm && !this.inv.has('grapple')) { g.toast('You need a Grappling Hook (or a Hook Arm).'); NE.Audio.play('deny'); return; }
  if ((!hookArm && this.anat.armFactor() < 0.35) || this.anat.uncon || this.rd) return g.toast('Your arms can\'t throw it.');
  let dx = g.mouse.wx - this.x, dy = g.mouse.wy - (this.y - this.h + 6); const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L; if (dy > -0.15) { dy = -0.5; const l2 = Math.hypot(dx, dy); dx /= l2; dy /= l2; }
  this.hook = { x: this.x, y: this.y - this.h + 6, vx: dx * (hookArm ? 480 : 420), vy: dy * (hookArm ? 480 : 420), att: false, len: 0, t: 0, arm: hookArm || null }; NE.Audio.play('whoosh', 0.8); this.climbing = false;
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
  if (p && A && p.abil && p.abil.includes('molt') && R && !R.molted && A.parts.head.hp > 0 && A.org.brain > 0) { R.molted = true; A.dead = false; A.cause = ''; A.blood = Math.max(A.blood, 2080); for (const k in A.org) A.org[k] = Math.max(A.org[k], 25); A.cons = 40; A.uncon = false; A.drugs.adrenaline = 1; for (const k of NE.PARTS) { const P = A.parts[k]; P.wounds = P.wounds.filter(w => w.closed); P.hp = Math.max(P.hp, P.max * 0.3); }
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
  G.updateCproj(dt);
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
.w2-top{display:flex;gap:6px;align-items:center}.w2-ico{width:calc(32px*var(--us,1));height:calc(32px*var(--us,1));image-rendering:pixelated;flex:none}.w2-ico.big{width:calc(48px*var(--us,1));height:calc(48px*var(--us,1))}
.w2-card .sw{height:calc(10px*var(--us,1));display:flex;gap:2px;flex:1;align-self:flex-end;margin-bottom:2px}.w2-card .sw i{flex:1;display:block}
.w2-card b{font-size:.92em}.w2-card small{opacity:.7;font-size:.8em}.w2-card .tag{position:absolute;top:3px;right:4px;font-size:.72em;color:#7ad07a}
.w2-det{border:1px solid rgba(232,226,208,.18);background:rgba(0,0,0,.28);padding:8px;display:flex;flex-direction:column;gap:6px;overflow:auto}
.w2-det .st{display:flex;justify-content:space-between;border-bottom:1px dashed rgba(232,226,208,.12);padding:2px 0}
`; document.head.appendChild(st); }
const packCells = o => Math.max(4, 4 + Math.floor((o.slots + 8 - 20) / 3)) * 8;
UI.render.wardrobe = function (b) {
  const g = G(), M = g.meta, surv = M.survivor; UI.w2 = UI.w2 || { tab: 'backpacks', filt: 'all', sel: null };
  const S = UI.w2; const list = S.tab === 'backpacks' ? NE.BACKPACKS : NE.OUTFITS; const eqKey = S.tab === 'backpacks' ? 'backpack' : 'outfit';
  const owned = o => M.unlocked[S.tab].includes(o.id) || !o.unlock && !o.price;
  const shown = list.filter(o => S.filt === 'all' || (S.filt === 'owned' ? owned(o) : !owned(o)));
  const sel = list.find(o => o.id === S.sel) || list.find(o => o.id === M.equipped[eqKey]) || list[0]; S.sel = sel.id;
  const sw = o => S.tab === 'backpacks' ? '<i style="background:' + o.col[0] + '"></i><i style="background:' + o.col[1] + ';flex:.4"></i>' : (o.random ? '<i style="background:linear-gradient(90deg,#6a5a40,#3a4a60,#5a3a3a)"></i>' : '<i style="background:' + o.shirt + '"></i><i style="background:' + o.pants + '"></i>');
  const ico = o => '<img class="pix w2-ico" src="' + NE.iconURL((S.tab === 'backpacks' ? 'bp_' : 'of_') + o.id, null, 4) + '">';
  const card = o => { const un = owned(o), eq = M.equipped[eqKey] === o.id; return '<div class="w2-card' + (o.id === S.sel ? ' sel' : '') + (un ? '' : ' lock') + '" data-id="' + o.id + '"><div class="w2-top">' + ico(o) + '<div class="sw">' + sw(o) + '</div></div><b>' + esc(o.name) + '</b><small>' + (S.tab === 'backpacks' ? packCells(o) + ' cells • ' + (o.carry + 6) + 'kg' : esc((o.desc || '').split('.')[0])) + '</small>' + (eq ? '<span class="tag">WORN</span>' : un ? '' : '<span class="tag" style="color:#e0b040">🔒</span>') + '</div>'; };
  const un = owned(sel), eq = M.equipped[eqKey] === sel.id;
  let det = '<div style="display:flex;gap:8px;align-items:center">' + ico(sel).replace('w2-ico', 'w2-ico big') + '<h3 style="margin:0">' + esc(sel.name) + '</h3></div><div class="dim">' + esc(sel.desc || '') + '</div>';
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
  const hp = m.hp != null ? m.hp / 100 : 1, bl = m.b != null ? m.b / NE.BLOOD : 1, st = m.st != null ? m.st / 100 : 1;
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

// =====================================================================================================================
// BACKPACK & OUTFIT ICONS: atlas art where it exists, hand-drawn 16x16 pixel icons for everything else
// =====================================================================================================================
(function (NE) {
'use strict';
const cache = {};
const BP = ['................', '.....oooooo.....', '....o222222o....', '...o2bbbbbb2o...', '..o0hhhhhhhh0o..', '..o0hmmmmmmm0o..', '..o0hmmmmmmmdo..', '..o0hmmmmmmmdo..', '..o0hpppppppdo..', '..o0hpm11mpddo..', '..o0hpmmmmpddo..', '..o0hpppppppdo..', '..o0hmmmmmmmdo..', '...odddddddddo..', '....oooooooo....', '................'];
const OF = ['................', '.....oo..oo.....', '...ooshhhhsoo...', '..oshhssssssso..', '.osssssssssssso.', '.oss.osssssoss..', '.oo..osssssoo...', '.....osssssso...', '.....obbbbbbo...', '.....opppPppo...', '.....opppPppo...', '.....oppo.oppo..', '.....oppo.oppo..', '.....oppo.oppo..', '.....okko.okko..', '................'];
const draw = (rows, pal, sc) => { const c = document.createElement('canvas'); c.width = c.height = 16 * sc; const x = c.getContext('2d');
  for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const ch = rows[j][i]; if (ch === '.' || !pal[ch]) continue; x.fillStyle = pal[ch]; x.fillRect(i * sc, j * sc, sc, sc); } return c; };
NE.gearIcon = function (key, scale) {
  const sc = Math.max(1, Math.round((scale || 4) / 2)); const ck = key + '|' + sc; if (cache[ck]) return cache[ck];
  let c = null;
  if (key.startsWith('bp_')) { const b = NE.BACKPACKS.find(x => 'bp_' + x.id === key); if (b) { const a = b.col[0], s = b.col[1]; c = draw(BP, { o: '#140e0a', 0: NE.shade(a, 0.7), 2: NE.shade(s, 0.7), b: s, h: NE.shade(a, 1.3), m: a, d: NE.shade(a, 0.68), p: NE.shade(a, 0.86), 1: '#e0d0a0' }, sc); } }
  else if (key.startsWith('of_')) { const o = NE.OUTFITS.find(x => 'of_' + x.id === key); if (o) { const sh = o.random ? '#7a6a50' : o.shirt, pa = o.random ? '#4a4a5a' : o.pants; c = draw(OF, { o: '#140e0a', s: sh, h: NE.shade(sh, 1.25), b: '#2a2018', p: pa, P: NE.shade(pa, 0.7), k: '#1c1612' }, sc); } }
  if (c) cache[ck] = c; return c;
};
const icon0 = NE.icon;
NE.icon = function (key, col, scale, itemId) { if (typeof key === 'string' && (key.startsWith('bp_') || key.startsWith('of_')) && !NE.atlasKey(key)) { const c = NE.gearIcon(key, scale); if (c) return c; } return icon0.call(this, key, col, scale, itemId); };
})(window.NE);

// =====================================================================================================================
// NPC SPEECH BUBBLES: whatever someone says floats above their own head (crisp DOM text that follows them)
// =====================================================================================================================
(function (NE) {
'use strict';
const G = NE.G, UI = NE.UI; const { pick, chance } = NE;
if (!document.getElementById('nsay-css')) { const st = document.createElement('style'); st.id = 'nsay-css'; st.textContent = `
.nsay{position:absolute;transform:translate(-50%,-100%);pointer-events:none;max-width:16em;text-align:center;color:#f4ead0;font-size:.82em;line-height:1.15;padding:.25em .55em;border-radius:.5em;background:rgba(14,10,8,.82);border:1px solid rgba(255,210,120,.28);box-shadow:0 .15em .5em rgba(0,0,0,.6);transition:opacity .25s;z-index:5}
.nsay:after{content:'';position:absolute;left:50%;bottom:-.42em;transform:translateX(-50%);border:.4em solid transparent;border-top-color:rgba(14,10,8,.82);border-bottom:0}
.nsay.hostile{border-color:rgba(255,90,60,.45);color:#ffd8c8}.nsay.hostile b{color:#ff8a6a}
.nsay b{display:block;font-weight:normal;font-family:'VT323',monospace;font-size:.85em;color:#e8c070;margin-bottom:1px}`; document.head.appendChild(st); }
const live = new Map(); // speaker -> {el, t, max}
G.npcSay = function (a, text, dur) {
  if (!a || !text) return; dur = dur || 3; let s = live.get(a); const hud = document.getElementById('hud'); if (!hud) return;
  if (!s) { const el = document.createElement('div'); el.className = 'nsay'; hud.appendChild(el); s = { el }; live.set(a, s); }
  const name = a.name || (a.D && a.D.name) || (a.label && a.label.split(' — ')[0]) || '';
  s.el.innerHTML = (name ? '<b>' + String(name).replace(/[<>&]/g, '') + '</b>' : '') + String(text).replace(/[<>&]/g, '');
  s.el.classList.toggle('hostile', !!(a.D && a.hostile !== false && a.faction !== 'neutral')); s.t = dur; s.max = dur; s.el.style.opacity = 1;
  if (G.run) G.run.log.push({ t: G.run.t, m: (name ? name + ': ' : '') + '"' + text + '"', cls: 'sys' });
};
G.npcSayTick = function (dt) {
  for (const [a, s] of live) {
    s.t -= dt; const gone = s.t <= 0 || a.gone || (a.alive === false && s.t < s.max - 0.5) || G.state === 'lobby' && !a.town;
    if (gone) { s.el.style.opacity = 0; if (s.t < -0.3 || a.gone) { s.el.remove(); live.delete(a); } continue; }
    const h = a.h || 23; const sp = UI.toScreen(a.x, (a.y != null ? a.y : 0) - h - 6); s.el.style.left = sp.x + 'px'; s.el.style.top = sp.y + 'px'; s.el.style.opacity = Math.min(1, s.t * 2);
  }
};
const tick0 = UI.tick; UI.tick = function (dt) { tick0.call(this, dt); try { G.npcSayTick(dt); } catch (e) { } };
const clear0 = G.clearWorld; G.clearWorld = function () { for (const [, s] of live) s.el.remove(); live.clear(); return clear0.apply(this, arguments); };

// barks: people who spot you say so; executioners announce themselves
const BARK = { scav: ['There!', 'Fresh meat.', 'Your pack. Now.', 'Get it!'], gunner: ['Contact!', 'Drop it!', 'Got eyes on one.'], specops: ['Hostile, twelve o\'clock.', 'Engaging.', 'Infected host — put it down.'], expedition: ['Stay back! STAY BACK!', 'You\'re not taking us!', 'It\'s one of THEM!'],
  rival: ['Your Vespa is mine.', 'Two of us can\'t live down here.', 'I can smell your nectar.'], nectarknight: ['Kneel to the Hive.', 'You are not worthy of it.', 'Give me your nectar.'], drowned: ['...bbblh...', 'Down... with us...'], bonewalker: ['...', 'Rest... no...'], skulker: ['hehh...'], brute: ['RAAAGH!', 'SMASH.'] };
const aggro0 = NE.Enemy.prototype.onAggro;
NE.Enemy.prototype.onAggro = function (src) { const was = this.state === 'chase'; aggro0.call(this, src); if (!was && this.state === 'chase' && src && (src.isPlayer || src.isRemote) && BARK[this.type] && chance(0.55) && !this._barked) { this._barked = true; G.npcSay(this, pick(BARK[this.type]), 2.2); } };
const upd0 = NE.Enemy.prototype.update;
NE.Enemy.prototype.update = function (dt) {
  // standoff crew that got paid (or talked down): turn and walk off into the dark, then they're gone
  if (this.leaving && this.alive) { const L = this.leaving; L.t -= dt; this.facing = L.dir; this.fallHurt(this.physicsMove(dt, { mx: L.dir * 0.7 })); NE.Combat.tick(this, dt, this.x + L.dir * 14, this.y + 2, false); const p = G.player; if (L.t <= 0 || (p && Math.abs(p.x - this.x) > 260) || this.bumped) { if (L.t <= 0 || (p && Math.abs(p.x - this.x) > 200)) this.gone = true; else L.dir *= -1; this.bumped = 0; } return; }
  upd0.call(this, dt);
  if (this.exec && !this._execSaid && this.target && this.target.isPlayer) { this._execSaid = true; G.npcSay(this, pick(['Stay down.', 'Nothing personal.', 'Sleep.', 'This ends here.']), 3); } else if (!this.exec) this._execSaid = false;
};
// survivors and traders speak for themselves
const surv0 = UI.survivor; UI.survivor = function (npc) { if (npc && !npc.treated) G.npcSay(npc, 'Please... I\'m bleeding out.', 3); return surv0.call(this, npc); };
const doc0 = UI.doctor; UI.doctor = function (npc) { G.npcSay(npc, pick(['Sit. Let me look at you.', 'You look like hell. Where does it hurt?', 'I\'ve stitched worse. Probably.']), 3.5); return doc0.call(this, npc); };
const open0 = UI.open; UI.open = function (name, arg) { if (name === 'trade' && arg && arg.alive !== false) G.npcSay(arg, pick(['Silver talks. Show me what you\'ve got.', 'Everything has a price down here.', 'Buying, selling. No questions.', 'Mind the merchandise.']), 3.5); return open0.apply(this, arguments); };
})(window.NE);

// =====================================================================================================================
// SOUND REWORK: natural, filtered foley instead of raw square/saw beeps. Pink & brown noise, pitch-dropping body thumps,
// inharmonic metal rings, a cave reverb send and a soft compressor glue everything together. Every play varies a little.
// =====================================================================================================================
(function (NE) {
'use strict';
const A = NE.Audio; if (!A) return;
const R = (a, b) => a + Math.random() * (b - a);
let PINK = null, BROWN = null, WHITE = null, VERB = null;
function buffers(c) {
  const n = c.sampleRate * 2; WHITE = c.createBuffer(1, n, c.sampleRate); PINK = c.createBuffer(1, n, c.sampleRate); BROWN = c.createBuffer(1, n, c.sampleRate);
  const w = WHITE.getChannelData(0), p = PINK.getChannelData(0), br = BROWN.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  for (let i = 0; i < n; i++) { const x = Math.random() * 2 - 1; w[i] = x; b0 = 0.99886 * b0 + x * 0.0555179; b1 = 0.99332 * b1 + x * 0.0750759; b2 = 0.969 * b2 + x * 0.153852; b3 = 0.8665 * b3 + x * 0.3104856; b4 = 0.55 * b4 + x * 0.5329522; b5 = -0.7616 * b5 - x * 0.016898; p[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362) * 0.11; b6 = x * 0.115926; last = (last + 0.02 * x) / 1.02; br[i] = last * 3.5; }
}
// route: sfx input -> gentle EQ -> compressor -> old sfx gain (volume setting) ; plus a short cave-reverb send
function chain() {
  const c = A.ctx; if (!c || A._chain) return; A._chain = true; buffers(c);
  const out = A.sfx; const inp = c.createGain(); inp.gain.value = out.gain.value; out.gain.value = 1;
  const lo = c.createBiquadFilter(); lo.type = 'highpass'; lo.frequency.value = 35; const hi = c.createBiquadFilter(); hi.type = 'highshelf'; hi.frequency.value = 6000; hi.gain.value = -5;
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.16;
  inp.connect(lo); lo.connect(hi); hi.connect(comp); comp.connect(out);
  const len = Math.floor(c.sampleRate * 1.3); const ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) { const t = i / len; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.2) * (i < c.sampleRate * 0.012 ? 0 : 1); } }
  VERB = c.createConvolver(); VERB.buffer = ir; const vf = c.createBiquadFilter(); vf.type = 'lowpass'; vf.frequency.value = 3200; const vg = c.createGain(); vg.gain.value = 0.55; VERB.connect(vf); vf.connect(vg); vg.connect(comp);
  A.sfx = inp; A.sfxOut = out;
}
const init0 = A.init; A.init = function () { init0.call(this); try { chain(); } catch (e) { } };
// soften whatever still uses the old oscillator voices (square/saw get a low-pass, so nothing buzzes like a chip)
const tone0 = A.tone; A.tone = function (freq, dur, vol, type, slide, dest) {
  if (!A.ctx || !(type === 'square' || type === 'sawtooth')) return tone0.call(this, freq, dur, vol, type, slide, dest);
  const c = A.ctx, t = c.currentTime; const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = Math.min(4000, freq * 2.2); f.Q.value = 0.5; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * 0.7), t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.012);
  o.connect(f); f.connect(g); g.connect(dest || A.sfx); o.start(t); o.stop(t + dur + 0.1);
};
// ---- primitives
function out(node, wet) { node.connect(A.sfx); if (wet && VERB) { const s = A.ctx.createGain(); s.gain.value = wet; node.connect(s); s.connect(VERB); } }
function nz(o) { // filtered noise: {buf, dur, f, f2, q, type, vol, att, wet, at}
  const c = A.ctx, t = c.currentTime + (o.at || 0); const s = c.createBufferSource(); s.buffer = o.buf || PINK || A.noiseBuf; s.playbackRate.value = o.rate || R(0.92, 1.08);
  const f = c.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f, t); if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur); f.Q.value = o.q == null ? 0.8 : o.q;
  const g = c.createGain(); const att = o.att || 0.004; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.vol), t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + att + o.dur);
  s.connect(f); f.connect(g); out(g, o.wet); s.start(t, Math.random() * 1.5); s.stop(t + att + o.dur + 0.05);
}
function thump(f1, f2, dur, vol, wet, at) { const c = A.ctx, t = c.currentTime + (at || 0); const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f1 * R(0.93, 1.07), t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); out(g, wet); o.start(t); o.stop(t + dur + 0.05); }
function ring(freqs, dur, vol, wet, at) { const c = A.ctx, t = c.currentTime + (at || 0); const k = R(0.95, 1.05); freqs.forEach((fr, i) => { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = fr * k; const g = c.createGain(); const v = vol / (1 + i * 0.7); const d = dur / (1 + i * 0.35);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); out(g, wet); o.start(t); o.stop(t + d + 0.05); }); }
function bloop(f, dur, vol, at) { const c = A.ctx, t = c.currentTime + (at || 0); const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.8, t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); out(g, 0.3); o.start(t); o.stop(t + dur + 0.05); }
const voice = (f1, f2, vol, dur, at) => { // breathy vocal grunt: brown noise through two formants
  vol *= 4; nz({ buf: BROWN, dur, f: f1, f2: f1 * 0.85, q: 5, vol: vol, att: 0.02, wet: 0.2, at }); nz({ buf: BROWN, dur: dur * 0.8, f: f2, f2: f2 * 0.8, q: 6, vol: vol * 0.6, att: 0.02, wet: 0.2, at }); };
const gunshot = (v, crack, body, tail, low) => { nz({ buf: WHITE, dur: 0.03, f: 2500, type: 'highpass', q: 0.5, vol: crack * v, wet: 0.2 }); nz({ buf: BROWN, dur: body, f: 1600, f2: 220, type: 'lowpass', q: 0.6, vol: v, wet: tail }); thump(low, 35, body * 0.9, 0.6 * v, tail); nz({ buf: PINK, dur: body * 2.2, f: 700, f2: 180, type: 'lowpass', q: 0.4, vol: 0.18 * v, att: 0.03, wet: tail * 1.4, at: 0.02 }); };
const NEW = {
  step: v => { nz({ buf: BROWN, dur: R(0.06, 0.1), f: R(450, 800), type: 'lowpass', q: 0.7, vol: 0.32 * v }); nz({ buf: PINK, dur: 0.035, f: R(2600, 4200), q: 1.2, vol: 0.045 * v }); },
  land: v => { thump(120, 50, 0.2, 0.5 * v, 0.15); nz({ buf: BROWN, dur: 0.24, f: 500, f2: 200, type: 'lowpass', vol: 0.5 * v, wet: 0.2 }); nz({ buf: PINK, dur: 0.18, f: 1800, q: 0.8, vol: 0.06 * v, at: 0.03 }); },
  swing: v => nz({ buf: PINK, dur: R(0.16, 0.22), f: 500, f2: R(1800, 2600), q: 1.4, vol: 0.5 * v, att: 0.05 }),
  whoosh: v => nz({ buf: PINK, dur: 0.2, f: 600, f2: 2200, q: 1.2, vol: 0.45 * v, att: 0.06 }),
  hit: v => { thump(160, 65, 0.13, 0.5 * v, 0.1); nz({ buf: BROWN, dur: 0.11, f: 900, type: 'lowpass', vol: 0.45 * v, wet: 0.12 }); nz({ buf: PINK, dur: 0.045, f: 2400, q: 1, vol: 0.08 * v }); },
  slash: v => { nz({ buf: WHITE, dur: 0.11, f: 5200, f2: 2000, q: 1.6, vol: 0.16 * v, att: 0.01 }); nz({ buf: BROWN, dur: 0.12, f: 650, type: 'lowpass', vol: 0.3 * v, at: 0.015 }); },
  crack: v => { nz({ buf: WHITE, dur: 0.022, f: 3200, q: 1.4, vol: 0.38 * v }); thump(240, 120, 0.06, 0.25 * v); nz({ buf: PINK, dur: 0.07, f: 1300, q: 1.5, vol: 0.14 * v, at: 0.008 }); },
  thud: v => { thump(95, 42, 0.22, 0.45 * v, 0.2); nz({ buf: BROWN, dur: 0.2, f: 320, type: 'lowpass', vol: 0.45 * v, wet: 0.2 }); },
  gun: v => gunshot(v, 0.5, 0.22, 0.45, 110), pistol: v => gunshot(v, 0.5, 0.22, 0.45, 110), smg: v => gunshot(v * 0.75, 0.4, 0.13, 0.3, 130),
  magnum: v => gunshot(v * 1.1, 0.7, 0.32, 0.6, 85), rifle: v => gunshot(v * 1.1, 0.7, 0.3, 0.6, 90), shotgun: v => { gunshot(v * 1.2, 0.6, 0.42, 0.7, 70); nz({ buf: WHITE, dur: 0.06, f: 1800, q: 0.5, vol: 0.2 * v, at: 0.01 }); },
  big: v => { gunshot(v * 1.3, 0.8, 0.55, 0.9, 55); thump(60, 25, 0.8, 0.5 * v, 0.6); },
  click: v => { nz({ buf: WHITE, dur: 0.012, f: 4800, q: 4, vol: 0.18 * v }); ring([3100], 0.03, 0.025 * v); },
  jam: v => { nz({ buf: WHITE, dur: 0.02, f: 2600, q: 3, vol: 0.2 * v }); nz({ buf: PINK, dur: 0.08, f: 900, q: 2, vol: 0.12 * v, at: 0.05 }); },
  reload: v => { nz({ buf: WHITE, dur: 0.02, f: 2600, q: 3, vol: 0.22 * v }); ring([1850, 3900], 0.06, 0.03 * v); nz({ buf: PINK, dur: 0.07, f: 1400, q: 1, vol: 0.1 * v, at: 0.09 }); nz({ buf: WHITE, dur: 0.025, f: 2200, q: 3, vol: 0.26 * v, at: 0.2 }); ring([1650, 3500], 0.08, 0.035 * v, 0, 0.2); },
  ui: v => ring([1320, 2640], 0.07, 0.035 * v), uiback: v => ring([880, 1760], 0.08, 0.032 * v),
  deny: v => { thump(260, 200, 0.07, 0.07 * v); thump(200, 160, 0.09, 0.07 * v, 0, 0.09); },
  buy: v => { ring([1568, 3136, 4700], 0.25, 0.045 * v, 0.2); ring([2093, 4186], 0.3, 0.04 * v, 0.25, 0.07); },
  open_wood: v => { nz({ buf: BROWN, dur: 0.35, f: 380, f2: 820, q: 7, vol: 0.2 * v, att: 0.05, wet: 0.2 }); thump(140, 80, 0.08, 0.2 * v); },
  open_metal: v => { ring([437, 1189, 2213, 3530], 0.45, 0.05 * v, 0.3); nz({ buf: WHITE, dur: 0.18, f: 3200, q: 2, vol: 0.06 * v, att: 0.03 }); },
  open_cloth: v => nz({ buf: PINK, dur: 0.3, f: 1600, f2: 1100, q: 0.7, vol: 0.3 * v, att: 0.06 }),
  rummage: v => nz({ buf: PINK, dur: R(0.05, 0.1), f: R(1200, 2600), q: 1, vol: R(0.1, 0.18) * v, att: 0.01 }),
  cloth: v => nz({ buf: PINK, dur: 0.14, f: 1500, q: 0.8, vol: 0.28 * v, att: 0.03 }),
  bandage: v => { nz({ buf: PINK, dur: 0.4, f: 2400, f2: 1600, q: 0.8, vol: 0.12 * v, att: 0.08 }); nz({ buf: PINK, dur: 0.25, f: 1800, q: 0.8, vol: 0.09 * v, att: 0.05, at: 0.35 }); },
  cinch: v => { nz({ buf: PINK, dur: 0.22, f: 900, f2: 1400, q: 2, vol: 0.2 * v, att: 0.04 }); thump(140, 100, 0.08, 0.1 * v, 0, 0.18); },
  pain: v => voice(R(560, 680), R(1050, 1250), 0.22 * v, 0.28),
  gasp: v => { nz({ buf: PINK, dur: 0.35, f: 900, f2: 1500, q: 1.5, vol: 0.5 * v, att: 0.12 }); nz({ buf: PINK, dur: 0.3, f: 1800, q: 2, vol: 0.08 * v, att: 0.1 }); },
  pant: v => nz({ buf: PINK, dur: 0.22, f: R(800, 1000), f2: 1300, q: 1.6, vol: 0.3 * v, att: 0.06 }),
  breath: v => nz({ buf: PINK, dur: 0.45, f: 900, q: 1.2, vol: 0.05 * v, att: 0.15 }),
  shout: v => voice(R(500, 640), R(1100, 1350), 0.2 * v, 0.22),
  growl: v => { nz({ buf: BROWN, dur: 0.45, f: R(250, 380), type: 'lowpass', q: 3, vol: 0.32 * v, att: 0.05, wet: 0.2 }); thump(R(70, 95), 55, 0.4, 0.12 * v, 0.2); },
  splash: v => { nz({ buf: PINK, dur: 0.28, f: 2400, f2: 700, q: 0.8, vol: 0.45 * v, att: 0.01, wet: 0.2 }); for (let i = 0; i < 3; i++) bloop(R(450, 950), R(0.04, 0.08), 0.04 * v, R(0.02, 0.18)); },
  swim: v => { nz({ buf: PINK, dur: 0.3, f: 1100, f2: 500, q: 0.8, vol: 0.14 * v, att: 0.05, wet: 0.2 }); bloop(R(500, 800), 0.06, 0.03 * v, 0.1); },
  drip: v => bloop(R(900, 1500), 0.07, 0.05 * v),
  squelch: v => { nz({ buf: BROWN, dur: 0.18, f: 900, f2: 280, type: 'lowpass', q: 2, vol: 0.4 * v }); bloop(R(200, 320), 0.06, 0.05 * v, 0.03); },
  latch: v => { nz({ buf: BROWN, dur: 0.12, f: 700, type: 'lowpass', q: 2, vol: 0.35 * v }); nz({ buf: WHITE, dur: 0.04, f: 3000, q: 2, vol: 0.08 * v }); },
  pop: v => { thump(190, 90, 0.06, 0.4 * v); nz({ buf: WHITE, dur: 0.015, f: 2400, q: 2, vol: 0.25 * v }); },
  saw: v => { for (let i = 0; i < 3; i++) nz({ buf: WHITE, dur: 0.06, f: R(1800, 2700), q: 3, vol: 0.14 * v, at: i * 0.09 }); },
  dash: v => { nz({ buf: PINK, dur: 0.24, f: 500, f2: 2000, q: 1.2, vol: 0.45 * v, att: 0.04 }); nz({ buf: BROWN, dur: 0.12, f: 600, type: 'lowpass', vol: 0.2 * v, at: 0.03 }); },
  lunge: v => { nz({ buf: PINK, dur: 0.28, f: 400, f2: 1800, q: 1.3, vol: 0.55 * v, att: 0.05 }); voice(520, 1100, 0.12 * v, 0.18); },
  block: v => { ring([520, 1347, 2614, 3890], 0.32, 0.1 * v, 0.3); nz({ buf: WHITE, dur: 0.02, f: 3000, q: 1, vol: 0.3 * v }); thump(150, 90, 0.07, 0.25 * v); },
  parry: v => { ring([1120, 2810, 4230, 5600], 0.7, 0.1 * v, 0.5); nz({ buf: WHITE, dur: 0.02, f: 4500, q: 1, vol: 0.32 * v }); ring([2240], 0.5, 0.03 * v, 0.6, 0.06); },
  metal: v => ring([620, 1520, 2890], 0.25, 0.06 * v, 0.25),
  rope: v => nz({ buf: PINK, dur: 0.08, f: R(1500, 2100), q: 1.4, vol: 0.06 * v }),
  hiss: v => nz({ buf: WHITE, dur: 0.7, f: 4500, type: 'highpass', q: 0.5, vol: 0.09 * v, att: 0.1 }),
  boom: v => { thump(70, 24, 1.2, 0.9 * v, 0.8); nz({ buf: BROWN, dur: 1.4, f: 900, f2: 120, type: 'lowpass', q: 0.5, vol: 1.1 * v, wet: 0.7 }); nz({ buf: WHITE, dur: 0.05, f: 1800, type: 'highpass', vol: 0.5 * v }); for (let i = 0; i < 6; i++) nz({ buf: WHITE, dur: 0.02, f: R(1500, 4000), q: 2, vol: R(0.04, 0.1) * v, at: R(0.1, 0.8) }); },
  dig: v => { nz({ buf: WHITE, dur: 0.03, f: 3400, q: 1.5, vol: 0.2 * v }); thump(320, 150, 0.07, 0.18 * v); nz({ buf: PINK, dur: 0.18, f: 1800, q: 0.8, vol: 0.07 * v, at: 0.03 }); },
  gulp: v => { bloop(R(120, 160), 0.18, 0.2 * v); nz({ buf: BROWN, dur: 0.25, f: 400, type: 'lowpass', vol: 0.3 * v, at: 0.05 }); },
  gobble: v => { nz({ buf: BROWN, dur: 0.5, f: 600, f2: 200, type: 'lowpass', q: 2, vol: 0.55 * v, wet: 0.3 }); bloop(110, 0.25, 0.2 * v, 0.15); bloop(80, 0.3, 0.18 * v, 0.35); },
  heart: v => { thump(60, 38, 0.13, 0.35 * v); thump(55, 36, 0.11, 0.25 * v, 0, 0.16); },
};
// guns call play(it.gun.snd): map the names we know
NEW.pistol = NEW.gun;
const play0 = A.play;
A.play = function (name, vol) {
  if (!A.ctx) return; vol = vol == null ? 1 : vol; if (!A._chain) { try { chain(); } catch (e) { } }
  const fn = NEW[name]; if (fn && PINK) { try { fn(vol * R(0.9, 1.08)); } catch (e) { } return; }
  return play0.call(this, name, vol);
};
})(window.NE);

// =====================================================================================================================
// THROWABLES: 15 new things to throw — blades, flasks, grenades, gadgets
// =====================================================================================================================
(function (NE) {
'use strict';
const { ri, rf, pick, chance, clamp } = NE; const T = NE.T; const G = NE.G; const IT = NE.ITEMS;
Object.assign(NE.ICONS, {
  tstar: ['...X....', '...X....', '..XXX...', 'XXXwXXX.', '..XXX...', '...X....', '...X....', '........'],
  bola: ['X......X', '.b....b.', '..b..b..', '...bb...', '...bb...', '..b..b..', '.b....b.', 'X......X'],
  grenade: ['....kk..', '...k.k..', '..XXX...', '.XXwXX..', '.XXXXX..', '.XXXXX..', '..XXX...', '........'],
  flask: ['...kk...', '...ww...', '...ww...', '..wXXw..', '.wXXXXw.', '.wXXXXw.', '..wwww..', '........'],
  dart: ['.......X', '......X.', '.....X..', '....w...', '...w....', '..w.....', '.rr.....', 'rr......'],
  jar: ['..bbbb..', '.wwwwww.', '.wXXXXw.', '.wXXXXw.', '.wXXXXw.', '.wXXXXw.', '..wwww..', '........'],
  pod: ['...GG...', '..GXXG..', '.GXXXXG.', '.GXwXXG.', '.GXXXXG.', '..GXXG..', '...GG...', '........'],
  javelin: ['.......w', '......wg', '.....B..', '....B...', '...B....', '..B.....', '.B......', 'B.......'],
  rattle: ['..yyyy..', '.y.kk.y.', 'y.kwwk.y', 'y.kwwk.y', '.y.kk.y.', '..yyyy..', '...b....', '...b....'],
});
// kind: 'proj' flies and hits; 'fuse' is a physics body that goes off after a delay
const TH = {
  tknife: { name: 'Throwing Knife', icon: 'knife', col: '#c0c4ca', w: 0.2, stack: 6, kind: 'proj', spd: 400, g: 0.3, desc: 'Balanced blade. 22 sharp damage, can lodge in the wound.' },
  tstar: { name: 'Scrap Star', icon: 'tstar', col: '#9aa0a8', w: 0.1, stack: 10, kind: 'proj', spd: 420, g: 0.25, desc: 'Sharpened scrap. 12 damage and a fresh bleeding cut.' },
  javelin: { name: 'Javelin', icon: 'javelin', col: '#8a6038', w: 1.4, stack: 2, kind: 'proj', spd: 330, g: 0.55, desc: 'Heavy and brutal. 40 sharp damage, can knock them flat.' },
  bola: { name: 'Bola', icon: 'bola', col: '#7a5a36', w: 0.5, stack: 3, kind: 'proj', spd: 280, g: 0.5, desc: 'Weighted cords. Tangles a target: stunned 3s, slowed 5s.' },
  poisondart: { name: 'Poison Dart', icon: 'dart', col: '#6a9a40', w: 0.05, stack: 10, kind: 'proj', spd: 460, g: 0.12, desc: 'A pinprick full of cave venom. Poisons and slows.' },
  acidflask: { name: 'Acid Flask', icon: 'flask', col: '#90d040', w: 0.4, stack: 3, kind: 'proj', spd: 190, g: 1, desc: 'Shatters in a burning splash. Hurts everyone nearby.' },
  honeyjar: { name: 'Honey Jar', icon: 'jar', col: '#e0a020', w: 0.6, stack: 3, kind: 'proj', spd: 190, g: 1, desc: 'Sticky everywhere. Anyone caught is slowed to a crawl for 6s.' },
  sporepod: { name: 'Spore Pod', icon: 'pod', col: '#a0b050', w: 0.3, stack: 4, kind: 'proj', spd: 190, g: 1, desc: 'Bursts into a choking spore cloud. Don\'t walk into it yourself.' },
  frostflask: { name: 'Frost Flask', icon: 'flask', col: '#a0e0ff', w: 0.4, stack: 3, kind: 'proj', spd: 190, g: 1, desc: 'Freezes water to ice and slows everything in the splash.' },
  stickybomb: { name: 'Sticky Charge', icon: 'grenade', col: '#8a6a3a', w: 0.5, stack: 3, kind: 'proj', spd: 300, g: 0.8, desc: 'Sticks to whatever it hits, then blows 2s later.' },
  frag: { name: 'Frag Grenade', icon: 'grenade', col: '#4a5a3a', w: 0.5, stack: 3, kind: 'fuse', fuse: 2.2, desc: 'Pull, throw, duck. 2.2s fuse, shrapnel everywhere.' },
  flashbang: { name: 'Flashbang', icon: 'grenade', col: '#c0c0c0', w: 0.4, stack: 3, kind: 'fuse', fuse: 1.5, desc: 'Blinding bang: stuns and disorients everyone nearby.' },
  smoke: { name: 'Smoke Bomb', icon: 'grenade', col: '#7a7a7a', w: 0.4, stack: 3, kind: 'fuse', fuse: 0.8, desc: 'Thick smoke for 14s. Enemies lose track of anyone inside it.' },
  firebomb: { name: 'Incendiary Jar', icon: 'jar', col: '#e05020', w: 0.6, stack: 2, kind: 'fuse', fuse: 0, desc: 'Bigger, hotter, longer-burning than a molotov.' },
  noisemaker: { name: 'Clockwork Rattler', icon: 'rattle', col: '#c09040', w: 0.4, stack: 2, kind: 'fuse', fuse: 8, desc: 'Rattles loudly for 8s. Everything nearby comes to look.' },
};
for (const id in TH) { const d = TH[id]; IT[id] = { name: d.name, icon: d.icon, col: d.col, w: d.w, stack: d.stack, cat: 'throw', throwable: id, desc: 'Throw [G]. ' + d.desc, value: 6 }; NE.ISIZE[id] = id === 'javelin' ? [4, 1] : [1, 1]; }
NE.THROW_DEF = TH;
NE.THROW_IDS = ['flare', 'glowstick', 'molotov', 'bottle', 'brick', 'dynamite', ...Object.keys(TH)];
NE.PRICE = NE.PRICE || {}; Object.assign(NE.PRICE, { tknife: 10, tstar: 4, javelin: 18, bola: 12, poisondart: 6, acidflask: 16, honeyjar: 14, sporepod: 12, frostflask: 16, stickybomb: 26, frag: 30, flashbang: 22, smoke: 14, firebomb: 20, noisemaker: 15 });
NE.LOOT.weapon.push(['tknife', 2], ['tstar', 2], ['javelin', 0.8], ['frag', 0.6, 300], ['flashbang', 0.6, 200], ['smoke', 0.8], ['stickybomb', 0.4, 500]);
NE.LOOT.common.push(['tstar', 1], ['bola', 0.6], ['noisemaker', 0.4]); NE.LOOT.rare.push(['frag', 1], ['firebomb', 0.8]);
if (NE.LOOT.lab) NE.LOOT.lab.push(['acidflask', 1.2], ['frostflask', 0.8], ['sporepod', 0.6]); if (NE.LOOT.hive) NE.LOOT.hive.push(['honeyjar', 1.5], ['sporepod', 1]); if (NE.LOOT.raider) NE.LOOT.raider.push(['tknife', 1.2], ['frag', 0.4], ['smoke', 0.6], ['poisondart', 0.8]);
if (NE.LOOT.frost) NE.LOOT.frost.push(['frostflask', 1.2]); if (NE.LOOT.forge) NE.LOOT.forge.push(['firebomb', 0.8], ['stickybomb', 0.4]);
NE.RECIPES.push(
  { id: 'tstar', name: 'Scrap Stars', out: ['tstar', 3], need: [['scrap', 2]], desc: 'Hammer scrap into throwing stars.' },
  { id: 'bola', name: 'Bola', out: ['bola', 1], need: [['rag', 2], ['brick', 2]] },
  { id: 'smoke', name: 'Smoke Bomb', out: ['smoke', 1], need: [['rag', 1], ['alcohol', 1], ['mushroom', 1]] },
  { id: 'firebomb', name: 'Incendiary Jar', out: ['firebomb', 1], need: [['bottle', 1], ['alcohol', 2], ['rag', 1]], station: 'workbench' },
  { id: 'poisondart', name: 'Poison Darts', out: ['poisondart', 4], need: [['scrap', 1], ['herb', 1]] },
);

// ---- launching
const throw0 = NE.throwItem;
NE.throwItem = function (g, pl, id, remote) {
  const d0 = TH[id]; if (!d0) return throw0.call(this, g, pl, id);
  const e = remote ? null : pl.inv.find(id); if (!remote && !e) return;
  const ox = remote ? remote.x : pl.x + pl.facing * 3, oy = remote ? remote.y : pl.y - pl.h + 4; const d = remote ? { x: remote.dx, y: remote.dy } : pl.aimDir; const pow = remote ? 1 : Math.max(0.5, pl.anat.armFactor());
  if (d0.kind === 'proj') { const sp = d0.spd * pow; G.cproj.push({ x: ox, y: oy + 3, vx: d.x * sp + (remote ? 0 : pl.vx * 0.5), vy: d.y * sp - (d0.g > 0.6 ? 45 : 6), by: pl, t: 0, kind: id, grav: d0.g, spin: rf(0, 6), ghost: !!remote }); }
  else { const P = g.phys; const b = P.stick(id === 'firebomb' ? 'molotov' : 'dynamite', ox, oy, 3, Math.atan2(d.y, d.x), 1.0, 0.7); b.color = d0.col; b.item = id; b.thrownBy = pl; b.cfuse = d0.fuse; b.cfx = id; b.bounce = 0.12; b.fric = 0.85; b.ghost = !!remote; b.setVel(d.x * 230 * pow + (remote ? 0 : pl.vx), d.y * 230 * pow - 50);
    if (id === 'firebomb') b.onImpact = (bb, p, v) => { if (v > 90 && !bb.remove) { bb.remove = true; NE.Audio.play('glass'); g.noise(p.x, p.y, 140); if (!bb.ghost) NE.throwFx('firebomb', p.x, p.y, pl); else NE.throwFxVis('firebomb', p.x, p.y); } };
    else b.onImpact = (bb, p, v) => { if (v > 80) NE.Audio.play('metal', 0.3); }; }
  if (!remote) { e.n--; if (e.n <= 0) pl.inv.remove(e); NE.Audio.play('swing'); pl.swingT = 0.25; pl.swingDur = 0.25; if (g.net && g.net.on) g.net.send({ t: 'cthrow', id, x: ox, y: oy, dx: d.x, dy: d.y }); }
};
// visual-only effects (both sides) and real effects (whoever simulates the enemies)
NE.throwFxVis = function (k, x, y) {
  const col = { acidflask: ['#b0e040', '#80b020'], honeyjar: ['#e0a020', '#ffd060'], sporepod: ['#a0b050', '#d0e080'], frostflask: ['#c0f0ff', '#ffffff'], firebomb: ['#ff8020', '#ffd060'], frag: ['#ffd060', '#ff8020'], flashbang: ['#ffffff', '#fff6c0'], smoke: ['#9a9a9a', '#c0c0c0'], stickybomb: ['#ffd060', '#ff8020'] }[k] || ['#ccc', '#fff'];
  for (let i = 0; i < 16; i++) G.addP(x, y, rf(-80, 80), rf(-90, 10), rf(0.3, 0.8), pick(col), k === 'acidflask' || k === 'honeyjar' ? 'blood' : 'spark', 0.5);
  if (k === 'flashbang') { G.flashWhite = 1; NE.Audio.play('boom', 0.5); NE.Audio.play('parry', 0.6); }
  if (k === 'acidflask' || k === 'frostflask' || k === 'honeyjar' || k === 'sporepod') NE.Audio.play(k === 'sporepod' ? 'hiss' : 'glass', 0.8);
  if (k === 'smoke') { NE.Audio.play('hiss', 0.9); (G.smokes = G.smokes || []).push({ x, y: y - 6, r: 8, t: 14 }); }
};
const near = (x, y, r, skip) => G.actors.filter(a => a.alive && !a.town && a !== skip && Math.hypot(a.x - x, a.cy - y) < r);
NE.throwFx = function (k, x, y, by) {
  NE.throwFxVis(k, x, y); const N = G.net && G.net.on ? G.net : null; if (N && N.role === 'guest') { N.send({ t: 'cfx', k, x, y }); }
  const hit = (a, f) => { if (a.isPuppet || a.isRemote) return; f(a); if (a.onAggro && by && by.isPlayer) a.onAggro(by); };
  switch (k) {
    case 'acidflask': for (const a of near(x, y, 24)) hit(a, a => { a.hurt(pick(['torso', 'larm', 'rarm', 'lleg', 'rleg']), rf(10, 15), 'burn', 'Acid'); a.anat.tox = (a.anat.tox || 0) + 15; }); break;
    case 'honeyjar': for (const a of near(x, y, 28)) hit(a, a => { a.slowT = 6; }); { const W = G.world; const tx = Math.floor(x / T), ty = Math.floor((y - 2) / T); for (let i = -1; i <= 1; i++) if (W.get(tx + i, ty) === 0) W.liqSet(ty * W.W + tx + i, 11, 0.5); } break;
    case 'sporepod': G.gas.push({ spore: true, own: true, x, y: y - 6, r: 12, max: 32, d: 0.85, vx: rf(-3, 3), life: 10 }); break;
    case 'frostflask': for (const a of near(x, y, 32)) hit(a, a => { a.slowT = 6; a.hurt('torso', 4, 'blunt', 'Frost'); }); { const W = G.world; const tx0 = Math.floor(x / T), ty0 = Math.floor(y / T); for (let ty = ty0 - 2; ty <= ty0 + 3; ty++) for (let tx = tx0 - 3; tx <= tx0 + 3; tx++) if (W.get(tx, ty) === 5) { W.liq && W.liq.delete(ty * W.W + tx); W.setMod(tx, ty, 10); } } break;
    case 'firebomb': G.addFire(x, y, 28, 14); G.addFire(x + 12, y, 16, 10); G.addFire(x - 12, y, 16, 10); break;
    case 'frag': G.explode(x, y, 1.0); break;
    case 'stickybomb': G.explode(x, y, 1.15); break;
    case 'flashbang': for (const a of near(x, y, 95)) { if (!G.world.los(x, y - 4, a.x, a.cy)) continue; if (a.isPlayer) { a.hurtT = 1; a.anat.stress = Math.min(100, a.anat.stress + 20); continue; } hit(a, a => { a.stagger = Math.max(a.stagger || 0, 3); a.target = null; a.state = 'search'; a.lastSeen = { x: a.x + rf(-60, 60), y: a.y }; a.searchT = 4; }); } break;
  }
};
const hitFx = { // projectile hits an actor
  tknife: (q, a) => { a.hurt(a.partNear(q.x, q.y), 22, 'sharp', q.byName, { x: Math.sign(q.vx), y: 0 }); if (chance(0.35) && a.anat) { const P = a.anat.parts[a.partNear(q.x, q.y)]; const w = P && P.wounds[P.wounds.length - 1]; if (w) w.bullet = true; } },
  tstar: (q, a) => { const pt = a.partNear(q.x, q.y); a.hurt(pt, 12, 'sharp', q.byName, { x: Math.sign(q.vx), y: 0 }); if (a.anat && a.anat.parts[pt]) a.anat.parts[pt].wounds.push({ t: 'cut', bleed: rf(0.5, 1), dirty: 0.2, inf: 0, closed: false, age: 0, bullet: false }); },
  javelin: (q, a) => { a.hurt(a.partNear(q.x, q.y), 40, 'sharp', q.byName, { x: Math.sign(q.vx), y: 0 }); if (a.alive && a.knockdown && chance(0.5)) a.knockdown(Math.sign(q.vx) * 160, -80, 0.9); else a.vx += Math.sign(q.vx) * 120; },
  bola: (q, a) => { a.hurt('lleg', 3, 'blunt', q.byName); a.stagger = Math.max(a.stagger || 0, 3); a.slowT = 5; NE.Audio.play('cinch', 0.8); },
  poisondart: (q, a) => { a.hurt(a.partNear(q.x, q.y), 6, 'sharp', q.byName); if (a.anat) a.anat.tox = (a.anat.tox || 0) + 45; a.slowT = 4; },
};
// projectile update: extend the spitter projectile loop with our kinds
const upd0 = G.updateCproj;
G.updateCproj = function (dt) {
  const W = G.world; const mine = G.cproj.filter(q => TH[q.kind]); G.cproj = G.cproj.filter(q => !TH[q.kind]); upd0.call(this, dt); 
  for (const q of mine) {
    q.t += dt; q.spin += dt * 18; q.byName = q.by && q.by.surv ? q.by.surv.first : 'Thrown';
    if (q.stuck) { q.fuse -= dt; if (q.stuck.a) { if (!q.stuck.a.alive) q.stuck.a = null; else { q.x = q.stuck.a.x + q.stuck.dx; q.y = q.stuck.a.cy + q.stuck.dy; } } if (Math.random() < dt * 20) G.addP(q.x, q.y - 1, rf(-8, 8), rf(-20, -5), 0.3, '#ffd060', 'spark', -0.2); if (q.fuse <= 0) { q.dead = true; if (!q.ghost) NE.throwFx('stickybomb', q.x, q.y, q.by); } continue; }
    q.vy += 300 * q.grav * dt; const steps = 3; let done = false;
    for (let i = 0; i < steps && !done; i++) { q.x += q.vx * dt / steps; q.y += q.vy * dt / steps;
      if (!q.ghost) for (const a of G.actors) { if (!a.alive || a === q.by || a.town || a.isRemote || (q.by && q.by.isPlayer && a.isPlayer)) continue; if (a.contains && a.contains(q.x, q.y, 1.5)) {
          if (a.dashIF > 0) continue; done = true;
          if (q.kind === 'stickybomb') { q.stuck = { a, dx: q.x - a.x, dy: q.y - a.cy }; q.fuse = 2; NE.Audio.play('latch', 0.6); break; }
          if (hitFx[q.kind]) { NE._dmgMul = NE.thrMul ? NE.thrMul(q) : 1; try { hitFx[q.kind](q, a); } finally { NE._dmgMul = 0; } if (a.onAggro && q.by && q.by.isPlayer) a.onAggro(q.by); NE.Audio.play(q.kind === 'bola' ? 'cinch' : 'slash', 0.7); q.dead = true; } else { q.dead = true; NE.throwFx(q.kind, q.x, q.y, q.by); } break; } }
      if (!done && W.solidAt(q.x, q.y)) { done = true; q.x -= q.vx * dt / steps; q.y -= q.vy * dt / steps;
        if (q.kind === 'stickybomb') { q.stuck = { a: null }; q.fuse = 2; NE.Audio.play('latch', 0.5); }
        else if (hitFx[q.kind]) { q.dead = true; NE.Audio.play('metal', 0.3); if (!q.ghost && q.kind !== 'poisondart' && chance(0.75)) G.dyn.push({ type: 'container', ct: 'bag', x: q.x, y: q.y + 2, label: IT[q.kind].name, act: 'search', items: [{ id: q.kind, n: 1 }], searched: false, depth: 0 }); }
        else { q.dead = true; if (q.ghost) NE.throwFxVis(q.kind, q.x, q.y); else NE.throwFx(q.kind, q.x, q.y, q.by); } }
    }
    if (q.t > 4) q.dead = true;
  }
  G.cproj = G.cproj.concat(mine.filter(q => !q.dead));
  // fuse bodies
  for (const b of G.phys.bodies) { if (!b.cfx || b.remove || !(b.cfuse > 0)) continue; b.cfuse -= dt; const c = b.center();
    if (b.cfx === 'noisemaker') { b.rt = (b.rt || 0) - dt; if (b.rt <= 0) { b.rt = 0.28; NE.Audio.play('click', 0.9); NE.Audio.play('rope', 0.6); if (!b.ghost) G.noise(c.x, c.y, 230); } }
    else if (Math.random() < dt * 25) G.addP(c.x, c.y - 1, rf(-6, 6), rf(-25, -5), 0.25, '#ffe080', 'spark', -0.2);
    if (b.cfuse <= 0) { b.remove = b.cfx !== 'noisemaker'; if (b.cfx === 'noisemaker') b.cfx = null; else if (b.ghost) NE.throwFxVis(b.cfx, c.x, c.y); else NE.throwFx(b.cfx, c.x, c.y, b.thrownBy); } }
  // smoke & slows
  if (G.smokes) { for (const s of G.smokes) { s.t -= dt; s.r = Math.min(56, s.r + dt * 30); if (Math.random() < dt * 30) G.addP(s.x + rf(-s.r, s.r) * 0.8, s.y + rf(-s.r * 0.5, s.r * 0.4), rf(-6, 6), rf(-8, 2), rf(1.2, 2.2), pick(['#8a8a8a', '#a0a0a0', '#6a6a6a']), 'smoke', -0.05); }
    G.smokes = G.smokes.filter(s => s.t > 0); const p = G.player; const hid = a => G.smokes.some(s => Math.hypot(a.x - s.x, a.cy - s.y) < s.r * 0.85);
    for (const a of G.actors) if (a.alive && a.D && a.target && (a.target.isPlayer || a.target.isRemote) && (hid(a.target) || hid(a)) && Math.hypot(a.x - a.target.x, a.y - a.target.y) > 14) { a.lastSeen = { x: a.target.x + rf(-40, 40), y: a.target.y }; a.target = null; a.state = 'search'; a.searchT = 3; } }
  for (const c of G.gas) if (c.own) for (const a of G.actors) if (a.alive && a.D && !a.isPuppet && Math.hypot(a.x - c.x, a.cy - c.y) < c.r) { a.anat.tox = (a.anat.tox || 0) + dt * 12; a._gasT = (a._gasT || 0) - dt; if (a._gasT <= 0) { a._gasT = 1; a.hurt('torso', 3, 'burn', 'Spores'); a.stagger = Math.max(a.stagger || 0, 0.3); } }
  for (const a of G.actors) if (a.slowT > 0) { a.slowT -= dt; a.vx *= Math.pow(0.08, dt); if (Math.random() < dt * 6) G.addP(a.x + rf(-3, 3), a.y - rf(2, 18), 0, 6, 0.4, '#c0b080', 'spark', 0.2); }
};
// draw flying throwables + smoke clouds
const fx0 = G.drawContentFX;
G.drawContentFX = function (ctx) {
  fx0.call(this, ctx);
  for (const q of G.cproj) { if (!TH[q.kind]) continue; const x = Math.round(q.x), y = Math.round(q.y); const c = IT[q.kind].col; const a = q.stuck ? 0 : q.spin;
    if (q.kind === 'javelin' || q.kind === 'poisondart') { const L = q.kind === 'javelin' ? 9 : 3, ang = Math.atan2(q.vy, q.vx); NE.pline(ctx, x - Math.cos(ang) * L, y - Math.sin(ang) * L, x, y, 1, c); ctx.fillStyle = '#d8dce0'; ctx.fillRect(x, y, 1, 1); }
    else if (q.kind === 'tknife' || q.kind === 'tstar') { NE.pline(ctx, x - Math.cos(a) * 2, y - Math.sin(a) * 2, x + Math.cos(a) * 2, y + Math.sin(a) * 2, 1, '#d0d4d8'); if (q.kind === 'tstar') NE.pline(ctx, x - Math.cos(a + 1.57) * 2, y - Math.sin(a + 1.57) * 2, x + Math.cos(a + 1.57) * 2, y + Math.sin(a + 1.57) * 2, 1, '#a0a4a8'); }
    else if (q.kind === 'bola') { ctx.fillStyle = '#6a4a2a'; NE.pline(ctx, x - Math.cos(a) * 3, y - Math.sin(a) * 3, x + Math.cos(a) * 3, y + Math.sin(a) * 3, 1, '#9a7a50'); ctx.fillRect(Math.round(x + Math.cos(a) * 3), Math.round(y + Math.sin(a) * 3), 2, 2); ctx.fillRect(Math.round(x - Math.cos(a) * 3), Math.round(y - Math.sin(a) * 3), 2, 2); }
    else { ctx.fillStyle = NE.shade(c, 0.6); ctx.fillRect(x - 1, y - 1, 3, 3); ctx.fillStyle = c; ctx.fillRect(x - 1, y - 1, 2, 2); if (q.stuck && Math.sin(G.t * 20) > 0) { ctx.fillStyle = '#ff3020'; ctx.fillRect(x, y - 2, 1, 1); } } }
  if (G.flashWhite > 0) { G.flashWhite -= 0.04; }
};
// white flash overlay for flashbangs (screen space): piggy-back on the camera shake frame
const drawFX0 = G.drawFX; G.drawFX = function () { drawFX0.apply(this, arguments); if (G.flashWhite > 0) { const ctx = G.ctx; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.9, G.flashWhite) + ')'; ctx.fillRect(0, 0, G.cv.width, G.cv.height); ctx.restore(); } };
// co-op: mirror the throw on the other screen; guests ask the host to apply area effects
// new items are goods, not money: keep their value as a trade price, out of the currency count
for (const id in IT) if (!NE._origItems.has(id) && IT[id].value) { IT[id].worth = IT[id].value; delete IT[id].value; }
{ const bp0 = NE.basePrice; NE.basePrice = function (id) { const it = IT[id]; if (it && it.worth && !NE.PRICE[id]) return it.worth * 2.5; return bp0.call(this, id); }; }
NE.hookThrowNet = function () { if (!NE.Net || NE.Net.prototype._thrHooked) return; NE.Net.prototype._thrHooked = true; const h0 = NE.Net.prototype.handle;
  NE.Net.prototype.handle = function (m) { if (m && m.t === 'cthrow') { if (G.world && !G.world.lobby && this.peer) NE.throwItem(G, this.peer, m.id, { x: m.x, y: m.y, dx: m.dx, dy: m.dy }); return; }
    if (m && m.t === 'cfx') { if (this.role === 'host') { const k = m.k; if (k === 'frag' || k === 'stickybomb') return; NE.throwFx(k, m.x, m.y, this.peer); } return; } return h0.call(this, m); }; };
window.addEventListener('load', NE.hookThrowNet); setTimeout(NE.hookThrowNet, 0);
})(window.NE);

// =====================================================================================================================
// TOWNS: every town has its own layout, merchants, folk and a special feature
// =====================================================================================================================
(function (NE) {
'use strict';
const { ri, rf, pick, chance, clamp } = NE; const T = NE.T; const G = NE.G; const W_ = NE.World.prototype; const IT = NE.ITEMS;
// merchant specialities: what they stock and how they greet you
NE.MERCH = {
  trader: { title: 'Trader', greet: 'Scrap, trinkets, tape, rounds — or sell me something.', pool: ['pickaxe', 'dynamite', 'bandage', 'water', 'ration', 'splint', 'tourniquet', 'battery', 'filter', 'lockpick', 'grapple', 'canteen', 'larder', 'flare', 'rope'] },
  gunsmith: { title: 'Gunsmith', greet: 'Oiled, zeroed, mostly legal. Ammo by the box.', pool: ['pistol', 'revolver', 'smg', 'shotgun', 'rifle', 'hunting', 'ammo9', 'ammo357', 'shells', 'ammo762', 'ammo50'], shirt: '#3a3a3a' },
  herbalist: { title: 'Herbalist', greet: 'Roots, caps and honey. Nature heals — slowly.', pool: ['herb', 'mushroom', 'honey', 'antiseptic', 'cleanrag', 'painkillers', 'water', 'chocolate', 'sporepod', 'poisondart'], shirt: '#4a6a30' },
  prosthetist: { title: 'Limb-Maker', greet: 'Lost something? I can\'t grow it back, but I can build it.', pool: ['peg_leg_w', 'peg_leg_a', 'peg_leg_p', 'peg_arm_w', 'peg_arm_a', 'peg_arm_p', 'metal_arm_w', 'metal_arm_a', 'metal_arm_p', 'metal_leg_a', 'saw_arm_w', 'saw_arm_a', 'saw', 'tourniquet'], shirt: '#6a6a70', n: 7 },
  armorer: { title: 'Armourer', greet: 'Plate, mail, padding. Or I patch up what you\'re wearing.', pool: null, shirt: '#5a4a3a', armor: true },
  throwsmith: { title: 'Bombmaker', greet: 'Everything here goes boom, splash or stab. Don\'t drop anything.', pool: ['tknife', 'tstar', 'javelin', 'bola', 'acidflask', 'frostflask', 'honeyjar', 'smoke', 'flashbang', 'frag', 'stickybomb', 'firebomb', 'noisemaker', 'molotov', 'dynamite'], shirt: '#7a3a20', n: 7 },
  outfitter: { title: 'Outfitter', greet: 'Boots, gloves, belts. Kit that keeps you alive.', pool: ['hikeboots', 'runshoes', 'climbgloves', 'knucklegloves', 'canteen', 'larder', 'harness', 'armband', 'nightgoggles', 'rabbitfoot', 'respirator', 'filter'], shirt: '#6a5a30' },
  fence: { title: 'Fence', greet: 'I pay better than anyone down here. Don\'t ask, won\'t tell.', pool: ['lockpick', 'keycard', 'tknife', 'smoke', 'trinket'], shirt: '#2a2a30', sellMul: 1.4 },
};
const priceOf = id => Math.ceil(NE.PRICE[id] || NE.basePrice(id) * 1.0);
NE.merchStock = function (kind, depth) {
  const M = NE.MERCH[kind]; let pool = M.pool ? M.pool.filter(id => IT[id]) : NE.ARMOR2.concat(['vest', 'kevlar', 'helmet', 'milhelmet', 'leathercap', 'scrapplate', 'platevest']).filter(id => IT[id]);
  if (M.armor) pool = pool.filter(id => (IT[id].armor || 0) <= 0.35 + depth / 2500);
  const out = []; const used = new Set(); const n = M.n || 6;
  for (let i = 0; i < n * 3 && out.length < n; i++) { const id = pick(pool); if (used.has(id)) continue; used.add(id); const it = IT[id]; const cnt = it.stack ? (it.cat === 'ammo' ? 10 : Math.min(it.stack, 3)) : (it.uses || 1); out.push({ id, n: cnt, price: priceOf(id) * (it.cat === 'ammo' ? 10 : it.stack ? cnt : 1) }); }
  return out;
};
// every town by name: layout, theme colours, merchants, special features
NE.TOWN_DEF = {
  Lanternmoss: { layout: 'market', merch: ['trader', 'herbalist'], feat: ['shrine'], palette: ['#4a6a30', '#6a5a3a', '#3a5a4a'], decor: ['lanterns', 'stall', 'plant'], folk: 4, doctor: true, line: 'Paper lanterns everywhere. Someone is singing.' },
  Rootwell: { layout: 'cavern', merch: ['trader', 'prosthetist'], feat: ['mapdesk'], palette: ['#5a4a30', '#4a3a28'], decor: ['bigroot'], folk: 3, doctor: true, line: 'A whole village tucked between the roots of something enormous.' },
  Saltreach: { layout: 'bridge', merch: ['gunsmith', 'trader'], feat: ['dice'], palette: ['#c8b890', '#a89870'], decor: ['stall', 'banner'], folk: 3, doctor: true, line: 'Built on both sides of a salt-water chasm. Mind the bridge.' },
  'Ochre Rest': { layout: 'terraced', merch: ['armorer', 'herbalist'], feat: ['stove'], palette: ['#b07a40', '#8a5a30'], decor: ['banner', 'pots'], folk: 4, doctor: true, line: 'Cliff houses stacked up the ochre wall.' },
  Dunewell: { layout: 'market', merch: ['trader', 'throwsmith', 'fence'], feat: ['dice'], palette: ['#d8b070', '#c08850', '#a05a30'], decor: ['stall', 'stall', 'banner'], folk: 5, doctor: false, line: 'The loudest bazaar under the sand.' },
  Rimehold: { layout: 'fort', merch: ['armorer', 'gunsmith'], feat: ['bath'], palette: ['#7a8a98', '#5a6a78'], decor: ['banner', 'palisade'], folk: 3, doctor: true, line: 'A walled hold with a hot spring at its heart.' },
  Frostkettle: { layout: 'pools', merch: ['herbalist', 'outfitter'], feat: ['bath', 'stove'], palette: ['#6a7a88', '#8a6a50'], decor: ['steam', 'lanterns'], folk: 4, doctor: true, line: 'Steaming pools, frozen eaves, soup on every fire.' },
  'Prism Hollow': { layout: 'cavern', merch: ['prosthetist', 'trader'], feat: ['mapdesk', 'shrine'], palette: ['#6a5aa0', '#4a4070'], decor: ['crystaltree'], folk: 3, doctor: false, line: 'Built around a crystal that hums at night.' },
  Glimmerstead: { layout: 'terraced', merch: ['gunsmith', 'throwsmith'], feat: ['shrine'], palette: ['#8a7ad0', '#5a5090'], decor: ['lanterns', 'banner'], folk: 4, doctor: true, line: 'Terraces of glowing glass and nervous people.' },
  Cinderhearth: { layout: 'stilts', liquid: 9, merch: ['armorer', 'gunsmith'], feat: ['anvil'], palette: ['#5a2a1e', '#3a2622'], decor: ['forge', 'banner'], folk: 3, doctor: true, line: 'Forges on stilts above the lava. Hot enough to sweat iron.' },
  'Last Ember': { layout: 'fort', merch: ['throwsmith', 'outfitter'], feat: ['dice', 'stove'], palette: ['#7a3a20', '#4a2a1a'], decor: ['palisade', 'banner'], folk: 3, doctor: true, line: 'The last walled town before the deep. Everyone is armed.' },
  'Ashfall Post': { layout: 'bridge', merch: ['fence', 'prosthetist'], feat: ['anvil', 'mapdesk'], palette: ['#4a4040', '#2a2424'], decor: ['forge'], folk: 2, doctor: true, line: 'Ash drifts down through the bridge slats.' },
  Waxhome: { layout: 'stilts', liquid: 11, merch: ['herbalist', 'outfitter'], feat: ['shrine', 'stove'], palette: ['#c08a20', '#8a5a10'], decor: ['comb', 'lanterns'], folk: 4, doctor: true, line: 'Wax houses on stilts over pools of honey.' },
  Combwell: { layout: 'cavern', merch: ['throwsmith', 'trader'], feat: ['dice'], palette: ['#d09030', '#8a5a10'], decor: ['comb', 'crystaltree'], folk: 3, doctor: true, line: 'They carved a town out of an abandoned hive.' },
  'Lastlight Dock': { layout: 'dock', liquid: 5, merch: ['gunsmith', 'fence', 'trader'], feat: ['mapdesk'], palette: ['#2a4a4a', '#5a4030'], decor: ['boat', 'lanterns'], folk: 4, doctor: true, line: 'Piers over black water. Boats that go nowhere.' },
  Tidelock: { layout: 'pools', merch: ['outfitter', 'herbalist'], feat: ['bath', 'dice'], palette: ['#3a5a5a', '#2a3a3a'], decor: ['boat', 'kelp'], folk: 3, doctor: true, line: 'Half the town is under water at high tide.' },
  Calvary: { layout: 'temple', merch: ['prosthetist', 'armorer'], feat: ['shrine', 'anvil'], palette: ['#d8d0b8', '#8a8070'], decor: ['column', 'skullwall'], folk: 3, doctor: true, line: 'A bone cathedral. The monks trade in spare parts.' },
  Marrowhold: { layout: 'fort', merch: ['fence', 'throwsmith'], feat: ['dice', 'shrine'], palette: ['#a89c80', '#5a5040'], decor: ['palisade', 'skullwall'], folk: 3, doctor: true, line: 'Walls of stacked bone. They don\'t ask who they were.' },
  'The Last Lantern': { layout: 'temple', merch: ['prosthetist', 'gunsmith', 'outfitter'], feat: ['shrine', 'bath', 'mapdesk'], palette: ['#6a2a4a', '#3a1a2a'], decor: ['column', 'lanterns', 'veins'], folk: 2, doctor: true, line: 'The last light before the Heart. Nobody here sleeps.' },
  Waystation: { layout: 'market', merch: ['trader'], feat: ['stove'], palette: ['#6a4a30'], decor: ['stall'], folk: 3, doctor: true, line: 'A tired little stop.' },
};
W_.genTown = function (f, fl, rows, g, c) {
  const W = this.W, FH = NE.FH; const B = fl.biome.id; const gv = FH - 4;
  const names = NE.TOWNS[B] || ['Waystation']; const used = this._townsUsed = this._townsUsed || [];
  let name = names.find(n => !used.includes(n)) || pick(names); if (!names.includes(name)) name = pick(names); used.push(name); const D = NE.TOWN_DEF[name] || NE.TOWN_DEF.Waystation;
  for (let x = 0; x < W; x++) { g[x] = gv; c[x] = x < 3 || x > W - 4 ? gv : (x < 6 || x > W - 7 ? 2 : 0); }
  for (let r = 0; r < FH; r++) for (let x = 0; x < W; x++) rows[r][x] = (r < c[x] || r >= g[x]) ? 1 : 0;
  for (const lx of fl.ladIn) { for (let r = 0; r < g[lx]; r++) rows[r][lx] = 3; }
  fl.town = { name, x0: 6 * T, x1: (W - 7) * T, def: D };
  // way onward
  const exitDir = ri(0, 1) ? 1 : -1; { const dir = exitDir, x0 = dir > 0 ? 7 : W - 8; let xe = x0; for (let i = 0; i < 7; i++) { const xx = x0 + dir * i; const fl2 = Math.min(FH, gv + Math.round((FH - gv) * (i + 1) / 7)); for (let r = Math.max(gv - 1, fl2 - 4); r < Math.min(FH, fl2); r++) rows[r][xx] = 0; if (i >= 5) for (let r = fl2; r < FH; r++) rows[r][xx] = 0; xe = xx; }
    this.ladNext = []; this.pitNext = [[Math.min(xe, xe - dir), Math.max(xe, xe - dir), dir]]; }
  const mid = Math.floor(W / 2); const safe = x => x > 15 && x < W - 15; // keep clear of the exit chute
  // ---- layout-specific terrain
  const L = D.layout; const lo = 15, hi = W - 16;
  if (L === 'bridge') { const a = mid - 7, b = mid + 7; for (let x = a; x <= b; x++) { for (let r = gv; r < FH - 1; r++) rows[r][x] = 0; rows[FH - 2][x] = 5; rows[gv][x] = 2; } fl.townGap = [a, b]; }
  if (L === 'terraced') { for (let x = lo; x < mid - 6; x++) { const h = x < lo + 2 ? 1 : 2; g[x] = gv - h; for (let r = g[x]; r < gv; r++) rows[r][x] = 1; } for (let x = mid + 8; x < hi; x++) { const h = x > hi - 3 ? 1 : 2; g[x] = gv - h; for (let r = g[x]; r < gv; r++) rows[r][x] = 1; } }
  if (L === 'dock' || L === 'pools' || L === 'stilts') { const liq = D.liquid || 5; const spans = L === 'dock' ? [[mid - 12, mid + 12]] : [[lo + 4, lo + 10], [mid - 3, mid + 3], [hi - 10, hi - 4]];
    for (const [a, b] of spans) for (let x = a; x <= b; x++) { if (L === 'pools') { rows[gv][x] = liq; rows[gv + 1][x] = liq; } else { rows[gv][x] = (L === 'dock' && (x - a) % 8 === 7) ? liq : 2; rows[gv + 1][x] = liq; rows[gv + 2][x] = liq; } }
    fl.townPools = spans; }
  if (L === 'fort') { for (const x of [lo + 1, hi - 1]) for (let dx = -1; dx <= 1; dx++) rows[gv - 5][x + dx] = 8; fl.decor.push({ k: 'palisade', x: (lo - 1) * T, y: 0, col: '#5a4028' }, { k: 'palisade', x: (hi - 1) * T, y: 0, col: '#5a4028' }); }
  // walkable top surface for objects on stilts/docks: the plank row
  const surfY = x => { for (let r = 0; r < FH; r++) { const t = rows[r][x]; if (t === 1 || t === 2 || t === 8 || t === 10) return r; } return gv; };
  // ---- decor: houses in the town's own colours
  const pal = D.palette; for (let x = 16, i = 0; x < W - 16; x += ri(9, 13), i++) { if (fl.townGap && x > fl.townGap[0] - 3 && x < fl.townGap[1] + 3) continue; fl.decor.push({ k: L === 'stilts' ? 'stilthut' : L === 'temple' ? 'column' : 'shack', x: x * T, y: 0, s: rf(0, 1), col: pal[i % pal.length] }); }
  for (const k of D.decor) for (let n = 0; n < 2; n++) { let x = ri(lo + 2, hi - 2); if (fl.townGap && x > fl.townGap[0] - 2 && x < fl.townGap[1] + 2) x = lo + 3; fl.decor.push({ k, x: x * T, y: 0, s: rf(0, 1), col: pick(pal) }); }
  if (L === 'cavern') fl.decor.unshift({ k: D.decor.includes('crystaltree') ? 'crystaltree' : 'bigroot', x: mid * T, y: 0, s: 0.5 });
  if (L === 'dock') for (const x of [mid - 8, mid + 6]) fl.decor.push({ k: 'boat', x: x * T, y: 0, s: rf(0, 1) });
  // ---- core services (placed differently per layout)
  const spots = []; for (let x = lo + 2; x < hi - 2; x += 4) { if (fl.townGap && x >= fl.townGap[0] - 1 && x <= fl.townGap[1] + 1) continue; if (fl.townPools && L === 'pools' && fl.townPools.some(([a, b]) => x >= a - 1 && x <= b + 1)) continue; spots.push(x); }
  const take = pref => { let best = -1, bd = 1e9; for (let i = 0; i < spots.length; i++) { const d = Math.abs(spots[i] - pref); if (d < bd) { bd = d; best = i; } } if (best < 0) return pref; const x = spots[best]; spots.splice(best, 1); return x; };
  const at = x => x * T + 4;
  fl.objs.push({ type: 'post', x: at(take(mid)), label: 'Deep Post — send loot topside', act: 'post' });
  fl.objs.push({ type: 'fire', x: at(take(mid - 5)), label: name + ' Hearth', act: 'fire' });
  fl.objs.push({ type: 'bed', x: at(take(L === 'fort' ? lo + 4 : ri(lo + 3, mid - 8))), label: 'Inn Bed — rest & save', act: 'rest' });
  fl.objs.push({ type: 'bench', x: at(take(mid + 9)), label: 'Town Workbench', act: 'craft' });
  if (L !== 'pools') fl.objs.push({ type: 'dispenser', x: at(take(hi - 4)), label: 'Town Well', act: 'drink', uses: 99 });
  fl.objs.push({ type: 'sign', x: at(take(lo + 1)), label: name });
  for (const k of D.feat) { const lab = { shrine: 'Hive Shrine — pray (calms you, once)', bath: 'Hot Spring — bathe (warm & clean, once)', stove: 'Soup Kitchen — hot meal (8 silver)', dice: 'Bone Dice — gamble silver', mapdesk: 'Cartographer — buy a map of the next levels (15)', anvil: 'Anvil — repair armour (10)' }[k]; fl.objs.push({ type: 'tfeat', feat: k, x: at(take(ri(lo + 4, hi - 4))), label: lab, act: 'tfeat' }); }
  for (let x = 8; x < W - 8; x += 7) fl.objs.push({ type: 'lamp', x: x * T + 4, y: 0, on: true, col: pick(['#ffc070', '#ffd890', '#ffb060']), flick: 0 });
  if (L !== 'temple') for (let x = 10; x < W - 10; x += 16) fl.decor.push({ k: 'bunting', x: x * T, y: 0 });
  // ---- people
  const npc = (role, x, extra) => { const sv = NE.makeSurvivor(); fl.spawns.push(Object.assign({ kind: 'town', role, x: at(x), name: sv.name, look: sv.look }, extra || {})); };
  for (const m of D.merch) npc(m === 'trader' ? 'trader' : 'merchant', take(ri(lo + 3, hi - 3)), { merch: m });
  if (D.doctor) npc('doctor', take(ri(lo + 3, hi - 3)));
  for (let i = 0; i < (D.folk || 3); i++) npc('folk', ri(lo + 2, hi - 2), { tint: pick(pal) });
  fl.feetY = (fl.y0 + gv) * T; for (const r of rows) this.rows.push(r);
  for (let x = 0; x < W; x++) g[x] = surfY(x) < gv + 2 ? Math.min(gv, surfY(x)) : gv;
  for (const o of fl.objs) o.y = o.type === 'lamp' ? this.ceilY(fl, o.x) + 1 : this.groundY(fl, o.x);
  for (const sp of fl.spawns) sp.y = this.groundY(fl, sp.x); for (const d of fl.decor) d.y = this.groundY(fl, d.x);
  this.floors.push(fl); return fl;
};
// town NPCs: merchants get their speciality, folk wear the town's colours
const spawn0 = G.spawnFloor;
G.spawnFloor = function (fl, restoring) {
  const n0 = G.actors.length; spawn0.call(this, fl, restoring);
  if (!fl.town) return; const def = fl.town.def || {}; const sp = (fl.spawns || []).filter(s => s.kind === 'town'); const npcs = G.actors.slice(n0).filter(a => a.town);
  npcs.forEach((n, i) => { const s = sp[i]; if (!s) return;
    if (s.merch && s.merch !== 'trader') { const M = NE.MERCH[s.merch]; n.role = 'trader'; n.merch = s.merch; n.act = 'trade'; n.label = M.title + ' ' + n.name.split(' ')[0]; n.greet = M.greet; n.sellMul = M.sellMul || 1; if (M.shirt) n.shirt = M.shirt; n.stock = NE.withSeed(G.world.seed + fl.f * 11 + i, () => NE.merchStock(s.merch, fl.depth)); }
    else if (s.role === 'trader') { n.greet = NE.MERCH.trader.greet; n.stock = NE.withSeed(G.world.seed + fl.f * 13, () => NE.merchStock('trader', fl.depth).concat((n.stock || []).slice(0, 2))); }
    if (s.role === 'folk' && s.tint && chance(0.6)) n.shirt = s.tint; });
};
// the trade window uses the merchant's own greeting and pays the fence's premium
const trade0 = NE.UI.render.trade;
NE.UI.render.trade = function (b, npc) { const mul0 = G.player.stats.barter; const sm = npc && npc.sellMul || 1; G.player.stats.barter = mul0 / Math.sqrt(sm); try { trade0.call(this, b, npc); } finally { G.player.stats.barter = mul0; } if (npc && npc.greet) { const p = b.querySelector('.trade > p.dim'); if (p) p.textContent = '"' + npc.greet + '"'; } };
// special features
G.townFeat = function (o) {
  const p = G.player, A = p.anat; const R = G.run; R.tfeat = R.tfeat || {}; const key = o.feat + '@' + Math.round(o.x) + ',' + Math.round(o.y);
  const pay = n => { if (G.tradeValue(p.inv) < n) { G.toast('Not enough to pay (' + n + ').'); NE.Audio.play('deny'); return false; } G.payValue(p.inv, n); NE.Audio.play('buy'); return true; };
  switch (o.feat) {
    case 'shrine': if (R.tfeat[key]) return G.toast('You already prayed here.'); R.tfeat[key] = 1; A.stress = Math.max(0, A.stress - 45); A.painSpike *= 0.5; for (const k of NE.PARTS) { const P = A.parts[k]; if (!P.severed) P.hp = Math.min(P.max, P.hp + 12); } NE.Audio.play('chime'); G.flashT = 0.4; G.toast('A warm hum fills your chest. Calm. (stress −45, wounds ease)'); break;
    case 'bath': if (R.tfeat[key]) return G.toast('You\'re already clean as you\'ll get.'); R.tfeat[key] = 1; A.temp = Math.max(A.temp, 37.2); A.wet = 0; A.infection *= 0.6; for (const k of NE.PARTS) for (const w of A.parts[k].wounds) w.dirty = 0; A.stress = Math.max(0, A.stress - 20); NE.Audio.play('splash'); G.toast('You soak in the hot spring. Warm, clean wounds, infection eased.'); break;
    case 'stove': if (!pay(8)) return; A.hunger = 100; A.thirst = Math.min(100, A.thirst + 40); A.stress = Math.max(0, A.stress - 10); NE.Audio.play('gulp'); G.toast('A bowl of something hot and peppery. Full.'); break;
    case 'dice': { const bet = 10; NE.UI.dialog('Bone Dice', '<i>A one-eyed woman rattles three knucklebones in a cup. "Ten silver. Beat my roll, I pay double."</i>', [{ label: 'Roll (bet ' + bet + ')', hint: 'About 45% to win 20', disabled: G.tradeValue(p.inv) < bet, fn: () => { G.payValue(p.inv, bet); const me = ri(3, 18), her = ri(3, 18); NE.Audio.play('rummage'); NE.Audio.play('click'); if (me > her) { const left = p.inv.add('silver', 20); if (left) G.dropEntry({ id: 'silver', n: left }); G.toast('You roll ' + me + ' against ' + her + '. +20 silver!'); NE.Audio.play('buy'); } else G.toast('You roll ' + me + ' against ' + her + '. She takes your silver.'); } }, { label: 'Walk away' }]); break; }
    case 'mapdesk': { if (!pay(15)) return; const W = G.world; const f0 = G.floorIdx(p.y); W.ensure(f0 + 4, fl => G.spawnFloor(fl)); for (let f = f0 + 1; f <= f0 + 3; f++) { const fl = W.floors[f]; if (fl && fl.seen) fl.seen.fill(1); } G.toast('The cartographer sketches the next three levels for you (see Map).'); break; }
    case 'anvil': { const worn = ['head', 'body', 'hands', 'feet'].map(s => p.gear[s]).filter(e => e && IT[e.id].dur && e.dur < IT[e.id].dur); if (!worn.length) return G.toast('Nothing of yours needs repairing.'); if (!pay(10)) return; for (const e of worn) e.dur = IT[e.id].dur; NE.Audio.play('metal'); NE.Audio.play('block', 0.5); G.toast('Hammered out the dents: armour fully repaired.'); break; }
  }
};
const interact0 = G.interact;
G.interact = function () { const o = G.interactTarget(); if (o && o.act === 'tfeat') return G.townFeat(o); return interact0.apply(this, arguments); };
// arriving in a town: the welcome line names what makes it special
const depth0 = G.depthTrack; G.depthTrack = function (p) { depth0.call(this, p); const fl = G.curFloor && G.curFloor(); if (fl && fl.town && fl.town.def && G.run && !(G.run.townSeen || {})[fl.f]) { G.run.townSeen = G.run.townSeen || {}; G.run.townSeen[fl.f] = 1; const D = fl.town.def; setTimeout(() => { G.log(fl.town.name + ': ' + D.line, 'good'); G.log('Here: ' + D.merch.map(m => NE.MERCH[m].title).join(', ') + (D.doctor ? ', Doctor' : '') + ' • ' + D.feat.map(k => ({ shrine: 'Shrine', bath: 'Hot spring', stove: 'Soup kitchen', dice: 'Dice table', mapdesk: 'Cartographer', anvil: 'Anvil' })[k]).join(', '), 'sys'); }, 1200); } };
// drawing: town features + new town decor
const drawObj0 = G.drawObj;
G.drawObj = function (ctx, o) {
  if (o.type !== 'tfeat') return drawObj0(ctx, o); const x = Math.round(o.x), y = Math.round(o.y); const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); }; const t = G.t;
  switch (o.feat) {
    case 'shrine': R(-6, -3, 12, 3, '#5a4a3a'); R(-4, -14, 8, 11, '#7a6040'); R(-3, -13, 6, 9, '#3a2a1a'); R(-1, -11, 2, 5, '#ffd040'); R(-5, -16, 10, 2, '#8a7050'); if (Math.sin(t * 3) > 0) R(0, -12, 1, 1, '#fff6c0'); break;
    case 'bath': R(-12, -4, 24, 4, '#5a5048'); R(-11, -3, 22, 3, '#3a6a7a'); for (let i = 0; i < 3; i++) { const k = (t * 0.6 + i * 0.33) % 1; ctx.fillStyle = 'rgba(230,240,245,' + (0.5 * (1 - k)) + ')'; ctx.fillRect(x - 8 + i * 7, y - 6 - Math.round(k * 14), 2, 2); } break;
    case 'stove': R(-6, -8, 12, 8, '#3a3434'); R(-5, -7, 10, 2, '#5a5050'); R(-4, -11, 8, 3, '#6a6a6a'); R(-3, -3, 6, 2, Math.sin(t * 8) > 0 ? '#ff8020' : '#ffb040'); if (Math.random() < 0.1) G.addP(x, y - 12, rf(-4, 4), -12, 1, '#c0c0c0', 'steam', -0.05); break;
    case 'dice': R(-7, -6, 14, 2, '#5a3a24'); R(-6, -4, 1, 4, '#3a2418'); R(5, -4, 1, 4, '#3a2418'); R(-3, -8, 2, 2, '#e8e0c8'); R(1, -8, 2, 2, '#e8e0c8'); R(-1, -9, 1, 1, '#e8e0c8'); break;
    case 'mapdesk': R(-8, -7, 16, 2, '#6a4a2a'); R(-7, -5, 1, 5, '#4a3018'); R(6, -5, 1, 5, '#4a3018'); R(-6, -9, 11, 2, '#d8c8a0'); R(-4, -9, 1, 1, '#a03020'); R(1, -9, 3, 1, '#4a6a8a'); break;
    case 'anvil': R(-6, -6, 12, 2, '#4a4a50'); R(-3, -4, 6, 4, '#3a3a40'); R(4, -6, 4, 1, '#4a4a50'); R(-5, -6, 10, 1, '#7a7a80'); break;
  }
};
const drawDecor0 = NE.drawDecor;
NE.drawDecor = function (ctx, d, pal, time, fl) {
  const x = Math.round(d.x), y = Math.round(d.y); const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); }; const col = d.col || '#6a4a30';
  switch (d.k) {
    case 'stall': { R(-10, -16, 20, 3, NE.shade(col, 1.2)); for (let i = 0; i < 5; i++) R(-10 + i * 4, -13, 2, 2, i % 2 ? '#e8e0c8' : col); R(-9, -13, 1, 13, '#3a2a1a'); R(8, -13, 1, 13, '#3a2a1a'); R(-9, -6, 18, 2, '#5a3a24'); R(-6, -8, 3, 2, '#c05030'); R(-1, -8, 2, 2, '#e0c050'); R(3, -8, 3, 2, '#60a040'); break; }
    case 'banner': { const ceil = fl && fl.c ? (fl.y0 + fl.c[clamp(Math.floor(d.x / T), 0, fl.c.length - 1)]) * T : y - 50; const L = Math.min(26, y - ceil - 8); R(0, ceil - y, 1, 4, '#3a2a1a'); for (let i = 0; i < L; i++) { ctx.fillStyle = i % 9 === 4 ? NE.shade(col, 1.4) : col; ctx.fillRect(x - 2 + Math.round(Math.sin(time * 1.5 + i * 0.2) * (i / L)), ceil + 4 + i, 5, 1); } break; }
    case 'lanterns': { const ceil = fl && fl.c ? (fl.y0 + fl.c[clamp(Math.floor(d.x / T), 0, fl.c.length - 1)]) * T : y - 50; for (let i = 0; i < 4; i++) { const lx = x + i * 9, ly = ceil + 10 + (i % 2) * 5; ctx.fillStyle = '#2a2018'; ctx.fillRect(lx, ceil, 1, ly - ceil); ctx.fillStyle = ['#ff8040', '#ffd060', '#ff6070', '#80d0ff'][i]; ctx.fillRect(lx - 1, ly, 3, 4); } break; }
    case 'pots': { for (let i = 0; i < 3; i++) { R(i * 6, -5 - (i % 2), 4, 5 + (i % 2), NE.shade(col, 1 - i * 0.1)); R(i * 6 + 1, -6 - (i % 2), 2, 1, '#2a1a10'); } break; }
    case 'palisade': { for (let i = 0; i < 6; i++) { R(i * 3, -18 - (i % 2) * 2, 2, 18 + (i % 2) * 2, i % 2 ? '#5a4028' : '#6a4a30'); R(i * 3, -19 - (i % 2) * 2, 2, 1, '#8a6a40'); } break; }
    case 'steam': { for (let i = 0; i < 4; i++) { const k = (time * 0.4 + i * 0.25 + d.s) % 1; ctx.fillStyle = 'rgba(220,230,240,' + (0.35 * (1 - k)) + ')'; ctx.fillRect(x + i * 3, y - 4 - Math.round(k * 24), 3, 3); } break; }
    case 'forge': { R(-8, -14, 16, 14, '#3a3030'); R(-6, -8, 12, 6, Math.sin(time * 6) > 0 ? '#ff6020' : '#ff9030'); R(-2, -22, 4, 8, '#2a2424'); if (Math.random() < 0.05) G.addP(d.x, d.y - 22, rf(-3, 3), -20, 1.2, '#888', 'steam', -0.05); break; }
    case 'column': { R(-3, -30, 6, 30, NE.shade(col, 1)); R(-4, -32, 8, 2, NE.shade(col, 1.2)); R(-4, -2, 8, 2, NE.shade(col, 0.8)); R(-1, -28, 1, 26, NE.shade(col, 0.8)); break; }
    case 'boat': { R(-12, -4, 24, 3, '#5a3a24'); R(-14, -6, 3, 3, '#5a3a24'); R(11, -6, 3, 3, '#5a3a24'); R(-11, -5, 22, 1, '#7a5a38'); R(0, -22, 1, 18, '#3a2a1a'); R(1, -20, 7, 10, '#c8c0a8'); break; }
    case 'bigroot': { const ceil = fl && fl.c ? (fl.y0 + fl.c[clamp(Math.floor(d.x / T), 0, fl.c.length - 1)]) * T : y - 80; ctx.fillStyle = '#3a2a1a'; for (let yy = ceil; yy < y; yy++) { const k = (yy - ceil) / (y - ceil); const w = Math.round(8 + 10 * Math.abs(Math.sin(k * 3)) + (k > 0.85 ? (k - 0.85) * 120 : 0)); ctx.fillRect(x - (w >> 1) + Math.round(Math.sin(k * 6) * 3), yy, w, 1); } ctx.fillStyle = '#4a3a24'; for (let i = 0; i < 20; i++) ctx.fillRect(x - 6 + (i * 7) % 12, ceil + i * 5, 1, 4); break; }
    case 'crystaltree': { const ceil = fl && fl.c ? (fl.y0 + fl.c[clamp(Math.floor(d.x / T), 0, fl.c.length - 1)]) * T : y - 80; const g = 0.5 + 0.5 * Math.sin(time * 1.5); for (let yy = y - 70; yy < y; yy++) { const k = (y - yy) / 70; const w = Math.max(1, Math.round(10 * (1 - k))); ctx.fillStyle = k > 0.6 ? 'rgba(180,160,255,' + (0.6 + g * 0.3) + ')' : '#6a5aa0'; ctx.fillRect(x - (w >> 1), yy, w, 1); } ctx.fillStyle = 'rgba(200,190,255,0.25)'; ctx.fillRect(x - 16, y - 80, 32, 12); break; }
    case 'stilthut': { const c = col; R(-11, -22, 22, 12, NE.shade(c, 0.7)); R(-10, -21, 20, 10, c); R(-12, -25, 24, 3, NE.shade(c, 0.6)); R(-3, -18, 5, 7, '#1a1410'); R(-10, -10, 1, 10, '#3a2a1a'); R(9, -10, 1, 10, '#3a2a1a'); R(-1, -10, 1, 10, '#3a2a1a'); break; }
    default: return drawDecor0(ctx, d, pal, time, fl);
  }
};
})(window.NE);

// =====================================================================================================================
// PARTY ON THE MAP + an edge arrow on screen that always points to your partner
// =====================================================================================================================
(function (NE) {
'use strict';
const G = NE.G, UI = NE.UI; const $ = s => document.querySelector(s);
const partner = () => { const N = G.net; return N && N.on && N.peer && !N.peer.hidden ? N.peer : null; };
const pname = () => { const N = G.net; return (N && N.peerSurv && (N.peerSurv.first || N.peerSurv.name)) || 'Partner'; };
const drawMap0 = UI.drawMap;
UI.drawMap = function () {
  drawMap0.call(this); const cv = $('#mapcv'); const g = G, W = g.world, p = g.player, q = partner(); if (!cv || !W || W.lobby || !q || !p) return; const c = cv.getContext('2d');
  const S = 3, FH = NE.FH; const fi = g.floorIdx(p.y - 2); const f0 = Math.max(0, fi - 3); const f1 = Math.min(W.floors.length - 1, fi + 4);
  const px = 60 + p.x / NE.T * S, py = (p.y / NE.T - f0 * FH) * S - 3; let qx = 60 + q.x / NE.T * S, qy = (q.y / NE.T - f0 * FH) * S - 3; const H = cv.height;
  const off = qy < 4 ? -1 : qy > H - 4 ? 1 : 0; const cy = Math.max(6, Math.min(H - 6, qy));
  // line + arrowhead from you toward them
  const ang = Math.atan2(cy - py, qx - px); c.strokeStyle = 'rgba(90,220,255,0.55)'; c.setLineDash([3, 3]); c.lineWidth = 1; c.beginPath(); c.moveTo(px, py); c.lineTo(qx, cy); c.stroke(); c.setLineDash([]);
  const ax = off ? qx : px + Math.cos(ang) * Math.min(18, Math.hypot(qx - px, cy - py) - 4), ay = off ? cy : py + Math.sin(ang) * Math.min(18, Math.hypot(qx - px, cy - py) - 4);
  c.fillStyle = '#5ae0ff'; c.beginPath(); c.moveTo(ax + Math.cos(ang) * 5, ay + Math.sin(ang) * 5); c.lineTo(ax + Math.cos(ang + 2.5) * 5, ay + Math.sin(ang + 2.5) * 5); c.lineTo(ax + Math.cos(ang - 2.5) * 5, ay + Math.sin(ang - 2.5) * 5); c.closePath(); c.fill();
  if (!off) { c.fillStyle = '#5ae0ff'; c.fillRect(qx - 2, qy - 3, 4, 6); }
  const dm = Math.round((q.y - p.y) / NE.T * NE.MPT); c.font = '9px monospace'; c.fillStyle = '#5ae0ff'; c.fillText(pname() + (off ? (dm > 0 ? ' ↓' : ' ↑') + Math.abs(dm) + 'm' : ''), Math.min(cv.width - 70, qx + 5), Math.max(10, Math.min(H - 3, cy + 3)));
};
const render0 = UI.render.map; UI.render.map = function (b) { render0.call(this, b); if (partner()) { const leg = b.querySelector('.map-leg'); if (leg) leg.insertAdjacentHTML('afterbegin', '<span><i style="background:#5ae0ff"></i>' + pname() + '</span>'); } };
// on-screen arrow at the edge of the view when your partner is out of sight
UI.partyArrow = function () {
  const g = G, q = partner(), p = g.player; let el = $('#parrow'); const run = g.state === 'run' || g.state === 'burst' || g.state === 'dying';
  if (!q || !p || !run) { if (el) el.style.display = 'none'; return; }
  const gm = $('#game'), r = gm.getBoundingClientRect(); const sp = UI.toScreen(q.x, q.y - 12); const m = 46; const inView = sp.x > 0 && sp.x < r.width && sp.y > 0 && sp.y < r.height;
  if (!el) { el = document.createElement('div'); el.id = 'parrow'; el.style.cssText = 'position:absolute;pointer-events:none;z-index:6;display:flex;flex-direction:column;align-items:center;gap:2px;font-family:VT323,monospace;color:#7ae8ff;text-shadow:1px 1px 0 #000,0 0 6px #000;font-size:.85em;transform:translate(-50%,-50%)'; el.innerHTML = '<div class="pa-h" style="width:0;height:0;border-left:.55em solid transparent;border-right:.55em solid transparent;border-bottom:1.1em solid #5ae0ff;filter:drop-shadow(0 0 3px #000)"></div><span></span>'; $('#hud').appendChild(el); }
  if (inView) { el.style.display = 'none'; return; }
  const cx = r.width / 2, cy = r.height / 2; const dx = sp.x - cx, dy = sp.y - cy; const k = Math.min((cx - m) / Math.abs(dx || 1e-3), (cy - m) / Math.abs(dy || 1e-3)); const ex = cx + dx * k, ey = cy + dy * k;
  el.style.display = 'flex'; el.style.left = ex + 'px'; el.style.top = ey + 'px'; el.firstChild.style.transform = 'rotate(' + (Math.atan2(dy, dx) * 180 / Math.PI + 90) + 'deg)';
  const dm = Math.round(Math.hypot(q.x - p.x, q.y - p.y) / NE.T * NE.MPT); const dd = Math.round((q.y - p.y) / NE.T * NE.MPT); el.lastChild.textContent = pname() + ' ' + dm + 'm' + (Math.abs(dd) > 5 ? (dd > 0 ? ' ↓' : ' ↑') : '');
  const N = G.net; el.style.color = N && N.peerMed && N.peerMed.u === 1 ? '#ff7a6a' : '#7ae8ff';
};
const tick0 = UI.tick; UI.tick = function (dt) { tick0.call(this, dt); try { UI.partyArrow(); } catch (e) { } };
})(window.NE);

// =====================================================================================================================
// RANDOM EVENTS: 10 new ones + a banner at the top showing whatever is going on right now
// =====================================================================================================================
(function (NE) {
'use strict';
const { ri, rf, pick, chance, clamp } = NE; const T = NE.T; const G = NE.G; const $ = s => document.querySelector(s);
NE.EVENTS = {
  cavein: { name: 'CAVE-IN', col: '#d8a060', dur: 6 }, blackout: { name: 'TOTAL DARKNESS', col: '#8a8aff' }, gas: { name: 'GAS LEAK', col: '#a0c060', dur: 40 }, ambush: { name: 'AMBUSH', col: '#ff6a5a', dur: 20 }, beacon: { name: 'DISTRESS BEACON BELOW', col: '#ffd060', dur: 12 },
  quake: { name: 'TREMORS', col: '#d8a060', dur: 25, w: 2.2, msg: 'The whole cave starts to shake. Watch the ceiling.' },
  flood: { name: 'FLASH FLOOD', col: '#5ac0e0', dur: 35, w: 1.6, msg: 'Water bursts from the rock above. It\'s rising.' },
  spores: { name: 'SPORE STORM', col: '#a0b050', dur: 25, w: 1.4, msg: 'Fungus everywhere ruptures at once. The air turns yellow.' },
  coldsnap: { name: 'COLD SNAP', col: '#a0d8ff', dur: 45, w: 1.4, msg: 'A freezing wind pours down the shafts. Get warm.' },
  heatwave: { name: 'HEAT BLOOM', col: '#ff9040', dur: 45, w: 1.2, msg: 'The rock is sweating. Drink while you can.' },
  hunt: { name: 'THE HUNT', col: '#ff4a4a', dur: 30, w: 1.4, msg: 'Something has your scent. Every hostile on this level is coming.' },
  whispers: { name: 'WHISPERS', col: '#c090ff', dur: 30, w: 1.2, msg: 'Voices in the dark. They know your name.' },
  nectarbloom: { name: 'NECTAR BLOOM', col: '#ffd23a', dur: 40, w: 0.9, good: 1, msg: 'A sweet smell drifts by. A relic flower is blooming on this level.' },
  supplydrop: { name: 'SUPPLY DROP', col: '#7ad07a', dur: 20, w: 1.1, good: 1, msg: 'A winch rattles: someone up top lowered a supply pod nearby.' },
  frenzy: { name: 'BLOOD FRENZY', col: '#ff2a3a', dur: 30, w: 1.1, msg: 'The creatures down here go wild. They\'re faster and angrier.' },
};
G.events = function (dt) {
  if (G.state !== 'run') return; const net = G.net && G.net.on ? G.net : null; if (net && net.role === 'guest') return;
  G.eventT -= dt; if (G.eventT > 0) return; G.eventT = rf(60, 115);
  const p = G.player; const q = net && net.peer && net.peer.alive && !net.peer.hidden ? net.peer : null;
  const tgt = q && (!p.alive || chance(0.5)) ? q : p; if (!tgt.alive) { G.eventT = 20; return; }
  const fl = G.world.floors[G.floorIdx(tgt.y - 2)] || G.curFloor(); const b = fl.biome; if (fl.f === 0 || fl.town) { G.eventT = 20; return; }
  const tbl = [['cavein', b.id === 'desert' ? 4.5 : 3], ['blackout', 2], ['gas', b.id === 'grotto' ? 0.8 : 0.6], ['beacon', 2.2], ['ambush', 1.4 + Math.min(1, fl.depth / 1200)]];
  for (const k in NE.EVENTS) { const E = NE.EVENTS[k]; if (!E.w) continue; let w = E.w; if (k === 'coldsnap' && (b.id === 'magma' || b.id === 'heart')) w = 0; if (k === 'heatwave' && b.id === 'ice') w = 0; if (k === 'spores' && b.id === 'ice') w *= 0.3; if (k === 'flood' && (b.id === 'drowned' || b.id === 'grotto')) w *= 1.6; tbl.push([k, w]); }
  const ev = NE.wpick(tbl);
  const d = { ev, f: fl.f, dur: rf(28, 45), side: chance(0.5) ? 4 : G.world.W - 4, bf: fl.f + ri(1, 2), bx: ri(6, G.world.W - 6) * T, trap: chance(0.35), ax: tgt.x > G.world.W * T / 2 ? 5 * T : (G.world.W - 5) * T, k: fl.depth > 700 && chance(0.4) ? 2 : 1, tg: tgt === p ? 'host' : 'guest',
    xs: [ri(8, G.world.W - 9), ri(8, G.world.W - 9), ri(8, G.world.W - 9)], px: clamp(tgt.x + rf(-50, 50), 6 * T, (G.world.W - 6) * T) };
  G.applyEvent(d, tgt === q ? q : p);
  if (net) net.send({ t: 'ev', d });
};
const apply0 = G.applyEvent;
G.applyEvent = function (d, focus) {
  const E = NE.EVENTS[d.ev]; const fl = G.world.floors[d.f]; if (!fl) return; const p = G.player; const here = p && p.alive && G.floorIdx(p.y - 2) === d.f;
  const dur = d.ev === 'blackout' ? d.dur : (E && E.dur) || 20; G.activeEvent = { ev: d.ev, t: dur, max: dur, f: d.f, d, here };
  if (!E || !E.w) return apply0.call(this, d, focus);
  G.log(E.msg + (here ? '' : ' (another level)'), E.good ? 'good' : 'bad'); NE.Audio.play(E.good ? 'chime' : 'rumble', here ? 0.8 : 0.3);
  const W = G.world, host = !G.net || !G.net.on || G.net.role === 'host';
  if (d.ev === 'flood') { fl.springs = fl.springs || []; for (const x of d.xs.slice(0, 2)) { const cy = fl.y0 + fl.c[x]; fl.springs.push({ tx: x, ty: cy, type: 5, left: 30, t: 0 }); } }
  if (d.ev === 'nectarbloom') { const x = d.xs[0] * T + 4; fl.objs.push({ type: 'relic', x, y: W.groundY(fl, x), label: 'Relic Flower', act: 'harvest', hue: 1 }); }
  if (d.ev === 'supplydrop') { const x = d.px; const o = W.container('pod', x, W.groundY(fl, x), fl.depth); o.label = 'Lowered Supply Pod'; fl.objs.push(o); G.dust(x, W.groundY(fl, x), 10); NE.Audio.play('thud', here ? 1 : 0.3); }
};
// ongoing effects
G.eventTick = function (dt) {
  const A = G.activeEvent; if (!A) return; A.t -= dt; if (A.t <= 0) { G.activeEvent = null; return; }
  const fl = G.world.floors[A.f]; const p = G.player; const here = p && p.alive && fl && G.floorIdx(p.y - 2) === A.f; const host = !G.net || !G.net.on || G.net.role === 'host'; A.acc = (A.acc || 0) - dt;
  if (A.ev === 'quake' && A.acc <= 0) { A.acc = rf(1.8, 3.5); if (here) { G.shake(3.5); NE.Audio.play('rumble', 0.6); for (let i = 0; i < ri(1, 3); i++) { const x = clamp(p.x + rf(-70, 70), 4 * T, (G.world.W - 4) * T); const dd = G.phys.box('debris', x, G.world.ceilY(fl, x) + 5, rf(3, 6), rf(3, 5), 2.2, fl.biome.pal.tile); dd.setVel(rf(-20, 20), rf(30, 70)); G.dust(x, G.world.ceilY(fl, x) + 6, 4); } } }
  if (A.ev === 'spores' && A.acc <= 0 && here) { A.acc = rf(2.5, 4); G.gas.push({ spore: true, x: p.x + rf(-60, 60), y: p.y - 10, r: 10, d: 0.6, vx: rf(-6, 6), life: rf(12, 18), max: 30 }); }
  if (A.ev === 'hunt' && A.acc <= 0 && host) { A.acc = 2; const who = A.d.tg === 'guest' && G.net && G.net.peer ? G.net.peer : p; for (const e of G.actors) if (e.alive && e.D && e.hostile !== false && !e.leaving && Math.abs(e.y - who.y) < 60) { e.target = who; e.state = 'chase'; e.lastSeen = { x: who.x, y: who.y }; } }
  if (A.ev === 'whispers' && here) { p.anat.stress = Math.min(100, p.anat.stress + dt * 2.5); if (A.acc <= 0) { A.acc = rf(2, 5); NE.Audio.play(pick(['step', 'step', 'breath', 'growl', 'shout']), rf(0.15, 0.4)); if (chance(0.35)) G.say(pick(['Who\'s there?', 'Stop. Stop it.', 'That was my name...', 'It\'s not real.']), 1); } }
  if (A.ev === 'frenzy' && host) for (const e of G.actors) if (e.alive && e.D && Math.abs(e.y - (p ? p.y : 0)) < 300) { if (!e._fz) { e._fz = true; e.speedMul *= 1.25; } if (e.cd > 0) e.cd -= dt * 0.25; }
  if (A.ev === 'frenzy' && A.t <= dt * 1.5) for (const e of G.actors) if (e._fz) { e._fz = false; e.speedMul /= 1.25; }
};
const env0 = G.computeEnv; G.computeEnv = function (p) { const env = env0.call(this, p); const A = G.activeEvent; if (A && p && G.floorIdx(p.y - 2) === A.f) { if (A.ev === 'coldsnap') env.cold = (env.cold || 0) + 1.3; if (A.ev === 'heatwave') { env.heat = (env.heat || 0) + 1.1; env.thirstMul = (env.thirstMul || 1) * 1.6; } } return env; };
const upd0 = G.update; G.update = function (dt, rdt) { upd0.call(this, dt, rdt); if (G.state === 'run' || G.state === 'burst') G.eventTick(dt); else if (G.state === 'lobby') G.activeEvent = null; };
// banner at the top of the screen
NE.UI.eventBanner = function () {
  let el = $('#evbanner'); const A = G.activeEvent; const show = A && (G.state === 'run' || G.state === 'burst');
  if (!el) { el = document.createElement('div'); el.id = 'evbanner'; el.style.cssText = 'position:absolute;top:.6em;left:50%;transform:translateX(-50%);pointer-events:none;z-index:6;font-family:VT323,monospace;font-size:1.05em;letter-spacing:.12em;padding:.15em .9em;border-radius:.4em;background:rgba(10,6,4,.78);border:1px solid;display:none;text-shadow:0 0 6px currentColor;white-space:nowrap'; document.getElementById('hud').appendChild(el); }
  if (!show) { el.style.display = 'none'; return; } const E = NE.EVENTS[A.ev] || { name: A.ev.toUpperCase(), col: '#ddd' }; const p = G.player; const here = p && G.floorIdx(p.y - 2) === A.f;
  el.style.display = 'block'; el.style.color = E.col; el.style.borderColor = E.col + '88'; el.style.opacity = here ? 1 : 0.65;
  const txt = (E.good ? '✦ ' : '⚠ ') + E.name + (here ? '' : ' (other level)') + '  ' + Math.ceil(A.t) + 's'; if (el.textContent !== txt) el.textContent = txt;
};
const tick0 = NE.UI.tick; NE.UI.tick = function (dt) { tick0.call(this, dt); try { NE.UI.eventBanner(); } catch (e) { } };
})(window.NE);

// =====================================================================================================================
// IMPALING, MORE GORE, and fighting without arms (kick / headbutt)
// =====================================================================================================================
(function (NE) {
'use strict';
const { rf, pick, chance, clamp } = NE; const T = NE.T; const G = NE.G;
// gore VFX +35%
const blood0 = G.blood; G.blood = function (x, y, n, dx, dy) { return blood0.call(this, x, y, Math.round(n * 1.35), dx, dy); };
const spray0 = NE.Combat.spray; NE.Combat.spray = function (x, y, dx, dy, n) { return spray0.call(this, x, y, dx, dy, Math.round(n * 1.35)); };
// ---- impaling: a heavy thrust or lunge with a stabbing weapon can run someone clean through and hold them there
NE.IMPALERS = { spear: 1, knife: 0.7, shiv: 0.6, machete: 0.6, cleaver: 0.4, fireaxe: 0.35, pickaxe: 0.5, sawarm: 0.4, claws: 0.5 };
NE.tryImpale = function (a, t, w, part, dmg, kind) {
  if (!t.alive || t.impaled || a.impaling || t.town || t.isRemote || t.isPuppet || !a.strk) return; const id = w.id || (a.D && a.D.reach > 12 ? 'claws' : null); const k = NE.IMPALERS[id]; if (!k || kind !== 'sharp' || part === 'head' && !chance(0.3)) return;
  const deep = a.strk.kind === 'thrust' || a.strk.lunge || (a.strk.heavy || 0) > 1; if (!deep || dmg < (a.isPlayer ? 16 : 14)) return;
  if (!chance(k * (a.isPlayer ? 0.55 : 0.32) * (a.strk.lunge ? 1.4 : 1))) return;
  NE.impale(a, t, part);
};
NE.impale = function (a, t, part) {
  part = part === 'head' ? 'head' : part === 'torso' || chance(0.6) ? 'torso' : part; const A = t.anat; const P = A.parts[part];
  t.impaled = { by: a, t: 0, dur: a.isPlayer ? 1.1 : 1.4, part, dir: a.facing }; a.impaling = t; a.cd = Math.max(a.cd || 0, 1.2); a.strk = null; a.charge = null;
  P.wounds.push({ t: 'punct', bleed: rf(2.5, 4), dirty: 0.25, inf: 0, closed: false, age: 0, bullet: chance(0.5) }); A.painSpike += 45; A.stress = Math.min(100, (A.stress || 0) + 30);
  if (part === 'torso' && chance(0.5)) { const o = pick(['lungs', 'liver', 'stomach']); A.org[o] = Math.max(0, A.org[o] - rf(15, 30)); }
  NE.Audio.play('squelch', 1); NE.Audio.play('crack', 0.8); NE.Audio.play('slash', 0.7); G.shake(t.isPlayer ? 6 : 4); G.slowmo = Math.max(G.slowmo || 0, 0.3);
  NE.Combat.spray(t.x, t.cy, a.facing, -0.2, 22); if (t.isPlayer) { G.say(pick(['AGH— it\'s IN me—', 'Get it OUT!', 'No no no—']), 1); G.toast('IMPALED! Mash [SPACE] to tear free.'); } else if (a.isPlayer) G.toast('Impaled ' + (t.D ? t.D.name : 'them') + '!');
  if (t.onAggro) t.onAggro(a);
};
G.impaleTick = function (dt) {
  for (const t of G.actors) { const I = t.impaled; if (!I) continue; const a = I.by; I.t += dt;
    const free = !t.alive || !a.alive || a.rd || I.t >= I.dur || (t.isPlayer && I.mash >= 1);
    if (!free) { // hang on the blade, feet off the ground
      const tx = a.x + I.dir * (a.isPlayer ? 13 : 12), ty = a.y - 1; t.x += (tx - t.x) * Math.min(1, dt * 18); t.y += (ty - t.y) * Math.min(1, dt * 18); t.vx = 0; t.vy = 0; t.stagger = Math.max(t.stagger || 0, 0.2); t.charge = null; t.guard = null;
      if (Math.random() < dt * 25) NE.Combat.spray(t.x, t.cy, I.dir, 0.4, 2); if (t.isPlayer && G.keys.Space && !I._sp) { I.mash = (I.mash || 0) + 0.22; NE.Audio.play('pain', 0.5); } if (t.isPlayer) I._sp = !!G.keys.Space; continue; }
    // yank the blade out: big spray, they drop
    t.impaled = null; a.impaling = null; NE.Combat.spray(t.x, t.cy, I.dir, -0.3, 18); NE.Audio.play('squelch', 0.9);
    if (t.alive && t.knockdown) t.knockdown(I.dir * 140, -60, t.isPlayer ? 0.7 : 1.1); if (a.alive) a.cd = Math.max(a.cd || 0, 0.35);
  }
};
const upd0 = G.update; G.update = function (dt, rdt) { upd0.call(this, dt, rdt); try { G.impaleTick(dt); } catch (e) { } };
// impaled player can't act
const pu0 = NE.Player.prototype.update; NE.Player.prototype.update = function (dt, input) { if (this.impaled) input = { mx: 0 }; return pu0.call(this, dt, input); };
const at0 = NE.Player.prototype.attack;
// ---- no arms? kick, or headbutt
NE.Player.prototype.armless = function () { const P = this.anat.parts; const gone = k => P[k].severed && !P[k].prost; return gone('larm') && gone('rarm'); };
NE.Player.prototype.bodyStrike = function (kind) {
  const g = this.g, A = this.anat; if ((this.cd || 0) > 0 || this.rd || A.uncon || this.impaled || this.climbing) return; if (kind === 'kick' && (A.legFactor().f < 0.4 || this.crawl)) kind = 'head';
  if (A.stam < 6) { g.say('Too tired...', 1); return; } A.stam -= kind === 'kick' ? 9 : 7; this.cd = kind === 'kick' ? 0.75 : 0.6;
  if (kind === 'kick') this.kickT = 0.3; else this.buttT = 0.28; NE.Audio.play('whoosh', 0.7);
  setTimeout(() => { if (!this.alive) return; let best = null, bd = kind === 'kick' ? 17 : 13; for (const t of g.actors) { if (!t.alive || t === this || t.town || t.isRemote || (t.faction === 'neutral' && !t.hostile)) continue; const dx = (t.x - this.x) * this.facing; if (dx < -2 || dx > bd || Math.abs(t.y - this.y) > 14) continue; if (dx < bd) { bd = dx; best = t; } }
    if (!best) return; if (best.dashIF > 0) return; const m = this.stats.melee * 1.2; const src = this.surv.first;
    if (kind === 'kick') { best.hurt(pick(['torso', 'torso', 'lleg', 'rleg']), 9 * m, 'blunt', src, { x: this.facing, y: -0.2 }); best.vx += this.facing * 210; best.vy -= 50; best.stagger = Math.max(best.stagger || 0, 0.7); if (best.guard) { best.guard = null; best.stagger = 1.1; } if (chance(0.2) && best.knockdown) best.knockdown(this.facing * 160, -60, 0.8); NE.Audio.play('hit', 0.9); }
    else { best.hurt('head', 11 * m, 'blunt', src, { x: this.facing, y: 0 }); best.stagger = Math.max(best.stagger || 0, 0.9); best.vx += this.facing * 120; this.anat.damage('head', 2.5, 'blunt', 'Headbutt'); NE.Audio.play('crack', 0.6); NE.Audio.play('hit', 0.8); g.shake(2); }
    g.slowmo = Math.max(g.slowmo || 0, 0.06); if (best.onAggro) best.onAggro(this); }, kind === 'kick' ? 140 : 120);
};
NE.Player.prototype.attack = function () { if (this.armless() && !this.weaponDef().gun) return this.bodyStrike('kick'); return at0.apply(this, arguments); };
const grab0 = G.startGrab; G.startGrab = function () { const p = G.player; if (p && p.alive && p.armless && p.armless() && G.playing()) return p.bodyStrike('head'); return grab0.apply(this, arguments); };
const tk = NE.Player.prototype.update; NE.Player.prototype.update = function (dt, input) { if (this.kickT > 0) this.kickT -= dt; if (this.buttT > 0) this.buttT -= dt; return tk.call(this, dt, input); };
// poses: kick and headbutt
const pose0 = NE.ragPose;
NE.ragPose = function (a) {
  const out = pose0(a); const f = a.facing;
  if (a.kickT > 0 && !a.crawl) { const k = Math.sin(Math.PI * (1 - a.kickT / 0.3)); const hip = out[2]; out[9] = [hip[0] + f * (2 + 4 * k), hip[1] + 3 - 3 * k]; out[10] = [hip[0] + f * (3 + 8 * k), hip[1] + 7 - 6 * k]; out[0][0] -= f * 1.2 * k; out[1][0] -= f * 0.8 * k; }
  if (a.buttT > 0) { const k = Math.sin(Math.PI * (1 - a.buttT / 0.28)); out[0][0] += f * 3.2 * k; out[0][1] += 1.5 * k; out[1][0] += f * 1.6 * k; }
  if (a.impaled) { const k = Math.sin(performance.now() / 70) * 0.6; out[0][1] -= 1; out[3][1] += 2 + k; out[5][1] += 2 - k; out[8][1] -= 1; out[10][1] -= 2; }
  return out;
};
})(window.NE);

// =====================================================================================================================
// [B] QUICK-TREAT: picks the best fix for your worst problem (tourniquet, dressing, splint, joint, forceps, drugs...)
// + Vespa-coloured progress bars
// =====================================================================================================================
(function (NE) {
'use strict';
const G = NE.G; const IT = NE.ITEMS; const LIMBS = ['larm', 'rarm', 'lleg', 'rleg'];
const have = (p, ids) => { for (const id of ids) { const e = p.inv.find(id); if (e) return e; } return null; };
const pn = k => NE.PART_NAMES[k].toLowerCase();
NE.quickPlan = function (p) {
  if (!p || !p.anat || !p.inv) return null; const A = p.anat; const P = A.parts;
  // 1. arterial bleeds: tourniquet
  for (const k of LIMBS) if (!P[k].tq && P[k].wounds.some(w => w.t === 'art' && !w.closed)) { const e = have(p, ['tourniquet']); if (e) return { e, part: k, label: 'Tourniquet ' + pn(k) }; }
  // 2. worst bleed: dressing (or forceps first if a fragment keeps it open)
  let bp = null, bb = 0.05; for (const k of NE.PARTS) { const b = A.partBleed(k); if (b > bb) { bb = b; bp = k; } }
  if (bp) { const e = have(p, ['bandage', 'cleanrag', 'rag']); if (e && NE.canTreat(p, e.id, bp) === true) return { e, part: bp, label: 'Dress ' + pn(bp) + ' (' + bb.toFixed(1) + '/s)' }; const s = have(p, ['suture']); if (s && NE.canTreat(p, 'suture', bp) === true) return { e: s, part: bp, label: 'Stitch ' + pn(bp) }; }
  // 3. lodged fragments
  for (const k of NE.PARTS) if (P[k].wounds.some(w => w.bullet)) { const e = have(p, ['forceps']); if (e) return { e, part: k, label: 'Pull fragment: ' + pn(k) }; }
  // 4. broken bones: splint
  for (const k of NE.PARTS) if (P[k].frac && !P[k].splint) { const e = have(p, ['splint']); if (e) return { e, part: k, label: 'Splint ' + pn(k) }; }
  // 5. dislocated joint: pop it back
  for (const k of LIMBS) if (P[k].disl) return { e: null, part: k, op: 'reset', label: 'Pop ' + pn(k) + ' back in' };
  // 6. blood loss: transfusion
  if (A.blood < 2800) { const e = have(p, ['bloodbag']); if (e) return { e, part: 'torso', label: 'Transfuse blood' }; }
  // 7. infection
  if (A.infection > 30) { const e = have(p, ['antibiotics']); if (e) return { e, part: 'torso', label: 'Antibiotics (infection)' }; }
  for (const k of NE.PARTS) if (P[k].wounds.some(w => w.dirty > 0.35 && !w.closed)) { const e = have(p, ['antiseptic', 'alcohol']); if (e && NE.canTreat(p, e.id, k) === true) return { e, part: k, label: 'Disinfect ' + pn(k) }; }
  // 8. pain
  if (A.pain > A.threshold * 0.75) { const e = have(p, A.pain > A.threshold * 1.2 ? ['morphine', 'painkillers', 'herb'] : ['painkillers', 'herb', 'morphine']); if (e) return { e, part: 'torso', label: 'Take ' + IT[e.id].name.toLowerCase() + ' (pain)' }; }
  // 9. radiation
  if (A.rad > 30) { const e = have(p, ['antirad']); if (e) return { e, part: 'torso', label: 'Anti-rad' }; }
  // 10. a stump with no tourniquet that's still bleeding is covered by step 1/2; tourniquet left on too long: take it off once bleeding is handled
  for (const k of LIMBS) if (P[k].tq && P[k].tqT > 100 && !P[k].wounds.some(w => w.t === 'art' && !w.closed)) return { e: null, part: k, op: 'removeTq', label: 'Loosen tourniquet: ' + pn(k) };
  return null;
};
NE.quickBandage = function (p) {
  const q = NE.quickPlan(p); if (!q) { p.g.toast(p.anat.bleeding > 0.05 ? 'Bleeding, but nothing in your pack can help. Tear clothes for rags (Crafting).' : 'Nothing that needs treating right now.'); NE.Audio.play('deny'); return; }
  if (p.treating) return; NE.startTreat(p, q.e, q.part, q.op); if (p.treating) p.g.toast(q.label + '...');
};
// progress bars (searching, treating, struggling) and charge take your Vespa's colour
const tick0 = NE.UI.tick; NE.UI.tick = function (dt) { tick0.call(this, dt); const p = G.player; const vg = (p && p.vglow) || null; if (vg && vg !== NE.UI._vg) { NE.UI._vg = vg; const d = document.querySelector('#prog div'); if (d) { d.style.background = vg; d.style.boxShadow = '0 0 6px ' + vg; } } };
})(window.NE);

// in the pre-game lobby nobody has a Vespa inside them yet: plain human eyes, no glow trail
(function (NE) {
const G = NE.G; const upd0 = G.update;
G.update = function (dt, rdt) { if (G.state === 'lobby') { if (G.player) G.player.vespa = false; if (G.net && G.net.peer) G.net.peer.vespa = false; } else if (G.state === 'run' && !G.infest) { if (G.player && G.player.alive && G.player.vespa === false) G.player.vespa = true; if (G.net && G.net.peer && G.net.peer.vespa === false) G.net.peer.vespa = true; } return upd0.call(this, dt, rdt); };
})(window.NE);

// base camp: the cave mouth you came in through (blocked — the only way is down)
(function (NE) {
const G = NE.G; const { rf, pick } = NE;
G.extraLights = () => { const out = []; const W = G.world; if (W && W.lobby && W.floors[0]) for (const o of W.floors[0].objs) if (o.type === 'caveexit') out.push({ x: o.x + 4, y: o.y - 22, r: 70, i: 0.9, col: '#cfe4ff' }); return out; };
const drawObj0 = G.drawObj;
G.drawObj = function (ctx, o) {
  if (o.type !== 'caveexit') return drawObj0(ctx, o); const x = Math.round(o.x) - 16, y = Math.round(o.y); const t = G.t;
  // daylight beyond the rubble
  const gr = ctx.createLinearGradient(x, y - 48, x + 26, y); gr.addColorStop(0, 'rgba(225,240,255,0.95)'); gr.addColorStop(0.6, 'rgba(190,215,240,0.75)'); gr.addColorStop(1, 'rgba(150,170,190,0.4)'); ctx.fillStyle = gr; ctx.fillRect(x, y - 48, 22, 48);
  // light shafts slanting in
  for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(230,240,255,' + (0.08 + 0.04 * Math.sin(t * 0.7 + i)) + ')'; for (let k = 0; k < 40; k++) ctx.fillRect(x + 18 + k + i * 6, y - 46 + k, 3, 1); }
  // collapsed rock pile filling the passage, with a gap of sky up top
  const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
  const rock = ['#4a4038', '#5a4e44', '#3a322c', '#665a4e'];
  [[0, -10, 12, 10], [8, -16, 10, 9], [0, -26, 9, 11], [12, -24, 9, 8], [2, -36, 8, 10], [10, -32, 8, 8], [16, -9, 8, 9], [5, -20, 7, 6]].forEach(([a, b, w, h], i) => { R(a, b, w, h, rock[i % 4]); R(a, b, w, 1, '#7a6e60'); R(a + w - 1, b, 1, h, '#2a241e'); });
  R(14, -42, 8, 8, 'rgba(235,245,255,0.95)'); R(16, -44, 4, 2, 'rgba(255,255,255,0.9)'); // the last sliver of sky
  // splintered beams of the old entrance frame
  R(20, -48, 2, 48, '#5a3a20'); R(17, -48, 8, 2, '#5a3a20'); R(4, -46, 14, 2, '#4a301a'); R(22, -30, 6, 2, '#5a3a20');
  if (Math.random() < 0.08) G.addP(x + 18, y - 40 + rf(0, 20), rf(10, 25), rf(-3, 3), rf(1.5, 2.5), 'rgba(220,230,240,0.6)', 'steam', -0.02);
};
const interact0 = G.interact;
G.interact = function () { const o = G.interactTarget(); if (o && o.act === 'caveexit') { NE.Audio.play('rumble', 0.4); G.say(pick(['The way out caved in behind us. Only down now.', 'Daylight. So close, and nowhere near.', 'No going back. The lift only goes down.']), 1); G.toast('The entrance collapsed. The only way is down.'); return; } return interact0.apply(this, arguments); };
})(window.NE);

// =====================================================================================================================
// GEAR LOOKS: every helmet/armour piece has its own worn silhouette (not a recolour), and its icon is drawn from that
// same model, so no two icons repeat. Utility gear (gloves, boots, belts, charms) gets hand-drawn icons too.
// =====================================================================================================================
(function (NE) {
'use strict';
const IT = NE.ITEMS; const sh = (c, k) => NE.shade(c, k);
// head looks: t = silhouette type; c = main colour; a = accent
const HL = {
  helmet: { t: 'lamp', c: '#d0a020', a: '#fff0a0' }, leathercap: { t: 'cap', c: '#6a4428', a: '#4a2e18' }, scraphelm: { t: 'bucket', c: '#7a6a58', a: '#a08a70' },
  riothelm: { t: 'riot', c: '#30343a', a: '#90b0c8' }, hazhood: { t: 'haz', c: '#d8c040', a: '#203040' }, milhelmet: { t: 'mil', c: '#4a5040', a: '#2a3020' },
  mosscap: { t: 'moss', c: '#4a6a30', a: '#7a9a40' }, spelhelm: { t: 'spel', c: '#e0b020', a: '#fff6c0' }, nomadwrap: { t: 'wrap', c: '#c8a868', a: '#8a6a38' },
  bronzehelm: { t: 'crest', c: '#b08040', a: '#c03020' }, furhood: { t: 'fur', c: '#d8d0c0', a: '#8a7058' }, icehelm: { t: 'horn', c: '#7a98b0', a: '#d8f0ff' },
  shardhelm: { t: 'shard', c: '#8a7ad0', a: '#d0c0ff' }, prismvisor: { t: 'visor', c: '#b0e0ff', a: '#ff80c0' }, obsidhelm: { t: 'spire', c: '#2a2228', a: '#ff5020' },
  firemask: { t: 'firemask', c: '#a03a20', a: '#ffb040' }, chitinhelm: { t: 'crown', c: '#8a5a20', a: '#c08a40' }, divehelm: { t: 'dive', c: '#c09040', a: '#80c0d0' },
  skullhelm: { t: 'skull', c: '#e0d8c0', a: '#1a1010' }, weldmask: { t: 'weld', c: '#3a3e44', a: '#203028' }, beehood: { t: 'veil', c: '#e8e0c0', a: '#4a4a40' },
};
const BL = {
  vest: { t: 'jacket', c: '#6a4428', a: '#4a2e18' }, kevlar: { t: 'kevlar', c: '#2e3a2a', a: '#1a2018' }, scrapplate: { t: 'scrap', c: '#7a6a58', a: '#a05a30' },
  riot: { t: 'riot', c: '#30343a', a: '#50565e' }, hazmat: { t: 'haz', c: '#d8c040', a: '#2a2a2a' }, platevest: { t: 'carrier', c: '#3a4430', a: '#5a6440' },
  mosscoat: { t: 'moss', c: '#4a6a30', a: '#7a9a40' }, spelharn: { t: 'harness', c: '#c08a20', a: '#6a4a20' }, nomadrobe: { t: 'robe', c: '#b08850', a: '#7a5a30' },
  bronzecuir: { t: 'cuirass', c: '#b08040', a: '#e0b060' }, furparka: { t: 'parka', c: '#d8d0c0', a: '#8a7058' }, icemail: { t: 'quilt', c: '#7a98b0', a: '#5a7890' },
  shardplate: { t: 'shard', c: '#8a7ad0', a: '#d0c0ff' }, prismweave: { t: 'prism', c: '#b0e0ff', a: '#ff80c0' }, obsidplate: { t: 'obsid', c: '#2a2228', a: '#ff5020' },
  firecoat: { t: 'coat', c: '#a03a20', a: '#ffb040' }, chitinplate: { t: 'chitin', c: '#8a5a20', a: '#c08a40' }, divesuit: { t: 'dive', c: '#3a5050', a: '#c09040' },
  bonemail: { t: 'bone', c: '#e0d8c0', a: '#6a5a48' }, policevest: { t: 'police', c: '#1c2430', a: '#e8e8e0' }, chainmail: { t: 'chain', c: '#8a8e94', a: '#5a5e64' },
};
NE.HEADLOOK = HL; NE.BODYLOOK = BL;
// ---- head gear: pass 0 = shell (before eyes), pass 1 = things over the eyes
NE.drawHeadGear = function (ctx, X0, Y0, f, id, N, OL, pass) {
  const L = HL[id]; if (!L) { const it = IT[id]; if (pass === 0 && it) { const c = it.col || '#777'; ctx.fillStyle = N(c); ctx.fillRect(X0 - 1, Y0 - 2, 8, 3); } return; }
  const R = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(f > 0 ? X0 + dx : X0 + 6 - dx - w, Y0 + dy, w, h); };
  const c = N(L.c), d = OL(L.c), hi = N(sh(L.c, 1.3)), a = L.a;
  if (pass === 0) switch (L.t) {
    case 'lamp': R(-1, -2, 8, 3, d); R(0, -2, 6, 2, c); R(0, -2, 6, 1, hi); R(-1, 0, 9, 1, d); R(5, -2, 2, 2, '#e8e0a0'); break;
    case 'cap': R(0, -2, 6, 2, c); R(0, -2, 6, 1, hi); R(4, 0, 4, 1, d); R(-1, -1, 1, 2, d); break;
    case 'bucket': R(-1, -3, 8, 4, d); R(0, -3, 6, 4, c); R(1, -2, 1, 1, hi); R(4, -2, 1, 1, hi); R(0, 0, 6, 1, sh(L.c, 0.7)); R(-1, -4, 2, 1, d); break;
    case 'riot': R(-1, -2, 8, 4, d); R(0, -2, 6, 3, c); R(0, -2, 5, 1, hi); R(-1, 2, 2, 3, d); break;
    case 'haz': R(-1, -2, 8, 9, d); R(0, -2, 6, 8, c); R(0, -2, 6, 1, hi); R(-1, 5, 8, 1, sh(L.c, 0.6)); break;
    case 'mil': R(-1, -2, 8, 3, d); R(0, -2, 6, 2, c); R(-1, 0, 2, 3, d); R(1, -2, 1, 1, '#2a2a20'); R(3, -1, 1, 1, '#2a2a20'); R(2, -3, 2, 1, d); break;
    case 'moss': R(0, -2, 6, 2, c); R(-1, -1, 8, 1, d); R(0, -3, 1, 1, a); R(2, -3, 2, 1, a); R(5, -3, 1, 1, a); R(-1, 0, 1, 1, a); R(6, 0, 1, 1, a); break;
    case 'spel': R(-1, -2, 8, 3, d); R(0, -2, 6, 2, c); R(0, -2, 6, 1, hi); R(4, -4, 3, 3, d); R(5, -4, 2, 2, a); R(-1, 0, 9, 1, d); break;
    case 'wrap': R(-1, -2, 8, 3, c); R(-1, -1, 8, 1, sh(L.c, 0.8)); R(-2, 0, 2, 4, c); R(-2, 4, 1, 2, sh(L.c, 0.8)); R(0, 3, 7, 3, c); R(0, 4, 7, 1, sh(L.c, 0.8)); break;
    case 'crest': R(-1, -2, 8, 3, d); R(0, -2, 6, 3, c); R(0, -2, 6, 1, hi); R(0, -5, 4, 3, a); R(-1, -4, 1, 2, a); R(4, 1, 1, 4, d); R(-1, 1, 2, 4, d); break;
    case 'fur': R(-2, -3, 10, 3, d); R(-1, -3, 8, 3, c); R(-2, 0, 3, 7, d); R(-1, 0, 2, 6, c); R(-1, -3, 8, 1, hi); R(2, -1, 5, 1, a); R(6, -1, 1, 2, a); R(-1, 5, 6, 2, c); R(1, 6, 4, 1, a); break;
    case 'horn': R(-1, -2, 8, 3, d); R(0, -2, 6, 2, c); R(0, -4, 1, 2, a); R(-1, -5, 1, 1, a); R(5, -4, 1, 2, a); R(6, -5, 1, 1, a); R(1, -2, 4, 1, hi); break;
    case 'shard': R(-1, -2, 8, 3, d); R(0, -2, 6, 2, c); R(0, -4, 1, 2, a); R(2, -5, 1, 3, a); R(4, -4, 1, 2, a); R(3, -6, 1, 1, '#ffffff'); break;
    case 'visor': R(0, -1, 6, 1, c); R(-1, 0, 1, 2, d); break;
    case 'spire': R(-1, -2, 8, 4, d); R(0, -2, 6, 3, c); R(1, -4, 4, 2, c); R(2, -6, 2, 2, c); R(2, -7, 1, 1, d); R(1, -1, 4, 1, a); R(-1, 2, 2, 3, d); break;
    case 'firemask': R(0, -2, 6, 2, c); R(1, -3, 1, 1, a); R(3, -4, 1, 2, a); R(4, -3, 1, 1, '#ffe080'); break;
    case 'crown': R(-1, -1, 8, 2, d); R(0, -1, 6, 1, c); R(0, -3, 1, 2, c); R(2, -4, 1, 3, c); R(4, -3, 1, 2, c); R(5, -2, 1, 1, a); break;
    case 'dive': R(-2, -3, 10, 10, d); R(-1, -3, 8, 9, c); R(-1, -3, 8, 1, hi); R(-2, 5, 10, 2, sh(L.c, 0.6)); R(0, 6, 1, 1, '#e8d080'); R(4, 6, 1, 1, '#e8d080'); break;
    case 'skull': R(-1, -2, 8, 5, d); R(0, -2, 6, 4, c); R(0, -2, 6, 1, '#ffffff'); R(0, 3, 6, 1, c); R(1, 3, 1, 1, a); R(3, 3, 1, 1, a); break;
    case 'weld': R(-1, -2, 8, 2, d); R(0, -2, 6, 1, c); break;
    case 'veil': R(-3, -2, 12, 1, d); R(-2, -3, 10, 1, c); R(0, -5, 6, 2, c); R(1, -5, 4, 1, hi); break;
  } else switch (L.t) {
    case 'riot': R(3, -1, 4, 5, 'rgba(150,190,220,0.45)'); R(6, -1, 1, 5, d); R(3, -1, 4, 1, 'rgba(230,245,255,0.7)'); break;
    case 'haz': R(3, 1, 4, 2, a); R(4, 1, 2, 1, '#6aa0c0'); R(4, 4, 3, 2, '#3a3a3a'); R(6, 4, 1, 2, '#6a6a6a'); break;
    case 'visor': R(1, 1, 6, 2, 'rgba(0,0,0,0.5)'); R(1, 1, 2, 1, '#80e0ff'); R(3, 1, 2, 1, a); R(5, 1, 2, 1, '#ffe080'); break;
    case 'firemask': R(2, 0, 5, 6, d); R(3, 0, 4, 5, c); R(4, 1, 2, 1, a); R(4, 3, 3, 1, sh(L.c, 0.6)); R(6, 4, 1, 1, a); break;
    case 'dive': R(3, 0, 4, 4, '#2a2010'); R(4, 1, 2, 2, 'rgba(120,200,220,0.7)'); R(4, 1, 1, 1, '#e0f8ff'); break;
    case 'skull': R(4, 1, 2, 1, a); R(1, 1, 2, 1, a); R(6, 2, 1, 1, c); break;
    case 'weld': R(1, 0, 7, 6, d); R(2, 0, 5, 5, c); R(3, 1, 4, 1, a); R(3, 1, 4, 1, 'rgba(60,140,80,0.7)'); R(6, 3, 1, 2, sh(L.c, 1.4)); break;
    case 'veil': for (let y = -1; y < 6; y++) for (let x = -2; x < 8; x++) if ((x + y) % 2 === 0) R(x, y, 1, 1, 'rgba(40,40,30,0.55)'); break;
    case 'wrap': R(0, 3, 7, 1, sh(L.c, 0.7)); break;
    case 'mil': R(3, 1, 4, 1, 'rgba(20,20,10,0.25)'); break;
  }
};
// ---- body gear drawn along the torso line (p[1] shoulders → p[2] hips)
NE.drawBodyGear = function (ctx, p, f, id, N, OL, dark) {
  const L = BL[id]; if (!L) return;
  const s = p[1], h = p[2]; const lx = t => s.x + (h.x - s.x) * t, ly = t => s.y + (h.y - s.y) * t;
  const R = (x, y, w, hh, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, hh); };
  const band = (t, w, c, off) => R(lx(t) - (w >> 1) + (off || 0) * f, ly(t), w, 1, c);
  const line = (w, c) => { NE.pline(ctx, s.x, s.y, h.x, h.y, w, c); };
  const c = N(L.c), d = OL(L.c), hi = N(sh(L.c, 1.3)), lo = N(sh(L.c, 0.72)), a = N(L.a);
  const front = (t, w, c2) => R(lx(t) + (f > 0 ? 1 : -1 - w + 1), ly(t), w, 1, c2);
  switch (L.t) {
    case 'jacket': line(6, d); line(5, c); band(0, 6, hi); R(lx(0.15) + f, ly(0.15), 1, 4, lo); R(lx(0.15) + f * 2, ly(0.15), 1, 2, a); band(0.95, 5, d); break;
    case 'kevlar': line(6, d); line(5, c); band(0.25, 5, a); band(0.6, 5, a); R(lx(0.3) + f, ly(0.3), 2, 2, lo); R(s.x - 2, s.y - 1, 2, 2, d); break;
    case 'scrap': line(6, d); line(5, c); R(lx(0.1) - 2, ly(0.1), 3, 2, N('#8a7a68')); R(lx(0.45), ly(0.45), 3, 2, a); R(lx(0.7) - 2, ly(0.7), 2, 2, N('#6a6a70')); R(lx(0.2) + 1, ly(0.2), 1, 1, '#d0c8b0'); R(lx(0.55) - 1, ly(0.55), 1, 1, '#d0c8b0'); break;
    case 'riot': line(6, d); line(5, c); for (const t of [0.15, 0.4, 0.65]) band(t, 5, a); R(s.x - 3, s.y - 1, 3, 3, d); R(s.x - 3, s.y - 1, 2, 2, hi); R(s.x + 1, s.y - 1, 3, 3, d); break;
    case 'haz': line(7, d); line(6, c); band(0.5, 6, N('#2a2a2a')); R(lx(0.1) + f * 2, ly(0.1), 1, 3, N('#3a3a3a')); R(lx(0.1) + f * 2, ly(0.1) + 3, 2, 1, N('#5a5a5a')); break;
    case 'carrier': line(6, d); line(5, c); for (const t of [0.45, 0.65]) { R(lx(t) - 2, ly(t), 2, 2, a); R(lx(t) + 1, ly(t), 2, 2, a); } band(0.1, 5, lo); break;
    case 'moss': line(7, d); line(6, c); for (let t = 0; t <= 1.05; t += 0.2) { R(lx(t) - 4, ly(t), 1, 2, a); R(lx(t) + 3, ly(t) + 1, 1, 2, a); } R(lx(1) - 2, ly(1) + 1, 1, 2, a); R(lx(1) + 1, ly(1) + 1, 1, 1, a); break;
    case 'harness': line(6, d); line(5, c); NE.pline(ctx, s.x - 2, s.y, h.x + 2, h.y, 1, a); NE.pline(ctx, s.x + 2, s.y, h.x - 2, h.y, 1, a); band(0.95, 6, a); R(lx(0.3) - 1, ly(0.3), 2, 2, hi); break;
    case 'robe': line(6, d); line(5, c); R(h.x - 3, h.y - 1, 7, 6, d); R(h.x - 2, h.y - 1, 5, 5, c); R(h.x - 2, h.y + 3, 5, 1, lo); band(0.9, 5, a); R(lx(0.05) - 3, ly(0.05), 7, 2, a); break;
    case 'cuirass': line(6, d); line(5, c); band(0, 7, hi); R(lx(0.3) + f, ly(0.3), 1, 1, N('#fff0c0')); band(0.55, 3, lo); band(0.7, 3, lo); band(0.85, 3, lo); R(s.x - 4, s.y - 1, 2, 2, a); R(s.x + 2, s.y - 1, 2, 2, a); break;
    case 'parka': line(8, d); line(7, c); band(0, 8, a); band(-0.06, 6, a); for (const t of [0.3, 0.6]) band(t, 7, lo); band(0.98, 7, a); break;
    case 'quilt': line(7, d); line(6, c); for (let t = 0.1; t < 1; t += 0.22) band(t, 6, lo); R(lx(0.2) - 1, ly(0.2), 1, 6, lo); R(lx(0.2) + 1, ly(0.2), 1, 6, lo); break;
    case 'shard': line(6, d); line(5, c); R(s.x - 4, s.y - 3, 1, 3, a); R(s.x - 3, s.y - 2, 1, 2, a); R(s.x + 3, s.y - 3, 1, 3, a); R(lx(0.4) - 1, ly(0.4), 2, 2, N('#e8e0ff')); R(lx(0.4), ly(0.4), 1, 1, '#ffffff'); break;
    case 'prism': { line(6, d); line(5, c); const cs = ['#ff80c0', '#ffe080', '#80ffb0', '#80c0ff']; for (let i = 0; i < 4; i++) R(lx(0.15 + i * 0.2) - 2 + (i % 2), ly(0.15 + i * 0.2), 3, 1, cs[i]); break; }
    case 'obsid': { line(6, d); line(5, c); const gl = 0.6 + 0.4 * Math.sin(performance.now() / 300); ctx.globalAlpha = gl; R(lx(0.2), ly(0.2), 1, 2, a); R(lx(0.35) - 1, ly(0.35) + 1, 1, 2, a); R(lx(0.6) + 1, ly(0.6), 1, 2, a); ctx.globalAlpha = 1; R(s.x - 4, s.y - 2, 3, 3, d); R(s.x + 2, s.y - 2, 3, 3, d); break; }
    case 'coat': line(7, d); line(6, c); R(h.x - 3, h.y, 7, 5, d); R(h.x - 2, h.y, 5, 4, c); R(h.x - 3, h.y + 4, 7, 1, a); R(h.x + (f > 0 ? 0 : -1), h.y, 1, 4, lo); band(0, 7, a); break;
    case 'chitin': line(7, d); for (let t = 0; t < 1.01; t += 0.2) band(t, 6, t * 10 % 4 < 2 ? c : a); R(s.x - 4, s.y - 1, 3, 2, a); break;
    case 'dive': line(6, d); line(5, c); band(-0.05, 7, a); band(0.02, 7, N(sh(L.a, 1.2))); R(lx(0.05) - 3, ly(0.05), 1, 1, '#e8d080'); R(lx(0.05) + 3, ly(0.05), 1, 1, '#e8d080'); band(0.95, 5, a); break;
    case 'bone': line(6, d); line(5, N('#3a3028')); R(lx(0.05), ly(0.05), 1, (ly(1) - ly(0.05)) | 0, c); for (const t of [0.15, 0.35, 0.55, 0.75]) band(t, 5, c); break;
    case 'police': line(6, d); line(5, c); band(0.4, 5, a); R(lx(0.2) + f, ly(0.2), 1, 1, N('#e0c040')); R(lx(0.15) - f * 2, ly(0.15), 1, 2, N('#2a2a2a')); break;
    case 'chain': line(6, d); for (let t = 0; t < 1.01; t += 0.12) for (let k = -2; k <= 2; k++) R(lx(t) + k, ly(t), 1, 1, (k + Math.round(t * 8)) % 2 ? c : lo); break;
  }
};
// ---- accessories (belt, charm, face extras) visible on the body
NE.accOf = a => { const G = a.gear; if (!G) return null; const o = {}; let any = false; for (const k of ['belt', 'charm']) if (G[k]) { o[k] = G[k].id; any = true; } return any ? o : null; };
NE.drawAccessories = function (ctx, p, f, acc, N, OL) {
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }; const hp = p[2], s = p[1];
  if (acc.belt === 'canteen') { R(hp.x - f * 3 - 1, hp.y - 2, 3, 4, N('#2a3a30')); R(hp.x - f * 3, hp.y - 2, 2, 3, N('#4a6a5a')); R(hp.x - f * 3, hp.y - 3, 1, 1, '#8a8a8a'); }
  if (acc.belt === 'larder') { R(hp.x + f * 2 - 1, hp.y - 1, 3, 3, N('#5a4024')); R(hp.x + f * 2 - 1, hp.y - 1, 3, 1, N('#8a6a3a')); }
  if (acc.belt === 'harness') { NE.pline(ctx, s.x - 1, s.y, hp.x + 1, hp.y, 1, N('#2a3020')); R(hp.x - 3, hp.y - 1, 6, 1, N('#3a4430')); R(hp.x - f * 3, hp.y - 1, 2, 2, N('#5a6440')); }
  if (acc.charm === 'armband' && p[3]) R(p[3].x - 1, p[3].y - 1, 2, 2, '#e8e2d0'), R(p[3].x - 1, p[3].y - 1, 1, 1, '#d03030');
  if (acc.charm === 'rabbitfoot') { R(hp.x + f * 2, hp.y + 1, 1, 2, '#6a5a48'); R(hp.x + f * 2, hp.y + 3, 1, 1, '#d8c8a8'); }
};
// ---- icons from the worn models
const cache = {};
const UTIL = { // 16x16 sprites for non-armour wearables: o outline, then palette letters
  hikeboots: [['................', '................', '.....oooo.......', '.....obbo.......', '.....obbo.......', '.....oblo.......', '.....obbo.......', '.....obbbooo....', '....obbbbbbbo...', '....obbbbbbbbo..', '....ossssssssso.', '.....ooooooooo..'], { b: '#6a4a2a', l: '#e0c060', s: '#2a2018' }],
  runshoes: [['................', '................', '................', '................', '......oooo......', '......orro......', '......owro......', '.....orrrrooo...', '....orrwwrrrro..', '....orrrrrrrrro.', '....owwwwwwwwwo.', '.....ooooooooo..'], { r: '#d04030', w: '#f0f0f0' }],
  climbgloves: [['................', '....o.o.o.......', '...obobobo......', '...obobobo......', '...obbbbbo.o....', '...obbbbbbobo...', '...oddddddbo....', '...obbbbbbbo....', '...obbbbbbo.....', '....obbbbo......', '....ossso.......', '....oooo........'], { b: '#8a6a3a', d: '#c0a060', s: '#4a3a20' }],
  knucklegloves: [['................', '................', '...ooooooo......', '..okckckcko.....', '..obbbbbbbo.....', '..obbbbbbbbo....', '..obbbbbbobo....', '..obbbbbbbo.....', '...obbbbbo......', '...ossssso......', '...ooooooo......', '................'], { b: '#3a3a3a', k: '#c0c4ca', c: '#5a5a5a', s: '#202020' }],
  canteen: [['.......oo.......', '......occo......', '.....oooooo.....', '....oggggggo....', '...oggllgggo....', '...ogllggggo....', '...oggggggggo...', '...oggggggggo...', '...oggggggggo...', '....oggggggo....', '.bbbbbbbbbbbbbb.', '.bbbbbbbbbbbbbb.'], { g: '#4a6a5a', l: '#8ab0a0', c: '#9a9a9a', b: '#3a2a1a' }],
  larder: [['................', '................', '....oooooooo....', '...offffffffo...', '...offffffffo...', '...obbbbbbbbo...', '...obbbkbbbbo...', '...obbbbbbbbo...', '...obbbbbbbbo...', '....oooooooo....', '.ssssssssssssss.', '.ssssssssssssss.'], { f: '#a08048', b: '#8a6a3a', k: '#d0c060', s: '#3a2a1a' }],
  harness: [['..oo........oo..', '..ogo......ogo..', '...ogo....ogo...', '....ogo..ogo....', '.....oggggo.....', '.....ogkkgo.....', '....ogo..ogo....', '...ogo....ogo...', '.oooooooooooooo.', '.oppgggggggggpo.', '.oppgggggggggpo.', '.oooooooooooooo.'], { g: '#3a4430', k: '#a0a0a0', p: '#5a6440' }],
  armband: [['................', '................', '....oooooooo....', '...owwwwwwwwo...', '..owwwwrrwwwwo..', '..owwwrrrrwwwo..', '..owwwwrrwwwwo..', '...owwwwwwwwo...', '....oooooooo....', '................', '................', '................'], { w: '#e8e2d0', r: '#d03030' }],
  nightgoggles: [['................', '................', '..oooo....oooo..', '.oggggo..oggggo.', '.oglggooooglggo.', '.oggggossoggggo.', '.oggggo..oggggo.', '..oooo....oooo..', '.ssssssssssssss.', '................', '................', '................'], { g: '#5ad070', l: '#c0ffd0', s: '#2a2a2a' }],
  rabbitfoot: [['.......oo.......', '......occo......', '.......oo.......', '.......ss.......', '......offo......', '.....offffo.....', '.....offffo.....', '.....offhfo.....', '.....offffo.....', '....offffffo....', '....ofwfwffo....', '.....oooooo.....'], { f: '#d8c8a8', h: '#ffffff', w: '#6a5a48', c: '#c0a040', s: '#6a5a48' }],
};
const gearIconCanvas = (id, scale) => {
  const sc = Math.max(1, Math.round((scale || 4) / 2)); const ck = id + '|' + sc; if (cache[ck]) return cache[ck];
  const cv = document.createElement('canvas'); cv.width = cv.height = 16 * sc; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
  const N = c => c, OL = c => NE.shade(c, 0.45);
  if (HL[id]) { x.setTransform(sc * 1.5, 0, 0, sc * 1.5, 0, 0); const X0 = 2.33, Y0 = 4; // a faint mannequin head so the gear reads
    x.fillStyle = '#4a4038'; x.fillRect(X0 - 1, Y0, 8, 6); x.fillRect(X0, Y0 - 1, 6, 8); x.fillStyle = '#8a7a68'; x.fillRect(X0, Y0, 6, 6); x.fillRect(X0 + 2, Y0 + 6, 2, 1);
    NE.drawHeadGear(x, Math.round(X0), Y0, 1, id, N, OL, 0); x.fillStyle = '#2a2018'; x.fillRect(Math.round(X0) + 4, Y0 + 2, 1, 1); NE.drawHeadGear(x, Math.round(X0), Y0, 1, id, N, OL, 1);
  } else if (BL[id]) { x.setTransform(sc * 1.6, 0, 0, sc * 1.6, 0, 0); const p = [null, { x: 5, y: 2 }, { x: 5, y: 7 }];
    x.fillStyle = '#3a342c'; x.fillRect(1.5, 2, 2, 5); x.fillRect(6.5, 2, 2, 5); // arms stub
    NE.drawBodyGear(x, p, 1, id, N, OL, 1);
  } else if (UTIL[id]) { const [rows, pal] = UTIL[id]; for (let r = 0; r < rows.length; r++) for (let q = 0; q < 16; q++) { const ch = rows[r][q]; if (ch === '.') continue; x.fillStyle = ch === 'o' ? '#140e0a' : pal[ch] || '#f0f'; x.fillRect(q * sc, (r + 2) * sc, sc, sc); } }
  else return null;
  cache[ck] = cv; return cv;
};
NE.gearIconCanvas = gearIconCanvas;
// every wearable that doesn't have its own hand-painted atlas sprite gets a generated one
// pieces with their own Pixel Atlas sprite use it directly; anything left (e.g. the armband) gets the generated one
for (const id in IT) { const it = IT[id]; if (!it.slot) continue; if (NE.ATLAS && NE.ATLAS[id] != null) { it.icon = id; continue; } if (HL[id] || BL[id] || UTIL[id]) it.icon = 'gi_' + id; }
const icon0 = NE.icon;
NE.icon = function (key, col, scale, itemId) { if (typeof key === 'string' && key.startsWith('gi_')) { const c = gearIconCanvas(key.slice(3), scale); if (c) return c; } return icon0.call(this, key, col, scale, itemId); };
})(window.NE);

// =====================================================================================================================
// DEATH SCREEN CLEANUP + "THE DEAD WERE ALIVE": the knock-down mash prompt never lingers once you're dead/spectating,
// and wandering NPCs can't be killed off-screen before anyone has met them.
// =====================================================================================================================
(function (NE) {
'use strict';
const G = NE.G;
const up0 = G.update; G.update = function (dt) { const r = up0.apply(this, arguments); const p = G.player; if (!p || !p.alive || G.spectate || G.goop || G.wisp || G.state !== 'run') G.domText && G.domText('strug', null); return r; };
const h0 = NE.NPC.prototype.hurt; NE.NPC.prototype.hurt = function () { if (!this.town && !this.met) return; return h0.apply(this, arguments); };
})(window.NE);

// =====================================================================================================================
// RPG EQUIPMENT PANEL: a paper-doll in the inventory. Click a slot to see what you're wearing next to everything in your
// pack that fits it, with green/red stat deltas, and equip with one click.
// =====================================================================================================================
(function (NE) {
'use strict';
const G = NE.G, UI = NE.UI; const IT = NE.ITEMS;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ic = (id, sc) => '<img class="pix" src="' + NE.itemIconURL(id, sc || 4) + '">';
const RES = ['bullet', 'sharp', 'blunt', 'bite', 'burn'];
const MODN = { hunger: 'Hunger', thirst: 'Thirst', speed: 'Speed', noise: 'Noise', climb: 'Climbing', fall: 'Fall dmg', stamina: 'Stamina', carry: 'Carry', melee: 'Melee', aim: 'Spread', tox: 'Toxins', rad: 'Radiation', infect: 'Infection', bleed: 'Bleeding', stress: 'Stress', warm: 'Warmth', cool: 'Cooling', fallRes: 'Fall resist', gasF: 'Gas filter', radRes: 'Rad resist', search: 'Search time', barter: 'Prices' };
const LOWGOOD = new Set(['hunger', 'thirst', 'noise', 'fall', 'aim', 'tox', 'rad', 'infect', 'bleed', 'stress', 'search', 'barter']);
const statsOf = id => { const o = {}; if (!id) return o; const it = IT[id]; if (!it) return o; if (it.armor) o.armor = it.armor; for (const k of RES) if (it.res && it.res[k]) o[k] = it.res[k]; if (it.spd && it.spd !== 1) o.speed = it.spd; for (const k in (it.mods || {})) o[k] = it.mods[k]; const w = it.melee; if (w) { o.dmg = w.dmg; o.cd = w.cd; } if (it.gun) o.gdmg = it.gun.dmg; return o; };
NE.statsOf = statsOf;
const fmt = (k, v) => k === 'armor' || RES.includes(k) ? Math.round(v * 100) + '%' : k === 'dmg' || k === 'gdmg' ? Math.round(v) + '' : k === 'cd' ? v.toFixed(2) + 's' : typeof v === 'number' && Math.abs(v) < 3 && k !== 'carry' && k !== 'stamina' ? (v >= 1 ? '+' : '') + Math.round((v - 1) * 100) + '%' : (v > 0 ? '+' : '') + v;
const lab = k => ({ armor: 'Armour', bullet: 'vs Bullets', sharp: 'vs Blades', blunt: 'vs Blunt', bite: 'vs Bites', burn: 'vs Burns', dmg: 'Damage', cd: 'Swing time', gdmg: 'Shot dmg' }[k] || MODN[k] || k);
const better = (k, a, b) => { if (a === b) return 0; const lo = LOWGOOD.has(k) || k === 'cd'; const base = (k === 'armor' || RES.includes(k) || k === 'dmg' || k === 'gdmg' || k === 'carry' || k === 'stamina') ? 0 : 1; const av = a == null ? base : a, bv = b == null ? base : b; if (av === bv) return 0; return (bv > av) !== lo ? 1 : -1; };
const SLOTS = [['head', 'HEAD'], ['face', 'FACE'], ['body', 'BODY'], ['belt', 'BELT'], ['weapon', 'WEAPON'], ['hands', 'HANDS'], ['feet', 'FEET'], ['charm', 'CHARM']];
const cur = (p, sl) => sl === 'weapon' ? p.equip.weapon : p.gear[sl];
const fits = (p, sl) => p.inv.items.filter(e => { const it = IT[e.id]; return sl === 'weapon' ? it.cat === 'weapon' && e !== p.equip.weapon : it.slot === sl; });
const slotHTML = (p, sl, name) => { const e = cur(p, sl); return '<div class="dslot' + (UI.dollSel === sl ? ' on' : '') + '" data-ds="' + sl + '">' + (e ? ic(e.id) : '<div class="eq-empty"></div>') + '<div><small>' + name + '</small><b>' + (e ? esc(IT[e.id].name) : '—') + '</b>' + (e && e.dur != null ? '<i>' + Math.round(e.dur / (IT[e.id].dur || 100) * 100) + '%</i>' : '') + '</div></div>'; };
UI.dollPicker = function (b, sl) {
  const p = G.player; const e = cur(p, sl); const s0 = statsOf(e && e.id); const cands = fits(p, sl);
  const row = (x, isCur) => { const s1 = statsOf(x.id); const keys = [...new Set([...Object.keys(s0), ...Object.keys(s1)])];
    const ds = keys.map(k => { const v = s1[k]; const bt = isCur ? 0 : better(k, s0[k], v); return '<span class="' + (bt > 0 ? 'good' : bt < 0 ? 'bad' : 'dim') + '">' + lab(k) + ' ' + (v == null ? '—' : fmt(k, v)) + (bt > 0 ? ' ▲' : bt < 0 ? ' ▼' : '') + '</span>'; }).join(' ');
    return '<div class="dcand' + (isCur ? ' cur' : '') + '" data-ci="' + (isCur ? -1 : p.inv.items.indexOf(x)) + '">' + ic(x.id) + '<div><b>' + esc(IT[x.id].name) + (isCur ? ' <small>(worn)</small>' : '') + '</b><div class="dst">' + (ds || '<span class="dim">no stats</span>') + '</div></div></div>'; };
  let h = '<h4>' + sl.toUpperCase() + '</h4>' + (e ? row(e, true) + '<button class="btn sm" data-uneq="1">Take off</button>' : '<div class="dim">Nothing equipped.</div>');
  h += cands.length ? '<div class="dim" style="margin-top:.3em">In your pack — click to equip:</div>' + cands.map(x => row(x, false)).join('') : '<div class="dim" style="margin-top:.3em">Nothing in your pack fits this slot.</div>';
  return h;
};
const drawDoll = (cv, p) => { const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cv.width, cv.height); const Z = 2.3; x.setTransform(Z, 0, 0, Z, cv.width / 2 - 20 * Z, cv.height - 3 - 58 * Z);
  const fake = { x: 20, y: 58, facing: 1, vx: 0, onGround: true, walkPh: 0, look: p.look }; const pts = NE.ragPose(fake).map(q => ({ x: q[0], y: q[1] }));
  const g = p.gear; const o = { facing: 1, anat: p.anat, pack: p.packCol, weapon: p.weaponId ? p.weaponId() : null, aimDir: 0, shirt: p.shirt, pants: p.pants, skinCol: p.skinCol, vespa: G.state !== 'lobby', vcol: p.vglow, lantern: 1,
    helmId: g.head ? g.head.id : null, vestId: g.body ? g.body.id : null, vest: g.body ? IT[g.body.id].col : null, helmet: g.head ? IT[g.head.id].col : null, acc: NE.accOf(p), mask: !!g.face,
    shoe: g.feet ? IT[g.feet.id].col : null, shoeSole: g.feet && g.feet.id === 'runshoes' ? '#f0f0f0' : null, glove: g.hands ? IT[g.hands.id].col : null, gloveStud: g.hands && g.hands.id === 'knucklegloves' };
  try { NE.drawHuman(x, { pts }, p.look, o); } catch (e) { } };
const inv0 = UI.render.inventory;
UI.render.inventory = function (b) {
  inv0.call(this, b); const p = G.player; const box = b.querySelector('.inv-eq'); if (!box || !p) return;
  const old = box.innerHTML; const cut = old.indexOf('<div class="eq">'); const tail = cut >= 0 ? old.slice(old.lastIndexOf('<div class="eq">')) : '';
  let arm = 0; const rs = {}; for (const k in p.gear) { const e = p.gear[k]; if (!e) continue; const it = IT[e.id]; arm += it.armor || 0; for (const r of RES) if (it.res && it.res[r]) rs[r] = 1 - (1 - (rs[r] || 0)) * (1 - it.res[r]); }
  let h = '<h4>EQUIPMENT</h4><div class="doll"><div class="dcol">' + SLOTS.slice(0, 4).map(([s, n]) => slotHTML(p, s, n)).join('') + '</div><canvas id="dollcv" width="64" height="84"></canvas><div class="dcol">' + SLOTS.slice(4).map(([s, n]) => slotHTML(p, s, n)).join('') + '</div></div>';
  h += '<div class="dsum">Armour <b>' + Math.round(arm * 100) + '</b> ' + RES.filter(r => rs[r]).map(r => '<span>' + lab(r) + ' ' + Math.round(rs[r] * 100) + '%</span>').join(' ') + '</div>';
  if (UI.dollSel) h += '<div class="dpick">' + UI.dollPicker(b, UI.dollSel) + '</div>';
  box.innerHTML = h + tail; box.classList.add('rpg');
  drawDoll(box.querySelector('#dollcv'), p);
  const rr = () => UI.render.inventory(b);
  box.querySelectorAll('[data-ds]').forEach(el => el.onclick = () => { UI.dollSel = UI.dollSel === el.dataset.ds ? null : el.dataset.ds; rr(); });
  box.querySelectorAll('.dcand[data-ci]').forEach(el => el.onclick = () => { const i = +el.dataset.ci; if (i < 0) return; const e = p.inv.items[i]; if (!e) return; const it = IT[e.id];
    if (UI.dollSel === 'weapon') UI.itemAct('equip', e); else if (it.slot) UI.itemAct('wear', e); NE.Audio.play('cloth', 0.6); rr(); });
  const un = box.querySelector('[data-uneq]'); if (un) un.onclick = () => { const sl = UI.dollSel; if (sl === 'weapon') p.equip.weapon = null; else if (p.gear[sl]) { if (p.inv.addEntry(p.gear[sl])) p.gear[sl] = null; else G.toast('Backpack full.'); } rr(); };
};
const ca0 = UI.closeAll; UI.closeAll = function () { UI.dollSel = null; return ca0.apply(this, arguments); };
const st = document.createElement('style'); st.textContent = '.inv-eq.rpg{min-width:17em}.doll{display:flex;gap:.3em;align-items:center}.doll .dcol{flex:1;display:flex;flex-direction:column;gap:.2em}.doll canvas{width:128px;height:168px;image-rendering:pixelated;background:radial-gradient(#2a241c,#120e0a);border:1px solid var(--line)}' +
  '.dslot{display:flex;gap:.3em;align-items:center;border:1px solid var(--line);padding:.15em;cursor:pointer;font-size:.8em;min-height:2.4em}.dslot:hover,.dslot.on{border-color:var(--good,#8c6);background:rgba(140,200,100,.08)}.dslot img,.dslot .eq-empty{width:1.8em;height:1.8em;flex:none}.dslot small{display:block;color:var(--dim);font-size:.75em}.dslot b{font-size:.85em;font-weight:normal;display:block;max-width:7.5em;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.dslot i{font-size:.7em;color:var(--dim)}' +
  '.dsum{font-size:.78em;margin:.3em 0;color:var(--dim)}.dsum b{color:#e8d8b0}.dsum span{margin-left:.5em}.dpick{border:1px solid var(--line);padding:.3em;margin:.3em 0;max-height:16em;overflow:auto}.dcand{display:flex;gap:.3em;align-items:flex-start;padding:.2em;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.05)}.dcand:hover{background:rgba(255,255,255,.05)}.dcand.cur{cursor:default;background:rgba(255,220,120,.05)}.dcand img{width:1.8em;height:1.8em;flex:none}.dcand b{font-size:.82em}.dst{font-size:.72em;display:flex;flex-wrap:wrap;gap:.1em .5em}.dst .good{color:#8fd070}.dst .bad{color:#e07060}';
document.head.appendChild(st);
})(window.NE);

// =====================================================================================================================
// 20 NEW VESPA STRAINS (each with its own trick) + HOST HEIGHT 4'11"–6'6"
// =====================================================================================================================
(function (NE) {
'use strict';
const G = NE.G; const { ri, chance, clamp } = NE;
const NV = [
  // common: small, flavourful
  { id: 'lanternmoth', tier: 'common', name: 'Lantern Moth', eye: '#ffe9a8', glow: '#fff2c4', desc: 'Drawn to light: lantern oil lasts 25% longer, +10% lantern reach.', mul: { battery: 1.25, lamp: 1.1 } },
  { id: 'gnawer', tier: 'common', name: 'Scrap Gnawer', eye: '#b8a888', glow: '#c8b898', desc: 'Searches 12% faster and spots 8% more loot.', mul: { search: 0.88, loot: 1.08 } },
  { id: 'packmite', tier: 'common', name: 'Pack Mite', eye: '#a8c080', glow: '#b8d090', desc: 'Sturdy back: +4kg carry.', add: { carry: 4 } },
  { id: 'leech', tier: 'common', name: 'Leech Brood', eye: '#c04050', glow: '#d05060', desc: 'Every kill feeds you 120ml of blood.', perk: 'leech' },
  { id: 'nightsinger', tier: 'common', name: 'Nightsinger', eye: '#a0e070', glow: '#b0f080', desc: 'Chirps in the dark: you see 12% further beyond your lantern.', mul: { sight: 1.12 } },
  // uncommon
  { id: 'needle', tier: 'uncommon', name: 'Needle Wasp', eye: '#e0e0f0', glow: '#f0f0ff', desc: 'Thrown weapons hit 30% harder.', perk: 'throw' },
  { id: 'mirror', tier: 'uncommon', name: 'Mirrorwing', eye: '#d0f0ff', glow: '#e8fbff', desc: 'Parry window 40% wider.', perk: 'parry' },
  { id: 'burrow', tier: 'uncommon', name: 'Burrow Mite', eye: '#a08060', glow: '#b09070', desc: 'Digs through rock 50% faster.', perk: 'dig' },
  { id: 'dreamer', tier: 'uncommon', name: 'Slumber Drone', eye: '#a090d0', glow: '#b8a8e8', desc: 'Resting at an inn heals 40% of every body part and halves your pain.', perk: 'rest' },
  // rare
  { id: 'lancer', tier: 'rare', name: 'Barbed Spearhead', eye: '#ff8060', glow: '#ff9a7a', desc: 'Lunges recover in half the time.', perk: 'lunge' },
  { id: 'sleepless', tier: 'rare', name: 'Sleepless Drone', eye: '#e0e8f0', glow: '#f4f8ff', desc: 'Never stays down: you come to from knockouts 60% faster. -15% stress.', mul: { wake: 1.6, stress: 0.85 } },
  { id: 'carrion', tier: 'rare', name: 'Carrion Gut', eye: '#80c040', glow: '#90d050', desc: 'Eats anything: food never poisons you and fills 30% more.', perk: 'carrion' },
  { id: 'lodestone', tier: 'rare', name: 'Lodestone Brood', eye: '#7a8090', glow: '#9aa0b0', desc: 'Magnetic flesh: bullets and shrapnel never stay lodged in you.', perk: 'nolodge' },
  // epic
  { id: 'berserker', tier: 'epic', name: 'Berserker Brood', eye: '#ff2020', glow: '#ff4040', desc: 'Below 40% blood: +40% melee and +40 pain tolerance.', perk: 'berserk' },
  { id: 'echoqueen', tier: 'epic', name: 'Echo Queen', eye: '#70e0ff', glow: '#a0f0ff', desc: 'Dash recharges twice as fast with 50% longer i-frames.', perk: 'dash' },
  { id: 'gilded', tier: 'epic', name: 'Gilded Hive', eye: '#ffd040', glow: '#ffe070', desc: 'Starts every descent with 25 silver; traders charge 15% less.', perk: 'gild', mul: { barter: 0.85 } },
  // legendary
  { id: 'hydra', tier: 'legendary', name: 'Hydra Strain', eye: '#40ff90', glow: '#70ffb0', desc: 'Severed limbs regrow after 3 minutes (unless a prosthetic is fitted). +10% health.', perk: 'regrow', mul: { hpMul: 1.1 } },
  { id: 'warlord', tier: 'legendary', name: 'Warlord Swarm', eye: '#ff6a00', glow: '#ff8a20', desc: 'Impale far more often; each kill gives 5s of +20% speed. +10% melee.', perk: 'warlord', mul: { melee: 1.1 } },
  // mythical
  { id: 'eclipse', tier: 'mythical', name: 'Eclipse Sovereign', eye: '#1a0a2a', glow: '#ff40a0', desc: 'Your Vespa burst lasts 18 seconds instead of 10. +20% melee, -20% bleeding.', perk: 'burst', mul: { melee: 1.2, bleed: 0.8 } },
  // secret
  { id: 'deepmother', tier: 'secret', name: 'The Deep Mother', eye: '#3a0050', glow: '#c040ff', desc: 'Your flesh knits constantly: every body part regenerates 1 HP/s. +25% health.', perk: 'regen', mul: { hpMul: 1.25 } },
];
for (const v of NV) { if (NE.VARIANTS.some(x => x.id === v.id)) continue; const i = NE.VARIANTS.length; NE.VARIANTS.push(v); const P = NE.STRAIN_GIFTS, n = { common: 1, uncommon: 2, rare: 2, epic: 3, legendary: 3, mythical: 4, secret: 4 }[v.tier] || 1; v.pow = []; for (let k = 0; v.pow.length < n && k < 40; k++) { const g = P[(i * 7 + k * 5) % P.length].id; if (!v.pow.includes(g)) v.pow.push(g); } }
const perk = p => p && p.surv ? (NE.variantOf(p.surv.variant).perk || null) : null; NE.vperk = perk;
// ---- perk hooks
const death0 = G.onEnemyDeath; G.onEnemyDeath = function (e, cause) { const was = e.alive; death0.apply(this, arguments); const p = G.player; if (!was || !p || !p.alive || !e.anat || e.anat.lastHit !== p.surv.first) return; const k = perk(p);
  if (k === 'leech') { p.anat.blood = Math.min(NE.BLOOD, p.anat.blood + 120); for (let i = 0; i < 6; i++) G.addP && G.addP(p.x, p.y - 8, NE.rf(-15, 15), NE.rf(-30, -5), 0.6, '#d03040', 'glow', 0); }
  if (k === 'warlord') p.warT = 5; };
NE.thrMul = q => (q && q.by && q.by.isPlayer && perk(q.by) === 'throw') ? 1.3 : 1;
const imp0 = NE.tryImpale; NE.tryImpale = function (a) { const r = imp0.apply(this, arguments); if (!r && a && a.isPlayer && perk(a) === 'warlord' && !a._wimp) { a._wimp = true; try { return imp0.apply(this, arguments); } finally { a._wimp = false; } } return r; };
const dig0 = G.tryDig; G.tryDig = function (pl, w) { if (perk(pl) === 'dig' && w && w.dig) w = Object.assign({}, w, { dig: w.dig * 1.5 }); return dig0.call(this, pl, w); };
const rest0 = G.rest; G.rest = function () { const p = G.player; const r = rest0.apply(this, arguments); if (p && perk(p) === 'rest') setTimeout(() => { for (const k of NE.PARTS) { const P = p.anat.parts[k]; if (!P.severed) P.hp = Math.min(P.max, P.hp + P.max * 0.4); } p.anat.pain *= 0.5; }, 900); return r; };
const lunge0 = NE.Player.prototype.lunge; NE.Player.prototype.lunge = function () { const cd = this.lungeCD || 0; const r = lunge0.apply(this, arguments); if (perk(this) === 'lunge' && this.lungeCD > cd + 0.5) this.lungeCD *= 0.5; return r; };
const dash0 = NE.Player.prototype.dash; NE.Player.prototype.dash = function () { const cd = this.dashCD || 0; dash0.apply(this, arguments); if (perk(this) === 'dash' && this.dashCD > 0 && !(cd > 0)) { this.dashCD *= 0.5; this.dashIF *= 1.5; } };
const hurt0 = NE.Actor.prototype.hurt; NE.Actor.prototype.hurt = function (part, dmg) { if (NE._dmgMul) arguments[1] = dmg * NE._dmgMul; const r = hurt0.apply(this, arguments); if (this.isPlayer && perk(this) === 'nolodge' && this.anat && this.anat.parts[part]) for (const w of this.anat.parts[part].wounds) w.bullet = false; return r; };
const burst0 = G.startBurst; G.startBurst = function (p) { const r = burst0.apply(this, arguments); NE._burstPerk = () => { if (perk(p || G.player) === 'burst' && G.goop) G.goop.t = Math.max(G.goop.t, 18); }; NE._burstPerk(); return r; }; // runs again once the emergence finishes
const pu0 = NE.Player.prototype.update;
NE.Player.prototype.update = function (dt) {
  const k = perk(this); const A = this.anat; const s = this.stats;
  const bz = k === 'berserk' && this.alive && A.blood < 1600; if (bz !== !!this._bz) { s.melee *= bz ? 1.4 : 1 / 1.4; s.painTol += bz ? 40 : -40; this._bz = bz; if (bz) G.toast('BERSERK — the pain is very far away.'); }
  const wr = (this.warT || 0) > 0; if (wr) this.warT -= dt; if (wr !== !!this._wr) { s.speed *= wr ? 1.2 : 1 / 1.2; this._wr = wr; }
  if (k === 'regen' && this.alive) for (const pk of NE.PARTS) { const P = A.parts[pk]; if (!P.severed) P.hp = Math.min(P.max, P.hp + dt); }
  if (k === 'regrow' && this.alive) for (const pk of ['larm', 'rarm', 'lleg', 'rleg']) { const P = A.parts[pk]; if (P.severed && !P.prost) { P.regrowT = (P.regrowT || 0) + dt; if (P.regrowT >= 180) { P.severed = false; P.hp = P.max * 0.3; P.wounds = []; P.tq = false; P.bandage = null; P.regrowT = 0; if (this.sev) delete this.sev[pk]; G.toast('Your ' + NE.PART_NAMES[pk].toLowerCase() + ' has grown back. Pale and tender, but yours.'); NE.Audio.play('squelch'); } } }
  return pu0.apply(this, arguments);
};
// parry: widen by stretching the time since the block began
if (NE.Combat && NE.Combat.parryWin == null) NE.Combat.parryWin = a => perk(a) === 'parry' ? 1.4 : 1;
const con0 = NE.consume; NE.consume = function (pl, entry) { const A = pl && pl.anat; const it = entry && NE.ITEMS[entry.id]; if (!A || !it || it.cat !== 'food' || perk(pl) !== 'carrion') return con0.apply(this, arguments);
  const t0 = A.tox, h0 = A.hunger; const r = con0.apply(this, arguments); if (A.tox > t0) A.tox = t0; if (A.hunger > h0) A.hunger = Math.min(100, A.hunger + (A.hunger - h0) * 0.3); return r; };
const sr0 = G.startRun; G.startRun = function (restore) { const r = sr0.apply(this, arguments); try { const p = G.player; if (p && !restore && perk(p) === 'gild') { p.inv.add('silver', 25); G.toast('The Gilded Hive brought its tithe: 25 silver.'); } } catch (e) { } return r; };

// ---- HOST HEIGHT: 4'11" to 6'6". Taller = longer reach, stronger, sturdier, heavier on their feet; shorter = quick and nimble.
// body types: lean (quick), muscle (strong), fat (lives off reserves, gets hungry slower)
NE.BODIES = { lean: { name: 'Lean', desc: '+5% speed' }, muscle: { name: 'Muscular', desc: '+5% melee strength' }, fat: { name: 'Heavyset', desc: 'Gets hungry 25% slower (burns fat reserves)' } };
NE.bodyOf = look => (look && look.body) || (look ? ['lean', 'lean', 'muscle', 'fat'][((look.seed || 0) >>> 0) % 4] : 'lean');
const ms0 = NE.makeSurvivor; NE.makeSurvivor = function () { const s = ms0.apply(this, arguments); s.look.body = NE.wpick([['lean', 45], ['muscle', 30], ['fat', 25]]); const b = s.look.sex === 'm' ? 1.5 : -1.5; s.look.height = clamp(Math.round((ri(59, 78) + ri(59, 78)) / 2 + b), 59, 78); return s; };
NE.heightOf = look => (look && look.height) || 69; NE.heightStr = h => Math.floor(h / 12) + '\'' + (h % 12) + '"';
const cs0 = NE.computeStats; NE.computeStats = function (meta, surv) { const s = cs0.apply(this, arguments); const k = (NE.heightOf(surv && surv.look) - 69) / 9.5;
  s.melee *= 1 + 0.04 * k; s.carry += 2 * k; s.climb *= 1 - 0.04 * k; s.hpMul = (s.hpMul || 1) * (1 + 0.02 * k); s.height = NE.heightOf(surv && surv.look);
  // short and quick vs tall and sturdy: 4'11" moves 8% faster, 6'6" shrugs off 8% of incoming damage, sliding linearly between
  const hb = NE.heightBonus(s.height); s.speed *= 1 + hb.spd; s.heightDef = hb.def;
  const bt = NE.bodyOf(surv && surv.look); s.body = bt; if (bt === 'lean') s.speed *= 1.05; else if (bt === 'muscle') s.melee *= 1.05; else if (bt === 'fat') s.hunger *= 0.75; return s; };
NE.heightBonus = h => { const t = clamp((h - 59) / (78 - 59), 0, 1); return { spd: 0.08 * (1 - t), def: 0.08 * t }; };
const hurtH = NE.Actor.prototype.hurt; NE.Actor.prototype.hurt = function (part, dmg, kind, src, dir) { if (this.isPlayer && this.stats && this.stats.heightDef > 0 && dmg > 0) dmg *= 1 - this.stats.heightDef; return hurtH.call(this, part, dmg, kind, src, dir); };
const sc = a => (a && a.look && a.look.height ? a.look.height / 69 : 1);
const pose0 = NE.ragPose; NE.ragPose = function (a) { const out = pose0(a); const s = sc(a);
  if (a.rag && a._hs !== s) { const k = s / (a._hs || 1); for (const c of a.rag.cons) c.len *= k; a._hs = s; a.hReach = (s - 1) * 12; }
  if (s !== 1 && a.x != null) for (const q of out) { q[0] = a.x + (q[0] - a.x) * (0.6 + 0.4 * s); q[1] = a.y + (q[1] - a.y) * s; } return out; };
const hs0 = UI0().hudStatic; UI0().hudStatic = function () { hs0.apply(this, arguments); const p = G.player; const el = document.querySelector('.p-occ'); if (p && el && p.look && !/"/.test(el.textContent)) { const h = NE.heightOf(p.look), hb = NE.heightBonus(h); el.textContent += ' • ' + NE.heightStr(h) + ' ' + NE.BODIES[NE.bodyOf(p.look)].name.toLowerCase() + ' (' + [hb.spd >= 0.005 ? '+' + Math.round(hb.spd * 100) + '% speed' : '', hb.def >= 0.005 ? '+' + Math.round(hb.def * 100) + '% defense' : ''].filter(Boolean).join(', ') + ')'; } };
function UI0() { return NE.UI; }
})(window.NE);

// severed limbs are drawn from the anatomy itself (not only the gore-time record), so stumps and prosthetics survive
// healing, a doctor's visit and save/reload
(function (NE) {
'use strict';
NE.sevOf = a => { const A = a.anat; if (!A || !A.parts) return a.sev; let o = null; for (const k in A.parts) if (A.parts[k].severed) { o = o || Object.assign({}, a.sev || {}); if (o[k] == null) o[k] = -1e9; } return o || a.sev; };
})(window.NE);

// prosthetics are never stripped by healing: a doctor's visit, resting or any faded-out recovery keeps fitted limbs
(function (NE) {
'use strict';
const G = NE.G, UI = NE.UI;
const snap = () => { const p = G.player; if (!p || !p.anat) return null; const o = {}; for (const k of NE.PARTS) { const P = p.anat.parts[k]; if (P.severed) o[k] = P.prost ? Object.assign({}, P.prost) : null; } return { p, o, sev: Object.assign({}, p.sev || {}) }; };
const keep = s => { if (!s || s.p !== G.player) return; const A = s.p.anat; for (const k in s.o) { const P = A.parts[k]; if (!P.severed) { P.severed = true; P.hp = 0; } if (s.o[k] && !P.prost) P.prost = s.o[k]; if (P.prost) { P.wounds = []; P.tq = false; P.bandage = null; } } s.p.sev = Object.assign(s.p.sev || {}, s.sev); };
const fade0 = UI.fade; UI.fade = function (cb) { return fade0.call(this, () => { const s = snap(); cb(); keep(s); }); };
const doc0 = UI.doctor; UI.doctor = function (npc) { const s = snap(); const r = doc0.apply(this, arguments); keep(s); return r; };
})(window.NE);
