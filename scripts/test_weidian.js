const axios = require('axios');

async function test() {
    try {
        const r = await axios.get('https://weidian.com/item.html?itemID=7768964356', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept-Language': 'zh-CN,zh;q=0.9'
            },
            timeout: 20000
        });
        const html = r.data;
        
        // Look for JSON data in script tags
        const scriptMatches = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
        console.log('Number of script tags:', scriptMatches.length);
        
        for (let i = 0; i < scriptMatches.length; i++) {
            const s = scriptMatches[i];
            if (s.includes('itemTitle') || s.includes('item_title') || s.includes('"name"') || 
                s.includes('itemInfo') || s.includes('geilicdn')) {
                console.log(`\n=== Script ${i} (first 2000 chars) ===`);
                console.log(s.substring(0, 2000));
            }
        }
        
        // Try to find name in other patterns
        const nameMatch = html.match(/"itemTitle"\s*:\s*"([^"]+)"/);
        const nameMatch2 = html.match(/"name"\s*:\s*"([^"]+)"/);
        const priceMatch = html.match(/"price"\s*:\s*"?(\d+\.?\d*)"/);
        const imgsMatch = html.match(/"imgs"\s*:\s*(\[[^\]]+\])/);
        
        console.log('\nnameMatch1:', nameMatch ? nameMatch[1] : null);
        console.log('nameMatch2:', nameMatch2 ? nameMatch2[1] : null);
        console.log('priceMatch:', priceMatch ? priceMatch[1] : null);
        console.log('imgsMatch:', imgsMatch ? imgsMatch[1].substring(0, 200) : null);
        
        // Look for all image URLs from geilicdn (product images)
        const imgUrls = [...new Set(html.match(/https:\/\/si\.geilicdn\.com\/[^"'\s,)>]+\.(jpg|jpeg|png|webp)/gi))];
        console.log('\nAll product images:', imgUrls.slice(0, 10));
        
    } catch(e) {
        console.error('Error:', e.message);
    }
}

test();
