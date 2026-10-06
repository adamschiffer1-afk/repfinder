# 📋 Instrukcja: Jak dodać 30 produktów "popular" jako przypięte

## Problem
Mamy problem z połączeniem do Supabase przez skrypty Node.js (błąd "Invalid API key"). 
Najprostsza metoda to użycie panelu admina w przeglądarce.

## Rozwiązanie: Panel Admin (Template Import)

### Krok 1: Otwórz panel admin
1. Uruchom dev server (jeśli nie jest uruchomiony):
   ```
   npm run dev
   ```

2. Otwórz w przeglądarce:
   ```
   http://localhost:3000/admin-99x-hsd/products
   ```

### Krok 2: Użyj Template Import
1. Kliknij przycisk **"Template Import"** (na górze strony)

2. Wybierz zakładkę **"Paste Text"**

3. Otwórz plik: `popular_products_to_import.txt`

4. Skopiuj całą zawartość (Ctrl+A, Ctrl+C)

5. Wklej do pola tekstowego w Template Import

### Krok 3: Ustaw opcje
1. **Import Mode**: Wybierz **"Add / Refresh"**
   - To doda nowe produkty БЕЗ usuwania istniejących
   
2. **Auto-detect category**: Zaznacz ✅
   - Automatycznie wykryje kategorie z nazw produktów

3. **Batch Tag**: Zostaw **"popular"**
   - Wszystkie produkty będą miały batch: popular (już jest w pliku)

4. **Pin products**: Zaznacz ✅
   - To przypnie wszystkie nowe produkty

5. **Pin order**: Wybierz **"After existing"**
   - Nowe produkty będą NA KOŃCU już przypiętych
   - Stare przypięte produkty pozostaną pierwsze

### Krok 4: Import
1. Kliknij **"Start Import"**

2. Poczekaj aż się zescrapują wszystkie produkty (może zająć 2-3 minuty)

3. Gotowe! ✅

---

## Co się stanie?

### PRZED:
```
Przypięte produkty (pinned_order):
1. Stary produkt 1 (batch: best)
2. Stary produkt 2 (batch: best)
3. Stary produkt 3 (batch: best)
... itd
```

### PO:
```
Przypięte produkty (pinned_order):
1. Stary produkt 1 (batch: best)       ← Pozostaje
2. Stary produkt 2 (batch: best)       ← Pozostaje
3. Stary produkt 3 (batch: best)       ← Pozostaje
... (wszystkie stare)
31. Nowy produkt 1 (batch: popular)    ← NOWY
32. Nowy produkt 2 (batch: popular)    ← NOWY
33. Nowy produkt 3 (batch: popular)    ← NOWY
... (30 nowych produktów popular)
```

---

## Alternatywna metoda: Bulk Scraper w panelu

### Jeśli Template Import nie działa:

1. W panelu admin, znajdź sekcję **"Bulk Scraper"**

2. Wklej TYLKO linki (bez "popular"):
   ```
   https://weidian.com/item.html?itemID=7834112554&spider_token=7a08
   https://weidian.com/item.html?itemID=7833981948&spider_token=0ca5
   ... (wszystkie 30 linków)
   ```

3. Ustaw:
   - **Mode**: "Add"
   - **Pin**: ✅ Yes
   - **Batch**: "popular"
   - **Order**: "After existing"

4. Kliknij **"Scrape All"**

5. Po dodaniu, ręcznie ustaw batch na "popular" przez Bulk Edit:
   - Zaznacz wszystkie nowe produkty
   - Bulk Edit → Batch → "popular"

---

## Rozwiązanie problemu z API

Jeśli chcesz naprawić problem z Supabase API:

### Problem: "Invalid API key"

To prawdopodobnie problem z RLS (Row Level Security) w Supabase.

### Rozwiązanie:
1. Zaloguj się do Supabase Dashboard
2. Idź do **Authentication** → **Policies**
3. Dla tabeli `products`, upewnij się że masz policy:
   ```sql
   -- Allow service_role to do everything
   CREATE POLICY "Service role can do everything" ON products
   FOR ALL USING (auth.role() = 'service_role');
   ```

4. Lub wyłącz RLS tymczasowo (dla rozwoju):
   ```sql
   ALTER TABLE products DISABLE ROW LEVEL SECURITY;
   ```

---

## Plik z produktami

**Plik**: `popular_products_to_import.txt`

**Format**:
```
[URL]	[BATCH]
```

Każda linia to:
- URL Weidian produktu
- TAB (tabulator)
- Batch tag ("popular")

---

## Potrzebujesz pomocy?

1. Sprawdź czy dev server działa: `npm run dev`
2. Sprawdź czy możesz otworzyć panel admin: http://localhost:3000/admin-99x-hsd/products
3. Jeśli panel nie działa, sprawdź błędy w konsoli przeglądarki (F12)

---

**Sukces!** Po zaimportowaniu, odśwież stronę i sprawdź czy produkty są na liście. 🎉
