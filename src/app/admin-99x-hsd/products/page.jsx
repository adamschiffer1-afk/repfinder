'use client';

import { useState, useEffect } from 'react';
import styles from '@/styles/Admin.module.css';

export default function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showScraperModal, setShowScraperModal] = useState(false);
  const [scraperLoading, setScraperLoading] = useState(false);
  const [scraperStatus, setScraperStatus] = useState({ type: '', message: '' });
  const [scraperData, setScraperData] = useState({ name: '', url: '' });
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    image: '',
    category: 'shoes',
    batch: 'best',
    link: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error(err);
      alert("Błąd pobierania produktów. Sprawdź połączenie z bazą.");
    } finally {
      setLoading(false);
    }
  };

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
        fetchProducts();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editingProduct ? 'PUT' : 'POST';
    const url = editingProduct ? `/api/products/${editingProduct._id}` : '/api/products';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      fetchProducts();
      setShowModal(false);
      setEditingProduct(null);
      setFormData({ name: '', price: '', image: '', category: 'shoes', batch: 'best', link: '' });
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure?')) {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) fetchProducts();
    }
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category,
      batch: product.batch,
      link: product.link
    });
    setShowModal(true);
  };

  return (
    <div className={styles.adminContainer}>
      <header className={styles.adminHeader}>
        <h1>Manage Products</h1>
        <div className={styles.adminNav}>
          <button className={styles.scraperBtn} onClick={() => setShowScraperModal(true)}>
            🚀 Add via Scraper
          </button>
          <button className={styles.navLink} onClick={() => setShowModal(true)}>
            + Add Manually
          </button>
        </div>
      </header>

      {loading ? <p>Loading...</p> : (
        <table className={styles.adminTable}>
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Price</th>
              <th>Category</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product._id}>
                <td><img src={product.image} alt="" className={styles.tableImg} /></td>
                <td>{product.name}</td>
                <td>${product.price}</td>
                <td>{product.category}</td>
                <td className={styles.actions}>
                  <button onClick={() => openEdit(product)}>Edit</button>
                  <button onClick={() => handleDelete(product._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
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
                <option value="shoes">Shoes</option>
                <option value="hoodies">Hoodies</option>
                <option value="t-shirts">T-shirts</option>
                <option value="pants">Pants</option>
                <option value="shorts">Shorts</option>
                <option value="accessories">Accessories</option>
              </select>
              <select 
                value={formData.batch} 
                onChange={(e) => setFormData({...formData, batch: e.target.value})}
              >
                <option value="best">Best</option>
                <option value="budget">Budget</option>
                <option value="random">Random</option>
              </select>
              <div className={styles.modalActions}>
                <button type="submit">Save</button>
                <button type="button" onClick={() => {setShowModal(false); setEditingProduct(null);}}>Cancel</button>
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
    </div>
  );
}
