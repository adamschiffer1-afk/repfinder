// Update Product Names Script - Fixes brand mappings for existing products
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true },
  batch: { type: String, default: 'random' },
  link: { type: String, required: true },
  clicks: { type: Number, default: 0 },
  isPinned: { type: Boolean, default: false },
  pinnedOrder: { type: Number, default: null },
  qcImages: { type: [String], default: [] },
  slug: { type: String, unique: true, sparse: true },
  itemId: { type: String, unique: true, sparse: true }
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// COMPREHENSIVE Brand Decode Map - All abbreviations from CSV
const BRAND_MAP = {
  // Nike variations
  'n.k': 'Nike', 'N.K': 'Nike', 'N.k': 'Nike',
  // Jordan variations  
  'J.o.r.d.a.n': 'Jordan', 'j.o.r.d.a.n': 'Jordan',
  // Stussy
  'S.t.u.s.s.y': 'Stussy', 's.t.u.s.s.y': 'Stussy',
  // Ralph Lauren
  'R.a.l.p.h Lauren': 'Ralph Lauren', 'R.a.l.p.h': 'Ralph Lauren', 'r.a.l.p.h': 'Ralph Lauren',
  // Burberry
  'b.b.l': 'Burberry', 'B.B.L': 'Burberry', 'B.u.r.b.e.r.r.y': 'Burberry', 'b.b': 'Burberry', 'B.B': 'Burberry',
  // Dior
  'D.i.o.r': 'Dior', 'd.i.o.r': 'Dior',
  // Gucci
  'G.u.c.c.i': 'Gucci', 'g.u.c.c.i': 'Gucci',
  // Prada
  'P.r.a.d.a': 'Prada', 'p.r.a.d.a': 'Prada',
  // Louis Vuitton
  'L.V': 'Louis Vuitton', 'l.v': 'Louis Vuitton', 'L.v': 'Louis Vuitton',
  // Balenciaga
  'B.a.l.e.n.c.i.a.g.a': 'Balenciaga', 'B a l e n c i a g a': 'Balenciaga',
  // Chanel
  'C.h.a.n.e.l': 'Chanel', 'C.H.A.N.E.L': 'Chanel',
  // Versace
  'V.e.r.s.a.c.e': 'Versace', 'VER.SAC.e': 'Versace',
  // Valentino
  'V.a.l.e.n.t.i.n.o': 'Valentino', 'VAL.ENT.INO': 'Valentino',
  // Chrome Hearts
  'C.h.r.o.m.e H.e.a.r.t.s': 'Chrome Hearts', 'C.h.r.o.m.e Hearts': 'Chrome Hearts', 'CHR.OME HEA.RTS': 'Chrome Hearts',
  // Givenchy
  'G.i.v.e.n.c.h.y': 'Givenchy', 'GIV.ENC.h.y': 'Givenchy',
  // Fendi
  'F.e.n.d.i': 'Fendi', 'FEN.d.i': 'Fendi',
  // Celine
  'C.e.l.i.n.e': 'Celine', 'CEL.INE': 'Celine',
  // Hermes
  'H.e.r.m.e.s': 'Hermes', 'HER.MES': 'Hermes',
  // Margiela
  'M.a.r.g.i.e.l.a': 'Margiela', 'MAR.GIE.l.a': 'Margiela',
  // Bottega Veneta
  'B.o.t.t.e.g.a V.e.n.e.t.a': 'Bottega Veneta', 'BOT.TEG.a VEN.ETA': 'Bottega Veneta',
  // Giuseppe Zanotti
  'G.i.u.s.e.p.p.e z.a.n.o.t.t.i': 'Giuseppe Zanotti', 'GIU.SEP.p.e ZAN.OTT.i': 'Giuseppe Zanotti',
  // Saint Laurent
  'S.a.i.n.t Laurent': 'Saint Laurent', 'SAI.n.t Laurent': 'Saint Laurent',
  // Moncler
  'M.o.n.c.l.e.r': 'Moncler', 'm.o.n.c.l.e.r': 'Moncler',
  // Canada Goose
  'C.a.n.a.d.a Goose': 'Canada Goose', 'c.a.n.a.d.a goose': 'Canada Goose',
  // Stone Island
  'S.t.o.n.e Island': 'Stone Island', 'S.t.o.n.e': 'Stone Island', 's.t.o.n.e': 'Stone Island',
  // Essentials
  'E.s.s.e.n.t.i.a.l.s': 'Essentials', 'e.s.s.e.n.t.i.a.l.s': 'Essentials',
  // Trapstar
  'T.r.a.p.s.t.a.r': 'Trapstar', 't.r.a.p.s.t.a.r': 'Trapstar',
  // Carhartt
  'C.a.r.h.a.r.t.t': 'Carhartt', 'c.a.r.h.a.r.t.t': 'Carhartt', 'C.a.r.h.a.r.t': 'Carhartt',
  // Supreme
  'S.u.p.r.e.m.e': 'Supreme', 's.u.p.r.e.m.e': 'Supreme',
  // New Balance
  'N.B': 'New Balance', 'n.b': 'New Balance', 'N.E.W': 'New Balance', 'n.e.w': 'New Balance', 'NEW': 'New Balance', 'New': 'New Balance',
  // The North Face
  'T.N.F': 'The North Face', 't.n.f': 'The North Face', 'N.o.r.t.h Face': 'North Face',
  // Adidas
  'A.d.i.d.a.s': 'Adidas', 'a.d.i.d.a.s': 'Adidas',
  // Yeezy
  'Y.e.e.z.y': 'Yeezy', 'y.e.e.z.y': 'Yeezy', 'y.z': 'Yeezy', 'Y.Z': 'Yeezy', 'Yz': 'Yeezy', 'YZ': 'Yeezy',
  // Converse
  'C.o.n.v.e.r.s.e': 'Converse', 'c.o.n.v.e.r.s.e': 'Converse',
  // Vans
  'V.a.n.s': 'Vans', 'v.a.n.s': 'Vans',
  // ZARA
  'Z.A.R.A': 'ZARA', 'ZAR.A': 'ZARA',
  // UGG
  'U.G.G': 'UGG', 'U.g.g': 'UGG',
  // Watches
  'R.o.l.e.x': 'Rolex', 'ROL.e.x': 'Rolex',
  'P.a.t.e.k Philippe': 'Patek Philippe', 'PAT.e.k Philippe': 'Patek Philippe',
  'A.u.d.e.m.a.r.s P.i.g.u.e.t': 'Audemars Piguet', 'AUD.EMA.r.s PIG.UET': 'Audemars Piguet',
  'R.i.c.h.a.r.d M.i.l.l.e': 'Richard Mille',
  'C.a.r.t.i.e.r': 'Cartier', 'C.a.s.i.o': 'Casio', 'C.a.Stone Island.o': 'Casio',
  // Other brands
  'Birkenstock': 'Birkenstock', 'B.i.r.k.e.n.s.t.o.c.k.s': 'Birkenstock', 'BIR.KEN.STO.CKS': 'Birkenstock',
  'D.y.s.o.n': 'Dyson', 'DYS.o.n': 'Dyson',
  'A.p.p.l.e': 'Apple', 'APP.l.e': 'Apple',
  'L.E.G.O': 'LEGO', 'LEG.O': 'LEGO',
  'P.o.k.é.m.o.n': 'Pokemon', 'POK.é.MON': 'Pokemon',
  'L.a.b.u.b.u': 'Labubu', 'LAB.UBU': 'Labubu',
  'U.n.d.e.r Armour': 'Under Armour', 'UND.e.r Armour': 'Under Armour',
  'U.n.i.q.l.o': 'Uniqlo', 'UNI.QLO': 'Uniqlo',
  'M.i.u.m.i.u': 'Miu Miu', 'MIU.MIU': 'Miu Miu',
  'I.c.e cream': 'Ice Cream', 'ICE cream': 'Ice Cream',
  'R.a.y-B.a.n': 'Ray-Ban', 'RAY-BAN': 'Ray-Ban',
  'M.a.s.c.o.t': 'Mascot', 'MAS.COT': 'Mascot',
  'G.o.t.h.i.c': 'Gothic', 'GOT.HIC': 'Gothic',
  'C.r.o.c.o.d.i.l.e': 'Crocodile', 'CRO.COD.ILE': 'Crocodile',
  'G.o.y.a.d': 'Goyard', 'GOY.a.d': 'Goyard',
  'P.a.n.d.o.r.a': 'Pandora', 'PAN.DOR.a': 'Pandora',
  'Lu B.o.t.i.n.g': 'Louboutin', 'Lu BOT.ING': 'Louboutin',
  'N.i.k.e x S.t.u.s.s.y': 'Nike x Stussy', 'NIK.e x Stussy': 'Nike x Stussy',
  'A.S.I.C.S': 'ASICS', 'A.Stone Island.C.S': 'ASICS',
  // Abbreviated brands (2-3 letters) - full names
  'A.N.G.E.L': 'Palm Angels', 'a.n.g.e.l': 'Palm Angels',
  'Sp 5': 'Spider', 'Sp5der': 'Spider', 'sp 5': 'Spider', 'sp5der': 'Spider',
  'M.C.Q.U.E.E.N': 'McQueen', 'm.c.q.u.e.e.n': 'McQueen',
  'B.O.O.S': 'Boss', 'b.o.o.s': 'Boss',
  'Bl*': 'Balenciaga', 'bl*': 'Balenciaga',
  'B P': 'Bapesta', 'b p': 'Bapesta',
  'F.L.E': 'Fleece', 'f.l.e': 'Fleece',
  'C.A.R.G.O': 'Cargo', 'c.a.r.g.o': 'Cargo',
  'o.r.o.m': 'Chrome', 'O.R.O.M': 'Chrome',
  'a.m.i': 'Ami Paris', 'A.M.I': 'Ami Paris',
  'a.m.e': 'AMI', 'A.M.E': 'AMI',
  'a.m.n': 'Amiri', 'A.M.N': 'Amiri',
  'a.m.r': 'Amiri', 'A.M.R': 'Amiri',
  'a.m.s': 'Alexander McQueen', 'A.M.S': 'Alexander McQueen',
  'a.m.d': 'Under Armour', 'A.M.D': 'Under Armour', 'amd': 'Under Armour', 'AMD': 'Under Armour',
  'a.l.o': 'Alo Yoga', 'A.L.O': 'Alo Yoga',
  'a.k.m': 'AKM', 'A.K.M': 'AKM',
  'b.d.j': 'BDJ', 'B.D.J': 'BDJ',
  'b.e.m': 'BEM', 'B.E.M': 'BEM',
  'b.r.o': 'Broken Planet', 'B.R.O': 'Broken Planet',
  'c.o.r': 'Corteiz', 'C.O.R': 'Corteiz',
  'e.r.d': 'ERD', 'E.R.D': 'ERD',
  'e.m.d': 'EMD', 'E.M.D': 'EMD',
  'g.a.p': 'Gap', 'G.A.P': 'Gap',
  'g.i.v': 'Givenchy', 'G.I.V': 'Givenchy',
  'k.h.t': 'Kith', 'K.H.T': 'Kith', 'kht': 'Kith', 'KHT': 'Kith',
  'k.l.x': 'Chrome Hearts', 'K.L.X': 'Chrome Hearts', 'klx': 'Chrome Hearts', 'KLX': 'Chrome Hearts',
  'l.b.t': 'Louboutin', 'L.B.T': 'Louboutin',
  'm.j.l': 'Marc Jacobs', 'M.J.L': 'Marc Jacobs',
  'm.k.l': 'Moncler', 'M.K.L': 'Moncler',
  'm.l.b': 'MLB', 'M.L.B': 'MLB',
  'm.m.h': 'MMH', 'M.M.H': 'MMH',
  'm.o.n': 'Moncler', 'M.O.N': 'Moncler',
  'o.l.o': 'Polo Ralph Lauren', 'O.L.O': 'Polo Ralph Lauren',
  'p.l.d': 'Polo Ralph Lauren', 'P.L.D': 'Polo Ralph Lauren',
  'p.d.l': 'PDL', 'P.D.L': 'PDL',
  's.b.r': 'SBR', 'S.B.R': 'SBR',
  's.l.l': 'YSL', 'S.L.L': 'YSL', 'sll': 'YSL', 'SLL': 'YSL',
  's.t.x': 'Stussy', 'S.T.X': 'Stussy',
  's.u.p': 'Supreme', 'S.U.P': 'Supreme', 'SUP': 'Supreme',
  't.r.a': 'Trapstar', 'T.R.A': 'Trapstar',
  'x.n.e': 'XNE', 'X.N.E': 'XNE',
  'y.s.s': 'YSS', 'Y.S.S': 'YSS',
  'j.a.c': 'JAC', 'J.A.C': 'JAC',
  'p.r.a': 'Prada', 'P.R.A': 'Prada',
  'p.p': 'PP', 'P.P': 'PP',
  'e.y': 'EY', 'E.Y': 'EY',
  'l.a.n': 'Lanvin', 'L.A.N': 'Lanvin', 'LAN': 'Lanvin',
  // 2-letter codes (full brand names)
  'Sy': 'Syna World', 'sy': 'Syna World', 'S.Y': 'Syna World', 's.y': 'Syna World',
  'A.J.3': 'Jordan 3', 'a.j.3': 'Jordan 3', 'AJ3': 'Jordan 3', 'aj3': 'Jordan 3',
  'J.1': 'Jordan 1', 'j.1': 'Jordan 1', 'J1': 'Jordan 1', 'j1': 'Jordan 1',
  'Yz.3.5.0': 'Yeezy 350', 'yz.3.5.0': 'Yeezy 350', 'YZ350': 'Yeezy 350',
  'Yz.5.0.0': 'Yeezy 500', 'yz.5.0.0': 'Yeezy 500', 'YZ500': 'Yeezy 500',
  'Nike 9.8': 'Nike Air Max 98', 'nike 9.8': 'Nike Air Max 98',
  'Jordan 3 Series': 'Jordan 3', 'jordan 3 series': 'Jordan 3',
  'k.d.y': 'Cartier', 'K.D.Y': 'Cartier', 'kdy': 'Cartier', 'KDY': 'Cartier',
  's.t.d': 'Stussy', 'S.T.D': 'Stussy',
  'b.p': 'Bape', 'B.P': 'Bape', 'bp': 'Bape', 'BP': 'Bape',
  'm.m': 'Maison Margiela', 'M.M': 'Maison Margiela',
  'r.l': 'Ralph Lauren', 'R.L': 'Ralph Lauren',
  's.p': 'Supreme', 'S.P': 'Supreme',
  'k.s': 'KS', 'K.S': 'KS',
  'h.l': 'Hugo Boss', 'H.L': 'Hugo Boss',
  'b.l': 'Balenciaga', 'B.L': 'Balenciaga',
  'b.m': 'The North Face', 'B.M': 'The North Face',
  'c.k': 'Calvin Klein', 'C.K': 'Calvin Klein',
  'd.r': 'Dior', 'D.R': 'Dior', 'DR': 'Dior',
  'h': 'Broken Planet', 'H': 'Broken Planet', 'H.': 'Broken Planet',
  't.': 'Timberland', 'T.': 'Timberland', 't.b.l': 'Timberland', 'T.B.L': 'Timberland',
  'l.g': 'LEGO', 'L.G': 'LEGO', 'L.G.': 'LEGO',
  'k.w': 'Converse', 'K.W': 'Converse', 'kw': 'Converse', 'KW': 'Converse',
  'q.d': 'QD', 'Q.D': 'QD',
  'd.g': 'Dolce Gabbana', 'D.G': 'Dolce Gabbana',
  'd.s': 'Dsquared2', 'D.S': 'Dsquared2',
  'g.d': 'GD', 'G.D': 'GD',
  'u.s': 'US', 'U.S': 'US',
  'g.u': 'Gucci', 'G.U': 'Gucci', 'GU': 'Gucci',
  'k.c': 'Kate Spade', 'K.C': 'Kate Spade',
  'a.s': 'Acne Studios', 'A.S': 'Acne Studios',
  'u.u': 'Uniqlo', 'U.U': 'Uniqlo',
  'p.u': 'Purple Brand', 'P.U': 'Purple Brand', 'Pu': 'Purple Brand', 'PU': 'Purple Brand',
  's.y': 'SY', 'S.Y': 'SY',
  't.e': 'Tiffany', 'T.E': 'Tiffany',
  'e.s': 'Essentials', 'E.S': 'Essentials',
  'g.c': 'Gucci', 'G.C': 'Gucci',
  'z.c': 'Zegna', 'Z.C': 'Zegna',
  'o.w': 'Off White', 'O.W': 'Off White',
  'd.e': 'Diesel', 'D.E': 'Diesel',
  'j.a': 'JA', 'J.A': 'JA',
  't.m': 'Tommy Hilfiger', 'T.M': 'Tommy Hilfiger',
  'y.h': 'YH', 'Y.H': 'YH',
  'a.a': 'AA', 'A.A': 'AA',
  's.z': 'Maison Margiela', 'S.Z': 'Maison Margiela', 'sz': 'Maison Margiela', 'SZ': 'Maison Margiela',
  'b.x': 'BX', 'B.X': 'BX',
  'o.n': 'On Running', 'O.N': 'On Running',
  'f.d': 'Fendi', 'F.D': 'Fendi', 'fd': 'Fendi', 'FD': 'Fendi',
  'u.g': 'UGG', 'U.G': 'UGG',
  's.l': 'Saint Laurent', 'S.L': 'Saint Laurent',
  'd.p': 'DP', 'D.P': 'DP',
  'd.q': 'Dsquared2', 'D.Q': 'Dsquared2',
  's.c': 'SC', 'S.C': 'SC',
  'z.l': 'ZL', 'Z.L': 'ZL',
  'm.k': 'Michael Kors', 'M.K': 'Michael Kors',
  'a.p': 'Audemars Piguet', 'A.P': 'Audemars Piguet',
  't.a': 'TA', 'T.A': 'TA',
  'a.x': 'Armani Exchange', 'A.X': 'Armani Exchange',
  'h.o': 'HO', 'H.O': 'HO',
  'a.d': 'Adidas', 'A.D': 'Adidas',
  'g.y': 'Goyard', 'G.Y': 'Goyard',
  'c.d': 'Christian Dior', 'C.D': 'Christian Dior',
  'c.b': 'CB', 'C.B': 'CB',
  'c.p': 'CP Company', 'C.P': 'CP Company',
  'D**K': 'Dunk', 'd**k': 'Dunk',
};

function decodeBrandName(name) {
  let decoded = name;
  
  // Sort BRAND_MAP entries by key length (longest first) to prevent partial matches
  const sortedEntries = Object.entries(BRAND_MAP).sort((a, b) => b[0].length - a[0].length);
  
  for (const [abbrev, full] of sortedEntries) {
    // For dotted abbreviations, ensure they're followed by space or end of string
    const escapedAbbrev = abbrev.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('(?:^|\\s)(' + escapedAbbrev + ')(?=\\s|$)', 'gi');
    decoded = decoded.replace(regex, (match, p1) => {
      return match.replace(p1, full);
    });
  }
  
  // Remove Chinese characters
  decoded = decoded.replace(/[\u4e00-\u9fa5]/g, '');
  
  // Remove dots from remaining abbreviations (e.g., B.O.S.S → BOSS)
  decoded = decoded.replace(/\b([A-Z]\.){2,}[A-Z]\b/g, (match) => match.replace(/\./g, ''));
  
  // Clean up product type names
  decoded = decoded.toLowerCase();
  decoded = decoded.replace(/\bshort[- ]sleeves?\b/gi, 'T-shirt');
  decoded = decoded.replace(/\bshort[- ]sleeved\b/gi, 'T-shirt');
  decoded = decoded.replace(/\blong[- ]sleeves?\b/gi, 'Long Sleeve');
  decoded = decoded.replace(/\bfanny pack\b/gi, 'Bag');
  decoded = decoded.replace(/\bshoulder bag\b/gi, 'Bag');
  decoded = decoded.replace(/\bknitted hat\b/gi, 'Hat');
  decoded = decoded.replace(/\bbaseball cap\b/gi, 'Hat');
  decoded = decoded.replace(/\bzipper sweatshirt\b/gi, 'Zip Hoodie');
  decoded = decoded.replace(/\bzip-up hoodie\b/gi, 'Zip Hoodie');
  
  // Capitalize first letter of each word
  decoded = decoded.replace(/\b\w/g, char => char.toUpperCase());
  // Clean up extra spaces
  decoded = decoded.replace(/\s+/g, ' ').trim();
  
  return decoded;
}

async function run() {
  console.log('🔄 Starting product name update...\n');
  
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');
  
  // Get all products
  const products = await Product.find({});
  console.log(`📦 Found ${products.length} products to update\n`);
  
  let updatedCount = 0;
  let skippedCount = 0;
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const oldName = product.name;
    
    // Try to decode the name (in case it still has abbreviations)
    const newName = decodeBrandName(oldName);
    
    if (oldName !== newName) {
      console.log(`[${i + 1}/${products.length}] Updating: "${oldName}" → "${newName}"`);
      product.name = newName;
      await product.save();
      updatedCount++;
    } else {
      skippedCount++;
      if (i % 50 === 0) {
        console.log(`[${i + 1}/${products.length}] Checked ${i + 1} products...`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Updated: ${updatedCount} products`);
  console.log(`⏭️  Skipped: ${skippedCount} products (already correct)`);
  console.log('='.repeat(60));
  
  await mongoose.connection.close();
  console.log('\n✅ Done! All product names updated.');
}

run().catch(err => {
  console.error('❌ Critical error:', err);
  process.exit(1);
});
