// Singapore animals you can hatch, with short facts about local wildlife.
export const RARITY = {
  common: { label: 'Common', km: 1, weight: 60, egg: { base: '#FFF6E8', spots: ['#7FD8A6', '#FFD44F', '#5D7FE0'] } },
  rare: { label: 'Rare', km: 2, weight: 30, egg: { base: '#EFE6FF', spots: ['#A98BEA', '#EF3E5C', '#5D7FE0'] } },
  super: { label: 'Super rare', km: 3, weight: 10, egg: { base: '#FFF1C2', spots: ['#FF9F45', '#D42A45', '#E9A92A'] } },
};

export const PETS = {
  otter: { species: 'Smooth-coated otter', name: 'Kallie', rarity: 'common', fact: "Otter families swim together in Singapore's rivers. A family of otters is called a romp!" },
  kingfisher: { species: 'White-throated kingfisher', name: 'Zippy', rarity: 'common', fact: "This blue and brown bird lives in Singapore's parks. It eats fish, lizards and insects." },
  monitor: { species: 'Malayan water monitor', name: 'Bulo', rarity: 'common', fact: 'This big lizard swims well. It lives at Sungei Buloh Wetland Reserve in Singapore.' },
  hornbill: { species: 'Oriental pied hornbill', name: 'Ubi', rarity: 'rare', fact: 'These birds once vanished from Singapore. They came back, first on Pulau Ubin!' },
  pangolin: { species: 'Sunda pangolin', name: 'Timah', rarity: 'rare', fact: "This shy animal lives in Singapore's forests. It uses a sticky tongue to eat ants." },
  mousedeer: { species: 'Lesser mouse-deer', name: 'Kancil', rarity: 'super', fact: "This tiny animal lives in Singapore's forests. Its feet have small hooves, like a deer!" },
  turtle: { species: 'Hawksbill turtle', name: 'Shelly', rarity: 'super', fact: "This rare sea turtle sometimes lays eggs on Singapore's beaches. Its nose looks like a bird's beak!" },
};
export const PET_ORDER = ['otter', 'kingfisher', 'monitor', 'hornbill', 'pangolin', 'mousedeer', 'turtle'];

export function rollRarity(rand = Math.random) {
  const total = Object.values(RARITY).reduce((s, r) => s + r.weight, 0);
  let x = rand() * total;
  for (const [key, r] of Object.entries(RARITY)) { if ((x -= r.weight) < 0) return key; }
  return 'common';
}
export function rollPet(rarity, rand = Math.random, owned = []) {
  const pool = PET_ORDER.filter((k) => PETS[k].rarity === rarity);
  const types = new Set(owned);
  const weight = (type) => types.has(type) ? 1 : 3;
  let x = rand() * pool.reduce((sum, type) => sum + weight(type), 0);
  for (const type of pool) { if ((x -= weight(type)) < 0) return type; }
  return pool[pool.length - 1];
}
