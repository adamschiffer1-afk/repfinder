# 🛠️ RepFinder Tools

Zestaw narzędzi CLI do zarządzania produktami w RepFinder.

## 🚀 Quick Add - Szybkie dodawanie produktów

Najszybszy sposób na dodanie pojedynczego produktu do bazy.

### Użycie

```bash
node tools/quick_add.mjs "Nazwa produktu" "Link Weidian" [kategoria]
```

### Przykłady

**Automatyczna kategoria:**
```bash
node tools/quick_add.mjs "Nike Hoodie" "https://weidian.com/item.html?itemID=7507616560"
node tools/quick_add.mjs "Amiri Jeans" "https://weidian.com/item.html?itemID=7504513787"
```

**Ręczna kategoria:**
```bash
node tools/quick_add.mjs "Nike Hoodie" "https://weidian.com/item.html?itemID=7507616560" hoodies
node tools/quick_add.mjs "Custom Bag" "https://weidian.com/item.html?itemID=123456" bags
```

### Dostępne kategorie

| Kategoria | Opis |
|-----------|------|
| `shoes` | Buty |
| `hoodies` | Bluzy z kapturem, sweatshirty |
| `t-shirts` | Koszulki |
| `pants` | Spodnie, jeansy |
| `shorts` | Szorty |
| `jackets` | Kurtki |
| `sets` | Zestawy, dresy |
| `bags` | Torby, plecaki |
| `accessories` | Akcesoria |

### Co robi?

- ✅ Scrapuje cenę i zdjęcie z Weidian
- ✅ Automatycznie wykrywa kategorię (lub używa podanej)
- ✅ Sprawdza duplikaty
- ✅ Tworzy unikatowy slug
- ✅ Dodaje affiliate link KakoBuy

---

## 📦 Import From Sheets - Bulk import

Import wielu produktów z pliku CSV lub Google Sheets.

### Użycie

1. Utwórz plik CSV z produktami:
```csv
产品名称,微店链接,商品ID
Nike Hoodie,https://weidian.com/item.html?itemID=123456,123456
Amiri Jeans,https://weidian.com/item.html?itemID=789012,789012
```

2. Uruchom import:
```bash
node tools/import_from_sheets.mjs
```

### Konfiguracja

Edytuj w pliku `import_from_sheets.mjs`:
- `CSV_FILE` - nazwa pliku CSV do importu
- `BATCH_SIZE` - ile produktów przetwarzać naraz (domyślnie: 15)
- `REQUEST_DELAY` - opóźnienie między requestami w ms (domyślnie: 1500)

---

## 🔍 Utility Scripts

### Check Pinned Products

Sprawdza które produkty są przypięte (Popular Products):

```bash
node tools/check_pinned.mjs
```

### Count Products

Liczy produkty według kategorii:

```bash
node tools/count_jackets.mjs  # Kurtki
# lub dodaj własny skrypt dla innych kategorii
```

### Reset Pinned

Resetuje wszystkie przypięte produkty:

```bash
node tools/reset_pinned.mjs
```

---

## 📝 Notatki

- Wszystkie skrypty wymagają pliku `.env.local` z kluczami Supabase
- SSL certificate errors są pomijane w development (NODE_TLS_REJECT_UNAUTHORIZED=0)
- Affiliate code: `xfrostyy`
- Ceny są automatycznie konwertowane z CNY na USD (0.14x)

---

## 🐛 Troubleshooting

**Błąd: "Unable to verify certificate"**
- Dodaj `NODE_TLS_REJECT_UNAUTHORIZED=0` do `.env.local`

**Błąd: "Product already exists"**
- Produkt z tym itemID już jest w bazie
- Sprawdź duplikaty: `node tools/check_missing_jackets.mjs`

**Timeout podczas importu**
- Zwiększ `BATCH_SIZE` w skrypcie
- Dodaj większe opóźnienia (`REQUEST_DELAY`)
- Importuj mniejszymi paczkami

---

Made with ❤️ for RepFinder
