'use client';
import { useState, useRef, useEffect } from 'react';
import styles from '@/styles/LinkConverter.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSearch,
    faCopy,
    faExternalLinkAlt,
    faCheck,
    faChevronDown,
    faArrowRight,
    faLink
} from '@fortawesome/free-solid-svg-icons';

// ============================================================
// CONVERTER LOGIC
// ============================================================

function detectPlatform(url) {
    const v = String(url || '').toLowerCase();
    if (!v) return 'auto';
    if (v.includes('weidian.com')) return 'weidian';
    if (v.includes('kakobuy.com') || v.includes('m.kakobuy.com')) return 'kakobuy';
    if (v.includes('usfans.com')) return 'usfans';
    if (v.includes('acbuy.com') || v.includes('allchinabuy.com')) return 'allchinabuy';
    if (v.includes('litbuy.com')) return 'litbuy';
    if (v.includes('mulebuy.com')) return 'mulebuy';
    if (v.includes('oopbuy.com')) return 'oopbuy';
    if (v.includes('gtbuy.com')) return 'gtbuy';
    if (v.includes('hipobuy.com')) return 'hipobuy';
    return 'unknown';
}

function normalizeUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(raw)) return `https://${raw}`;
    return raw;
}

function safeUrl(value) {
    try { return new URL(value); } catch { return null; }
}

function deepDecode(value, rounds = 4) {
    let result = String(value || '');
    for (let i = 0; i < rounds; i++) {
        try {
            const decoded = decodeURIComponent(result);
            if (decoded === result) break;
            result = decoded;
        } catch { break; }
    }
    return result;
}

function extractWeidianLikeUrlFromText(value) {
    const decoded = deepDecode(String(value || ''));
    const weidianMatch = decoded.match(/https?:\/\/(?:www\.)?weidian\.com\/item\.html\?[^ \n\r"'<>]*/i);
    if (weidianMatch) return cleanupExtractedUrl(weidianMatch[0]);
    const genericUrlMatch = decoded.match(/https?:\/\/[^ \n\r"'<>]+/i);
    if (genericUrlMatch) return cleanupExtractedUrl(genericUrlMatch[0]);
    return '';
}

function cleanupExtractedUrl(url) {
    let cleaned = String(url || '').trim();
    cleaned = cleaned.replace(/&affcode=[^&]+/gi, '');
    cleaned = cleaned.replace(/[),.;]+$/g, '');
    const itemId = extractWeidianItemId(cleaned);
    if (itemId) return buildWeidianUrl(itemId);
    return cleaned;
}

function extractOriginalUrlFromAnyAgent(inputUrl) {
    const normalized = normalizeUrl(inputUrl);
    const url = safeUrl(normalized);
    if (!url) return extractWeidianLikeUrlFromText(normalized);
    const candidateKeys = ['url', 'itemUrl', 'goodsUrl', 'link', 'target', 'redirect', 'redirectUrl', 'shopUrl'];
    for (const key of candidateKeys) {
        const value = url.searchParams.get(key);
        if (!value) continue;
        const deep = deepDecode(value);
        const directFound = extractWeidianLikeUrlFromText(deep);
        if (directFound) return directFound;
        const normalizedValue = normalizeUrl(deep);
        if (normalizedValue.startsWith('http')) return normalizedValue;
    }
    return extractWeidianLikeUrlFromText(normalized);
}

function extractWeidianItemId(url) {
    const safe = safeUrl(url);
    if (safe) {
        const itemId = safe.searchParams.get('itemID') || safe.searchParams.get('itemId') || safe.searchParams.get('id');
        if (itemId && /^\d+$/.test(itemId)) return itemId;
    }
    const match = String(url || '').match(/itemID(?:%3D|=)(\d+)/i);
    return match ? match[1] : '';
}

function extractKakoBuyItemId(url) {
    const embedded = extractOriginalUrlFromAnyAgent(url);
    const embeddedId = extractWeidianItemId(embedded);
    if (embeddedId) return embeddedId;
    const match = String(url || '').match(/itemID%3D(\d+)/i);
    return match ? match[1] : '';
}

function extractUsFansItemId(url) {
    const match = String(url || '').match(/\/product\/\d+\/(\d+)/i);
    return match ? match[1] : '';
}

function extractAllChinaBuyItemId(url) {
    const safe = safeUrl(url);
    if (!safe) return '';
    const id = safe.searchParams.get('id');
    if (id && /^\d+$/.test(id)) return id;
    return '';
}

function extractLitBuyItemId(url) {
    const match = String(url || '').match(/\/product\/[a-z0-9_-]+\/(\d+)/i);
    return match ? match[1] : '';
}

function extractMulebuyItemId(url) {
    const safe = safeUrl(url);
    if (!safe) return '';
    const id = safe.searchParams.get('id');
    if (id && /^\d+$/.test(id)) return id;
    return '';
}

function extractOopbuyItemId(url) {
    const match = String(url || '').match(/\/product\/[a-z0-9_-]+\/(\d+)/i);
    return match ? match[1] : '';
}

function extractGtbuyItemId(url) {
    const match = String(url || '').match(/\/product\/[a-z0-9_-]+\/(\d+)/i);
    return match ? match[1] : '';
}

function extractHipoBuyItemId(url) {
    const match = String(url || '').match(/\/product\/[a-z0-9_-]+\/(\d+)/i);
    return match ? match[1] : '';
}

function extractLitBuySource(url) {
    const match = String(url || '').match(/\/product\/([a-z0-9_-]+)\//i);
    if (!match) return 'unknown';
    return match[1].toLowerCase() === 'weidian' ? 'weidian' : match[1].toLowerCase();
}

function buildWeidianUrl(itemId) {
    return `https://weidian.com/item.html?itemID=${itemId}`;
}

function extractAnyKnownItemId(rawInput, extractedOriginalUrl) {
    return (
        extractWeidianItemId(extractedOriginalUrl) ||
        extractWeidianItemId(rawInput) ||
        extractKakoBuyItemId(rawInput) ||
        extractUsFansItemId(rawInput) ||
        extractAllChinaBuyItemId(rawInput) ||
        extractLitBuyItemId(rawInput) ||
        extractMulebuyItemId(rawInput) ||
        extractOopbuyItemId(rawInput) ||
        extractGtbuyItemId(rawInput) ||
        extractHipoBuyItemId(rawInput) ||
        ''
    );
}

function analyzeInput(rawUrl) {
    const cleaned = normalizeUrl(rawUrl);
    if (!cleaned) return { displaySource: 'auto', originalPlatform: 'unknown', originalUrl: '', itemId: '', sourceCode: '' };

    const platform = detectPlatform(cleaned);

    if (platform === 'weidian') {
        const itemId = extractWeidianItemId(cleaned);
        return { displaySource: 'weidian', originalPlatform: 'weidian', originalUrl: itemId ? buildWeidianUrl(itemId) : cleaned, itemId, sourceCode: 'WD' };
    }
    if (platform === 'kakobuy') {
        const embeddedOriginal = extractOriginalUrlFromAnyAgent(cleaned);
        const itemId = extractAnyKnownItemId(cleaned, embeddedOriginal);
        const originalUrl = itemId ? buildWeidianUrl(itemId) : embeddedOriginal;
        return { displaySource: 'kakobuy', originalPlatform: itemId ? 'weidian' : detectPlatform(originalUrl), originalUrl: originalUrl || '', itemId, sourceCode: itemId ? 'WD' : '' };
    }
    if (platform === 'usfans') {
        const itemId = extractUsFansItemId(cleaned);
        return { displaySource: 'usfans', originalPlatform: itemId ? 'weidian' : 'unknown', originalUrl: itemId ? buildWeidianUrl(itemId) : '', itemId, sourceCode: itemId ? 'WD' : '' };
    }
    if (platform === 'allchinabuy') {
        const itemId = extractAllChinaBuyItemId(cleaned);
        const sourceCode = (itemId ? 'WD' : '');
        return { displaySource: 'allchinabuy', originalPlatform: itemId && sourceCode === 'WD' ? 'weidian' : 'unknown', originalUrl: itemId && sourceCode === 'WD' ? buildWeidianUrl(itemId) : '', itemId, sourceCode };
    }
    if (platform === 'litbuy') {
        const itemId = extractLitBuyItemId(cleaned);
        const sourcePlatform = extractLitBuySource(cleaned);
        return { displaySource: 'litbuy', originalPlatform: itemId && sourcePlatform === 'weidian' ? 'weidian' : sourcePlatform, originalUrl: itemId && sourcePlatform === 'weidian' ? buildWeidianUrl(itemId) : '', itemId, sourceCode: itemId && sourcePlatform === 'weidian' ? 'WD' : '' };
    }
    if (platform === 'mulebuy') {
        const itemId = extractMulebuyItemId(cleaned);
        return { displaySource: 'mulebuy', originalPlatform: itemId ? 'weidian' : 'unknown', originalUrl: itemId ? buildWeidianUrl(itemId) : '', itemId, sourceCode: itemId ? 'WD' : '' };
    }
    if (platform === 'oopbuy' || platform === 'gtbuy') {
        const itemId = platform === 'oopbuy' ? extractOopbuyItemId(cleaned) : extractGtbuyItemId(cleaned);
        return { displaySource: platform, originalPlatform: itemId ? 'weidian' : 'unknown', originalUrl: itemId ? buildWeidianUrl(itemId) : '', itemId, sourceCode: itemId ? 'WD' : '' };
    }
    if (platform === 'hipobuy') {
        const itemId = extractHipoBuyItemId(cleaned);
        return { displaySource: 'hipobuy', originalPlatform: itemId ? 'weidian' : 'unknown', originalUrl: itemId ? buildWeidianUrl(itemId) : '', itemId, sourceCode: itemId ? 'WD' : '' };
    }

    return { displaySource: platform, originalPlatform: platform, originalUrl: cleaned, itemId: extractWeidianItemId(cleaned), sourceCode: platform === 'weidian' ? 'WD' : '' };
}

function buildConvertedResult(analysis, target) {
    const { itemId, originalPlatform, originalUrl } = analysis;
    if (!originalUrl) return { url: '' };

    if (target === 'weidian') {
        if (itemId) return { url: buildWeidianUrl(itemId) };
        if (originalPlatform === 'weidian') return { url: originalUrl };
        return { url: '' };
    }
    if (!itemId || originalPlatform !== 'weidian') {
        if (target === 'kakobuy' && originalUrl.startsWith('http')) {
            return { url: `https://www.kakobuy.com/item/details?url=${encodeURIComponent(originalUrl)}&affcode=xfrostyy` };
        }
        return { url: '' };
    }
    switch (target) {
        case 'kakobuy': return { url: `https://www.kakobuy.com/item/details?url=${encodeURIComponent(buildWeidianUrl(itemId))}&affcode=xfrostyy` };
        case 'usfans': return { url: `https://www.usfans.com/product/3/${itemId}` };
        case 'allchinabuy': return { url: `https://www.acbuy.com/product/?id=${encodeURIComponent(itemId)}&source=WD` };
        case 'litbuy': return { url: `https://litbuy.com/product/weidian/${encodeURIComponent(itemId)}` };
        case 'mulebuy': return { url: `https://mulebuy.com/product?id=${itemId}&platform=WEIDIAN` };
        case 'oopbuy': return { url: `https://oopbuy.com/product/weidian/${itemId}` };
        case 'gtbuy': return { url: `https://www.gtbuy.com/product/weidian/${itemId}` };
        case 'hipobuy': return { url: `https://hipobuy.com/product/weidian/${itemId}` };
        default: return { url: '' };
    }
}

function formatPlatformLabel(platform) {
    const map = { 
        auto: 'Auto detect', 
        unknown: 'Unknown', 
        weidian: 'Weidian', 
        kakobuy: 'KakoBuy', 
        usfans: 'USFans', 
        litbuy: 'LITBUY', 
        allchinabuy: 'AllChinaBuy',
        mulebuy: 'MuleBuy',
        oopbuy: 'OopBuy',
        gtbuy: 'GTBuy',
        hipobuy: 'HipoBuy'
    };
    return map[platform] || String(platform || 'Unknown');
}

function getAgentIcon(platform) {
    const map = {
        kakobuy: '/images/kako.png',
        litbuy: '/images/litbuy.png',
        gtbuy: '/images/gtbuy.png',
        usfans: '/images/usfans.png',
        allchinabuy: '/images/allchinabuy.png',
        mulebuy: '/images/Mulebuy.jpg',
        oopbuy: '/images/oopbuy.png',
        hipobuy: '/images/Hipobuy.png',
    };
    return map[platform] || null;
}

// ============================================================
// COMPONENT
// ============================================================

const TARGETS = [
    { value: 'kakobuy', label: 'KakoBuy' },
    { value: 'litbuy', label: 'LITBUY' },
    { value: 'gtbuy', label: 'GTBuy' },
    { value: 'usfans', label: 'USFans' },
    { value: 'allchinabuy', label: 'AllChinaBuy' },
    { value: 'mulebuy', label: 'MuleBuy' },
    { value: 'oopbuy', label: 'OopBuy' },
    { value: 'hipobuy', label: 'HipoBuy' },
];

import { useLanguage } from '@/context/LanguageContext';

export default function LinkConverter() {
    const { t } = useLanguage();
    const [inputUrl, setInputUrl] = useState('');
    const [selectedTarget, setSelectedTarget] = useState('kakobuy');
    const [targetOpen, setTargetOpen] = useState(false);
    const [result, setResult] = useState(null);
    const [status, setStatus] = useState('');
    const [copied, setCopied] = useState(false);
    
    const dropdownRef = useRef(null);

    // Auto-convert when target changes
    useEffect(() => {
        if (inputUrl.trim()) {
            handleConvert(selectedTarget);
        }
    }, [selectedTarget, inputUrl]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setTargetOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleConvert = (targetOverride = null) => {
        const raw = inputUrl.trim();
        if (!raw) { setStatus(t('converter.statusEmpty')); setResult(null); return; }

        const target = targetOverride || selectedTarget;
        const analysis = analyzeInput(raw);
        if (!analysis.originalUrl) {
            setResult(null);
            setStatus(t('converter.statusError'));
            return;
        }

        const converted = buildConvertedResult(analysis, target);
        if (!converted.url) {
            setResult(null);
            setStatus(t('converter.statusBuildError').replace('{platform}', formatPlatformLabel(target)));
            return;
        }

        setResult({
            originalPlatform: analysis.originalPlatform,
            originalUrl: analysis.originalUrl,
            convertedUrl: converted.url,
            convertedPlatform: target,
        });
        setStatus('');
    };

    const copyText = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const currentTarget = TARGETS.find(t => t.value === selectedTarget) || TARGETS[0];

    return (
        <div className={styles.converterPage}>
            <div className={styles.nebulaGlow} />
            
            <div className={`${styles.mainContainer} ${styles.animateIn}`}>
                <div className={styles.header}>
                    <h1>{t('converter.title')}</h1>
                    <p>{t('converter.subtitle')}</p>
                </div>

                <div className={styles.converterBox}>
                    <div className={styles.inputGroup}>
                        <FontAwesomeIcon icon={faLink} className={styles.inputIcon} />
                        <input
                            type="text"
                            className={styles.input}
                            placeholder={t('converter.placeholder')}
                            value={inputUrl}
                            onChange={(e) => setInputUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleConvert()}
                        />

                        {/* AGENT DROPDOWN */}
                        <div className={styles.targetSelect} ref={dropdownRef}>
                            <button
                                className={styles.targetBtn}
                                onClick={() => setTargetOpen(o => !o)}
                                type="button"
                            >
                                {getAgentIcon(selectedTarget) && (
                                    <img 
                                        src={getAgentIcon(selectedTarget)} 
                                        alt="" 
                                        className={styles.agentIcon} 
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                )}
                                {currentTarget.label}
                                <FontAwesomeIcon icon={faChevronDown} className={`${styles.chevron} ${targetOpen ? styles.chevronOpen : ''}`} />
                            </button>
                            
                            {targetOpen && (
                                <div className={styles.targetMenu}>
                                    {TARGETS.map(t => (
                                        <button
                                            key={t.value}
                                            className={`${styles.targetMenuItem} ${selectedTarget === t.value ? styles.targetMenuItemActive : ''}`}
                                            onClick={() => { setSelectedTarget(t.value); setTargetOpen(false); }}
                                            type="button"
                                        >
                                            {getAgentIcon(t.value) && (
                                                <img 
                                                    src={getAgentIcon(t.value)} 
                                                    alt="" 
                                                    className={styles.agentIcon} 
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                            )}
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {status && <p className={styles.statusMsg}>{status}</p>}

                    {/* RESULT CARD */}
                    {result && (
                        <div className={styles.resultCard}>
                            <div className={styles.resultHeader}>
                                <img src={getAgentIcon(result.convertedPlatform)} alt="" className={styles.agentIcon} onError={(e) => e.target.style.display='none'} />
                                <span className={styles.resultAgentName}>{formatPlatformLabel(result.convertedPlatform)}</span>
                            </div>

                            <div className={styles.urlBox}>
                                {result.convertedUrl}
                            </div>

                            <div className={styles.actionRow}>
                                <a 
                                    href={result.convertedUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className={`${styles.actionBtn} ${styles.openBtn}`}
                                >
                                    {t('converter.open')} <FontAwesomeIcon icon={faArrowRight} />
                                </a>
                                <button 
                                    className={`${styles.actionBtn} ${styles.copyBtn} ${copied ? styles.copySuccess : ''}`}
                                    onClick={() => copyText(result.convertedUrl)}
                                >
                                    <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
                                    {copied ? t('converter.copied') : t('converter.copy')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
