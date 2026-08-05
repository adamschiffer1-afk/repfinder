# Tasks

## Task 1: Add Ossbuy converter logic
- Add 'ossbuy' case to convertLink switch statement in src/utils/converter.js
- Generate URL format: https://www.ossbuy.com/product-detail?url={encoded_url}&spider_token=4572&inviteCode=MJH4PLSK
- Use encodeURIComponent for URL encoding
- Test with sample Weidian links

## Task 2: Update SUPPORTED_AGENTS array
- Add Ossbuy entry as first element in SUPPORTED_AGENTS array in src/utils/converter.js
- Set value: 'ossbuy', label: 'Ossbuy', icon: '/images/ossbuy.png'
- Verify logo file exists at /public/images/ossbuy.png

## Task 3: Update default agent in ProductDetail.jsx
- Change useState default from 'kakobuy' to 'ossbuy'
- Change logo default from '/images/kako.png' to '/images/ossbuy.png'
- Add 'Ossbuy': 'ossbuy' to mapping object in useEffect
- Add 'Ossbuy': '/images/ossbuy.png' to logoMapping object in useEffect

## Task 4: Update default agent in Products.jsx
- Change useState default from 'kakobuy' to 'ossbuy'
- Change logo default from '/images/kako.png' to '/images/ossbuy.png'
- Add mapping entries for Ossbuy in useEffect

## Task 5: Update default agent in LinkConverter.jsx
- Change useState default from 'kakobuy' to 'ossbuy'
- Change logo default from '/images/kako.png' to '/images/ossbuy.png'
- Add mapping entries for Ossbuy in useEffect

## Task 6: Create OssbuyBanner component
- Create new file src/components/OssbuyBanner.jsx
- Implement visibility logic with localStorage check (key: 'ossbuyBannerDismissed')
- Add 3-second delay before showing close button using setTimeout
- Implement daily reset logic (compare toDateString())
- Add click handlers for dismiss and CTA button
- CTA button opens https://ossbuy.allapp.link/d9pi65h0b4mnp0ou7sog in new tab

## Task 7: Create banner styles
- Create new file src/styles/OssbuyBanner.module.css
- Implement dark overlay with backdrop blur
- Style banner content with gradient background matching screenshot
- Add close button styles (top-right, 48x48px, appears after 3s)
- Style promo tag with purple gradient
- Style title with -50% discount highlight
- Style CTA button with purple gradient and hover effects
- Add Ossbuy logo display at bottom

## Task 8: Integrate banner into app layout
- Import OssbuyBanner component in main layout or root page
- Add component before main content
- Test banner appears on first visit
- Verify banner dismissed correctly

## Task 9: Test converter functionality
- Test Ossbuy link generation with various Product_Links
- Verify all 8 existing agents still work correctly
- Test URL encoding with special characters
- Test empty/null input handling

## Task 10: Test banner behavior
- Clear localStorage and verify banner shows
- Wait 3 seconds and verify X button appears
- Click X and verify localStorage timestamp saved
- Refresh and verify banner doesn't show again
- Change system date and verify banner shows next day
- Test CTA button opens correct URL in new tab
