// Static config: room definitions, layout constants, name banks.

export const FLOOR_WIDTH = 14;       // cells per floor
export const CELL_PX = 64;           // px per cell (width)
export const FLOOR_PX = 96;          // px per floor (height)
export const SHAFT_COL = 0;          // leftmost column reserved for the airlock/entry shaft visual
export const STARTING_CREDITS = 250;

export const TICK_MS = 1000;         // one simulation tick per second of real time

export const ROOM_TYPES = {
  reactor: {
    id: 'reactor', name: 'Reactor Core', resource: 'power', icon: '⚡', color: '#f0c93d',
    baseOutputPerWidth: 5, costPerWidth: 60, statKey: 'str',
    desc: 'Fuses isotopes to generate Power for the whole outpost.',
  },
  hydroponics: {
    id: 'hydroponics', name: 'Hydroponics Bay', resource: 'food', icon: '🌱', color: '#5fc177',
    baseOutputPerWidth: 5, costPerWidth: 50, statKey: 'int',
    desc: 'Grows algae rations to keep colonists fed.',
  },
  reclaimer: {
    id: 'reclaimer', name: 'Water Reclaimer', resource: 'water', icon: '💧', color: '#4fa3e0',
    baseOutputPerWidth: 5, costPerWidth: 50, statKey: 'int',
    desc: 'Filters and recycles water for drinking and coolant.',
  },
  atmosphere: {
    id: 'atmosphere', name: 'Atmosphere Processor', resource: 'air', icon: '🫧', color: '#6fd6cf',
    baseOutputPerWidth: 5, costPerWidth: 70, statKey: 'agi',
    desc: 'Scrubs CO2 and produces breathable Air. Losing this is the fastest way to lose colonists.',
  },
  quarters: {
    id: 'quarters', name: 'Living Quarters', resource: null, icon: '🛏', color: '#b98cd6',
    baseOutputPerWidth: 0, costPerWidth: 40, statKey: 'chr',
    desc: 'Houses colonists, raises the population cap, and is where pairs of colonists may produce a new recruit.',
    capPerWidth: 2,
  },
  medbay: {
    id: 'medbay', name: 'Med Bay', resource: null, icon: '✚', color: '#e0607a',
    baseOutputPerWidth: 0, costPerWidth: 65, statKey: 'int',
    desc: 'Treats injuries. Assign colonists here to heal faster.',
  },
  cargo: {
    id: 'cargo', name: 'Cargo Bay', resource: null, icon: '📦', color: '#c98a4b',
    baseOutputPerWidth: 0, costPerWidth: 45, statKey: 'str',
    desc: 'Expands storage capacity for every resource.',
    storagePerWidth: 40,
  },
  elevator: {
    id: 'elevator', name: 'Elevator Shaft', resource: null, icon: '⬍', color: '#888f99',
    costFixed: 100, fixedWidth: 1,
    desc: 'Connects this floor to the one above. A floor needs one before you can dig the next level down.',
  },
};

export const BUILDABLE_ORDER = ['reactor', 'hydroponics', 'reclaimer', 'atmosphere', 'quarters', 'medbay', 'cargo', 'elevator'];

export const RESOURCE_META = {
  power: { name: 'Power', icon: '⚡', color: '#f0c93d' },
  food: { name: 'Rations', icon: '🌱', color: '#5fc177' },
  water: { name: 'Water', icon: '💧', color: '#4fa3e0' },
  air: { name: 'Air', icon: '🫧', color: '#6fd6cf' },
};

export const STAT_KEYS = ['str', 'int', 'agi', 'chr'];
export const STAT_NAMES = { str: 'Strength', int: 'Intellect', agi: 'Agility', chr: 'Charisma' };

export const FIRST_NAMES = [
  'Vex', 'Nyra', 'Corin', 'Talis', 'Rho', 'Ilena', 'Danko', 'Suri', 'Milo', 'Zara',
  'Orin', 'Kaya', 'Thess', 'Bren', 'Vala', 'Juno', 'Ashen', 'Rusk', 'Odette', 'Fen',
  'Kestrel', 'Lior', 'Maren', 'Soren', 'Ivy', 'Draven', 'Nessa', 'Colm', 'Priya', 'Auberon',
];
export const LAST_NAMES = [
  'Voss', 'Kade', 'Marrow', 'Solis', 'Thorne', 'Vane', 'Okafor', 'Reyes', 'Lin', 'Aldric',
  'Cross', 'Nakamura', 'Ferro', 'Quill', 'Sato', 'Brackt', 'Dune', 'Halvorsen', 'Petrov', 'Ashby',
];

export function randomName() {
  const f = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const l = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${f} ${l}`;
}
