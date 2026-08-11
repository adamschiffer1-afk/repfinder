'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from '@/styles/Products.module.css';
import AgentModal from '@/components/AgentModal';
import { categoriesData } from '@/data/productsData';
import { useCurrency } from '@/hooks/useCurrency';

export default function ProductsPage() {
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [displayCount, setDisplayCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Get currency conversion utilities
  const { formatPrice } = useCurrency();
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
        
        // Fetch from API
        const res = await fetch('/api/products?limit=1000');
        if (!res.ok) {
          throw new Error('Failed to fetch products');
        }
        
        const data = await res.json();
        
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
        
        console.log('Fetched products from API, count:', products.length);
        setAllProducts(products);
        setFilteredProducts(products);
        
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
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter products based on search query and categories
  useEffect(() => {
    // Skip transition on initial load
    if (allProducts.length === 0) return;
    
    // Only trigger transition if something actually changed
    if (searchQuery.trim() === '' && selectedCategories.length === 0 && filteredProducts.length === allProducts.length) return;
    
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
          // Regular category filter
          filtered = filtered.filter(product =>
            selectedCategories.includes(product.category)
          );
        }
      }
      
      setFilteredProducts(filtered);
      setDisplayCount(PRODUCTS_PER_LOAD); // Reset to initial load amount
      
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategories, allProducts]);

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
    setSelectedProduct(product);
  };

  const handleCloseAgentModal = () => {
    setSelectedProduct(null);
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
          {/* Search Bar */}
          <div className={styles.searchWrapper} ref={searchRef}>
            <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              className={styles.searchInput}
            />
            
            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className={styles.suggestionsDropdown}>
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className={styles.suggestionItem}
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5 }}>
                      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span>{suggestion}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Categories Bar */}
          <div className={styles.categoriesBar}>
            {/* Popular Button - Shows products with batch='popular' */}
            <button
              className={`${styles.categoryPill} ${styles.popularPill} ${selectedCategories.includes('__popular__') ? styles.categoryPillActive : ''}`}
              onClick={() => {
                if (selectedCategories.includes('__popular__')) {
                  setSelectedCategories([]);
                } else {
                  setSelectedCategories(['__popular__']);
                }
              }}
            >
              🔥 Popular
            </button>
            
            <button
              className={`${styles.categoryPill} ${selectedCategories.length === 0 || selectedCategories.includes('__popular__') ? '' : styles.categoryPillActive}`}
              onClick={() => setSelectedCategories([])}
            >
              All
            </button>
            {categoriesData.map((cat) => (
              <button
                key={cat}
                className={`${styles.categoryPill} ${selectedCategories.includes(cat) ? styles.categoryPillActive : ''}`}
                onClick={() => {
                  if (selectedCategories.includes(cat)) {
                    setSelectedCategories([]);
                  } else {
                    setSelectedCategories([cat]);
                  }
                }}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' & ')}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className={`${styles.productsGrid} ${isTransitioning ? styles.fadeOut : styles.fadeIn}`}>
          {loading ? (
            // Loading skeleton
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonImage}></div>
                <div className={styles.skeletonText}></div>
                <div className={styles.skeletonText} style={{ width: '60%' }}></div>
              </div>
            ))
          ) : displayedProducts.length === 0 ? (
            // No results message
            <div className={styles.noResults}>
              <p>No products found for "{searchQuery}"</p>
            </div>
          ) : (
            // Product Cards
            displayedProducts.map((product, index) => (
              <div key={`${product._id}-${index}`} className={styles.productCard} style={{ animationDelay: `${index * 0.03}s` }}>
                {/* Product Image */}
                <div className={styles.imageWrapper}>
                  <img src={product.image} alt={product.name} className={styles.productImage} />
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
                    onClick={() => handleOpenAgentModal(product)}
                  >
                    See agents
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Loading More Indicator */}
        {!loading && hasMore && (
          <div ref={sentinelRef} className={styles.loadingMore}>
            {isLoadingMore && (
              <div className={styles.loadingSpinner}>
                <div className={styles.spinner}></div>
                <span>Loading more products...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Agent Modal */}
      {selectedProduct && (
        <AgentModal 
          isOpen={true}
          product={selectedProduct} 
          onClose={handleCloseAgentModal}
        />
      )}
    </>
  );
}
