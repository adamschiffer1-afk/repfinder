// Test Brand Name Decoding
// Shows examples of how abbreviated brand names are decoded

const BRAND_DECODE_MAP = {
  'S.t.u.s.s.y': 'Stussy',
  's.t.u.s.s.y': 'Stussy',
  'STUSSY': 'Stussy',
  'R.a.l.p.h Lauren': 'Ralph Lauren',
  'r.a.l.p.h lauren': 'Ralph Lauren',
  'R.a.l.p.h': 'Ralph Lauren',
  'N.K': 'Nike',
  'n.k': 'Nike',
  'N1KE': 'Nike',
  'J.o.r.d.a.n': 'Jordan',
  'j.o.r.d.a.n': 'Jordan',
  'J0RDAN': 'Jordan',
  'D**K': 'Dunk',
  'd**k': 'Dunk',
  'D.U.N.K': 'Dunk',
  'b.b': 'Burberry',
  'B.B': 'Burberry',
  'b.b.r.y': 'Burberry',
  'C.P Company': 'CP Company',
  'C.P': 'CP',
  'c.p': 'CP',
  'S.t.o.n.e Island': 'Stone Island',
  'S.t.o.n.e': 'Stone',
  's.t.o.n.e': 'Stone',
  'S.I': 'Stone Island',
  'B.a.l.e.n.c.i.a.g.a': 'Balenciaga',
  'b.a.l.e.n': 'Balenciaga',
  'G.u.c.c.i': 'Gucci',
  'g.u.c.c.i': 'Gucci',
  'GUCCl': 'Gucci',
  'L.V': 'Louis Vuitton',
  'l.v': 'Louis Vuitton',
  'LV': 'Louis Vuitton',
  'D.i.o.r': 'Dior',
  'd.i.o.r': 'Dior',
  'Dl0R': 'Dior',
  'P.r.a.d.a': 'Prada',
  'p.r.a.d.a': 'Prada',
  'PRADA': 'Prada',
  'A.d.i.d.a.s': 'Adidas',
  'a.d.i.d.a.s': 'Adidas',
  'AD1DAS': 'Adidas',
  'N.B': 'New Balance',
  'n.b': 'New Balance',
  'T.N.F': 'The North Face',
  't.n.f': 'The North Face',
  'S.u.p.r.e.m.e': 'Supreme',
  's.u.p.r.e.m.e': 'Supreme',
  'SUPREME': 'Supreme',
  'C.a.r.h.a.r.t.t': 'Carhartt',
  'c.a.r.h.a.r.t.t': 'Carhartt',
  'CARHARTT': 'Carhartt',
  'T.r.a.p.s.t.a.r': 'Trapstar',
  't.r.a.p.s.t.a.r': 'Trapstar',
  'TRAPSTAR': 'Trapstar',
  'E.s.s.e.n.t.i.a.l.s': 'Essentials',
  'e.s.s.e.n.t.i.a.l.s': 'Essentials',
  'ESSENTIALS': 'Essentials',
  'P.a.t.a.g.o.n.i.a': 'Patagonia',
  'p.a.t.a.g.o.n.i.a': 'Patagonia',
  'A.r.c.t.e.r.y.x': 'Arcteryx',
  'a.r.c.t.e.r.y.x': 'Arcteryx',
  'M.o.n.c.l.e.r': 'Moncler',
  'm.o.n.c.l.e.r': 'Moncler',
  'MONCLER': 'Moncler',
  'C.a.n.a.d.a Goose': 'Canada Goose',
  'c.a.n.a.d.a goose': 'Canada Goose',
  'Y.e.e.z.y': 'Yeezy',
  'y.e.e.z.y': 'Yeezy',
  'YEEZY': 'Yeezy',
  'C.o.n.v.e.r.s.e': 'Converse',
  'c.o.n.v.e.r.s.e': 'Converse',
  'V.a.n.s': 'Vans',
  'v.a.n.s': 'Vans',
};

function decodeBrandName(name) {
  let decoded = name;
  
  for (const [abbrev, full] of Object.entries(BRAND_DECODE_MAP)) {
    const regex = new RegExp(abbrev.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    decoded = decoded.replace(regex, full);
  }
  
  decoded = decoded.replace(/\b([a-z])\.([a-z])\.([a-z])\b/gi, (match, a, b, c) => {
    return a.toUpperCase() + b.toUpperCase() + c.toUpperCase();
  });
  
  return decoded.trim();
}

// Test examples from your CSV format
const testNames = [
  'S.t.u.s.s.y hoodie black',
  'R.a.l.p.h Lauren cardigan sweater',
  'N.K J.o.r.d.a.n 1 high retro',
  'D**K low panda black white',
  'b.b cardigan vintage check',
  'C.P Company goggle jacket',
  'S.t.o.n.e island cargo pants',
  'B.a.l.e.n.c.i.a.g.a triple s',
  'G.u.c.c.i ace sneakers white',
  'L.V monogram backpack',
  'D.i.o.r oblique tote bag',
  'P.r.a.d.a nylon backpack',
  'A.d.i.d.a.s yeezy boost 350',
  'N.B 550 white green',
  'T.N.F 1996 nuptse jacket',
  'S.u.p.r.e.m.e box logo hoodie',
  'C.a.r.h.a.r.t.t double knee pants',
  'T.r.a.p.s.t.a.r irongate jacket',
  'E.s.s.e.n.t.i.a.l.s fog hoodie',
  'M.o.n.c.l.e.r maya jacket',
  'C.a.n.a.d.a Goose langford parka',
  'Y.e.e.z.y slide bone',
  'C.o.n.v.e.r.s.e chuck 70',
  'V.a.n.s old skool black white',
  'n.k air force 1 low white',
  'j.o.r.d.a.n 4 military black',
  's.t.u.s.s.y 8 ball hoodie',
  'fear of god e.s.s.e.n.t.i.a.l.s shorts',
];

console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║                    BRAND NAME DECODING TEST                               ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

testNames.forEach((originalName, index) => {
  const decodedName = decodeBrandName(originalName);
  const changed = originalName !== decodedName;
  
  console.log(`${index + 1}. ${changed ? '🔧' : '✓'}`);
  console.log(`   BEFORE: ${originalName}`);
  console.log(`   AFTER:  ${decodedName}`);
  console.log('');
});

console.log('═'.repeat(75));
console.log('Legend:');
console.log('  🔧 = Brand name was decoded');
console.log('  ✓ = No changes (brand not abbreviated)');
console.log('═'.repeat(75));
