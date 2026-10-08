'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import Image from 'next/image';
import styles from '@/styles/Products.module.css';
import ProductSkeleton from '@/components/ProductSkeleton';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import { categoriesData } from '@/data/productsData';
import { useCurrency } from '@/hooks/useCurrency';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faCheck, faTh, faSearch, faShoePrints, faHatCowboy, faTshirt, faSocks, faRunning, faGlasses, faShoppingBag, faBriefcase, faRing, faBolt, faFire, faBoxOpen, faLayerGroup } from '@fortawesome/free-solid-svg-icons';

// Memoized ProductCard component
const ProductCard = memo(({ product, index, formatPrice, onOpenModal }) => {
  return (
    <div className={styles.productCard} style={{ animationDelay: `${index * 0.03}s` }}>
      {/* Product Image */}
      <div className={styles.imageWrapper}>
        <Image 
          src={product.image} 
          alt={product.name} 
          className={styles.productImage}
          width={300}
          height={300}
          loading="lazy"
          placeholder="blur"
          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvc3ZnPg=="
        />
        {product.batch === 'best' && (
          <div className={styles.batchBadge}>Best Batch</div>
        )}
        {product.batch === 'popular' && (
          <div className={`${styles.batchBadge} ${styles.popularBadge}`}>🔥 Popular</div>
        )}
        {product.category && (
          <div className={styles.categoryBadge}>{product.category}</div>
        )}
      </div>

      {/* Product Info */}
      <div className={styles.cardContent}>
        <h3 className={styles.productName}>{product.name}</h3>
        
        {/* Price Display */}
        <div className={styles.priceRow}>
          <div className={styles.primaryPrice}>{formatPrice(product.price)}</div>
        </div>

        {/* Action Button */}
        <button 
          className={styles.agentButton}
          onClick={() => onOpenModal(product)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          Zobacz produkt
        </button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.product._id === nextProps.product._id && 
         prevProps.index === nextProps.index;
});

const CATEGORY_ICONS = {
  'shoes':          faShoePrints,
  'hoodies':        faTshirt,
  't-shirts':       faTshirt,
  'pants':          faSocks,
  'shorts':         faRunning,
  'jackets':        faLayerGroup,
  'longsleeve':     faTshirt,
  'sets':           faLayerGroup,
  'electronics':    faBolt,
  'headwear':       faHatCowboy,
  'bags-backpacks': faShoppingBag,
  'belts':          faRing,
  'accessories':    faGlasses,
};

export default function ProductsPage() {
  const toast = useToast();
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [displayCount, setDisplayCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const catDropdownRef = useRef(null);
  
  // Sorting state
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [sortBy, setSortBy] = useState('name-asc'); // name-asc, name-desc, price-asc, price-desc, newest
  const sortDropdownRef = useRef(null);
  
  // Price filter state
  const [priceDropdownOpen, setPriceDropdownOpen] = useState(false);
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [customMin, setCustomMin] = useState('');
  const [customMax, setCustomMax] = useState('');
  const priceDropdownRef = useRef(null);
  // Get currency conversion utilities
  const { formatPrice, currency, rates } = useCurrency();
  const [selectedCategories, setSelectedCategories] = useState([]);
  const searchRef = useRef(null);
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);
  
  const PRODUCTS_PER_LOAD = 20;

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        
        console.log('[Products] Fetching from /api/products...');
        
        // Fetch from API with proper sorting
        const res = await fetch('/api/products?limit=1000&sort=pinned_order', {
          cache: 'no-store', // Prevent caching
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        console.log('[Products] Response status:', res.status);
        
        if (!res.ok) {
          throw new Error('Failed to fetch products');
        }
        
        const data = await res.json();
        
        console.log('[Products] Received data:', data);
        console.log('[Products] Number of products:', data.length);
        
        // Transform Supabase format to expected format
        const products = data.map(p => ({
          _id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price,
          image: p.image,
          category: p.category,
          batch: p.batch,
          link: p.link,
          clicks: p.clicks,
          isPinned: p.is_pinned,
          pinnedOrder: p.pinned_order
        }));
        
        // Sort by pinned first, then by pinned_order, then by created_at
        products.sort((a, b) => {
          // Pinned products first
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          
          // If both pinned, sort by pinnedOrder
          if (a.isPinned && b.isPinned) {
            return (a.pinnedOrder || 999999) - (b.pinnedOrder || 999999);
          }
          
          // Otherwise keep original order (already sorted by created_at from API)
          return 0;
        });
        
        console.log('Fetched products from API, count:', products.length);
        console.log('Pinned products:', products.filter(p => p.isPinned).length);
        setAllProducts(products);
        // Initially show all products EXCEPT popular batch (default to "All" tab)
        setFilteredProducts(products.filter(p => p.batch !== 'popular'));
        
      } catch (err) {
        console.error('Error fetching products:', err);
        setAllProducts([]);
        setFilteredProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Generate suggestions from search query
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    
    // Get unique product names that match
    const matchingProducts = allProducts
      .filter(p => p.name.toLowerCase().includes(query))
      .map(p => p.name)
      .filter((name, index, self) => self.indexOf(name) === index) // unique
      .slice(0, 5); // max 5 suggestions

    setSuggestions(matchingProducts);
  }, [searchQuery, allProducts]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (catDropdownRef.current && !catDropdownRef.current.contains(event.target)) {
        setCatDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
        setSortDropdownOpen(false);
      }
      if (priceDropdownRef.current && !priceDropdownRef.current.contains(event.target)) {
        setPriceDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prevent body scroll when any dropdown is open
  useEffect(() => {
    const isAnyDropdownOpen = catDropdownOpen || sortDropdownOpen || priceDropdownOpen;
    
    if (isAnyDropdownOpen) {
      // Store current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflowY = 'scroll'; // Keep scrollbar to prevent layout shift
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflowY = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }

    return () => {
      // Cleanup on unmount
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflowY = '';
    };
  }, [catDropdownOpen, sortDropdownOpen, priceDropdownOpen]);

  // Filter products based on search query and categories
  useEffect(() => {
    // Skip if no products loaded yet
    if (allProducts.length === 0) return;
    
    setIsTransitioning(true);
    
    const timer = setTimeout(() => {
      let filtered = allProducts;
      
      // Filter by search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(product =>
          product.name.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query)
        );
      }
      
      // Filter by categories or Popular
      if (selectedCategories.length > 0) {
        if (selectedCategories.includes('__popular__')) {
          // Filter by batch='popular'
          filtered = filtered.filter(product => product.batch === 'popular');
        } else {
          // IMPORTANT: Re-fetch from API with category filter to bypass cache issues
          const fetchCategoryProducts = async () => {
            try {
              const category = selectedCategories[0];
              const res = await fetch(`/api/products?category=${category}&limit=1000`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
              });
              
              if (res.ok) {
                const data = await res.json();
                let products = data.map(p => ({
                  _id: p.id,
                  name: p.name,
                  slug: p.slug,
                  price: p.price,
                  image: p.image,
                  category: p.category,
                  batch: p.batch,
                  link: p.link,
                  clicks: p.clicks,
                  isPinned: p.is_pinned,
                  pinnedOrder: p.pinned_order
                }));
                
                // Apply price filter
                products = applyPriceFilter(products);
                // Apply sorting
                products = applySorting(products);
                
                console.log(`Fetched ${products.length} products for category: ${category}`);
                setFilteredProducts(products);
                setDisplayCount(PRODUCTS_PER_LOAD);
                
                setTimeout(() => {
                  setIsTransitioning(false);
                }, 50);
              }
            } catch (err) {
              console.error('Error fetching category products:', err);
              // Fallback to local filtering
              filtered = allProducts.filter(product =>
                selectedCategories.includes(product.category)
              );
              
              // Apply price filter
              filtered = applyPriceFilter(filtered);
              // Apply sorting
              filtered = applySorting(filtered);
              
              setFilteredProducts(filtered);
              setDisplayCount(PRODUCTS_PER_LOAD);
              
              setTimeout(() => {
                setIsTransitioning(false);
              }, 50);
            }
          };
          
          fetchCategoryProducts();
          return; // Exit early, async fetch will handle state updates
        }
      } else {
        // When "All" is selected (no categories), exclude "popular" batch
        filtered = filtered.filter(product => product.batch !== 'popular');
      }
      
      // Apply price filter
      filtered = applyPriceFilter(filtered);
      
      // Apply sorting
      filtered = applySorting(filtered);
      
      setFilteredProducts(filtered);
      setDisplayCount(PRODUCTS_PER_LOAD);
      
      console.log('Filtered products count:', filtered.length);
      console.log('Display count reset to:', PRODUCTS_PER_LOAD);
      
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategories, allProducts, sortBy, selectedPriceRange, customMin, customMax, currency, rates]);

  // Helper function to apply price filter
  const applyPriceFilter = (products) => {
    if (selectedPriceRange === 'all') return products;
    
    // Get exchange rate for current currency
    const rate = rates[currency] || 1;
    
    if (selectedPriceRange === 'custom') {
      const min = parseFloat(customMin) || 0;
      const max = parseFloat(customMax) || Infinity;
      // Custom range is in displayed currency, need to convert to USD for comparison
      return products.filter(p => {
        const priceInCurrency = p.price * rate;
        return priceInCurrency >= min && priceInCurrency <= max;
      });
    }
    
    // Predefined ranges in USD (will be converted to display currency)
    const rangesUSD = {
      'under-10': [0, 10],
      '10-20': [10, 20],
      '20-40': [20, 40],
      '40-100': [40, 100],
      'over-100': [100, Infinity]
    };
    
    const [minUSD, maxUSD] = rangesUSD[selectedPriceRange] || [0, Infinity];
    
    return products.filter(p => p.price >= minUSD && p.price <= maxUSD);
  };

  // Helper function to format price range labels in current currency
  const formatRangeLabel = (minUSD, maxUSD) => {
    const rate = rates[currency] || 1;
    const symbol = currency === 'USD' ? '$' : currency === 'PLN' ? 'zł' : '¥';
    
    const min = Math.round(minUSD * rate);
    const max = maxUSD === Infinity ? null : Math.round(maxUSD * rate);
    
    if (max === null) return `Over ${symbol}${min}`;
    if (min === 0) return `Under ${symbol}${max}`;
    return `${symbol}${min} - ${symbol}${max}`;
  };

  // Helper function to apply sorting
  const applySorting = (products) => {
    const sorted = [...products];
    
    switch (sortBy) {
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'price-asc':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        // Newest first (assuming _id or default order is newest)
        // If you have a createdAt field, use that instead
        break;
      default:
        break;
    }
    
    return sorted;
  };

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry.isIntersecting && !isLoadingMore && displayCount < filteredProducts.length) {
          setIsLoadingMore(true);
          
          // Simulate loading delay for smooth experience
          setTimeout(() => {
            setDisplayCount(prev => Math.min(prev + PRODUCTS_PER_LOAD, filteredProducts.length));
            setIsLoadingMore(false);
          }, 300);
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [displayCount, filteredProducts.length, isLoadingMore]);

  // Get products to display
  const displayedProducts = filteredProducts.slice(0, displayCount);
  const hasMore = displayCount < filteredProducts.length;

  const handleOpenAgentModal = (product) => {
    // Get preferred agent from localStorage
    const preferredAgent = localStorage.getItem('preferredAgent') || 'KakoBuy';
    
    // Extract weidian URL from product.link
    const weidianMatch = product.link?.match(/url=([^&]+)/);
    const weidianUrl = weidianMatch ? decodeURIComponent(weidianMatch[1]) : product.link;
    
    // Generate agent link
    const agentUrls = {
      'KakoBuy': `https://www.kakobuy.com/item/details?url=${encodeURIComponent(weidianUrl)}&affcode=xfrostyy`,
      'ACBuy': `https://www.allchinabuy.com/en/page/buy?nTag=Home-search&from=search-input&url=${encodeURIComponent(weidianUrl)}`,
      'USFans': `https://www.usfans.net/page/buy?url=${encodeURIComponent(weidianUrl)}`,
      'LitBuy': `https://www.litbuy.com/en/page/buy?url=${encodeURIComponent(weidianUrl)}`,
      'GTBuy': `https://www.gtbuy.com/en/page/buy?url=${encodeURIComponent(weidianUrl)}`,
      'OopBuy': `https://www.oopbuy.com/en/page/buy?url=${encodeURIComponent(weidianUrl)}`,
      'MuleBuy': `https://www.mulebuy.com/en/page/buy?url=${encodeURIComponent(weidianUrl)}`,
      'HipoBuy': `https://www.hipobuy.com/en/page/buy?url=${encodeURIComponent(weidianUrl)}`
    };
    
    const agentLink = agentUrls[preferredAgent] || agentUrls['KakoBuy'];
    
    // Open in new tab
    window.open(agentLink, '_blank');
  };

  const handleCloseAgentModal = () => {
    // No longer needed but keep for compatibility
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
  };

  const handleSearchFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setShowSuggestions(true);
  };

  return (
    <>
      <div className={styles.productsSection}>
        {/* Header Section */}
        <div className={styles.headerSection}>
          {/* Page title + count */}
          <div className={styles.pageTitle}>
            <span className={styles.pageTitleText}>Produkty</span>
            {!loading && filteredProducts.length > 0 && (
              <span className={styles.pageTitleCount}>{filteredProducts.length} produktów</span>
            )}
          </div>

          {/* Top bar: search + category dropdown */}
          <div className={styles.topBar}>
            {/* Search Bar */}
            <div className={styles.searchWrapper} ref={searchRef}>
              <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Szukaj..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={handleSearchFocus}
                className={styles.searchInput}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className={styles.suggestionsDropdown}>
                  {suggestions.map((suggestion, index) => (
                    <div key={index} className={styles.suggestionItem} onClick={() => handleSuggestionClick(suggestion)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.4 }}>
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <span>{suggestion}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Category Dropdown */}
            <div
              className={styles.catDropdownWrapper}
              ref={catDropdownRef}
            >
              <button
                className={styles.catDropdownBtn}
                onClick={() => { setCatDropdownOpen(o => !o); setCatSearch(''); }}
              >
                <FontAwesomeIcon icon={faTh} className={styles.catBtnIcon} />
                <span className={styles.catBtnLabel}>
                  {selectedCategories.includes('__popular__')
                    ? 'Popular'
                    : selectedCategories.length > 0
                      ? selectedCategories[0].charAt(0).toUpperCase() + selectedCategories[0].slice(1).replace('-', ' & ')
                      : 'Wszystkie kategorie'
                  }
                </span>
                <FontAwesomeIcon icon={faChevronDown} className={`${styles.catChevron} ${catDropdownOpen ? styles.catChevronOpen : ''}`} />
              </button>

              {catDropdownOpen && (
                <div className={styles.catDropdownMenu}>
                  {/* Search inside dropdown */}
                  <div className={styles.catDropdownSearch}>
                    <FontAwesomeIcon icon={faSearch} className={styles.catDropdownSearchIcon} />
                    <input
                      type="text"
                      placeholder="Szukaj kategorii..."
                      value={catSearch}
                      onChange={e => setCatSearch(e.target.value)}
                      className={styles.catDropdownSearchInput}
                      autoFocus
                    />
                  </div>

                  {/* All categories option */}
                  {('wszystkie'.includes(catSearch.toLowerCase()) || catSearch === '') && (
                    <button
                      className={`${styles.catDropdownItem} ${selectedCategories.length === 0 && !selectedCategories.includes('__popular__') ? styles.catDropdownItemActive : ''}`}
                      onClick={() => { setSelectedCategories([]); setCatDropdownOpen(false); }}
                    >
                      <FontAwesomeIcon icon={faTh} className={styles.catItemIcon} />
                      <span className={styles.catItemLabel}>Wszystkie kategorie</span>
                      {selectedCategories.length === 0 && !selectedCategories.includes('__popular__') && (
                        <FontAwesomeIcon icon={faCheck} className={styles.catItemCheck} />
                      )}
                    </button>
                  )}

                  {/* Popular */}
                  {('popular'.includes(catSearch.toLowerCase()) || catSearch === '') && (
                    <button
                      className={`${styles.catDropdownItem} ${selectedCategories.includes('__popular__') ? styles.catDropdownItemActive : ''}`}
                      onClick={() => { setSelectedCategories(['__popular__']); setCatDropdownOpen(false); }}
                    >
                      <FontAwesomeIcon icon={faFire} className={styles.catItemIcon} />
                      <span className={styles.catItemLabel}>Popular</span>
                      {selectedCategories.includes('__popular__') && (
                        <FontAwesomeIcon icon={faCheck} className={styles.catItemCheck} />
                      )}
                    </button>
                  )}

                  {/* Category list */}
                  {categoriesData
                    .filter(cat => cat.toLowerCase().includes(catSearch.toLowerCase()) || catSearch === '')
                    .map(cat => (
                      <button
                        key={cat}
                        className={`${styles.catDropdownItem} ${selectedCategories.includes(cat) ? styles.catDropdownItemActive : ''}`}
                        onClick={() => { setSelectedCategories([cat]); setCatDropdownOpen(false); }}
                      >
                        <FontAwesomeIcon icon={CATEGORY_ICONS[cat] || faBoxOpen} className={styles.catItemIcon} />
                        <span className={styles.catItemLabel}>{cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' & ')}</span>
                        {selectedCategories.includes(cat) && (
                          <FontAwesomeIcon icon={faCheck} className={styles.catItemCheck} />
                        )}
                      </button>
                    ))
                  }
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <div
              className={styles.catDropdownWrapper}
              ref={sortDropdownRef}
            >
              <button
                className={styles.catDropdownBtn}
                onClick={() => setSortDropdownOpen(o => !o)}
              >
                <svg className={styles.catBtnIcon} width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18M3 12h15M3 18h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className={styles.catBtnLabel}>
                  {sortBy === 'name-asc' ? 'Name: A-Z' :
                   sortBy === 'name-desc' ? 'Name: Z-A' :
                   sortBy === 'price-asc' ? 'Price: Low to High' :
                   sortBy === 'price-desc' ? 'Price: High to Low' :
                   'Newest First'}
                </span>
                <FontAwesomeIcon icon={faChevronDown} className={`${styles.catChevron} ${sortDropdownOpen ? styles.catChevronOpen : ''}`} />
              </button>

              {sortDropdownOpen && (
                <div className={styles.catDropdownMenu}>
                  <button
                    className={`${styles.catDropdownItem} ${sortBy === 'name-asc' ? styles.catDropdownItemActive : ''}`}
                    onClick={() => { setSortBy('name-asc'); setSortDropdownOpen(false); }}
                  >
                    <span className={styles.catItemLabel}>Name: A-Z</span>
                    {sortBy === 'name-asc' && <FontAwesomeIcon icon={faCheck} className={styles.catItemCheck} />}
                  </button>
                  <button
                    className={`${styles.catDropdownItem} ${sortBy === 'name-desc' ? styles.catDropdownItemActive : ''}`}
                    onClick={() => { setSortBy('name-desc'); setSortDropdownOpen(false); }}
                  >
                    <span className={styles.catItemLabel}>Name: Z-A</span>
                    {sortBy === 'name-desc' && <FontAwesomeIcon icon={faCheck} className={styles.catItemCheck} />}
                  </button>
                  <button
                    className={`${styles.catDropdownItem} ${sortBy === 'price-asc' ? styles.catDropdownItemActive : ''}`}
                    onClick={() => { setSortBy('price-asc'); setSortDropdownOpen(false); }}
                  >
                    <span className={styles.catItemLabel}>Price: Low to High</span>
                    {sortBy === 'price-asc' && <FontAwesomeIcon icon={faCheck} className={styles.catItemCheck} />}
                  </button>
                  <button
                    className={`${styles.catDropdownItem} ${sortBy === 'price-desc' ? styles.catDropdownItemActive : ''}`}
                    onClick={() => { setSortBy('price-desc'); setSortDropdownOpen(false); }}
                  >
                    <span className={styles.catItemLabel}>Price: High to Low</span>
                    {sortBy === 'price-desc' && <FontAwesomeIcon icon={faCheck} className={styles.catItemCheck} />}
                  </button>
                  <button
                    className={`${styles.catDropdownItem} ${sortBy === 'newest' ? styles.catDropdownItemActive : ''}`}
                    onClick={() => { setSortBy('newest'); setSortDropdownOpen(false); }}
                  >
                    <span className={styles.catItemLabel}>Newest First</span>
                    {sortBy === 'newest' && <FontAwesomeIcon icon={faCheck} className={styles.catItemCheck} />}
                  </button>
                </div>
              )}
            </div>

            {/* Price Filter Dropdown */}
            <div
              className={styles.catDropdownWrapper}
              ref={priceDropdownRef}
            >
              <button
                className={styles.catDropdownBtn}
                onClick={() => setPriceDropdownOpen(o => !o)}
              >
                <svg className={styles.catBtnIcon} width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className={styles.catBtnLabel}>
                  {selectedPriceRange === 'all' ? 'All Prices' :
                   selectedPriceRange === 'under-10' ? formatRangeLabel(0, 10) :
                   selectedPriceRange === '10-20' ? formatRangeLabel(10, 20) :
                   selectedPriceRange === '20-40' ? formatRangeLabel(20, 40) :
                   selectedPriceRange === '40-100' ? formatRangeLabel(40, 100) :
                   selectedPriceRange === 'over-100' ? formatRangeLabel(100, Infinity) :
                   'Custom Range'}
                </span>
                <FontAwesomeIcon icon={faChevronDown} className={`${styles.catChevron} ${priceDropdownOpen ? styles.catChevronOpen : ''}`} />
              </button>

              {priceDropdownOpen && (
                <div className={styles.catDropdownMenu}>
                  <button
                    className={`${styles.catDropdownItem} ${selectedPriceRange === 'all' ? styles.catDropdownItemActive : ''}`}
                    onClick={() => { setSelectedPriceRange('all'); setPriceDropdownOpen(false); }}
                  >
                    <span className={styles.catItemLabel}>All Prices</span>
                    {selectedPriceRange === 'all' && <FontAwesomeIcon icon={faCheck} className={styles.catItemCheck} />}
                  </button>
                  <button
                    className={`${styles.catDropdownItem} ${selectedPriceRange === 'under-10' ? styles.catDropdownItemActive : ''}`}
                    onClick={() => { setSelectedPriceRange('under-10'); setPriceDropdownOpen(false); }}
                  >
                    <span className={styles.catItemLabel}>{formatRangeLabel(0, 10)}</span>
                    {selectedPriceRange === 'under-10' && <FontAwesomeIcon icon={faCheck} className={styles.catItemCheck} />}
                  </button>
                  <button
                    className={`${styles.catDropdownItem} ${selectedPriceRange === '10-20' ? styles.catDropdownItemActive : ''}`}
                    onClick={() => { setSelectedPriceRange('10-20'); setPriceDropdownOpen(false); }}
                  >
                    <span className={styles.catItemLabel}>{formatRangeLabel(10, 20)}</span>
                    {selectedPriceRange === '10-20' && <FontAwesomeIcon icon={faCheck} className={styles.catItemCheck} />}
                  </button>
                  <button
                    className={`${styles.catDropdownItem} ${selectedPriceRange === '20-40' ? styles.catDropdownItemActive : ''}`}
                    onClick={() => { setSelectedPriceRange('20-40'); setPriceDropdownOpen(false); }}
                  >
                    <span className={styles.catItemLabel}>{formatRangeLabel(20, 40)}</span>
                    {selectedPriceRange === '20-40' && <FontAwesomeIcon icon={faCheck} className={styles.catItemCheck} />}
                  </button>
                  <button
                    className={`${styles.catDropdownItem} ${selectedPriceRange === '40-100' ? styles.catDropdownItemActive : ''}`}
                    onClick={() => { setSelectedPriceRange('40-100'); setPriceDropdownOpen(false); }}
                  >
                    <span className={styles.catItemLabel}>{formatRangeLabel(40, 100)}</span>
                    {selectedPriceRange === '40-100' && <FontAwesomeIcon icon={faCheck} className={styles.catItemCheck} />}
                  </button>
                  <button
                    className={`${styles.catDropdownItem} ${selectedPriceRange === 'over-100' ? styles.catDropdownItemActive : ''}`}
                    onClick={() => { setSelectedPriceRange('over-100'); setPriceDropdownOpen(false); }}
                  >
                    <span className={styles.catItemLabel}>{formatRangeLabel(100, Infinity)}</span>
                    {selectedPriceRange === 'over-100' && <FontAwesomeIcon icon={faCheck} className={styles.catItemCheck} />}
                  </button>
                  
                  {/* Custom Range Divider */}
                  <div className={styles.catDropdownDivider}>CUSTOM RANGE</div>
                  
                  {/* Custom Range Inputs */}
                  <div className={styles.customRangeWrapper}>
                    <input
                      type="number"
                      placeholder="Min"
                      value={customMin}
                      onChange={(e) => setCustomMin(e.target.value)}
                      className={styles.customRangeInput}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className={styles.customRangeSeparator}>-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={customMax}
                      onChange={(e) => setCustomMax(e.target.value)}
                      className={styles.customRangeInput}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <button
                    className={styles.customRangeApply}
                    onClick={() => { 
                      if (customMin || customMax) {
                        setSelectedPriceRange('custom'); 
                      }
                      setPriceDropdownOpen(false); 
                    }}
                  >
                    Apply Custom Range
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className={`${styles.productsGrid} ${isTransitioning ? styles.fadeOut : styles.fadeIn}`}>
          {loading ? (
            // Loading skeleton
            Array.from({ length: 8 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))
          ) : displayedProducts.length === 0 ? (
            // No results message
            <div style={{ gridColumn: '1 / -1' }}>
              <EmptyState 
                title={searchQuery ? `No products found for "${searchQuery}"` : "No products found"}
                description="Try adjusting your filters or search query to find what you're looking for."
              />
            </div>
          ) : (
            // Product Cards
            displayedProducts.map((product, index) => (
              <ProductCard
                key={`${product._id}-${index}`}
                product={product}
                index={index}
                formatPrice={formatPrice}
                onOpenModal={handleOpenAgentModal}
              />
            ))
          )}
        </div>

        {/* Loading More Indicator */}
        {!loading && hasMore && (
          <div ref={sentinelRef} className={styles.loadingMore}>
            {isLoadingMore ? (
              <div className={styles.loadingSpinner}>
                <div className={styles.spinner}></div>
                <span>Ładowanie więcej produktów...</span>
              </div>
            ) : (
              <div className={styles.loadingTrigger}>
                <span style={{ opacity: 0.3, fontSize: '0.8rem' }}>Scroll for more...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
