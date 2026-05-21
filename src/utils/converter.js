export function detectPlatform(url) {
    const v = String(url || '').toLowerCase();
    if (!v) return 'auto';
    if (v.includes('weidian.com')) return 'weidian';
    if (v.includes('taobao.com')) return 'taobao';
    if (v.includes('1688.com')) return '1688';
    if (v.includes('tmall.com')) return 'tmall';
    return 'unknown';
}

export function extractItemId(url) {
    try {
        const safe = new URL(url);
        const id = safe.searchParams.get('itemID') || safe.searchParams.get('itemId') || safe.searchParams.get('id');
        if (id) return id;
        
        const pathMatch = safe.pathname.match(/\/product\/[a-z0-9_-]+\/(\d+)/i);
        if (pathMatch) return pathMatch[1];
        
        return '';
    } catch {
        const match = String(url || '').match(/(?:itemID|itemId|id)(?:%3D|=)(\d+)/i);
        if (match) return match[1];
        
        const pathMatch = String(url || '').match(/\/product\/[a-z0-9_-]+\/(\d+)/i);
        return pathMatch ? pathMatch[1] : '';
    }
}

export function convertLink(originalUrl, target) {
    if (!originalUrl) return '';
    
    // Extract raw URL from Kakobuy wrapper parameter if present
    let cleanUrl = originalUrl;
    try {
        const safe = new URL(originalUrl);
        const nestedUrl = safe.searchParams.get('url');
        if (nestedUrl) {
            cleanUrl = nestedUrl;
        }
    } catch {}

    // Simple extraction for common platforms
    let itemId = extractItemId(cleanUrl);
    if (!itemId) return cleanUrl; // Fallback if no ID found

    switch (target) {
        case 'kakobuy': 
            return `https://www.kakobuy.com/item/details?url=${encodeURIComponent(cleanUrl)}&affcode=xfrostyy`;
        case 'usfans': 
            return `https://www.usfans.com/product/3/${itemId}`;
        case 'allchinabuy': 
            return `https://www.acbuy.com/product/?id=${itemId}&source=WD`;
        case 'litbuy': 
            return `https://litbuy.com/product/weidian/${itemId}`;
        case 'mulebuy': 
            return `https://mulebuy.com/product?id=${itemId}&platform=WEIDIAN`;
        case 'oopbuy': 
            return `https://oopbuy.com/product/weidian/${itemId}`;
        case 'gtbuy': 
            return `https://www.gtbuy.com/product/weidian/${itemId}`;
        case 'hipobuy':
            return `https://hipobuy.com/product/weidian/${itemId}`;
        default: 
            return cleanUrl;
    }
}

export const SUPPORTED_AGENTS = [
    { value: 'kakobuy', label: 'KakoBuy', icon: '/images/kako.png' },
    { value: 'usfans', label: 'USFans', icon: '/images/usfans.png' },
    { value: 'allchinabuy', label: 'AllChinaBuy', icon: '/images/allchinabuy.png' },
    { value: 'litbuy', label: 'LitBuy', icon: '/images/litbuy.png' },
    { value: 'mulebuy', label: 'MuleBuy', icon: '/images/Mulebuy.jpg' },
    { value: 'oopbuy', label: 'OopBuy', icon: '/images/oopbuy.png' },
    { value: 'gtbuy', label: 'GTBuy', icon: '/images/gtbuy.png' },
    { value: 'hipobuy', label: 'HipoBuy', icon: '/images/Hipobuy.png' },
];
