# Design Document

## Overview

This document outlines the design for implementing complete i18n translations (German and Spanish) and improved weight estimation logic for the RepFinder platform. The implementation will enhance the existing translation infrastructure and refactor the weight estimation algorithm to be more precise and material-aware.

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    RepFinder Application                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │ Translation      │         │ Weight           │          │
│  │ System           │         │ Estimation       │          │
│  │                  │         │ System           │          │
│  │ - translations.js│         │ - API Route      │          │
│  │ - LanguageContext│         │ - Material Rules │          │
│  │ - useLanguage    │         │ - Brand Rules    │          │
│  └────────┬─────────┘         │ - Size Modifiers │          │
│           │                   └────────┬─────────┘          │
│           │                            │                     │
│  ┌────────▼────────────────────────────▼─────────┐          │
│  │         UI Components                          │          │
│  │  - Navbar (Language Switcher)                  │          │
│  │  - ProductDetail (Weight Display)              │          │
│  │  - Calculator (Weight Input)                   │          │
│  │  - Product Filters (Category Names)            │          │
│  └────────────────────────────────────────────────┘          │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Module Design

### 1. Translation System Enhancement

#### 1.1 File: `translations.js`

**Current State:**
- Supports 5 languages (pl, en, cn, de, es)
- German (de) and Spanish (es) translations incomplete
- No fallback mechanism for missing keys

**Design Changes:**

```javascript
// Structure for complete translations object
const translations = {
  pl: { /* complete */ },
  en: { /* complete */ },
  cn: { /* complete */ },
  de: { 
    // Add all missing sections:
    navbar: { /* ... */ },
    hero: { /* ... */ },
    products: { 
      viewAgents: "Agenten anzeigen",
      shoes: "Schuhe",
      hoodies: "Kapuzenpullover",
      // ... all 8 categories
    },
    tutorialSteps: {
      steps: [ /* 13 steps with title + description */ ]
    },
    // ... all other sections
  },
  es: {
    // Add all missing sections:
    navbar: { /* ... */ },
    hero: { /* ... */ },
    products: { 
      viewAgents: "Ver agentes",
      shoes: "Zapatos",
      hoodies: "Sudaderas con capucha",
      // ... all 8 categories
    },
    tutorialSteps: {
      steps: [ /* 13 steps with title + description */ ]
    },
    // ... all other sections
  }
};
```

**Key Sections to Complete:**
1. `navbar` - Navigation items
2. `hero` - Homepage hero section
3. `products` - Product listing and categories (8 categories: shoes, hoodies, t-shirts, pants, shorts, jackets, sets, accessories)
4. `features` - Feature descriptions
5. `converter` - Currency/size converters
6. `promo` - Promotional content
7. `settings` - User settings
8. `footer` - Footer links and text
9. `tutorials` - Tutorial page content
10. `featured` - Featured products section
11. `tracking` - Order tracking
12. `qcPage` - QC (Quality Check) page
13. `calculator` - Shipping calculator
14. `tutorialSteps` - All 13 tutorial steps with titles and descriptions

#### 1.2 File: `LanguageContext.js`

**Current State:**
- Basic context provider
- No fallback logic for missing keys

**Design Changes:**

Add enhanced `t()` function with fallback mechanism:

```javascript
const t = (key) => {
  // 1. Try current language
  const value = getNestedValue(translations[language], key);
  if (value !== undefined) return value;
  
  // 2. Fallback to English
  const enValue = getNestedValue(translations['en'], key);
  if (enValue !== undefined) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Translation missing for key "${key}" in language "${language}", falling back to English`);
    }
    return enValue;
  }
  
  // 3. Return formatted key as last resort
  if (process.env.NODE_ENV === 'production') {
    return ''; // Empty string in production
  }
  return key.split('.').pop().replace(/([A-Z])/g, ' $1').trim();
};

// Helper function to get nested object value
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};
```

**Round-trip guarantee:**
- localStorage serialization preserves all translation data
- Language change triggers single re-render cycle
- State consistency maintained across page navigation

### 2. Weight Estimation System Redesign

#### 2.1 File: `/api/calculator/estimate-weight.js`

**Current State:**
- Simple keyword matching
- Category-based base weights
- No material or brand-specific logic
- Jordan mesh shorts estimated at ~500g (incorrect)

**Design Architecture:**

```
Input: { productName, size, category }
       ↓
┌──────────────────────┐
│ 1. Category Detection│
│    - Extract category │
│    - Set base weight  │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ 2. Brand Detection   │
│    - Match keywords  │
│    - Apply overrides │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ 3. Material Analysis │
│    - Mesh: -30%      │
│    - Fleece: +20%    │
│    - Denim: +25%     │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ 4. Size Adjustment   │
│    - XS: -25g        │
│    - S: -15g         │
│    - M: 0g (base)    │
│    - L: +15g         │
│    - XL: +25g        │
│    - 2XL: +40g       │
│    - 3XL: +50g       │
│    - Numeric: scale  │
└──────────┬───────────┘
           ↓
Output: { weight, isAiActive, isShoe, category }
```

**Weight Calculation Logic:**

```javascript
// Step 1: Base weights by category
const categoryWeights = {
  'shorts': 250,      // Base for generic shorts
  'pants': 450,
  'shoes': 1100,
  'hoodies': 650,
  't-shirts': 200,
  'jackets': 800,
  'sets': 900,
  'accessories': 150
};

// Step 2: Brand-specific overrides (before material modifiers)
const brandWeights = {
  shorts: {
    'jordan': 280,
    'ee': 150,          // Eric Emanuel
    'essentials': 320,
    'nike': 220,
    'supreme': 300,
    'chrome hearts': 350,
    'bape': 250
  },
  // ... other categories
};

// Step 3: Material modifiers (multiplicative)
const materialModifiers = {
  'mesh': 0.65,        // -35% for mesh
  'siatka': 0.65,
  'fleece': 1.25,      // +25% for fleece
  'terry': 1.20,       // +20% for terry
  'denim': 1.30,       // +30% for denim
  'jeans': 1.30,
  'leather': 1.40,     // +40% for leather
  'down': 1.15,        // +15% for down/puffer
  'puffer': 1.15
};

// Step 4: Size adjustments (additive, applied after material)
const sizeAdjustments = {
  'XS': -25,
  'S': -15,
  'M': 0,
  'L': +15,
  'XL': +25,
  '2XL': +40,
  '3XL': +50
};

// Numeric size adjustment (for pants/shorts, size 28-42)
const numericSizeAdjustment = (size, baseSize = 32) => {
  const diff = size - baseSize;
  return diff * 8; // 8g per size increment
};
```

**Algorithm Flow:**

```javascript
function estimateWeight(productName, size, category) {
  // 1. Get base weight
  let weight = categoryWeights[category] || 300;
  
  // 2. Check for brand-specific override
  const normalizedName = productName.toLowerCase();
  if (brandWeights[category]) {
    for (const [brand, brandWeight] of Object.entries(brandWeights[category])) {
      if (normalizedName.includes(brand)) {
        weight = brandWeight;
        break;
      }
    }
  }
  
  // 3. Apply material modifier
  let materialModifier = 1.0;
  for (const [material, modifier] of Object.entries(materialModifiers)) {
    if (normalizedName.includes(material)) {
      materialModifier = modifier;
      break; // Use first match
    }
  }
  weight = weight * materialModifier;
  
  // 4. Apply size adjustment
  const sizeUpper = (size || '').toUpperCase();
  if (sizeAdjustments[sizeUpper] !== undefined) {
    weight += sizeAdjustments[sizeUpper];
  } else if (/^\d+$/.test(size)) {
    // Numeric size (pants/shorts)
    const numSize = parseInt(size);
    if (numSize >= 28 && numSize <= 42) {
      weight += numericSizeAdjustment(numSize);
    }
  }
  
  // 5. Ensure non-negative
  weight = Math.max(0, Math.round(weight));
  
  return {
    weight,
    isAiActive: false,
    isShoe: category === 'shoes',
    category
  };
}
```

**Error Handling:**
- Empty product name → return `{ weight: 0, isAiActive: false, isShoe: false }`
- Invalid size → ignore size adjustment, use base weight
- Exception → return safe response with HTTP 500
- Size > 99 or < 0 → ignore size adjustment

**Example Calculations:**

| Product | Base | Brand Override | Material | Size | Final |
|---------|------|----------------|----------|------|-------|
| "Jordan mesh shorts" M | 250g | 280g (Jordan) | 182g (mesh -35%) | 182g (M) | **182g** |
| "EE shorts" L | 250g | 150g (EE) | 150g | 165g (+15) | **165g** |
| "Nike fleece shorts" XL | 250g | 220g (Nike) | 275g (fleece +25%) | 300g (+25) | **300g** |
| "Supreme shorts" S | 250g | 300g (Supreme) | 300g | 285g (-15) | **285g** |

#### 2.2 File: `components/ProductDetail.jsx`

**Current State:**
- Uses simple category-based weight estimation
- No API call to weight estimator

**Design Changes:**

```javascript
// Add state for estimated weight
const [estimatedWeight, setEstimatedWeight] = useState(null);
const [weightLoading, setWeightLoading] = useState(false);

// Fetch estimated weight on mount or when product changes
useEffect(() => {
  const fetchWeight = async () => {
    if (!product?.name || !product?.category) return;
    
    setWeightLoading(true);
    try {
      const response = await fetch('/api/calculator/estimate-weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: product.name,
          size: product.defaultSize || 'M',
          category: product.category
        }),
        signal: AbortSignal.timeout(2000) // 2s timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        setEstimatedWeight(data.weight);
      } else {
        throw new Error('API error');
      }
    } catch (error) {
      // Fallback to simple category-based estimation
      setEstimatedWeight(getEstimatedWeightFallback(product.category));
    } finally {
      setWeightLoading(false);
    }
  };
  
  fetchWeight();
}, [product]);

// Fallback function (simplified table)
const getEstimatedWeightFallback = (category) => {
  const fallbackWeights = {
    'shoes': 1100,
    'hoodies': 650,
    't-shirts': 200,
    'pants': 450,
    'shorts': 250,
    'jackets': 800,
    'sets': 900,
    'accessories': 150
  };
  return fallbackWeights[category] || 300;
};
```

### 3. Category Translation Integration

**Files to Update:**
- Product filtering components
- Calculator UI
- ProductDetail display

**Design:**
- Replace hardcoded category names with `t('products.{category}')`
- Ensure all 8 categories have translations in all 5 languages
- Maintain consistency between filter, detail view, and calculator

```javascript
// Example usage in product filter
const categories = [
  'shoes', 'hoodies', 't-shirts', 'pants', 
  'shorts', 'jackets', 'sets', 'accessories'
];

categories.map(cat => ({
  key: cat,
  label: t(`products.${cat}`)
}))
```

## Data Structures

### Translation Object Structure

```typescript
interface Translations {
  [language: string]: {
    navbar: {
      home: string;
      products: string;
      calculator: string;
      tracking: string;
      tutorial: string;
      qc: string;
      // ...
    };
    products: {
      viewAgents: string;
      shoes: string;
      hoodies: string;
      tShirts: string;
      pants: string;
      shorts: string;
      jackets: string;
      sets: string;
      accessories: string;
      // ...
    };
    tutorialSteps: {
      title: string;
      steps: Array<{
        title: string;
        description: string;
      }>;
    };
    // ... all other sections
  };
}
```

### Weight Estimation API

```typescript
// Request
interface WeightEstimateRequest {
  productName: string;
  size?: string;
  category?: string;
}

// Response
interface WeightEstimateResponse {
  weight: number;          // in grams
  isAiActive: boolean;     // legacy field
  isShoe: boolean;         // true if category is shoes
  category?: string;       // detected/provided category
}
```

## Implementation Strategy

### Phase 1: Translation System (Requirements 1-3, 8-9)
1. Complete German (de) translations in `translations.js`
2. Complete Spanish (es) translations in `translations.js`
3. Implement fallback mechanism in `LanguageContext.js`
4. Add development warnings for missing keys
5. Test round-trip behavior
6. Replace hardcoded category names with translation keys

### Phase 2: Weight Estimation Core (Requirements 4-6, 10)
1. Refactor `/api/calculator/estimate-weight.js` with new algorithm
2. Implement material detection and modifiers
3. Add brand-specific weight overrides
4. Implement size adjustment logic
5. Add comprehensive error handling
6. Add validation for edge cases (empty names, invalid sizes)

### Phase 3: UI Integration (Requirement 7)
1. Update `ProductDetail.jsx` to call weight API
2. Add timeout and fallback logic
3. Add loading state for weight estimation
4. Update calculator UI to use new estimation
5. Ensure consistent weight display across all components

## Testing Strategy

### Translation Testing
- **Manual verification**: Check each section in all 5 languages via UI
- **Coverage check**: Verify all keys present in `en` exist in `de` and `es`
- **Fallback test**: Remove a key from `de`, verify English fallback appears
- **Round-trip test**: Switch language pl→en→de→es→pl, verify no data loss

### Weight Estimation Testing

**Test Cases:**

| Test Case | Input | Expected Output | Requirement |
|-----------|-------|-----------------|-------------|
| Jordan mesh shorts M | `{name: "Jordan mesh shorts", size: "M"}` | 150-220g | R4 |
| EE shorts L | `{name: "EE shorts", size: "L"}` | 165g | R4 |
| Nike shorts M | `{name: "Nike shorts", size: "M"}` | 180-260g | R5 |
| Supreme shorts S | `{name: "Supreme shorts", size: "S"}` | 250-350g | R5 |
| Generic shorts XS | `{name: "shorts", size: "XS"}` | ~225g | R6 |
| Generic shorts XL | `{name: "shorts", size: "XL"}` | ~275g | R6 |
| Empty name | `{name: "", size: "M"}` | 0g | R10 |
| Invalid size | `{name: "shorts", size: "XXXXXXL"}` | 250g (base) | R10 |
| Special chars only | `{name: "!@#$%", size: "M"}` | 0g | R10 |

### Integration Testing
- ProductDetail displays correct weight range for shorts category
- Calculator uses new estimation API
- Weight display updates when language changes
- Timeout fallback works when API is slow/unavailable

## Deployment Considerations

- **Backwards compatibility**: Existing API responses maintain same structure
- **Performance**: Weight estimation should complete in <200ms for 95th percentile
- **Caching**: Consider caching weight estimates by (productName, size, category) tuple
- **Monitoring**: Log weight estimation errors to identify missing patterns
- **Rollback**: Can easily revert to old estimation logic if issues arise

## Non-Functional Requirements

- **Performance**: Translation lookup O(1), weight estimation <200ms
- **Accessibility**: All translated strings support screen readers
- **Maintainability**: Clear separation between brand rules, material rules, and size adjustments
- **Extensibility**: Easy to add new brands, materials, or languages

## Open Questions

1. Should we add user feedback mechanism for incorrect weight estimates?
2. Should weight estimates be cached on the client side?
3. Should we add analytics to track which products get incorrect weight estimates?
4. Do we need automatic translation verification tooling?

## Dependencies

- No new external dependencies required
- Uses existing Next.js API routes
- Uses existing React Context API for translations
- No database schema changes needed
