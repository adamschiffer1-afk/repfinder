'use client';

import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from '@/styles/Products.module.css';
import { useAuth } from '@/context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faFilter,
  faTimes,
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
  faThumbsUp,
  faThumbsDown,
  faHeart,
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

const compactNormalizedText = (value = '') => value.replace(/\s+/g, '');

const compactSearchText = (value = '') => compactNormalizedText(normalizeSearchText(value));

const SEARCH_SYNONYM_GROUPS_BY_PHRASE_LENGTH = [...SEARCH_SYNONYM_GROUPS].sort((groupA, groupB) => {
  const longest = (group) => Math.max(...group.map(term => normalizeSearchText(term).length), 0);
  return longest(groupB) - longest(groupA);
});

const createSearchIndex = (searchable = '') => {
  const normalizedSearchable = normalizeSearchText(searchable);
  return {
    searchable,
    normalizedSearchable,
    compactSearchable: compactNormalizedText(normalizedSearchable),
    fuzzyTokens: normalizedSearchable.split(' ').filter(token => token.length >= 4)
  };
};

const getProductSearchableText = (product = {}) => [
  product.name,
  product.category,
  product.batch
].filter(Boolean).join(' ');

const createProductSearchIndex = (product) => ({
  product,
  ...createSearchIndex(getProductSearchableText(product))
});

const getExpandedTermsForGroup = (group) => {
  const terms = new Set();
  group.forEach((term) => {
    const normalized = normalizeSearchText(term);
    const compact = compactSearchText(term);
    if (normalized) terms.add(normalized);
    if (compact) terms.add(compact);
  });
  return [...terms];
};

const getExpandedTermsForToken = (token) => {
  const terms = new Set();
  const normalized = normalizeSearchText(token);
  const compact = compactSearchText(token);
  if (normalized) terms.add(normalized);
  if (compact) terms.add(compact);

  SEARCH_SYNONYM_GROUPS.forEach((group) => {
    const normalizedGroup = group.map(normalizeSearchText);
    if (normalizedGroup.includes(normalized)) {
      getExpandedTermsForGroup(group).forEach(term => terms.add(term));
    }
  });

  return [...terms];
};

const getSearchClauses = (query) => {
  const normalized = normalizeSearchText(query);
  const compact = compactSearchText(query);
  if (!normalized && !compact) return [];

  let remainder = ` ${normalized} `;
  const clauses = [];

  SEARCH_SYNONYM_GROUPS_BY_PHRASE_LENGTH.forEach((group) => {
    const groupTerms = [...group].sort(
      (termA, termB) => normalizeSearchText(termB).length - normalizeSearchText(termA).length
    );

    for (const groupTerm of groupTerms) {
      const phrase = normalizeSearchText(groupTerm);
      if (!phrase) continue;

      const paddedPhrase = ` ${phrase} `;
      if (!remainder.includes(paddedPhrase)) continue;

      clauses.push(getExpandedTermsForGroup(group));
      remainder = remainder.split(paddedPhrase).join(' ');
      break;
    }
  });

  remainder
    .trim()
    .split(' ')
    .filter(token => token.length >= 2)
    .forEach(token => {
      clauses.push(getExpandedTermsForToken(token));
    });

  if (!clauses.length) {
    clauses.push([normalized, compact].filter(Boolean));
  }

  return clauses;
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

const getFuzzyQueryTokens = (query) => {
  const allQueryTokens = normalizeSearchText(query).split(' ').filter(Boolean);
  if (!allQueryTokens.length || allQueryTokens.some(token => token.length < 4)) return [];

  return allQueryTokens.filter(token => token.length >= 4);
};

const hasFuzzyTokenMatch = (queryTokens, productTokens) => {
  if (!queryTokens.length || !productTokens.length) return false;

  return queryTokens.every(queryToken =>
    productTokens.some(productToken => getEditDistance(queryToken, productToken) <= 1)
  );
};

const clauseMatchesSearchIndex = (clauseTerms, searchIndex) => (
  clauseTerms.some(term => (
    searchIndex.normalizedSearchable.includes(term)
    || searchIndex.compactSearchable.includes(term)
  ))
);

const matchesSuggestionQuery = (searchIndex, query) => {
  const normalizedQuery = normalizeSearchText(query);
  const compactQuery = compactSearchText(query);
  if (!normalizedQuery && !compactQuery) return true;
  if (!searchIndex?.normalizedSearchable) return false;

  if (
    searchIndex.normalizedSearchable.includes(normalizedQuery)
    || searchIndex.compactSearchable.includes(compactQuery)
  ) {
    return true;
  }

  const queryTokens = normalizedQuery.split(' ').filter(token => token.length >= 2);
  if (!queryTokens.length) return false;

  return queryTokens.every(token => (
    searchIndex.normalizedSearchable.includes(token)
    || searchIndex.compactSearchable.includes(compactSearchText(token))
  ));
};

const productMatchesSearch = (
  productOrSearchIndex,
  query,
  clauses = getSearchClauses(query),
  fuzzyQueryTokens = getFuzzyQueryTokens(query)
) => {
  if (!productOrSearchIndex) return false;

  const searchIndex = productOrSearchIndex.normalizedSearchable !== undefined
    ? productOrSearchIndex
    : createSearchIndex(getProductSearchableText(productOrSearchIndex));

  if (!searchIndex.normalizedSearchable) return false;

  const matchesClauses = clauses.length > 0
    && clauses.every(clauseTerms => clauseMatchesSearchIndex(clauseTerms, searchIndex));

  const fuzzyMatch = fuzzyQueryTokens.length > 0
    && hasFuzzyTokenMatch(fuzzyQueryTokens, searchIndex.fuzzyTokens);

  return matchesClauses || fuzzyMatch;
};

const shuffleArray = (items = []) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const buildApiSortParam = (sortField, sortOrder) => {
  if (sortField === 'price') return sortOrder === 'asc' ? 'price_asc' : 'price_desc';
  if (sortField === 'name') return sortOrder === 'asc' ? 'name_asc' : 'name_desc';
  return 'newest';
};

const ProductCard = memo(function ProductCard({
  product,
  index,
  formatPrice,
  preferredAgentLogo,
  quickCopied,
  onOpenAgent,
  onQuickCopy
}) {
  return (
    <div
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
            className={styles.viewBtnFull}
            onClick={() => onOpenAgent(product)}
          >
            Zobacz agentow
          </button>
          <button
            className={`${styles.quickCopyBtn} ${quickCopied ? styles.quickCopied : ''}`}
            onClick={(event) => onQuickCopy(event, product)}
            title="Kopiuj link do agenta"
          >
            {quickCopied ? (
              <FontAwesomeIcon icon={faCheck} className={styles.quickCopyIcon} />
            ) : (
              <img src={preferredAgentLogo} alt="Agent" className={styles.quickCopyAgentImg} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

export default function Products() {
  const { t } = useLanguage();
  const { user, fetchWithAuth } = useAuth();
  const { formatPrice } = useCurrency();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [categories, setCategories] = useState(categoriesData);
  const [suggestionNames, setSuggestionNames] = useState([]);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Filter States
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortField, setSortField] = useState('price');
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
  const [recentSearches, setRecentSearches] = useState([]);
  const [filteredProductCount, setFilteredProductCount] = useState(0);
  const productNameSuggestions = useMemo(() => (
    suggestionNames.map(({ name, count }) => ({
      type: 'product',
      label: name,
      meta: `${count} items`,
      value: name,
      count,
      ...createSearchIndex(name)
    }))
  ), [suggestionNames]);
  const catalogBrands = useMemo(
    () => [...SEARCH_BRANDS].sort((a, b) => a.localeCompare(b)),
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery, selectedCategories, selectedBatch, priceRange.min, priceRange.max, sortField, sortOrder]);

  const categoriesParam = selectedCategories.join(',');
  const priceMin = priceRange.min;
  const priceMax = priceRange.max;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort: buildApiSortParam(sortField, sortOrder)
      });

      if (debouncedSearchQuery) params.set('search', debouncedSearchQuery);
      if (categoriesParam) {
        const catArr = categoriesParam.split(',');
        if (catArr.length === 1) params.set('category', catArr[0]);
        else params.set('categories', categoriesParam);
      }
      if (selectedBatch && selectedBatch !== 'random') params.set('batch', selectedBatch);
      if (priceMin) params.set('minPrice', priceMin);
      if (priceMax) params.set('maxPrice', priceMax);

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();

      if (data?.products) {
        setProducts(sortField === 'random' ? shuffleArray(data.products) : data.products);
        setTotalPages(data.pages || 1);
        setFilteredProductCount(data.total ?? 0);
        setError({ message: null, type: null });
      } else {
        throw new Error(data?.error || 'Invalid products response');
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      const start = (page - 1) * limit;
      const fallback = [...productsData];
      setProducts(fallback.slice(start, start + limit));
      setFilteredProductCount(fallback.length);
      setTotalPages(Math.ceil(fallback.length / limit) || 1);
      setError({ message: 'Failed to load products from server, using local data', type: 'warning' });
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [
    page,
    limit,
    debouncedSearchQuery,
    categoriesParam,
    selectedBatch,
    priceMin,
    priceMax,
    sortField,
    sortOrder
  ]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (!isSearchFocused) return undefined;

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        const query = searchQuery.trim();
        const url = query
          ? `/api/products?suggest=names&search=${encodeURIComponent(query)}`
          : '/api/products?suggest=names';
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) setSuggestionNames(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Could not load search suggestions:', err);
        }
      }
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchQuery, isSearchFocused]);

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

  const trackStat = useCallback(async (productId, type = 'product_click', agent = null) => {
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
  }, []);

  const handleQuickCopy = useCallback((e, product) => {
    e.preventDefault();
    e.stopPropagation();
    const link = convertLink(product.link, preferredAgent);
    navigator.clipboard.writeText(link);
    setQuickCopiedId(product._id);
    trackStat(product._id, 'product_click', preferredAgent);
    setTimeout(() => setQuickCopiedId(null), 2000);
  }, [preferredAgent, trackStat]);

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

    const productSuggestions = productNameSuggestions
      .filter((suggestion) => matchesSuggestionQuery(suggestion, searchQuery))
      .slice(0, query ? 5 : 4)
      .map(({ type, label, meta, value }) => ({ type, label, meta, value }));

    const brandSuggestions = catalogBrands
      .filter(brand => {
        if (!query) return true;
        const normalizedBrand = normalizeSearchText(brand);
        const compactBrand = compactSearchText(brand);
        return (
          normalizedBrand.includes(query)
          || compactBrand.includes(compactQuery)
          || query.includes(normalizedBrand)
        );
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
  }, [
    catalogBrands,
    categories,
    productNameSuggestions,
    recentSearchSuggestions,
    searchQuery,
    t
  ]);

  const visibleSearchSuggestions = useMemo(() => (
    searchSuggestions.slice(0, searchQuery.trim() ? 5 : 4)
  ), [searchSuggestions, searchQuery]);

  const visibleRecentSearchSuggestions = useMemo(() => (
    recentSearchSuggestions.slice(0, searchQuery.trim() ? 3 : 4)
  ), [recentSearchSuggestions, searchQuery]);

  const hasSearchDropdown = (
    visibleRecentSearchSuggestions.length > 0
    || visibleSearchSuggestions.length > 0
    || !searchQuery.trim()
  );

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
  }, [isFilterModalOpen, agentModalProduct, selectedProduct]);

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
      fetchProducts();
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
      fetchProducts();
    }
  };

  // Reset page when filters change
  const handleSearchChange = (e) => {
    const nextQuery = e.target.value;
    setSearchQuery(nextQuery);
    setIsSearchFocused(true);
    if (nextQuery.trim()) {
      if (selectedCategories.length > 0) setSelectedCategories([]);
      if (selectedBatch !== '') setSelectedBatch('');
      if (priceRange.min !== '' || priceRange.max !== '') setPriceRange({ min: '', max: '' });
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
      const nextQuery = suggestion.value?.trim() || suggestion.label?.trim() || '';
      setSearchQuery(nextQuery);
      if (nextQuery) saveRecentSearch(nextQuery);
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

  const openAgentModal = useCallback((product) => {
    setAgentModalProduct(product);
  }, []);

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

  if (isInitialLoad && loading) {
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
              onClick={() => setIsSearchFocused(true)}
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
            <span className={styles.countNumber}>{filteredProductCount}</span>
            <span className={styles.countText}>{t('products.productsCount')}</span>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className={styles.productsGrid}>
        {loading ? (
          [...Array(8)].map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))
        ) : products.length === 0 ? (
          <div className={styles.noResultsState}>
            <FontAwesomeIcon icon={faBoxOpen} className={styles.stateIcon} />
            <span className={styles.stateText}>{t('products.noResults')}</span>
          </div>
        ) : (
          products.map((product, index) => (
            <ProductCard
              key={product._id}
              product={product}
              index={index}
              formatPrice={formatPrice}
              preferredAgentLogo={preferredAgentLogo}
              quickCopied={quickCopiedId === product._id}
              onOpenAgent={openAgentModal}
              onQuickCopy={handleQuickCopy}
            />
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
                    {t('products.allCategories')}
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

              <div className={styles.filterSection}>
                <h4 className={styles.filterSectionTitle}>{t('products.sortBy')}</h4>
                <div className={styles.filterRow}>
                  <select
                    className={styles.filterSelect}
                    value={`${sortField}_${sortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('_');
                      setSortField(field);
                      setSortOrder(order);
                    }}
                  >
                    <option value="price_asc">{t('products.sortPriceAsc')}</option>
                    <option value="price_desc">{t('products.sortPriceDesc')}</option>
                  </select>
                </div>
              </div>

              <div className={styles.filterSection}>
                <h4 className={styles.filterSectionTitle}>{t('products.priceRange')}</h4>
                <div className={styles.filterRow}>
                  <input
                    type="number"
                    className={styles.filterInput}
                    placeholder={t('products.priceMin')}
                    value={priceRange.min}
                    onChange={(e) => setPriceRange(current => ({ ...current, min: e.target.value }))}
                  />
                  <input
                    type="number"
                    className={styles.filterInput}
                    placeholder={t('products.priceMax')}
                    value={priceRange.max}
                    onChange={(e) => setPriceRange(current => ({ ...current, max: e.target.value }))}
                  />
                </div>
              </div>

              <div className={styles.filterSection}>
                <h4 className={styles.filterSectionTitle}>{t('products.tagsQuality')}</h4>
                <select
                  className={styles.filterSelect}
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                >
                  <option value="">{t('products.allTags')}</option>
                  <option value="best">{t('products.bestBatch')}</option>
                  <option value="budget">{t('products.budgetBatch')}</option>
                  <option value="random">{t('products.randomBatch')}</option>
                </select>
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
    </section>
  );
}
