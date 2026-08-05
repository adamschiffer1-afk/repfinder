# CSV Import Instructions

## Overview
This script imports products from Weidian CSV export files into your RepFinder database.

## Features
- ✅ Reads CSV files exported from Weidian shop panel
- ✅ Decodes abbreviated brand names (e.g., `S.t.u.s.s.y` → `Stussy`)
- ✅ Converts CNY prices to USD (×0.14)
- ✅ Auto-detects product categories
- ✅ Creates Kakobuy affiliate links
- ✅ Prevents duplicates
- ✅ Supports 773+ products

## Setup

### 1. Place CSV File
Put your CSV export file in the project root directory:
```
web/se1-itemexport-1679502043-20260610000353.csv
```

### 2. CSV Format
Expected format (comma-separated):
```
商品ID,商品标题,商品编码,商品类型,商品价格,商品链接
7772191785,S.t.u.s.s.y hoodie,ABC123,正常款,298,https://...
```

### 3. Run Import
```bash
node import_from_csv.js
```

## Brand Name Decoding

The script automatically decodes abbreviated brand names commonly used in Weidian to avoid copyright issues:

| Abbreviated | Decoded |
|-------------|---------|
| S.t.u.s.s.y | Stussy |
| R.a.l.p.h Lauren | Ralph Lauren |
| N.K | Nike |
| J.o.r.d.a.n | Jordan |
| D**K | Dunk |
| b.b | Burberry |
| C.P | CP Company |
| S.t.o.n.e | Stone Island |
| B.a.l.e.n.c.i.a.g.a | Balenciaga |
| G.u.c.c.i | Gucci |
| L.V | Louis Vuitton |
| D.i.o.r | Dior |
| P.r.a.d.a | Prada |
| A.d.i.d.a.s | Adidas |
| N.B | New Balance |
| T.N.F | The North Face |
| S.u.p.r.e.m.e | Supreme |
| C.a.r.h.a.r.t.t | Carhartt |
| T.r.a.p.s.t.a.r | Trapstar |
| E.s.s.e.n.t.i.a.l.s | Essentials |
| M.o.n.c.l.e.r | Moncler |
| C.a.n.a.d.a Goose | Canada Goose |
| Y.e.e.z.y | Yeezy |

And many more...

## Category Detection

Categories are automatically detected from product names:
- **shoes**: sneakers, jordans, dunks, runners, boots
- **hoodies**: hoodies, sweatshirts, pullovers
- **t-shirts**: shirts, tees, polos, jerseys
- **pants**: pants, jeans, cargo, joggers, trousers
- **shorts**: shorts (excluding "short sleeve")
- **jackets**: jackets, coats, puffers, bombers, parkas
- **sets**: sets, suits, tracksuits
- **accessories**: bags, hats, caps, wallets, belts
- **sweaters**: sweaters, cardigans, knit items
- **clothing**: default for unmatched items

## Price Conversion

Prices are automatically converted from CNY to USD:
- **Formula**: `USD = CNY × 0.14`
- **Example**: 298 CNY → $41.72 USD

## Affiliate Links

All products get Kakobuy affiliate links with your code:
```
https://www.kakobuy.com/item/details?url=https%3A%2F%2Fweidian.com%2Fitem.html%3FitemID%3D7772191785&affcode=xfrostyy
```

## Output

The script shows progress for each product:
```
[1/773] Processing: "Stussy hoodie"
   ✅ Added: $41.72 | hoodies | 🔧 decoded

[2/773] Processing: "Ralph Lauren cardigan"
   ✅ Added: $35.00 | sweaters | 🔧 decoded

[3/773] Processing: "Nike Jordan 1"
   ⏭️  Already exists
```

Final summary:
```
============================================================
✅ Successfully added: 750
⏭️  Skipped (already exist): 20
❌ Failed: 3
============================================================
```

## Notes

### Product Images
- Images are set to placeholder by default
- Update images manually in admin panel, or
- Add image scraping logic to the script

### Duplicate Detection
Products are considered duplicates if:
- Same item ID in the Kakobuy link, OR
- Exact same product name

### Error Handling
- Invalid CSV lines are skipped with warnings
- Products with 0 price are skipped
- Database errors are logged but don't stop import

## Troubleshooting

### "CSV file not found"
Make sure the CSV file is in the project root:
```bash
ls -la se1-itemexport-*.csv
```

### "Failed to parse CSV"
Check that your CSV uses the expected format (comma-separated, 6 fields per line)

### Database connection errors
Verify `.env.local` has correct `MONGODB_URI`

### Duplicates not detected
The script checks both item ID and product name. If you renamed products, they might be re-imported.

## Customization

### Change affiliate code
Edit line 8:
```javascript
const AFFILIATE_CODE = 'xfrostyy';
```

### Change CNY to USD rate
Edit the conversion in `parseCSV()` function (currently 0.14)

### Add more brand decodings
Add to `BRAND_DECODE_MAP` object (line 24-140)

### Modify category detection
Edit `detectCategory()` function (line 153-217)
