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
  'socks': 80,
  'skarpetki': 80,
  'skarpety': 80,
  'airpods': 50,
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

export async function POST(req) {
  try {
    const { itemName, itemSize, includeBox } = await req.json();

    if (!itemName) {
      return NextResponse.json({ weight: 0, isAiActive: false, isShoe: false });
    }

    const nameLower = itemName.toLowerCase();
    
    const isShoeType = (name) => {
      const lower = (name || '').toLowerCase();
      return lower.includes('jordan') || lower.includes('dunk') || lower.includes('yeezy') || 
             lower.includes('force') || lower.includes('af1') || lower.includes('trainer') || 
             lower.includes('skate') || lower.includes('b30') || lower.includes('b22') || 
             lower.includes('b33') || lower.includes('b27') || lower.includes('nyc') || 
             lower.includes('gel') || lower.includes('spezial') || lower.includes('gazelle') || 
             lower.includes('samba') || lower.includes('campus') || lower.includes('superstar') || 
             lower.includes('lanvin') || lower.includes('shoes') || lower.includes('buty') || 
             lower.includes('bapesta') || lower.includes('shox') || lower.includes('tn') || 
             lower.includes('air max') || lower.includes('crocs') || lower.includes('slide') || 
             lower.includes('slides') || lower.includes('obuw') || lower.includes('sneaker') || 
             lower.includes('trampki') || lower.includes('klapki') || lower.includes('kicksy');
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
      if (nameLower.includes('kosz') || nameLower.includes('tshirt') || nameLower.includes('tee') || nameLower.includes('top')) {
        baseWeight = 230;
        found = true;
      } else if (nameLower.includes('bluz') || nameLower.includes('hood') || nameLower.includes('swet') || nameLower.includes('sweat')) {
        baseWeight = 850;
        found = true;
      } else if (nameLower.includes('but') || nameLower.includes('shoes') || nameLower.includes('sneaker') || nameLower.includes('tramp') || nameLower.includes('kick') || nameLower.includes('obuw') || nameLower.includes('adid')) {
        baseWeight = 950;
        found = true;
      } else if (nameLower.includes('spoden') || nameLower.includes('short')) {
        baseWeight = 300;
        found = true;
      } else if (nameLower.includes('spodn') || nameLower.includes('pant') || nameLower.includes('dres') || nameLower.includes('jeans') || nameLower.includes('trousers')) {
        baseWeight = 600;
        found = true;
      } else if (nameLower.includes('kurt') || nameLower.includes('jack') || nameLower.includes('puffer') || nameLower.includes('coat') || nameLower.includes('vest') || nameLower.includes('kamiz')) {
        baseWeight = 1000;
        found = true;
      } else if (nameLower.includes('czap') || nameLower.includes('hat') || nameLower.includes('cap') || nameLower.includes('beanie')) {
        baseWeight = 120;
        found = true;
      } else if (nameLower.includes('skarp') || nameLower.includes('sock')) {
        baseWeight = 80;
        found = true;
      } else if (nameLower.includes('torb') || nameLower.includes('bag') || nameLower.includes('plecak') || nameLower.includes('backpack')) {
        baseWeight = 750;
        found = true;
      } else if (nameLower.includes('klapk') || nameLower.includes('slid') || nameLower.includes('sandal') || nameLower.includes('japonk') || nameLower.includes('croc')) {
        baseWeight = 400;
        found = true;
      } else if (nameLower.includes('zegar') || nameLower.includes('watch')) {
        baseWeight = 150;
        found = true;
      } else if (nameLower.includes('pas') || nameLower.includes('belt')) {
        baseWeight = 220;
        found = true;
      } else if (nameLower.includes('portfel') || nameLower.includes('wallet')) {
        baseWeight = 120;
        found = true;
      } else if (nameLower.includes('perfum')) {
        baseWeight = 250;
        found = true;
      } else if (nameLower.includes('okulary') || nameLower.includes('glass')) {
        baseWeight = 100;
        found = true;
      }
    }

    const isShoe = isShoeType(itemName);
    
    if (found) {
      let finalWeight = baseWeight;
      
      // Dynamic weight scaling based on size
      if (itemSize) {
        const cleanSize = itemSize.trim().toUpperCase();
        const numSize = parseFloat(cleanSize);
        
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
