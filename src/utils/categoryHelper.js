// src/utils/categoryHelper.js

const CATEGORY_MAP = {
    'accessories': [
        'hat', 'cap', 'balaclava', 'beanie', 'bag', 'backpack', 'wallet', 'keychain', 
        'bracelet', 'necklace', 'earring', 'glasses', 'sunglasses', 'belt', 'socks', 
        'head', 'case', 'jbl', 'airpods', 'pencil', 'watch', 'perfume', 'redbull', 
        'batterypack', 'boxer', 'underwear', 'briefs', 'ring', 'jewelry', 'chain', 
        'pendant', 'pad', 'iphone', 'samsung', 'charging', 'tech'
    ],
    'shorts': [
        'shorts', 'swim shorts', 'mesh shorts', 'ee shorts'
    ],
    'pants': [
        'pants', 'jeans', 'joggers', 'trousers', 'denim', 'cargo', 'sweatpants', 'tracksuit bottoms', 'tracksuit', 'suit'
    ],
    'hoodies': [
        'hoodie', 'sweater', 'zip', 'cardigan', 'knitted', 'fleece', 'crewneck', 'jumper'
    ],
    't-shirts': [
        't-shirt', 'shirt', 'polo', 'top', 'jersey', 'v-neck', 'short sleeve', 'oversized tee'
    ],
    'jackets': [
        'jacket', 'coat', 'windbreaker', 'vest', 'parka', 'puffer', 'down jacket', 
        'moncler', 'arcteryx', 'arc\'teryx', 'nuptse', 'maya', 'bomber', 'harrington', 'varsity'
    ],
    'sets': [
        'set'
    ],
    'shoes': [
        'shoes', 'sneakers', 'skate', 'shoe', 'dunk', 'force', 'jordan', 'yeezy', 'gazelle', 
        'track', 'trainer', 'b30', 'b22', 'b33', 'nb', 'balance', 'campus', 'samba', 
        'spezial', 'crocs', 'slide', 'hotstep', 'shox', 'aj1', 'aj3', 'aj4', 'aj11', 
        'air max', 'vapormax', 'tn', '9060', '2002r', '1906r', 'bapesta', 'lanvin', 
        'miu miu', 'asics', 'acics', 'foam', 'slides', 'clog', 'mule', 'birk', 'boston', 'rick owens', 'gel',
        'b27', 'superstar', 'mind 001', 'be right back'
    ]
};

/**
 * Detects the category of a product based on its name.
 * @param {string} name - The product name.
 * @returns {string} - The detected category.
 */
export function detectCategory(name) {
    if (!name) return 't-shirts';
    const low = name.toLowerCase();

    // 1. High priority / Specific cases
    if ((low.includes('hoodie') && low.includes('pants')) || low.includes('tracksuit') || low.includes('track suit') || low.includes('suit')) {
        return 'pants'; 
    }

    if (low.includes('moncler') && (low.includes('jacket') || low.includes('maya'))) return 'jackets';

    // 2. Regular keywords check
    for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
        if (keywords.some(kw => {
            if (kw === 'track' && low.includes('tracksuit')) return false;
            return low.includes(kw);
        })) {
            return cat;
        }
    }

    return 't-shirts'; // default
}

// For use in CommonJS environments (scrapers)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { detectCategory, CATEGORY_MAP };
}
