'use client';

import { useState, useEffect } from 'react';
import styles from '@/styles/Admin.module.css';

export default function SettingsPage() {
  const [popularProducts, setPopularProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Load popular products and all products
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      console.log('🔄 Fetching products...');
      
      // Fetch all products
      const productsRes = await fetch('/api/products');
      const productsData = await productsRes.json();
      
      // API returns array directly when no pagination
      const allProds = Array.isArray(productsData) ? productsData : (productsData.products || []);
      console.log('📦 All products:', allProds.length);
      setAllProducts(allProds);

      // Fetch popular products (pinned products)
      const popularRes = await fetch('/api/products?pinned=true');
      const popularData = await popularRes.json();
      
      const pinnedProds = Array.isArray(popularData) ? popularData : (popularData.products || []);
      console.log('📌 Pinned products:', pinnedProds.length);
      setPopularProducts(pinnedProds);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    console.log('🔵 handleAddProduct called');
    console.log('selectedProductId:', selectedProductId);
    
    if (!selectedProductId) {
      console.log('❌ No product selected');
      return;
    }

    try {
      setSaving(true);
      const product = allProducts.find(p => p.id === selectedProductId);
      
      console.log('📦 Found product:', product);
      
      if (!product) {
        console.log('❌ Product not found in allProducts');
        return;
      }

      console.log('🚀 Sending PATCH request...');
      
      // Pin the product
      const res = await fetch(`/api/products/${selectedProductId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          is_pinned: true,
          pinned_order: popularProducts.length + 1 
        })
      });

      console.log('📡 Response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('✅ Success:', data);
        await fetchData();
        setShowAddModal(false);
        setSelectedProductId('');
      } else {
        const errorData = await res.json();
        console.error('❌ Error response:', errorData);
      }
    } catch (error) {
      console.error('❌ Error adding product:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveProduct = async (productId) => {
    if (!confirm('Usunąć ten produkt z sekcji Popular Products?')) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: false, pinned_order: null })
      });

      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error removing product:', error);
    } finally {
      setSaving(false);
    }
  };

  const availableProducts = allProducts.filter(
    p => !popularProducts.some(pp => pp.id === p.id)
  );

  if (loading) {
    return (
      <div className={styles.adminContainer}>
        <div className={styles.adminHeader}>
          <div>
            <h1>Ustawienia</h1>
            <p className={styles.headerSubtitle}>Zarządzaj ustawieniami strony</p>
          </div>
        </div>
        <div className={styles.spinnerContainer}>
          <div className={styles.loadingSpinner} />
          <p>Ładowanie...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminContainer}>
      <div className={styles.adminHeader}>
        <div>
          <h1>Ustawienia</h1>
          <p className={styles.headerSubtitle}>Zarządzaj ustawieniami strony</p>
        </div>
      </div>

      {/* Popular Products Section */}
      <div className={styles.settingsSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Popularne produkty</h2>
            <p className={styles.sectionSubtitle}>
              Produkty wyświetlane w sekcji "Popular Products" na głównej stronie
            </p>
          </div>
          <button 
            className={`${styles.actionBtn} ${styles.btnPrimary}`}
            onClick={() => setShowAddModal(true)}
            disabled={saving}
          >
            + Dodaj produkt
          </button>
        </div>

        <div className={styles.popularProductsGrid}>
          {popularProducts.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>Brak produktów w sekcji Popular Products</p>
              <p className={styles.emptyHint}>
                Kliknij „Dodaj produkt”, aby dodać pierwszy produkt.
              </p>
            </div>
          ) : (
            popularProducts.map(product => (
              <div key={product.id} className={styles.popularProductCard}>
                <img 
                  src={product.image} 
                  alt={product.name}
                  className={styles.popularProductImage}
                />
                <div className={styles.popularProductInfo}>
                  <h3 className={styles.popularProductName}>{product.name}</h3>
                  <p className={styles.popularProductPrice}>${product.price}</p>
                  <span className={styles.popularProductBadge}>{product.batch}</span>
                </div>
                <button
                  className={styles.removeProductBtn}
                  onClick={() => handleRemoveProduct(product.id)}
                  disabled={saving}
                  title="Usuń z Popular Products"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={`${styles.adminModal} ${styles.modalLg} ${styles.modalColumn}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Dodaj produkt do Popular Products</h2>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="Zamknij"
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedProductId('');
                  setSearchQuery('');
                }}
              >
                &times;
              </button>
            </div>
            
            {/* Search Input */}
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Szukaj produktu po nazwie lub kategorii..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.settingsSelect}
              />
            </div>

            {/* Product List */}
            <div className={styles.pickList}>
              {availableProducts.length === 0 ? (
                <p className={styles.emptyText}>Wszystkie produkty zostały już dodane</p>
              ) : (
                <div>
                  {availableProducts
                    .filter(p => 
                      searchQuery === '' || 
                      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.category.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map(product => (
                      <div
                        key={product.id}
                        onClick={() => {
                          if (selectedProductId === product.id) {
                            setSelectedProductId('');
                          } else {
                            setSelectedProductId(product.id);
                          }
                        }}
                        className={`${styles.pickItem} ${selectedProductId === product.id ? styles.pickItemSelected : ''}`}
                      >
                        {/* Checkbox */}
                        <div className={styles.pickCheck}>
                          {selectedProductId === product.id && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#09090b" strokeWidth="3.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>

                        {/* Product Image */}
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className={styles.pickImg}
                        />

                        {/* Product Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className={styles.pickName}>
                            {product.name}
                          </div>
                          <div className={styles.pickMeta}>
                            ${product.price} · {product.category} · {product.batch}
                          </div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>

            {/* Actions */}
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedProductId('');
                  setSearchQuery('');
                }}
                disabled={saving}
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleAddProduct}
                disabled={saving || !selectedProductId}
                className={styles.btnPrimary}
              >
                {saving ? 'Dodawanie...' : 'Dodaj zaznaczony'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
