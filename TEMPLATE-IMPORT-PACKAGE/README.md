# 📦 Template Import Feature Package

Complete standalone package for bulk product import functionality with 3 import methods and real-time progress tracking.

## ✨ Features

### 3 Import Methods
- **📝 Paste Text** - Copy/paste from spreadsheets (Name + Link)
- **📁 Upload File** - CSV/TXT file upload
- **🔗 Google Sheets URL** - Direct import from public Google Sheets

### 3 Import Modes
- **Add / Refresh** - Adds new products or updates existing (safe)
- **Replace Pinned** - Deletes pinned products first, then imports (⚠️ requires confirmation)
- **Replace All Catalog** - Deletes ALL products first, then imports (⚠️⚠️ requires confirmation)

### Additional Features
- Batch selection (Best, Budget, Random, Popular 🔥)
- Real-time progress tracking with success/failure counts
- Detailed error logs for failed imports
- Product name scraping from Weidian
- Automatic category detection
- Unique slug generation
- Affiliate link integration

## 📁 Package Contents

```
TEMPLATE-IMPORT-PACKAGE/
├── README.md                           # This file
├── TEMPLATE-IMPORT-INSTRUCTIONS.md     # Detailed installation guide
├── TemplateImportModal.jsx             # Main React component
├── template-helpers.js                 # Parsing utilities
├── template-api-route.js               # POST /api/admin/scrape/template
├── sheets-api-route.js                 # GET /api/admin/scrape/sheets
└── styles-excerpt.css                  # CSS styles
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install react next axios cheerio @supabase/supabase-js
```

### 2. Copy Files

```bash
# Component
cp TemplateImportModal.jsx src/components/admin/

# Helpers
cp template-helpers.js src/utils/

# API Routes
cp template-api-route.js src/app/api/admin/scrape/template/route.js
cp sheets-api-route.js src/app/api/admin/scrape/sheets/route.js

# Styles (add to your existing CSS module)
cat styles-excerpt.css >> src/styles/Admin.module.css
```

### 3. Set Environment Variables

Add to `.env.local`:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Use Component

```jsx
import { useState } from 'react';
import TemplateImportModal from '@/components/admin/TemplateImportModal';

export default function AdminProductsPage() {
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const handleImportComplete = (result) => {
    console.log('Import result:', result);
    // Refresh your products list
    fetchProducts();
  };

  const showToast = (message, type) => {
    console.log(`${type}: ${message}`);
    // Or use your toast library
  };

  return (
    <>
      <button onClick={() => setShowTemplateModal(true)}>
        Template Import
      </button>

      {showTemplateModal && (
        <TemplateImportModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          onImportComplete={handleImportComplete}
          showToast={showToast}
        />
      )}
    </>
  );
}
```

## 📊 Data Format

### Paste Text Format
```
Product Name [TAB] Weidian URL
Product Name [TAB] Weidian URL
```

Example:
```
AJ1 High-1	https://weidian.com/item.html?itemID=123
OG Batch Air Jordan	https://weidian.com/item.html?itemID=456
```

### CSV Format
```csv
Name,Link
AJ1 High-1,https://weidian.com/item.html?itemID=123
OG Batch Air Jordan,https://weidian.com/item.html?itemID=456
```

### Google Sheets
Just copy/paste from Google Sheets (Ctrl+C, Ctrl+V) or use the URL method.

| Name | Link |
|------|------|
| AJ1 High-1 | https://weidian.com/item.html?itemID=123 |
| OG Batch Air Jordan | https://weidian.com/item.html?itemID=456 |

## 🎯 How It Works

1. **Parse Input** - Extracts product names and Weidian URLs
2. **Validate URLs** - Checks for valid Weidian itemIDs
3. **Scrape Data** - Fetches price, image, category from Weidian
4. **Process Names** - Uses your custom names from spreadsheet
5. **Generate Slugs** - Creates unique URL-friendly slugs
6. **Add Affiliate Links** - Builds KakoBuy affiliate links
7. **Save to Database** - Inserts into Supabase products table
8. **Return Results** - Shows success/failure for each product

## 🔧 Customization

### Change API Endpoint

```jsx
<TemplateImportModal
  apiEndpoint="/api/your-custom-endpoint"
  // ... other props
/>
```

### Customize Category Detection

Edit `detectCategory()` function in `template-api-route.js`:

```javascript
function detectCategory(name) {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('your-keyword')) return 'your-category';
  // Add your custom logic
  
  return 'accessories';
}
```

### Customize Affiliate Links

Edit the affiliate link generation in `template-api-route.js`:

```javascript
const affiliateLink = `https://your-agent.com/item?url=${encodeURIComponent(weidianUrl)}&code=${affiliateCode}`;
```

## 🐛 Troubleshooting

### "No valid template data found"
- Ensure data is tab-separated (Name [TAB] URL)
- Check URLs contain "weidian.com"

### "Failed to load Google Sheets data"
- Make sheet public: File → Share → Anyone with the link
- Use the share URL, not the edit URL

### Import hangs or times out
- Try fewer products at once (20-30 max)
- Check your server logs for errors
- Verify Supabase credentials

### Products don't appear after import
- Check `onImportComplete` callback
- Verify products table exists in Supabase
- Check browser console for errors

## 📝 Database Schema

Required `products` table columns:

```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price DECIMAL(10,2),
  image TEXT,
  category TEXT,
  batch TEXT,
  link TEXT,
  clicks INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  pinned_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔐 Security Notes

1. **Admin Only** - This feature should be protected by authentication
2. **Rate Limiting** - Consider adding rate limits to prevent abuse
3. **Validation** - All URLs are validated before scraping
4. **Confirmation** - Replace modes require typing "REPLACE"
5. **Service Role Key** - Keep your Supabase service role key secret

## 💡 Tips

1. **Test First** - Try with 2-3 products before bulk import
2. **Backup** - Always backup database before using Replace modes
3. **Organize Data** - Keep spreadsheet simple (Name + Link only)
4. **Check Results** - Review the logs after import completes
5. **Use Add/Refresh** - Safest mode for regular updates

## 📞 Support

For issues or questions:
1. Check `TEMPLATE-IMPORT-INSTRUCTIONS.md` for detailed guide
2. Review browser console for error messages
3. Check server logs for API errors
4. Verify all files are correctly installed

## 🎉 Success Checklist

- [ ] All files copied to correct locations
- [ ] Dependencies installed
- [ ] Environment variables configured
- [ ] Modal opens when button clicked
- [ ] Can paste text and see product count
- [ ] Can upload CSV file
- [ ] Can fetch Google Sheets data
- [ ] Import completes successfully
- [ ] Products appear in database
- [ ] Progress tracking shows correctly

Happy importing! 🚀
