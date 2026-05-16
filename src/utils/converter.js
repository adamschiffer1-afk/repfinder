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
        return safe.searchParams.get('itemID') || safe.searchParams.get('itemId') || safe.searchParams.get('id');
    } catch {
        const match = String(url || '').match(/(?:itemID|itemId|id)(?:%3D|=)(\d+)/i);
        return match ? match[1] : '';
    }
}

export function convertLink(originalUrl, target) {
    if (!originalUrl) return '';
    
    // Simple extraction for common platforms
    let itemId = extractItemId(originalUrl);
    if (!itemId) return originalUrl; // Fallback if no ID found

    switch (target) {
        case 'kakobuy': 
            return `https://www.kakobuy.com/item/details?url=${encodeURIComponent(originalUrl)}&affcode=xfrostyy`;
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
        default: 
            return originalUrl;
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
];
