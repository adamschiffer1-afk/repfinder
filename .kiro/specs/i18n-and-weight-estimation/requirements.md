# Requirements Document

## Introduction

Projekt RepFinder to platforma Next.js służąca do wyszukiwania i zamawiania produktów z Chin przez agentów zakupowych. Niniejszy dokument opisuje wymagania dla dwóch powiązanych ulepszeń:

1. **Rozbudowa systemu tłumaczeń (i18n)** — aplikacja posiada już infrastrukturę wielojęzyczności (`LanguageContext`, `translations.js`, przełącznik języka w nawigacji) obsługującą języki pl/en/cn/de/es, jednak wiele kluczowych ciągów tekstowych jest albo brakujących, albo nieprzetłumaczonych w językach de/es. Należy dopełnić i ustandaryzować system.

2. **Precyzyjniejsze szacowanie wag produktów** — algorytm wagi działa na zasadzie dopasowania słów kluczowych. Dla niektórych produktów zwraca błędne wartości (np. ~500g dla siateczkowych spodenek Jordan, które powinny ważyć ~150–200g). System musi uwzględniać typ produktu, materiał i markę w bardziej granularny sposób.

## Słownik

- **System**: aplikacja RepFinder (Next.js, front-end + API Routes)
- **Weight_Estimator**: moduł API (`/api/calculator/estimate-weight`) szacujący wagę produktu na podstawie nazwy i rozmiaru
- **Translation_System**: system złożony z `translations.js`, `LanguageContext.js` i hooka `useLanguage`, dostarczający zlokalizowane ciągi do komponentów
- **Product_Detail**: komponent `ProductDetail.jsx` wyświetlający szczegóły produktu wraz z szacunkową wagą
- **Language_Switcher**: element UI w `Navbar.jsx` pozwalający użytkownikowi zmienić język
- **Fallback**: wartość zwracana gdy nie znaleziono tłumaczenia lub wagi — musi być sensowna
- **Category**: kategoria produktu (shoes, hoodies, t-shirts, pants, shorts, jackets, sets, accessories)
- **Material_Modifier**: mnożnik wagi uwzględniający materiał produktu (np. mesh, denim, fleece)

---

## Requirements

### Requirement 1: Kompletność tłumaczeń dla języka niemieckiego (de)

**User Story:** Jako użytkownik korzystający z interfejsu po niemiecku, chcę widzieć wszystkie teksty przetłumaczone na język niemiecki, aby w pełni korzystać z platformy bez konieczności znajomości polskiego lub angielskiego.

#### Acceptance Criteria

1. THE Translation_System SHALL zawierać kompletny obiekt tłumaczeń dla klucza `de`, pokrywający wszystkie sekcje obecne w obiektach `pl` i `en` (navbar, hero, products, features, converter, promo, settings, footer, tutorials, featured, tracking, qcPage, calculator, tutorialSteps).
2. WHEN użytkownik wybierze język `de` w Language_Switcher, THE Translation_System SHALL zwrócić przetłumaczony ciąg dla każdego klucza używanego przez komponenty.
3. IF Translation_System nie znajdzie klucza w obiekcie `de`, THEN THE Translation_System SHALL zwrócić odpowiadający ciąg z obiektu `en` (angielski jako drugi fallback).
4. THE Translation_System SHALL zapewnić, że ciąg `products.viewAgents` w języku `de` ma wartość `"Agenten anzeigen"`.
5. THE Translation_System SHALL zapewnić, że sekcja `tutorialSteps.steps` w języku `de` zawiera tłumaczenia tytułów i opisów wszystkich 13 kroków.

### Requirement 2: Kompletność tłumaczeń dla języka hiszpańskiego (es)

**User Story:** Jako użytkownik korzystający z interfejsu po hiszpańsku, chcę widzieć wszystkie teksty przetłumaczone na język hiszpański, aby móc komfortowo korzystać z platformy.

#### Acceptance Criteria

1. THE Translation_System SHALL zawierać kompletny obiekt tłumaczeń dla klucza `es`, pokrywający wszystkie sekcje obecne w obiektach `pl` i `en`.
2. WHEN użytkownik wybierze język `es` w Language_Switcher, THE Translation_System SHALL zwrócić przetłumaczony ciąg dla każdego klucza używanego przez komponenty.
3. IF Translation_System nie znajdzie klucza w obiekcie `es`, THEN THE Translation_System SHALL zwrócić odpowiadający ciąg z obiektu `en`.
4. THE Translation_System SHALL zapewnić, że ciąg `products.viewAgents` w języku `es` ma wartość `"Ver agentes"`.
5. THE Translation_System SHALL zapewnić, że sekcja `tutorialSteps.steps` w języku `es` zawiera tłumaczenia tytułów i opisów wszystkich 13 kroków.

### Requirement 3: Mechanizm fallback tłumaczeń

**User Story:** Jako programista integrujący nowe komponenty, chcę mieć pewność, że brakujące klucze tłumaczeń nie powodują wyświetlania technicznych ścieżek kluczy użytkownikom, aby utrzymać profesjonalny wygląd interfejsu.

#### Acceptance Criteria

1. WHEN komponent wywołuje `t('some.missing.key')` dla dowolnego języka, THE Translation_System SHALL zwrócić wartość z obiektu `en` jeśli klucz istnieje w `en`.
2. IF klucz nie istnieje ani w aktywnym języku, ani w `en`, THEN THE Translation_System SHALL zwrócić klucz w formacie czytelnym dla człowieka (zamiana `.` na spację, wielka litera).
3. THE Translation_System SHALL logować ostrzeżenie do konsoli (wyłącznie w trybie `development`) gdy klucz nie zostanie znaleziony w aktywnym języku.
4. WHILE aplikacja działa w trybie produkcyjnym, THE Translation_System SHALL wyświetlić brakujący klucz jako pusty ciąg zamiast ścieżki klucza, gdy klucz nie istnieje w żadnym języku.

### Requirement 4: Precyzyjne szacowanie wag – kategoria "shorts" z uwzględnieniem materiału

**User Story:** Jako kupujący dodający siateczkowe spodenki Jordan do kalkulatora, chcę otrzymać realistyczne oszacowanie wagi (~150–200g), aby poprawnie obliczyć koszty wysyłki i nie przepłacać.

#### Acceptance Criteria

1. WHEN Weight_Estimator otrzyma nazwę produktu zawierającą słowo `shorts` lub `spodenki`, THE Weight_Estimator SHALL użyć bazowej wagi nie wyższej niż 300g dla produktów bez konkretnej marki.
2. WHEN Weight_Estimator wykryje słowa kluczowe wskazujące na materiał siatkowy (`mesh`, `siatka`, `mesh shorts`), THE Weight_Estimator SHALL zastosować mnożnik redukujący wagę o co najmniej 30% względem wartości bazowej dla tej kategorii.
3. WHEN Weight_Estimator otrzyma nazwę `Jordan shorts` lub `jordan mesh shorts`, THE Weight_Estimator SHALL zwrócić wagę z zakresu [130, 220]g.
4. WHEN Weight_Estimator wykryje słowa kluczowe wskazujące na ciężki materiał (`fleece shorts`, `terry shorts`, `denim shorts`), THE Weight_Estimator SHALL zastosować mnożnik zwiększający wagę o co najmniej 20% względem wartości bazowej.
5. THE Weight_Estimator SHALL rozróżniać `ee shorts` (Eric Emanuel, ~150g) od `essentials shorts` (~320g) od zwykłych `shorts` (~250g).

### Requirement 5: Precyzyjne szacowanie wag – korekty brandowe dla spodenek i spodni

**User Story:** Jako kupujący, chcę żeby kalkulator znał wagi popularnych brandowych spodenek (Nike, Jordan, Essentials, Supreme), aby nie musieć ręcznie wpisywać wagi dla często kupowanych produktów.

#### Acceptance Criteria

1. WHEN Weight_Estimator otrzyma nazwę zawierającą `nike shorts`, THE Weight_Estimator SHALL zwrócić wagę z zakresu [180, 260]g.
2. WHEN Weight_Estimator otrzyma nazwę zawierającą `supreme shorts`, THE Weight_Estimator SHALL zwrócić wagę z zakresu [250, 350]g.
3. WHEN Weight_Estimator otrzyma nazwę zawierającą `chrome hearts shorts`, THE Weight_Estimator SHALL zwrócić wagę z zakresu [300, 400]g.
4. WHEN Weight_Estimator otrzyma nazwę zawierającą `bape shorts`, THE Weight_Estimator SHALL zwrócić wagę z zakresu [200, 300]g.
5. THE Weight_Estimator SHALL zachować istniejące odwzorowania dla `ee shorts` (150g), `essentials shorts` (320g) i `jordan shorts` (280g) jako wartości wyjściowe przed korektami rozmiaru.

### Requirement 6: Precyzyjne szacowanie wag – korekty rozmiaru dla spodenek

**User Story:** Jako kupujący, chcę żeby waga spodenek była korygowana o rozmiar (XS–3XL, EU 28–40), aby oszacowanie było jeszcze dokładniejsze przy dużych rozmiarach.

#### Acceptance Criteria

1. WHEN Weight_Estimator przetwarza spodenki (`shorts`) z rozmiarem alfanumerycznym `XS`, THE Weight_Estimator SHALL odjąć od wagi bazowej co najmniej 25g.
2. WHEN Weight_Estimator przetwarza spodenki z rozmiarem `XL`, THE Weight_Estimator SHALL dodać do wagi bazowej co najmniej 25g.
3. WHEN Weight_Estimator przetwarza spodenki z numerycznym rozmiarem spodni (zakres [28, 42]), THE Weight_Estimator SHALL zastosować korektę proporcjonalną do odchylenia od bazowego rozmiaru 32.
4. IF rozmiar jest nie do odczytania lub pusty, THEN THE Weight_Estimator SHALL użyć wagi bazowej bez korekty.

### Requirement 7: Szacowanie wagi w komponencie ProductDetail

**User Story:** Jako użytkownik przeglądający szczegóły produktu, chcę widzieć realistyczną szacunkową wagę, aby podejmować świadome decyzje przed zamówieniem.

#### Acceptance Criteria

1. WHEN Product_Detail wyświetla produkt z kategorią `shorts`, THE Product_Detail SHALL pokazać szacunkową wagę z zakresu [100, 400]g (nie ~500g jak poprzednio).
2. WHEN Product_Detail wyświetla produkt z kategorią `shoes`, THE Product_Detail SHALL pokazać szacunkową wagę z zakresu [800, 1500]g.
3. WHEN Product_Detail wyświetla produkt z kategorią `accessories`, THE Product_Detail SHALL pokazać szacunkową wagę z zakresu [20, 400]g.
4. THE Product_Detail SHALL wywołać Weight_Estimator (via `/api/calculator/estimate-weight`) z nazwą i kategorią produktu, zamiast używać uproszczonej funkcji `getEstimatedWeight` opartej wyłącznie na kategorii.
5. IF wywołanie Weight_Estimator nie powiedzie się lub przekroczy limit czasu (>2s), THEN THE Product_Detail SHALL wyświetlić szacunkową wagę z uproszczonej tabeli kategoria→waga jako wartość zastępczą.

### Requirement 8: Spójność systemu tłumaczeń – klucze kategorii produktów

**User Story:** Jako programista, chcę żeby nazwy kategorii produktów były pobierane z systemu tłumaczeń, a nie hardcodowane w komponentach, aby jednorazowa zmiana tłumaczenia działała wszędzie.

#### Acceptance Criteria

1. THE Translation_System SHALL zawierać klucze `products.{category}` dla wszystkich 8 kategorii (shoes, hoodies, t-shirts, pants, shorts, jackets, sets, accessories) we wszystkich 5 językach (pl, en, cn, de, es).
2. WHEN komponent wyświetla filtr kategorii, THE System SHALL użyć `t('products.{categoryKey}')` zamiast hardcodowanej polskiej lub angielskiej nazwy.
3. THE Translation_System SHALL zachować spójność nazw kategorii między filtrem produktów, detalem produktu i kalkulatorem w obrębie tego samego języka.

### Requirement 9: Właściwość round-trip tłumaczeń

**User Story:** Jako programista, chcę mieć pewność że kluczowe ciągi tłumaczeń nie są przypadkowo obcinane ani modyfikowane przy serializacji/deserializacji stanu języka, aby przełączanie języków nie prowadziło do utraty danych.

#### Acceptance Criteria

1. THE Translation_System SHALL zachować identyczną wartość ciągu po sekwencji: odczyt tłumaczenia → zmiana języka → powrót do języka pierwotnego → odczyt tego samego klucza.
2. FOR ALL języków (pl, en, cn, de, es), serializacja stanu języka do `localStorage` i deserializacja z powrotem SHALL produkować identyczny aktywny zestaw tłumaczeń.
3. THE Language_Switcher SHALL aktualizować wszystkie widziane przez użytkownika ciągi w jednym cyklu renderowania po wywołaniu `changeLanguage`.

### Requirement 10: Obsługa błędów w Weight_Estimator

**User Story:** Jako kupujący, chcę żeby kalkulator nie zawiesił się ani nie wyświetlił błędu gdy wpiszę nieprawidłową lub pustą nazwę przedmiotu, aby moja sesja użytkowania nie była przerywana.

#### Acceptance Criteria

1. IF Weight_Estimator otrzyma pustą nazwę produktu, THEN THE Weight_Estimator SHALL zwrócić `{ weight: 0, isAiActive: false, isShoe: false }` z kodem HTTP 200.
2. IF Weight_Estimator otrzyma nazwę produktu zawierającą wyłącznie znaki specjalne lub liczby, THEN THE Weight_Estimator SHALL zwrócić wagę 0 z `isAiActive: false`.
3. IF Weight_Estimator otrzyma rozmiar spoza zdefiniowanych zakresów (np. rozmiar 99 lub rozmiar "XXXXXXL"), THEN THE Weight_Estimator SHALL użyć wagi bazowej bez korekty rozmiaru, zamiast zastosować nieproporcjonalną korektę.
4. THE Weight_Estimator SHALL zawsze zwracać wagę nie mniejszą niż 0g (brak wartości ujemnych).
5. WHEN Weight_Estimator napotka wyjątek wewnętrzny, THE Weight_Estimator SHALL zwrócić bezpieczną odpowiedź `{ weight: 0, isAiActive: false, isShoe: false }` z kodem HTTP 500.
