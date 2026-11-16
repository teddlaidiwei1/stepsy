// Singapore animals you can hatch. Facts checked by Gemini Hydrogen (16 Nov 2026).
export const RARITY = {
  common: { label: 'Common', km: 1, weight: 60, egg: { base: '#FFF6E8', spots: ['#7FD8A6', '#FFD44F', '#5D7FE0'] } },
  rare: { label: 'Rare', km: 2, weight: 30, egg: { base: '#EFE6FF', spots: ['#A98BEA', '#EF3E5C', '#5D7FE0'] } },
  super: { label: 'Super rare', km: 3, weight: 10, egg: { base: '#FFF1C2', spots: ['#FF9F45', '#D42A45', '#E9A92A'] } },
};

export const PETS = {
  otter: { species: 'Smooth-coated otter', name: 'Kallie', rarity: 'common', fact: "Otter families are called romps. You can spot them along Singapore's rivers and reservoirs." },
  kingfisher: { species: 'White-throated kingfisher', name: 'Zippy', rarity: 'common', fact: "This bright blue and brown bird lives in Singapore's parks. It catches fish, lizards and insects." },
  monitor: { species: 'Malayan water monitor', name: 'Bulo', rarity: 'common', fact: 'A big lizard that swims well. Look for it at Sungei Buloh Wetland Reserve.' },
  hornbill: { species: 'Oriental pied hornbill', name: 'Ubi', rarity: 'rare', fact: 'Hornbills once disappeared from Singapore, then came back, starting on Pulau Ubin.' },
  pangolin: { species: 'Sunda pangolin', name: 'Timah', rarity: 'rare', fact: 'Its scales are made of keratin, like your fingernails. It rolls into a ball when scared.' },
  mousedeer: { species: 'Lesser mouse-deer', name: 'Kancil', rarity: 'super', fact: 'One of the smallest hoofed animals in the world, about the size of a rabbit.' },
  turtle: { species: 'Hawksbill turtle', name: 'Shelly', rarity: 'super', fact: "This critically endangered turtle sometimes lays its eggs on Singapore's beaches." },
};
export const PET_ORDER = ['otter', 'kingfisher', 'monitor', 'hornbill', 'pangolin', 'mousedeer', 'turtle'];

export function rollRarity(rand = Math.random) {
  const total = Object.values(RARITY).reduce((s, r) => s + r.weight, 0);
  let x = rand() * total;
  for (const [key, r] of Object.entries(RARITY)) { if ((x -= r.weight) < 0) return key; }
  return 'common';
}
export function rollPet(rarity, rand = Math.random) {
  const pool = PET_ORDER.filter((k) => PETS[k].rarity === rarity);
  return pool[Math.floor(rand() * pool.length)];
}
