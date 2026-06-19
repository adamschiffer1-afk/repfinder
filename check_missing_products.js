// Check which products from CSV are missing in DB
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const fs = require('fs');

const CSV_FILE = 'se1-itemexport-1679502043-20260619024109.csv';
const MONGODB_URI = process.env.MONGODB_URI;

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true },
  batch: { type: String, default: 'random' },
  link: { type: String, required: true },
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// BRAND_MAP from import script
const BRAND_MAP = {
  'n.k': 'Nike', 'N.K': 'Nike', 'N.k': 'Nike',
  'J.o.r.d.a.n': 'Jordan', 'j.o.r.d.a.n': 'Jordan',
  'b.b.l': 'Burberry', 'B.B.L': 'Burberry', 'B.u.r.b.e.r.r.y': 'Burberry', 'b.b': 'Burberry',
  'D.i.o.r': 'Dior', 'd.i.o.r': 'Dior', 'd.r': 'Dior', 'D.R': 'Dior',
  'G.u.c.c.i': 'Gucci', 'g.u.c.c.i': 'Gucci', 'g.c': 'Gucci', 'G.C': 'Gucci',
  'P.r.a.d.a': 'Prada', 'p.r.a.d.a': 'Prada', 'p.l.d': 'Polo Ralph Lauren', 'P.L.D': 'Polo Ralph Lauren',
  'L.V': 'Louis Vuitton', 'l.v': 'Louis Vuitton', 'L.v': 'Louis Vuitton',
  'B.a.l.e.n.c.i.a.g.a': 'Balenciaga', 'B a l e n c i a g a': 'Balenciaga', 'b.m': 'Balenciaga', 'B.M': 'Balenciaga', 'b.l': 'Bottega Veneta', 'B.L': 'Bottega Veneta',
  'C.h.a.n.e.l': 'Chanel', 'c.h.l': 'Chanel',
  'V.e.r.s.a.c.e': 'Versace',
  'V.a.l.e.n.t.i.n.o': 'Valentino',
  'C.h.r.o.m.e H.e.a.r.t.s': 'Chrome Hearts', 'C.h.r.o.m.e Hearts': 'Chrome Hearts', 'k.l.x': 'Chrome Hearts', 'K.L.X': 'Chrome Hearts', 'klx': 'Chrome Hearts',
  'G.i.v.e.n.c.h.y': 'Givenchy',
  'F.e.n.d.i': 'Fendi', 'f.d': 'Fendi', 'F.D': 'Fendi',
  'C.e.l.i.n.e': 'Celine',
  'H.e.r.m.e.s': 'Hermes',
  'M.a.r.g.i.e.l.a': 'Maison Margiela', 'm.m': 'Maison Margiela', 'M.M': 'Maison Margiela',
  'B.o.t.t.e.g.a V.e.n.e.t.a': 'Bottega Veneta',
  'S.a.i.n.t Laurent': 'Saint Laurent', 's.l.l': 'Saint Laurent', 'S.L.L': 'Saint Laurent', 's.l': 'Saint Laurent', 'S.L': 'Saint Laurent',
  'M.o.n.c.l.e.r': 'Moncler', 'm.k.l': 'Moncler', 'M.K.L': 'Moncler', 'm.o.n': 'Moncler',
  'C.a.n.a.d.a Goose': 'Canada Goose',
  'S.t.o.n.e Island': 'Stone Island', 'c.p': 'Stone Island', 'C.P': 'Stone Island',
  'E.s.s.e.n.t.i.a.l.s': 'Essentials', 'e.s.s.e.n.t.i.a.l.s': 'Essentials', 'e.s': 'Essentials', 'E.S': 'Essentials',
  'T.r.a.p.s.t.a.r': 'Trapstar', 't.r.a': 'Trapstar', 'T.R.A': 'Trapstar',
  'C.a.r.h.a.r.t': 'Carhartt', 'k.h.t': 'Kith', 'K.H.T': 'Kith',
  'S.u.p.r.e.m.e': 'Supreme', 's.u.p': 'Supreme', 'S.U.P': 'Supreme', 's.p': 'Supreme', 'S.P': 'Supreme',
  'N.B': 'New Balance', 'n.b': 'New Balance', 'n.e.w': 'New Balance', 'N.E.W': 'New Balance',
  'T.N.F': 'The North Face', 'N.o.r.t.h Face': 'The North Face',
  'A.d.i.d.a.s': 'Adidas', 'a.d.i.d.a.s': 'Adidas', 'a.d': 'Adidas', 'A.D': 'Adidas', 'a.d.m': 'Adidas', 'A.D.M': 'Adidas',
  'Y.e.e.z.y': 'Yeezy', 'y.e.e.z.y': 'Yeezy', 'y.z': 'Yeezy',
  'Z.A.R.A': 'Zara',
  'U.G.G': 'UGG', 'u.g': 'UGG', 'U.G': 'UGG',
  'R.o.l.e.x': 'Rolex',
  'P.a.t.e.k Philippe': 'Patek Philippe',
  'A.u.d.e.m.a.r.s P.i.g.u.e.t': 'Audemars Piguet', 'a.p': 'Audemars Piguet', 'A.P': 'Audemars Piguet',
  'R.i.c.h.a.r.d M.i.l.l.e': 'Richard Mille',
  'C.a.r.t.i.e.r': 'Cartier', 'k.d.y': 'Cartier', 'K.D.Y': 'Cartier',
  'B.i.r.k.e.n.s.t.o.c.k.s': 'Birkenstock',
  'A.p.p.l.e': 'Apple',
  'P.o.k.é.m.o.n': 'Pokemon',
  'L.a.b.u.b.u': 'Labubu',
  'U.n.d.e.r Armour': 'Under Armour', 'a.m.d': 'Under Armour', 'A.M.D': 'Under Armour',
  'U.n.i.q.l.o': 'Uniqlo', 'u.u': 'Uniqlo', 'U.U': 'Uniqlo',
  'M.i.u.m.i.u': 'Miu Miu',
  'R.a.y-B.a.n': 'Ray-Ban',
  'G.o.y.a.d': 'Goyard', 'g.y': 'Goyard', 'G.Y': 'Goyard',
  'P.a.n.d.o.r.a': 'Pandora',
  'Lu B.o.t.i.n.g': 'Louboutin', 'l.b.t': 'Louboutin', 'L.B.T': 'Louboutin',
  'N.i.k.e x S.t.u.s.s.y': 'Nike x Stussy',
  'A.S.I.C.S': 'Asics', 'a.s.i': 'Asics',
  'a.m.i': 'Ami Paris', 'A.M.I': 'Ami Paris', 'a.m.e': 'AMI', 'A.M.E': 'AMI', 'a.m.n': 'Amiri', 'A.M.N': 'Amiri',
  'a.m.r': 'Amiri', 'A.M.R': 'Amiri', 'a.m.s': 'Alexander McQueen', 'A.M.S': 'Alexander McQueen',
  'a.l.o': 'Alo Yoga', 'A.L.O': 'Alo Yoga',
  'c.o.r': 'Corteiz', 'C.O.R': 'Corteiz',
  's.t.x': 'Stussy', 'S.T.X': 'Stussy', 's.t.d': 'Stussy', 'S.T.D': 'Stussy', 'S.t.u.s.s.y': 'Stussy',
  'r.l': 'Ralph Lauren', 'R.L': 'Ralph Lauren', 'R.a.l.p.h Lauren': 'Ralph Lauren', 'R.a.l.p.h': 'Ralph Lauren',
  'b.p': 'Bape', 'B.P': 'Bape',
  'c.k': 'Calvin Klein', 'C.K': 'Calvin Klein',
  'o.w': 'Off-White', 'O.W': 'Off-White',
  'd.e': 'Diesel', 'D.E': 'Diesel',
  't.m': 'Tommy Hilfiger', 'T.M': 'Tommy Hilfiger',
  's.z': 'Sézane', 'S.Z': 'Sézane',
  'o.n': 'On Running', 'O.N': 'On Running',
  'z.c': 'Zegna', 'Z.C': 'Zegna',
  'j.a': 'Jacquemus', 'J.A': 'Jacquemus',
  'a.a': 'Alexander Wang', 'A.A': 'Alexander Wang',
  'l.a.n': 'Lanvin', 'L.A.N': 'Lanvin',
  'x.n.e': 'Axel Arigato', 'X.N.E': 'Axel Arigato',
  'm.l.b': 'MLB', 'M.L.B': 'MLB',
  'h': 'Hellstar', 'H': 'Hellstar',
  'q.d': 'Quadeer', 'Q.D': 'Quadeer',
  'e.y': 'Enfants Riches Déprimés', 'E.Y': 'Enfants Riches Déprimés',
  'c.j.b.l': 'Casablanca', 'C.J.B.L': 'Casablanca',
  'h.j.e': 'Hogan', 'H.J.E': 'Hogan',
  'm.s.n.k': 'Mastermind Japan', 'M.S.N.K': 'Mastermind Japan',
  's.k': 'Seiko', 'S.K': 'Seiko',
  'h.l': 'Heron Preston', 'H.L': 'Heron Preston',
  'k.c': 'Kate Spade', 'K.C': 'Kate Spade',
  'a.s': 'Acne Studios', 'A.S': 'Acne Studios',
  'g.d': 'Gallery Dept', 'G.D': 'Gallery Dept', 'Ga': 'Gallery Dept', 'G.A': 'Gallery Dept',
  'earphone': 'AirPods',
  'Little Bear': 'Bear',
  'b.o.o.t': 'Timberland', 't.b.l': 'Timberland', 'T.B.L': 'Timberland',
  'b.r.o': 'Broken Planet',
  'l.o.n': 'Longines', 'L.O.N': 'Longines',
  'o.l.o': 'Loro Piana', 'O.L.O': 'Loro Piana',
  'Sp 5': 'SP5DER', 'S.p.5': 'SP5DER', 's.p.5': 'SP5DER',
  '1996': 'The North Face',
  'a.f.1': 'Air Force 1',
  'C.r.o.t.e.i.z': 'Corteiz',
  'c.d.g': 'Comme des Garçons',
  'c.e.l.i.i.n.e': 'Celine',
  'M.c.Q.u.e.e.n': 'McQueen', 'McQ': 'McQ',
  'D.G': 'Dolce & Gabbana', 'd.g': 'Dolce & Gabbana',
  'm.c.m': 'MCM', 'M.C.M': 'MCM',
  'p.l.a.y': 'Comme des Garçons Play',
  'c.d': 'Christian Dior', 'C.D': 'Christian Dior',
  'd.s': 'Dsquared2', 'D.S': 'Dsquared2', 'd.q': 'Dsquared2', 'D.Q': 'Dsquared2',
  'l.o.e': 'Loewe',
  'E.A.7': 'Emporio Armani',
  'a.x': 'Armani Exchange', 'A.X': 'Armani Exchange',
  'C.A.R.R.ERA': 'Carrera',
  'D**K': 'Dunk', 'd**k': 'Dunk',
  'Golden Goose': 'Golden Goose',
  'Travis Scott': 'Travis Scott',
  'Dyson': 'Dyson',
  'Stone Island': 'Stone Island',
  'Under Armour': 'Under Armour',
  'Nike': 'Nike',
  'Ralph Lauren': 'Ralph Lauren',
  'Prada': 'Prada',
  'Gucci': 'Gucci',
  'Coach': 'Coach',
  'Chanel': 'Chanel',
  'Rolex': 'Rolex',
  '6.p.m': '6PM',
  'll': 'Lululemon',
  'trap': 'Trapstar',
  'y.z.3.5.0': 'Yeezy 350', 'y.z 450': 'Yeezy 450', 'y.z.5.0.0': 'Yeezy 500', 'y.z 700': 'Yeezy 700', 'y.z 380': 'Yeezy 380',
  'J.o.r.d.a.n 1': 'Jordan 1', 'J.o.r.d.a.n 3': 'Jordan 3', 'J.o.r.d.a.n 4': 'Jordan 4', 'J.o.r.d.a.n 5': 'Jordan 5', 'J.o.r.d.a.n 6': 'Jordan 6', 'J.o.r.d.a.n 14': 'Jordan 14',
  'a.j 6': 'Air Jordan 6', 'a.j.3': 'Air Jordan 3', 'a.j.6': 'Air Jordan 6', 'A.J.1': 'Air Jordan 1',
  'n.k z.o.m': 'Nike Zoom',
  'n.k s.h.o.x': 'Nike Shox',
  'n.k d.n series': 'Nike DN',
  'n.e.w 1906': 'New Balance 1906', 'n.e.w 530': 'New Balance 530', 'n.e.w 9060': 'New Balance 9060', 'n.e.w 9.9.2': 'New Balance 992', 'n.e.w 9.9.3': 'New Balance 993', 'n.e.w 1.0.0.0': 'New Balance 1000', 'n.e.w 2002': 'New Balance 2002',
  'b.l arena': 'Balenciaga Arena',
  'M.A.X 90': 'Nike Air Max 90',
  'T.N': 'Nike TN', 't.n': 'Nike TN',
  'n.k 95': 'Nike Air Max 95',
  'Football': 'Football', 'football': 'Football', 'Football jersey': 'Football Jersey', 'maillot d e football': 'Football Jersey',
};

function decodeBrandName(name) {
  let decoded = name;
  const sortedEntries = Object.entries(BRAND_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [abbrev, full] of sortedEntries) {
    const regex = new RegExp('\\b' + abbrev.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
    decoded = decoded.replace(regex, full);
  }
  decoded = decoded.replace(/[\u4e00-\u9fa5]/g, '');
  decoded = decoded.replace(/\b([A-Z]\.){2,}[A-Z]\b/g, (match) => match.replace(/\./g, ''));
  decoded = decoded.toLowerCase();
  decoded = decoded.replace(/\bshort sleeves?\b/gi, 'T-shirt');
  decoded = decoded.replace(/\blong sleeves?\b/gi, 'Long Sleeve');
  decoded = decoded.replace(/\b\w/g, char => char.toUpperCase());
  decoded = decoded.replace(/\s+/g, ' ').trim();
  return decoded;
}

function parseCSV(content) {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  const hasHeader = lines[0].includes('商品ID');
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const products = [];
  
  for (const line of dataLines) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    
    if (fields.length < 5) continue;
    
    const [itemId, title, , priceStr, link] = fields;
    const priceCNY = parseFloat(priceStr) || 0;
    if (priceCNY === 0) continue;
    
    products.push({
      itemId: itemId.trim(),
      title: title.trim(),
      decodedName: decodeBrandName(title.trim())
    });
  }
  
  return products;
}

async function run() {
  if (!fs.existsSync(CSV_FILE)) {
    console.log(`❌ CSV file not found: ${CSV_FILE}`);
    return;
  }
  
  console.log('📋 Reading CSV file...');
  const content = fs.readFileSync(CSV_FILE, 'utf-8');
  const csvProducts = parseCSV(content);
  console.log(`✅ Found ${csvProducts.length} products in CSV\n`);
  
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');
  
  // Get all products from DB
  const dbProducts = await Product.find({}).select('link name');
  console.log(`✅ Found ${dbProducts.length} products in database\n`);
  
  // Create a set of itemIDs already in the database
  const existingItemIds = new Set();
  dbProducts.forEach(p => {
    // Handle both encoded and direct itemID formats
    let match = p.link.match(/itemID%3D(\d+)/); // URL encoded format
    if (!match) match = p.link.match(/itemID=(\d+)/); // Direct format
    if (match) existingItemIds.add(match[1]);
  });
  
  console.log(`📊 Existing ItemIDs in DB: ${existingItemIds.size}\n`);
  
  // Find missing products
  const missingProducts = csvProducts.filter(p => !existingItemIds.has(p.itemId));
  
  console.log('='.repeat(80));
  console.log(`📊 ANALYSIS RESULTS:`);
  console.log('='.repeat(80));
  console.log(`Total in CSV: ${csvProducts.length}`);
  console.log(`Already in DB: ${csvProducts.length - missingProducts.length}`);
  console.log(`Missing from DB: ${missingProducts.length}`);
  console.log('='.repeat(80));
  
  if (missingProducts.length > 0) {
    console.log(`\n🔍 MISSING PRODUCTS (first 50):\n`);
    missingProducts.slice(0, 50).forEach((p, i) => {
      console.log(`${i + 1}. ID: ${p.itemId}`);
      console.log(`   Original: ${p.title}`);
      console.log(`   Decoded:  ${p.decodedName}\n`);
    });
    
    if (missingProducts.length > 50) {
      console.log(`... and ${missingProducts.length - 50} more products\n`);
    }
    
    // Save missing products to a file
    const missingList = missingProducts.map(p => ({
      itemId: p.itemId,
      original: p.title,
      decoded: p.decodedName
    }));
    
    fs.writeFileSync('missing_products.json', JSON.stringify(missingList, null, 2));
    console.log(`\n💾 Full list saved to: missing_products.json`);
  } else {
    console.log('\n✅ All products from CSV are already in the database!');
  }
  
  await mongoose.connection.close();
}

run().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
