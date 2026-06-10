# Tasks

## Task 1: Complete German (de) translations
**Requirements:** R1  
**Description:** Add all missing German translations to `translations.js` to achieve 100% coverage matching the Polish and English objects.

### Subtasks:
- [x] 1.1: Add complete `navbar` section translations for German
- [ ] 1.2: Add complete `hero` section translations for German
- [ ] 1.3: Add complete `products` section translations for German (including `viewAgents: "Agenten anzeigen"` and all 8 product categories)
- [ ] 1.4: Add complete `features` section translations for German
- [ ] 1.5: Add complete `converter`, `promo`, `settings`, `footer` sections for German
- [ ] 1.6: Add complete `tutorials`, `featured`, `tracking`, `qcPage` sections for German
- [ ] 1.7: Add complete `calculator` section translations for German
- [ ] 1.8: Add complete `tutorialSteps` section with all 13 steps (title + description) for German

## Task 2: Complete Spanish (es) translations
**Requirements:** R2  
**Description:** Add all missing Spanish translations to `translations.js` to achieve 100% coverage matching the Polish and English objects.

### Subtasks:
- [ ] 2.1: Add complete `navbar` section translations for Spanish
- [ ] 2.2: Add complete `hero` section translations for Spanish
- [ ] 2.3: Add complete `products` section translations for Spanish (including `viewAgents: "Ver agentes"` and all 8 product categories)
- [ ] 2.4: Add complete `features` section translations for Spanish
- [ ] 2.5: Add complete `converter`, `promo`, `settings`, `footer` sections for Spanish
- [ ] 2.6: Add complete `tutorials`, `featured`, `tracking`, `qcPage` sections for Spanish
- [ ] 2.7: Add complete `calculator` section translations for Spanish
- [ ] 2.8: Add complete `tutorialSteps` section with all 13 steps (title + description) for Spanish

## Task 3: Implement translation fallback mechanism
**Requirements:** R3, R9  
**Description:** Enhance `LanguageContext.js` with intelligent fallback logic to handle missing translation keys gracefully.

### Subtasks:
- [ ] 3.1: Create `getNestedValue` helper function to traverse translation object by dot-notation key path
- [ ] 3.2: Implement multi-level fallback logic in `t()` function (current language → English → formatted key)
- [ ] 3.3: Add development-only console warnings when falling back to English
- [ ] 3.4: Return empty string in production mode for completely missing keys
- [ ] 3.5: Test round-trip behavior (language switch and back preserves translations)
- [ ] 3.6: Verify localStorage serialization/deserialization maintains translation integrity

## Task 4: Replace hardcoded category names with translation keys
**Requirements:** R8  
**Description:** Update all components that display product categories to use the translation system instead of hardcoded strings.

### Subtasks:
- [ ] 4.1: Identify all components displaying category names (product filters, ProductDetail, calculator)
- [ ] 4.2: Replace hardcoded category strings with `t('products.{category}')` calls
- [ ] 4.3: Ensure all 8 categories (shoes, hoodies, t-shirts, pants, shorts, jackets, sets, accessories) are consistently translated
- [ ] 4.4: Verify category names update correctly when language is changed

## Task 5: Implement base weight estimation algorithm
**Requirements:** R4, R10  
**Description:** Refactor `/api/calculator/estimate-weight.js` with new category-based and brand-aware weight calculation logic.

### Subtasks:
- [ ] 5.1: Define `categoryWeights` object with base weights for all 8 categories
- [ ] 5.2: Implement basic weight estimation function that returns category base weight
- [ ] 5.3: Add error handling for empty product names (return weight: 0)
- [ ] 5.4: Add error handling for invalid input (special characters only, return weight: 0)
- [ ] 5.5: Ensure weight is never negative (Math.max(0, weight))
- [ ] 5.6: Add try-catch wrapper to return safe response on exceptions (HTTP 500)

## Task 6: Add brand-specific weight overrides for shorts
**Requirements:** R4, R5  
**Description:** Implement brand detection and weight overrides for popular shorts brands.

### Subtasks:
- [ ] 6.1: Create `brandWeights` object with brand-to-weight mappings for shorts category
- [ ] 6.2: Add weight override for "jordan shorts" (280g base)
- [ ] 6.3: Add weight override for "ee shorts" (150g for Eric Emanuel)
- [ ] 6.4: Add weight override for "essentials shorts" (320g)
- [ ] 6.5: Add weight override for "nike shorts" (220g)
- [ ] 6.6: Add weight override for "supreme shorts" (300g)
- [ ] 6.7: Add weight override for "chrome hearts shorts" (350g)
- [ ] 6.8: Add weight override for "bape shorts" (250g)
- [ ] 6.9: Implement brand detection logic that checks productName for brand keywords

## Task 7: Add material modifiers to weight calculation
**Requirements:** R4  
**Description:** Implement material detection and apply weight modifiers based on fabric type (mesh, fleece, denim, etc.).

### Subtasks:
- [ ] 7.1: Create `materialModifiers` object with material-to-multiplier mappings
- [ ] 7.2: Add mesh material detection (keywords: "mesh", "siatka") with 0.65 multiplier (-35%)
- [ ] 7.3: Add fleece material detection with 1.25 multiplier (+25%)
- [ ] 7.4: Add terry material detection with 1.20 multiplier (+20%)
- [ ] 7.5: Add denim/jeans material detection with 1.30 multiplier (+30%)
- [ ] 7.6: Add leather material detection with 1.40 multiplier (+40%)
- [ ] 7.7: Add down/puffer material detection with 1.15 multiplier (+15%)
- [ ] 7.8: Implement material detection logic that applies first matching modifier to base/brand weight

## Task 8: Add size-based weight adjustments
**Requirements:** R6  
**Description:** Implement size detection and weight adjustments for both alphanumeric (XS-3XL) and numeric (28-42) sizes.

### Subtasks:
- [ ] 8.1: Create `sizeAdjustments` object for alphanumeric sizes (XS: -25g, S: -15g, M: 0g, L: +15g, XL: +25g, 2XL: +40g, 3XL: +50g)
- [ ] 8.2: Implement alphanumeric size detection and adjustment application
- [ ] 8.3: Create `numericSizeAdjustment` function for pants/shorts sizes (28-42 range, 8g per increment from size 32 base)
- [ ] 8.4: Implement numeric size detection and adjustment application
- [ ] 8.5: Add validation to ignore invalid sizes (>99, <0, or unrecognized formats)
- [ ] 8.6: Ensure size adjustments are applied after material modifiers

## Task 9: Integrate weight estimation API into ProductDetail component
**Requirements:** R7  
**Description:** Update `ProductDetail.jsx` to call the weight estimation API and display accurate weights with fallback support.

### Subtasks:
- [ ] 9.1: Add state variables for `estimatedWeight` and `weightLoading`
- [ ] 9.2: Implement `fetchWeight` function that calls `/api/calculator/estimate-weight` with product data
- [ ] 9.3: Add 2-second timeout to API call using AbortSignal.timeout(2000)
- [ ] 9.4: Implement `getEstimatedWeightFallback` function with category-based fallback weights
- [ ] 9.5: Add error handling to fall back to simple estimation if API fails or times out
- [ ] 9.6: Display weight with loading state in UI
- [ ] 9.7: Trigger weight estimation when product or size changes (useEffect dependency)

## Task 10: Test translation coverage and fallback behavior
**Requirements:** R1, R2, R3, R9  
**Description:** Manually verify translation completeness and fallback mechanism across all languages.

### Subtasks:
- [ ] 10.1: Test German translations appear correctly in all sections of the UI
- [ ] 10.2: Test Spanish translations appear correctly in all sections of the UI
- [ ] 10.3: Temporarily remove a German translation key and verify English fallback appears
- [ ] 10.4: Test round-trip behavior: switch pl→en→de→es→pl and verify no text loss
- [ ] 10.5: Verify localStorage persists language choice correctly
- [ ] 10.6: Check browser console for translation warnings in development mode
- [ ] 10.7: Verify empty strings appear in production mode for missing keys (not formatted key names)

## Task 11: Test weight estimation accuracy
**Requirements:** R4, R5, R6, R7, R10  
**Description:** Test the weight estimation algorithm with various product combinations to ensure accuracy.

### Subtasks:
- [ ] 11.1: Test "Jordan mesh shorts" M → verify weight in range [130-220g]
- [ ] 11.2: Test "EE shorts" L → verify weight ~165g
- [ ] 11.3: Test "Nike shorts" M → verify weight in range [180-260g]
- [ ] 11.4: Test "Supreme shorts" S → verify weight in range [250-350g]
- [ ] 11.5: Test "Chrome Hearts shorts" M → verify weight in range [300-400g]
- [ ] 11.6: Test "Bape shorts" M → verify weight in range [200-300g]
- [ ] 11.7: Test generic "shorts" with sizes XS/S/M/L/XL/2XL/3XL → verify size adjustments apply correctly
- [ ] 11.8: Test numeric sizes (e.g., shorts size 28, 32, 36, 40) → verify proportional adjustments
- [ ] 11.9: Test empty product name → verify returns weight: 0
- [ ] 11.10: Test invalid size "XXXXXXL" → verify uses base weight without adjustment
- [ ] 11.11: Test special characters only "!@#$%" → verify returns weight: 0
- [ ] 11.12: Test shoes, hoodies, jackets categories → verify reasonable weight ranges

## Task 12: Integration testing for UI components
**Requirements:** R7, R8  
**Description:** Test end-to-end functionality of weight display and category translations across the application.

### Subtasks:
- [ ] 12.1: Open ProductDetail page for shorts product → verify estimated weight displays correctly
- [ ] 12.2: Verify weight loading state appears during API call
- [ ] 12.3: Test weight estimation timeout by simulating slow API → verify fallback weight appears
- [ ] 12.4: Test calculator page with different products and sizes → verify weight updates correctly
- [ ] 12.5: Switch language and verify category names update in product filters
- [ ] 12.6: Switch language and verify category names update in ProductDetail view
- [ ] 12.7: Switch language and verify category names update in calculator
- [ ] 12.8: Verify weight display updates correctly when selecting different product sizes in ProductDetail
