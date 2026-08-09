/**
 * Example Usage of Template Import Modal
 * 
 * This file shows how to integrate the TemplateImportModal into your admin page
 */

'use client';

import { useState, useCallback } from 'react';
import TemplateImportModal from '@/components/admin/TemplateImportModal';

export default function AdminProductsPage() {
  // State for modal visibility
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  
  // State for your products list (example)
  const [products, setProducts] = useState([]);

  // Function to fetch/refresh products from database
  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  }, []);

  // Handle import completion
  const handleImportComplete = useCallback((result) => {
    console.log('Import completed:', result);
    
    // Show result summary
    alert(`Import completed!\nCreated: ${result.created}\nFailed: ${result.failures}\nDeleted: ${result.deletedCount || 0}`);
    
    // Refresh products list
    fetchProducts();
    
    // Close modal
    setShowTemplateModal(false);
  }, [fetchProducts]);

  // Toast notification function (example)
  const showToast = useCallback((message, type = 'success') => {
    // Use your preferred toast library here
    // Examples: react-hot-toast, react-toastify, etc.
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Or use browser alert for simple demo:
    // alert(message);
  }, []);

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Manage Products</h1>
        
        <div className="admin-actions">
          {/* Other buttons */}
          <button onClick={() => setShowTemplateModal(true)}>
            📋 Template Import
          </button>
        </div>
      </header>

      {/* Your products list/table here */}
      <div className="products-list">
        <p>Total products: {products.length}</p>
        {/* Render your products */}
      </div>

      {/* Template Import Modal */}
      {showTemplateModal && (
        <TemplateImportModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          onImportComplete={handleImportComplete}
          showToast={showToast}
          // Optional: custom API endpoint
          // apiEndpoint="/api/admin/scrape/template"
        />
      )}
    </div>
  );
}

/**
 * Example with React Hot Toast
 */

import { useState, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import TemplateImportModal from '@/components/admin/TemplateImportModal';

export function AdminProductsWithToast() {
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const handleImportComplete = (result) => {
    const message = `Created: ${result.created} | Failed: ${result.failures}`;
    
    if (result.failures > 0) {
      toast.error(message);
    } else {
      toast.success(message);
    }
    
    setShowTemplateModal(false);
  };

  const showToast = (message, type) => {
    if (type === 'success') {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  return (
    <div>
      <Toaster position="top-right" />
      
      <button onClick={() => setShowTemplateModal(true)}>
        Template Import
      </button>

      {showTemplateModal && (
        <TemplateImportModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          onImportComplete={handleImportComplete}
          showToast={showToast}
        />
      )}
    </div>
  );
}

/**
 * Minimal Example (No Toast)
 */

import { useState } from 'react';
import TemplateImportModal from '@/components/admin/TemplateImportModal';

export function MinimalExample() {
  const [show, setShow] = useState(false);

  return (
    <>
      <button onClick={() => setShow(true)}>Import</button>
      
      {show && (
        <TemplateImportModal
          isOpen={show}
          onClose={() => setShow(false)}
          onImportComplete={(result) => {
            console.log('Done:', result);
            setShow(false);
          }}
        />
      )}
    </>
  );
}
