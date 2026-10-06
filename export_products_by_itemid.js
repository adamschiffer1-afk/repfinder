const axios = require('axios');

// Item IDs z tych 30 linków
const itemIds = [
  '7834112554', '7833981948', '7831144185', '7831078907', '7830908323',
  '7831146261', '7834069264', '7834098740', '7834173806', '7834144280',
  '7831142233', '7831098699', '7831057317', '7834138320', '7831165807',
  '7831122475', '7830940093', '7831106567', '7834071178', '7831104557',
  '7831078911', '7831148189', '7834090886', '7831136245', '7831124371',
  '7833916324', '7831065057', '7831090737', '7831082917', '7831066997'
];

async function main() {
  console.log('🔍 Szukam produktów w bazie danych po Item ID...\n');
  
  try {
    // Pobierz wszystkie produkty ze strony
    const response = await axios.get('http://localhost:3000/api/products');
    const allProducts = response.data;
    
    console.log(`📦 Znaleziono ${allProducts.length} produktów w bazie\n`);
    
    // Znajdź produkty które zawierają te Item IDs w linku
    const matchedProducts = [];
    
    itemIds.forEach((itemId, index) => {
      const found = allProducts.find(p => p.link && p.link.includes(`itemID=${itemId}`));
      
      if (found) {
        matchedProducts.push({
          id: index + 1,
          itemId,
          name: found.name,
          price: found.price,
          category: found.category,
          batch: found.batch,
          isPinned: found.isPinned,
          pinnedOrder: found.pinnedOrder,
          link: found.link,
          dbId: found.id || found._id
        });
        console.log(`✓ [${index + 1}/30] ${itemId}: ${found.name}`);
      } else {
        console.log(`✗ [${index + 1}/30] ${itemId}: NIE ZNALEZIONO`);
        matchedProducts.push({
          id: index + 1,
          itemId,
          name: 'NIE ZNALEZIONO',
          link: `https://weidian.com/item.html?itemID=${itemId}`
        });
      }
    });
    
    const foundCount = matchedProducts.filter(p => p.name !== 'NIE ZNALEZIONO').length;
    console.log(`\n📊 Znaleziono: ${foundCount}/30 produktów\n`);
    
    // Stwórz backup z nazwami
    let backup = `# 🔖 BACKUP - 30 Produktów "Popular" (Z NAZWAMI Z BAZY)

**Data**: ${new Date().toLocaleString('pl-PL')}
**Znalezionych**: ${foundCount}/30
**Batch docelowy**: popular

---

## 📋 Lista produktów

`;

    matchedProducts.forEach(p => {
      if (p.name !== 'NIE ZNALEZIONO') {
        backup += `### ${p.id}. ${p.name}
- **Cena**: ${p.price} ¥
- **Kategoria**: ${p.category}
- **Batch**: ${p.batch} → **popular** (zmienić!)
- **Przypięty**: ${p.isPinned ? 'Tak' : 'Nie'}
- **Pozycja**: ${p.pinnedOrder}
- **Item ID**: ${p.itemId}
- **DB ID**: ${p.dbId}
- **Link**: ${p.link}

`;
      } else {
        backup += `### ${p.id}. ❌ NIE ZNALEZIONO
- **Item ID**: ${p.itemId}
- **Link**: ${p.link}
- Status: Trzeba dodać ręcznie

`;
      }
    });
    
    backup += `---

## 🔄 Co zrobić z tym backupem?

### Produkty które SĄ w bazie:
Te produkty już masz dodane! Musisz tylko:
1. Zmienić batch na "popular"
2. Jeśli nie są przypięte - przypiąć je

### Produkty których NIE MA:
Te musisz dodać ręcznie przez Template Import lub Bulk Scraper.

---

## 📝 Template Import (dla brakujących)

`;

    const missing = matchedProducts.filter(p => p.name === 'NIE ZNALEZIONO');
    if (missing.length > 0) {
      backup += `\`\`\`\n`;
      missing.forEach(p => {
        backup += `${p.link}\tpopular\n`;
      });
      backup += `\`\`\`\n\n`;
    } else {
      backup += `✅ Wszystkie produkty są w bazie!\n\n`;
    }
    
    backup += `## 💾 JSON Export

\`\`\`json
${JSON.stringify(matchedProducts, null, 2)}
\`\`\`
`;

    const fs = require('fs');
    fs.writeFileSync('BACKUP_PRODUCTS_FROM_DB.md', backup);
    fs.writeFileSync('BACKUP_PRODUCTS_FROM_DB.json', JSON.stringify(matchedProducts, null, 2));
    
    console.log('✅ Backup utworzony:');
    console.log('   - BACKUP_PRODUCTS_FROM_DB.md');
    console.log('   - BACKUP_PRODUCTS_FROM_DB.json\n');
    
    if (foundCount === 30) {
      console.log('🎉 Wszystkie 30 produktów znalezione w bazie!');
      console.log('   Teraz możesz zmienić ich batch na "popular"');
    } else {
      console.log(`⚠️  Brakuje ${30 - foundCount} produktów - trzeba je dodać ręcznie`);
    }
    
  } catch (error) {
    console.error('❌ Błąd:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   Upewnij się że dev server działa: npm run dev');
    }
  }
}

main();
