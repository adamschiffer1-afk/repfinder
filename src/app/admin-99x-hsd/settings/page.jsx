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
        <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
          Ładowanie...
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
            <h2 className={styles.sectionTitle}>Popular Products</h2>
            <p className={styles.sectionSubtitle}>
              Produkty wyświetlane w sekcji "Popular Products" na głównej stronie
            </p>
          </div>
          <button 
            className={styles.actionBtn}
            onClick={() => setShowAddModal(true)}
            disabled={saving}
          >
            + Dodaj produkt
          </button>
        </div>

        <div className={styles.popularProductsGrid}>
          {popularProducts.length === 0 ? (
            <div className={styles.emptyState}>
              <span style={{ fontSize: '48px', marginBottom: '16px' }}>📦</span>
              <p>Brak produktów w sekcji Popular Products</p>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
                Kliknij "Dodaj produkt" aby dodać pierwszy produkt
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
          <div className={styles.adminModal} style={{ maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '16px' }}>Dodaj produkty do Popular Products</h2>
            
            {/* Search Input */}
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="🔍 Szukaj produktu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.settingsSelect}
                style={{ width: '100%' }}
              />
            </div>

            {/* Product List */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              marginBottom: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.03)'
            }}>
              {availableProducts.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                  <p>Wszystkie produkty zostały już dodane</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
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
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          cursor: 'pointer',
                          background: selectedProductId === product.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (selectedProductId !== product.id) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedProductId !== product.id) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        {/* Checkbox */}
                        <div style={{
                          width: '20px',
                          height: '20px',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: selectedProductId === product.id ? '#fff' : 'transparent',
                          flexShrink: 0
                        }}>
                          {selectedProductId === product.id && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>

                        {/* Product Image */}
                        <img 
                          src={product.image} 
                          alt={product.name}
                          style={{
                            width: '50px',
                            height: '50px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            flexShrink: 0
                          }}
                        />

                        {/* Product Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            fontSize: '14px', 
                            fontWeight: 600, 
                            color: '#fff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {product.name}
                          </div>
                          <div style={{ 
                            fontSize: '12px', 
                            color: 'rgba(255,255,255,0.6)',
                            marginTop: '2px'
                          }}>
                            ${product.price} • {product.category} • {product.batch}
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
