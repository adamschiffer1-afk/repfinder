# Template Import Feature - Installation Instructions

This package contains the Template Import functionality that allows bulk product import via:
- **Paste Text** - Copy/paste from spreadsheets (Name + Link columns)
- **Upload File** - Upload CSV/TXT files  
- **Google Sheets URL** - Direct import from Google Sheets

## 📦 Package Contents

1. **TemplateImportModal.jsx** - Complete React component with modal UI
2. **template-helpers.js** - Helper functions for parsing data
3. **template-api-route.js** - API endpoint code for `/api/admin/scrape/template`
4. **sheets-api-route.js** - API endpoint code for `/api/admin/scrape/sheets`
5. **Admin.module.css** - CSS styles (excerpt with Template Import styles)
6. **TEMPLATE-IMPORT-INSTRUCTIONS.md** - This file

## 🚀 Quick Start

### Step 1: Install Dependencies

Make sure you have these dependencies in your `package.json`:

```bash
npm install react next
```

### Step 2: Copy Files

1. **Component**: Copy `TemplateImportModal.jsx` to your components folder (e.g., `/src/components/admin/`)
2. **Helpers**: Copy `template-helpers.js` to your utils folder (e.g., `/src/utils/`)
3. **API Routes**: 
   - Copy `template-api-route.js` → `/src/app/api/admin/scrape/template/route.js`
   - Copy `sheets-api-route.js` → `/src/app/api/admin/scrape/sheets/route.js`
4. **CSS**: Add the styles from `Admin.module.css` to your existing admin styles

### Step 3: Import and Use Component

In your admin products page:

```jsx
import { useState } from 'react';
import TemplateImportModal from '@/components/admin/TemplateImportModal';

export default function AdminProducts() {
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const handleTemplateImportComplete = (result) => {
    console.log('Import completed:', result);
    // Refresh your products list here
    fetchProducts();
  };

  return (
    <div>
      <button onClick={() => setShowTemplateModal(true)}>
        Template Import
      </button>

      {showTemplateModal && (
        <TemplateImportModal 
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          onImportComplete={handleTemplateImportComplete}
        />
      )}
    </div>
  );
}
```

## 🎯 Features

### Import Methods

**1. Paste Text Mode**
- Copy data from Google Sheets or Excel (Ctrl+C)
- Paste into textarea (Ctrl+V)
- Format: `Product Name [TAB] Weidian Link`
- Example:
  ```
  AJ1 High-1    https://weidian.com/item.html?itemID=123
  OG Batch Air Jordan    https://weidian.com/item.html?itemID=456
  ```

**2. Upload File Mode**
- Supports `.csv`, `.txt`, `.tsv` files
- Format: CSV with Name and Link columns
- Auto-detects tab or comma separation

**3. Google Sheets URL Mode**
- Paste public Google Sheets URL
- Format: `https://docs.google.com/spreadsheets/d/.../edit`
- Sheet must be public or viewable by anyone
- Fetches data via CSV export

### Import Modes

**Add / Refresh**
- Adds new products
- Updates existing products (if URL matches)
- Doesn't delete anything

**Replace Pinned**
- Deletes ALL pinned products first
- Then adds new products from template
- Requires typing "REPLACE" to confirm
- ⚠️ Warning: Destructive operation

**Replace All Catalog**
- Deletes ALL products first
- Then adds new products from template  
- Requires typing "REPLACE" to confirm
- ⚠️⚠️ Warning: Very destructive operation

### Batch Selection

Choose batch type for imported products:
- **Best** - Premium quality
- **Budget** - Economy option
- **Random** - Mixed/unspecified
- **Popular** 🔥 - Trending items

## 📝 Data Format Requirements

### Text/Paste Format
```
Product Name [TAB] Weidian URL
Product Name [TAB] Weidian URL
```

### CSV Format
```csv
Name,Link
AJ1 High-1,https://weidian.com/item.html?itemID=123
OG Batch Air Jordan,https://weidian.com/item.html?itemID=456
```

### Google Sheets Format
| Name | Link |
|------|------|
| AJ1 High-1 | https://weidian.com/item.html?itemID=123 |
| OG Batch Air Jordan | https://weidian.com/item.html?itemID=456 |

## 🔧 Customization

### Change API Endpoints

In `TemplateImportModal.jsx`, update the API URLs:

```jsx
// Line ~120
const res = await fetch('/api/admin/scrape/template', {
  // Change to your endpoint
});
```

### Change Progress Display

In `TemplateImportModal.jsx`, modify the progress bar section (lines ~300-400):

```jsx
{bulkProgress.total > 0 && (
  <div>
    {/* Customize progress UI here */}
  </div>
)}
```

### Adjust Validation

In `template-helpers.js`, modify `parseTemplateData()`:

```javascript
function parseTemplateData(text) {
  // Add custom validation logic
  if (name && url && url.includes('your-domain.com')) {
    products.push({ name, url });
  }
}
```

## 🌐 Translation Support

The component uses the `useAdminTranslation` hook for i18n. To customize:

1. Replace `t()` function calls with your i18n solution
2. Or create your own translation hook:

```jsx
function useAdminTranslation() {
  const t = (key) => {
    const translations = {
      'Template Import': 'Template Import',
      'Paste Text': 'Paste Text',
      // Add more translations
    };
    return translations[key] || key;
  };
  return { t };
}
```

## 🐛 Troubleshooting

### "No valid template data found"
- **Cause**: Data format doesn't match expected format
- **Solution**: Ensure data has Name and Link columns separated by TAB or comma

### "Failed to load Google Sheets data"
- **Cause**: Sheet is not public or URL is incorrect
- **Solution**: 
  1. Make sheet public: File → Share → Anyone with the link
  2. Check URL format matches: `https://docs.google.com/spreadsheets/d/{id}/edit`

### Progress shows "Processing" but nothing happens
- **Cause**: API endpoint not responding
- **Solution**: Check API routes are correctly installed and server is running

### Import completes but products don't appear
- **Cause**: Refresh logic not called
- **Solution**: Ensure `onImportComplete` callback refreshes your product list

## 📊 Progress Tracking

The component shows real-time progress:

- **Processing**: Current / Total items
- **✓ Successes**: Successfully imported items
- **✗ Failures**: Failed items (shows error logs)
- **Progress Bar**: Visual percentage complete

Progress updates every ~500ms per product during import.

## 🔐 Security Notes

1. **Admin-Only**: Template Import should only be accessible to admin users
2. **Validation**: All URLs are validated before scraping
3. **Confirmation**: Replace modes require typing "REPLACE" to prevent accidents
4. **Rate Limiting**: Consider adding rate limits to API endpoints

## 💡 Tips

1. **Large Imports**: For 100+ products, use "Add / Refresh" mode to avoid timeouts
2. **Testing**: Test with 2-3 products first before bulk import
3. **Backup**: Always backup your database before using "Replace" modes
4. **Google Sheets**: Keep sheet simple (just Name and Link columns) for best results

## 📞 Support

If you encounter issues:
1. Check browser console for error messages
2. Verify API endpoints are responding
3. Test with a small dataset first
4. Ensure all dependencies are installed

## 🎉 Success!

Once installed, you should see:
- Modal with 3 import method tabs
- Mode selection (Add/Refresh, Replace Pinned, Replace All)
- Batch dropdown
- Real-time progress tracking
- Success/failure logs

Happy importing! 🚀
