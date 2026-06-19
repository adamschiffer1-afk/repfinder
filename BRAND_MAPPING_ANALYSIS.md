# Brand Mapping Analysis

## Summary
- **Total products in CSV:** 1,250
- **Already in database:** 697 (56%)
- **Missing from database:** 553 (44%)

## Issues Found

### 1. Incorrect Regex Matching
The current `decodeBrandName()` function uses `\b` word boundaries which don't work correctly with dots.

**Problem:** Brand codes like `a.s` match inside longer codes like `m.a.s.c.o.t`

**Examples:**
- `m.a.s.c.o.t sweater` → `M.Acne Studios.C.O.T Sweater` ❌
- `L.V s.k.a.t.e.b.o.a.r.d shoes` → `Louis Vuitton Seiko.A.T.E.B.O.A.R.D Shoes` ❌

**Solution:** Use `(?:^|\s)(code)(?=\s|$)` pattern instead of `\b(code)\b`

### 2. Incorrect Brand Mappings in BRAND_MAP

| Code | Current Mapping | Should Be |
|------|----------------|-----------|
| `m.k.l` | Michael Kors | **Moncler** |
| `m.l.b` | NYC | **MLB** |
| `p.l.d` | Prada | **Polo Ralph Lauren** |
| `a.m.e` | Amiri | **AMI** |
| `a.m.n` | Amina Muaddi | **Amiri** |
| `a.m.s` | AMS | **Alexander McQueen** |
| `b.r.o` | BRO | **Broken Planet** |
| `k.h.t` | Carhartt | **Kith** |

### 3. Missing Brand Codes

These brands appear frequently in the missing products but aren't in BRAND_MAP:

| Code | Brand Name | Frequency |
|------|------------|-----------|
| `m.a.s.c.o.t` | Mascot | 2 |
| `s.k.a.t.e.b.o.a.r.d` | Skateboard | Multiple |
| `s.k.a.t.e.s` | Skates | Multiple |
| `p.a.n.t.a.l.o.n` | Pantalon (Pants) | Multiple |
| `N.i.k.e` | Nike | 2 |
| `N.I.K.E` | Nike | 2 |
| `M.a.r.g.i.e.l.a` | Maison Margiela | 3 |
| `D.i.o.r` | Dior | 3 |
| `M.o.n.c.l.e.r` | Moncler | Multiple |
| `S.t.u.s.s.y` | Stussy | Multiple |
| `m.i.u.m.i.u` | Miu Miu | 1 |
| `u.g.g` | UGG | 1 |
| `C.o.r.t.e.i.z` | Corteiz | Multiple |
| `l.a.c.o.s.t.e` | Lacoste | 1 |
| `V.E.J.A` | Veja | 1 |
| `E.S.S` | Essentials | 2 |
| `A.n.g.e.l` | Palm Angels | 1 |
| `t.o.r.o.m` | Torom | 1 |
| `E.m.p.e.r.o.r` | Emperor | 1 |
| `R.a.c.i.n.g` | Racing | 1 |
| `H.e.l.l S.t.a.r` | Hellstar | 1 |
| `g.i.u.s.e.p.p.e z.a.n.o.t.t.i` | Giuseppe Zanotti | 1 |
| `B.o.t.t.e.g.a` | Bottega Veneta | 1 |
| `A.m.e.r.i.c.a.n` | American | 1 |
| `K.a.p.o.k` | Kapok | 1 |
| `N.a.i.l` | Nail | 1 |
| `f.l.e` | Fleece | 1 |
| `c.a.r.g.o` | Cargo | 1 |

### 4. Product Type Translations Needed

Add these to the `decodeBrandName()` function:

```javascript
decoded = decoded.replace(/\bshort[- ]sleeved\b/gi, 'T-shirt');
decoded = decoded.replace(/\bzipper sweatshirt\b/gi, 'Zip Hoodie');
decoded = decoded.replace(/\bzip-up hoodie\b/gi, 'Zip Hoodie');
decoded = decoded.replace(/\bbaseball cap\b/gi, 'Hat');
decoded = decoded.replace(/\bwool cardigan\b/gi, 'Cardigan');
```

## Recommended Actions

1. ✅ **Fix the regex pattern** (DONE) - Updated `decodeBrandName()` to use correct boundaries
2. ❌ **Update BRAND_MAP** - Need to add missing codes and fix incorrect ones
3. ❌ **Re-run check_missing_products.js** - Verify the fixes work correctly
4. ❌ **Import missing products** - Run `import_from_csv.js` to add the 553 missing products

## Next Steps

Run this command to import all missing products:
```bash
node import_from_csv.js
```

This will:
- Parse the CSV file
- Decode brand names correctly (with fixed regex)
- Scrape product images from Weidian
- Add products to the database with correct categories
- Skip products that already exist (by itemID)
