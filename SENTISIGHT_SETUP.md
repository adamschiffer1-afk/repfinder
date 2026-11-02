# 🎨 SentiSight.ai Background Removal Setup

## Dlaczego SentiSight?

- ✅ **€20 darmowych kredytów** na start (≈26,000 zdjęć!)
- ✅ **€5/miesiąc** recurring free credits (≈6,500 zdjęć/m)
- ✅ **Bardzo tania cena:** €0.75/1,000 zdjęć po wykorzystaniu
- ✅ Brak watermarków w darmowym tierze
- ✅ Proste REST API

---

## 📝 Instrukcja konfiguracji (5 minut)

### Krok 1: Załóż konto SentiSight.ai

1. Idź na **https://www.sentisight.ai/**
2. Kliknij **"Sign Up"** / **"Get Started"**
3. Zarejestruj się przez email lub Google
4. ✅ **Otrzymasz €20 darmowych kredytów automatycznie!**

### Krok 2: Pobierz API Token

1. Zaloguj się na **https://platform.sentisight.ai/**
2. Kliknij na swój profil (prawy górny róg)
3. Wybierz **"Wallet Information"** lub **"Settings"**
4. Skopiuj **"API Token"** / **"X-Auth-token"**

Wygląda mniej więcej tak:
```
abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

### Krok 3: Dodaj klucz do projektu

1. Otwórz plik **`.env.local`** w głównym folderze projektu
2. Znajdź linię:
   ```env
   SENTISIGHT_API_KEY=your_sentisight_api_token_here
   ```
3. Zamień `your_sentisight_api_token_here` na swój token:
   ```env
   SENTISIGHT_API_KEY=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
   ```
4. Zapisz plik

### Krok 4: Restart serwera

```bash
# Zatrzymaj serwer (Ctrl+C) i uruchom ponownie:
npm run dev
```

---

## ✅ Gotowe!

Teraz w panelu admina możesz usuwać tła ze zdjęć używając SentiSight API:

1. Idź do `/admin-99x-hsd/products`
2. Edytuj produkt
3. Kliknij **"Remove Background"** przy zdjęciu
4. ✨ Tło zostanie usunięte i zapisane w Supabase Storage

---

## 📊 Ile to kosztuje?

| Tier | Kredyty | Zdjęć | Koszt |
|------|---------|-------|-------|
| **Na start** | €20 | ~26,000 | **DARMOWE** ✅ |
| **Co miesiąc** | €5 | ~6,500 | **DARMOWE** ✅ |
| **Płatne (opcjonalne)** | - | 1,000 | €0.75 |

**1 zdjęcie = ~€0.00075** (mniej niż 1 grosz!)

---

## 🔧 Rozwiązywanie problemów

### "SentiSight API key not configured"
- Sprawdź czy dodałeś klucz do `.env.local`
- Sprawdź czy restartowałeś serwer (`npm run dev`)
- Sprawdź czy nie ma spacji przed/po kluczu

### "401 Unauthorized"
- Sprawdź czy skopiowałeś cały token (może być długi)
- Sprawdź czy token nie wygasł (wejdź na platform.sentisight.ai)

### "Rate limit exceeded"
- Wykorzystałeś darmowe kredyty
- Dokup kredyty na https://platform.sentisight.ai/wallet
- Lub poczekaj do początku miesiąca (€5 odnawia się automatycznie)

---

## 🆚 Porównanie z innymi API

| API | Darmowe/miesiąc | Cena | Jakość |
|-----|-----------------|------|--------|
| **SentiSight** ⭐ | €20 start + €5/m | €0.75/1K | ⭐⭐⭐⭐ |
| Clipdrop (stary) | 100 zdjęć | - | ⭐⭐⭐⭐ |
| Remove.bg | 50 zdjęć | Drogie | ⭐⭐⭐⭐⭐ |
| Photoroom | Watermark | $0.02/img | ⭐⭐⭐⭐⭐ |

---

## 📚 Dokumentacja

- **SentiSight Docs:** https://www.sentisight.ai/user-guide/
- **API Reference:** https://www.sentisight.ai/solutions/background-removal/
- **Pricing:** https://www.sentisight.ai/pricing/

---

## 💡 Wskazówki

1. **Crop empty space:** API może automatycznie przyciąć puste miejsca - dodaj `?crop=true` do URL (już wbudowane w kod)
2. **Monitoruj kredyty:** Sprawdzaj saldo na https://platform.sentisight.ai/wallet
3. **Batch processing:** Jeśli masz dużo zdjęć, możesz użyć web interface do batch upload

---

Miłego usuwania teł! 🎨✨
