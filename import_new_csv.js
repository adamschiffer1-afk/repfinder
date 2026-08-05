// Script to delete unpinned products and import new ones from CSV
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI;
const AFFILIATE_CODE = 'xfrostyy';
const CSV_FILE = 'se1-itemexport-1653718259-20260619220330.csv';

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
  qcImages: { type: [Object], default: [] },
  slug: { type: String, unique: true, sparse: true },
  itemId: { type: String, unique: true, sparse: true }
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// BRAND MAP — corrected per BRAND_MAPPING_ANALYSIS.md + BRAND_MAP_FIXES.js
const BRAND_MAP = {
  // ── Long / full dotted names first (must come before short codes) ──
  'N.i.k.e x S.t.u.s.s.y': 'Nike x Stussy',
  'B.o.t.t.e.g.a V.e.n.e.t.a': 'Bottega Veneta',
  'G.i.u.s.e.p.p.e z.a.n.o.t.t.i': 'Giuseppe Zanotti',
  'C.h.r.o.m.e H.e.a.r.t.s': 'Chrome Hearts', 'C.h.r.o.m.e Hearts': 'Chrome Hearts',
  'S.a.i.n.t Laurent': 'Saint Laurent',
  'R.a.l.p.h Lauren': 'Ralph Lauren',
  'C.a.n.a.d.a Goose': 'Canada Goose',
  'N.o.r.t.h Face': 'The North Face',
  'P.a.t.e.k Philippe': 'Patek Philippe',
  'A.u.d.e.m.a.r.s P.i.g.u.e.t': 'Audemars Piguet',
  'R.i.c.h.a.r.d M.i.l.l.e': 'Richard Mille',
  'U.n.d.e.r Armour': 'Under Armour',
  'H.e.l.l S.t.a.r': 'Hellstar',
  'B a l e n c i a g a': 'Balenciaga',
  // ── Full dotted brand names ──
  'N.i.k.e': 'Nike', 'N.I.K.E': 'Nike',
  'J.o.r.d.a.n': 'Jordan', 'j.o.r.d.a.n': 'Jordan',
  'S.t.u.s.s.y': 'Stussy', 's.t.u.s.s.y': 'Stussy',
  'R.a.l.p.h': 'Ralph Lauren', 'r.a.l.p.h': 'Ralph Lauren',
  'B.u.r.b.e.r.r.y': 'Burberry',
  'D.i.o.r': 'Dior', 'd.i.o.r': 'Dior',
  'G.u.c.c.i': 'Gucci', 'g.u.c.c.i': 'Gucci',
  'P.r.a.d.a': 'Prada', 'p.r.a.d.a': 'Prada',
  'B.a.l.e.n.c.i.a.g.a': 'Balenciaga',
  'C.h.a.n.e.l': 'Chanel', 'C.H.A.N.E.L': 'Chanel',
  'V.e.r.s.a.c.e': 'Versace',
  'V.a.l.e.n.t.i.n.o': 'Valentino',
  'G.i.v.e.n.c.h.y': 'Givenchy',
  'F.e.n.d.i': 'Fendi',
  'C.e.l.i.n.e': 'Celine',
  'H.e.r.m.e.s': 'Hermes',
  'M.a.r.g.i.e.l.a': 'Maison Margiela',
  'M.o.n.c.l.e.r': 'Moncler', 'm.o.n.c.l.e.r': 'Moncler',
  'S.t.o.n.e Island': 'Stone Island',
  'E.s.s.e.n.t.i.a.l.s': 'Essentials', 'e.s.s.e.n.t.i.a.l.s': 'Essentials',
  'T.r.a.p.s.t.a.r': 'Trapstar', 't.r.a.p.s.t.a.r': 'Trapstar',
  'C.a.r.h.a.r.t.t': 'Carhartt', 'c.a.r.h.a.r.t.t': 'Carhartt', 'C.a.r.h.a.r.t': 'Carhartt',
  'S.u.p.r.e.m.e': 'Supreme', 's.u.p.r.e.m.e': 'Supreme',
  'A.d.i.d.a.s': 'Adidas', 'a.d.i.d.a.s': 'Adidas',
  'Y.e.e.z.y': 'Yeezy', 'y.e.e.z.y': 'Yeezy',
  'C.o.n.v.e.r.s.e': 'Converse', 'c.o.n.v.e.r.s.e': 'Converse',
  'V.a.n.s': 'Vans', 'v.a.n.s': 'Vans',
  'U.G.G': 'UGG', 'u.g.g': 'UGG', 'U.g.g': 'UGG',
  'R.o.l.e.x': 'Rolex',
  'C.a.r.t.i.e.r': 'Cartier',
  'C.a.s.i.o': 'Casio',
  'B.i.r.k.e.n.s.t.o.c.k.s': 'Birkenstock', 'Birkenstock': 'Birkenstock',
  'D.y.s.o.n': 'Dyson',
  'A.p.p.l.e': 'Apple',
  'L.E.G.O': 'LEGO',
  'L.a.b.u.b.u': 'Labubu',
  'U.n.i.q.l.o': 'Uniqlo', 'u.n.i.q.l.o': 'Uniqlo',
  'M.i.u.m.i.u': 'Miu Miu', 'm.i.u.m.i.u': 'Miu Miu',
  'I.c.e cream': 'Ice Cream',
  'R.a.y-B.a.n': 'Ray-Ban',
  'm.a.s.c.o.t': 'Mascot', 'M.a.s.c.o.t': 'Mascot',
  'G.o.t.h.i.c': 'Gothic',
  'C.r.o.c.o.d.i.l.e': 'Crocodile',
  'G.o.y.a.d': 'Goyard',
  'P.a.n.d.o.r.a': 'Pandora',
  'A.S.I.C.S': 'ASICS',
  'M.c.Q.u.e.e.n': 'McQueen', 'M.C.Q.U.E.E.N': 'McQueen', 'm.c.q.u.e.e.n': 'McQueen',
  'N.i.k.e x S.t.u.s.s.y': 'Nike x Stussy',
  'B.o.t.t.e.g.a': 'Bottega Veneta',
  'V.E.J.A': 'Veja',
  'C.A.R.R.ERA': 'Carrera',
  'E.m.p.e.r.o.r': 'Emperor',
  'A.n.g.e.l': 'Palm Angels',
  'K.a.p.o.k': 'Kapok',
  'N.a.i.l': 'Nail',
  'l.a.c.o.s.t.e': 'Lacoste',
  't.o.r.o.m': 'Torom', 'T.O.R.O.M': 'Torom',
  'c.a.s.a': 'Casa',
  's.a.i': 'Saint Laurent', // short fallback
  // ── CORRECTED short codes (per BRAND_MAPPING_ANALYSIS.md) ──
  // m.k.l was incorrectly Michael Kors → Moncler
  'm.k.l': 'Moncler', 'M.K.L': 'Moncler',
  // m.l.b was incorrectly NYC → MLB
  'm.l.b': 'MLB', 'M.L.B': 'MLB',
  // p.l.d was incorrectly Prada → Polo Ralph Lauren
  'p.l.d': 'Polo Ralph Lauren', 'P.L.D': 'Polo Ralph Lauren',
  // a.m.e was incorrectly Amiri → AMI Paris
  'a.m.e': 'AMI Paris', 'A.M.E': 'AMI Paris',
  // a.m.n was incorrectly Amina Muaddi → Amiri
  'a.m.n': 'Amiri', 'A.M.N': 'Amiri',
  // a.m.s was incorrectly AMS → Alexander McQueen
  'a.m.s': 'Alexander McQueen', 'A.M.S': 'Alexander McQueen',
  // b.r.o was incorrectly BRO → Broken Planet
  'b.r.o': 'Broken Planet', 'B.R.O': 'Broken Planet',
  // k.h.t was incorrectly Carhartt → Kith
  'k.h.t': 'Kith', 'K.H.T': 'Kith',
  // ── 3-letter short codes ──
  'b.b.l': 'Burberry', 'B.B.L': 'Burberry',
  'k.l.x': 'Chrome Hearts', 'K.L.X': 'Chrome Hearts', 'klx': 'Chrome Hearts', 'KLX': 'Chrome Hearts',
  'l.b.t': 'Louboutin', 'L.B.T': 'Louboutin',
  'm.j.l': 'Marc Jacobs', 'M.J.L': 'Marc Jacobs',
  'm.m.h': 'MMH', 'M.M.H': 'MMH',
  'm.o.n': 'Moncler', 'M.O.N': 'Moncler',
  'o.l.o': 'Polo', 'O.L.O': 'Polo',
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
  'l.a.n': 'Lanvin', 'L.A.N': 'Lanvin',
  'a.m.i': 'Ami Paris', 'A.M.I': 'Ami Paris',
  'a.m.r': 'Amiri', 'A.M.R': 'Amiri',
  'a.m.d': 'Under Armour', 'A.M.D': 'Under Armour',
  'a.l.o': 'Alo Yoga', 'A.L.O': 'Alo Yoga',
  'a.k.m': 'AKM', 'A.K.M': 'AKM',
  'b.d.j': 'BDJ', 'B.D.J': 'BDJ',
  'b.e.m': 'BEM', 'B.E.M': 'BEM',
  'c.o.r': 'Corteiz', 'C.O.R': 'Corteiz',
  'C.o.r.t.e.i.z': 'Corteiz',
  'e.r.d': 'ERD', 'E.R.D': 'ERD',
  'e.m.d': 'EMD', 'E.M.D': 'EMD',
  'g.a.p': 'Gap', 'G.A.P': 'Gap',
  'g.i.v': 'Givenchy', 'G.I.V': 'Givenchy',
  'k.d.y': 'Cartier', 'K.D.Y': 'Cartier',
  's.t.d': 'Stussy', 'S.T.D': 'Stussy',
  'a.n.g.e.l': 'Palm Angels', 'A.N.G.E.L': 'Palm Angels',
  'Sp 5': 'Spider', 'sp 5': 'Spider', 'Sp5der': 'Spider', 'sp5der': 'Spider',
  'b.o.o.s': 'Boss', 'B.O.O.S': 'Boss',
  'c.a.r.g.o': 'Cargo', 'C.A.R.G.O': 'Cargo',
  'f.l.e': 'Fleece', 'F.L.E': 'Fleece',
  // Jordan / Air Jordan variants
  'A.J.6': 'Air Jordan 6', 'a.j.6': 'Air Jordan 6',
  'A.J.3': 'Jordan 3', 'a.j.3': 'Jordan 3',
  'J.1': 'Jordan 1', 'j.1': 'Jordan 1',
  'Jordan 3 Series': 'Jordan 3',
  // Yeezy variants
  'y.z 450': 'Yeezy 450', 'y.z 700': 'Yeezy 700', 'y.z 380': 'Yeezy 380',
  'Yz.3.5.0': 'Yeezy 350', 'yz.3.5.0': 'Yeezy 350',
  'Yz.5.0.0': 'Yeezy 500', 'yz.5.0.0': 'Yeezy 500',
  // ── 2-letter short codes ──
  'n.k': 'Nike', 'N.K': 'Nike', 'N.k': 'Nike',
  'y.z': 'Yeezy', 'Y.Z': 'Yeezy',
  'L.V': 'Louis Vuitton', 'l.v': 'Louis Vuitton', 'L.v': 'Louis Vuitton',
  'Z.A.R.A': 'ZARA',
  'r.l': 'Ralph Lauren', 'R.L': 'Ralph Lauren',
  's.p': 'Supreme', 'S.P': 'Supreme',
  'b.l': 'Balenciaga', 'B.L': 'Balenciaga',
  'b.m': 'The North Face', 'B.M': 'The North Face',
  'c.k': 'Calvin Klein', 'C.K': 'Calvin Klein',
  'd.r': 'Dior', 'D.R': 'Dior',
  'h.l': 'Hugo Boss', 'H.L': 'Hugo Boss',
  'b.b': 'Burberry', 'B.B': 'Burberry',
  'b.p': 'Bape', 'B.P': 'Bape',
  'm.m': 'Maison Margiela', 'M.M': 'Maison Margiela',
  'g.c': 'Gucci', 'G.C': 'Gucci',
  'e.s': 'Essentials', 'E.S': 'Essentials',
  'o.w': 'Off White', 'O.W': 'Off White',
  'd.e': 'Diesel', 'D.E': 'Diesel',
  'j.a': 'JA', 'J.A': 'JA',
  't.m': 'Tommy Hilfiger', 'T.M': 'Tommy Hilfiger',
  's.z': 'Maison Margiela', 'S.Z': 'Maison Margiela',
  'o.n': 'On Running', 'O.N': 'On Running',
  'f.d': 'Fendi', 'F.D': 'Fendi', 'fd': 'Fendi',
  'u.g': 'UGG', 'U.G': 'UGG',
  's.l': 'Saint Laurent', 'S.L': 'Saint Laurent',
  'd.q': 'Dsquared2', 'D.Q': 'Dsquared2',
  'd.s': 'Dsquared2', 'D.S': 'Dsquared2',
  'm.k': 'Michael Kors', 'M.K': 'Michael Kors',
  'a.p': 'Audemars Piguet', 'A.P': 'Audemars Piguet',
  'a.x': 'Armani Exchange', 'A.X': 'Armani Exchange',
  'a.d': 'Adidas', 'A.D': 'Adidas',
  'g.y': 'Goyard', 'G.Y': 'Goyard',
  'c.p': 'CP Company', 'C.P': 'CP Company',
  'c.b': 'CB', 'C.B': 'CB',
  'k.c': 'Kate Spade', 'K.C': 'Kate Spade',
  'k.s': 'KS', 'K.S': 'KS',
  'a.s': 'Acne Studios', 'A.S': 'Acne Studios',
  'u.u': 'Uniqlo', 'U.U': 'Uniqlo',
  'p.u': 'Purple Brand', 'P.U': 'Purple Brand',
  'p.p': 'PP', 'P.P': 'PP',
  't.b.l': 'Timberland', 'T.B.L': 'Timberland',
  'l.g': 'LEGO', 'L.G': 'LEGO',
  'k.w': 'Converse', 'K.W': 'Converse',
  'q.d': 'QD', 'Q.D': 'QD',
  'd.g': 'Dolce Gabbana', 'D.G': 'Dolce Gabbana',
  'g.u': 'Gucci', 'G.U': 'Gucci',
  'u.s': 'US', 'U.S': 'US',
  'u.n': 'Uniqlo', 'U.N': 'Uniqlo',
  'g.d': 'GD', 'G.D': 'GD',
  's.c': 'SC', 'S.C': 'SC',
  'd.p': 'DP', 'D.P': 'DP',
  'e.y': 'EY', 'E.Y': 'EY',
  'z.c': 'Zegna', 'Z.C': 'Zegna',
  'y.h': 'YH', 'Y.H': 'YH',
  'a.a': 'AA', 'A.A': 'AA',
  'b.x': 'BX', 'B.X': 'BX',
  't.e': 'Tiffany', 'T.E': 'Tiffany',
  't.a': 'TA', 'T.A': 'TA',
  'h.o': 'HO', 'H.O': 'HO',
  'c.d': 'Christian Dior', 'C.D': 'Christian Dior',
  's.k': 'Seiko', 'S.K': 'Seiko',
  'v.a': 'VA', 'V.A': 'VA',
  'a.r': 'AR', 'A.R': 'AR',
  't.u': 'TU', 'T.U': 'TU',
  'b.o.n.e': 'Bone',
  'v.i': 'VI', 'V.I': 'VI',
  'b.l.s.j': 'BLSJ',
  'T.K': 'TK', 't.k': 'TK',
  'g.e.r': 'GER', 'G.E.R': 'GER',
  'd.y': 'DY', 'D.Y': 'DY',
  'z.y': 'ZY', 'Z.Y': 'ZY',
  'a.f': 'AF', 'A.F': 'AF',
  'l.o.n': 'Longines',
  'c.j.b.l': 'Casablanca',
  'm.s.n.k': 'Mastermind Japan',
  // Syna World
  's.y': 'Syna World', 'S.Y': 'Syna World',
  // h alone = Broken Planet
  'h': 'Broken Planet', 'H': 'Broken Planet',
  // Special
  'D**K': 'Dunk', 'd**k': 'Dunk',
};

function decodeBrandName(name) {
  let decoded = name;
  const sortedEntries = Object.entries(BRAND_MAP).sort((a, b) => b[0].length - a[0].length);
  
  for (const [abbrev, full] of sortedEntries) {
    const escapedAbbrev = abbrev.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('(?:^|\\s)(' + escapedAbbrev + ')(?=\\s|$)', 'gi');
    decoded = decoded.replace(regex, (match, p1) => {
      return match.replace(p1, full);
    });
  }
  
  decoded = decoded.replace(/[\u4e00-\u9fa5]/g, '');
  decoded = decoded.replace(/\b([A-Z]\.){2,}[A-Z]\b/g, (match) => match.replace(/\./g, ''));
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
  decoded = decoded.replace(/\b\w/g, char => char.toUpperCase());
  decoded = decoded.replace(/\s+/g, ' ').trim();
  
  return decoded;
}

function detectCategory(name) {
  const n = name.toLowerCase();
  if (n.includes('shoe') || n.includes('sneaker') || n.includes('jordan') || n.includes('dunk') || n.includes('nike') || n.includes('adidas') || n.includes('yeezy') || n.includes('boot') || n.includes('runner') || n.includes('trainer') || n.includes('loafer') || n.includes('slide') || n.includes('sandal') || n.includes('aj') || n.includes('air force') || n.includes('air max') || n.includes('new balance') || n.includes('vans') || n.includes('converse') || n.includes('鞋子')) return 'shoes';
  if (n.includes('hoodie') || n.includes('sweatshirt') || n.includes('pullover')) return 'hoodies';
  if (n.includes('pants') || n.includes('jeans') || n.includes('cargo') || n.includes('jogger') || n.includes('trouser') || n.includes('sweatpants')) return 'pants';
  if (n.includes('short') && !n.includes('short sleeve')) return 'shorts';
  if (n.includes('jacket') || n.includes('coat') || n.includes('puffer') || n.includes('bomber') || n.includes('windbreaker') || n.includes('parka') || n.includes('blazer')) return 'jackets';
  if (n.includes('set') || n.includes('suit') || n.includes('tracksuit') || (n.includes('top') && n.includes('bottom'))) return 'sets';
  if (n.includes('shirt') || n.includes('tee') || n.includes('polo') || n.includes('t-shirt') || n.includes('jersey')) return 't-shirts';
  if (n.includes('bag') || n.includes('backpack') || n.includes('hat') || n.includes('cap') || n.includes('beanie') || n.includes('wallet') || n.includes('belt') || n.includes('scarf') || n.includes('glove') || n.includes('sock') || n.includes('watch') || n.includes('glasses') || n.includes('sunglasses') || n.includes('jewelry') || n.includes('necklace') || n.includes('bracelet')) return 'accessories';
  if (n.includes('sweater') || n.includes('cardigan') || n.includes('knit')) return 'sweaters';
  return 'clothing';
}

async function scrapeImageFromWeidian(itemId) {
  try {
    const url = `https://weidian.com/item.html?itemID=${itemId}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Referer': 'https://weidian.com/'
      },
      timeout: 8000
    });
    const $ = cheerio.load(response.data);
    const scriptTag = $('#__rocker-render-inject__');
    if (scriptTag.length === 0) return null;
    const dataObj = JSON.parse(scriptTag.attr('data-obj'));
    const itemInfo = dataObj?.result?.default_model?.item_info;
    if (!itemInfo) return null;
    let img = itemInfo.item_head || '';
    if (img) {
      if (img.startsWith('//')) img = `https:${img}`;
      else if (!img.startsWith('http')) img = `https://${img}`;
      if (!img.includes('?')) img = `${img}?w=400&h=400`;
    }
    return img || null;
  } catch (error) {
    return null;
  }
}

function parseCSV(content) {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  if (lines.length === 0) throw new Error('CSV file is empty');
  
  const firstLine = lines[0];
  const hasHeader = firstLine.includes('商品ID') || firstLine.includes('商品标题');
  const dataLines = hasHeader ? lines.slice(1) : lines;
  
  const products = [];
  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
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
    
    let itemId, title, priceStr, link;
    if (fields.length === 5) {
      [itemId, title, , priceStr, link] = fields;
    } else {
      [itemId, title, , , priceStr, link] = fields;
    }
    
    const priceCNY = parseFloat(priceStr) || 0;
    const priceUSD = parseFloat((priceCNY * 0.14).toFixed(2));
    if (priceUSD === 0) continue;
    const decodedName = decodeBrandName(title);
    products.push({
      itemId: itemId.trim(),
      name: decodedName,
      originalName: title,
      price: priceUSD,
      priceCNY,
      link: link.trim()
    });
  }
  return products;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  if (!fs.existsSync(CSV_FILE)) {
    console.log(`❌ CSV file "${CSV_FILE}" not found!`);
    process.exit(1);
  }
  
  console.log(`📋 Reading CSV file: ${CSV_FILE}`);
  const content = fs.readFileSync(CSV_FILE, 'utf-8');
  let newProductsList;
  try {
    newProductsList = parseCSV(content);
  } catch (error) {
    console.log(`❌ Failed to parse CSV: ${error.message}`);
    process.exit(1);
  }
  console.log(`✅ Parsed ${newProductsList.length} products from CSV\n`);

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  // Step 1: Backup current products to scratch folder
  const backupPath = path.join(__dirname, 'scratch', 'backup_products_before_import.json');
  const allProducts = await Product.find({});
  console.log(`📦 Backing up ${allProducts.length} existing products...`);
  
  if (!fs.existsSync(path.dirname(backupPath))) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  }
  fs.writeFileSync(backupPath, JSON.stringify(allProducts, null, 2), 'utf-8');
  console.log(`💾 Backup saved to ${backupPath}\n`);

  // Step 2: Build a map of existing images to speed up import and avoid Weidian scraping rate limits
  const imageMap = new Map();
  allProducts.forEach(p => {
    if (p.itemId && p.image && !p.image.includes('placeholder')) {
      imageMap.set(p.itemId, p.image);
    }
    if (p.link && p.image && !p.image.includes('placeholder')) {
      imageMap.set(p.link, p.image);
    }
  });
  console.log(`🖼️  Prepared image map with ${imageMap.size} unique image entries for reuse.\n`);

  // Step 3: Find and keep pinned products
  const pinnedProducts = allProducts.filter(p => p.isPinned);
  console.log(`📌 Found ${pinnedProducts.length} pinned products (these will be preserved).`);
  pinnedProducts.forEach((p, idx) => {
    console.log(`   ${idx + 1}. ${p.name} (Pinned Order: ${p.pinnedOrder})`);
  });

  // Step 4: Delete all unpinned products
  console.log('\n🗑️ Deleting all unpinned products...');
  const deleteResult = await Product.deleteMany({
    $or: [{ isPinned: false }, { isPinned: { $exists: false } }]
  });
  console.log(`✅ Deleted ${deleteResult.deletedCount} unpinned products.\n`);

  // Step 5: Import new products
  let addedCount = 0;
  let skippedCount = 0;
  let reusedImageCount = 0;
  let scrapedImageCount = 0;
  let failedScrapeCount = 0;

  // Set of already existing items to avoid double addition (e.g. if a pinned product is in the CSV)
  const existingItemIds = new Set(pinnedProducts.map(p => p.itemId).filter(Boolean));
  const existingLinks = new Set(pinnedProducts.map(p => p.link).filter(Boolean));

  for (let i = 0; i < newProductsList.length; i++) {
    const prod = newProductsList[i];
    const cleanUrl = `https://weidian.com/item.html?itemID=${prod.itemId}`;
    const affLink = `https://www.kakobuy.com/item/details?url=${encodeURIComponent(cleanUrl)}&affcode=${AFFILIATE_CODE}`;

    // Skip if it's already present in pinned products
    if (existingItemIds.has(prod.itemId) || existingLinks.has(affLink)) {
      console.log(`[${i + 1}/${newProductsList.length}] ⏭️ Skipping "${prod.name}" (already exists as pinned product)`);
      skippedCount++;
      continue;
    }

    console.log(`[${i + 1}/${newProductsList.length}] Processing: "${prod.name}"`);

    // Image resolution: check reuse map first
    let imageUrl = null;
    if (imageMap.has(prod.itemId)) {
      imageUrl = imageMap.get(prod.itemId);
      reusedImageCount++;
    } else if (imageMap.has(affLink)) {
      imageUrl = imageMap.get(affLink);
      reusedImageCount++;
    }

    // If not found in reuse map, scrape Weidian
    if (!imageUrl) {
      imageUrl = await scrapeImageFromWeidian(prod.itemId);
      await sleep(250); // delay to respect Weidian rate limits
      if (imageUrl) {
        scrapedImageCount++;
      } else {
        imageUrl = 'https://via.placeholder.com/400x400?text=Product';
        failedScrapeCount++;
      }
    }

    const category = detectCategory(prod.name);

    const productData = {
      name: prod.name,
      price: prod.price,
      image: imageUrl,
      category: category,
      batch: 'best',
      link: affLink,
      clicks: 0,
      isPinned: false,
      itemId: prod.itemId
    };

    try {
      await Product.create(productData);
      console.log(`   ✅ Added: $${prod.price} | ${category} | ${imageMap.has(prod.itemId) ? '🔄 Reused image' : '🌐 Scraped image'}`);
      addedCount++;
    } catch (error) {
      console.error(`   ❌ DB Error for "${prod.name}": ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 IMPORT SUMMARY:');
  console.log(`📌 Pinned products preserved: ${pinnedProducts.length}`);
  console.log(`🗑️ Unpinned products deleted: ${deleteResult.deletedCount}`);
  console.log(`✅ New products successfully added: ${addedCount}`);
  console.log(`⏭️ Products skipped (already pinned): ${skippedCount}`);
  console.log(`🖼️ Images reused from existing db: ${reusedImageCount}`);
  console.log(`🌐 Images scraped successfully from Weidian: ${scrapedImageCount}`);
  console.log(`⚠️ Failed image scrapes (fallback to placeholder): ${failedScrapeCount}`);
  console.log('='.repeat(60));

  await mongoose.connection.close();
  console.log('\n👋 Disconnected from MongoDB. Script finished successfully.');
}

run().catch(err => {
  console.error('❌ Critical error:', err);
  process.exit(1);
});
