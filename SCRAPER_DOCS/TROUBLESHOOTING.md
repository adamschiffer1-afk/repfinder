# Troubleshooting — "No Image" problem

## Możliwe przyczyny i rozwiązania

---

## ❌ Problem 1: URL zdjęcia jest poprawny ale obraz nie ładuje się w przeglądarce

Weidian **blokuje hotlinking** — zdjęcia wyświetlają się tylko gdy request pochodzi z weidian.com.

### Rozwiązanie: Użyj proxy obrazu

Next.js ma wbudowane proxy obrazów. W `next.config.js` dodaj:

```js
// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.weidian.com',
      },
      {
        protocol: 'https', 
        hostname: '**.alicdn.com',
      },
      {
        protocol: 'https',
        hostname: '**.tbcdn.cn',
      },
    ],
  },
};
```

I używaj komponentu `<Image>` z Next.js zamiast zwykłego `<img>`:

```jsx
import Image from 'next/image';

// ✅ Tak - Next.js proxy
<Image src={product.image} width={400} height={400} alt={product.name} />

// ❌ Tak nie - bezpośredni img tag może być blokowany
<img src={product.image} />
```

---

## ❌ Problem 2: URL zdjęcia jest pusty w bazie danych

Sprawdź co jest zapisane w bazie dla kolumny `image`.

Jeśli jest pusty string lub `null` — scraper nie znalazł zdjęcia.

### Debug: przetestuj scraper bezpośrednio

```js
// test-scraper.mjs
import axios from 'axios';
import * as cheerio from 'cheerio';

const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

const itemId = '7400204781'; // zmień na swój ID

const res = await axios.get(`https://weidian.com/item.html?itemID=${itemId}`, {
  headers: { 'User-Agent': USER_AGENT, 'Referer': 'https://weidian.com/' },
  timeout: 12000
});

const $ = cheerio.load(res.data);
const tag = $('#__rocker-render-inject__');

if (!tag.length) {
  console.log('❌ Nie znaleziono tagu - Weidian blokuje');
  process.exit(1);
}

const data = JSON.parse(tag.attr('data-obj'));
const itemInfo = data.result.default_model.item_info;

console.log('✅ Nazwa:', itemInfo.item_name);
console.log('✅ Cena CNY:', itemInfo.origin_price);
console.log('✅ item_head (główne zdjęcie):', itemInfo.item_head);

const sku = data.result.default_model.sku_properties;
if (sku?.attr_list) {
  const imgAttr = sku.attr_list.find(a => a.attr_values?.some(v => v.img));
  if (imgAttr) {
    console.log('✅ Pierwsze zdjęcie wariantu:', imgAttr.attr_values.find(v => v.img)?.img);
  } else {
    console.log('⚠️ Brak zdjęć w wariantach SKU — użyj item_head');
  }
}
```

Uruchom: `node test-scraper.mjs`

---

## ❌ Problem 3: URL zdjęcia nie zaczyna się od "https://"

Weidian czasem zwraca URL bez protokołu: `//img.weidian.com/...`

Upewnij się że formatujesz URL poprawnie:

```js
function formatImageUrl(url) {
  if (!url) return '';
  // Dodaj protokół jeśli brakuje
  const absolute = url.startsWith('http') ? url : `https:${url}`;
  // Dodaj wymiary
  const sep = absolute.includes('?') ? '&' : '?';
  return `${absolute}${sep}w=400&h=400`;
}
```

---

## ❌ Problem 4: Scraper dostaje bot protection

Jeśli `#__rocker-render-inject__` nie istnieje w HTML — Weidian zwrócił stronę błędu.

**Rozwiązania:**
- Dodaj delay między requestami: `await new Promise(r => setTimeout(r, 1000))`
- Zmień User-Agent na inny mobilny
- Użyj proxy/rotating IPs
- Zmniejsz concurrency do 2

---

## ✅ Jak sprawdzić czy URL zdjęcia działa

Wklej URL zdjęcia bezpośrednio do przeglądarki. Jeśli ładuje się obraz — problem jest w wyświetlaniu (hotlinking/next.config). Jeśli nie ładuje się — problem jest w scrapowaniu.

Przykładowy poprawny URL zdjęcia z Weidian wygląda tak:
```
https://img01.yzcdn.cn/upload_files/2023/05/15/Fk8...abc.jpg?w=400&h=400
```
lub
```
https://gd2.alicdn.com/imgextra/i4/...jpg?w=400&h=400  
```
