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

  // Load popular products and all products
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all products
      const productsRes = await fetch('/api/products');
      const productsData = await productsRes.json();
      setAllProducts(productsData.products || []);

      // Fetch popular products (pinned products)
      const popularRes = await fetch('/api/products?pinned=true');
      const popularData = await popularRes.json();
      setPopularProducts(popularData.products || []);
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
          <div className={styles.adminModal} onClick={(e) => e.stopPropagation()}>
            <h2>Dodaj produkt do Popular Products</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                Wybierz produkt
              </label>
              
              {availableProducts.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
                  Wszystkie produkty zostały już dodane
                </p>
              ) : (
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className={styles.settingsSelect}
                >
                  <option value="">-- Wybierz produkt --</option>
                  {availableProducts.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - ${product.price} ({product.batch})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedProductId('');
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
                {saving ? 'Dodawanie...' : 'Dodaj'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
