'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import styles from '@/styles/Admin.module.css';
import { detectCategory, PRODUCT_CATEGORIES } from '@/utils/categoryHelper';

const ProductTable = memo(function ProductTable({ 
  products, 
  onEdit, 
  onDelete, 
  selectedIds, 
  onSelectSingle, 
  onSelectAll, 
  isAllSelected 
}) {
  if (products.length === 0) {
    return (
      <div className={styles.noProductsPlaceholder}>
        📭 Brak produktów spełniających podane kryteria.
      </div>
    );
  }

  return (
    <table className={styles.adminTable}>
      <thead>
        <tr>
          <th style={{ width: '40px', textAlign: 'center' }}>
            <label className={styles.checkboxContainer}>
              <input 
                type="checkbox" 
                checked={isAllSelected} 
                onChange={onSelectAll} 
              />
              <span className={styles.checkboxCustom}></span>
            </label>
          </th>
          <th>Zdjęcie</th>
          <th>Nazwa</th>
          <th>Cena</th>
          <th>Kategoria</th>
          <th>Batch</th>
          <th>Kliknięcia</th>
          <th>Przypięty</th>
          <th>Akcje</th>
        </tr>
      </thead>
      <tbody>
        {products.map(product => {
          const isSelected = selectedIds.includes(product._id);
          return (
            <tr key={product._id} className={isSelected ? styles.selectedRow : ''}>
              <td style={{ textAlign: 'center' }}>
                <label className={styles.checkboxContainer}>
                  <input 
                    type="checkbox" 
                    checked={isSelected} 
                    onChange={() => onSelectSingle(product._id)} 
                  />
                  <span className={styles.checkboxCustom}></span>
                </label>
              </td>
              <td>
                <div className={styles.tableImgContainer}>
                  <img src={product.image} alt="" className={styles.tableImg} />
                </div>
              </td>
              <td className={styles.productNameCell} title={product.name}>{product.name}</td>
              <td className={styles.priceCell}>${product.price}</td>
              <td>
                <span className={`${styles.badge} ${styles.categoryBadge}`}>{product.category}</span>
              </td>
              <td>
                <span className={`${styles.badge} ${styles.batchBadge} ${styles[`batchBadge_${product.batch}`]}`}>
                  {product.batch}
                </span>
              </td>
              <td className={styles.clicksCell}>📊 {product.clicks || 0}</td>
              <td>
                {product.isPinned ? (
                  <span className={styles.pinnedBadge}>
                    📌 Tak {product.pinnedOrder !== null && product.pinnedOrder !== undefined ? `(#${product.pinnedOrder})` : ''}
                  </span>
                ) : (
                  <span className={styles.unpinnedBadge}>Nie</span>
                )}
              </td>
              <td className={styles.actions}>
                <button className={styles.editBtn} onClick={() => onEdit(product)}>Edit</button>
                <button className={styles.deleteBtn} onClick={() => onDelete(product._id)}>Delete</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
});

export default function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showScraperModal, setShowScraperModal] = useState(false);
  const [scraperLoading, setScraperLoading] = useState(false);
  const [scraperStatus, setScraperStatus] = useState({ type: '', message: '' });
  const [scraperData, setScraperData] = useState({ name: '', url: '' });
  const [showBulkScraperModal, setShowBulkScraperModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ total: 0, current: 0, successes: 0, failures: 0, logs: [] });
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    image: '',
    category: 'shoes',
    batch: 'best',
    link: '',
    isPinned: false,
    pinnedOrder: ''
  });
  
  // Custom alerts and confirmations
  const [toasts, setToasts] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  // Pagination, search & advanced filters
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [totalProducts, setTotalProducts] = useState(0);
  
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterBatch, setFilterBatch] = useState('all');
  const [filterPinned, setFilterPinned] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Bulk actions selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Toast Helper
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // Confirmation dialog helper
  const askConfirmation = useCallback((title, message, onConfirm) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      }
    });
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const fetchProducts = useCallback(async (page = 1, search = debouncedSearchTerm, signal) => {
    try {
      setLoading(true);
      const searchParam = search.trim();
      let url = `/api/products?page=${page}&limit=50&admin=true`;
      
      if (searchParam) url += `&search=${encodeURIComponent(searchParam)}`;
      if (filterCategory !== 'all') url += `&category=${encodeURIComponent(filterCategory)}`;
      if (filterBatch !== 'all') url += `&batch=${encodeURIComponent(filterBatch)}`;
      if (filterPinned !== 'all') url += `&pinned=${encodeURIComponent(filterPinned)}`;
      if (sortBy) url += `&sort=${encodeURIComponent(sortBy)}`;

      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      if (signal?.aborted) return;
      
      if (data.products) {
        setProducts(data.products);
        setTotalPages(data.pages);
        setCurrentPage(data.page);
        setTotalProducts(data.total);
      } else {
        setProducts(data);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error(err);
      showToast("Błąd pobierania produktów. Sprawdź połączenie z bazą.", "error");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [debouncedSearchTerm, filterCategory, filterBatch, filterPinned, sortBy, showToast]);

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(1, debouncedSearchTerm, controller.signal);
    return () => controller.abort();
  }, [debouncedSearchTerm, filterCategory, filterBatch, filterPinned, sortBy, fetchProducts]);

  // Handle single selection toggling
  const handleSelectSingle = useCallback((id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  // Handle select all toggling on current page
  const isAllSelected = products.length > 0 && products.every(p => selectedIds.includes(p._id));
  
  const handleSelectAll = useCallback(() => {
    const pageIds = products.map(p => p._id);
    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => {
        const union = [...prev];
        pageIds.forEach(id => {
          if (!union.includes(id)) union.push(id);
        });
        return union;
      });
    }
  }, [products, isAllSelected]);

  // Bulk actions API calls
  const handleBulkDelete = useCallback(() => {
    askConfirmation(
      'Potwierdź masowe usunięcie',
      `Czy na pewno chcesz trwale usunąć ${selectedIds.length} zaznaczonych produktów? Tej operacji nie można cofnąć!`,
      async () => {
        try {
          const res = await fetch('/api/products', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selectedIds })
          });
          const data = await res.json();
          if (res.ok) {
            showToast(`Pomyślnie usunięto ${data.deletedCount} produktów!`, 'success');
            setSelectedIds([]);
            fetchProducts(currentPage);
          } else {
            showToast(data.error || 'Wystąpił błąd podczas usuwania.', 'error');
          }
        } catch (err) {
          showToast('Błąd połączenia z serwerem.', 'error');
        }
      }
    );
  }, [selectedIds, currentPage, fetchProducts, showToast, askConfirmation]);

  const handleBulkCategoryChange = useCallback((category) => {
    askConfirmation(
      'Zmień kategorię dla wielu produktów',
      `Czy na pewno chcesz zmienić kategorię dla ${selectedIds.length} produktów na "${category}"?`,
      async () => {
        try {
          const res = await fetch('/api/products', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selectedIds, update: { category } })
          });
          const data = await res.json();
          if (res.ok) {
            showToast(`Pomyślnie zmieniono kategorię dla ${data.modifiedCount} produktów!`, 'success');
            setSelectedIds([]);
            fetchProducts(currentPage);
          } else {
            showToast(data.error || 'Wystąpił błąd podczas aktualizacji.', 'error');
          }
        } catch (err) {
          showToast('Błąd połączenia z serwerem.', 'error');
        }
      }
    );
  }, [selectedIds, currentPage, fetchProducts, showToast, askConfirmation]);

  const handleBulkBatchChange = useCallback((batch) => {
    askConfirmation(
      'Zmień batch dla wielu produktów',
      `Czy na pewno chcesz zmienić batch dla ${selectedIds.length} produktów na "${batch}"?`,
      async () => {
        try {
          const res = await fetch('/api/products', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selectedIds, update: { batch } })
          });
          const data = await res.json();
          if (res.ok) {
            showToast(`Pomyślnie zmieniono tag batch dla ${data.modifiedCount} produktów!`, 'success');
            setSelectedIds([]);
            fetchProducts(currentPage);
          } else {
            showToast(data.error || 'Wystąpił błąd podczas aktualizacji.', 'error');
          }
        } catch (err) {
          showToast('Błąd połączenia z serwerem.', 'error');
        }
      }
    );
  }, [selectedIds, currentPage, fetchProducts, showToast, askConfirmation]);

  const handleBulkPinChange = useCallback((isPinned) => {
    askConfirmation(
      isPinned ? 'Masowe przypinanie' : 'Masowe odpinanie',
      `Czy chcesz ${isPinned ? 'przypiąć' : 'odpiąć'} ${selectedIds.length} zaznaczonych produktów?`,
      async () => {
        try {
          const res = await fetch('/api/products', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selectedIds, update: { isPinned } })
          });
          const data = await res.json();
          if (res.ok) {
            showToast(`Pomyślnie ${isPinned ? 'przypięto' : 'odpięto'} ${data.modifiedCount} produktów!`, 'success');
            setSelectedIds([]);
            fetchProducts(currentPage);
          } else {
            showToast(data.error || 'Wystąpił błąd podczas aktualizacji.', 'error');
          }
        } catch (err) {
          showToast('Błąd połączenia z serwerem.', 'error');
        }
      }
    );
  }, [selectedIds, currentPage, fetchProducts, showToast, askConfirmation]);

  const handleScrape = async (e) => {
    e.preventDefault();
    setScraperLoading(true);
    setScraperStatus({ type: '', message: '' });

    try {
      const res = await fetch('/api/admin/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scraperData)
      });

      const data = await res.json();

      if (res.ok) {
        setScraperStatus({ type: 'success', message: data.message });
        setScraperData({ name: '', url: '' });
        showToast('Dodano produkt ze scrapowania!', 'success');
        fetchProducts(currentPage);
        setTimeout(() => setShowScraperModal(false), 2000);
      } else {
        setScraperStatus({ type: 'error', message: data.error || 'Wystąpił błąd podczas scrapowania.' });
      }
    } catch (err) {
      setScraperStatus({ type: 'error', message: 'Błąd połączenia z serwerem.' });
    } finally {
      setScraperLoading(false);
    }
  };

  const handleBulkScrape = async (e) => {
    e.preventDefault();
    if (!bulkText.trim()) return;

    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.includes('weidian.com'));
    if (lines.length === 0) {
      showToast('Nie znaleziono prawidłowych linków do Weidian w tekście.', 'error');
      return;
    }

    const urlsToProcess = [...lines].reverse();

    setBulkLoading(true);
    setBulkProgress({ total: urlsToProcess.length, current: 0, successes: 0, failures: 0, logs: [] });

    let successes = 0;
    let failures = 0;
    let currentLogs = [];

    for (let i = 0; i < urlsToProcess.length; i++) {
      const url = urlsToProcess[i];
      try {
        const res = await fetch('/api/admin/scrape/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        const data = await res.json();
        
        if (res.ok) {
          successes++;
          currentLogs.push({ url, status: 'success', message: data.message });
        } else {
          failures++;
          currentLogs.push({ url, status: 'error', message: data.error || 'Błąd API' });
        }
      } catch (err) {
        failures++;
        currentLogs.push({ url, status: 'error', message: 'Błąd połączenia' });
      }

      setBulkProgress({
        total: urlsToProcess.length,
        current: i + 1,
        successes,
        failures,
        logs: currentLogs
      });
    }

    setBulkLoading(false);
    showToast(`Zakończono masowe dodawanie. Sukces: ${successes}, Błędy: ${failures}`, successes > 0 ? 'success' : 'error');
    if (successes > 0) {
      fetchProducts(1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editingProduct ? 'PUT' : 'POST';
    const url = editingProduct ? `/api/products/${editingProduct._id}` : '/api/products';

    const payload = {
      ...formData,
      isPinned: formData.isPinned,
      pinnedOrder: formData.isPinned && formData.pinnedOrder !== '' ? parseInt(formData.pinnedOrder, 10) : null
    };

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast(editingProduct ? 'Produkt został pomyślnie zaktualizowany!' : 'Nowy produkt został dodany!', 'success');
      fetchProducts(currentPage);
      setShowModal(false);
      setEditingProduct(null);
      setFormData({ name: '', price: '', image: '', category: 'shoes', batch: 'best', link: '', isPinned: false, pinnedOrder: '' });
    } else {
      showToast('Coś poszło nie tak podczas zapisywania produktu.', 'error');
    }
  };

  const handleDelete = useCallback((id) => {
    askConfirmation(
      'Usuwanie produktu',
      'Czy na pewno chcesz usunąć ten produkt? Tej akcji nie można cofnąć.',
      async () => {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast('Produkt został pomyślnie usunięty.', 'success');
          setSelectedIds(prev => prev.filter(x => x !== id));
          fetchProducts(currentPage);
        } else {
          showToast('Wystąpił błąd przy usuwaniu produktu.', 'error');
        }
      }
    );
  }, [currentPage, fetchProducts, showToast, askConfirmation]);

  const openEdit = useCallback((product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category,
      batch: product.batch,
      link: product.link,
      isPinned: product.isPinned || false,
      pinnedOrder: product.pinnedOrder !== null && product.pinnedOrder !== undefined ? String(product.pinnedOrder) : ''
    });
    setShowModal(true);
  }, []);

  return (
    <div className={styles.adminContainer}>
      <header className={styles.adminHeader}>
        <h1>Manage Products</h1>
        <div className={styles.adminNav}>
          <input 
            type="text" 
            placeholder="Szukaj produktów..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.adminSearch}
          />
          <button className={styles.scraperBtn} onClick={() => setShowScraperModal(true)}>
            🚀 Add via Scraper
          </button>
          <button className={styles.scraperBtn} onClick={() => setShowBulkScraperModal(true)}>
            📦 Collab Links
          </button>
          <button className={styles.navLink} onClick={() => {
            setEditingProduct(null);
            setFormData({ name: '', price: '', image: '', category: 'shoes', batch: 'best', link: '', isPinned: false, pinnedOrder: '' });
            setShowModal(true);
          }}>
            + Add Manually
          </button>
        </div>
      </header>

      {/* Advanced Filters Section */}
      <div className={styles.advancedFiltersCard}>
        <div className={styles.filterSection}>
          <span className={styles.filterLabel}>Kategoria:</span>
          <div className={styles.filterPills}>
            <button 
              className={`${styles.filterPill} ${filterCategory === 'all' ? styles.filterPillActive : ''}`} 
              onClick={() => setFilterCategory('all')}
            >
              Wszystkie
            </button>
            {PRODUCT_CATEGORIES.map(cat => (
              <button 
                key={cat} 
                className={`${styles.filterPill} ${filterCategory === cat ? styles.filterPillActive : ''}`} 
                onClick={() => setFilterCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterSection}>
          <span className={styles.filterLabel}>Batch tag:</span>
          <div className={styles.filterPills}>
            {['all', 'best', 'budget', 'random'].map(batch => (
              <button 
                key={batch} 
                className={`${styles.filterPill} ${filterBatch === batch ? styles.filterPillActive : ''}`} 
                onClick={() => setFilterBatch(batch)}
              >
                {batch === 'all' ? 'Wszystkie' : batch}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filtersBottomRow}>
          <div className={styles.filterSectionInline}>
            <span className={styles.filterLabel}>Status:</span>
            <div className={styles.filterPills}>
              {[
                { label: 'Wszystkie', value: 'all' },
                { label: '📌 Przypięte', value: 'true' },
                { label: '📍 Zwykłe', value: 'false' }
              ].map(opt => (
                <button 
                  key={opt.value} 
                  className={`${styles.filterPill} ${filterPinned === opt.value ? styles.filterPillActive : ''}`} 
                  onClick={() => setFilterPinned(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterSectionInline}>
            <span className={styles.filterLabel}>Sortowanie:</span>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className={styles.sortSelect}
            >
              <option value="newest">Najnowsze</option>
              <option value="oldest">Najstarsze</option>
              <option value="price_asc">Cena: rosnąco</option>
              <option value="price_desc">Cena: malejąco</option>
              <option value="clicks_desc">Najpopularniejsze (kliknięcia)</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '20px', opacity: 0.8, fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Znaleziono produktów: <strong>{totalProducts}</strong></span>
        {selectedIds.length > 0 && (
          <span style={{ color: '#a78bfa' }}>Zaznaczono: <strong>{selectedIds.length}</strong></span>
        )}
      </div>

      {loading ? (
        <div className={styles.spinnerContainer}>
          <div className={styles.loadingSpinner}></div>
          <p style={{ marginTop: '10px' }}>Wczytywanie...</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <ProductTable 
            products={products} 
            onEdit={openEdit} 
            onDelete={handleDelete}
            selectedIds={selectedIds}
            onSelectSingle={handleSelectSingle}
            onSelectAll={handleSelectAll}
            isAllSelected={isAllSelected}
          />
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className={styles.pagination} style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '30px', alignItems: 'center' }}>
          <button 
            onClick={() => fetchProducts(currentPage - 1)} 
            disabled={currentPage === 1}
            style={{ padding: '8px 15px', borderRadius: '5px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
          >
            Poprzednia
          </button>
          <span style={{ color: 'white' }}>Strona {currentPage} z {totalPages}</span>
          <button 
            onClick={() => fetchProducts(currentPage + 1)} 
            disabled={currentPage === totalPages}
            style={{ padding: '8px 15px', borderRadius: '5px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
          >
            Następna
          </button>
        </div>
      )}

      {/* Floating Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className={styles.bulkBar}>
          <div className={styles.bulkBarInner}>
            <div className={styles.bulkCount}>
              <span>⚡ Wybrano <strong>{selectedIds.length}</strong> produktów</span>
            </div>
            
            <div className={styles.bulkActions}>
              <div className={styles.bulkActionGroup}>
                <select 
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkCategoryChange(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                  className={styles.bulkSelect}
                >
                  <option value="" disabled>Zmień kategorię...</option>
                  {PRODUCT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className={styles.bulkActionGroup}>
                <select 
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkBatchChange(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                  className={styles.bulkSelect}
                >
                  <option value="" disabled>Zmień batch...</option>
                  <option value="best">Best</option>
                  <option value="budget">Budget</option>
                  <option value="random">Random</option>
                </select>
              </div>

              <div className={styles.bulkActionGroup}>
                <button 
                  className={styles.bulkPinBtn} 
                  onClick={() => handleBulkPinChange(true)}
                >
                  📌 Przypnij
                </button>
                <button 
                  className={styles.bulkUnpinBtn} 
                  onClick={() => handleBulkPinChange(false)}
                >
                  📍 Odepnij
                </button>
              </div>

              <button 
                className={styles.bulkDeleteBtn} 
                onClick={handleBulkDelete}
              >
                🗑️ Usuń zaznaczone
              </button>
              
              <button 
                className={styles.bulkCancelBtn} 
                onClick={() => setSelectedIds([])}
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add/Edit Modal */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.adminModal}>
            <h2>{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
            <form onSubmit={handleSubmit}>
              <input 
                type="text" 
                placeholder="Name" 
                value={formData.name} 
                onChange={(e) => {
                  const name = e.target.value;
                  setFormData({
                    ...formData,
                    name,
                    category: detectCategory(name)
                  });
                }} 
                required 
              />
              <input 
                type="number" 
                step="0.01" 
                placeholder="Price" 
                value={formData.price} 
                onChange={(e) => setFormData({...formData, price: e.target.value})} 
                required 
              />
              <input 
                type="text" 
                placeholder="Image URL" 
                value={formData.image} 
                onChange={(e) => setFormData({...formData, image: e.target.value})} 
                required 
              />
              <input 
                type="text" 
                placeholder="Product Link" 
                value={formData.link} 
                onChange={(e) => setFormData({...formData, link: e.target.value})} 
                required 
              />
              <select 
                value={formData.category} 
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                {PRODUCT_CATEGORIES.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
              <select 
                value={formData.batch} 
                onChange={(e) => setFormData({...formData, batch: e.target.value})}
              >
                <option value="best">Best</option>
                <option value="budget">Budget</option>
                <option value="random">Random</option>
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0' }}>
                <input 
                  type="checkbox" 
                  id="isPinned"
                  checked={formData.isPinned} 
                  onChange={(e) => setFormData({...formData, isPinned: e.target.checked})}
                  style={{ width: 'auto', cursor: 'pointer' }}
                />
                <label htmlFor="isPinned" style={{ color: 'white', cursor: 'pointer', userSelect: 'none' }}>Pinned Product</label>
              </div>
              {formData.isPinned && (
                <input 
                  type="number" 
                  placeholder="Pinned Order (e.g. 1, 2, 3...)" 
                  value={formData.pinnedOrder} 
                  onChange={(e) => setFormData({...formData, pinnedOrder: e.target.value})}
                  style={{ marginTop: '0' }}
                />
              )}
              <div className={styles.modalActions}>
                <button type="submit">Save</button>
                <button type="button" onClick={() => {setShowModal(false); setEditingProduct(null); setFormData({ name: '', price: '', image: '', category: 'shoes', batch: 'best', link: '', isPinned: false, pinnedOrder: '' });}}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scraper Modal */}
      {showScraperModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.adminModal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Add via Scraper</h2>
              <span style={{ fontSize: '24px', cursor: 'pointer', opacity: 0.5 }} onClick={() => setShowScraperModal(false)}>&times;</span>
            </div>
            
            {scraperStatus.message && (
              <div className={scraperStatus.type === 'success' ? styles.scraperSuccess : styles.scraperError}>
                {scraperStatus.message}
              </div>
            )}

            <form onSubmit={handleScrape}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#a78bfa' }}>Weidian Link</label>
                <input 
                  type="text" 
                  placeholder="https://weidian.com/item.html?itemID=..." 
                  value={scraperData.url} 
                  onChange={(e) => setScraperData({...scraperData, url: e.target.value})} 
                  required 
                  disabled={scraperLoading}
                />
                <span className={styles.scraperHint}>Paste the full Weidian link here.</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#a78bfa' }}>Custom Name (Optional)</label>
                <input 
                  type="text" 
                  placeholder="Leave empty to use original name" 
                  value={scraperData.name} 
                  onChange={(e) => setScraperData({...scraperData, name: e.target.value})} 
                  disabled={scraperLoading}
                />
                <span className={styles.scraperHint}>We'll try to translate or use the original name if left blank.</span>
              </div>

              <div className={styles.modalActions}>
                <button type="submit" className={styles.scraperBtn} disabled={scraperLoading} style={{ width: '100%' }}>
                  {scraperLoading ? (
                    <>
                      <div className={styles.loadingSpinner}></div>
                      Scraping...
                    </>
                  ) : '🚀 Start Scraping'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Scraper Modal */}
      {showBulkScraperModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.adminModal} style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>📦 Collab Links</h2>
              <span style={{ fontSize: '24px', cursor: 'pointer', opacity: bulkLoading ? 0.5 : 1, pointerEvents: bulkLoading ? 'none' : 'auto' }} onClick={() => setShowBulkScraperModal(false)}>&times;</span>
            </div>
            
            <form onSubmit={handleBulkScrape}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '15px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#a78bfa' }}>Wklej linki Weidian (każdy w nowej linii)</label>
                <textarea 
                  placeholder="https://weidian.com/item.html?itemID=123&#10;https://weidian.com/item.html?itemID=456" 
                  value={bulkText} 
                  onChange={(e) => setBulkText(e.target.value)} 
                  required 
                  disabled={bulkLoading}
                  style={{ height: '200px', padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', resize: 'vertical' }}
                />
                <span className={styles.scraperHint}>Każdy link zostanie pobrany jako 1 przypięty produkt (kolejność zachowana).</span>
              </div>

              {bulkProgress.total > 0 && (
                <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                    <span>Przetwarzanie: {bulkProgress.current} / {bulkProgress.total}</span>
                    <span style={{ color: '#34d399' }}>Sukces: {bulkProgress.successes}</span>
                    <span style={{ color: '#ef4444' }}>Błędy: {bulkProgress.failures}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #a78bfa, #7c3aed)', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              )}

              <div className={styles.modalActions}>
                <button type="submit" className={styles.scraperBtn} disabled={bulkLoading || !bulkText.trim()} style={{ width: '100%' }}>
                  {bulkLoading ? (
                    <>
                      <div className={styles.loadingSpinner}></div>
                      Dodawanie...
                    </>
                  ) : '⚡ Rozpocznij pobieranie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification Containers */}
      <div className={styles.toastContainer}>
        {toasts.map(toast => (
          <div key={toast.id} className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
            <span className={styles.toastIcon}>
              {toast.type === 'success' ? '⚡' : '⚠️'}
            </span>
            <span className={styles.toastMessage}>{toast.message}</span>
            <button className={styles.toastClose} onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}>&times;</button>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.adminModal} ${styles.confirmModal}`}>
            <h2>{confirmModal.title}</h2>
            <p>{confirmModal.message}</p>
            <div className={styles.modalActions}>
              <button 
                onClick={confirmModal.onConfirm}
                className={styles.confirmModalBtn}
              >
                Tak, wykonaj
              </button>
              <button 
                type="button" 
                onClick={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
                className={styles.cancelModalBtn}
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
