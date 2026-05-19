import { NextResponse } from 'next/server';

const ESTIMATED_WEIGHTS = {
  // ── Longest / Most specific first ──
  'stone island hoodie': 750,
  'gallery dept hoodie': 750,
  'denim tears t-shirt': 230,
  'stone island t-shirt': 220,
  'hellstar t-shirt': 280,
  'corteiz t-shirt': 220,
  'stone island hat': 100,
  'cp knitted hat': 110,
  'chrome hearts hat': 110,
  'essentials shorts': 320,
  'eric emanuel shorts': 150,
  'essentials hoodie': 850,
  'essentials pants': 550,
  'yeezy slide': 400,
  'jordan shorts': 280,
  'jordan 13': 1100,
  'jordan 11': 1000,
  'jordan 4': 1250,
  'jordan 1': 950,
  'lv trainer': 1250,
  'asics nyc': 850,
  'acics nyc': 850,
  'yeezy foam': 500,
  'yeezy 350': 750,
  'yeezy 500': 950,
  'yeezy 700': 950,
  'lv skate': 1250,
  'dior b22': 1200,
  'dior b30': 1100,
  'dior b33': 1050,
  'dior b27': 1050,
  'air force 1': 1000,
  'bape hoodie': 780,
  'corteiz hoodie': 760,
  'hellstar hoodie': 800,
  'sp5der hoodie': 750,
  'bape t-shirt': 220,
  'stussy t-shirt': 210,
  'celine hat': 100,
  'prada hat': 100,
  'burberry hat': 100,
  'moncler hat': 120,
  'gucci bag': 800,
  'lv bag': 800,
  'prada bag': 750,
  'dior bag': 800,
  'stussy bag': 400,
  
  // ── Medium specific ──
  'ee shorts': 150,
  'air max': 900,
  'special': 700,
  'samba': 650,
  'gazelle': 650,
  'spezial': 650,
  'campus': 700,
  'lanvin': 1150,
  'goyard': 700,
  't-shirt': 230,
  'koszulka': 230,
  'tee': 230,
  'tshirt': 230,
  'klapki': 400,
  'slides': 450,
  'slide': 450,
  'crocs': 380,
  'jacket': 1000,
  'kurtka': 1000,
  'dresy': 600,
  'dres': 600,
  'spodnie': 500,
  'bluza': 850,
  'hoodie': 850,
  'spodenki': 300,
  'shorts': 300,
  'jordan': 1000, // fallback for other Jordans
  'yeezy': 900,   // fallback for other Yeezys
  'shoes': 950,
  'watch': 150,
  'zegarek': 150,
  'rolex': 150,
  'omega': 150,
  'patek': 150,
  'submariner': 150,
  'sambariner': 150,
  'socks': 80,
  'skarpetki': 80,
  'skarpety': 80,
  'airpods': 50,
  'headphones': 150,
  'sluchawki': 150,
  'słuchawki': 150,
  'charger': 80,
  'ladowarka': 80,
  'ładowarka': 80,
  'powerbank': 250,
  'phone': 200,
  'telefon': 200,
  'iphone': 200,
  'speaker': 450,
  'glosnik': 450,
  'głośnik': 450,
  'cable': 60,
  'kabel': 60,
  'case': 40,
  'etui': 40,
  'ring': 10,
  'pierscionek': 10,
  'pierścionek': 10,
  'necklace': 30,
  'naszyjnik': 30,
  'chain': 30,
  'lancuszek': 30,
  'łańcuszek': 30,
  'bracelet': 20,
  'bransoletka': 20,
  'keychain': 20,
  'brelok': 20,
  'cardholder': 60,
  'wizytownik': 60,
  'gloves': 100,
  'rekawice': 100,
  'rękawice': 100,
  'rekawiczki': 100,
  'rękawiczki': 100,
  'scarf': 150,
  'szalik': 150,
  'buty': 950,
  'dunk': 900,
  'af1': 1000,
  'tn': 900,
  'nb': 950,
  'pasek': 220,
  'belt': 220,
  'plecak': 800,
  'bag': 750,
  'portfel': 120,
  'wallet': 120
};

const MULTILINGUAL_KEYWORDS = {
  watch: [
    'watch', 'zegar', 'rolex', 'submariner', 'sambariner', 'omega', 'patek', 'hublot', 'cartier', 'casio', 'seiko', 'citizen',
    'uhr', 'reloj', 'montre', 'orologio'
  ],
  tshirt: [
    't-shirt', 'tee', 'tshirt', 'koszul', 'shirt', 'camiseta', 'maglietta', 'hemd', 'camisa'
  ],
  hoodie: [
    'hoodie', 'bluz', 'kapuzen', 'pullover', 'sudadera', 'sweat', 'pull'
  ],
  pants: [
    'spodn', 'pants', 'dres', 'hose', 'pantalones', 'pantalon', 'pantaloni', 'jeans', 'trousers'
  ],
  shorts: [
    'shorts', 'spoden', 'kurze hose', 'pantalones cortos', 'short', 'pantaloncino'
  ],
  jacket: [
    'jacket', 'kurt', 'puffer', 'coat', 'jacke', 'chaqueta', 'veste', 'giacca', 'manteau', 'abrigo'
  ],
  hat: [
    'hat', 'czap', 'cap', 'beanie', 'mütze', 'muetze', 'kappe', 'sombrero', 'gorra', 'chapeau', 'bonnet', 'cappello'
  ],
  socks: [
    'socks', 'skarp', 'socken', 'calcetines', 'chaussettes', 'calzini'
  ],
  bag: [
    'bag', 'torb', 'plecak', 'backpack', 'tasche', 'rucksack', 'bolso', 'mochila', 'sac', 'borsa', 'zaino'
  ],
  belt: [
    'belt', 'pasek', 'gürtel', 'guertel', 'cinturón', 'cinturon', 'ceinture', 'cintura'
  ],
  wallet: [
    'wallet', 'portfel', 'geldbeutel', 'brieftasche', 'cartera', 'portefeuille', 'portafoglio', 'cardholder', 'wizytownik'
  ],
  electronics: [
    'airpods', 'sluchaw', 'słuchaw', 'headphones', 'earphones', 'charger', 'ladowar', 'ładowar', 'powerbank', 'phone', 'telefon',
    'iphone', 'speaker', 'glosnik', 'głośnik', 'cable', 'kabel', 'case', 'etui', 'electronics', 'elektronika'
  ],
  glasses: [
    'okulary', 'glass', 'sunglasses', 'brille', 'gafas', 'lunettes', 'occhiali'
  ],
  perfume: [
    'perfum', 'parfüm', 'parfum', 'profumo'
  ],
  jewelry: [
    'ring', 'pierscion', 'pierścion', 'chain', 'lancusz', 'łańcusz', 'necklace', 'naszyj', 'bracelet', 'bransolet', 'keychain', 'brelok'
  ],
  gloves: [
    'gloves', 'rekawic', 'rękawic', 'handschuhe', 'guantes', 'gants', 'guanti'
  ],
  scarf: [
    'scarf', 'szalik', 'schal', 'bufanda', 'echarpe', 'écharpe', 'sciarpa'
  ],
  shoes: [
    'shoes', 'buty', 'but', 'sneaker', 'tramp', 'kick', 'obuw', 'adid', 'schuhe', 'zapatos', 'chaussures', 'scarpe'
  ]
};

export async function POST(req) {
  try {
    const { itemName, itemSize, includeBox } = await req.json();

    if (!itemName) {
      return NextResponse.json({ weight: 0, isAiActive: false, isShoe: false });
    }

    const nameLower = itemName.toLowerCase();
    
    const isShoeType = (name) => {
      const lower = (name || '').toLowerCase();
      
      // If it matches any accessory, clothing, watch or electronic category, it's NOT a shoe
      const nonShoeCategories = [
        'watch', 'tshirt', 'hoodie', 'pants', 'shorts', 'jacket', 'hat', 'socks',
        'bag', 'belt', 'wallet', 'electronics', 'glasses', 'perfume', 'jewelry', 'gloves', 'scarf'
      ];
      
      for (const cat of nonShoeCategories) {
        if (MULTILINGUAL_KEYWORDS[cat].some(kw => lower.includes(kw))) {
          return false;
        }
      }
      
      // Otherwise check if it contains shoe terms or brands
      const shoeKeywords = [
        'jordan', 'dunk', 'yeezy', 'force', 'af1', 'trainer', 'skate', 'b30', 'b22', 
        'b33', 'b27', 'nyc', 'gel', 'spezial', 'gazelle', 'samba', 'campus', 'superstar', 
        'lanvin', 'bapesta', 'shox', 'tn', 'air max', 'crocs', 'slide', 'slides', 'klapki', 'kicksy'
      ];
      
      if (shoeKeywords.some(kw => lower.includes(kw))) {
        return true;
      }
      
      if (MULTILINGUAL_KEYWORDS.shoes.some(kw => lower.includes(kw))) {
        return true;
      }
      
      return false;
    };

    let found = false;
    let baseWeight = 0;

    for (const key in ESTIMATED_WEIGHTS) {
      if (nameLower.includes(key)) {
        baseWeight = ESTIMATED_WEIGHTS[key];
        found = true;
        break;
      }
    }

    // Smart Fallback/Logic deduction based on word roots if no exact match is found
    if (!found) {
      if (MULTILINGUAL_KEYWORDS.tshirt.some(kw => nameLower.includes(kw))) {
        baseWeight = 230;
        found = true;
      } else if (MULTILINGUAL_KEYWORDS.hoodie.some(kw => nameLower.includes(kw))) {
        baseWeight = 850;
        found = true;
      } else if (MULTILINGUAL_KEYWORDS.shoes.some(kw => nameLower.includes(kw))) {
        baseWeight = 950;
        found = true;
      } else if (MULTILINGUAL_KEYWORDS.shorts.some(kw => nameLower.includes(kw))) {
        baseWeight = 300;
        found = true;
      } else if (MULTILINGUAL_KEYWORDS.pants.some(kw => nameLower.includes(kw))) {
        baseWeight = 600;
        found = true;
      } else if (MULTILINGUAL_KEYWORDS.jacket.some(kw => nameLower.includes(kw))) {
        baseWeight = 1000;
        found = true;
      } else if (MULTILINGUAL_KEYWORDS.hat.some(kw => nameLower.includes(kw))) {
        baseWeight = 120;
        found = true;
      } else if (MULTILINGUAL_KEYWORDS.socks.some(kw => nameLower.includes(kw))) {
        baseWeight = 80;
        found = true;
      } else if (MULTILINGUAL_KEYWORDS.bag.some(kw => nameLower.includes(kw))) {
        baseWeight = 750;
        found = true;
      } else if (MULTILINGUAL_KEYWORDS.watch.some(kw => nameLower.includes(kw))) {
        baseWeight = 150;
        found = true;
      } else if (MULTILINGUAL_KEYWORDS.belt.some(kw => nameLower.includes(kw))) {
        baseWeight = 220;
        found = true;
      } else if (MULTILINGUAL_KEYWORDS.wallet.some(kw => nameLower.includes(kw))) {
        baseWeight = 120;
        found = true;
      } else if (MULTILINGUAL_KEYWORDS.perfume.some(kw => nameLower.includes(kw))) {
        baseWeight = 250;
        found = true;
      } else if (MULTILINGUAL_KEYWORDS.glasses.some(kw => nameLower.includes(kw))) {
        baseWeight = 100;
        found = true;
      } else if (MULTILINGUAL_KEYWORDS.electronics.some(kw => nameLower.includes(kw))) {
        if (nameLower.includes('airpods')) baseWeight = 50;
        else if (nameLower.includes('powerbank')) baseWeight = 250;
        else if (nameLower.includes('phone') || nameLower.includes('telefon') || nameLower.includes('iphone')) baseWeight = 200;
        else if (nameLower.includes('speaker') || nameLower.includes('glosnik') || nameLower.includes('głośnik')) baseWeight = 450;
        else if (nameLower.includes('case') || nameLower.includes('etui')) baseWeight = 40;
        else baseWeight = 100; // default for other electronics / chargers
        found = true;
      } else if (MULTILINGUAL_KEYWORDS.jewelry.some(kw => nameLower.includes(kw))) {
        baseWeight = 25;
        found = true;
      } else if (MULTILINGUAL_KEYWORDS.gloves.some(kw => nameLower.includes(kw))) {
        baseWeight = 100;
        found = true;
      } else if (MULTILINGUAL_KEYWORDS.scarf.some(kw => nameLower.includes(kw))) {
        baseWeight = 150;
        found = true;
      }
    }

    const isShoe = isShoeType(itemName);
    
    if (found) {
      let finalWeight = baseWeight;
      
      // Apply brand-specific weight premium for heavyweight designer blanks (e.g. Balenciaga, Vetements, Yeezy Gap, Represent, heavyweight)
      const isHeavyweightBrand = nameLower.includes('balenciaga') || nameLower.includes('vetements') || nameLower.includes('yeezy gap') || nameLower.includes('heavyweight') || nameLower.includes('represent');
      if (isHeavyweightBrand) {
        if (MULTILINGUAL_KEYWORDS.hoodie.some(kw => nameLower.includes(kw))) {
          finalWeight += 250; // Ultra-heavy hoodies
        } else if (MULTILINGUAL_KEYWORDS.tshirt.some(kw => nameLower.includes(kw))) {
          finalWeight += 80;  // Thick heavy cotton tees
        }
      }

      // Dynamic weight scaling based on size
      if (itemSize) {
        const cleanSize = itemSize.trim().toUpperCase();
        
        // Extract first numeric sequence (e.g., "EU 43" -> 43, "US 10" -> 10, "42.5" -> 42.5)
        let numSize = NaN;
        const sizeMatch = cleanSize.match(/\d+(?:\.\d+)?/);
        if (sizeMatch) {
          numSize = parseFloat(sizeMatch[0]);
        }
        
        if (!isNaN(numSize) && numSize >= 25 && numSize <= 52) {
          if (isShoe) {
            // Shoe baseline size is 42, offset is +-25g per full size
            finalWeight += Math.round((numSize - 42) * 25);
          } else {
            // Clothing numeric baseline (e.g. jeans size) is 32, offset is +-15g per size
            finalWeight += Math.round((numSize - 32) * 15);
          }
        } else {
          // Clothing alphabetical sizes
          if (cleanSize === 'XS') finalWeight -= 40;
          else if (cleanSize === 'S') finalWeight -= 20;
          else if (cleanSize === 'M') finalWeight += 0;
          else if (cleanSize === 'L') finalWeight += 25;
          else if (cleanSize === 'XL' || cleanSize === '1XL') finalWeight += 50;
          else if (cleanSize === 'XXL' || cleanSize === '2XL') finalWeight += 75;
          else if (cleanSize === 'XXXL' || cleanSize === '3XL') finalWeight += 100;
          else if (cleanSize === 'XXXXL' || cleanSize === '4XL') finalWeight += 125;
        }
      }

      // Dołączamy wagę pudełka tylko i wyłącznie dla obuwia
      if (includeBox && isShoe) {
        finalWeight += 350;
      }

      // Ensure weight is never negative or unreasonably low
      return NextResponse.json({ 
        weight: Math.max(50, finalWeight), 
        isAiActive: true,
        isShoe: isShoe
      });
    } else {
      return NextResponse.json({ 
        weight: 0, 
        isAiActive: false,
        isShoe: isShoe
      });
    }
  } catch (error) {
    return NextResponse.json({ weight: 0, isAiActive: false, isShoe: false }, { status: 500 });
  }
}
