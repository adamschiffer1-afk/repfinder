# 🔥 Popular Batch Feature - Installation Guide

## Overview
This package contains all the code needed to add a "Popular" batch type to your product catalog with:
- Orange fire-themed badges and buttons
- Filter functionality on products page
- Full admin panel support
- Database migration

---

## 📦 Package Contents

1. **products-page.jsx** - Frontend products page with Popular filter
2. **Products.module.css** - Styles for Popular button and badge
3. **Admin.module.css** - Styles for Popular badge in admin table
4. **admin-products-snippets.txt** - Code snippets for admin panel
5. **add_popular_batch.sql** - Database migration
6. **POPULAR-BATCH-INSTRUCTIONS.md** - This file

---

## 🚀 Installation Steps

### Step 1: Database Migration

**Run this SQL in your Supabase SQL Editor:**

```sql
ALTER TYPE batch_type ADD VALUE 'popular';
```

**What it does:** Adds 'popular' as a valid value to the batch_type enum in your database.

**Verification:**
```sql
SELECT enum_range(NULL::batch_type);
```
Should return: `{best,budget,random,popular}`

---

### Step 2: Update Products Page

**File:** `src/app/(main)/products/page.jsx`

**Replace your entire file with:** `products-page.jsx`

**Key changes:**
- Added Popular filter button (🔥 Popular)
- Filter logic for `batch='popular'`
- Popular badge display on product cards

---

### Step 3: Update Products CSS

**File:** `src/styles/Products.module.css`

**Replace your entire file with:** `Products.module.css`

**Key additions:**
- `.popularPill` - Orange gradient button style
- `.popularBadge` - Orange badge for product cards

---

### Step 4: Update Admin Panel CSS

**File:** `src/styles/Admin.module.css`

**Find the section with batch badge styles (around line 454) and ADD:**

```css
.batchBadge_popular {
  background: linear-gradient(135deg, rgba(255, 100, 50, 0.2) 0%, rgba(255, 150, 50, 0.2) 100%);
  color: #ff9966;
  border: 1px solid rgba(255, 120, 50, 0.5);
  font-weight: 700;
}
```

---

### Step 5: Update Admin Products Page

**File:** `src/app/admin-99x-hsd/products/page.jsx`

**Follow the instructions in:** `admin-products-snippets.txt`

**Summary of changes:**
1. Add Popular option to bulk batch select (~line 1190)
2. Add Popular option to form batch select (~line 1288)
3. Add Popular option to bulk scraper batch select (~line 1447)
4. Add Popular to filter pills array (~line 992)

---

## ✅ Testing

### Test Frontend:
1. Go to `/products` page
2. Click "🔥 Popular" button
3. Should filter products with batch='popular'
4. Products with batch='popular' should show orange "🔥 Popular" badge

### Test Admin:
1. Edit a product
2. Select "Popular 🔥" from batch dropdown
3. Save product
4. Should see orange badge in products table
5. Filter by Popular in admin filters

---

## 🎨 Customization

### Change Colors:
Edit in `Products.module.css`:
```css
.popularPill {
  background: linear-gradient(135deg, rgba(255, 100, 50, 0.2) 0%, rgba(255, 150, 50, 0.2) 100%);
  /* Change these RGBA values */
}

.popularBadge {
  background: linear-gradient(135deg, rgba(255, 100, 50, 0.95) 0%, rgba(255, 150, 50, 0.95) 100%);
  /* Change these RGBA values */
}
```

### Change Icon:
Replace 🔥 emoji with any emoji you want:
- In products page: `🔥 Popular`
- In admin selects: `Popular 🔥`

---

## 🐛 Troubleshooting

### Error: "Something went wrong while saving the product"
**Cause:** Database enum not updated
**Fix:** Run the SQL migration again

### Popular button doesn't filter
**Cause:** Filter logic not updated
**Fix:** Check line ~130 in products/page.jsx - should have:
```javascript
if (selectedCategories.includes('__popular__')) {
  filtered = filtered.filter(product => product.batch === 'popular');
}
```

### Badge doesn't show
**Cause:** CSS not updated
**Fix:** Make sure `.popularBadge` class is in Products.module.css

### Admin select doesn't have Popular
**Cause:** Admin panel not updated
**Fix:** Follow all 4 steps in admin-products-snippets.txt

---

## 📝 Notes

- Popular is treated as a batch type (like Best, Budget, Random)
- Only one batch type per product
- Popular filter uses special `__popular__` category identifier
- Orange theme (#ff9966, #ff6432) for consistency

---

## 🆘 Support

If you encounter issues:
1. Check console for errors (F12)
2. Verify database migration ran successfully
3. Clear browser cache (Ctrl+Shift+Delete)
4. Check all file paths are correct

---

Good luck! 🔥
