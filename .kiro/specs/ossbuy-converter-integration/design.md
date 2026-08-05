# Design Document

## Overview

This document describes the technical design for integrating Ossbuy as a shopping agent converter and setting it as the default agent in RepFinder. The design also includes a promotional banner system to display Ossbuy's -50% shipping discount offer once per day.

## Architecture

### Component Changes

1. **converter.js** - Add Ossbuy conversion logic and update SUPPORTED_AGENTS array
2. **ProductDetail.jsx** - Update default agent from 'kakobuy' to 'ossbuy'
3. **Products.jsx** - Update default agent from 'kakobuy' to 'ossbuy'
4. **LinkConverter.jsx** - Update default agent from 'kakobuy' to 'ossbuy'
5. **OssbuyBanner.jsx** (new) - Promotional banner component with daily display logic

### Data Flow

```
User visits site
    ↓
Check localStorage for 'ossbuyBannerDismissed'
    ↓
If not dismissed today → Display Banner (after 3s show X button)
    ↓
User dismisses or clicks CTA → Store timestamp in localStorage
    ↓
Main app loads with Ossbuy as default agent
    ↓
User selects product → convertLink generates Ossbuy affiliate URL
```

## Implementation Details

### 1. Converter Function Update

**File:** `src/utils/converter.js`

Add new case to convertLink switch statement:

```javascript
case 'ossbuy':
    return `https://www.ossbuy.com/product-detail?url=${encodeURIComponent(cleanUrl)}&spider_token=4572&inviteCode=MJH4PLSK`;
```

Update SUPPORTED_AGENTS array:

```javascript
export const SUPPORTED_AGENTS = [
    { value: 'ossbuy', label: 'Ossbuy', icon: '/images/ossbuy.png' },  // First position
    { value: 'kakobuy', label: 'KakoBuy', icon: '/images/kako.png' },
    // ... rest of agents
];
```

### 2. Default Agent Updates

**Files:** 
- `src/components/ProductDetail.jsx`
- `src/components/Products.jsx`
- `src/components/LinkConverter.jsx`

Change default state initialization:

```javascript
// BEFORE
const [preferredAgent, setPreferredAgent] = useState('kakobuy');
const [preferredAgentLogo, setPreferredAgentLogo] = useState('/images/kako.png');

// AFTER
const [preferredAgent, setPreferredAgent] = useState('ossbuy');
const [preferredAgentLogo, setPreferredAgentLogo] = useState('/images/ossbuy.png');
```

Update mapping objects in useEffect:

```javascript
const mapping = {
    'Ossbuy': 'ossbuy',
    'KakoBuy': 'kakobuy',
    // ... rest
};

const logoMapping = {
    'Ossbuy': '/images/ossbuy.png',
    'KakoBuy': '/images/kako.png',
    // ... rest
};
```

### 3. Promotional Banner Component

**File:** `src/components/OssbuyBanner.jsx` (new)

Component structure:

```javascript
'use client';

import { useState, useEffect } from 'react';
import styles from '@/styles/OssbuyBanner.module.css';

export default function OssbuyBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showCloseButton, setShowCloseButton] = useState(false);

  useEffect(() => {
    // Check if banner was dismissed today
    const checkBannerStatus = () => {
      try {
        const dismissedDate = localStorage.getItem('ossbuyBannerDismissed');
        if (dismissedDate) {
          const today = new Date().toDateString();
          const dismissed = new Date(dismissedDate).toDateString();
          if (today === dismissed) {
            return; // Don't show banner
          }
        }
        setIsVisible(true);
        
        // Show close button after 3 seconds
        setTimeout(() => {
          setShowCloseButton(true);
        }, 3000);
      } catch (err) {
        setIsVisible(true);
        setTimeout(() => setShowCloseButton(true), 3000);
      }
    };

    checkBannerStatus();
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem('ossbuyBannerDismissed', new Date().toISOString());
    } catch (err) {
      console.error('Failed to save banner dismissal');
    }
    setIsVisible(false);
  };

  const handleCTAClick = () => {
    handleDismiss();
    window.open('https://ossbuy.allapp.link/d9pi65h0b4mnp0ou7sog', '_blank');
  };

  if (!isVisible) return null;

  return (
    <div className={styles.bannerOverlay}>
      <div className={styles.bannerContent}>
        {showCloseButton && (
          <button 
            className={styles.closeButton}
            onClick={handleDismiss}
            aria-label="Zamknij"
          >
            ×
          </button>
        )}
        
        <img 
          src="/logo.png" 
          alt="RepFinder" 
          className={styles.logo}
        />
        
        <div className={styles.promoTag}>
          🔥 SPECJALNA OFERTA 🔥
        </div>
        
        <h2 className={styles.title}>
          Obecnie <span className={styles.discount}>-50%</span> na wysyłkę w OssBuy!
        </h2>
        
        <p className={styles.subtitle}>
          Zarejestruj się teraz i skorzystaj z tej wyjątkowej okazji przed jej wygaśnięciem.
        </p>
        
        <button 
          className={styles.ctaButton}
          onClick={handleCTAClick}
        >
          Zarejestruj się w OssBuy →
        </button>
        
        <img 
          src="/images/ossbuy.png" 
          alt="Ossbuy" 
          className={styles.agentLogo}
        />
      </div>
    </div>
  );
}
```

### 4. Banner Styles

**File:** `src/styles/OssbuyBanner.module.css` (new)

Styles matching the screenshot design:

```css
.bannerOverlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(8px);
}

.bannerContent {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 24px;
  padding: 48px 40px;
  max-width: 600px;
  width: 90%;
  position: relative;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.closeButton {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  font-size: 32px;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.closeButton:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.logo {
  width: 60px;
  height: 60px;
  margin-bottom: 20px;
}

.promoTag {
  display: inline-block;
  background: linear-gradient(90deg, #7c3aed 0%, #a855f7 100%);
  color: #fff;
  padding: 8px 24px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 24px;
  letter-spacing: 0.5px;
}

.title {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 16px;
  line-height: 1.3;
}

.discount {
  background: linear-gradient(90deg, #a855f7 0%, #7c3aed 100%);
  padding: 4px 16px;
  border-radius: 8px;
  font-size: 36px;
}

.subtitle {
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;
  margin-bottom: 32px;
  line-height: 1.6;
}

.ctaButton {
  background: linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%);
  color: #fff;
  border: none;
  padding: 18px 48px;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  margin-bottom: 24px;
}

.ctaButton:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(139, 92, 246, 0.4);
}

.agentLogo {
  width: 120px;
  height: auto;
  margin-top: 16px;
  opacity: 0.9;
}
```

### 5. Integration Points

Add OssbuyBanner to main layout:

**File:** `src/app/layout.js` or main page component

```javascript
import OssbuyBanner from '@/components/OssbuyBanner';

export default function Layout({ children }) {
  return (
    <>
      <OssbuyBanner />
      {children}
    </>
  );
}
```

## Testing Strategy

### Unit Tests

1. **convertLink function**
   - Test Ossbuy URL generation with valid Product_Link
   - Test URL encoding
   - Test empty/null input handling
   - Test all existing agents still work

2. **OssbuyBanner component**
   - Test initial visibility logic
   - Test close button delay (3 seconds)
   - Test localStorage persistence
   - Test daily reset logic

### Integration Tests

1. Test default agent selection on page load
2. Test banner display on first visit
3. Test banner not showing after dismissal (same day)
4. Test banner showing again next day

### Manual Testing

1. Clear localStorage and verify banner appears
2. Wait 3 seconds and verify X button appears
3. Click X and verify banner dismissed
4. Refresh page and verify banner doesn't appear
5. Change system date and verify banner appears again
6. Test Ossbuy link generation from product page
7. Verify Ossbuy appears first in agent list

## Security Considerations

1. **URL Encoding**: Use encodeURIComponent to prevent URL injection
2. **XSS Prevention**: No user input rendered in banner
3. **localStorage**: Graceful fallback if unavailable
4. **External Links**: Use rel="noopener noreferrer" on registration link

## Performance

- Banner component renders conditionally (only when needed)
- localStorage check is synchronous and fast
- No external API calls
- CSS animations use GPU-accelerated properties

## Rollback Plan

If issues arise:
1. Remove OssbuyBanner component import
2. Revert default agent to 'kakobuy' in all components
3. Remove 'ossbuy' case from convertLink switch statement
4. Remove Ossbuy entry from SUPPORTED_AGENTS array
