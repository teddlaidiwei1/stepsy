// Shop items, quests, badges and the demo people. Every person, class and school here is made up.
// School names checked by Gemini Hydrogen (16 Nov 2026) as not matching a real Singapore primary school.

export const LOOKS = [
  'male-a', 'female-a', 'male-b', 'female-b', 'male-e', 'female-c',
  'male-f', 'female-e', 'male-d', 'female-d', 'male-c', 'female-f',
];

// kind: hat / eyes / chair / hearing. price 0 = free. care = an aid, always free and never sold.
export const SHOP = [
  { id: 'cap-berry', kind: 'hat', name: 'Berry cap', price: 120 },
  { id: 'cap-sky', kind: 'hat', name: 'Sky cap', price: 120 },
  { id: 'bucket', kind: 'hat', name: 'Bucket hat', price: 150 },
  { id: 'party', kind: 'hat', name: 'Party hat', price: 180 },
  { id: 'strawberry', kind: 'hat', name: 'Strawberry hat', price: 250 },
  { id: 'ears', kind: 'hat', name: 'Otter ears', price: 300 },
  { id: 'crown', kind: 'hat', name: 'Flower crown', price: 350 },
  { id: 'sunglasses', kind: 'eyes', name: 'Sunglasses', price: 200 },
  { id: 'glasses', kind: 'eyes', name: 'Glasses', price: 0, care: true },
  { id: 'wheelchair', kind: 'chair', name: 'Wheelchair', price: 0, care: true },
  { id: 'wheelchair-deluxe', kind: 'chair', name: 'Sporty chair', price: 0, care: true },
  { id: 'wheelchair-power', kind: 'chair', name: 'Power chair', price: 0, care: true },
  { id: 'hearing', kind: 'hearing', name: 'Hearing aid', price: 0, care: true },
];

export const SHOP_TABS = [
  { id: 'looks', label: 'Looks' },
  { id: 'hats', label: 'Hats', kinds: ['hat'] },
  { id: 'glasses', label: 'Glasses', kinds: ['eyes'] },
  { id: 'aids', label: 'Wheels & aids', kinds: ['chair', 'hearing'] },
];

// Badges show on your profile and your friends' profiles.
export const BADGES = [
  { id: 'first', name: 'First walk', color: '#C6EBFB', icon: 'feet' },
  { id: 'egg', name: 'Egg finder', color: '#FFF1C2', icon: 'egg' },
  { id: '5k', name: '5k club', color: '#FFD0D6', icon: 'fruit' },
  { id: 'week', name: '7-day streak', color: '#DFF6E8', icon: 'quests' },
  { id: 'collector', name: '3 pets', color: '#ECE3FF', icon: 'pets' },
  { id: 'explorer', name: '10 km', color: '#FFE1D4', icon: 'ranks' },
];

export const CHEERS = ['Nice walk!', "Let's walk together!", 'Every step counts!', 'Cute pet!', 'You can do it!', 'High five!'];

export const ME = { cls: '5B', school: 'Sunbird Primary', code: 'WJ-4821' };

export const FRIENDS = [
  { id: 'f1', name: 'Aisyah', cls: '5B', outfit: { look: 'female-a', hat: 'bucket' }, buddy: 'kingfisher', pets: ['kingfisher', 'otter', 'pangolin'], badges: ['first', 'egg', '5k', 'week'], today: 4210 },
  { id: 'f2', name: 'Jun Hao', cls: '5B', outfit: { look: 'male-b', hat: 'cap-sky' }, buddy: 'monitor', pets: ['monitor', 'otter'], badges: ['first', 'egg'], today: 2980 },
  { id: 'f3', name: 'Priya', cls: '5A', outfit: { look: 'female-e', chair: 'wheelchair-deluxe' }, buddy: 'hornbill', pets: ['hornbill', 'kingfisher', 'otter', 'mousedeer'], badges: ['first', 'egg', 'collector', 'week', 'explorer'], today: 5120 },
  { id: 'f4', name: 'Kai', cls: '5C', outfit: { look: 'male-e', eyes: 'sunglasses' }, buddy: 'otter', pets: ['otter'], badges: ['first'], today: 1640 },
];
// Someone you can add with the demo QR scan.
export const NEW_FRIEND = { id: 'f5', name: 'Mei Ling', cls: '5B', outfit: { look: 'female-b', hat: 'strawberry' }, buddy: 'pangolin', pets: ['pangolin', 'otter'], badges: ['first', 'egg', '5k'], today: 3870 };

export const CHEERS_IN = [
  { from: 'Aisyah', text: 'Nice walk!', ago: '2 h ago' },
  { from: 'Priya', text: 'Cute pet!', ago: 'Yesterday' },
];

// Leaderboards ---------------------------------------------------------------
function seeded(seed) {
  return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const GIRLS = ['Aisyah', 'Mei Ling', 'Nur Iman', 'Hana', 'Sofia', 'Chloe', 'Divya', 'Xin Yi', 'Isabelle', 'Zi Xuan', 'Kavya', 'Alya'];
const BOYS = ['Jun Hao', 'Ethan', 'Arjun', 'Darren', 'Rayyan', 'Wei Ming', 'Ryan', 'Haziq', 'Aaron', 'Marcus', 'Jayden'];
const GIRL_LOOKS = ['female-a', 'female-b', 'female-c', 'female-e', 'female-f', 'female-d'];
const BOY_LOOKS = ['male-a', 'male-e', 'male-f', 'male-d'];
const CLASSMATES = [
  ...GIRLS.map((name, i) => ({ name, look: GIRL_LOOKS[i % GIRL_LOOKS.length] })),
  ...BOYS.map((name, i) => ({ name, look: BOY_LOOKS[i % BOY_LOOKS.length] })),
];

// Steps this week. "you" is filled in by the app from your real steps.
export function classBoard(mySteps) {
  const r = seeded(7);
  const rows = CLASSMATES.map((c) => ({ ...c, steps: Math.round(9000 + r() * 34000) }));
  rows.find((x) => x.name === 'Aisyah').steps = 38120;
  rows.find((x) => x.name === 'Mei Ling').steps = 27140;
  rows.push({ name: 'You', you: true, steps: mySteps });
  return rows.sort((a, b) => b.steps - a.steps);
}
export function schoolBoard(myClassAvg) {
  const r = seeded(21);
  const classes = ['6A', '6B', '6C', '5A', '5C', '4A', '4B', '4C', '3A', '3B', '2A', '1A'];
  const rows = classes.map((name) => ({ name, steps: Math.round(15000 + r() * 16000) }));
  rows.push({ name: '5B', you: true, steps: myClassAvg });
  return rows.sort((a, b) => b.steps - a.steps);
}
export function sgBoard(mySchoolAvg) {
  const r = seeded(99);
  const schools = ['Kopi Hill Primary', 'Banyan Grove Primary', 'Mangrove Bay Primary', 'Tembusu Ridge Primary', 'Kingfisher Park Primary',
    'Durian Valley Primary', 'Merlion Heights Primary', 'Otter Cove Primary', 'Pandan Creek Primary', 'Hornbill Park Primary',
    'Frangipani Hill Primary', 'Dragonfly Pond Primary'];
  const rows = schools.map((name) => ({ name, steps: Math.round(16000 + r() * 12000) }));
  rows.push({ name: 'Sunbird Primary', you: true, steps: mySchoolAvg });
  return rows.sort((a, b) => b.steps - a.steps);
}

// Parent map (demo) -------------------------------------------------------------
// A made-up walk around a park. Danger markers are placed by hand for the demo only.
export const HOME_SPOT = [1.3409, 103.8466];
export const DEMO_PATH = [
  [1.3409, 103.8466], [1.3418, 103.8474], [1.3427, 103.8487], [1.3431, 103.8503], [1.3424, 103.8516],
  [1.3411, 103.8519], [1.3399, 103.8510], [1.3394, 103.8494], [1.3398, 103.8478], [1.3405, 103.8469],
];
export const DANGER_SPOTS = [
  { at: [1.3442, 103.8530], label: 'Busy road crossing' },
  { at: [1.3376, 103.8455], label: 'Canal edge, no railing' },
  { at: [1.3462, 103.8452], label: 'Building site' },
];
