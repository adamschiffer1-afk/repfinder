// src/utils/categoryHelper.js

const CATEGORY_MAP = {
  accessories: [
    'hat', 'cap', 'balaclava', 'beanie', 'bag', 'backpack', 'wallet', 'keychain',
    'bracelet', 'necklace', 'earring', 'glasses', 'sunglasses', 'belt', 'socks',
    'case', 'jbl', 'airpods', 'pencil', 'watch', 'perfume', 'redbull',
    'batterypack', 'boxer', 'underwear', 'briefs', 'ring', 'jewelry', 'chain',
    'pendant', 'pad', 'iphone', 'samsung', 'charging'
  ],
  shorts: [
    'shorts', 'swim shorts', 'mesh shorts', 'ee shorts'
  ],
  pants: [
    'pants', 'jeans', 'joggers', 'trousers', 'denim', 'cargo', 'sweatpants', 'tracksuit bottoms'
  ],
  hoodies: [
    'hoodie', 'sweater', 'zip', 'cardigan', 'fleece', 'crewneck', 'jumper',
    'tech fleece', 'nocta tech'
  ],
  't-shirts': [
    't-shirt', 'shirt', 'polo', 'top', 'jersey', 'v-neck', 'short sleeve', 'oversized tee'
  ],
  jackets: [
    'jacket', 'coat', 'windbreaker', 'vest', 'parka', 'puffer', 'down jacket',
    'nuptse', 'bomber', 'harrington', 'varsity'
  ],
  sets: [
    'tracksuit', 'track suit', 'two piece', '2 piece', 'co-ord', 'coord'
  ],
  shoes: [
    'shoes', 'sneakers', 'skate', 'shoe', 'dunk', 'force', 'jordan', 'yeezy', 'gazelle',
    'track', 'trainer', 'b30', 'b22', 'b33', 'nb', 'balance', 'campus', 'samba',
    'spezial', 'crocs', 'slide', 'hotstep', 'shox', 'aj1', 'aj3', 'aj4', 'aj11',
    'air max', 'vapormax', 'tn', '9060', '2002r', '1906r', 'bapesta', 'lanvin',
    'miu miu', 'asics', 'acics', 'foam', 'slides', 'clog', 'mule', 'birk', 'boston', 'rick owens',
    'b27', 'superstar', 'mind 001', 'be right back', 'nocta hotstep'
  ]
};

const ACCESSORY_PRIORITY = [
  'hat', 'cap', 'balaclava', 'beanie', 'bag', 'backpack', 'wallet', 'belt', 'glasses', 'sunglasses'
];

const CLOTHING_CATEGORY_ORDER = ['sets', 'shoes', 'jackets', 'hoodies', 't-shirts', 'shorts', 'pants'];

const matchesKeyword = (name, keyword, category) => {
  if (keyword === 'track') {
    if (name.includes('tracksuit') || name.includes('track suit')) return false;
    if (/\btrack\s+(pant|jacket|top|suit|set|zip)/.test(name)) return false;
  }

  if (keyword === 'suit' && category === 'pants') {
    if (name.includes('tracksuit') || name.includes('swimsuit')) return false;
  }

  if (keyword === 'denim' && category === 'pants') {
    if (name.includes('shorts')) return false;
  }

  if (keyword === 'shirt' && category === 't-shirts') {
    if (name.includes('shorts') || name.includes('t-shirt')) return name.includes('shirt');
    if (name.includes('sweatshirt')) return false;
  }

  if (keyword === 'top' && category === 't-shirts') {
    if (name.includes('laptop') || name.includes('desktop')) return false;
  }

  if (keyword === 'zip' && category === 'hoodies') {
    if (name.includes('zip wallet') || name.includes('zip bag')) return false;
  }

  if (keyword === 'knitted' && category === 'hoodies') {
    if (name.includes('hat') || name.includes('beanie') || name.includes('cap')) return false;
  }

  if (keyword === 'gel' && category === 'shoes') {
    return /\bgel\b|gel-|gel son|gel lyte|asics gel/.test(name);
  }

  if (keyword === 'jordan' && category === 'shoes') {
    if (name.includes('bag')) return false;
  }

  return name.includes(keyword);
};

const matchesCategory = (name, category) => {
  const keywords = CATEGORY_MAP[category] || [];
  return keywords.some(keyword => matchesKeyword(name, keyword, category));
};

/**
 * Detects the category of a product based on its name.
 * @param {string} name - The product name.
 * @returns {string} - The detected category.
 */
export function detectCategory(name) {
  if (!name) return 't-shirts';
  const low = name.toLowerCase();

  if ((low.includes('hoodie') && low.includes('pants')) || low.includes('tracksuit') || low.includes('track suit')) {
    return 'sets';
  }

  if (low.includes('moncler') && (low.includes('jacket') || low.includes('maya'))) {
    return 'jackets';
  }

  if (low.includes('nocta') && low.includes('tech') && !low.includes('hotstep')) {
    return 'hoodies';
  }

  if (low.includes('suit') && !low.includes('swimsuit') && !low.includes('tracksuit')) {
    return 'pants';
  }

  if (/\bset\b/.test(low) || low.includes('co-ord') || low.includes('coord')) {
    return 'sets';
  }

  if (ACCESSORY_PRIORITY.some(keyword => low.includes(keyword))) {
    return 'accessories';
  }

  for (const category of CLOTHING_CATEGORY_ORDER) {
    if (matchesCategory(low, category)) {
      return category;
    }
  }

  if (matchesCategory(low, 'accessories')) {
    return 'accessories';
  }

  return 't-shirts';
}

// For use in CommonJS environments (scrapers)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { detectCategory, CATEGORY_MAP };
}
