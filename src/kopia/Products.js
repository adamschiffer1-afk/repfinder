'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from '@/styles/Products.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faDollarSign, faCheckCircle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortField, setSortField] = useState('price');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [limit] = useState(24);
  const [totalPages, setTotalPages] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRandom, setIsRandom] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedCategories.length > 0) {
        params.append('category', selectedCategories.join(','));
      }
      if (selectedSeason && selectedSeason !== 'all') params.append('season', selectedSeason);
      if (searchQuery) params.append('search', searchQuery);
      if (priceRange.min) params.append('minPrice', priceRange.min);
      if (priceRange.max) params.append('maxPrice', priceRange.max);
      if (selectedBatch) params.append('batch', selectedBatch.toLowerCase());
      params.append('limit', limit);
      params.append('page', page);

      if (sortField === 'random') {
        params.append('random', 'true');
      } else {
        params.append('sortField', sortField);
        params.append('sortOrder', sortOrder);
      }

      const productsRes = await fetch(`https://dev.vectoreps.pl/api/products?${params.toString()}`);
      if (!productsRes.ok) throw new Error('Failed to fetch products');
      const productsData = await productsRes.json();
      if (!productsData.success) throw new Error(productsData.message);
      const normalizedProducts = productsData.products.map(product => ({
        ...product,
        batch: product.batch ? product.batch.toLowerCase() : product.batch
      }));
      setProducts(normalizedProducts || []);
      setTotalPages(productsData.totalPages || 1);

      const categoriesRes = await fetch('https://dev.vectoreps.pl/api/products/categories/list');
      if (!categoriesRes.ok) throw new Error('Failed to fetch categories');
      const categoriesData = await categoriesRes.json();
      setCategories(categoriesData.categories || []);

      const seasonsRes = await fetch('https://dev.vectoreps.pl/api/products/seasons/list');
      if (!seasonsRes.ok) throw new Error('Failed to fetch seasons');
      const seasonsData = await seasonsRes.json();
      const validSeasons = (seasonsData.seasons || []).filter(
        (season) => season && typeof season === 'string' && season.toLowerCase() !== 'none'
      );
      setSeasons(validSeasons);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
      setLoading(false);
    }
  }, [
    selectedCategories,
    selectedSeason,
    selectedBatch,
    searchQuery,
    priceRange.min,
    priceRange.max,
    sortField,
    sortOrder,
    page,
    limit,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResetFilters = () => {
    setSelectedCategories([]);
    setSelectedSeason('all');
    setSelectedBatch('');
    setSearchQuery('');
    setPriceRange({ min: '', max: '' });
    setSortField('price');
    setSortOrder('asc');
    setPage(1);
    setIsRandom(false);
  };

  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFilterChange = (setter, isArray = false) => (value) => {
    if (isArray) {
      const updatedCategories = selectedCategories.includes(value)
        ? selectedCategories.filter((cat) => cat !== value)
        : [...selectedCategories, value];
      setter(updatedCategories);
    } else {
      setter(value);
    }
    setPage(1);
    setIsRandom(false);
  };

  const handleQualityCheck = (productLink) => {
    const encodedUrl = encodeURIComponent(productLink);
    router.push(`/qc?qcurl=${encodedUrl}`);
  };

  const openDescriptionModal = (product) => {
    setSelectedProduct(product);
  };

  const closeDescriptionModal = () => {
    setSelectedProduct(null);
  };

  return (
    <div className={styles.container}>
      {!isFilterOpen && (
        <button
          className={`${styles.filterToggle} ${isFilterOpen ? styles.active : ''}`}
          onClick={toggleFilter}
        >
          <span className={styles.hamburgerIcon}>☰</span>
          Filtry
        </button>
      )}

      {isFilterOpen && <div className={styles.backdrop} onClick={toggleFilter}></div>}

      <div className="d-flex">
        <div className={`${styles.filterPanel} ${isFilterOpen ? styles.open : ''}`}>
          <div className={styles.filterHeader}>
            <h5 className={styles.filterTitle}>Filtry</h5>
            <button
              className={`${styles.filterToggle} ${styles.closeButton} ${isFilterOpen ? styles.active : ''}`}
              onClick={toggleFilter}
            >
              <span className={styles.hamburgerIcon}>✕</span>
            </button>
          </div>

          <button className={styles.resetButton} onClick={handleResetFilters}>
            Resetuj
          </button>

          <div className="mb-4">
            <label className={styles.filterLabel}>Wyszukiwarka</label>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="Wyszukaj po nazwie..."
              value={searchQuery}
              onChange={(e) => handleFilterChange(setSearchQuery)(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className={styles.filterLabel}>Sortuj według</label>
            <select
              className={styles.filterSelect}
              value={sortField}
              onChange={(e) => handleFilterChange(setSortField)(e.target.value)}
            >
              <option value="price">Cena</option>
              <option value="random">Losowo</option>
            </select>
            {sortField !== 'random' && (
              <select
                className={styles.filterSelect}
                value={sortOrder}
                onChange={(e) => handleFilterChange(setSortOrder)(e.target.value)}
              >
                <option value="asc">Rosnąco</option>
                <option value="desc">Malejąco</option>
              </select>
            )}
          </div>

          <div className="mb-4">
            <label className={styles.filterLabel}>Zakres cen</label>
            <div className="d-flex gap-2">
              <input
                type="number"
                className={styles.filterInput}
                placeholder="$ Min"
                value={priceRange.min}
                onChange={(e) =>
                  handleFilterChange(setPriceRange)({
                    ...priceRange,
                    min: e.target.value,
                  })
                }
              />
              <input
                type="number"
                className={styles.filterInput}
                placeholder="$ Max"
                value={priceRange.max}
                onChange={(e) =>
                  handleFilterChange(setPriceRange)({
                    ...priceRange,
                    max: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="mb-4">
            <h6 className={styles.filterSubtitle}>Kategorie</h6>
            <div className={styles.categoryButtons}>
              {categories.map((category, index) => (
                <button
                  key={index}
                  className={`${styles.categoryButton} ${
                    selectedCategories.includes(category) ? styles.active : ''
                  }`}
                  onClick={() => handleFilterChange(setSelectedCategories, true)(category)}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h6 className={styles.filterSubtitle}>Sezony</h6>
            <select
              className={styles.filterSelect}
              value={selectedSeason}
              onChange={(e) => handleFilterChange(setSelectedSeason)(e.target.value)}
            >
              <option value="all">Wszystkie</option>
              {seasons.length > 0 ? (
                seasons.map((season) => (
                  <option key={season} value={season}>
                    {season.charAt(0).toUpperCase() + season.slice(1)}
                  </option>
                ))
              ) : (
                <option disabled>Brak dostępnych sezonów</option>
              )}
            </select>
          </div>

          <div className="mb-4">
            <h6 className={styles.filterSubtitle}>Batche</h6>
            <select
              className={styles.filterSelect}
              value={selectedBatch}
              onChange={(e) => handleFilterChange(setSelectedBatch)(e.target.value)}
            >
              <option value="">Wszystkie</option>
              <option value="best">Best</option>
              <option value="budget">Budget</option>
              <option value="random">Random</option>
            </select>
          </div>

          <button className={styles.applyButton} onClick={fetchData}>
            Zastosuj filtry
          </button>
        </div>

        <div className={`${styles.productsGrid} ${isFilterOpen ? styles.open : ''}`}>
          <div className="row">
            {loading ? (
              <div className={`${styles.message} ${styles.loadingMessage}`}>Ładowanie...</div>
            ) : error ? (
              <div className={`${styles.message} ${styles.errorMessage}`}>Błąd: {error}</div>
            ) : products.length === 0 ? (
              <div className={`${styles.message} ${styles.noProductsMessage}`}>
                Nie znaleziono produktów.
              </div>
            ) : (
              products.map((product) => (
                <div key={product._id} className="col-6 col-md-4 col-lg-3 col-xl-2 mb-4">
                  <div className={`${styles.productCard} ${styles.fadeIn}`}>
                    <div className={styles.imageWrapper}>
                      <Image
                        src={product.image}
                        alt={product.name}
                        width={300}
                        height={300}
                        className={styles.productImage}
                        style={{ objectFit: 'contain' }}
                      />
                      <div className={styles.batchIndicators}>
                        {product.isNew && (
                          <div className={`${styles.batchIndicator} ${styles.newIndicator}`}>
                            <FontAwesomeIcon icon={faStar} className={styles.newIcon} />
                            <span>New</span>
                          </div>
                        )}
                        {product.batch === 'best' && (
                          <div className={`${styles.batchIndicator} ${styles.bestIndicator}`}>
                            <FontAwesomeIcon icon={faStar} className={styles.bestIcon} />
                            <span>Best</span>
                          </div>
                        )}
                        {product.batch === 'budget' && (
                          <div className={`${styles.batchIndicator} ${styles.budgetIndicator}`}>
                            <FontAwesomeIcon icon={faDollarSign} className={styles.budgetIcon} />
                            <span>Budget</span>
                          </div>
                        )}
                      </div>
                      <div className={styles.overlay}>
                        <a
                          href={product.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.viewButton}
                        >
                          Zobacz produkt
                        </a>
                      </div>
                    </div>
                    <div className={styles.cardBody}>
                      <h6 className={styles.cardTitle}>{product.name}</h6>
                      <div className={styles.cardFooter}>
                        <div className={styles.priceContainer}>
                          <p className={styles.cardPrice}>{product.price} PLN</p>
                          <button
                            className={`${styles.qualityCheckIcon} ${styles.qualityCheckButton}`}
                            title="Sprawdź jakość"
                            aria-label="Sprawdź jakość produktu"
                            onClick={() => handleQualityCheck(product.link)}
                          >
                            <FontAwesomeIcon icon={faCheckCircle} />
                          </button>
                        </div>
                        <button
                          className={`${styles.descriptionButton} ${
                            !product.desc || product.desc === 'Brak opisu' ? styles.disabled : ''
                          }`}
                          onClick={() => product.desc && product.desc !== 'Brak opisu' && openDescriptionModal(product)}
                          aria-label="Pokaż opis produktu"
                          disabled={!product.desc || product.desc === 'Brak opisu'}
                        >
                          <FontAwesomeIcon icon={faInfoCircle} className={styles.descriptionIcon} />
                          {product.desc && product.desc !== 'Brak opisu' ? 'Pokaż opis' : 'Brak opisu'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {!loading && products.length > 0 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageButton}
                disabled={page === 1}
                onClick={() => handlePageChange(page - 1)}
              >
                Poprzednia
              </button>
              <span className={styles.pageInfo}>
                Strona {page} z {totalPages}
              </span>
              <button
                className={styles.pageButton}
                disabled={page === totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                Następna
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedProduct && (
        <div className={styles.descriptionModal}>
          <div className={styles.modalContent}>
            <button
              className={styles.closeModalButton}
              onClick={closeDescriptionModal}
              aria-label="Zamknij okno opisu"
            >
              ✕
            </button>
            <h5 className={styles.modalTitle}>{selectedProduct.name}</h5>
            <div className={styles.modalImageWrapper}>
              <Image
                src={selectedProduct.image}
                alt={selectedProduct.name}
                width={120}
                height={120}
                className={styles.modalImage}
                style={{ objectFit: 'contain' }}
              />
            </div>
            <p className={styles.modalPrice}>{selectedProduct.price} PLN</p>
            <p className={styles.modalDescription}>{selectedProduct.desc}</p>
            <a
              href={selectedProduct.link}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.modalViewButton}
            >
              Zobacz produkt
            </a>
          </div>
        </div>
      )}
    </div>
  );
}