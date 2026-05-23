'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from '@/styles/Products.module.css';
import { PINNED_PRODUCT_IDS as pinnedIds } from '@/config/pinnedProducts';
import { useAuth } from '@/context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faFilter,
  faTimes,
  faArrowRight,
  faCheck,
  faLayerGroup,
  faSortAmountDown,
  faDollarSign,
  faCalendar,
  faGem,
  faTags,
  faRandom,
  faSortNumericDown,
  faSortNumericUp,
  faCamera,
  faThumbsUp,
  faThumbsDown,
  faHeart,
  faInfoCircle,
  faSpinner,
  faBoxOpen,
  faChevronRight,
  faCopy,
  faClock
} from '@fortawesome/free-solid-svg-icons';
import { productsData, categoriesData } from '@/data/productsData';
import { convertLink, SUPPORTED_AGENTS } from '@/utils/converter';
import { useCurrency } from '@/hooks/useCurrency';

import { useLanguage } from '@/context/LanguageContext';

const SEARCH_SYNONYM_GROUPS = [
  ['af1', 'airforce', 'air force', 'forces', 'air force 1', 'air force one', 'nike air force'],
  ['b27', 'dior b27', 'dior shoes', 'dior sneaker', 'dior sneakers'],
  ['j4', 'jordan 4', 'aj4', 'air jordan 4'],
  ['j1', 'jordan 1', 'aj1', 'air jordan 1'],
  ['j3', 'jordan 3', 'aj3', 'air jordan 3'],
  ['j11', 'jordan 11', 'aj11', 'air jordan 11'],
  ['tn', 'air max plus', 'nike tn'],
  ['nb', 'new balance'],
  ['yeezy slide', 'yeezy slides', 'slides'],
  ['tee', 'tees', 't shirt', 't-shirt', 'tshirt'],
  ['hoodie', 'hoody', 'sweatshirt', 'sweater'],
  ['pants', 'trousers', 'joggers', 'sweatpants'],
  ['shorts', 'short'],
  ['jacket', 'coat', 'puffer', 'windbreaker'],
  ['bag', 'backpack']
];

const SEARCH_BRANDS = [
  'Nike', 'Adidas', 'Jordan', 'Dior', 'KITH', 'Moncler', 'New Balance', 'Stone Island',
  'Arc\'teryx', 'Essentials', 'Hellstar', 'Chrome Hearts', 'Balenciaga', 'Louis Vuitton',
  'Off-White', 'Supreme', 'Corteiz', 'Patagonia', 'Trapstar', 'Bape', 'Asics'
];

const RECENT_SEARCHES_KEY = 'repfinder_recent_searches';
const RECENT_SEARCHES_LIMIT = 6;

const normalizeSearchText = (value = '') =>
  value
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const compactSearchText = (value = '') => normalizeSearchText(value).replace(/\s+/g, '');

const getSearchTerms = (query) => {
  const normalized = normalizeSearchText(query);
  const compact = compactSearchText(query);
  const terms = new Set([normalized, compact].filter(Boolean));

  SEARCH_SYNONYM_GROUPS.forEach((group) => {
    const normalizedGroup = group.map(normalizeSearchText);
    const compactGroup = group.map(compactSearchText);
    const matchesGroup = normalizedGroup.some(term => term.includes(normalized) || normalized.includes(term))
      || compactGroup.some(term => term.includes(compact) || compact.includes(term));

    if (matchesGroup) {
      group.forEach((term) => {
        terms.add(normalizeSearchText(term));
        terms.add(compactSearchText(term));
      });
    }
  });

  return [...terms].filter(Boolean);
};

const getEditDistance = (a, b) => {
  if (Math.abs(a.length - b.length) > 1) return 2;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = a[i - 1] === b[j - 1]
        ? previous[j - 1]
        : Math.min(previous[j - 1], previous[j], current[j - 1]) + 1;
    }
    previous = current;
  }

  return previous[b.length];
};

const hasFuzzyTokenMatch = (query, searchable) => {
  const allQueryTokens = normalizeSearchText(query).split(' ').filter(Boolean);
  if (!allQueryTokens.length || allQueryTokens.some(token => token.length < 4)) return false;

  const queryTokens = allQueryTokens.filter(token => token.length >= 4);
  if (!queryTokens.length) return false;

  const productTokens = normalizeSearchText(searchable)
    .split(' ')
    .filter(token => token.length >= 4);

  return queryTokens.every(queryToken =>
    productTokens.some(productToken => getEditDistance(queryToken, productToken) <= 1)
  );
};

const productMatchesSearch = (product, query) => {
  if (!product || !product.name) return false;

  const searchable = [
    product.name,
    product.category,
    product.batch
  ].filter(Boolean).join(' ');

  const normalizedSearchable = normalizeSearchText(searchable);
  const compactSearchable = compactSearchText(searchable);
  const terms = getSearchTerms(query);

  return terms.some(term => normalizedSearchable.includes(term) || compactSearchable.includes(term))
    || hasFuzzyTokenMatch(query, searchable);
};

export default function Products() {
  const { t } = useLanguage();
  const { user, fetchWithAuth } = useAuth();
  const { formatPrice } = useCurrency();

  const [allProducts, setAllProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState(categoriesData);
  const [seasons, setSeasons] = useState([]);

  // Filter States
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortField, setSortField] = useState('random');
  const [sortOrder, setSortOrder] = useState('asc');

  // UI States
  const [page, setPage] = useState(1);
  const [limit] = useState(24);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState({ message: null, type: null });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [agentModalProduct, setAgentModalProduct] = useState(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [preferredAgent, setPreferredAgent] = useState('kakobuy');
  const [preferredAgentLogo, setPreferredAgentLogo] = useState('/images/kako.png');
  const [quickCopiedId, setQuickCopiedId] = useState(null);
  const [qcModalProduct, setQcModalProduct] = useState(null);
  const [qcData, setQcData] = useState(null);
  const [qcLoading, setQcLoading] = useState(false);
  const [activeAlbumIndex, setActiveAlbumIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
        const res = await fetch('/api/products');
        const data = await res.json();
        
        // Ensure data is an array
        let arr = Array.isArray(data) ? [...data] : [];
        
        // Fallback to local data if API fails or returns no products
        if (arr.length === 0) {
          console.warn("No products from API, falling back to local data");
          arr = [...productsData];
        }

        // Separate pinned and other products
        const pinned = [];
        const others = [];
        const pinnedMap = {};

        arr.forEach(p => {
          const match = pinnedIds.find(id => p.link && p.link.includes(id));
          if (match) {
            pinnedMap[match] = p;
          } else {
            others.push(p);
          }
        });

        // Add pinned products in the exact order of pinnedIds
        pinnedIds.forEach(id => {
          if (pinnedMap[id]) {
            pinned.push(pinnedMap[id]);
          }
        });

        // Shuffle others on client side
        for (let i = others.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [others[i], others[j]] = [others[j], others[i]];
        }
        
        setAllProducts([...pinned, ...others]);
      } catch (error) {
        console.error("Failed to fetch products:", error);
        setAllProducts([...productsData]); // Fallback on catch
        setError({ message: "Failed to load products from server, using local data", type: "warning" });
      } finally {
        setLoading(false);
      }
    }, [productsData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    try {
      const savedSearches = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
      if (Array.isArray(savedSearches)) {
        setRecentSearches(savedSearches.slice(0, RECENT_SEARCHES_LIMIT));
      }
    } catch (err) {
      console.warn('Could not load recent searches:', err);
    }
  }, []);

  useEffect(() => {
    const loadSettings = () => {
      const saved = localStorage.getItem('preferredAgent');
      if (saved) {
        const mapping = {
          'KakoBuy': 'kakobuy',
          'ACBuy': 'allchinabuy',
          'USFans': 'usfans',
          'LitBuy': 'litbuy',
          'GTBuy': 'gtbuy',
          'OopBuy': 'oopbuy',
          'MuleBuy': 'mulebuy',
          'HipoBuy': 'hipobuy'
        };
        const logoMapping = {
          'KakoBuy': '/images/kako.png',
          'ACBuy': '/images/allchinabuy.png',
          'USFans': '/images/usfans.png',
          'LitBuy': '/images/litbuy.png',
          'GTBuy': '/images/gtbuy.png',
          'OopBuy': '/images/oopbuy.png',
          'MuleBuy': '/images/Mulebuy.jpg',
          'HipoBuy': '/images/Hipobuy.png'
        };
        setPreferredAgent(mapping[saved] || 'kakobuy');
        setPreferredAgentLogo(logoMapping[saved] || '/images/kako.png');
      }
    };
    loadSettings();
    window.addEventListener('storage', loadSettings);
    return () => window.removeEventListener('storage', loadSettings);
  }, []);

  const trackStat = async (productId, type = 'product_click', agent = null) => {
    try {
      await fetch('/api/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productId, 
          type, 
          agent,
          userAgent: navigator.userAgent
        })
      });
    } catch (err) {
      console.error("Stats error:", err);
    }
  };

  const handleQuickCopy = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    const link = convertLink(product.link, preferredAgent);
    navigator.clipboard.writeText(link);
    setQuickCopiedId(product._id);
    trackStat(product._id, 'product_click', preferredAgent);
    setTimeout(() => setQuickCopiedId(null), 2000);
  };

  const filterAndSortData = useCallback(() => {
    let filtered = [...allProducts];

    // Filter by Category
    if (selectedCategories && selectedCategories.length > 0) {
      filtered = filtered.filter(p => {
        if (!p || !p.category) return false;
        return selectedCategories.includes(p.category);
      });
    }
    
    // Search Query (with synonyms and light typo tolerance)
    if (searchQuery.trim()) {
      filtered = filtered.filter(p => productMatchesSearch(p, searchQuery));
    }

    // Filter by Batch
    if (selectedBatch && selectedBatch !== 'random') {
      filtered = filtered.filter(p => p.batch === selectedBatch);
    }

    // (search already applied above)

    // Price Range
    if (priceRange.min) filtered = filtered.filter(p => p.price >= parseFloat(priceRange.min));
    if (priceRange.max) filtered = filtered.filter(p => p.price <= parseFloat(priceRange.max));

    // Sorting
    filtered.sort((a, b) => {
      if (sortField === 'price') {
        return sortOrder === 'asc' ? a.price - b.price : b.price - a.price;
      }
      if (sortField === 'name') {
        return sortOrder === 'asc' 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name);
      }
      return 0;
    });

    // Pagination
    const total = Math.ceil(filtered.length / limit);
    setTotalPages(total || 1);
    
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    setProducts(paginated);
  }, [
    allProducts,
    selectedCategories,
    selectedBatch,
    searchQuery,
    priceRange,
    sortField,
    sortOrder,
    page,
    limit
  ]);


  useEffect(() => {
    filterAndSortData();
  }, [filterAndSortData]);

  const saveRecentSearch = useCallback((value) => {
    const query = value.trim();
    if (query.length < 2) return;

    setRecentSearches((current) => {
      const next = [
        query,
        ...current.filter(item => normalizeSearchText(item) !== normalizeSearchText(query))
      ].slice(0, RECENT_SEARCHES_LIMIT);

      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      } catch (err) {
        console.warn('Could not save recent searches:', err);
      }

      return next;
    });
  }, []);

  const recentSearchSuggestions = useMemo(() => {
    const query = normalizeSearchText(searchQuery);
    const compactQuery = compactSearchText(searchQuery);

    return recentSearches
      .filter(item => {
        if (!query) return true;
        const normalizedItem = normalizeSearchText(item);
        const compactItem = compactSearchText(item);
        return normalizedItem.includes(query) || compactItem.includes(compactQuery);
      })
      .slice(0, 4)
      .map(item => ({ type: 'recent', label: item, meta: 'Ostatnie', value: item }));
  }, [recentSearches, searchQuery]);

  const searchSuggestions = useMemo(() => {
    const query = normalizeSearchText(searchQuery);
    const compactQuery = compactSearchText(searchQuery);
    const nameCounts = new Map();

    allProducts.forEach(product => {
      if (!product?.name) return;
      nameCounts.set(product.name, (nameCounts.get(product.name) || 0) + 1);
    });

    const productSuggestions = [...nameCounts.entries()]
      .filter(([name]) => {
        if (!query) return true;
        return productMatchesSearch({ name, category: '' }, searchQuery);
      })
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, query ? 5 : 4)
      .map(([name, count]) => ({ type: 'product', label: name, meta: `${count} items`, value: name }));

    const brandSuggestions = SEARCH_BRANDS
      .filter(brand => {
        if (!query) return nameCounts.has(brand) || allProducts.some(product => normalizeSearchText(product?.name).includes(normalizeSearchText(brand)));
        const normalizedBrand = normalizeSearchText(brand);
        const compactBrand = compactSearchText(brand);
        return normalizedBrand.includes(query) || compactBrand.includes(compactQuery);
      })
      .slice(0, 4)
      .map(brand => ({ type: 'brand', label: brand, meta: 'Brand', value: brand }));

    const categorySuggestions = categories
      .filter(category => {
        if (!query) return true;
        const categoryLabel = t(`products.${category}`);
        const normalizedCategory = normalizeSearchText(category);
        const normalizedLabel = normalizeSearchText(categoryLabel);
        return normalizedCategory.includes(query) || normalizedLabel.includes(query);
      })
      .slice(0, 4)
      .map(category => ({ type: 'category', label: t(`products.${category}`), meta: 'Category', value: category }));

    const recentLabels = new Set(recentSearchSuggestions.map(item => normalizeSearchText(item.label)));
    return [...productSuggestions, ...brandSuggestions, ...categorySuggestions]
      .filter(item => !recentLabels.has(normalizeSearchText(item.label)))
      .slice(0, 9);
  }, [allProducts, categories, recentSearchSuggestions, searchQuery, t]);

  const visibleSearchSuggestions = useMemo(() => (
    searchSuggestions.slice(0, searchQuery.trim() ? 5 : 4)
  ), [searchSuggestions, searchQuery]);

  const visibleRecentSearchSuggestions = useMemo(() => (
    recentSearchSuggestions.slice(0, searchQuery.trim() ? 3 : 4)
  ), [recentSearchSuggestions, searchQuery]);

  const hasSearchDropdown = visibleRecentSearchSuggestions.length > 0 || visibleSearchSuggestions.length > 0;

  // Disable body scroll when modals are open
  useEffect(() => {
    if (isFilterModalOpen || agentModalProduct || selectedProduct) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isFilterModalOpen, agentModalProduct, selectedProduct, qcModalProduct]);

  const openQCModal = async (product) => {
    setQcModalProduct(product);
    setQcLoading(true);
    setQcData(null);
    setActiveAlbumIndex(0);

    try {
      const res = await fetch(`/api/qc?url=${encodeURIComponent(product.link)}`);
      const data = await res.json();
      setQcData(data);
    } catch (err) {
      console.error("QC Fetch error:", err);
      setError({ message: "Błąd podczas pobierania zdjęć QC", type: "error" });
    } finally {
      setQcLoading(false);
    }
  };

  const closeQCModal = () => {
    setQcModalProduct(null);
    setQcData(null);
  };

  // Toast Timer

  // Interaction Handlers
  const handleVote = async (productId, voteType) => {
    if (!user) {
      setError({ message: 'Musisz być zalogowany, aby polubiać produkty!', type: 'error' });
      return;
    }

    // Optimistic Update
    const updateState = (product) => {
      if (product._id !== productId) return product;
      const newProduct = { ...product };

      const isLiked = newProduct.isLiked;
      const isDisliked = newProduct.isDisliked;

      if ((voteType === 'like' && isLiked) || (voteType === 'dislike' && isDisliked)) {
        // Toggle off (DELETE)
        if (voteType === 'like') {
          newProduct.isLiked = false;
          newProduct.likes = Math.max(0, newProduct.likes - 1);
        } else {
          newProduct.isDisliked = false;
          newProduct.dislikes = Math.max(0, newProduct.dislikes - 1);
        }
      } else {
        // Switch or Add (POST)
        if (voteType === 'like') {
          if (isDisliked) {
            newProduct.isDisliked = false;
            newProduct.dislikes = Math.max(0, newProduct.dislikes - 1);
          }
          newProduct.isLiked = true;
          newProduct.likes++;
        } else {
          if (isLiked) {
            newProduct.isLiked = false;
            newProduct.likes = Math.max(0, newProduct.likes - 1);
          }
          newProduct.isDisliked = true;
          newProduct.dislikes++;
        }
      }
      return newProduct;
    };

    setProducts(prev => prev.map(updateState));
    if (selectedProduct && selectedProduct._id === productId) {
      setSelectedProduct(updateState(selectedProduct));
    }

    try {
      const currentProduct = products.find(p => p._id === productId) || selectedProduct;
      const isLiked = currentProduct?.isLiked;
      const isDisliked = currentProduct?.isDisliked;

      let action = 'POST';
      if ((voteType === 'like' && isLiked) || (voteType === 'dislike' && isDisliked)) {
        action = 'DELETE';
      }

      const endpoint = `/api/users/posts/${productId}/vote`;
      const options = {
        method: action,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteType })
      };

      const res = await fetchWithAuth(endpoint, options);
      if (!res.ok) throw new Error('Vote failed');

      if (action === 'DELETE') {
        setError({ message: voteType === 'like' ? 'Cofnięto polubienie' : 'Cofnięto dislike', type: 'success' });
      } else {
        setError({ message: voteType === 'like' ? 'Polubiono produkt!' : 'Zostawiono dislike', type: 'success' });
      }
    } catch (err) {
      console.error('Vote error:', err);
      setError({ message: 'Błąd głosowania', type: 'error' });
      // Revert state (simplified: just re-fetch or could implement proper revert)
      fetchData();
    }
  };

  const handleAddToWishlist = async (productId) => {
    if (!user) {
      setError({ message: 'Musisz być zalogowany, aby dodać do ulubionych!', type: 'error' });
      return;
    }

    // Optimistic Update
    const updateState = (product) => {
      if (product._id !== productId) return product;
      return { ...product, isFavorited: !product.isFavorited };
    };

    setProducts(prev => prev.map(updateState));
    if (selectedProduct && selectedProduct._id === productId) {
      setSelectedProduct(updateState(selectedProduct));
    }

    try {
      const currentProduct = products.find(p => p._id === productId) || selectedProduct;
      const isFavorited = currentProduct?.isFavorited;

      const endpoint = `/api/users/favorites/${productId}`;
      const method = isFavorited ? 'DELETE' : 'POST';

      const res = await fetchWithAuth(endpoint, { method });
      const data = await res.json();

      if (!data.success) throw new Error(data.message || 'Error');

      setError({
        message: isFavorited ? 'Usunięto z ulubionych' : 'Dodano do ulubionych!',
        type: 'success'
      });
    } catch (err) {
      console.error('Wishlist error:', err);
      setError({ message: 'Błąd ulubionych', type: 'error' });
      fetchData();
    }
  };

  // Reset page when filters change
  const handleSearchChange = (e) => {
    const nextQuery = e.target.value;
    setSearchQuery(nextQuery);
    if (nextQuery.trim()) {
      setSelectedCategories([]);
      setSelectedBatch('');
      setPriceRange({ min: '', max: '' });
    }
    setPage(1);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveRecentSearch(searchQuery);
      setIsSearchFocused(false);
    }
  };

  const handleSuggestionSelect = (suggestion) => {
    if (suggestion.type === 'category') {
      setSelectedCategories([suggestion.value]);
      setSearchQuery('');
    } else {
      setSelectedCategories([]);
      setSelectedBatch('');
      setPriceRange({ min: '', max: '' });
      setSearchQuery(suggestion.value);
      saveRecentSearch(suggestion.value);
    }
    setIsSearchFocused(false);
    setPage(1);
  };

  const handleCategoryToggle = (category) => {
    if (category === 'all') {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(prev =>
        prev.includes(category)
          ? prev.filter(c => c !== category)
          : [...prev, category]
      );
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setSelectedCategories([]);
    setSelectedSeason('all');
    setSelectedBatch('');
    setSearchQuery('');
    setPriceRange({ min: '', max: '' });
    setSortField('price');
    setSortOrder('asc');
    setPage(1);
    setIsFilterModalOpen(false);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openDescriptionModal = (product) => setSelectedProduct(product);
  const closeDescriptionModal = () => setSelectedProduct(null);

  const openAgentModal = (product) => {
    setAgentModalProduct(product);
  };

  const closeAgentModal = () => {
    setAgentModalProduct(null);
    setCopiedId(null);
  };

  const copyAgentLink = (e, product, agentValue) => {
    e.preventDefault();
    e.stopPropagation();
    const link = convertLink(product.link, agentValue);
    navigator.clipboard.writeText(link);
    setCopiedId(agentValue);
    trackStat(product._id, 'product_click', agentValue);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.skeletonGrid}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className={styles.skeletonCard}></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className={styles.productsSection} id="products">
      {/* Toast Notification */}
      {error.message && (
        <div className={`${styles.errorMessage} ${error.type === 'success' ? styles.success : ''}`}>
          <span>{error.message}</span>
          <button onClick={() => setError({ message: null, type: null })} className={styles.errorCloseButton}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className={styles.headerSection}>
        {/* Top Bar: Search + Filter Button */}
        <div className={styles.topBar}>
          <div className={styles.searchWrapper}>
            <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t('products.searchPlaceholder')}
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                saveRecentSearch(searchQuery);
                setTimeout(() => setIsSearchFocused(false), 120);
              }}
            />
            {isSearchFocused && hasSearchDropdown && (
              <div className={styles.searchSuggestions}>
                {visibleRecentSearchSuggestions.length > 0 && (
                  <div className={styles.suggestionSectionLabel}>Ostatnie wyszukiwania</div>
                )}
                {visibleRecentSearchSuggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.type}-${suggestion.value}`}
                    type="button"
                    className={styles.searchSuggestionItem}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSuggestionSelect(suggestion)}
                  >
                    <span className={styles.suggestionIcon}>
                      <FontAwesomeIcon icon={faClock} />
                    </span>
                    <span className={styles.suggestionText}>{suggestion.label}</span>
                    <span className={styles.suggestionMeta}>{suggestion.meta}</span>
                  </button>
                ))}
                {visibleRecentSearchSuggestions.length > 0 && visibleSearchSuggestions.length > 0 && (
                  <div className={styles.suggestionDivider} />
                )}
                {visibleSearchSuggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.type}-${suggestion.value}`}
                    type="button"
                    className={styles.searchSuggestionItem}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSuggestionSelect(suggestion)}
                  >
                    <span className={styles.suggestionIcon}>
                      <FontAwesomeIcon icon={suggestion.type === 'category' ? faLayerGroup : suggestion.type === 'brand' ? faTags : faSearch} />
                    </span>
                    <span className={styles.suggestionText}>{suggestion.label}</span>
                    <span className={styles.suggestionMeta}>{suggestion.meta}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <button
            className={styles.filterTriggerBtn}
            onClick={() => setIsFilterModalOpen(true)}
          >
            <FontAwesomeIcon icon={faFilter} /> {t('products.filters')}
          </button>

          <div className={styles.productCountBadge}>
            <span className={styles.countNumber}>{allProducts.length}</span>
            <span className={styles.countText}>{t('products.productsCount')}</span>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className={styles.productsGrid}>
        {loading ? (
          <div className={styles.loadingState}>
            <FontAwesomeIcon icon={faSpinner} className={styles.stateIcon} spin />
            <span className={styles.stateText}>{t('products.loading')}</span>
          </div>
        ) : products.length === 0 ? (
          <div className={styles.noResultsState}>
            <FontAwesomeIcon icon={faBoxOpen} className={styles.stateIcon} />
            <span className={styles.stateText}>{t('products.noResults')}</span>
          </div>
        ) : (
          products.map((product, index) => (
            <div
              key={product._id}
              className={styles.productCard}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className={styles.imageWrapper}>
                <Image
                  src={product.image}
                  alt={product.name}
                  width={300}
                  height={300}
                  className={styles.productImage}
                  unoptimized={true}
                />
              </div>
              <div className={styles.cardContent}>
                <div className={styles.cardTags}>
                  {product.category && <span className={styles.tagCategory}>{product.category.toUpperCase()}</span>}
                  {product.batch === 'best' && <span className={styles.tagBest}>BEST BATCH</span>}
                  {product.batch === 'budget' && <span className={styles.tagBudget}>BUDGET BATCH</span>}
                </div>
                
                <h3 className={styles.productName}>{product.name}</h3>
                
                <div className={styles.cardPriceRow}>
                  <span className={styles.price}>{formatPrice(product.price)}</span>
                </div>

                <div className={styles.cardActionRow}>
                  <button
                    className={styles.qcBtn}
                    onClick={() => openQCModal(product)}
                    title="Zobacz zdjęcia QC"
                  >
                    <FontAwesomeIcon icon={faCamera} />
                  </button>
                  <button
                    className={styles.viewBtnFull}
                    onClick={() => openAgentModal(product)}
                  >
                    Zobacz agentów
                  </button>
                  <button
                    className={`${styles.quickCopyBtn} ${quickCopiedId === product._id ? styles.quickCopied : ''}`}
                    onClick={(e) => handleQuickCopy(e, product)}
                    title="Kopiuj link do agenta"
                  >
                    {quickCopiedId === product._id ? (
                      <FontAwesomeIcon icon={faCheck} className={styles.quickCopyIcon} />
                    ) : (
                      <>
                        <img src={preferredAgentLogo} alt="Agent" className={styles.quickCopyAgentImg} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && products.length > 0 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={page === 1}
            onClick={() => handlePageChange(page - 1)}
          >
            {t('products.prev')}
          </button>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{page} / {totalPages}</span>
          <button
            className={styles.pageBtn}
            disabled={page === totalPages}
            onClick={() => handlePageChange(page + 1)}
          >
            {t('products.next')}
          </button>
        </div>
      )}

      {/* Filter Modal */}
      {isFilterModalOpen && (
        <div className={styles.filterModalOverlay} onClick={() => setIsFilterModalOpen(false)}>
          <div className={styles.filterModal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{t('products.filterTitle')}</h2>
              <button className={styles.closeModalBtn} onClick={() => setIsFilterModalOpen(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Categories */}
              <div className={styles.filterSection}>
                <h4 className={styles.filterSectionTitle}>{t('products.categories')}</h4>
                <div className={styles.categoriesList}>
                  <button
                    className={`${styles.categoryListItem} ${selectedCategories.length === 0 ? styles.active : ''}`}
                    onClick={() => handleCategoryToggle('all')}
                  >
                    All
                  </button>
                  {categories.map((category, index) => (
                    <button
                      key={index}
                      className={`${styles.categoryListItem} ${selectedCategories.includes(category) ? styles.active : ''}`}
                      onClick={() => handleCategoryToggle(category)}
                    >
                      {t(`products.${category}`) || category.charAt(0).toUpperCase() + category.slice(1)}
                    </button>
                  ))}
                </div>
              </div>


            </div>

            <div className={styles.modalFooter}>
              <button className={styles.clearBtn} onClick={handleResetFilters}>{t('products.clearAll')}</button>
              <button className={styles.applyBtn} onClick={() => setIsFilterModalOpen(false)}>{t('products.showResults')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Agent Selection Modal */}
      {agentModalProduct && (
        <div className={styles.agentModalOverlay} onClick={closeAgentModal}>
          <div className={styles.agentModalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.agentModalHeader}>
              <h2 className={styles.agentModalTitle}>{t('products.chooseAgent')}</h2>
              <button className={styles.closeModalBtn} onClick={closeAgentModal}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className={styles.agentList}>
              {SUPPORTED_AGENTS.map((agent) => (
                <div key={agent.value} className={styles.agentItem}>
                  <a
                    href={convertLink(agentModalProduct.link, agent.value)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.agentMain}
                  >
                    <img src={agent.icon} alt={agent.label} className={styles.agentIcon} />
                    <span className={styles.agentName}>{agent.label}</span>
                    <FontAwesomeIcon icon={faChevronRight} className={styles.agentArrow} />
                  </a>
                  <button
                    className={`${styles.agentCopyBtn} ${copiedId === agent.value ? styles.copied : ''}`}
                    onClick={(e) => copyAgentLink(e, agentModalProduct, agent.value)}
                    title="Copy Link"
                  >
                    <FontAwesomeIcon icon={copiedId === agent.value ? faCheck : faCopy} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* QC Modal */}
      {qcModalProduct && (
        <div className={styles.qcModalOverlay} onClick={closeQCModal}>
          <div className={styles.qcModalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.qcModalHeader}>
              <div className={styles.qcHeaderTitleGroup}>
                <h2 className={styles.qcModalTitle}>Zdjęcia QC</h2>
                <span className={styles.qcProductName}>{qcModalProduct.name}</span>
              </div>
              <button className={styles.closeModalBtn} onClick={closeQCModal}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className={styles.qcModalBody}>
              {qcLoading ? (
                <div className={styles.qcLoadingState}>
                  <FontAwesomeIcon icon={faSpinner} spin className={styles.qcLoadingIcon} />
                  <p>Pobieranie zdjęć od picks.ly...</p>
                </div>
              ) : qcData && qcData.success ? (
                <div className={styles.qcContent}>
                  {qcData.albums && qcData.albums.length > 0 ? (
                    <>
                      <div className={styles.qcAlbumsNav}>
                        {qcData.albums.map((album, idx) => (
                          <button
                            key={idx}
                            className={`${styles.albumTab} ${activeAlbumIndex === idx ? styles.active : ''}`}
                            onClick={() => setActiveAlbumIndex(idx)}
                          >
                            Album {idx + 1}
                            <span className={styles.albumImgCount}>{album.image_count} zdj.</span>
                          </button>
                        ))}
                      </div>

                      <div className={styles.qcImageGrid}>
                        {qcData.albums[activeAlbumIndex].images.map((img, i) => (
                          <div key={i} className={styles.qcImageWrapper}>
                            <img src={img} alt={`QC Photo ${i + 1}`} loading="lazy" />
                          </div>
                        ))}
                      </div>

                      <div className={styles.qcFooterInfo}>
                        {qcData.total_albums_available > qcData.albums.length && (
                          <a 
                            href={qcData.picksly_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={styles.seeAllLink}
                          >
                            Zobacz wszystkie {qcData.total_albums_available} albumy na picks.ly <FontAwesomeIcon icon={faArrowRight} />
                          </a>
                        )}
                        <div className={styles.qcAttribution}>
                          {qcData.attribution} — <a href={qcData.picksly_url} target="_blank" rel="noopener noreferrer">Otwórz w nowej karcie</a>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className={styles.qcEmptyState}>
                      <FontAwesomeIcon icon={faBoxOpen} className={styles.qcEmptyIcon} />
                      <p>Brak dostępnych zdjęć QC dla tego produktu.</p>
                      <a href={qcData.picksly_url} target="_blank" rel="noopener noreferrer" className={styles.pickslyRedirectBtn}>
                        Sprawdź na picks.ly
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.qcErrorState}>
                  <FontAwesomeIcon icon={faInfoCircle} className={styles.qcErrorIcon} />
                  <p>{qcData?.error || "Nie udało się załadować zdjęć QC."}</p>
                  {qcData?.picksly_url && (
                    <a href={qcData.picksly_url} target="_blank" rel="noopener noreferrer" className={styles.pickslyRedirectBtn}>
                      Odwiedź picks.ly
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
