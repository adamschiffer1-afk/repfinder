# Discord OAuth Setup - Instrukcja Konfiguracji

## 1. Utwórz aplikację Discord

1. Przejdź do [Discord Developer Portal](https://discord.com/developers/applications)
2. Kliknij **"New Application"**
3. Nadaj nazwę aplikacji (np. "RepFinder")
4. Zaakceptuj regulamin i kliknij **"Create"**

## 2. Skonfiguruj OAuth2

1. W panelu aplikacji przejdź do zakładki **"OAuth2"**
2. W sekcji **"OAuth2 URL Generator"** lub **"Redirects"** dodaj URL przekierowania:
   - Dla produkcji: `https://repfinder.xyz/api/auth/callback/discord`
   - Dla developmentu: `http://localhost:3000/api/auth/callback/discord`

## 3. Pobierz dane uwierzytelniające

1. W zakładce **"OAuth2"** znajdź:
   - **CLIENT ID** - skopiuj tę wartość
   - **CLIENT SECRET** - kliknij "Reset Secret" lub "Copy" aby skopiować

## 4. Dodaj do .env.local

Otwórz plik `.env.local` i dodaj/zaktualizuj:

```env
DISCORD_CLIENT_ID=twój_client_id
DISCORD_CLIENT_SECRET=twój_client_secret
```

## 5. Ustaw swoje Discord ID jako admin

1. Włącz tryb dewelopera w Discord:
   - Ustawienia Discord → Zaawansowane → Tryb dewelopera (ON)
2. Kliknij prawym na swoją nazwę użytkownika i wybierz "Kopiuj ID"
3. W pliku `src/auth.js` zamień `YOUR_DISCORD_ID` na swoje ID:

```javascript
const ADMIN_DISCORD_ID = "123456789012345678"; // Twoje Discord ID
```

## 6. Restartuj serwer

Po dodaniu zmiennych środowiskowych, zrestartuj serwer Next.js:

```bash
npm run dev
```

## Testowanie

1. Otwórz stronę w przeglądarce
2. Kliknij przycisk "Zaloguj się" w navbarze
3. Zostaniesz przekierowany do Discord aby zaautoryzować aplikację
4. Po zalogowaniu powinieneś zobaczyć swój avatar i badge:
   - **Administrator** - jeśli Twoje Discord ID pasuje do `ADMIN_DISCORD_ID`
   - **Użytkownik** - dla wszystkich innych użytkowników

## Uprawnienia (Scopes)

NextAuth automatycznie używa następujących scopów dla Discord:
- `identify` - podstawowe informacje o użytkowniku
- `email` - adres email użytkownika

## Troubleshooting

### Błąd: "Invalid OAuth2 redirect"
- Sprawdź czy dodałeś prawidłowy URL przekierowania w Discord Developer Portal
- URL musi być dokładnie taki sam (włącznie z http/https)

### Błąd: "Invalid client"
- Sprawdź czy `DISCORD_CLIENT_ID` i `DISCORD_CLIENT_SECRET` są prawidłowe
- Upewnij się że nie ma spacji na początku/końcu wartości

### Użytkownik nie jest adminem
- Sprawdź czy `ADMIN_DISCORD_ID` w `src/auth.js` jest prawidłowe
- Upewnij się że skopiowałeś pełne ID (17-19 cyfr)
